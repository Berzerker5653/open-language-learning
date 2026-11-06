import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// JA-KANJI-MNEMONICS-001: a mnemonic may only name elements the pack's sourced
// element list actually carries. The pack's `radicals` lists are derived from
// KRADFILE (see scripts/derive-kanji-radicals.py); when a refresh changes an
// element list, any mnemonic still naming the old element becomes a claim the
// sourced data no longer supports. This check reports the count of such cards
// so the mismatch cannot silently grow. It never authors replacement text —
// the mnemonics themselves are a human/learner-facing authoring surface.
//
// Repo convention inspected on 2026-11-06: mnemonics name elements they rely
// on in parentheses — `Sun (日) plus ...` — and an element-naming phrase inside
// parentheses is written `刀 over 田`. So the parse is: take every
// parenthesized span (ASCII or fullwidth parentheses) and treat every CJK
// character in it as a named element. Every named element must appear in the
// entry's `radicals`. A mnemonic with no parentheses names no element and
// cannot mismatch.

const PACK_FILES = [
  "../../../languages/ja-JP/kanji/entries.jsonl",
  "../../../languages/ja-JP/kanji/a2-topics.jsonl",
];

interface MnemonicCard {
  id: string;
  character: string;
  mnemonic: string;
  radicals: string[];
}

function packCards(): MnemonicCard[] {
  return PACK_FILES.flatMap((file) =>
    readFileSync(new URL(file, import.meta.url), "utf8")
      .split("\n")
      .filter((line) => line.trim() !== "")
      .map((line) => {
        const card = JSON.parse(line) as {
          id: string;
          character: string;
          mnemonic?: string;
          radicals?: string[];
        };
        return {
          id: card.id,
          character: card.character,
          mnemonic: card.mnemonic ?? "",
          radicals: card.radicals ?? [],
        };
      }),
  );
}

/** Parenthesized spans of a mnemonic (ASCII and fullwidth parentheses). */
function parenthesizedSpans(mnemonic: string): string[] {
  return mnemonic.match(/[（(]([^）)]*)[）)]/g)?.map((s) => s.slice(1, -1)) ?? [];
}

/** CJK characters (ideographs, radicals supplement, compatibility ideographs)
 *  inside a span; each is a named decomposition element. */
function namedElements(span: string): string[] {
  return span.match(/[\u2f00-\u2fdf\u4e00-\u9fff\uf900-\ufaff]/g) ?? [];
}

function mismatchingCards(cards: MnemonicCard[]): { card: MnemonicCard; missing: string[] }[] {
  const mismatches: { card: MnemonicCard; missing: string[] }[] = [];
  for (const card of cards) {
    const named = parenthesizedSpans(card.mnemonic).flatMap(namedElements);
    const missing = [...new Set(named)].filter((el) => !card.radicals.includes(el));
    if (missing.length > 0) mismatches.push({ card, missing });
  }
  return mismatches;
}

describe("ja-JP kanji mnemonics only name sourced elements", () => {
  const cards = packCards();
  const mismatches = mismatchingCards(cards);

  it("covers the cards the pack actually ships", () => {
    // Guard against the check silently narrowing: every card with a mnemonic
    // is parsed, and both pack files contribute.
    const withMnemonic = cards.filter((c) => c.mnemonic !== "");
    expect(cards.length).toBeGreaterThanOrEqual(84);
    expect(withMnemonic.length).toBe(cards.length);
  });

  it("has zero mnemonics naming an element absent from the card's sourced list", () => {
    // The count is the acceptance measurement; on failure the report names
    // every offending card and the element it names but the pack does not.
    const report = mismatches.map(
      (m) =>
        `${m.card.id} (${m.card.character}): names ${m.missing.join(" ")} — not in [${m.card.radicals.join(" ")}]; mnemonic: ${m.card.mnemonic}`,
    );
    expect(
      mismatches.map((m) => `${m.card.id}: missing ${m.missing.join(" ")}`),
      report.join("\n"),
    ).toEqual([]);
  });

  it("parses element-naming parentheses out of representative mnemonics", () => {
    // Pin the parser itself so a mnemonic-text style change cannot quietly
    // turn the gate vacuous.
    const span = parenthesizedSpans("Steam (气) rising — spirit.")[0] ?? "";
    expect(namedElements(span)).toEqual(["气"]);
    expect(namedElements("刀 over 田")).toEqual(["刀", "田"]);
    expect(parenthesizedSpans("One horizontal stroke — one.")).toEqual([]);
  });
});
