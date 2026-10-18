import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  STROKE_STAND_INS,
  describeKanjiDecomposition,
  type KanjiElementList,
} from "./kanji-decomposition";

// The rule is only worth having if it covers the lists the ja-JP pack actually
// ships, so the same cards the drill renders are read from the pack files.
const PACK_FILES = [
  "../../../languages/ja-JP/kanji/entries.jsonl",
  "../../../languages/ja-JP/kanji/a2-topics.jsonl",
];

function packCards(): KanjiElementList[] {
  return PACK_FILES.flatMap((file) =>
    readFileSync(new URL(file, import.meta.url), "utf8")
      .split("\n")
      .filter((line) => line.trim() !== "")
      .map((line) => {
        const card = JSON.parse(line) as { character: string; radicals?: string[] };
        return { character: card.character, radicals: card.radicals ?? [] };
      }),
  );
}

function card(character: string, radicals: string[]): KanjiElementList {
  return { character, radicals };
}

describe("kanji decomposition framing", () => {
  it("calls a character listed against itself a whole character, not a part of itself", () => {
    const d = describeKanjiDecomposition(card("人", ["人"]));
    expect(d.kind).toBe("whole");
    expect(d.parts).toEqual([]);
    expect(d.showParts).toBe(false);
    expect(d.label).toContain("whole character");
  });

  it("suppresses a list that is only stroke stand-ins, with the reason", () => {
    const d = describeKanjiDecomposition(card("八", ["ハ"]));
    expect(d.kind).toBe("strokes");
    // ハ is how 八 is written, never a part it is built from.
    expect(d.parts).toEqual([]);
    expect(d.strokeStandIns).toBe(1);
    expect(d.showParts).toBe(false);
    expect(d.label).toContain("strokes");
  });

  it("keeps real elements as parts and drops the stroke stand-ins beside them", () => {
    const d = describeKanjiDecomposition(card("中", ["｜", "口"]));
    expect(d.kind).toBe("parts");
    expect(d.parts).toEqual(["口"]);
    expect(d.strokeStandIns).toBe(1);
    expect(d.showParts).toBe(true);
    expect(d.label).toContain("strokes it is written with are not parts");
  });

  it("never lists a character among its own parts", () => {
    const d = describeKanjiDecomposition(card("風", ["風", "几", "虫", "ノ"]));
    expect(d.kind).toBe("parts");
    expect(d.parts).toEqual(["几", "虫"]);
    expect(d.strokeStandIns).toBe(1);
  });

  it("frames a multi-element list as a decomposition, since elements can nest", () => {
    // KRADFILE lists every visible element, so 話 lists the 口 both beside and
    // inside 舌. Neither 言 nor 舌 is a taught card, so no cross-card lookup
    // could find that; the framing carries the caveat.
    const d = describeKanjiDecomposition(card("話", ["言", "口", "舌"]));
    expect(d.kind).toBe("parts");
    expect(d.parts).toEqual(["言", "口", "舌"]);
    expect(d.label).toContain("overlap or sit inside one another");
  });

  it("says one element for one element", () => {
    const d = describeKanjiDecomposition(card("森", ["木"]));
    expect(d.kind).toBe("parts");
    expect(d.parts).toEqual(["木"]);
    expect(d.label).toBe("Made of this element.");
  });

  describe("over the shipped ja-JP pack", () => {
    const cards = packCards();

    it("classifies every card without inventing parts", () => {
      expect(cards.length).toBeGreaterThan(50);
      for (const c of cards) {
        const d = describeKanjiDecomposition(c);
        expect(["whole", "strokes", "parts"]).toContain(d.kind);
        for (const part of d.parts) {
          expect(part).not.toBe(c.character);
          expect(STROKE_STAND_INS).not.toContain(part);
        }
        if (d.kind === "whole" || d.kind === "strokes") {
          expect(d.parts).toEqual([]);
          expect(d.showParts).toBe(false);
        } else {
          expect(d.parts.length).toBeGreaterThan(0);
          expect(d.showParts).toBe(true);
        }
        expect(d.label.length).toBeGreaterThan(0);
      }
    });

    it("finds all three cases in real pack data", () => {
      const kinds = new Set(cards.map((c) => describeKanjiDecomposition(c).kind));
      for (const kind of ["whole", "strokes", "parts"] as const) {
        expect(kinds.has(kind)).toBe(true);
      }
    });
  });
});
