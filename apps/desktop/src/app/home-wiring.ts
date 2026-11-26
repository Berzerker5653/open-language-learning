/**
 * APP-SPLIT-003D: the home header/Today wiring slice, moved out of App()
 * without behavior change. App.tsx still owns every hook and all state;
 * this module owns the bodies of the session-lifecycle handlers the Today
 * header (and the session chrome that shares its state) wires: start /
 * advance / pause / resume / stop, the end-of-session outcome snapshot, and
 * the UNIT-CAPSTONE-001 section-review flow that rides the same runner.
 * The deps object is built once per render in App() (after every referenced
 * binding is in scope) and passed at each call site, so reads keep the
 * exact old timing. openPractice stays App-owned (practice surface, next
 * slice) and is passed in as a callback.
 */
import type { RefObject } from "react";
import { remainingPlanSeconds } from "../session-chrome";
import {
  RUNNABLE_MODALITIES,
  bandHeader,
  type CapstoneResult,
  type PlannedItem,
  type SessionOutcomeView,
  type SessionPlan,
  type SessionStatus,
  type SessionView,
  type UnitPathNode,
} from "../home";
import type { Invoke } from "./primitives";

/** The session queue snapshot taken when the learner begins (App-owned ref). */
export interface SessionQueue {
  items: PlannedItem[];
  index: number;
  done: number;
  notRunnable: number;
}

/** Every dependency of the home header/Today wiring slice: plain render
 *  values + setters + App-owned refs/callbacks (no hooks). Mirrors exactly
 *  what the old inline closures in App() captured. */
export interface HomeWiringDeps {
  inv: Invoke | null;
  profileId: string | null;
  plan: SessionPlan;
  sessionQueueRef: RefObject<SessionQueue | null>;
  sessionStartedAtRef: RefObject<number | null>;
  capstoneSessionRef: RefObject<{ packId: string; band: string; id: string } | null>;
  setSession: (v: SessionView | null) => void;
  setSessionOutcome: (v: SessionOutcomeView | null) => void;
  setCapstoneResult: (v: CapstoneResult | null) => void;
  setPathNodes: (v: UnitPathNode[]) => void;
  setPracticeTarget: (v: null) => void;
  setPracticeTask: (v: null) => void;
  setLesson: (v: null) => void;
  setLessonSeen: (v: boolean) => void;
  openPractice: (item: PlannedItem, opts?: { showLessonCard?: boolean }) => Promise<void>;
  showSessionBridge: (item: PlannedItem) => Promise<boolean>;
  cancelSessionBridge: () => void;
}

/// An activity belongs to a session only if this build has a practice
/// screen for it: the hub's verb table is that guarantee, and a saved word
/// opens a review card instead of a runner. Anything else is named in the
/// session summary rather than silently dropped.
export function isSessionRunnable(item: PlannedItem): boolean {
  return item.reason !== "saved-review" && RUNNABLE_MODALITIES[item.modality] !== undefined;
}

export function publishSession(deps: HomeWiringDeps, status: SessionStatus | null) {
  const q = deps.sessionQueueRef.current;
  deps.setSession(
    q && status
      ? {
          status,
          total: q.items.length,
          done: q.done,
          notRunnable: q.notRunnable,
          // SESSION-CHROME-001 (U3) + SESSION-TIMER-001: remaining time
          // is the engine's own price for the items still to work,
          // including the open one — derived by the tested helper so the
          // header always starts from the full queue's real estimate.
          remainingSeconds: remainingPlanSeconds(q.items, q.index),
        }
      : null,
  );
}

