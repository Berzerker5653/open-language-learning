import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Ruby, isKanaOnly } from "./ruby";

const render = (surface: string, furigana?: string | null) =>
  renderToStaticMarkup(<Ruby surface={surface} furigana={furigana} />);

const count = (haystack: string, needle: string) => haystack.split(needle).length - 1;

describe("ruby annotation (K-54)", () => {
  it("annotates the whole word with ruby markup and rp fallback parens", () => {
    expect(render("私", "わたし")).toBe("<ruby>私<rp>(</rp><rt>わたし</rt><rp>)</rp></ruby>");
  });

  it("uses exactly one ruby per phrase, never a sibling small", () => {
    const html = render("会社員", "かいしゃいん");
    expect(count(html, "<ruby>")).toBe(1);
    expect(count(html, "<rt>")).toBe(1);
    // The reading annotates the whole phrase, not per-character.
    expect(html).toContain("<rt>かいしゃいん</rt>");
    expect(html).not.toContain("<small");
  });

  it("renders an all-kana headword bare: redundant ruby is never emitted", () => {
    const html = render("こんにちは", "こんにちは");
    expect(html).toBe("こんにちは");
    expect(html).not.toContain("<ruby");
    expect(html).not.toContain("<rt>");
    // Even with a non-equal reading, kana-only surfaces get no ruby
    // (READ-001 furigana.never_on).
    const kanaSentence = render("ひこうきの きっぷ を かります", "ひこうきのきっぷをかります");
    expect(kanaSentence).not.toContain("<ruby");
    expect(kanaSentence).toContain("ひこうきの きっぷ を かります");
  });

  it("renders the surface bare when no reading is present", () => {
    expect(render("私", null)).toBe("私");
    expect(render("私", "   ")).toBe("私");
  });

  it("never places romaji inside <rt>", () => {
    // A transliteration arriving in the reading slot is auxiliary text:
    // it renders outside the ruby, and no <rt> is emitted at all.
    const html = render("私", "watashi");
    expect(html).not.toContain("<rt>");
    expect(html).not.toContain("<ruby");
    expect(html).toContain("watashi");
    expect(html).toContain('<small class="romaji">watashi</small>');
    // Mixed kana+latin readings are transliterations too: kept out of <rt>.
    expect(render("私", "watashi (わたし)")).not.toContain("<rt>");
    // A kana reading is unaffected: it is the rt annotation.
    expect(render("私", "わたし")).toContain("<rt>わたし</rt>");
  });

  it("classifies all-kana headwords by Unicode script, not pack language", () => {
    expect(isKanaOnly("こんにちは")).toBe(true);
    expect(isKanaOnly("ひこうきの きっぷ を かります")).toBe(true);
    expect(isKanaOnly("コーヒー")).toBe(true); // katakana + prolonged mark
    expect(isKanaOnly("私")).toBe(false);
    expect(isKanaOnly("watashi")).toBe(false);
    expect(isKanaOnly("")).toBe(false);
  });
});
