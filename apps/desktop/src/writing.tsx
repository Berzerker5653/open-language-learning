/**
 * WRITE-001 typing/composition surface: a plain text input for
 * Japanese answers. The platform IME handles kana conversion; the app
 * never requires handwriting and renders no stroke/canvas surface.
 */

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
}

export function WritingPractice(p: WritingPracticeProps) {
  return (
    <section aria-label="Writing practice">
      <p>{p.task.prompt_text}</p>
      {p.task.reading_hint && (
        <p aria-label="Reading hint" lang="ja">
          {p.task.reading_hint}
        </p>
      )}
      {p.task.romaji_hint && <p aria-label="Romaji hint">{p.task.romaji_hint}</p>}
      <label htmlFor="writing-answer">Type the answer in Japanese (IME supported)</label>
      <input
        id="writing-answer"
        type="text"
        lang="ja"
        value={p.draft}
        onChange={(e) => p.onDraft(e.target.value)}
      />
      <button type="button" onClick={() => p.onHint("reading")}>
        Show reading
      </button>
      <button type="button" onClick={() => p.onHint("romaji")}>
        Show romaji
      </button>
      <button type="submit" onClick={p.onSubmit} disabled={p.draft.trim() === ""}>
        Check
      </button>
      {p.graded && <p aria-live="polite">{p.correct ? "Correct" : "Try again"}</p>}
    </section>
  );
}
