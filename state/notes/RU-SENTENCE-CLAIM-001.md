# RU-SENTENCE-CLAIM-001 — claim the 161 orphan RU sentences into band-appropriate units

Follow-up to ORPHAN-CONTENT-001 (DONE at code `2b13a7b`, evidence `7420fa0`, ledger
`0a0e3b7` — do NOT re-verify that card). That card made the omission SAFE by
construction: in a pack that declares a goal ladder, a sentence no unit activity
references is NEW-ineligible (fail-CLOSED), and practice requires content to be MET
(referenced by an unlocked unit). This card makes the content USEFUL: every orphan
sentence gets a ladder position via pure `content_refs` additions.

Parent contract source: `state/notes/ORPHAN-CONTENT-001.md` §2 (band now, claim
deferred) and the id census in `state/evidence/ORPHAN-CONTENT-001/orphan-ids.json`
(161 sentences: a1 24, a2 27, b1 30, b2 40, cp 40).

## Scope guard (what this card must NOT do)

- No sentence TEXT or GLOSS change. A text change rides the shard sweep
  (`sentences/entries.jsonl` + `content-parity-*`/`journeys-*` + `cloze_targets`
  re-alignment in pack.rs verbatim checks) plus an audio re-bake — out of scope.
- No engine code. The ladder rule and the MET/practice gate already do the work.
- No media manifest change (all 161 already ship baked audio — measured 161/161
  present in `languages/ru-RU/media/manifest.jsonl`).
- No published-pack touch, no republish.

## Claim shape

