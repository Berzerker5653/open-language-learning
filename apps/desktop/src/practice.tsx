/**
 * UX-003 first lessons: the runnable multiple-choice recall-meaning
 * runner. The UI only sends the chosen index; grading, evidence, and
 * scheduling happen natively (the correct answer never crosses IPC).
 */
import { StressText } from "./stress";

export interface PracticeTaskView {
  item_id: string;
  /// Null for listening tasks: the transcript must stay hidden for the
  /// evidence to count (MASTERY_POLICY disqualifying_for).
  surface?: string | null;
  /// Reading aid for non-Japanese packs only; Japanese packs use the
  /// reader fields below (READ-001).
  reading?: string | null;
  /// Kana reading above kanji; hidden once reading mastery fades it.
  furigana?: string | null;
  romaji?: string | null;
  faded_by_mastery?: boolean;
  choices: string[];
  /// K-12: typed-answer runner (cloze/dictation); choices are empty.
  typed?: boolean;
  /// K-42: review posture of the underlying pack record; display-only,
  /// never affects grading or scheduling.
  status?: string;
  /// K-44: phrase slot structure (display-only). Exactly one slot is
  /// the target; never affects grading or scheduling.
  slots?: {
    text: string;
    alternatives: string[];
    label?: string | null;
    target: boolean;
  }[];
}

export interface PracticeRunnerProps {
  task: PracticeTaskView;
  graded: boolean;
  correct: boolean;
  correctChoice: string;
  /// Audio provenance for listening tasks; null when no audio exists.
  audioSource?: "licensed-recording" | "model-output" | null;
  audioError?: string | null;
  /// True once the learner revealed reading scaffolds this attempt.
  revealed?: boolean;
  /// Task question; defaults to the word-meaning prompt. Script
  /// instruction passes its own (the direction is decided natively).
  heading?: string;
  onChoose(index: number): void;
  onNext(): void;
  onPlayAudio?(): void;
  onReveal?(): void;
  /// K-41: highlight U+0301-stressed vowels in readings (display-only).
  stress?: boolean;
  /// Typed runner only: the draft answer and grading trigger.
  draft?: string;
  onDraft?(value: string): void;
  onCheck?(): void;
}

export function PracticeRunner(p: PracticeRunnerProps) {
  return (
    <section aria-label="Practice">
      {p.task.surface ? (
        <>
          <h2>{p.heading ?? "What does this mean?"}</h2>
          {p.task.furigana && (
            <p aria-label="Reading" lang="ja">
              <small>{p.task.furigana}</small>
            </p>
          )}
          <p className="prompt" lang="ja">
            {p.task.surface}
          </p>
          {p.task.slots && p.task.slots.length > 0 ? (
            <div className="meta" aria-label="Phrase structure">
              {p.task.slots.map((slot, i) => (
                <p key={i}>
                  <span className={slot.target ? "badge" : undefined}>{slot.text}</span>
                  {slot.target ? " — the part to change" : ""}
                  {slot.label ? ` (${slot.label})` : ""}
                  {slot.alternatives.length > 0 ? (
                    <small> can also be: {slot.alternatives.join(", ")}</small>
                  ) : null}
                </p>
              ))}
            </div>
          ) : null}
          {p.task.reading && (
            <p aria-label="Reading" lang="ja">
              <small>{p.stress ? <StressText text={p.task.reading} /> : p.task.reading}</small>
            </p>
          )}
          {p.task.romaji && (
            <p aria-label="Romaji">
              <small>{p.task.romaji}</small>
            </p>
          )}
          {!p.graded && !p.revealed && p.onReveal && (
            <div className="btn-row">
              <button type="button" className="btn btn--quiet" onClick={() => p.onReveal?.()}>
                Show reading
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          <h2>What did you hear?</h2>
          {p.audioError ? (
            <p className="notice">{p.audioError}</p>
          ) : (
            <div className="btn-row">
              <button
                type="button"
                className="btn btn--primary"
                aria-label="Play the audio"
                onClick={() => p.onPlayAudio?.()}
              >
                ▶ Play
              </button>
              {p.audioSource === "model-output" && (
                <small className="notice">synthesized voice (model output)</small>
              )}
            </div>
          )}
        </>
      )}
      {p.task.typed ? (
        <div className="field">
          <label htmlFor="practice-answer">Type your answer</label>
          <input
            id="practice-answer"
            type="text"
            value={p.draft ?? ""}
            disabled={p.graded}
            onChange={(e) => p.onDraft?.(e.target.value)}
          />
          <div className="btn-row">
            <button
              type="button"
              className="btn btn--primary"
              disabled={p.graded || (p.draft ?? "").trim() === ""}
              onClick={() => p.onCheck?.()}
            >
              Check
            </button>
          </div>
        </div>
      ) : (
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
      )}
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
