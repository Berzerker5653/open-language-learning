/**
 * In-app kana keyboard (issue #2, phase 1).
 *
 * Romaji→kana transliteration that lives inside the app: no system IME, no
 * layout changes, nothing installed. The table is universal Japanese data —
 * engine-owned, versioned, tested — not pack content; packs will only ever
 * declare availability (phase 2, the ADR-0038 pattern) and supply kanji
 * candidates from their own lexicon.
 *
 * The converter is pure and deterministic: a typed buffer maps to committed
 * kana plus a visible pending tail (the raw romaji not yet resolvable), which
 * is the preedit. `n` stays pending until it resolves (na, n', nn, n+consonant,
 * or flush), matching how any romaji IME disambiguates ん.
 */

const KANA: Record<string, string> = {
  a: "あ",
  i: "い",
  u: "う",
  e: "え",
  o: "お",
  wa: "わ",
  wo: "を",
  n: "ん",
  // k, g
  ka: "か",
  ki: "き",
  ku: "く",
  ke: "け",
  ko: "こ",
  kya: "きゃ",
  kyu: "きゅ",
  kyo: "きょ",
  ga: "が",
  gi: "ぎ",
  gu: "ぐ",
  ge: "げ",
  go: "ご",
  gya: "ぎゃ",
  gyu: "ぎゅ",
  gyo: "ぎょ",
  // s, z
  sa: "さ",
  shi: "し",
  si: "し",
  su: "す",
  se: "せ",
  so: "そ",
  sha: "しゃ",
  shu: "しゅ",
  sho: "しょ",
  za: "ざ",
  zi: "じ",
  zu: "ず",
  ze: "ぜ",
  zo: "ぞ",
  ja: "じゃ",
  ji: "じ",
  ju: "じゅ",
  je: "じぇ",
  jo: "じょ",
  // t, d
  ta: "た",
  chi: "ち",
  ti: "ち",
  tsu: "つ",
  tu: "つ",
  te: "て",
  to: "と",
  cha: "ちゃ",
  chu: "ちゅ",
  cho: "ちょ",
  da: "だ",
  de: "で",
  do: "ど",
  dya: "ぢゃ",
  dyu: "ぢゅ",
  dyo: "ぢょ",
  // n, h, m, y, r, w
  na: "な",
  ni: "に",
  nu: "ぬ",
  ne: "ね",
  no: "の",
  nya: "にゃ",
  nyu: "にゅ",
  nyo: "にょ",
  ha: "は",
  hi: "ひ",
  hu: "ふ",
  he: "へ",
  ho: "ほ",
  hya: "ひゃ",
  hyu: "ひゅ",
  hyo: "ひょ",
  ma: "ま",
  mi: "み",
  mu: "む",
  me: "め",
  mo: "も",
  mya: "みゃ",
  myu: "みゅ",
  myo: "みょ",
  ya: "や",
  yu: "ゆ",
  yo: "よ",
  ra: "ら",
  ri: "り",
  ru: "る",
  re: "れ",
  ro: "ろ",
  rya: "りゃ",
  ryu: "りゅ",
  ryo: "りょ",
  // b, p, v
  ba: "ば",
  bi: "び",
  bu: "ぶ",
  be: "べ",
  bo: "ぼ",
  bya: "びゃ",
  byu: "びゅ",
  byo: "びょ",
  pa: "ぱ",
  pi: "ぴ",
  pu: "ぷ",
  pe: "ぺ",
  po: "ぽ",
  pya: "ぴゃ",
  pyu: "ぴゅ",
  pyo: "ぴょ",
  va: "ゔぁ",
  vi: "ゔぃ",
  vu: "ゔ",
  ve: "ゔぇ",
  vo: "ゔぉ",
};

// Longest key wins at a position; keys are short so ordering is enough.
const KEYS = Object.keys(KANA).sort((a, b) => b.length - a.length);
const MAX_KEY = 3;

const CONSONANT = /[bdfghjklprstvwxyz]/;

