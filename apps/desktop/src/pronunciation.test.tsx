// SPEECH-005 UI contract tests: guided feedback text, abstention reason,
// playback controls. Recording plumbing is container-level (browser-only).
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { EMPTY_PITCH, PronunciationPractice } from "./pronunciation";

const base = {
  shortText: "おばさん",
  longText: "おばあさん",
  // R10: the instruction sentence is the pack's declaration, never the
  // app's memory of one language's phonology.
  description: "Contrastive long vowel: おばさん (aunt) vs おばあさん (grandmother)",
  featureId: "ja.phon.vowel-length",
  measure: "voiced-duration-ratio",
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

  it("does not promise feedback the absent aligner runtime cannot give", () => {
    const html = renderToStaticMarkup(
      <PronunciationPractice
        {...base}
        result={{
          corrections: [],
          abstain_reason: "aligner-unavailable",
          pitch: EMPTY_PITCH,
          mode: "guided",
          mode_reason: "not-scored",
        }}
      />,
    );
    expect(html).toContain("no speech alignment runtime");
    expect(html).toContain("installing a speech model does not add one");
    // The old copy sent users to a nonexistent Settings surface and
    // implied a model download supplies the runtime; neither may return.
    expect(html).not.toContain("Install a speech model in Settings");
    expect(html).not.toContain("to get feedback");
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

  it("teaches a Russian voicing contrast in the pack's own words (R10)", () => {
    const html = renderToStaticMarkup(
      <PronunciationPractice
        {...base}
        shortText="дом"
        longText="том"
        description="Voiced [d] versus voiceless [t] in word-initial stops."
        featureId="ru.phon.obstruent-voicing"
        measure={null}
        result={null}
      />,
    );
    expect(html).toContain("Voiced [d] versus voiceless [t]");
    expect(html).toContain("Hear reference: дом");
    expect(html).toContain('data-feature="ru.phon.obstruent-voicing"');
    // The Japanese vowel-length lesson must never be spoken about a pair
    // the pack declares as a different contrast.
    expect(html).not.toContain("holding the あ");
    expect(html).not.toMatch(/vowel length|twice as long/);
  });

  it("offers listen and repeat, not a score, for a contrast the app cannot measure", () => {
    const html = renderToStaticMarkup(
      <PronunciationPractice
        {...base}
        shortText="дом"
        longText="том"
        description="Voiced [d] versus voiceless [t] in word-initial stops."
        featureId="ru.phon.obstruent-voicing"
        measure={null}
        result={{
          corrections: [],
          abstain_reason: "feature-not-instrumented",
          pitch: EMPTY_PITCH,
          mode: "guided",
          mode_reason: "feature-not-instrumented",
        }}
      />,
    );
    expect(html).toContain("cannot analyse yet");
    expect(html).toContain("not scored");
    expect(html).toContain("Guided feedback only");
    expect(html).not.toMatch(/vowel length|holding the あ/);
  });

  // sweep-ts-engine-error-copy: App.tsx fabricates abstain_reason
  // "abstained:engine-error" when pronunciation_check rejects, and the backend
  // reports "sidecar-timeout". Both must render fault-honest copy instead of
  // falling through to the generic "abstained" uncertainty string.
  it("names an engine error as the app's fault, not learner-side uncertainty", () => {
    const html = renderToStaticMarkup(
      <PronunciationPractice
        {...base}
        result={{
          corrections: [],
          abstain_reason: "abstained:engine-error",
          pitch: EMPTY_PITCH,
          mode: "guided",
          mode_reason: "no-calibration-record",
        }}
      />,
    );
    expect(html).toContain("speech engine reported an internal error");
    expect(html).toContain("The fault is ours, not yours");
    expect(html).toContain("not scored");
    // The generic abstained fallback may never render for a known fault token.
    expect(html).not.toContain("not confident enough to give feedback");
    expect(html).not.toMatch(/Please try again/);
  });

  it("names a sidecar timeout as the app's fault, never low-confidence hedging", () => {
    const html = renderToStaticMarkup(
      <PronunciationPractice
        {...base}
        result={{
          corrections: [],
          abstain_reason: "sidecar-timeout",
          pitch: EMPTY_PITCH,
          mode: "guided",
          mode_reason: "no-calibration-record",
        }}
      />,
    );
    expect(html).toContain("did not answer in time");
    expect(html).toContain("The fault is ours, not yours");
    expect(html).toContain("not scored");
    expect(html).not.toContain("not confident enough to give feedback");
    expect(html).not.toMatch(/Please try again/);
  });

  it("keeps the generic abstention hedge for unknown abstained tokens", () => {
    const html = renderToStaticMarkup(
      <PronunciationPractice
        {...base}
        result={{
          corrections: [],
          abstain_reason: "abstained:low-signal",
          pitch: EMPTY_PITCH,
          mode: "guided",
          mode_reason: "no-calibration-record",
        }}
      />,
    );
    expect(html).toContain("not confident enough to give feedback");
  });
});
