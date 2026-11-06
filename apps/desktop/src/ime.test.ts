import { describe, expect, it } from "vitest";
import { kanaCommit, kanaDisplay, packDeclaresInAppKanaKeyboard, toKana } from "./ime";

describe("romaji→kana converter (issue #2 phase 1)", () => {
  it("converts the words the practice runners actually ask for", () => {
    // Strict kana transliteration: "wa" is わ — the こんにちは word form is
    // orthography, and it arrives as a pack-lexicon candidate (phase 2),
    // not as a baked-in exception to the table.
    expect(kanaDisplay("konnichiwa")).toBe("こんにちわ");
    expect(kanaDisplay("arigatou")).toBe("ありがとう");
    expect(kanaDisplay("sayounara")).toBe("さようなら");
    expect(kanaDisplay("ohayou")).toBe("おはよう");
    expect(kanaDisplay("kya")).toBe("きゃ");
  });

  it("shows an unresolved tail verbatim as the preedit", () => {
    expect(toKana("konnichi")).toEqual({ kana: "こんにち", pending: "" });
    expect(toKana("arigat")).toEqual({ kana: "ありが", pending: "t" });
    expect(toKana("ky")).toEqual({ kana: "", pending: "ky" });
    expect(toKana("n")).toEqual({ kana: "", pending: "n" });
  });

  it("handles the small tsu by consonant doubling", () => {
    expect(kanaDisplay("kitte")).toBe("きって");
    expect(kanaDisplay("gakkou")).toBe("がっこう");
    // Double n is ん+next syllable, never a small tsu: "konna" → こんな.
    expect(kanaDisplay("konna")).toBe("こんな");
  });

  it("disambiguates n the way a romaji IME does", () => {
    // The live display keeps the trailing n as latin preedit, exactly like a
    // real IME; it resolves to ん when the word is committed.
    expect(kanaDisplay("nihon")).toBe("にほn");
    expect(kanaCommit("nihon")).toBe("にほん");
    expect(kanaDisplay("honto")).toBe("ほんと");
    expect(kanaDisplay("ga'ya")).toBe("がや"); // apostrophe forces the split
    expect(kanaCommit("san")).toBe("さん");
    expect(kanaCommit("n")).toBe("ん"); // a lone n resolves on commit
  });

  it("never drops characters on commit", () => {
    expect(kanaCommit("ky")).toBe("ky");
    expect(kanaCommit("arigatou")).toBe("ありがとう");
    expect(kanaCommit("q")).toBe("q");
  });

  it("passes non-romaji through untouched (OS-IME kana, digits, punctuation)", () => {
    expect(kanaDisplay("ありgaとう")).toBe("ありがとう");
    expect(kanaDisplay("3!")).toBe("3!");
  });

  it("converts live at every keystroke, matching progressive typing", () => {
    // The hook recomputes from the whole buffer on each keystroke, so the
    // display of a prefix is exactly the partial word.
    expect(kanaDisplay("k")).toBe("k");
    expect(kanaDisplay("ko")).toBe("こ");
    expect(kanaDisplay("kon")).toBe("こn"); // trailing n waits for its syllable
    expect(kanaDisplay("konna")).toBe("こんな");
    expect(kanaDisplay("konnichih")).toBe("こんにちh"); // typo: live tail stays raw
  });
});

// SETTINGS-PACK-CAPABILITY-001: the grant is the pack's manifest `scripts:`,
// read back; the gate never inspects a locale or language code.
describe("pack-declared gate for the in-app kana keyboard", () => {
  it("grants what the ja-JP reference manifest declares", () => {
    // languages/ja-JP/manifest.yaml, verbatim.
    expect(
      packDeclaresInAppKanaKeyboard([
        "ja.orth.hiragana",
        "ja.orth.katakana",
        "ja.orth.kanji",
        "ja.orth.latin",
      ]),
    ).toBe(true);
  });

  it("does not grant for the ru-RU reference manifest", () => {
    // languages/ru-RU/manifest.yaml, verbatim: Cyrillic only.
    expect(packDeclaresInAppKanaKeyboard(["ru.orth.cyrillic"])).toBe(false);
  });

  it("grants on the declared script, never on the pack's language", () => {
    // Any pack that declares a script this keyboard can type gets the grant,
    // whatever its locale would have been — and a Japanese-locale-shaped id
    // naming only Kanji/Latin grants nothing.
    expect(packDeclaresInAppKanaKeyboard(["ryu.orth.katakana"])).toBe(true);
    expect(packDeclaresInAppKanaKeyboard(["ja.orth.kanji", "ja.orth.latin"])).toBe(false);
  });

  it("a pack declaring nothing grants nothing", () => {
    expect(packDeclaresInAppKanaKeyboard([])).toBe(false);
  });
});
