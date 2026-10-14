/**
 * WRITE-001 typing/composition surface: a plain text input for
 * Japanese answers. The platform IME handles kana conversion; the app
 * never requires handwriting and renders no stroke/canvas surface.
 */
import { usePackTextAttrs } from "@openlang/ui";
import { StressText } from "./stress";

export interface WritingTaskView {
  item_id: string;
  prompt_text: string;
  reading_hint?: string;
  romaji_hint?: string;
}

export interface WritingPracticeProps {
  task: WritingTaskView;
  draft: string;
  graded: boolean;
  correct: boolean;
  onDraft(value: string): void;
  onSubmit(): void;
  onHint(kind: "reading" | "romaji"): void;
  /// K-41: highlight U+0301-stressed vowels in the reading hint
  /// (display-only).
  stress?: boolean;
}

export function WritingPractice(p: WritingPracticeProps) {
  const packAttrs = usePackTextAttrs();
  return (
    <section aria-label="Writing practice">
      <h1>Writing practice</h1>
      <p className="prompt" {...packAttrs}>
        {p.task.prompt_text}
      </p>
      {p.task.reading_hint && (
        <p aria-label="Reading hint" {...packAttrs}>
          {p.stress ? <StressText text={p.task.reading_hint} /> : p.task.reading_hint}
        </p>
      )}
      {p.task.romaji_hint && (
        <p aria-label="Romaji hint" dir="ltr">
          {p.task.romaji_hint}
        </p>
      )}
      <div className="field">
        <label htmlFor="writing-answer">Type the answer in Japanese (IME supported)</label>
        <input
          id="writing-answer"
          type="text"
          {...packAttrs}
          value={p.draft}
          onChange={(e) => p.onDraft(e.target.value)}
        />
      </div>
      <div className="btn-row">
        <button type="button" className="btn btn--quiet" onClick={() => p.onHint("reading")}>
          Show reading
        </button>
        <button type="button" className="btn btn--quiet" onClick={() => p.onHint("romaji")}>
          Show romaji
        </button>
        <button
          type="submit"
          className="btn btn--primary"
          onClick={p.onSubmit}
          disabled={p.draft.trim() === ""}
        >
          Check
        </button>
      </div>
      {/* WCAG 4.1.3: the polite region must exist before the verdict mutates
          it — same discipline as the practice runner (PS-03). */}
      <p
        aria-live="polite"
        className={
          p.graded ? (p.correct ? "verdict verdict--correct" : "verdict verdict--retry") : undefined
        }
      >
        {p.graded ? (p.correct ? "Correct" : "Try again") : ""}
      </p>
    </section>
  );
}
