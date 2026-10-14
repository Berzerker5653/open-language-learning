import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PackDirectionProvider } from "@openlang/ui";
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
    // ADR-0029: no hardcoded language tag. The answer field's language comes
    // from the active pack, so an RTL pack gets an RTL ar-MA field and this
    // provider-less render carries no `lang` at all.
    expect(html).not.toContain('lang="ja"');
    const arabic = renderToStaticMarkup(
      <PackDirectionProvider rtl locale="ar-MA">
        <WritingPractice
          task={{ item_id: "ar.lex.salam", prompt_text: "السلام" }}
          draft=""
          graded={false}
          correct={false}
          onDraft={() => {}}
          onSubmit={() => {}}
          onHint={() => {}}
        />
      </PackDirectionProvider>,
    );
    expect(arabic).toContain('<p class="prompt" dir="rtl" lang="ar-MA">السلام</p>');
    expect(arabic).toContain('id="writing-answer" type="text" dir="rtl" lang="ar-MA"');
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

  it("I03: a miss shows the form the task asked for, and only after Check", () => {
    const handlers = { onDraft: () => {}, onSubmit: () => {}, onHint: () => {} };
    const before = renderToStaticMarkup(
      <WritingPractice
        task={{ item_id: "ja.lex.demo.watashi", prompt_text: "I (neutral polite)" }}
        draft="watashi"
        graded={false}
        correct={false}
        {...handlers}
      />,
    );
    // The task itself must never carry the answer into the attempt.
    expect(before).not.toContain("writing-expected");
    const miss = renderToStaticMarkup(
      <WritingPractice
        task={{ item_id: "ja.lex.demo.watashi", prompt_text: "I (neutral polite)" }}
        draft="watashi"
        graded
        correct={false}
        expected="私"
        {...handlers}
      />,
    );
    expect(miss).toContain('data-testid="writing-expected"');
    expect(miss).toContain("<strong>私</strong>");
    const hit = renderToStaticMarkup(
      <WritingPractice
        task={{ item_id: "ja.lex.demo.watashi", prompt_text: "I (neutral polite)" }}
        draft="私"
        graded
        correct
        expected="私"
        {...handlers}
      />,
    );
    expect(hit).not.toContain("writing-expected");
  });
});
