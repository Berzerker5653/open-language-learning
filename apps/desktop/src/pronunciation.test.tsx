// SPEECH-005 UI contract tests: guided feedback text, abstention reason,
// playback controls. Recording plumbing is container-level (browser-only).
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { EMPTY_PITCH, PronunciationPractice } from "./pronunciation";

const base = {
  shortText: "おばさん",
  longText: "おばあさん",
  recording: false,
  hasAttempt: false,
  onRecord: () => undefined,
  onStop: () => undefined,
  onPlayReference: () => undefined,
  onPlayAttempt: () => undefined,
};

describe("PronunciationPractice", () => {
  it("shows the contrast prompt and both reference buttons", () => {
    const html = renderToStaticMarkup(<PronunciationPractice {...base} result={null} />);
    expect(html).toContain("おばさん");
    expect(html).toContain("Hear reference: おばあさん");
    expect(html).toContain("Record attempt");
    expect(html).toContain("disabled"); // attempt playback disabled pre-record
  });

  it("renders actionable feedback and the guided-only disclaimer", () => {
    const html = renderToStaticMarkup(
      <PronunciationPractice
        {...base}
        hasAttempt
        result={{
          corrections: [
            {
              feature_id: "ja.phon.long-vowel",
              band: "possible-issue",
              feedback_template_id: "speech.long-vowel.shorter",
            },
          ],
          abstain_reason: null,
          mode: "guided",
          mode_reason: "no-calibration-record",
          pitch: {
            reference: [0, 1, 2, 3],
            attempt: [0, 0.5, 1],
            reference_shape: "rising overall",
            attempt_shape: "roughly level overall",
            unavailable_reason: null,
          },
        }}
      />,
    );
    expect(html).toMatch(/holding the あ/);
    expect(html).toContain("Guided feedback only");
    expect(html).toContain('data-band="possible-issue"');
  });

  it("explains abstention instead of inventing feedback", () => {
    const html = renderToStaticMarkup(
      <PronunciationPractice
        {...base}
        result={{
          corrections: [],
          abstain_reason: "mismatch:expected-text-not-matched",
          pitch: EMPTY_PITCH,
          mode: "guided",
          mode_reason: "no-calibration-record",
        }}
      />,
    );
    expect(html).toMatch(/could not confidently match/);
    expect(html).not.toMatch(/holding the あ/);
  });

  it("shows normalized pitch contours accessibly, never Hz or grades", () => {
    const html = renderToStaticMarkup(
      <PronunciationPractice
        {...base}
        hasAttempt
        result={{
          corrections: [],
          abstain_reason: null,
          mode: "guided",
          mode_reason: "no-calibration-record",
          pitch: {
            reference: [0, 1.2, 2.4, 1.1, 0.2],
            attempt: [0, 0.3, 0.1, 0.4, 0],
            reference_shape: "rising overall",
            attempt_shape: "roughly level overall",
            unavailable_reason: null,
          },
        }}
      />,
    );
    expect(html).toContain("<svg");
    expect(html).toContain("<polyline");
    expect(html).toContain("Reference: rising overall");
    expect(html).toContain("Your attempt: roughly level overall");
    expect(html).not.toMatch(/[\d.]+\s*Hz/); // no numeric-Hz rule in the UI
    expect(html).toMatch(/reference-only until calibration/);
  });

  it("labels calibrated automatic feedback distinctly from guided", () => {
    const html = renderToStaticMarkup(
      <PronunciationPractice
        {...base}
        hasAttempt
        result={{
          corrections: [
            {
              feature_id: "ja.phon.long-vowel",
              band: "possible-issue",
              feedback_template_id: "speech.long-vowel.shorter",
            },
          ],
          abstain_reason: null,
          mode: "automatic",
          mode_reason: null,
          pitch: EMPTY_PITCH,
        }}
      />,
    );
    expect(html).toContain("Calibrated automatic feedback");
    expect(html).not.toContain("Guided feedback only");
  });

  it("offers stop control while recording", () => {
    const html = renderToStaticMarkup(<PronunciationPractice {...base} recording result={null} />);
    expect(html).toContain("Stop and check");
    expect(html).not.toContain("Record attempt");
  });
});
