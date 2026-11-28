/**
 * WRITE-PRACTICE-001: free writing practice with mechanical, offline
 * feedback. The prompt is "use today's words" — a session-scoped set of
 * target words from the current lesson pool plus one L1 situational cue.
 * On submit the app answers with what it can verify with ZERO AI:
 *
 * - per-word script/dictionary status (unknown tokens are "not in
 *   dictionary", never "wrong" — v1 makes no correction claim at all),
 * - which target words actually appeared (inflected/variant forms count —
 *   the typing mode's accepted-form matcher answers),
 * - the attempt's word count.
 *
 * HARD INVARIANT: the usage count is a completion signal only. This screen
 * performs no mastery/scheduler write (pinned in Rust by
 * `writing_check_performs_zero_mastery_or_scheduler_writes` and in the
 * journey by a write-command denylist). The journal is private per
 * profile and deleted with the profile.
 */
import { LatinText, PackText, usePackTextAttrs } from "@openlang/ui";

export interface WritingPromptTarget {
  item_id: string;
  surface: string;
  gloss: string;
}

export interface WritingPrompt {
  targets: WritingPromptTarget[];
  cue: string;
}

export interface WritingWord {
  token: string;
  status: "known" | "unknown" | "invalid-script";
}

export interface WritingCheckResult {
  words: WritingWord[];
  /** Session target ids the attempt used (variants included). */
  used_targets: string[];
  word_count: number;
  dictionary_word_count: number;
}

export interface WritingJournalEntry {
  id: string;
  pack_id: string;
  text: string;
  word_count: number;
  targets_used: number;
  occurred_at: string;
}

export interface WritingMeters {
  attempts_this_week: number;
  unique_dictionary_words: number;
}

export interface FreeWritingPanelProps {
  prompt: WritingPrompt | null;
  promptError: string | null;
  value: string;
  onChange: (text: string) => void;
  onSubmit: () => void;
  onNewPrompt: () => void;
  result: WritingCheckResult | null;
  submitting: boolean;
  /** A failed `writing_check` read — an error, never the empty-state story. */
  checkError: string | null;
  /** The learner's own past attempts, newest-first. */
  journal: WritingJournalEntry[];
  /** A failed journal read — the empty state must never mask it. */
  journalError: string | null;
}

/** Soft floor: a gentle nudge, never a gate — the submit stays enabled. */
export const WRITING_SOFT_FLOOR_WORDS = 15;

/** Mirror of the Rust tokenizer: maximal runs of letters, so the on-screen
 * count is the count the engine will journal. */
export function countWritingWords(text: string): number {
  return text.split(/[^\p{L}]+/u).filter((t) => t.length > 0).length;
}

