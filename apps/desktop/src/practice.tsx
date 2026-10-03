/**
 * UX-003 first lessons: the runnable multiple-choice recall-meaning
 * runner. The UI only sends the chosen index; grading, evidence, and
 * scheduling happen natively (the correct answer never crosses IPC).
 */

export interface PracticeTaskView {
  item_id: string;
  surface: string;
  reading?: string | null;
  choices: string[];
}

export interface PracticeRunnerProps {
  task: PracticeTaskView;
  graded: boolean;
  correct: boolean;
  correctChoice: string;
  onChoose(index: number): void;
  onNext(): void;
}

export function PracticeRunner(p: PracticeRunnerProps) {
  return (
    <section aria-label="Practice">
      <h2>What does this mean?</h2>
      <p className="prompt" lang="ja">
        {p.task.surface}
      </p>
      {p.task.reading && (
        <p aria-label="Reading" lang="ja">
          <small>{p.task.reading}</small>
        </p>
      )}
      <div role="group" aria-label="Choices" className="btn-row">
        {p.task.choices.map((choice, i) => (
          <button
            key={choice}
            type="button"
            className="btn btn--quiet"
            disabled={p.graded}
            onClick={() => p.onChoose(i)}
          >
            {choice}
          </button>
        ))}
      </div>
      {p.graded && (
        <>
          <p
            aria-live="polite"
            className={p.correct ? "verdict verdict--correct" : "verdict verdict--retry"}
          >
            {p.correct ? "Correct" : `Not quite — the answer is "${p.correctChoice}"`}
          </p>
          <div className="btn-row">
            <button type="button" className="btn btn--primary" onClick={p.onNext}>
              Back to plan
            </button>
          </div>
        </>
      )}
    </section>
  );
}
