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

  it("shows no per-item draft badges; posture is stated at pack level (K-42, owner 2026-10-07)", () => {
    const unreviewed = render({ task: { ...base.task, status: "draft" } });
    // The per-item draft badge is retired; its text must not return.
    expect(unreviewed).not.toContain("draft content");
    expect(unreviewed).not.toContain("awaiting human review");
    // Affordances are identical: status stays wired but display-only.
    expect(unreviewed).toContain('aria-label="Choices"');
    expect(unreviewed).toContain("hello");
    const listening = render({
      task: {
        item_id: "x#comprehension-listening",
        surface: null,
        choices: ["a", "b"],
        status: "review-needed",
      },
      audioSource: "licensed-recording",
    });
    expect(listening).not.toContain("draft");
    const validated = render({ task: { ...base.task, status: "validated" } });
    expect(validated).not.toContain("draft");
  });

  it("renders a typed answer field for cloze and hides choices", () => {
    const html = render({
      task: {
        item_id: "ja.sent.demo.hajimemashite#production-writing",
        surface: "______。",
        choices: [],
        typed: true,
      },
      heading: "Fill in the blank",
      draft: "",
    });
    expect(html).toContain("______");
    expect(html).toContain("Fill in the blank");
    expect(html).toContain('id="practice-answer"');
    expect(html).not.toContain('aria-label="Choices"');
    // Check is disabled until the learner types something.
    expect(html).toContain("disabled");
  });

  it("shows audio and a typed field for dictation with no text shown", () => {
    const html = render({
      task: {
        item_id: "ja.sent.demo.obasan-aunt#orthographic-encoding",
        surface: null,
        choices: [],
        typed: true,
      },
      draft: "お",
      audioSource: "licensed-recording",
    });
    expect(html).toContain("What did you hear?");
    expect(html).toContain("Play the audio");
    expect(html).toContain("Type your answer");
    expect(html).not.toContain("おばさん");
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

  it("annotates the surface with ruby furigana and renders romaji separately", () => {
    const html = render({
      task: {
        item_id: "ja.lex.demo.watashi#recall-meaning",
        surface: "私",
        furigana: "わたし",
        romaji: "watashi",
        choices: ["I (neutral polite first person)", "hello", "aunt", "how do you do"],
      },
    });
    // K-54: the reading is ruby markup bound to the word, not a
    // sibling <small> line.
    expect(html).toContain("<ruby>私<rp>(</rp><rt>わたし</rt><rp>)</rp></ruby>");
    // Romaji is auxiliary: rendered separately, never inside <rt>.
    expect(html).not.toContain("<rt>watashi</rt>");
    expect(html.indexOf("watashi")).toBeGreaterThan(html.indexOf("</ruby>"));
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

  it("renders script-instruction tasks without a reading reveal", () => {
    const html = render({
      task: {
        item_id: "ja.orth.hira.a#orthography-recognition",
        surface: "あ",
        choices: ["a", "ko", "ta", "n"],
      },
      heading: "Which one matches?",
    });
    expect(html).toContain("Which one matches?");
    expect(html).toContain("あ");
    expect(html).not.toContain("Show reading");
  });

  it("renders discrimination tasks with audio, written choices, no reveal", () => {
    const html = render({
      task: {
        item_id: "ja.contrast.demo.vowel-length#phonological-discrimination",
        surface: null,
        choices: ["おばあさん", "おばさん"],
      },
      audioSource: "licensed-recording",
    });
    expect(html).toContain("What did you hear?");
    expect(html).toContain('aria-label="Play the audio"');
    // The written forms ARE the answer space (two-alternative forced
    // choice), but no reading scaffold is offered while listening.
    expect(html).not.toContain("Show reading");
  });

  it("renders phrase slot structure with exactly one target marked", () => {
    const html = render({
      task: {
        item_id: "ja.lex.phrase.demo-time-greet#recall-meaning",
        surface: "おはようございます",
        choices: ["a morning greeting", "a farewell"],
        slots: [
          {
            text: "おはよう",
            alternatives: ["こんにちは", "こんばんは"],
            label: "the time of day",
            target: true,
          },
          { text: "ございます", alternatives: ["ございます", "です"], target: false },
        ],
      },
    });
    expect(html).toContain('aria-label="Phrase structure"');
    expect(html).toContain("おはよう");
    expect(html).toContain("the part to change");
    expect(html).toContain("the time of day");
    expect(html).toContain("こんにちは");
    // Word entries (no slots) render no structure block.
    const plain = render({ task: { ...base.task, slots: [] } });
    expect(plain).not.toContain("Phrase structure");
  });
});