export async function runStartSession(deps: HomeWiringDeps) {
  const runnable = deps.plan.items.filter(isSessionRunnable);
  const notRunnable = deps.plan.items.length - runnable.length;
  if (runnable.length === 0) {
    // Nothing this build can run: name that instead of opening a loop.
    deps.setSessionOutcome({
      done: 0,
      total: deps.plan.items.length,
      reason: "finished",
      notRunnable,
      minutes: null,
      forms: [],
    });
    return;
  }
  const first = runnable[0];
  if (!first) return; // the empty case above already covers this
  deps.sessionQueueRef.current = { items: runnable, index: 0, done: 0, notRunnable };
  // SESSION-CHROME-001: wall time measured across the whole session,
  // reported in the summary as time actually spent — never an estimate.
  deps.sessionStartedAtRef.current = Date.now();
  deps.setSessionOutcome(null);
  publishSession(deps, "running");
  await deps.openPractice(first);
}

/// `counted` is the activity that just ended. When the snapshot runs out
/// the session closes with a plain summary — no reward language, and no
/// claim that an activity the learner never did was finished.
export async function runAdvanceSession(deps: HomeWiringDeps, counted: number) {
  const q = deps.sessionQueueRef.current;
  if (!q) return;
  q.done += counted;
  q.index += 1;
  const next = q.items[q.index];
  if (next) {
    // SESSION-FLOW-COPY-001: the session advances itself. A short bridge
    // names what comes next, then the runner opens — no second Start
    // click. If the learner paused or stopped during the bridge, the
    // advance resolves as "did not proceed" and nothing opens.
    publishSession(deps, "running");
    const proceeded = await deps.showSessionBridge(next);
    if (!proceeded || !deps.sessionQueueRef.current) return;
    await deps.openPractice(next, { showLessonCard: false });
    return;
  }
  const outcome = sessionOutcomeFrom(deps, q, "finished");
  deps.sessionQueueRef.current = null;
  deps.sessionStartedAtRef.current = null;
  deps.setSession(null);
  deps.setSessionOutcome(outcome);
  // UNIT-CAPSTONE-001: completing the queue of a section review closes
  // the review — the engine records the attempt (pass OR fail). Stopping
  // mid-review never reaches this line: no queue exhaustion, no attempt.
  if (deps.capstoneSessionRef.current) await runFinishCapstoneSession(deps);
}

/// SESSION-CHROME-001 (U3): the end-of-session card. Time is measured
/// wall clock, never re-estimated; forms are the surfaces the finished
/// items put in front of the learner, deduped in first-seen order.
export function sessionOutcomeFrom(
  deps: HomeWiringDeps,
  q: { items: PlannedItem[]; done: number; notRunnable: number },
  reason: "finished" | "stopped",
): SessionOutcomeView {
  const start = deps.sessionStartedAtRef.current;
  const minutes = start === null ? null : Math.round((Date.now() - start) / 60_000);
  const seen = new Set<string>();
  const forms: string[] = [];
  for (const it of q.items.slice(0, Math.min(q.done, q.items.length))) {
    const s = it.surface;
    if (s && !seen.has(s)) {
      seen.add(s);
      forms.push(s);
    }
  }
  return {
    done: q.done,
    total: q.items.length + q.notRunnable,
    reason,
    notRunnable: q.notRunnable,
    minutes,
    forms,
  };
}

export function runCloseSession(deps: HomeWiringDeps, reason: "stopped") {
  const q = deps.sessionQueueRef.current;
  if (!q) return;
  deps.cancelSessionBridge();
  // UNIT-CAPSTONE-001: stopping mid-review records NOTHING — an attempt
  // exists only when the whole review ran to the end.
  deps.capstoneSessionRef.current = null;
  const outcome = sessionOutcomeFrom(deps, q, reason);
  deps.sessionQueueRef.current = null;
  deps.sessionStartedAtRef.current = null;
  deps.setSession(null);
  deps.setSessionOutcome(outcome);
  deps.setPracticeTarget(null);
  deps.setPracticeTask(null);
  deps.setLesson(null);
  deps.setLessonSeen(false);
}

