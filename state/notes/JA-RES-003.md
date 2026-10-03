# JA-RES-003 Acceptance Notes — Orthography progression

Date: 2026-10-02

## Acceptance 1: hiragana/katakana/kanji/furigana/romaji scaffold policy machine-represented

- `docs/assessment/JA_ORTHOGRAPHY.yaml`: v0.2 orthography document —
  hiragana (teaching_order 0) and katakana (1) both on-ramp from day
  one with full scope lists (dakuten/handakuten, contracted sounds,
  small っ, long-vowel conventions, katakana loanword conventions);
  kanji at A1 with communicative-value/frequency selection and an
  explicit `forbidden_selection: arbitrary-list-order`; latin/romaji
  as scaffold + native mixed-script use. Schema-validated by
  `scripts_document_validates_against_v02_schema`.
- `docs/assessment/JA_ORTHOGRAPHY_POLICY.yaml`: furigana policy
  (adaptive visibility, hide at item reading state ≥ `supported`,
  always on demand, reveal recorded as support, never on kana-only
  items) and kanji facet tracking (recognition-in-vocab,
  readings-in-context, semantic associations, writing-form-when-
  enabled). Test `scaffold_policy_covers_all_five_scaffolds`.

## Acceptance 2: reading and writing competencies remain separate

`competency_separation`: reading → `comprehension-reading`
(character-recognition / reading-in-words / text-comprehension;
"character-memorization-never-equates-to-comprehension"); writing →
`production-writing` with four separate tracks (IME selection,
kana/kanji form recall, handwriting-when-supported, composition);
"handwriting-never-gates-speaking"; cross-rule: dimensions are
independent, evidence on one never grants the other. Test
`reading_and_writing_competencies_are_separate` asserts distinct
canonical dimensions and the two rules verbatim.

## Acceptance 3: romaji fade behavior specified

`romaji_fade` block: default visible at start; user modes
auto/always/off; auto rules hide item romaji at item reading state ≥
`supported` or for kana-only items once kana literacy is established,
keep below `supported`; reveal always available and counts as
support; `fade_is_not_removal`; never gates speaking/listening
progression or handwriting; romaji input allowed early but
reading/writing progression measured in Japanese script. Test
`romaji_fade_is_specified_and_never_gates`.

## Boundaries

Policy marked `provisional-pending-review`: ordering, kanji
selection, and fade thresholds are pedagogical hypotheses requiring
REVIEW-001 qualified review; not self-certified.

## Evidence

- `state/evidence/JA-RES-003/cargo-test-2026-10-02.txt` — 4 contract
  tests green.
- `state/evidence/JA-RES-003/ci-2026-10-02.txt` — full `./scripts/ci.sh`
  exit 0 ("CI OK") + handoff validator PASS (48 data files).
