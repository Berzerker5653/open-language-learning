# JA-B1-003-JOURNEYS-001 — band metrics BEFORE (measured 2026-11-20, HEAD 4f0e728)

Measurement script was run inline (yaml walk of `languages/ja-JP/curriculum/goals.yaml`
band `B1` + `curriculum/units/*.yaml`); numbers below are program-enumerated, not
transcribed from the parent card.

## Whole legacy B1 band (units whose goal is a B1 band goal, excluding the 82x increment units)

- legacy B1 units: 195 across 13 legacy goals
- activities at `support_level: 5`: 195 (one per legacy unit; parent card measured 197
  including the 2 level-5 activities inside the reviewed-clean 820-822 increment — those
  are left untouched)
- generation contracts citing ONLY `ja.grammar.particle.object-wo`: 155 / 195 (matches card)
- units declaring `task_sequence`: 0

## Per-goal (legacy units only)

| goal | units | acts | task_seq | wo-only contracts | lv5 |
| --- | --- | --- | --- | --- | --- |
| work-professional (220-234) | 15 | 90 | 0 | 12 | 15 |
| media-news | 15 | 90 | 0 | 11 | 15 |
| storytelling | 15 | 90 | 0 | 12 | 15 |
| education-academic | 15 | 90 | 0 | 11 | 15 |
| technology | 15 | 90 | 0 | 13 | 15 |
| culture-tradition | 15 | 90 | 0 | 13 | 15 |
| society-rules | 15 | 90 | 0 | 11 | 15 |
| environment | 15 | 90 | 0 | 13 | 15 |
| travel-extended | 15 | 90 | 0 | 11 | 15 |
| emotions-personality | 15 | 90 | 0 | 12 | 15 |
| advice-opinion | 15 | 90 | 0 | 12 | 15 |
| comparison-debate | 15 | 90 | 0 | 12 | 15 |
| health-wellness | 15 | 90 | 0 | 12 | 15 |

(work-professional, media-news, storytelling include the modern 820-826 units in the
per-goal totals quoted in the census; the table row above counts legacy units only.)

## Scope of this run

Highest-traffic goal: `ja.goal.b1.work-professional` (18 units / 102 activities with its
clean modern 820-822 family; the only legacy goal that already has a shipped reviewed-clean
journey family to anchor house style). This run re-journeys units 220-234 and adds the
goal's gated revision unit 235. Remaining 12 legacy goals: resume recipe in
`state/notes/JA-B1-003-JOURNEYS-001.md`.

## Journey shape applied (decided for this card, mirrored into every unit's comment)

- `task_sequence` per ADR-0037 with roles that all have engine runners
  (`encounter-read` / `cloze+writing` / `recall+writing` / `listen-and-choose+listening`):
  input = own `-enc` (de-scaffolded 5→2), scaffolded = own `-cloze0`, independent = NEW
  own `-write` (recall/writing, support_level 0), transfer = the NEXT unit's
  `-listen` (context change proven by the two sentences every unit in this goal shares:
  `ja.sent.meeting-starts`, `ja.sent.reply-email`), reuse = the new revision unit
  `ja.unit.work-professional-revision` (235), which `requires_unit`-gates (state
  `supported`) on every unit 220-234 and reuses the shared pair.
- Units 221-234 gain a linear `requires_unit` gate on the predecessor unit (ADR-0022
  phase gate) so the transfer/reuse claims are honest ordering, not decoration.
- `generation_contract.allowed_grammar` re-set per unit to the concepts the unit's
  sentences actually contain (verified sentence-by-sentence against `sentences/*.jsonl`);
  the stale `ukemi-passive` / `keigo-soncho-intro` / `susume-continuity` cites on 225 /
  228 / 232 are dropped because no sentence in those units uses them.
- Audio-backed pairs untouched: every `listen-and-choose` stays at `support_level: 3`;
  only the translation-scaffold `encounter-read` (level 5) drops to 2, with the new
  independent `recall/writing` stage carrying the independent variant.
