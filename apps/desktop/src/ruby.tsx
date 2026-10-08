/**
 * K-54: whole-word furigana as real ruby markup. A Japanese word and its
 * kana reading render as one `<ruby>` element (`<rp>` fallback parens +
 * `<rt>` annotation), so screen readers and copy/paste keep the reading
 * bound to the word it annotates instead of loose sibling text.
 *
 * Invariants (all three are contract-tested in ruby.test.tsx):
 * - one `<ruby>` per word/phrase: the reading annotates the whole word,
 *   never a sibling `<small>` line;
 * - an all-kana headword gets no ruby at all (redundant annotation —
 *   mirrors the READ-001 `furigana.never_on` rule in
 *   `crates/activity/src/reading.rs`);
 * - romanisation is never an `<rt>` annotation: a transliteration is
 *   rendered as separate auxiliary text outside the ruby (mirrors the
 *   reader's canonical-form rule: romanization is auxiliary, never the
 *   linguistic form). Call sites only pass scaffold fields the READ-001
 *   reader emitted, i.e. already gated by the `romaji-mode` display
 *   setting and per-item mastery fade — this component never shows a
 *   scaffold the setting did not ask for.
 */

/**
 * Script classes by Unicode block, mirroring `script_of` in
 * crates/activity/src/reading.rs (hiragana 3041–309F, katakana block
 * including the prolonged-sound mark 30FC, CJK kanji ranges, ASCII
 * letters as Latin).
 */
const HIRAGANA = /[ぁ-ゟ]/;
const KATAKANA = /[゠-ヿ]/;
const KANJI = /[㐀-䶿一-鿿]/;
const LATIN = /[A-Za-z]/;

/**
 * True when every cased character of `text` is kana (punctuation and
 * spaces ignored), mirroring `is_kana_only` in
 * crates/activity/src/reading.rs.
 */
export function isKanaOnly(text: string): boolean {
  const letters = [...text].filter(
    (c) => HIRAGANA.test(c) || KATAKANA.test(c) || KANJI.test(c) || LATIN.test(c),
  );
  return letters.length > 0 && letters.every((c) => HIRAGANA.test(c) || KATAKANA.test(c));
}

/**
 * True when `text` contains Latin letters: a romanisation, never a
 * kana annotation.
 */
function isRomanised(text: string): boolean {
  return LATIN.test(text);
}

export interface RubyProps {
  /** Canonical Japanese-script word/phrase. */
  surface: string;
  /**
   * Whole-word kana reading (furigana). Presence is already decided by the
   * READ-001 reader (`romaji-mode` setting + mastery fade); empty or absent
   * renders the surface bare.
   */
  furigana?: string | null;
}

/**
 * Render `surface` annotated with its whole-word `furigana` as ruby
 * markup. Bare text when there is no reading or the headword is already
 * kana; a transliteration in the reading slot renders outside the ruby,
 * never inside `<rt>`.
 */
export function Ruby({ surface, furigana }: RubyProps) {
  const reading = furigana?.trim();
  if (!reading || reading === surface || isKanaOnly(surface)) {
    return <>{surface}</>;
  }
  if (isRomanised(reading)) {
    // Auxiliary transliteration, kept outside the ruby (and outside
    // any <rt>): romanisation is never a phonetic annotation.
    return (
      <>
        {surface}
        <small className="romaji">{reading}</small>
      </>
    );
  }
  return (
    <ruby>
      {surface}
      <rp>(</rp>
      <rt>{reading}</rt>
      <rp>)</rp>
    </ruby>
  );
}
