/**
 * APP-SPLIT-003G: the Mine / error-review wiring slice, moved out of App()
 * without behavior change. App.tsx still owns every hook and all state;
 * this module owns the bodies of the My-words + error-review surface:
 * refreshMine, openWords, addMine, mineFromStory, playMineContext,
 * toggleContentConfirm, removeMine, gradeMine, acceptErrorOffer,
 * refreshErrorReviews, startErrorReview, gradeErrorReview, startMineReview,
 * startNewMineReview, reviewMineNow — plus the SESSION-CHROME-001 interval
 * preview probe effect body (startMinePreviewProbe). The deps object is
 * built once per render in App() (after every referenced binding is in
 * scope) and the thin wrappers App keeps are hoisted `function`
 * declarations, so reads keep the exact old timing. Same pattern as
 * APP-SPLIT-003A..F.
 */
import type { Dispatch, SetStateAction } from "react";
import type { Story } from "../reading";
import type { ErrorReviewCardView, FormErrorOfferView } from "../error-review";
import type { MineItem } from "../words";
import { detectInvoke } from "./primitives";

/** Every dependency of the Mine wiring slice: plain render values +
 *  setters + App-owned callbacks (no hooks). Mirrors exactly what the old
 *  inline closures in App() captured. */
export interface MineWiringDeps {
  profileId: string | null;
  displayName: string;
  mineItems: MineItem[];
  mineSurface: string;
  mineReading: string;
  mineGloss: string;
  mineSource: string;
  mineReview: { item: MineItem; revealed: boolean } | null;
  errCards: ErrorReviewCardView[];
  errReview: { card: ErrorReviewCardView; revealed: boolean } | null;
  storyActive: Story | null;
  playSentenceClip: (sentenceId: string, onError: (message: string) => void) => Promise<void>;
  setMineItems: (v: MineItem[]) => void;
  setMineCount: (v: number) => void;
  setMineFlashId: (v: string | null) => void;
  setWordsLoading: (v: boolean) => void;
  setMineSurface: (v: string) => void;
  setMineReading: (v: string) => void;
  setMineGloss: (v: string) => void;
  setMineSource: (v: string) => void;
  setMineError: (v: string | null) => void;
  setMineNotice: (v: string | null) => void;
  setMineReview: (v: { item: MineItem; revealed: boolean } | null) => void;
  setRoute: (v: "words") => void;
  setErrCards: (v: ErrorReviewCardView[]) => void;
  setErrReview: (v: { card: ErrorReviewCardView; revealed: boolean } | null) => void;
  setErrError: (v: string | null) => void;
  setErrNotice: (v: string | null) => void;
  setStoryError: (v: string | null) => void;
  // The raw useState setter: the content-confirm splice applies a
  // functional update, exactly like the old inline closure did.
  setStoryActive: Dispatch<SetStateAction<Story | null>>;
  setAcceptedOffers: Dispatch<SetStateAction<string[]>>;
}

/** Dependencies of the SESSION-CHROME-001 interval-preview probe: only the
 *  values the effect's own dependency list names. */
export interface MinePreviewProbeDeps {
  profileId: string | null;
  mineReview: { item: MineItem; revealed: boolean } | null;
  setMinePreview: (v: { again_seconds: number; good_seconds: number } | null) => void;
}

/** SESSION-CHROME-001 (U6): the scheduler's predicted next interval for
 *  the two grade buttons, read from the item's existing state. Null = no
 *  preview fetched (or the fetch failed), and the buttons show no number.
 *  Body moved verbatim from App() — returns the effect cleanup. */
export function startMinePreviewProbe(deps: MinePreviewProbeDeps): () => void {
  const { profileId, mineReview, setMinePreview } = deps;
  const inv = detectInvoke();
  if (!inv || !profileId || !mineReview) {
    setMinePreview(null);
    return () => {};
  }
  let live = true;
  void inv("srs_interval_preview", { profileId, itemId: mineReview.item.id })
    .then((v) => {
      if (live) setMinePreview(v as { again_seconds: number; good_seconds: number });
    })
    .catch(() => {
      // A failed preview degrades to plain buttons — the grades
      // themselves work exactly as before.
      if (live) setMinePreview(null);
    });
  return () => {
    live = false;
  };
}

// K-14: learner-owned lexicon. Mined words are device-local, cited,
// and scheduled by their own SRS rows — never mastery evidence.
export async function runRefreshMine(deps: MineWiringDeps): Promise<void> {
  const { profileId } = deps;
  const inv = detectInvoke();
  if (!inv || !profileId) return;
  try {
    const items = (await inv("mine_list", { profileId })) as typeof deps.mineItems;
    deps.setMineItems(items);
    // ACCUMULATION-METERS-001: the kept-words count the Today header shows.
    deps.setMineCount(items.length);
    deps.setMineError(null);
  } catch (e) {
    deps.setMineError(String(e));
  }
}

