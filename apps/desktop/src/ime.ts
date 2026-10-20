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