export interface KanaBuffer {
  /** Kana resolved so far — what the field shows committed. */
  kana: string;
  /** Raw romaji not yet resolvable — the visible preedit tail. */
  pending: string;
}

function prefixOfSomeKey(fragment: string): boolean {
  return KEYS.some((k) => k.length > fragment.length && k.startsWith(fragment));
}

/**
 * Convert a typed romaji buffer into committed kana plus a pending tail.
 * Doubling a consonant yields the small tsu (っ): "kitte" → キット. `nn` and
 * a trailing `n` at flush resolve to ん; an apostrophe forces the split
 * ("ga'ya" → がや, never がゃ).
 */
export function toKana(input: string, flush = false): KanaBuffer {
  let out = "";
  let i = 0;
  while (i < input.length) {
    const rest = input.slice(i);
    const c = rest[0]!;
    if (c === "'") {
      // Forced break: consumes the separator, next match starts fresh.
      i += 1;
      continue;
    }
    if (!/[a-z]/.test(c)) {
      // Anything that is not romaji (OS-IME kana pasted or typed into the
      // buffer, digits, punctuation) passes through untouched.
      out += c;
      i += 1;
      continue;
    }
    // sokuon: a doubled consonant (but never double-n) is the small tsu.
    if (CONSONANT.test(c) && c !== "n" && rest[1] === c) {
      out += "っ";
      i += 1;
      continue;
    }
    // A lone trailing n is ambiguous mid-word (na? んa?): it stays the
    // preedit until a following key resolves it or commit flushes it to ん.
    if (c === "n" && rest.length === 1 && !flush) {
      return { kana: out, pending: "n" };
    }
    // ん before a consonant that cannot follow n: "nto" → んと.
    if (c === "n" && rest[1] !== undefined && CONSONANT.test(rest[1]) && rest[1] !== "y") {
      out += "ん";
      i += 1;
      continue;
    }
    let matched = false;
    for (const key of KEYS) {
      if (rest.startsWith(key)) {
        out += KANA[key];
        i += key.length;
        matched = true;
        break;
      }
    }
    if (matched) continue;
    // The longest live sequence: a prefix of some key that the next typed
    // character can still extend. It is the preedit — shown verbatim, the
    // rest of the buffer included — until it resolves or breaks.
    let live = false;
    for (let len = Math.min(MAX_KEY, rest.length); len >= 1; len -= 1) {
      const frag = rest.slice(0, len);
      if (!prefixOfSomeKey(frag)) continue;
      const nxt = rest[len];
      if (nxt !== undefined && !prefixOfSomeKey(frag + nxt)) continue;
      if (!flush) return { kana: out, pending: rest };
      // Flushing (Enter/commit) never drops characters: a trailing
      // ambiguous n resolves to ん, anything else echoes as typed.
      out += frag === "n" ? "ん" : frag;
      i += len;
      live = true;
      break;
    }
    if (live) continue;
    // Not romaji at all (q, l, …): echo it and move on.
    out += c;
    i += 1;
  }
  return { kana: out, pending: "" };
}

/** What the learner's field should display for the current buffer. */
export function kanaDisplay(buffer: string): string {
  const { kana, pending } = toKana(buffer);
  return kana + pending;
}

/** Commit on Enter / blur: a trailing ambiguous n resolves to ん. */
export function kanaCommit(buffer: string): string {
  return toKana(buffer, true).kana;
}

/**
 * SETTINGS-PACK-CAPABILITY-001: which scripts this keyboard can actually
 * type. The converter above implements romaji→kana and nothing else, so
 * these are the script names (the last segment of a pack's declared script
 * ids) it serves. A keyboard for another script belongs to another module,
 * and that module names its own scripts here or in its own gate.
 */
export const IN_APP_KANA_KEYBOARD_SCRIPT_NAMES: readonly string[] = ["hiragana", "katakana"];

