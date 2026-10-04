import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PracticeRunner, type PracticeRunnerProps } from "./practice";

const base: PracticeRunnerProps = {
  task: {
    item_id: "ja.lex.demo.konnichiwa#recall-meaning",
    surface: "こんにちは",
    reading: "こんにちは",
    choices: ["I (neutral polite first person)", "hello", "aunt", "how do you do (first meeting)"],
  },
  graded: false,
  correct: false,
  correctChoice: "",
  onChoose: () => {},
  onNext: () => {},
};

function render(overrides: Partial<PracticeRunnerProps>) {
  return renderToStaticMarkup(<PracticeRunner {...base} {...overrides} />);
}

describe("practice runner", () => {
  it("shows the word and every choice before grading", () => {
    const html = render({});
    expect(html).toContain("こんにちは");
    expect(html).toContain("hello");
    expect(html).toContain("aunt");
    expect(html).toContain('aria-label="Choices"');
    expect(html).not.toContain("verdict");
  });

  it("reveals the correct answer and an advance action after a miss", () => {
    const html = render({ graded: true, correct: false, correctChoice: "hello" });
    expect(html).toContain("Not quite — the answer is &quot;hello&quot;");
    expect(html).toContain("Back to plan");
    expect(html).toContain("disabled");
  });

  it("confirms correct answers", () => {
    const html = render({ graded: true, correct: true, correctChoice: "hello" });
    expect(html).toContain("Correct");
  });

  it("hides the transcript and offers audio for listening tasks", () => {
    const html = render({
      task: {
        item_id: "ja.lex.demo.konnichiwa#comprehension-listening",
        surface: null,
        choices: [
          "hello",
          "aunt",
          "I (neutral polite first person)",
          "how do you do (first meeting)",
        ],
      },
      audioSource: "licensed-recording",
    });
    expect(html).toContain("What did you hear?");
    expect(html).toContain('aria-label="Play the audio"');
    expect(html).not.toContain("こんにちは");
    expect(html).toContain("hello");
  });

  it("labels synthesized audio honestly and surfaces honest audio errors", () => {
    const ok = render({
      task: { item_id: "x#comprehension-listening", surface: null, choices: ["hello", "aunt"] },
      audioSource: "model-output",
    });
    expect(ok).toContain("synthesized voice (model output)");
    const err = render({
      task: { item_id: "x#comprehension-listening", surface: null, choices: ["hello", "aunt"] },
      audioError: "No audio is available for this item yet (tts-runtime-unavailable).",
    });
    expect(err).toContain("tts-runtime-unavailable");
    expect(err).not.toContain("Play the audio");
  });

  it("renders furigana above the surface and romaji below", () => {
    const html = render({
      task: {
        item_id: "ja.lex.demo.watashi#recall-meaning",
        surface: "私",
        furigana: "わたし",
        romaji: "watashi",
        choices: ["I (neutral polite first person)", "hello", "aunt", "how do you do"],
      },
    });
    expect(html).toContain("わたし");
    expect(html).toContain("watashi");
    // Furigana renders before the kanji surface (ruby-style order).
    expect(html.indexOf("わたし")).toBeLessThan(html.indexOf(">私<"));
  });

  it("offers a reveal only when scaffolds are faded and not yet revealed", () => {
    const faded = render({
      task: {
        item_id: "ja.lex.demo.watashi#recall-meaning",
        surface: "私",
        faded_by_mastery: true,
        choices: ["I (neutral polite first person)", "hello", "aunt", "how do you do"],
      },
      onReveal: () => {},
    });
    expect(faded).toContain("Show reading");
    expect(faded).not.toContain("わたし");
    const after = render({
      task: {
        item_id: "ja.lex.demo.watashi#recall-meaning",
        surface: "私",
        furigana: "わたし",
        faded_by_mastery: true,
        choices: ["I (neutral polite first person)", "hello", "aunt", "how do you do"],
      },
      revealed: true,
      onReveal: () => {},
    });
    expect(after).not.toContain("Show reading");
    expect(after).toContain("わたし");
  });
});
