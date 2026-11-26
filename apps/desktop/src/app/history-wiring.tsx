/**
 * APP-SPLIT-003A: the session/history wiring slice (WEB-HISTORY-001), moved
 * out of App() without behavior change. App.tsx still owns every hook, ref,
 * and effect (the shim install, the location sync, and the destination
 * derivation stay there); this module owns the pop-handler body, the
 * confirm-exit body, and the leave-session alert dialog.
 *
 * Re-exported from App.tsx so nothing else moves.
 */
import type { AppLocation, HistoryNav } from "../history-nav";

/** Tabs the pop handler may land on (a token this app never authored may
 *  name a tab that does not exist; that is not a destination). */
type KnownTab = "practice" | "words" | "progress" | "settings";

/** The session-queue snapshot App keeps in a ref (truthiness only here: a
 *  live session is what makes a stage destination re-enterable). */
export interface HistoryPopDeps {
  step: string;
  appLocation: AppLocation;
  practiceTarget: unknown;
  route: string;
  sessionQueueRef: { current: unknown };
  historyNavRef: { current: HistoryNav | null };
  setHistoryExitAsk: (target: AppLocation | null) => void;
  setRoute: (tab: KnownTab) => void;
  pauseSession: () => void;
  resumeSession: () => void | Promise<unknown>;
  /** The runner's own "Back to plan" state teardown for a solo activity. */
  leaveSoloStage: () => void;
}

/** Route a browser back/forward traversal back through the app's own
 *  navigation functions (src/history-nav.ts owns the mechanics). */
export function handleHistoryPop(
  deps: HistoryPopDeps,
  target: AppLocation | null,
  guarded: boolean,
): void {
  const nav = deps.historyNavRef.current;
  if (!nav || deps.step !== "done") return;
  if (target === null) {
    nav.sync(deps.appLocation);
    return;
  }
  if (guarded) {
    // The shim already restored the learner's history position; ask
    // before leaving a live session.
    deps.setHistoryExitAsk(target);
    return;
  }
  // A destination the app can no longer re-enter (its session closed,
  // or a solo activity that was not a session activity) is never
  // faked: re-land the current location on top of it instead, which
  // also blocks forward-jumps from double-advancing anything.
  if ((target.session || target.stage) && !deps.sessionQueueRef.current && !deps.practiceTarget) {
    nav.sync(deps.appLocation);
    return;
  }
  // A token this app never authored may name a tab that does not
  // exist; that is not a destination — the root tab answers it.
  const knownTabs: string[] = ["practice", "words", "progress", "settings"];
  const wantRoute = target.tab === "" || !knownTabs.includes(target.tab) ? "practice" : target.tab;
  if (wantRoute !== deps.route) {
    deps.setRoute(wantRoute as KnownTab);
  }
  if (!target.stage && deps.practiceTarget) {
    // Leaving the runner by history: inside a session this pauses it
    // (the Resume control then owns re-entry); solo it just closes the
    // activity, mirroring the runner's own "Back to plan" action.
    if (deps.sessionQueueRef.current) deps.pauseSession();
    else deps.leaveSoloStage();
  }
  if (target.stage && deps.sessionQueueRef.current && !deps.practiceTarget) {
    // Re-entering the stage destination of a live session returns to
    // the activity the session queue is on — never the next one, and
    // the session-level destination never auto-starts one.
    void deps.resumeSession();
  }
}

/** Stopping is the app's own session exit — the summary and the
 *  engine's saved progress are identical to pressing Stop session. */
export function confirmHistoryExit(deps: {
  historyNavRef: { current: HistoryNav | null };
  setHistoryExitAsk: (target: AppLocation | null) => void;
  closeSession: (reason: "stopped") => void;
}): void {
  deps.setHistoryExitAsk(null);
  const nav = deps.historyNavRef.current;
  if (!nav) return;
  deps.closeSession("stopped");
  nav.backToRoot();
}

export interface HistoryExitAskProps {
  ask: AppLocation | null;
  onKeep: () => void;
  onConfirmExit: () => void;
}

/** WEB-HISTORY-001: leaving an ACTIVE session by browser Back asks
 *  first — the shim already restored the history position, so
 *  declining keeps the learner exactly where they were. Stopping
 *  here is the same exit the runner's own Stop control performs. */
export function HistoryExitAsk({ ask, onKeep, onConfirmExit }: HistoryExitAskProps) {
  if (!ask) return null;
  return (
    <div
      role="alertdialog"
      aria-label="Leave this session?"
      data-testid="history-exit-ask"
      className="notice"
    >
      <p>
        You are in the middle of a session. Finished activities are already saved; this one is not.
      </p>
      <div className="btn-row">
        <button
          type="button"
          className="btn"
          data-testid="history-exit-confirm"
          onClick={onConfirmExit}
        >
          Stop the session and go back
        </button>
        <button
          type="button"
          className="btn btn--quiet"
          data-testid="history-exit-keep"
          onClick={onKeep}
        >
          Keep working
        </button>
      </div>
    </div>
  );
}