export function runPauseSession(deps: HomeWiringDeps) {
  if (!deps.sessionQueueRef.current) return;
  // The bridge is part of the running session: pausing cancels it, and
  // nothing opens behind the learner.
  deps.cancelSessionBridge();
  deps.setPracticeTarget(null);
  deps.setPracticeTask(null);
  deps.setLesson(null);
  deps.setLessonSeen(false);
  publishSession(deps, "paused");
}

export async function runResumeSession(deps: HomeWiringDeps) {
  const q = deps.sessionQueueRef.current;
  if (!q) return;
  const current = q.items[q.index];
  if (!current) return; // an exhausted queue has already closed the session
  publishSession(deps, "running");
  await deps.openPractice(current);
}

// UNIT-CAPSTONE-001: the section review rides the same session runner as
// the deps.plan — the engine serves the item list (`capstone_plan`), the
// runner grades every item through the normal submit path, and closing
// the review asks the engine to recount the recall itself
// (`capstone_complete`), never trusting the UI's tallies.
export async function runStartCapstoneSession(deps: HomeWiringDeps, node: UnitPathNode) {
  if (!deps.inv || !deps.profileId) return;
  deps.setCapstoneResult(null);
  try {
    const p = (await deps.inv("capstone_plan", {
      profileId: deps.profileId,
      packId: node.pack_id,
      band: node.band ?? "other",
    })) as SessionPlan;
    const runnable = p.items.filter(isSessionRunnable);
    const first = runnable[0];
    if (!first) {
      deps.setCapstoneResult({
        passed: false,
        items: 0,
        correct: 0,
        friendly: bandHeader(node.band ?? "other").friendly ?? node.band ?? "Section",
        band: node.band ?? "other",
        error: "this section's review has no runnable activities in this build",
      });
      return;
    }
    // Same id discipline as a deps.plan session: one id per presented review;
    // its attempt groups collapse retries inside the sitting (docs/03 §5).
    const sid =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `capstone-${Math.random().toString(36).slice(2, 10)}`;
    deps.capstoneSessionRef.current = { packId: node.pack_id, band: node.band ?? "other", id: sid };
    deps.sessionQueueRef.current = {
      items: runnable,
      index: 0,
      done: 0,
      notRunnable: p.items.length - runnable.length,
    };
    deps.sessionStartedAtRef.current = Date.now();
    deps.setSessionOutcome(null);
    publishSession(deps, "running");
    await deps.openPractice(first, { showLessonCard: false });
  } catch (e) {
    deps.capstoneSessionRef.current = null;
    deps.setSession(null);
    deps.setCapstoneResult({
      passed: false,
      items: 0,
      correct: 0,
      friendly: bandHeader(node.band ?? "other").friendly ?? node.band ?? "Section",
      band: node.band ?? "other",
      error: String(e),
    });
  }
}

/// Closes a finished review honestly: the engine recounts which selected
/// items the learner actually recalled (attempt-grouped evidence),
/// records the attempt — pass OR fail — and the path refreshes so the
/// flipped counter/lock state shows immediately.
export async function runFinishCapstoneSession(deps: HomeWiringDeps) {
  const c = deps.capstoneSessionRef.current;
  deps.capstoneSessionRef.current = null;
  if (!c || !deps.inv || !deps.profileId) return;
  try {
    const res = (await deps.inv("capstone_complete", {
      profileId: deps.profileId,
      packId: c.packId,
      band: c.band,
      sessionId: c.id,
    })) as { passed: boolean; items: number; correct: number };
    const header = bandHeader(c.band);
    deps.setCapstoneResult({
      ...res,
      friendly: header.friendly ?? header.label,
      band: c.band,
    });
    deps.setPathNodes(
      (await deps.inv("unit_path", { profileId: deps.profileId })) as UnitPathNode[],
    );
  } catch (e) {
    const header = bandHeader(c.band);
    deps.setCapstoneResult({
      passed: false,
      items: 0,
      correct: 0,
      friendly: header.friendly ?? header.label,
      band: c.band,
      error: String(e),
    });
  }
}