export async function runOpenWords(deps: MineWiringDeps): Promise<void> {
  deps.setRoute("words");
  deps.setMineReview(null);
  deps.setErrReview(null);
  deps.setErrError(null);
  deps.setErrNotice(null);
  deps.setMineFlashId(null);
  // FEEL-LOADING-001: prime with the flag up so the panel shows skeleton
  // rows instead of yesterday's list (or a false empty state).
  deps.setWordsLoading(true);
  try {
    await runRefreshMine(deps);
    await runRefreshErrorReviews(deps);
  } finally {
    deps.setWordsLoading(false);
  }
}

export async function runAddMine(deps: MineWiringDeps, sourceCitation?: string): Promise<void> {
  const { profileId, mineSurface, mineReading, mineGloss, mineSource } = deps;
  const inv = detectInvoke();
  if (!inv || !profileId) return;
  try {
    const res = (await inv("mine_add", {
      profileId,
      surface: mineSurface,
      reading: mineReading || null,
      gloss: mineGloss || null,
      sourceCitation: (sourceCitation ?? mineSource) || "manual",
    })) as { id: string; was_new: boolean };
    // K-61: a repeat mine keeps the original entry (and its review
    // history). Say so in the learner's own words instead of letting a
    // database constraint surface as an error.
    if (!res.was_new) {
      deps.setMineNotice(
        `"${mineSurface.trim()}" is already in My words — kept the original entry.`,
      );
    }
    // FEEL-MYWORDS-001: the add lands with a pulse on the row that
    // arrived — or on the kept original when the mine was a repeat.
    deps.setMineFlashId(res.id);
    deps.setMineSurface("");
    deps.setMineReading("");
    deps.setMineGloss("");
    deps.setMineSource("");
    await runRefreshMine(deps);
  } catch (e) {
    deps.setMineError(String(e));
  }
}

export async function runMineFromStory(
  deps: MineWiringDeps,
  surface: string,
  reading: string | null,
  gloss: string | null,
): Promise<void> {
  const { profileId, storyActive } = deps;
  const inv = detectInvoke();
  if (!inv || !profileId || !storyActive) return;
  try {
    const res = (await inv("mine_add", {
      profileId,
      surface,
      reading,
      gloss,
      sourceCitation: storyActive.id,
    })) as { id: string; was_new: boolean };
    // K-61: mining a word already kept is not an error; the original
    // entry (and its review history) stays. Note it for when the
    // learner opens My words — never as a story error.
    if (!res.was_new) {
      deps.setMineNotice(`"${surface}" is already in My words — kept the original entry.`);
    }
    await runRefreshMine(deps);
  } catch (e) {
    deps.setStoryError(String(e));
  }
}

// VOCAB-BUILDER-001: the My-words drill replays the sentence the word
// was met in, through the SAME `story_audio` sentence path the reader
// uses — one audio truth, no second clip mechanism.
export async function runPlayMineContext(deps: MineWiringDeps, sentenceId: string): Promise<void> {
  await deps.playSentenceClip(sentenceId, deps.setMineError);
}

// CONTENT-CONFIRM-001 (ADR-0040): the ONLY way a confirmation mark is
// ever created — this explicit click. The engine resolves the pack from
// the profile's active selection, attributes the mark to the profile,
// and answers with who now stands behind the item; we splice that
// attribution straight back into the open view.
export async function runToggleContentConfirm(
  deps: MineWiringDeps,
  contentId: string,
): Promise<void> {
  const { profileId, storyActive, displayName } = deps;
  const inv = detectInvoke();
  if (!inv || !profileId || !storyActive) return;
  const marks = storyActive.confirmations?.[contentId] ?? [];
  const mine = marks.some((c) => c.display_name === displayName);
  try {
    const res = (await inv(mine ? "content_unconfirm" : "content_confirm", {
      profileId,
      contentId,
    })) as { content_id: string; confirmed_by: { display_name: string; at: string }[] };
    deps.setStoryActive((prev) =>
      prev
        ? {
            ...prev,
            confirmations: { ...(prev.confirmations ?? {}), [contentId]: res.confirmed_by },
          }
        : prev,
    );
  } catch (e) {
    deps.setStoryError(String(e));
  }
}

