import { describe, expect, it } from "vitest";
import { kanaCommit, kanaDisplay, toKana } from "./ime";

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
