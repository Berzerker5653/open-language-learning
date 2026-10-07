// Roadmap feature B: dictation UI contract — honest guided verdicts, abstention
// reasons, and the guided-only disclaimer. Recording plumbing is container-level.
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DictationPractice, type DictationResult } from "./dictation";

const base = {
  sentence: null as { id: string; text: string; reading: string; gloss: string } | null,
  target: "おばあさん",
  onTargetChange: () => {},
  onNewSentence: () => {},
  recording: false,
  hasAttempt: true,
  onRecord: () => {},
  onStop: () => {},
  onPlayAttempt: () => {},
};

function withResult(result: DictationResult | null): string {
  return renderToStaticMarkup(<DictationPractice {...base} result={result} />);
}

describe("dictation practice", () => {
  it("confirms a match and shows what was heard", () => {
    const html = withResult({
      matched: true,
      heard: "おばあさん",
      target: "おばあさん",
      abstain_reason: null,
      mode: "guided",
    });
    expect(html).toContain("That matches");
    expect(html).toContain("おばあさん");
  });

  it("reports a mismatch honestly without grading", () => {
    const html = withResult({
      matched: false,
      heard: "おばさん",
      target: "おばあさん",
      abstain_reason: null,
      mode: "guided",
    });
    expect(html).toContain("does not match");
    expect(html).toContain("Try again");
  });

  it("explains the off default with a path to enable it", () => {
    const html = withResult({
      matched: null,
      heard: "",
      target: "おばあさん",
      abstain_reason: "speech-model-off",
      mode: "guided",
    });
    expect(html).toContain("No speech model is selected");
  });

  it("treats a quality rejection as a neutral retry", () => {
    const html = withResult({
      matched: null,
      heard: "",
      target: "おばあさん",
      abstain_reason: "quality:silence",
      mode: "guided",
    });
    expect(html).toContain("too quiet, too short, or clipped");
  });

  it("states the guided-only, never-saved disclaimer", () => {
    const html = withResult({
      matched: true,
      heard: "おばあさん",
      target: "おばあさん",
      abstain_reason: null,
      mode: "guided",
    });
    expect(html).toContain("recognition check, not a pronunciation grade");
    expect(html).toContain("never saved");
  });

  it("offers a stop control while recording", () => {
    const html = renderToStaticMarkup(<DictationPractice {...base} recording result={null} />);
    expect(html).toContain("Stop and check");
    expect(html).not.toContain("Record attempt");
  });

  it("shows a pack sentence with its gloss and a new-sentence control", () => {
    const html = renderToStaticMarkup(
      <DictationPractice
        {...base}
        result={null}
        sentence={{
          id: "ja.sent.greet-morning",
          text: "おはようございます。",
          reading: "おはようございます",
          gloss: "Good morning.",
        }}
      />,
    );
    expect(html).toContain("おはようございます。");
    expect(html).toContain("Good morning.");
    expect(html).toContain("New sentence");
  });
});
