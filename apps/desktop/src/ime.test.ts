import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  inAppKeyboardForScripts,
  inputModeLabel,
  kanaCommit,
  kanaDisplay,
  packDeclaresInAppKanaKeyboard,
  ROMAJI_KANA_CONVERTER,
  toKana,
} from "./ime";

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

// IME-TOGGLE-UX-001 acceptance 3: the input layer resolves its converter
// from pack-declared capability plus the converter registry (kana is phase
// 1's instance). Adding another script's keyboard is a registry entry plus
// pack content — no language branch anywhere — and a pack without mapping
// data resolves nothing: no keyboard, no bubble.
describe("script-keyed converter registry (IME-TOGGLE-UX-001)", () => {
  it("resolves the kana converter plus the pack's own declared ids", () => {
    const kb = inAppKeyboardForScripts([
      "ja.orth.hiragana",
      "ja.orth.katakana",
      "ja.orth.kanji",
      "ja.orth.latin",
    ]);
    expect(kb?.converter.id).toBe("romaji-kana");
    expect(kb?.declaredScriptIds).toEqual(["ja.orth.hiragana", "ja.orth.katakana"]);
  });

  it("a pack whose scripts no converter serves resolves no keyboard", () => {
    expect(inAppKeyboardForScripts(["ru.orth.cyrillic"])).toBeNull();
    expect(inAppKeyboardForScripts([])).toBeNull();
  });

  it("resolves on the script, never a language: a non-Japanese pack declaring the script gets the same converter", () => {
    const kb = inAppKeyboardForScripts(["ryu.orth.katakana"]);
    expect(kb?.converter).toBe(ROMAJI_KANA_CONVERTER);
    expect(kb?.declaredScriptIds).toEqual(["ryu.orth.katakana"]);
  });

  it("the mode label is built from the pack's declared script metadata", () => {
    const ja = inAppKeyboardForScripts(["ja.orth.hiragana", "ja.orth.katakana"]);
    if (!ja) throw new Error("kana pack should resolve a keyboard");
    expect(inputModeLabel(ja)).toBe("romaji → hiragana · katakana");
    // A hypothetical non-Japanese pack that declares one served script
    // labels itself with ITS metadata through the same code path.
    const other = inAppKeyboardForScripts(["xx.orth.katakana"]);
    if (!other) throw new Error("a pack declaring katakana must resolve a keyboard");
    expect(inputModeLabel(other)).toBe("romaji → katakana");
  });

  it("the converter's data drives display and commit", () => {
    expect(ROMAJI_KANA_CONVERTER.display("konnichiwa")).toBe("こんにちわ");
    expect(ROMAJI_KANA_CONVERTER.commit("nihon")).toBe("にほん");
  });
});

// IME-TOGGLE-UX-001 acceptance 3, pinned structurally: the UI and the
// input layer must contain no quoted language/script literal — the mode
// name and the keyboard's existence both come from pack-declared metadata,
// so a hardcoded language string in these files is a regression. (The
// converter's own script names live in ime.ts as mapping data, where a
// new script's keyboard adds its own entry.)
describe("no language-literal branches in the input UI (IME-TOGGLE-UX-001)", () => {
  const LANGUAGE_LITERAL =
    /(["'`])(ja-JP|ru-RU|Japanese|Russian|日本語|hiragana|katakana|cyrillic)\1/i;
  for (const file of ["App.tsx", "kana-ime.tsx"]) {
    it(`${file} carries no quoted language or script literal`, () => {
      const src = readFileSync(new URL(`./${file}`, import.meta.url), "utf8");
      // Strip /* … */ and // … comments: prose may name languages, code
      // may not be branched on them.
      const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
      const match = code.match(LANGUAGE_LITERAL);
      expect(match, `found language literal ${match?.[0]} in ${file}`).toBeNull();
    });
  }
});
