/**
 * SPEAK-PRACTICE-001: free-speaking practice. The learner gets a short
 * target-language prompt from the current lesson pool, records a free
 * attempt, and the whisper.cpp aligner sidecar colors each prompt word
 * matched / fuzzy / missing (the CORRECTION-IN-ARTIFACT-001 inline pattern,
 * carried into speech).
 *
 * HARD INVARIANT — guided only: the score renders as coaching and NEVER
 * writes scheduler/mastery/plan state (pinned in Rust by
 * `free_speaking_check_performs_zero_store_writes` and in the journey by a
 * write-command denylist). Honest abstention: on ASR failure or low
 * confidence no coloring is fabricated, and a base (no-sidecar) build says
 * it needs the aligner runtime instead of bundling a fallback model.
 */
import { LatinText, PackText, usePackTextAttrs } from "@openlang/ui";
import type { DictationSentence } from "./dictation";

export interface FreeSpeakingWord {
  surface: string;
  status: "matched" | "fuzzy" | "missing";
}

export interface FreeSpeakingScore {
  /// Per-word alignment coloring. EMPTY whenever the check abstained —
  /// abstention never fabricates coloring.
  words: FreeSpeakingWord[];
  heard: string;
  target: string;
  /// Coaching fraction 0..1; null exactly when abstained.
  score: number | null;
  abstain_reason: string | null;
  mode: "guided";
}

export interface FreeSpeakingPanelProps {
  prompt: DictationSentence | null;
  promptError: string | null;
  result: FreeSpeakingScore | null;
  recording: boolean;
  hasAttempt: boolean;
  onRecord: () => void;
  onStop: () => void;
  onPlayAttempt: () => void;
  onNewPrompt: () => void;
}

const REASON_TEXT: Record<string, string> = {
  // The base build ships no aligner sidecar and no fallback model: the
  // card names the exact runtime the mode needs (same discovery posture as
  // dictation abstention, but the copy names the aligner variant).
  "aligner-unavailable":
    "Free-speaking scoring needs the whisper.cpp aligner runtime (the whisper-cli sidecar with its word-alignment model), and this build does not carry it — no fallback model ships in the app. This mode abstains; text and listening practice are unaffected.",
  "aligner-cpu-unsupported":
    "Free-speaking scoring needs the whisper.cpp aligner runtime, and this CPU is below the instruction set it was compiled for. This mode abstains; text and listening practice are unaffected.",
  "speech-model-off":
    "No speech model is selected. Choose one under Settings → Speech. Free-speaking scoring also needs the whisper.cpp aligner runtime on this device; without it this mode abstains.",
  "asr-no-speech": "I did not catch any speech. Try again a little louder.",
  uncertain: "I couldn't align that to the prompt, so I colored nothing. Try again.",
  "engine-error":
    "The speech recognizer faulted while checking that attempt, so nothing was judged — this is our fault, not your speech. Everything else works; we will want this fixed.",
  "sidecar-timeout":
    "The speech recognizer ran out of time on that attempt, so nothing was judged — our limit, not your speech. Try again, or use a shorter prompt.",
};

function reasonLabel(reason: string): string {
  if (REASON_TEXT[reason]) return REASON_TEXT[reason];
  if (reason.startsWith("quality"))
    return "The recording was too quiet, too short, or clipped. Please try again.";
  return "Couldn't align that attempt, so nothing was colored. Please try again.";
}

export function FreeSpeakingPanel(p: FreeSpeakingPanelProps) {
  const packAttrs = usePackTextAttrs();
  const result = p.result;
  const scored = result !== null && result.score !== null && result.words.length > 0;
  return (
    <section aria-label="Free speaking">
      <h2>Free speaking: say the sentence</h2>
      <p className="prompt">
        Read the sentence aloud — in your own way is fine. The app colors each word it recognized in
        what it heard: guided feedback, not a grade.
      </p>
      {p.prompt && (
        <div className="card" data-testid="fs-prompt">
          <PackText tag="p" className="surface" {...packAttrs}>
            {scored
              ? result.words.map((w, i) => (
                  <span
                    key={i}
                    data-testid="fs-word"
                    data-status={w.status}
                    className={`word fs-word fs-word--${w.status}`}
                  >
                    {w.surface}{" "}
                  </span>
                ))
              : p.prompt.text}
          </PackText>
          {p.prompt.gloss && (
            <p>
              <small>
                <LatinText>{p.prompt.gloss}</LatinText>
              </small>
            </p>
          )}
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
      <div role="group" aria-label="Recording" className="btn-row">
        {p.recording ? (
          <button type="button" className="btn btn--primary" onClick={p.onStop}>
            Stop and check
          </button>
        ) : (
          <button type="button" className="btn btn--primary" onClick={p.onRecord}>
            Record attempt
          </button>
        )}
        <button
          type="button"
          className="btn btn--quiet"
          onClick={p.onPlayAttempt}
          disabled={!p.hasAttempt}
        >
          Hear your attempt
        </button>
      </div>
      {p.result && (
        <div aria-live="polite" className="card">
          {scored ? (
            <p data-testid="fs-score" className="notice">
              {Math.round((p.result.score as number) * 100)}% of the words came through — I heard:{" "}
              <strong {...packAttrs}>{p.result.heard}</strong>
            </p>
          ) : (
            <p
              data-testid="fs-abstain"
              data-unavailable={
                p.result.abstain_reason === "aligner-unavailable" ||
                p.result.abstain_reason === "aligner-cpu-unsupported"
                  ? "true"
                  : undefined
              }
              className="notice"
            >
              {reasonLabel(p.result.abstain_reason ?? "")}
            </p>
          )}
          <p>
            <small data-testid="fs-mode">
              Guided feedback only: this score never enters your plan, reviews, or progress. Your
              recording stays on this device and is never saved.
            </small>
          </p>
        </div>
      )}
    </section>
  );
}
