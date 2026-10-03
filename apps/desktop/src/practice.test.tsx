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
});
