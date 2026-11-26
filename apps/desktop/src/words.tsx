/**
 * K-33 "my words": words the learner chose to keep, with the citation of where
 * they met them. Reviews are self-graded and stay on the device; they never
 * count as mastery evidence (that distinction is contractual, so the panel
 * states it in its own copy, not only the docs).
 *
 * Direction (RTL-001, ADR-0029): a mined surface and reading are pack-language
 * content, so the review card and the add-word inputs carry the active pack's
 * `dir`/`lang`. The meaning and citation fields are the learner's own notes and
 * stay untouched.
 */
import { PackText, usePackTextAttrs } from "@openlang/ui";
import { EmptyState } from "./empty-state";
import { useEffect, useRef, useState } from "react";
import { useKanaIME } from "./kana-ime";
import type { ImeCandidate } from "./ime-candidates";

/// FEEL-MYWORDS-001: how long the UNDO chip lives after a Remove, per the
/// target mockup's motion legend ("the UNDO chip fades in after release and
/// lives 4s, so a mis-swipe is always one tap from back").
const UNDO_LIFE_MS = 4000;

/**
 * FEEL-MYWORDS-001: the audit flagged the raw ISO slice (`due_at.slice(0,10)`)
 * as the due-date treatment — a machine date in a learning surface. The due
 * pill speaks the learner's own tense instead: yesterday / today / tomorrow /
 * in N days, with honest bigger units (months, years) for long intervals.
 * Calendar-day math in the learner's timezone — an interval is a day count,
 * not an instant delta.
 */
export function relativeDueLabel(iso: string, now: Date = new Date()): string {
  const due = new Date(iso);
  if (!Number.isFinite(due.getTime())) return "soon";
  const midnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((midnight(due) - midnight(now)) / 86_400_000);
  if (days < -1) return `${-days} days overdue`;
  if (days === -1) return "yesterday";
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days <= 60) return `in ${days} days`;
  if (days <= 365) return `in ~${Math.round(days / 30.44)} months`;
  const years = Math.round(days / 365.25);
  return `in ~${years} year${years === 1 ? "" : "s"}`;
}

/**
 * SESSION-CHROME-001 (U6, Quizlet/Anki idiom): a grade button states the
 * interval the scheduler predicts for it. The number is the engine's own
 * FSRS prediction converted to a readable unit; the "~" keeps it marked
 * as a prediction, and callers render nothing when there is no state.
 */
export function previewIntervalLabel(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "soon";
  if (seconds < 3600) return `back in ~${Math.max(1, Math.round(seconds / 60))} min`;
  if (seconds < 86_400) return `back in ~${Math.round(seconds / 3600)} h`;
  return `back in ~${Math.round(seconds / 86_400)} days`;
}

export interface MineItem {
  id: string;
  surface: string;
  reading: string | null;
  gloss: string | null;
  source_citation: string;
  created_at: string;
  due_at: string | null;
  /// VOCAB-BUILDER-001: the sentence this word was met in, when the word
  /// entered through a reader tap (null for manual mines). Mirrors the
  /// wire shape: the engine always answers both fields.
  context_sentence_id: string | null;
  /// The context sentence's text, resolved by the engine against the
  /// active pack. Null when there is no context or the sentence is no
  /// longer in the pack — the drill then shows no context line.
  context_sentence: string | null;
}

export interface MineDraft {
  surface: string;
  reading: string;
  gloss: string;
  source: string;
}

export interface MyWordsPanelProps {
  items: MineItem[];
  /// FEEL-LOADING-001: the `mine_list` read is in flight. The panel then
  /// shows breathing skeleton rows — NOT the previous list (the stale-list
  /// bug the audit named) and not the "nothing mined yet" story either.
  loading?: boolean;
  review: { item: MineItem; revealed: boolean } | null;
  error: string | null;
  notice: string | null;
  draft: MineDraft;
  onDraftChange(field: keyof MineDraft, value: string): void;
  onAdd(): void;
  onRemove(id: string): void;
  /// FEEL-MYWORDS-001: id of the word that just landed from an add — that
  /// row plays the one-shot success pulse (`mine-card--flash`). Null clears.
  flashId?: string | null;
  onGrade(again: boolean): void;
  onReviewNow(id: string): void;
  onStartNewReview(): void;
  onStartReview(): void;
  onReveal(): void;
  /// VOCAB-BUILDER-001: replay the sentence the word was met in (the
  /// existing `story_audio` sentence path). Optional: a caller with no
  /// audio wiring renders no Play button, never a broken one.
  onPlayContext?(sentenceId: string): void;
  /// SESSION-CHROME-001 (U6): the FSRS scheduler's predicted next interval
  /// (seconds) for each grade button, read from the item's existing state
  /// via `srs_interval_preview`. Null/undefined means the scheduler has no
  /// state for this item yet — the buttons then show no interval at all.
  intervalPreview?: { again_seconds: number; good_seconds: number } | null;
  /// Issue #2 phase 1: in-app kana keyboard for the surface/reading fields.
  kanaInput?: boolean;
  /// IN-APP-IME-001 phase 2: pack-lexicon candidate lookup for the kana
  /// fields (undefined when the active pack's declared input methods rule
  /// the method out). Enter arms conversion, Space cycles candidates.
  imeCandidates?: (kana: string) => Promise<ImeCandidate[]>;
}

