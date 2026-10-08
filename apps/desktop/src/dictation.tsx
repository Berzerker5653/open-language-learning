/**
 * Roadmap feature B: dictation / speak-to-check. The learner reads a known
 * sentence aloud; the app transcribes it with the selected local model and
 * reports an honest guided verdict. This is a production/recognition check,
 * never a pronunciation grade or mastery (docs/05). Presentational component:
 * recording and IPC live in the App container so this stays testable.
 */

export interface DictationResult {
  matched: boolean | null;
  heard: string;
  target: string;
  abstain_reason: string | null;
  mode: "guided" | "automatic";
}

export interface DictationSentence {
  id: string;
  text: string;
  reading: string;
  gloss: string;
}

export interface DictationProps {
  /** Pack sentence to read (null when the learner typed their own). */
  sentence: DictationSentence | null;
  /** Effective comparison target: the sentence reading, or a typed override. */
  target: string;
  onTargetChange: (t: string) => void;
  onNewSentence: () => void;
  result: DictationResult | null;
  recording: boolean;
  hasAttempt: boolean;
  onRecord: () => void;
  onStop: () => void;
  onPlayAttempt: () => void;
}

const REASON_TEXT: Record<string, string> = {
  "speech-model-off":
    "No speech model is selected. Choose one under Languages → Speech. Recognition also needs a speech runtime on this device; without it this check abstains.",
  "aligner-unavailable":
    "Recognition cannot run: this device lacks the speech runtime dictation needs, and downloading a model alone does not add one. This check abstains; text and listening activities are unaffected.",
  "asr-no-speech": "I did not catch any speech. Try again a little louder.",
  uncertain: "I am not confident I caught that. Try again.",
};

function reasonLabel(reason: string): string {
  if (REASON_TEXT[reason]) return REASON_TEXT[reason];
  if (reason.startsWith("quality"))
    return "The recording was too quiet, too short, or clipped. Please try again.";
  return "No verdict available for that attempt. Please try again.";
}

export function DictationPractice(props: DictationProps) {
  const { sentence, target, result, recording, hasAttempt } = props;
  return (
    <section aria-label="Dictation practice">
      <h2>Speaking: say the sentence</h2>
      <p className="prompt">
        Read the sentence aloud. The app checks whether it could recognize what you said — this is
        guided feedback, not a grade.
      </p>
      {sentence && (
        <div className="card" data-testid="dict-sentence">
          <blockquote lang="ja" className="target-word">
            {sentence.text}
          </blockquote>
          {sentence.gloss && (
            <p>
              <small>{sentence.gloss}</small>
            </p>
          )}
          <button type="button" className="btn btn--quiet" onClick={() => props.onNewSentence()}>
            New sentence
          </button>
        </div>
      )}
      <label>
        Sentence to read (edit to use your own)
        <input
          type="text"
          lang="ja"
          value={target}
          onChange={(e) => props.onTargetChange(e.target.value)}
          disabled={recording}
        />
      </label>
      <div role="group" aria-label="Recording" className="btn-row">
        {recording ? (
          <button type="button" className="btn btn--primary" onClick={() => props.onStop()}>
            Stop and check
          </button>
        ) : (
          <button type="button" className="btn btn--primary" onClick={() => props.onRecord()}>
            Record attempt
          </button>
        )}
        <button
          type="button"
          className="btn btn--quiet"
          onClick={() => props.onPlayAttempt()}
          disabled={!hasAttempt}
        >
          Hear your attempt
        </button>
      </div>
      {result && (
        <div aria-live="polite" className="card">
          {result.matched === true ? (
            <p data-testid="dict-match" className="notice">
              That matches — I heard: <strong lang="ja">{result.heard}</strong>
            </p>
          ) : result.matched === false ? (
            <p data-testid="dict-mismatch" className="notice">
              I heard: <strong lang="ja">{result.heard}</strong> — that does not match{" "}
              <strong lang="ja">{result.target}</strong>. Try again.
            </p>
          ) : (
            <p data-testid="dict-abstain" className="notice">
              {reasonLabel(result.abstain_reason ?? "")}
            </p>
          )}
          <p>
            <small data-testid="dict-mode">
              Guided feedback only: this is a recognition check, not a pronunciation grade. Your
              recording stays on this device and is never saved.
            </small>
          </p>
        </div>
      )}
    </section>
  );
}
