/**
 * APP-SPLIT-003E: the practice wiring slice, moved out of App() without
 * behavior change. App.tsx still owns every hook and all state; this module
 * owns the bodies of the practice-surface handlers: openPractice (open the
 * runner for a plan item, incl. the saved-word branch), choosePractice and
 * checkPractice (graded submits), and finishPractice (teardown + plan
 * refresh + session advance). The deps object is built once per render in
 * App() (after every referenced binding is in scope) and passed at each
 * call site, so reads keep the exact old timing. The runStartSession path
 * in ./home-wiring keeps calling App's thin openPractice wrapper, so the
 * session queue advance after finish still flows through home-wiring.
 */
import type { PlannedItem, SessionPlan } from "../home";
import type { LessonPlan } from "../lesson";
import { drillStageId } from "../lesson";
import type { PracticeTaskView } from "../practice";
import type { DictationResult } from "../dictation";
import type { MineItem } from "../words";
import { audioFailureMessage, isMediaMissing } from "../speech-readiness";
import { detectInvoke, type Invoke } from "./primitives";
import type { HomeWiringDeps } from "./home-wiring";
import { runAdvanceSession } from "./home-wiring";

/** Every dependency of the practice wiring slice: plain render values +
 *  setters + App-owned refs/callbacks (no hooks). Mirrors exactly what the
 *  old inline closures in App() captured. */
export interface PracticeWiringDeps {
  inv: Invoke | null;
  profileId: string | null;
  budget: number;
  practiceTarget: { contentId: string; modality: string } | null;
  practiceRevealed: boolean;
  practiceDraft: string;
  lesson: LessonPlan | null;
  setRoute: (v: "words") => void;
  setMineNotice: (v: string | null) => void;
  setMineReview: (v: { item: MineItem; revealed: boolean } | null) => void;
  setMineError: (v: string | null) => void;
  setPracticeError: (v: string | null) => void;
  setPracticeGraded: (v: boolean) => void;
  setPracticeCorrect: (v: boolean) => void;
  setPracticeCorrectChoice: (v: string) => void;
  setPracticeRevealed: (v: boolean) => void;
  setPracticeSpeakCheck: (v: DictationResult | null) => void;
  setPracticeTarget: (v: { contentId: string; modality: string } | null) => void;
  setPracticeTask: (v: PracticeTaskView | null) => void;
  setLesson: (v: LessonPlan | null) => void;
  setLessonSeen: (v: boolean) => void;
  setPracticeAudio: (v: { wavB64: string; source: string } | null) => void;
  setPracticeAudioError: (v: string | null) => void;
  setPracticeDraft: (v: string) => void;
  applyPlan: (plan: SessionPlan) => void;
  activeSessionId: () => string;
  sessionWiringDeps: HomeWiringDeps;
}

/** UX-003: first lessons. Plan items are runnable; grading, evidence,
 *  and scheduling happen natively. */