export function MyWordsPanel(p: MyWordsPanelProps) {
  const packAttrs = usePackTextAttrs();
  // FEEL-MYWORDS-001: Remove is no longer a one-click silent delete. The row
  // leaves at once and a UNDO chip lives UNDO_LIFE_MS where it stood; the
  // engine delete fires only when that life expires. UNDO cancels; a second
  // Remove commits the previous pending one first (never two racing chips);
  // unmounting mid-window flushes the delete, so navigating away never
  // resurrects a word the learner already dismissed. The mockup's swipe-to-
  // reveal is the same recovery story behind a gesture; on this pointer-
  // first surface the chip carries it.
  const [pending, setPending] = useState<{ id: string; surface: string } | null>(null);
  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  const commitRef = useRef(p.onRemove);
  commitRef.current = p.onRemove;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTimer = () => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };
  function queueRemove(id: string, surface: string) {
    clearTimer();
    const previous = pendingRef.current;
    if (previous) commitRef.current(previous.id);
    setPending({ id, surface });
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      const it = pendingRef.current;
      setPending(null);
      if (it) commitRef.current(it.id);
    }, UNDO_LIFE_MS);
  }
  function undoPending() {
    clearTimer();
    setPending(null);
  }
  useEffect(
    () => () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      const it = pendingRef.current;
      if (it) commitRef.current(it.id);
    },
    [],
  );
  const kanaSurface = useKanaIME({
    enabled: p.kanaInput === true,
    value: p.draft.surface,
    onDraft: (v) => p.onDraftChange("surface", v),
    candidates: p.imeCandidates,
  });
  const kanaReading = useKanaIME({
    enabled: p.kanaInput === true,
    value: p.draft.reading,
    onDraft: (v) => p.onDraftChange("reading", v),
    candidates: p.imeCandidates,
  });
  return (
    <section aria-label="My words">
      <h1>My words</h1>
      <p className="empty">
        Words you chose to keep, with where you met them. Reviews are self-graded and stay on this
        device; they never count as mastery evidence.
      </p>
      {p.error && (
        <p role="alert" className="alert">
          {p.error}
        </p>
      )}
      {p.notice && (
        <p role="status" className="notice">
          {p.notice}
        </p>
      )}
      {p.review ? (
        // FEEL-MYWORDS-001: the review card enters with card-in and the
        // revealed answer rises with fade-up — both FEEL-GLOBAL keyframes.
        <div className="field review-card">
          <PackText tag="p" className="prompt">
            {p.review.item.surface}
          </PackText>
          {p.review.revealed ? (
            <div className="review-reveal">
              {p.review.item.gloss ? (
                <p>{p.review.item.gloss}</p>
              ) : p.review.item.reading ? (
                <p {...packAttrs}>{p.review.item.reading}</p>
              ) : (
                <p>(no gloss)</p>
              )}
              <p className="notice">Met in: {p.review.item.source_citation}</p>
              {p.review.item.context_sentence && (
                <p className="notice">
                  In this sentence: <PackText tag="span">{p.review.item.context_sentence}</PackText>
                  {p.onPlayContext && p.review.item.context_sentence_id && (
                    <button
                      type="button"
                      className="btn btn--quiet"
                      onClick={() => {
                        const sid = p.review?.item.context_sentence_id;
                        if (sid) p.onPlayContext?.(sid);
                      }}
                    >
                      Play
                    </button>
                  )}
                </p>
              )}
              <div className="btn-row">
                <button type="button" className="btn" onClick={() => p.onGrade(false)}>
                  I knew it
                  {p.intervalPreview ? (
                    <span className="grade-preview">
                      {" "}
                      — {previewIntervalLabel(p.intervalPreview.good_seconds)}
                    </span>
                  ) : null}
                </button>
                <button type="button" className="btn btn--quiet" onClick={() => p.onGrade(true)}>
                  Again
                  {p.intervalPreview ? (
                    <span className="grade-preview">
                      {" "}
                      — {previewIntervalLabel(p.intervalPreview.again_seconds)}
                    </span>
                  ) : null}
                </button>
              </div>
            </div>
          ) : (
            <div className="btn-row">
              <button type="button" className="btn btn--primary" onClick={p.onReveal}>
                Reveal
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="btn-row">
          <button type="button" className="btn btn--primary" onClick={p.onStartReview}>
            Review due words
          </button>
          {p.items.some((m) => !m.due_at) && (
            <button type="button" className="btn btn--quiet" onClick={p.onStartNewReview}>
              Review new words
            </button>
          )}
        </div>
      )}
      <div className="field">
        <label htmlFor="mine-surface">Word or phrase</label>
        <input
          id="mine-surface"
          type="text"
          value={p.draft.surface}
          onKeyDown={kanaSurface.onKeyDown}
          onChange={(e) => {
            kanaSurface.noteExternalEdit();
            p.onDraftChange("surface", e.target.value);
          }}
          {...packAttrs}
        />
        <label htmlFor="mine-reading">Reading (optional)</label>
        <input
          id="mine-reading"
          type="text"
          value={p.draft.reading}
          onKeyDown={kanaReading.onKeyDown}
          onChange={(e) => {
            kanaReading.noteExternalEdit();
            p.onDraftChange("reading", e.target.value);
          }}
          {...packAttrs}
        />
        <label htmlFor="mine-gloss">Meaning (optional)</label>
        <input
          id="mine-gloss"
          type="text"
          value={p.draft.gloss}
          onChange={(e) => p.onDraftChange("gloss", e.target.value)}
        />
        <label htmlFor="mine-source">Where did you meet it? (citation)</label>
        <input
          id="mine-source"
          type="text"
          value={p.draft.source}
          onChange={(e) => p.onDraftChange("source", e.target.value)}
        />
        <div className="btn-row">
          <button
            type="button"
            className="btn btn--primary"
            disabled={p.draft.surface.trim() === ""}
            onClick={p.onAdd}
          >
            Add to my words
          </button>
        </div>
      </div>
      {p.loading ? (
        // FEEL-LOADING-001: the read is in flight — say so in place of the
        // list itself. Never the previous list (the stale-list bug), never
        // the "nothing mined yet" story for data that is merely arriving.
        <div className="skeleton-list" role="status" aria-label="Loading saved words">
          <span className="skeleton-row" />
          <span className="skeleton-row" />
          <span className="skeleton-row" />
        </div>
      ) : p.items.length === 0 ? (
        <EmptyState
          glyph="book"
          title="Nothing mined yet."
          copy="Add a word above or from a story lookup."
          actionLabel="Add a word"
          actionHref="#mine-surface"
          dataTestId="mywords-empty"
        />
      ) : (
        <div className="mine-list">
          {p.items.map((m) =>
            pending && pending.id === m.id ? (
              // The row left at once; the chip keeps it one tap from back.
              <div key={m.id} className="undo-chip-row">
                <button
                  type="button"
                  className="undo-chip"
                  aria-label={`Undo removing ${m.surface}`}
                  onClick={undoPending}
                >
                  UNDO “{m.surface}”
                </button>
              </div>
            ) : (
              <div
                key={m.id}
                className={p.flashId === m.id ? "mine-card mine-card--flash" : "mine-card"}
              >
                <span className="w">
                  <PackText tag="span">{m.surface}</PackText>
                </span>
                {m.reading ? (
                  <span className="g">
                    (<PackText tag="span">{m.reading}</PackText>)
                  </span>
                ) : (
                  ""
                )}
                {m.gloss ? <span className="g">{m.gloss}</span> : ""}
                {m.due_at ? (
                  <span className="due">{relativeDueLabel(m.due_at)}</span>
                ) : (
                  <span className="due due--new">new</span>
                )}
                <div className="mine-sub">
                  <small>{m.source_citation}</small>
                  <span className="btn-row mine-actions">
                    {!m.due_at && (
                      <button
                        type="button"
                        className="btn btn--quiet"
                        onClick={() => p.onReviewNow(m.id)}
                      >
                        Review now
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn--quiet"
                      onClick={() => queueRemove(m.id, m.surface)}
                    >
                      Remove
                    </button>
                  </span>
                </div>
              </div>
            ),
          )}
        </div>
      )}
    </section>
  );
}