One new activity per hosting unit, appended to the unit's existing `activities`
list; the activity's `content_refs` are the story's sentence ids (or, for the
loose content-parity leftovers, that unit's cluster). `type: encounter-read`,
`modality: reading`, `support_level: 1` — a story-encounter row, matching the
`encounter-read` style the journey units already use (`classify_type` → Encounter).
Activity ids: `ru.activity.<band>.story-<series>` and
`ru.activity.<band>.parity-<unit-slug>`; verified unique across the pack.
`generation_contract.allowed_vocab` is NOT extended: the generator contract bounds
what the pack may GENERATE for that unit, and this lane adds no generated text.

Machine-readable mapping: `state/evidence/RU-SENTENCE-CLAIM-001/claim-map.json`.

## Band decision (agent-decided per the owner content directive 2026-11-19; reversible)

**Every sentence is claimed into a unit whose goal band equals the sentence's own
band tag** — `cp` sentences into A1 units, because the pack's own tooling already
equates them (`tools/qa_stories.py` maps the `cp` band to a1 for budget purposes).

Deviation from the parent card's wording ("claim the 24 a1 orphan story sentences
into on-ramp units"): NOT done, deliberately. Putting A1-tagged stories into
on-ramp units (goal `ru.goal.on-ramp.*`, no prerequisites) would place them in the
day-0 NEW pool and make them practice-MET for a learner who has done nothing.
`apps/desktop/src-tauri/src/lib.rs` (PRACTICE-GATE-001 preamble) records exactly
that incident — «Я учу русский язык.» (`ru.sent.cp.p01`) served to a day-0 learner
with no encounter path. Band-consistent placement keeps the stories as the first
reading payoff AFTER the on-ramp ladder unlocks, which is what the stories were
written for. Story-derived on-ramp units are therefore not needed: every story
series has a topic-matched unit in its own band. If the owner later wants
day-0 stories, that is a reversible re-map of the same activities.

## Mapping

### a1 stories → a1 journey units (24)

| story | sentences | host unit |
| --- | --- | --- |
| ru.story.a1.kot-doma | 6 | ru.unit.a1.home-01 (Rooms) |
| ru.story.a1.moy-den | 6 | ru.unit.a1.routines-01 (Morning routine) |
| ru.story.a1.podarok-dlya-mamy | 6 | ru.unit.a1.shopping-09 (Gifts and extras) |
| ru.story.a1.shapka-v-parke | 6 | ru.unit.a1.city-10 (In the park) |

### a2 stories → a2.past-events (27: 4 series 26 + loose `ru.sent.a2.u116`)

| story | sentences | host unit |
| --- | --- | --- |
| ru.story.a2.avtobus-ne-prishol | 7 | ru.unit.a2.past-events-01 (Yesterday) |
| ru.story.a2.sosed-s-gitarioy | 6 | ru.unit.a2.past-events-03 (Work and meeting) |
| ru.story.a2.telefon-v-taksi | 7 | ru.unit.a2.past-events-05 (When did you come?) |
| ru.story.a2.rybalka-zimoy | 6 | ru.unit.a2.past-events-10 (Trips and weekends) |
| loose ru.sent.a2.u116 | 1 | the unit that claims its shard neighbours (journeys-2026-10-14) |

### b1 stories → b1.narration (30)

| story | sentences | host unit |
| --- | --- | --- |
| ru.story.b1.kluch-ot-dachi | 8 | ru.unit.b1.narration-sequence-01 (Sequence) |
| ru.story.b1.pismo-ne-temu | 7 | ru.unit.b1.narration-sequence-02 (It happened) |
| ru.story.b1.internet-v-derevne | 7 | ru.unit.b1.narration-sequence-09 (Places) |
| ru.story.b1.noch-v-poezde | 8 | ru.unit.b1.narration-sequence-08 (Telling) |

### b2 stories → b2 band (40)

| story | sentences | host unit |
| --- | --- | --- |
| ru.story.b2.aukcion-odnoy-kartiny | 8 | ru.unit.b2.lit-01 (culture-perspectives: Narrative) |
| ru.story.b2.dva-bileta-v-odin-teatr | 8 | ru.unit.b2.neg-01 (negotiation: Refusing) |
| ru.story.b2.gorod-bez-karty | 8 | ru.unit.b2.soc-01 (society-policy: Government services) |
| ru.story.b2.perevodchik-vse-pereputal | 8 | ru.unit.b2.lex-03 (style-register: Polysemy — frozen prices vs frozen berries) |
| ru.story.b2.spor-o-budushchem | 8 | ru.unit.b2.argue-03 (argumentation: Debate) |

### cp sentences → a1 band (40)

Three cp stories are claimed whole: `at-the-market` → ru.unit.a1.shopping-01 (In
the shop), `morning-of-anna` → ru.unit.a1.routines-01 (Morning routine),
`walk-in-the-forest` → ru.unit.a1.routines-10 (Rest and walks). The 24 cp
sentences no cp story references are grouped by topic into one `parity-*`
activity each: personal-details-01 (p01), personal-details-03 (p03),
personal-details-07 (p02), basic-messages-01 (p13), basic-messages-05 (p04),
routines-01 (p07 p08), routines-02 (p40), routines-03 (p15), routines-04 (p05),
routines-05 (p12), home-01 (p14 p30 p32), food-01 (p18), food-02 (p16 p33 p38),
food-05 (p19), time-plans-05 (p22 p23 p24 p25), routines-10 (p31).

## Acceptance

1. Every one of the 161 ids appears in >=1 unit activity `content_refs`
   (re-measured census → 0 sentence orphans; per-band counts recorded).
2. `cargo test -p lts-langpack` green (unit schema + reference resolution over the
   dev pack).
3. `.venv/bin/python tools/qa_stories.py --pack languages/ru-RU` green (unchanged
   story text; refs/dupes/cloze-verbatim still clean).
4. Claimed rows pass the ladder gate: `scripts/orphan-content-acceptance.py`-style
   live read on a fresh profile shows claimed sentences seeding for a band-matched
   profile (a1 plan for a learner with the on-ramp done shows story material), and
   `cargo test -p lts-desktop unclaimed_contrast_and_sentence_rows_are_not_seeded`
   stays green.
5. `cargo fmt --all --check`, `cargo clippy -p lts-desktop --all-targets -D
   warnings` (engine untouched → expected unchanged), validate_handoff with
   explicit ledger records.
6. `tools/audit_content_templates.py` + `tools/audit_learner_copy.py` (content
   lane) — no new learner-facing prose is added, so both must stay green.

## STATUS — SHIPPED 2026-11-22 (do not re-run the apply scripts)

Content commit `3ea574b`, card-open commit `d0f16a6`. Sentence orphan census after the
claim: **0** (was 161) — `state/evidence/RU-SENTENCE-CLAIM-001/orphan-census-after.json`.
Re-running `apply_claims.py --apply` would duplicate activities; the only idempotent
script is `sync_allowed_vocab.py`.

Correction to the contract above: the claims DO also extend each hosting unit's
`generation_contract.allowed_vocab`. The pack BUILD validator refuses a unit that
references content outside its generation contract (measured: 161 errors, first one
`"ru.sent.cp.p01" is used by the unit but not in the generation contract`), and that
validator is NOT exercised by `cargo test -p lts-langpack` — it fires in the desktop
pack-install path. Content lanes must therefore run a desktop pack-build test, not
only the langpack suite. `sync_allowed_vocab.py` applies the 161 vocab rows idempotently.

## Resume recipe (if this card dies mid-flight)

1. `git status --short` — if `languages/ru-RU/curriculum/units/*.yaml` are dirty,
   the claim application already ran; do NOT re-run the apply script blindly
   (re-appending duplicates activities). Check for `story-`/`parity-` activity ids
   with `grep -rn "story-\|parity-" languages/ru-RU/curriculum/units | head`.
2. Re-measure orphans with the census snippet in `state/evidence/RU-SENTENCE-CLAIM-001/remeasure.py`.
3. Run gates 2/3/4 above; then ledger commit.
