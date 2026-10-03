// SPEECH-005 UI contract tests: guided feedback text, abstention reason,
// playback controls. Recording plumbing is container-level (browser-only).
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PronunciationPractice } from "./pronunciation";

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
        result={{ corrections: [], abstain_reason: "mismatch:expected-text-not-matched" }}
      />,
    );
    expect(html).toMatch(/could not confidently match/);
    expect(html).not.toMatch(/holding the あ/);
  });

  it("offers stop control while recording", () => {
    const html = renderToStaticMarkup(<PronunciationPractice {...base} recording result={null} />);
    expect(html).toContain("Stop and check");
    expect(html).not.toContain("Record attempt");
  });
});
