import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  inAppKeyboardForScripts,
  inputMethodAllowed,
  inputModeLabel,
  kanaCommit,
  kanaDisplay,
  packDeclaresInAppKanaKeyboard,
  ROMAJI_KANA_CONVERTER,
  toKana,
} from "./ime";
import {
  candidateProvenanceLabel,
  LEXICON_CANDIDATES_METHOD_ID,
  type ImeCandidate,
} from "./ime-candidates";

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

// IN-APP-IME-001 phase 2: packs may declare their input methods via
// manifest capabilities.input_methods (mirrored onto the installed-pack
// record). Absent map = current behavior stands; a present map is the
// explicit allowlist — an explicit false or a missing key refuses, even
// when the pack's scripts would otherwise grant the converter.
describe("pack-declared input methods gate (IN-APP-IME-001 phase 2)", () => {
  const JA_SCRIPTS = ["ja.orth.hiragana", "ja.orth.katakana"];

  it("an absent map changes nothing (tri-state, not an empty refusal)", () => {
    expect(inputMethodAllowed(undefined, "romaji-kana")).toBe(true);
    expect(inputMethodAllowed({ declared: false, methods: [] }, "romaji-kana")).toBe(true);
    expect(inAppKeyboardForScripts(JA_SCRIPTS)?.converter.id).toBe("romaji-kana");
    expect(
      inAppKeyboardForScripts(JA_SCRIPTS, { declared: false, methods: [] })?.converter.id,
    ).toBe("romaji-kana");
  });

  it("a declared map is the allowlist: an explicit false turns the converter off", () => {
    const off = { declared: true, methods: ["lexicon-candidates"] };
    expect(inputMethodAllowed(off, "romaji-kana")).toBe(false);
    expect(inAppKeyboardForScripts(JA_SCRIPTS, off)).toBeNull();
    expect(packDeclaresInAppKanaKeyboard(JA_SCRIPTS, off)).toBe(false);
  });

  it("a declared map naming the converter keeps the grant", () => {
    const on = { declared: true, methods: ["lexicon-candidates", "romaji-kana"] };
    expect(inAppKeyboardForScripts(JA_SCRIPTS, on)?.converter.id).toBe("romaji-kana");
    expect(packDeclaresInAppKanaKeyboard(JA_SCRIPTS, on)).toBe(true);
  });

  it("the lexicon-candidates id is the gate the candidate lookup honors", () => {
    // The App builds the gate from the installed record and rules the
    // engine lookup out BEFORE calling it when the pack refuses.
    expect(
      inputMethodAllowed(
        { declared: true, methods: ["romaji-kana"] },
        LEXICON_CANDIDATES_METHOD_ID,
      ),
    ).toBe(false);
    expect(inputMethodAllowed({ declared: false, methods: [] }, LEXICON_CANDIDATES_METHOD_ID)).toBe(
      true,
    );
  });
});

// IN-APP-IME-001 phase 2 acceptance 3 (structural): the engine contains no
// hard-coded word list. The romaji→kana table is universal transliteration
// data (kana only); any Japanese WORD list would carry kanji. So NO engine
// source may contain a single CJK Unified Ideograph — a baked-in word list
// cannot be added without tripping this test.
describe("no baked-in word list in the input engine (IN-APP-IME-001)", () => {
  const CJK_UNIFIED = /[\u4e00-\u9fff\u3400-\u4dbf]/;
  for (const file of ["ime.ts", "kana-ime.tsx", "ime-candidates.ts"]) {
    it(`${file} contains no CJK ideograph (no word list can hide there)`, () => {
      const src = readFileSync(new URL(`./${file}`, import.meta.url), "utf8");
      const match = src.match(CJK_UNIFIED);
      expect(match, `found CJK ideograph ${match?.[0]} in ${file}`).toBeNull();
    });
  }
});

// IN-APP-IME-001 phase 2 acceptance 2 (renderer half): every candidate
// carries the provenance of the entry that produced it, and the aux slice
// never claims a pack content id.
describe("candidate provenance formatting (IN-APP-IME-001)", () => {
  it("a pack candidate names its source AND its entry id", () => {
    const c: ImeCandidate = {
      text: "\u6982\u5ff5",
      reading: "\u304c\u3044\u306d\u3093",
      gloss: "concept",
      source: "pack",
      entry_id: "ja.lex.fixture.gainen",
      attribution: null,
    };
    const label = candidateProvenanceLabel(c);
    expect(label).toContain("pack lexicon");
    expect(label).toContain("ja.lex.fixture.gainen");
    expect(label).toContain("concept");
  });

  it("an aux candidate is labeled auxiliary and never shows an entry id", () => {
    const c: ImeCandidate = {
      text: "\u732b",
      reading: null,
      gloss: "cat",
      source: "aux",
      entry_id: null,
      attribution: "Definitions from Wiktionary via kaikki.org (CC BY-SA / GFDL)",
    };
    const label = candidateProvenanceLabel(c);
    expect(label).toContain("auxiliary lexicon");
    expect(label).toContain("kaikki.org");
    expect(label).not.toContain("pack");
  });
});
