import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { WritingPractice } from "./writing";

describe("writing practice surface", () => {
  it("is a text input for IME typing, never handwriting", () => {
    const html = renderToStaticMarkup(
      <WritingPractice
        task={{ item_id: "ja.lex.demo.watashi", prompt_text: "I (neutral polite)" }}
        draft=""
        graded={false}
        correct={false}
        onDraft={() => {}}
        onSubmit={() => {}}
        onHint={() => {}}
      />,
    );
    expect(html).toContain('type="text"');
    expect(html).toContain('lang="ja"');
    expect(html).toContain("IME supported");
    // No handwriting/stroke/canvas surface exists.
    for (const banned of ["canvas", "stroke", "handwriting", "trace"]) {
      expect(html.toLowerCase()).not.toContain(banned);
    }
  });

  it("shows hints only after request and grades honestly", () => {
    const plain = renderToStaticMarkup(
      <WritingPractice
        task={{ item_id: "x", prompt_text: "gloss" }}
        draft="私"
        graded={false}
        correct={false}
        onDraft={() => {}}
        onSubmit={() => {}}
        onHint={() => {}}
      />,
    );
    expect(plain).not.toContain("Reading hint");
    const hinted = renderToStaticMarkup(
      <WritingPractice
        task={{ item_id: "x", prompt_text: "gloss", reading_hint: "わたし" }}
        draft="わたし"
        graded
        correct
        onDraft={() => {}}
        onSubmit={() => {}}
        onHint={() => {}}
      />,
    );
    expect(hinted).toContain("Reading hint");
    expect(hinted).toContain("Correct");
  });
});