/**
 * IME-TOGGLE-UX-001: the generalized input layer. An in-app keyboard is a
 * converter plus the script names its mapping data types — the registry
 * below is the seam. Adding another script's keyboard is a new converter
 * entry (its own mapping module) and the pack declaring that script in its
 * manifest `scripts:`; nothing in the engine or UI grows a language branch,
 * and a pack whose scripts no converter serves ships no keyboard at all.
 */
export interface ScriptKeyboardConverter {
  /** Machine id. It doubles as the per-profile setting value that selects
   * this converter (phase 1: the stored `kana-keyboard` value
   * "romaji-kana" is exactly this id), so the setting is converter-keyed
   * rather than language-keyed. */
  readonly id: string;
  /** Script names (last segment of a pack's declared script ids) this
   * converter's mapping data types. */
  readonly scriptNames: readonly string[];
  /** Script the learner types FROM, for the input-mode label. */
  readonly sourceName: string;
  /** Live display for the typed buffer: converted text + visible preedit. */
  display(buffer: string): string;
  /** Commit (Enter/blur): resolve the pending tail, never drop characters. */
  commit(buffer: string): string;
}

/** Phase 1's instance: the romaji→kana converter defined at the top. */
export const ROMAJI_KANA_CONVERTER: ScriptKeyboardConverter = {
  id: "romaji-kana",
  scriptNames: IN_APP_KANA_KEYBOARD_SCRIPT_NAMES,
  sourceName: "romaji",
  display: kanaDisplay,
  commit: kanaCommit,
};

/** The registry every gate resolves from. Order decides which converter
 * serves a pack that declares scripts for more than one keyboard. */
export const IN_APP_KEYBOARD_CONVERTERS: readonly ScriptKeyboardConverter[] = [
  ROMAJI_KANA_CONVERTER,
];

/** A pack-granted in-app keyboard: the converter plus the pack's own
 * declared script ids it serves — the label source, so the UI names the
 * mode after what the PACK declared, never after a hardcoded language. */
export interface InAppKeyboard {
  converter: ScriptKeyboardConverter;
  declaredScriptIds: string[];
}

/**
 * IME-TOGGLE-UX-001 / SETTINGS-PACK-CAPABILITY-001: resolve the in-app
 * keyboard from the pack's own manifest `scripts:` plus the converter
 * registry — never from the pack's locale or a language code. A pack that
 * declares no script any converter serves (or declares nothing) resolves
 * to null: no keyboard, no bubble, no shortcut effect.
 */
export function inAppKeyboardForScripts(scripts: string[]): InAppKeyboard | null {
  for (const converter of IN_APP_KEYBOARD_CONVERTERS) {
    const declared = scripts.filter((id) =>
      converter.scriptNames.includes(id.split(".").pop()?.toLowerCase() ?? ""),
    );
    if (declared.length > 0) return { converter, declaredScriptIds: declared };
  }
  return null;
}

/** The script names a pack declared, read off its own ids: "ja.orth.hiragana"
 * is "hiragana" because the pack's manifest says so. */
export function scriptMetadataNames(scriptIds: string[]): string[] {
  const names: string[] = [];
  for (const id of scriptIds) {
    const name = id.split(".").pop()?.toLowerCase() ?? "";
    if (name !== "" && !names.includes(name)) names.push(name);
  }
  return names;
}

/** The input-mode label for a granted keyboard, composed entirely from
 * converter data and the active pack's declared script metadata. */
export function inputModeLabel(kb: InAppKeyboard): string {
  return `${kb.converter.sourceName} → ${scriptMetadataNames(kb.declaredScriptIds).join(" · ")}`;
}

/**
 * SETTINGS-PACK-CAPABILITY-001: whether the active pack's own manifest
 * grants the in-app kana keyboard — true iff the registry resolves a kana
 * converter from the pack's declared scripts. Now a thin view over the
 * same resolution every other surface uses.
 */
export function packDeclaresInAppKanaKeyboard(scripts: string[]): boolean {
  const kb = inAppKeyboardForScripts(scripts);
  return kb !== null && kb.converter.id === ROMAJI_KANA_CONVERTER.id;
}
