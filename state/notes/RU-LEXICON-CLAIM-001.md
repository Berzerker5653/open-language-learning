# RU-LEXICON-CLAIM-001 — disposition of the 192 orphan RU lexicon rows

Follow-up to ORPHAN-CONTENT-001 (DONE at code `2b13a7b`, evidence `7420fa0`, ledger
`0a0e3b7` — do NOT re-verify that card). That card made the omission SAFE by
construction: in a pack that declares a goal ladder, a lexicon row no unit activity
references is NEW-ineligible (fail-CLOSED since `a731028`). Lookup and word cards still
reach the rows; they just never seed plans. This card produces the DISPOSITION the
parent deferred (`state/notes/ORPHAN-CONTENT-001.md` §3): every one of the 192 ids ends
in exactly one column — CLAIMED (attached to a band unit, becomes NEW-eligible) or
DICTIONARY-WEIGHT (recorded permanent decision). Id census:
`state/evidence/ORPHAN-CONTENT-001/orphan-ids.json` (`orphan_lexicon_ids`).

## Scope guard (what this card must NOT do)

- No lexicon TEXT, GLOSS, reading or audio change. Claims are pure `content_ref`
  additions plus the `generation_contract.allowed_vocab` rows the pack-build validator
  demands (banked pitfall from RU-SENTENCE-CLAIM-001: a content_ref outside
  allowed_vocab fails the pack BUILD validator, which `cargo test -p lts-langpack`
  alone never runs — run a desktop pack-build test).
- No engine code. The ladder rule already does the gating.
- No published-pack touch, no republish.

## Disposition rule (agent-decided per the owner content directive 2026-11-19; reversible)

**All 192 rows are CLAIMED into band-matched units; none are kept as dictionary
weight.** Measurement made the choice mechanical:

1. **33 topic groups (121 rows)** — every orphan row's topic group ALREADY has a unit
   family claiming sibling rows of the same group (e.g. `housing` orphans ↔ the ten
   `ru.unit.b1.housing-problems-*` units that each claim five `ru.lex.housing.*` rows;
   `argue*`/`critical*`/`synthesis*` ↔ their b2 families; `pastevents` ↔
   `a2.past-events-*`). The orphans are plainly rows the content campaigns created but
   forgot to attach. Each group's orphans are distributed round-robin over its family's
   units (sorted order, deterministic), one new `encounter-read` vocab activity per
   (unit, group): `ru.activity.<band>.lexclaim-<group>`.
2. **56 `stories202611` story words** — lemma-matched (pymorphy3 over stress-stripped
   story sentence text) to the story that introduced each word; every word resolves to
   exactly one story. Each word rides the host unit that RU-SENTENCE-CLAIM-001 gave its
   story (activity `ru.activity.<band>.story-words-<series>`), so word and story share
   one band and one ladder position — exactly the card's "ride their stories' bands'
   units" instruction.
3. **15 `nature` words** (лес, река, солнце …) — the group has no claiming family
   anywhere in the pack, but the cp story `ru.story.cp.walk-in-the-forest` (host unit
   `ru.unit.a1.routines-10`, band cp → a1) is the pack's nature unit: six of the fifteen
   lemmas appear in that story's sentences, and the other nine are same-register
   concrete nature nouns. Whole group claimed into `ru.unit.a1.routines-10` as
   `ru.activity.a1.story-words-walk-in-the-forest`.

Dictionary-weight column: EMPTY. Rationale: fail-CLOSED already makes unclaimed rows
harmless, so the only reason to keep a row unclaimed is "no band unit fits" — the
measurement shows a fitting family for every group. Reversible: any activity below can
be deleted to return its words to dictionary weight.

## Acceptance recipe

- Re-measure the lexicon orphan census with the remeasure tool (same method as the
  engine's `claimed_by_units`): expect 4071 rows, 4071 claimed, 0 orphans; every one of
  the 192 ids in exactly one disposition column of
  `state/evidence/RU-LEXICON-CLAIM-001/claim-map.json`.
- `cargo test -p lts-langpack` green; `tools/qa_stories.py` green (repo venv);
  desktop pack-build/install test green (allowed_vocab validator); fmt.
- Live band read (lts-serve harness, reuse
  `state/evidence/RU-SENTENCE-CLAIM-001/acceptance-band-read.py` shape): a claimed word
  seeds plan-eligibly for its band profile (B1 profile sees an unencountered claimed B1
  word in the NEW pool), and the level-0 plan stays free of the newly claimed B1+/A2+
  ids.
- Gates + census under `state/evidence/RU-LEXICON-CLAIM-001/`.

## Race note

Same unit yaml files as RU-SENTENCE-CLAIM-001, which is now committed (`3ea574b`) —
this card grafts onto that HEAD; activities and allowed_vocab appends coexist.
