/**
 * WEB-HISTORY-001: browser history integration for web (serve) mode.
 *
 * The owner's phone dogfood finding (2026-11-21): the browser back button
 * left the site entirely, because every in-app destination (tab, session,
 * activity) lives only in React state. This shim makes the SAME state
 * machine the history walk goes through:
 *
 *   - every destination change pushes one history entry (mirroring the
 *     state the app already moved to);
 *   - every history traversal (popstate) is routed BACK through the app's
 *     own navigation functions — the shim never owns state, so there is
 *     no second source of truth and no forked navigation logic;
 *   - back from the root tab stays an exit (the entry the learner arrived
 *     on is never duplicated), so there are no back loops.
 *
 * Destination grammar, query-encoded (NOT path-based): serve.rs serves
 * built files with no SPA fallback, so only "/" is guaranteed to answer a
 * reload; the destination rides in ?d=.
 *   "/"                     root tab (Today)
 *   "/?d=progress"          another tab
 *   "/?d=session"           a live session (running or paused) on Today
 *   "/?d=session/stage"     an activity runner open within that session
 *   "/?d=stage"             a solo activity opened outside a session
 *
 * Scope of activation (desktop must be unaffected): the shim installs
 * only under the serve marker `window.__LTS_SERVE === true` — the exact
 * flag src/ipc.ts already keys HTTP-IPC mode off — or the acceptance
 * harness's explicit `window.__LTS_HISTORY === true`. Tauri and the
 * file:// vitest runs set neither, so desktop behavior is byte-identical.
 */

export interface AppLocation {
  /** Active tab; "" is the root Today tab (the "practice" route). */
  tab: string;
  /** A live session (running or paused) owns the Today tab. */
  session: boolean;
  /** The activity runner is open. */
  stage: boolean;
}

export function encodeLocation(loc: AppLocation): string {
  const segs: string[] = [];
  if (loc.tab) segs.push(loc.tab);
  if (loc.session) segs.push("session");
  if (loc.stage) segs.push("stage");
  return segs.join("/");
}

export function sameLocation(a: AppLocation, b: AppLocation): boolean {
  return encodeLocation(a) === encodeLocation(b);
}

export function decodeLocation(enc: string): AppLocation {
  const loc: AppLocation = { tab: "", session: false, stage: false };
  for (const seg of enc.split("/")) {
    if (seg === "session") loc.session = true;
    else if (seg === "stage") loc.stage = true;
    else if (seg !== "") loc.tab = seg;
  }
  return loc;
}

type HistoryWindow = Window & { __LTS_SERVE?: boolean; __LTS_HISTORY?: boolean };

/** The only pages that get history integration — see the scope note above. */
export function historyModeEnabled(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as HistoryWindow;
  return w.__LTS_SERVE === true || w.__LTS_HISTORY === true;
}

export interface HistoryNav {
  /**
   * Reconcile the top of history with the app's derived location. Push
   * only when they disagree — never when they match. That one invariant
   * is what keeps back/forward free of loops and double-entries: the top
   * of the stack always names where the app actually is.
   */
  sync: (loc: AppLocation) => void;
  /** Let exactly the next traversal through the guardrail unconditionally
   * (the learner confirmed leaving an active session). */
  disarmGuardOnce: () => void;
  /** Walk the pointer back to the root-tab entry the learner arrived on.
   * Only called right after the app has closed a live session. */
  backToRoot: () => void;
  /** Deep entries (e.g. mobile recents jumping forward) may not be
   * reconstructed by inventing app state — they re-land the current
   * location instead. Arm exactly the next traversal for that. */
  forceReconcileOnce: () => void;
  teardown: () => void;
}

