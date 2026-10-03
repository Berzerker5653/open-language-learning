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

export interface PronunciationResult {
  corrections: PronunciationCorrection[];
  abstain_reason: string | null;
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
    "Speech recognition is not installed yet. Install a speech model in Settings to get feedback.",
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
      <p>
        Say both words, one after the other: <strong lang="ja">{shortText}</strong> then{" "}
        <strong lang="ja">{longText}</strong>. They differ only in vowel length — the second holds
        the あ about twice as long.
      </p>
      <div role="group" aria-label="Playback">
        <button type="button" onClick={() => props.onPlayReference("short")}>
          Hear reference: {shortText}
        </button>
        <button type="button" onClick={() => props.onPlayReference("long")}>
          Hear reference: {longText}
        </button>
        <button type="button" onClick={() => props.onPlayAttempt()} disabled={!hasAttempt}>
          Hear your attempt
        </button>
      </div>
      <div role="group" aria-label="Recording">
        {recording ? (
          <button type="button" onClick={() => props.onStop()}>
            Stop and check
          </button>
        ) : (
          <button type="button" onClick={() => props.onRecord()}>
            Record attempt
          </button>
        )}
      </div>
      {result && (
        <div aria-live="polite">
          {result.abstain_reason ? (
            <p data-testid="abstain-reason">{reasonLabel(result.abstain_reason)}</p>
          ) : (
            <ul>
              {result.corrections.map((c) => (
                <li key={c.feature_id} data-band={c.band}>
                  {TEMPLATE_TEXT[c.feedback_template_id] ??
                    "No specific feedback is available for that attempt."}
                </li>
              ))}
            </ul>
          )}
          <p>
            <small>
              Guided feedback only: this comparison is a reference, not a grade. Your recording
              stays on this device and is never saved.
            </small>
          </p>
        </div>
      )}
    </section>
  );
}
