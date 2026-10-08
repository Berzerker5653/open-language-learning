/**
 * SPEECH-005: guided pronunciation practice (vowel-length contrast).
 * Presentational component: recording/playback plumbing lives in the
 * App container so this stays testable. Feedback is guided-only — the
 * pack profile declares assess-guided with calibration null, so no
 * numeric grades and no mastery are ever shown here (docs/05).
 */

export interface PronunciationCorrection {
  feature_id: string;
  band: string;
  feedback_template_id: string;
}

export interface PitchComparison {
  reference: number[];
  attempt: number[];
  reference_shape: string;
  attempt_shape: string;
  unavailable_reason: string | null;
}

export const EMPTY_PITCH: PitchComparison = {
  reference: [],
  attempt: [],
  reference_shape: "",
  attempt_shape: "",
  unavailable_reason: "not-aligned",
};

export interface PronunciationResult {
  corrections: PronunciationCorrection[];
  abstain_reason: string | null;
  pitch: PitchComparison;
  /** SPEECH-007: "guided" unless a qualified calibration record binds the
   * exact installed provider/model/interpreter/pack combination. */
  mode: "guided" | "automatic";
  mode_reason: string | null;
}

/** Normalized (semitone-relative) contour as an accessible polyline. */
function contourPoints(values: number[], width = 240, height = 60): string {
  if (values.length === 0) return "";
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = Math.max(hi - lo, 1);
  return values
    .map((v, i) => {
      const x = (i / Math.max(values.length - 1, 1)) * width;
      const y = height - ((v - lo) / span) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

const TEMPLATE_TEXT: Record<string, string> = {
  "speech.long-vowel.shorter":
    "Your long vowel sounds shorter than the reference. Try holding the あ in おばあさん longer — roughly twice the あ in おばさん.",
  "speech.long-vowel.longer":
    "Your long vowel sounds longer than the reference. Ease off slightly — the contrast, not exaggeration, is the goal.",
  "speech.long-vowel.close":
    "Your vowel lengths match the reference closely. Keep the contrast between おばさん and おばあさん.",
};

const REASON_TEXT: Record<string, string> = {
  "aligner-unavailable":
    "Feedback cannot run: this device has no speech alignment runtime, and installing a speech model does not add one. This attempt is not scored; other practice is unaffected.",
  "aligner-cpu-unsupported":
    "Feedback cannot run: this build carries a speech alignment runtime, but this CPU is below the instruction set it was compiled for. This attempt is not scored; other practice is unaffected.",
  "reference-media-missing": "The reference recording for this exercise is missing from the pack.",
  "reference-media-invalid": "The reference recording could not be read.",
};

function reasonLabel(reason: string): string {
  if (REASON_TEXT[reason]) return REASON_TEXT[reason];
  if (reason.startsWith("mismatch"))
    return "We could not confidently match what we heard to the expected words. Please try again — say both words clearly.";
  if (reason.startsWith("quality"))
    return "The recording was too quiet, too short, or clipped. Please try again.";
  if (reason.startsWith("abstained"))
    return "We are not confident enough to give feedback on that attempt. Please try again.";
  return "No feedback available for that attempt. Please try again.";
}

export interface PronunciationProps {
  shortText: string;
  longText: string;
  result: PronunciationResult | null;
  recording: boolean;
  hasAttempt: boolean;
  onRecord: () => void;
  onStop: () => void;
  onPlayReference: (which: "short" | "long") => void;
  onPlayAttempt: () => void;
}

export function PronunciationPractice(props: PronunciationProps) {
  const { shortText, longText, result, recording, hasAttempt } = props;
  return (
    <section aria-label="Pronunciation practice">
      <h2>Pronunciation: long vs short vowels</h2>
      <p className="prompt">
        Say both words, one after the other:{" "}
        <strong lang="ja" className="target-word">
          {shortText}
        </strong>{" "}
        then{" "}
        <strong lang="ja" className="target-word">
          {longText}
        </strong>
        . They differ only in vowel length — the second holds the あ about twice as long.
      </p>
      <div role="group" aria-label="Playback" className="btn-row">
        <button
          type="button"
          className="btn btn--quiet"
          onClick={() => props.onPlayReference("short")}
        >
          Hear reference: {shortText}
        </button>
        <button
          type="button"
          className="btn btn--quiet"
          onClick={() => props.onPlayReference("long")}
        >
          Hear reference: {longText}
        </button>
        <button
          type="button"
          className="btn btn--quiet"
          onClick={() => props.onPlayAttempt()}
          disabled={!hasAttempt}
        >
          Hear your attempt
        </button>
      </div>
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
      </div>
      {result && (
        <div aria-live="polite" className="card">
          {result.abstain_reason ? (
            <p data-testid="abstain-reason" className="notice">
              {reasonLabel(result.abstain_reason)}
            </p>
          ) : (
            <ul className="feedback">
              {result.corrections.map((c) => (
                <li key={c.feature_id} data-band={c.band}>
                  {TEMPLATE_TEXT[c.feedback_template_id] ??
                    "No specific feedback is available for that attempt."}
                </li>
              ))}
            </ul>
          )}
          <p>
            <small data-testid="feedback-mode">
              {result.mode === "automatic"
                ? "Calibrated automatic feedback: validated for this exact model and configuration."
                : "Guided feedback only: this comparison is a reference, not a grade. Your recording" +
                  " stays on this device and is never saved."}
            </small>
          </p>
          <div aria-label="Pitch contour comparison">
            <h3>Pitch shape (reference vs your attempt)</h3>
            {result.pitch.unavailable_reason ? (
              <p>
                Not enough clear voiced audio to compare pitch shapes this time. This is a reference
                view, so nothing is scored either way.
              </p>
            ) : (
              <>
                <svg
                  width="240"
                  height="60"
                  role="img"
                  aria-label={`Reference contour: ${result.pitch.reference_shape}. Your attempt: ${result.pitch.attempt_shape}.`}
                  className="contour"
                >
                  <polyline
                    className="contour--reference"
                    fill="none"
                    strokeWidth="2"
                    points={contourPoints(result.pitch.reference)}
                  />
                  <polyline
                    className="contour--attempt"
                    fill="none"
                    strokeWidth="2"
                    points={contourPoints(result.pitch.attempt)}
                  />
                </svg>
                <p>
                  Reference: {result.pitch.reference_shape}. Your attempt:{" "}
                  {result.pitch.attempt_shape}.
                </p>
                <p>
                  <small>
                    Pitch is shown relative to each speaker's own range — never in absolute Hz, and
                    never graded. This feature is reference-only until calibration evidence exists.
                  </small>
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
