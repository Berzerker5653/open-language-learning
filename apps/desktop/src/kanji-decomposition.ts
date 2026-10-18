// JA-KANJI-DECOMP-UI-001: how the kanji drill frames the element list a pack
// records for a character.
//
// The ja-JP element lists come from KRADFILE, which names every visible element
// of a character. Three shapes therefore reach the drill, and rendering them as
// a bare `A + B` join turns each into an unsupported claim about parts:
//
//   - the character listed as its own only element (人 -> 人);
//   - stroke stand-ins, the letters KRADFILE uses for strokes that have no
//     radical glyph of their own (八 -> ハ, 中 -> ｜ + 口);
//   - an element that is also inside another listed element, because every
//     visible element is named (話 -> 言 + 口 + 舌, where the 口 is inside 舌).
//
// So the list is classified first and the drill says which case it is in. The
// classification is deliberately local to one card: 話's nesting is invisible to
// a cross-card lookup, since neither 言 nor 舌 is itself a taught card.
//
// Nothing here claims a stroke count. A list length is not a stroke count:
// 七 lists three elements and is written with two strokes.

/** KRADFILE's stand-ins for strokes with no radical glyph of their own. The
 *  vertical is U+FF5C FULLWIDTH VERTICAL LINE, not an ASCII pipe. Kangxi
 *  radicals that happen to be one stroke (丶 亅) stay elements. */
export const STROKE_STAND_INS: readonly string[] = ["ノ", "ハ", "ヨ", "｜"];

/** `whole`: no elements but the character itself. `strokes`: nothing but stroke
 *  stand-ins. `parts`: at least one element worth showing as a part. */
export type DecompositionKind = "whole" | "strokes" | "parts";

/** The part of a kanji card this rule needs; `KanjiCard` satisfies it. */
export interface KanjiElementList {
  character: string;
  radicals: readonly string[];
}

export interface KanjiDecomposition {
  kind: DecompositionKind;
  /** Elements worth rendering as parts: stroke stand-ins and self-references
   *  are excluded, so a card never appears among its own parts. */
  parts: string[];
  strokeStandIns: number;
  /** Learner-facing framing for this card. */
  label: string;
  /** Whether to render `parts` at all. */
  showParts: boolean;
}

const WHOLE_LABEL = "Learned as a whole character — this pack lists no smaller parts for it.";
const STROKES_LABEL = "Written with strokes — this character is not built from separate parts.";
const SINGLE_PART_LABEL = "Made of this element.";
const PARTS_LABEL = "Made of these elements, which can overlap or sit inside one another.";
const STROKE_NOTE = " The strokes it is written with are not parts.";

export function describeKanjiDecomposition(card: KanjiElementList): KanjiDecomposition {
  const strokeStandIns = card.radicals.filter((glyph) =>
    STROKE_STAND_INS.includes(glyph),
  ).length;
  const parts = card.radicals.filter(
    (glyph) => !STROKE_STAND_INS.includes(glyph) && glyph !== card.character,
  );

  if (parts.length === 0) {
    // 八 -> ハ lists strokes only: naming them as parts would invent a
    // composition, so the list is suppressed with the reason.
    return strokeStandIns > 0
      ? { kind: "strokes", parts, strokeStandIns, label: STROKES_LABEL, showParts: false }
      : { kind: "whole", parts, strokeStandIns, label: WHOLE_LABEL, showParts: false };
  }

  const base = parts.length === 1 ? SINGLE_PART_LABEL : PARTS_LABEL;
  return {
    kind: "parts",
    parts,
    strokeStandIns,
    label: strokeStandIns > 0 ? base + STROKE_NOTE : base,
    showParts: true,
  };
}
