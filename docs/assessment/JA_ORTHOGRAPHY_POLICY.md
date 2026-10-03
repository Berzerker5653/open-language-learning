# JA-RES-003 — Orthography progression policy (narrative)

Machine contract: `JA_ORTHOGRAPHY.yaml` (v0.2 scripts document, schema
validated) + `JA_ORTHOGRAPHY_POLICY.yaml` (scaffold policy, invariants
tested in `crates/langpack/tests/ja_orthography.rs`).

## Acceptance 1: hiragana/katakana/kanji/furigana/romaji scaffold policy is machine-represented

- Scripts encoded with teaching order and Unicode blocks: hiragana
  (order 0) and katakana (order 1) both introduced on-ramp from day
  one *in parallel with real language* (docs/06 zero/on-ramp),
  including dakuten/handakuten, contracted sounds, small っ,
  long-vowel conventions, and katakana loanword conventions.
- Kanji introduced at A1, selected by communicative value and
  frequency/context; arbitrary list order is explicitly forbidden as
  a selection rule. Four facets tracked separately: recognition in
  known vocabulary, readings in context, semantic associations,
  writing form (when enabled).
- Furigana: adaptive — visible when reading support is needed,
  hidden per item once that item's reading state reaches `supported`,
  always available on demand (reveal recorded as support), never
  applied to kana-only items.
- Romaji: modified Hepburn; scaffold + native mixed-script use;
  canonical content always stored in Japanese script.

## Acceptance 2: reading and writing competencies remain separate

`competency_separation` maps reading to `comprehension-reading`
(facets: character recognition, reading in words, text comprehension;
character memorization never equates to comprehension) and writing
to `production-writing` with four separate tracks (IME selection,
kana/kanji form recall, handwriting when supported, composition).
Cross-rule: dimensions are independent — evidence on one never
grants the other (docs/03 §4). Handwriting never gates speaking.
The test asserts the two dimensions are distinct canonical
`masteryDimension` values and that writing tracks are separate ids.

## Acceptance 3: romaji fade behavior is specified

`romaji_fade` block:

- default visible at start; user modes `auto | always | off`;
- auto rules: item-level romaji hides when that item's reading state
  reaches `supported`, or when the item is kana-only and kana literacy
  is established; kept while below `supported` (on-ramp support);
- reveal is always available and recorded as support (docs/06:
  assistance is evidence support, independent comprehension is a
  separate condition);
- `fade_is_not_removal`: fade never permanently hides against user
  will — the goal is "fade rather than permanent dependency";
- romaji state never gates speaking/listening progression or the
  handwriting track;
- romaji input allowed in early stages, but reading/writing
  progression is measured in Japanese script.

## Boundaries

Policy is `provisional-pending-review`: kana/kanji ordering, kanji
selection, and fade thresholds are pedagogical hypotheses requiring
REVIEW-001 qualified review before `reference` status. Nothing here
certifies review or linguistic correctness.