export async function runOpenPractice(
  deps: PracticeWiringDeps,
  item: PlannedItem,
  opts: { showLessonCard?: boolean } = {},
): Promise<void> {
  const { inv, profileId } = deps;
  // Review finding R02: a saved (mined) word is scheduled by its own
  // scheduler and has no pack content behind it, so it opens the saved
  // word's review card — a pack practice task on a `mine-…` id could only
  // fail, and mined practice must never become mastery evidence.
  if (item.reason === "saved-review") {
    const miner = detectInvoke();
    if (!miner || !profileId) return;
    try {
      // The engine owns what "due" means (D8): ask it for the due list
      // and open that word's card instead of re-deriving due-ness here.
      const due = (await miner("mine_due", { profileId })) as MineItem[];
      const found = due.find((m) => m.id === item.content_id);
      deps.setRoute("words");
      if (!found) {
        deps.setMineNotice("That saved word is not due right now.");
        return;
      }
      deps.setMineNotice(null);
      deps.setMineReview({ item: found, revealed: false });
    } catch (e) {
      deps.setMineError(String(e));
    }
    return;
  }
  deps.setPracticeError(null);
  deps.setPracticeGraded(false);
  deps.setPracticeCorrectChoice("");
  deps.setPracticeRevealed(false);
  deps.setPracticeSpeakCheck(null);
  deps.setPracticeTarget({ contentId: item.content_id, modality: item.modality });
  deps.setLesson(null);
  // SESSION-FLOW-COPY-001: inside a running session only the FIRST
  // activity shows the lesson encounter card and its Start control —
  // that click is the session's one start. Later activities arrive
  // through the bridge and open the runner directly; the card stays one
  // tap away on the "Show the lesson again" control.
  deps.setLessonSeen(opts.showLessonCard === false);
  if (inv && profileId) {
    try {
      deps.setLesson(
        (await inv("lesson_plan", {
          profileId,
          contentId: item.content_id,
        })) as LessonPlan | null,
      );
    } catch {
      // A unit that declares no activities has no lesson to show; the
      // drill alone is the honest fallback, never a fabricated summary.
      deps.setLesson(null);
    }
  }
  if (inv && profileId) {
    deps.setPracticeAudio(null);
    deps.setPracticeAudioError(null);
    try {
      const task = (await inv("practice_task", {
        profileId,
        contentId: item.content_id,
        modality: item.modality,
        revealReading: false,
      })) as PracticeTaskView;
      deps.setPracticeTask(task);
      if (
        item.modality === "comprehension-listening" ||
        item.modality === "phonological-discrimination" ||
        item.modality === "orthographic-encoding" ||
        // RU-MODALITY-PRACTICE-001: the guided-speaking card plays the
        // pack recording of the sentence it shows; the same honest
        // media miss (K-78) says so when the pack ships none.
        item.modality === "production-speaking"
      ) {
        try {
          const a = (await inv(
            item.modality === "phonological-discrimination"
              ? "contrast_audio"
              : item.modality === "orthographic-encoding"
                ? "dictation_audio"
                : "listening_audio",
            {
              profileId,
              contentId: item.content_id,
            },
          )) as { wav_b64: string; source: string };
          deps.setPracticeAudio({ wavB64: a.wav_b64, source: a.source });
        } catch (e) {
          // K-78/K-90: the only audio failure left is the pack shipping
          // no recording; the engine's own sentence says so, and anything
          // unexpected surfaces its raw text rather than a canned claim.
          deps.setPracticeAudioError(
            isMediaMissing(String(e))
              ? `${audioFailureMessage(String(e))} Text practice still works.`
              : `Audio failed: ${String(e)}. Text practice still works.`,
          );
        }
      }
    } catch (e) {
      deps.setPracticeTask(null);
      deps.setPracticeError(String(e));
    }
  } else {
    deps.setPracticeTask(null);
  }
}

export async function runChoosePractice(deps: PracticeWiringDeps, index: number): Promise<void> {
  const { inv, profileId } = deps;
  if (!deps.practiceTarget || !inv || !profileId) return;
  try {
    const g = (await inv("practice_submit", {
      profileId,
      contentId: deps.practiceTarget.contentId,
      modality: deps.practiceTarget.modality,
      choiceIndex: index,
      revealReading: deps.practiceRevealed,
      sessionId: deps.activeSessionId(),
      stageId: drillStageId(deps.lesson),
    })) as { correct: boolean; correct_choice: string };
    deps.setPracticeCorrect(g.correct);
    deps.setPracticeCorrectChoice(g.correct_choice);
    deps.setPracticeGraded(true);
  } catch (e) {
    deps.setPracticeError(String(e));
  }
}

// K-12: typed grading. The draft goes native; the expected string was
// never sent to the UI, so cloze/dictation evidence stays honest.
export async function runCheckPractice(deps: PracticeWiringDeps): Promise<void> {
  const { inv, profileId } = deps;
  if (!deps.practiceTarget || !inv || !profileId) return;
  try {
    const g = (await inv("practice_submit", {
      profileId,
      contentId: deps.practiceTarget.contentId,
      modality: deps.practiceTarget.modality,
      choiceIndex: 0,
      answer: deps.practiceDraft,
      revealReading: deps.practiceRevealed,
      sessionId: deps.activeSessionId(),
      stageId: drillStageId(deps.lesson),
    })) as { correct: boolean; correct_choice: string };
    deps.setPracticeCorrect(g.correct);
    deps.setPracticeCorrectChoice(g.correct_choice);
    deps.setPracticeGraded(true);
  } catch (e) {
    deps.setPracticeError(String(e));
  }
}

export async function runFinishPractice(deps: PracticeWiringDeps): Promise<void> {
  const { inv, profileId, budget } = deps;
  deps.setPracticeTarget(null);
  deps.setPracticeTask(null);
  deps.setPracticeAudio(null);
  deps.setPracticeAudioError(null);
  deps.setPracticeDraft("");
  deps.setPracticeRevealed(false);
  deps.setPracticeSpeakCheck(null);
  if (inv && profileId) {
    try {
      deps.applyPlan((await inv("practice_plan", { profileId, minutes: budget })) as SessionPlan);
    } catch (e) {
      deps.setPracticeError(`The plan could not be refreshed: ${String(e)}`);
    }
  }
  // A session keeps working the activities it started with; the refreshed
  // plan is read the next time Home is, not re-selected mid-session.
  if (deps.sessionWiringDeps.sessionQueueRef.current)
    void runAdvanceSession(deps.sessionWiringDeps, 1);
}