export function installHistoryNav(opts: {
  /** The app's location derived from its current state, read fresh. */
  current: () => AppLocation;
  /**
   * A traversal the shim must route back through the app's own state
   * machine. `guarded` is true when the destination would leave a live
   * session: the app then asks to confirm, and the history position was
   * already restored before the question.
   */
  onPop: (target: AppLocation | null, guarded: boolean) => void;
}): HistoryNav | null {
  if (!historyModeEnabled()) return null;

  let passGuardOnce = false;
  let reconcileOnce = false;
  // While a traversal we initiated is in flight, sync() must not push:
  // a React commit landing mid-traversal would race the popstate and
  // re-enter the history we are unwinding. The traversal handler clears
  // this flag.
  let muted = false;

  const readTop = (): string | null => {
    const s = history.state as { lts?: unknown } | null;
    return typeof s?.lts === "string" ? s.lts : null;
  };
  const push = (enc: string): void => {
    const url = enc === "" ? "./" : `./?d=${encodeURIComponent(enc)}`;
    history.pushState({ lts: enc }, "", url);
  };
  const pushPath = (from: string, to: string): void => {
    // A destination reached in one app action but made of two levels
    // (starting a session opens its first activity in the same commit)
    // still gets one history entry PER LEVEL: Back from the stage must
    // land on the session, not skip past it. Only additions of session/
    // stage levels under the same tab walk the ladder; anything else
    // (tab switches, removals) is a single entry. NOTE: the ROOT tab
    // encodes WITHOUT a tab segment — "" precedes "session", so the tab
    // prefix is the first segment only when it is not a level word.
    const tabOf = (enc: string): string => {
      const seg = enc === "" ? "" : (enc.split("/")[0] ?? "");
      return seg === "session" || seg === "stage" ? "" : seg;
    };
    const fromSegs = from === "" ? [] : from.split("/");
    const toSegs = to === "" ? [] : to.split("/");
    const sameTab = tabOf(from) === tabOf(to);
    if (sameTab && toSegs.length > fromSegs.length + 1 && toSegs[toSegs.length - 1] === "stage") {
      for (let n = fromSegs.length + 1; n <= toSegs.length; n++) {
        push(toSegs.slice(0, n).join("/"));
      }
      return;
    }
    push(to);
  };

  // Label the entry the learner arrived on with the root-tab location —
  // WITHOUT adding an entry, so Back from the root tab is still a real
  // exit (the card's no-loops rule).
  history.replaceState({ lts: encodeLocation(opts.current()) }, "", "./");

  const onPopState = (): void => {
    const enc = readTop();

    // A traversal we were told to reconcile (forward jump, or a confirmed
    // session exit): no guard, no reconstruction — just re-land below.
    if (reconcileOnce) {
      reconcileOnce = false;
      passGuardOnce = false;
      muted = false;
      const cur = encodeLocation(opts.current());
      if (enc !== cur) push(cur);
      return;
    }

    if (enc === null) {
      // An entry this app never authored (injected by the browser):
      // never invent a destination; re-land the current location.
      push(encodeLocation(opts.current()));
      return;
    }

    const target = decodeLocation(enc);
    const cur = opts.current();
    if (sameLocation(target, cur)) return;

    // Guardrail: Back out of a live session down to the bare Today tab
    // asks to confirm first. The learner's position is restored before
    // the question is asked, so refusing to answer can never strand the
    // session or leak the exit.
    if (!passGuardOnce && cur.session && !target.session && !target.stage && target.tab === "") {
      push(encodeLocation(cur));
      push(encodeLocation(cur));
      opts.onPop(target, true);
      return;
    }
    passGuardOnce = false;
    opts.onPop(target, false);
  };

  window.addEventListener("popstate", onPopState);

  return {
    sync: (loc) => {
      if (muted) return;
      const enc = encodeLocation(loc);
      const top = readTop();
      if (top !== enc) pushPath(top ?? "", enc);
    },
    disarmGuardOnce: () => {
      passGuardOnce = true;
    },
    backToRoot: () => {
      reconcileOnce = true;
      muted = true;
      // Two entries above the root-tab entry: the learner's location plus
      // the marker the guardrail parked.
      history.go(-2);
    },
    forceReconcileOnce: () => {
      reconcileOnce = true;
    },
    teardown: () => window.removeEventListener("popstate", onPopState),
  };
}