export async function runRemoveMine(deps: MineWiringDeps, id: string): Promise<void> {
  const { profileId } = deps;
  const inv = detectInvoke();
  if (!inv || !profileId) return;
  try {
    await inv("mine_remove", { profileId, itemId: id });
    await runRefreshMine(deps);
  } catch (e) {
    deps.setMineError(String(e));
  }
}

export async function runGradeMine(deps: MineWiringDeps, again: boolean): Promise<void> {
  const { profileId, mineReview } = deps;
  const inv = detectInvoke();
  if (!inv || !profileId || !mineReview) return;
  try {
    await inv("mine_grade", { profileId, itemId: mineReview.item.id, again });
    deps.setMineReview(null);
    await runRefreshMine(deps);
  } catch (e) {
    deps.setMineError(String(e));
  }
}

// FIX-ERR-SRS-LOOP-001-2 (D3): the ONLY front-end call sites of the
// error-review commands. Accept is a deliberate click on an offer —
// rendering offers never triggers these; the engine creates the card
// inside `error_review_accept`, so an unaccepted offer schedules
// nothing (the never-silent invariant, pinned in error-review.test).
export async function runAcceptErrorOffer(
  deps: MineWiringDeps,
  offer: FormErrorOfferView,
  fail: (msg: string) => void,
): Promise<void> {
  const { profileId } = deps;
  const inv = detectInvoke();
  if (!inv || !profileId) return;
  try {
    await inv("error_review_accept", { profileId, ledgerId: offer.ledger_id });
    deps.setAcceptedOffers((prev) =>
      prev.includes(offer.ledger_id) ? prev : [...prev, offer.ledger_id],
    );
  } catch (e) {
    fail(String(e));
  }
}

export async function runRefreshErrorReviews(deps: MineWiringDeps): Promise<void> {
  const { profileId } = deps;
  const inv = detectInvoke();
  if (!inv || !profileId) return;
  try {
    deps.setErrCards((await inv("error_review_queue", { profileId })) as ErrorReviewCardView[]);
  } catch (e) {
    deps.setErrError(String(e));
  }
}

export function runStartErrorReview(deps: MineWiringDeps): void {
  const [first] = deps.errCards;
  if (!first) {
    deps.setErrNotice("Nothing is due for review right now.");
    return;
  }
  deps.setErrNotice(null);
  deps.setErrReview({ card: first, revealed: false });
}

export async function runGradeErrorReview(deps: MineWiringDeps, again: boolean): Promise<void> {
  const { profileId, errReview } = deps;
  const inv = detectInvoke();
  if (!inv || !profileId || !errReview) return;
  try {
    await inv("error_review_grade", { profileId, cardId: errReview.card.card_id, again });
    deps.setErrReview(null);
    await runRefreshErrorReviews(deps);
  } catch (e) {
    deps.setErrError(String(e));
  }
}

export async function runStartMineReview(deps: MineWiringDeps): Promise<void> {
  const { profileId } = deps;
  const inv = detectInvoke();
  if (!inv || !profileId) return;
  try {
    // D8: the engine owns what "due" means (`mine_due` compares the stored
    // schedule against the same clock the scheduler wrote). Comparing
    // `due_at` to a client-side clock here could disagree with it, so the
    // duplicated local filter is gone.
    const due = (await inv("mine_due", { profileId })) as typeof deps.mineItems;
    const [first] = due;
    if (!first) {
      deps.setMineNotice("Nothing is due for review right now.");
      return;
    }
    deps.setMineNotice(null);
    deps.setMineReview({ item: first, revealed: false });
  } catch (e) {
    deps.setMineError(String(e));
  }
}

// U03: the engine answers which saved words were never scheduled; the UI
// opens the existing reveal+self-grade card for one of them. The first
// grade then goes through `mine_grade`, which seeds the schedule — the
// same single grading path due reviews use.
export async function runStartNewMineReview(deps: MineWiringDeps): Promise<void> {
  const { profileId } = deps;
  const inv = detectInvoke();
  if (!inv || !profileId) return;
  try {
    const fresh = (await inv("mine_new", { profileId })) as typeof deps.mineItems;
    const [first] = fresh;
    if (!first) {
      deps.setMineNotice("No new words are waiting for their first review.");
      return;
    }
    deps.setMineNotice(null);
    deps.setMineReview({ item: first, revealed: false });
  } catch (e) {
    deps.setMineError(String(e));
  }
}

export function runReviewMineNow(deps: MineWiringDeps, id: string): void {
  const item = deps.mineItems.find((m) => m.id === id);
  if (!item || item.due_at) return;
  deps.setMineNotice(null);
  deps.setMineReview({ item, revealed: false });
}
