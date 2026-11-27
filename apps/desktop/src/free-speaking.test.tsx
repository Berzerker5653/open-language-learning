// SPEAK-PRACTICE-001 UI contract: per-word matched/fuzzy/missing coloring
// inside the prompt, an honest unavailable card naming the whisper.cpp
// aligner, and abstention that renders ZERO fabricated coloring.
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { FreeSpeakingPanel, type FreeSpeakingScore } from "./free-speaking";

const prompt = {
  id: "ru.sent.test.1",
  text: "я люблю кофе утром",
  reading: null,
  gloss: "I love coffee in the morning",
};

const base = {
  prompt,
  promptError: null as string | null,
  recording: false,
  hasAttempt: true,
  onRecord: () => {},
  onStop: () => {},
  onPlayAttempt: () => {},
  onNewPrompt: () => {},
};

function withResult(result: FreeSpeakingScore | null): string {
  return renderToStaticMarkup(<FreeSpeakingPanel {...base} result={result} />);
}

describe("free-speaking panel (SPEAK-PRACTICE-001)", () => {
  it("colors every prompt word by its alignment status", () => {
    const html = withResult({
      words: [
        { surface: "я", status: "matched" },
        { surface: "люблю", status: "matched" },
        { surface: "кофе", status: "fuzzy" },
        { surface: "утром", status: "missing" },
      ],
      heard: "я люблю кофи",
      target: prompt.text,
      score: 0.63,
      abstain_reason: null,
      mode: "guided",
    });
    expect(html).toContain("fs-word--matched");
    expect(html).toContain("fs-word--fuzzy");
    expect(html).toContain("fs-word--missing");
    expect(html).toContain("утром");
  });

  it("shows the coaching percentage without grading language", () => {
    const html = withResult({
      words: [{ surface: "кофе", status: "matched" }],
      heard: "кофе",
      target: "кофе",
      score: 1,
      abstain_reason: null,
      mode: "guided",
    });
    expect(html).toContain("100%");
    // No verdict/points language anywhere on a coaching render.
    expect(html).not.toMatch(/\bwrong\b|\bpoints\b|\bxp\b/i);
  });

  it("renders NO word coloring when the check abstains", () => {
    const html = withResult({
      words: [],
      heard: "",
      target: prompt.text,
      score: null,
      abstain_reason: "uncertain",
      mode: "guided",
    });
    expect(html).not.toContain("fs-word--");
    expect(html).toContain("fs-abstain");
    expect(html).not.toMatch(/\d+\s*%/);
  });

  it("names the whisper.cpp aligner on the base (no-sidecar) build", () => {
    const html = withResult({
      words: [],
      heard: "",
      target: prompt.text,
      score: null,
      abstain_reason: "aligner-unavailable",
      mode: "guided",
    });
    expect(html).toContain("fs-abstain");
    expect(html).toContain('data-unavailable="true"');
    expect(html).toContain("whisper.cpp aligner");
    expect(html).not.toContain("fs-word--");
  });

  it("promises guided feedback and nothing more", () => {
    const html = withResult(null);
    expect(html).toContain("guided feedback");
    expect(html).toContain("not a grade");
  });
});