export function FreeWritingPanel(p: FreeWritingPanelProps) {
  const packAttrs = usePackTextAttrs();
  const result = p.result;
  const usedCount = result ? result.used_targets.length : 0;
  const words = countWritingWords(p.value);
  const prompt = p.prompt;
  const usedSet = new Set(result?.used_targets ?? []);
  return (
    <section aria-label="Free writing">
      <h2>Free writing: use today's words</h2>
      <p className="prompt">
        Write a few sentences that use today's words. The app checks what a dictionary can check —
        script, dictionary coverage, and which target words you used. Guided feedback, not a grade:
        v1 never corrects your grammar. Every attempt is a completion signal only — it never changes
        your plan or your scores.
      </p>
      {prompt && (
        <div className="card" data-testid="fw-prompt">
          <p className="fw-cue">
            <LatinText>{prompt.cue}</LatinText>
          </p>
          <ul className="fw-targets" aria-label="Today's words" data-testid="fw-targets">
            {prompt.targets.map((t) => (
              <li
                key={t.item_id}
                className="fw-target"
                data-testid="fw-target"
                data-used={usedSet.has(t.item_id) ? "true" : undefined}
              >
                <PackText tag="span" className="fw-target-surface" {...packAttrs}>
                  {t.surface}
                </PackText>
                {t.gloss && (
                  <span className="fw-target-gloss">
                    <LatinText>{t.gloss}</LatinText>
                  </span>
                )}
                {usedSet.has(t.item_id) && (
                  <span data-testid="fw-used-chip" className="fw-chip">
                    used
                  </span>
                )}
              </li>
            ))}
          </ul>
          <button type="button" className="btn btn--quiet" onClick={p.onNewPrompt}>
            New prompt
          </button>
        </div>
      )}
      {p.promptError && (
        <p role="alert" className="alert">
          {p.promptError}
        </p>
      )}
      <div className="fw-editor" role="group" aria-label="Your writing">
        <textarea
          data-testid="fw-text"
          className="input fw-text"
          rows={6}
          aria-label="Your writing"
          value={p.value}
          onChange={(e) => p.onChange(e.target.value)}
          placeholder="…"
          {...packAttrs}
        />
        <div className="btn-row">
          <button
            type="button"
            className="btn btn--primary"
            onClick={p.onSubmit}
            disabled={p.submitting || words === 0}
          >
            {p.submitting ? "Checking…" : "Check"}
          </button>
          {words > 0 && words < WRITING_SOFT_FLOOR_WORDS && (
            <span className="notice" data-testid="fw-soft-floor">
              Aim for about {WRITING_SOFT_FLOOR_WORDS} words — but short is fine too.
            </span>
          )}
        </div>
        {p.checkError && (
          <p role="alert" className="alert" data-testid="fw-check-error">
            {p.checkError}
          </p>
        )}
      </div>
      {result && (
        <div aria-live="polite" className="card">
          <p data-testid="fw-count" className="notice">
            {result.word_count} words, {result.dictionary_word_count} in the dictionary.
          </p>
          <p data-testid="fw-usage" className="notice">
            You used {usedCount} of {prompt ? prompt.targets.length : 0} of today's words.
          </p>
          <div className="fw-result">
            <PackText tag="p" {...packAttrs}>
              {result.words.map((w, i) => (
                <span
                  key={i}
                  data-testid="fw-word"
                  data-status={w.status}
                  className={`word fw-word fw-word--${w.status}`}
                >
                  {w.token}
                  {i < result.words.length - 1 ? " " : ""}
                </span>
              ))}
            </PackText>
          </div>
          {result.words.some((w) => w.status === "unknown") && (
            <p data-testid="fw-unknown-note" className="notice">
              Words marked "not in dictionary" are only missing from the pack's dictionary — they
              may be perfectly right. Names and loan words often land here.
            </p>
          )}
          <p>
            <small data-testid="fw-mode">
              This is a completion signal only — the attempt never changes your plan, reviews, or
              progress scores. Your writing stays on this device.
            </small>
          </p>
        </div>
      )}
      <div className="fw-journal" data-testid="fw-journal">
        <h3>Writing journal</h3>
        {p.journalError ? (
          <p role="alert" className="alert" data-testid="fw-journal-error">
            {p.journalError}
          </p>
        ) : p.journal.length === 0 ? (
          <p className="notice">
            Your attempts will be saved here, newest first, only on this device.
          </p>
        ) : (
          <ul>
            {p.journal.map((e) => (
              <li key={e.id} data-testid="fw-journal-entry">
                <PackText tag="p" {...packAttrs}>
                  {e.text}
                </PackText>
                <small>
                  {e.word_count} words · {e.targets_used} of today's words used ·{" "}
                  {e.occurred_at.slice(0, 10)}
                </small>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/**
 * The Progress-surface accumulation meters for free writing. SETTLE GATE
 * (ACCUMULATION-METERS pattern): `meters === null` means the read has not
 * landed (or failed) — the strip abstains instead of inventing a zero.
 * Both counts only ever grow (within the rolling week): accumulation,
 * never debt.
 */
export function WritingMetersStrip({ meters }: { meters: WritingMeters | null }) {
  if (!meters) return null;
  return (
    <div
      className="fw-meters"
      role="group"
      aria-label="Free writing progress"
      data-testid="fw-meters"
    >
      <span data-testid="fw-meter-attempts">
        {meters.attempts_this_week} writing attempts this week
      </span>
      <span data-testid="fw-meter-words">
        {meters.unique_dictionary_words} unique dictionary words
      </span>
    </div>
  );
}
