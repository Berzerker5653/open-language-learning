# ORPHAN-CONTENT-001 — band/claim unclaimed phonology, sentences, and orphan RU lexicon entries

Follow-up to SESSION-SEQUENCE-001-TAKEOVER (t_426b4251; decision trail in
state/notes/SESSION-SEQUENCE-001.md RUN 122 + state/evidence/SESSION-SEQUENCE-001/takeover-acceptance-audit.md).
The takeover fail-CLOSED orphan gate covered only the LEXICON NEW-seeding stream. This card
closes the measured gaps on the owner level-0 plan.

## Measurements (dev tree languages/ru-RU, post ru 0.4.7 freeze — 2026-11-22)

| stream | rows | referenced by ≥1 unit activity | orphans |
| --- | --- | --- | --- |
| lexicon | 4071 | 3879 | **192** (card said 178 at 0.4.6; freeze added rows) |
| sentences | 945 | 784 | **161** (a1:24, a2:27, b1:30, b2:40, cp:40) |
| phonology contrasts | 8 | 0 | **8** (all) |

Full id lists: state/evidence/ORPHAN-CONTENT-001/orphan-ids.json.

## Decisions (agent-decided per owner content directive 2026-11-19; all reversible)

### 1. Phonology contrasts — CLAIM + BAND (both)
All 8 RU contrasts are legitimate beginner on-ramp material (minimal pairs over letters the
cyrillic units teach, stress homographs for the stress-review unit). They are claimed into
the on-ramp units that teach the relevant letters, via one new `listen-and-choose` listening
activity per hosting unit (pure content_ref addition — no text/audio change, so no re-bake;
unit goal `ru.goal.on-ramp.cyrillic` has no prerequisites, so claimed contrasts stay
day-0-eligible):

| contrast | letters | hosting unit (on-ramp) |
| --- | --- | --- |
| ru.contrast.voicing.dt (дом/том) | д/т | 013-cyrillic-b-p-d-g |
| ru.contrast.voicing.gk (год/кот) | г/к | 013-cyrillic-b-p-d-g |
| ru.contrast.voicing.bp (бить/пить) | б/п | 013-cyrillic-b-p-d-g |
| ru.contrast.palatalization.luk (лук/люк) | л/ю | 015-cyrillic-y-short-i-yo-yu |
| ru.contrast.voicing.zhsh (жить/шить) | ж/ш | 017-cyrillic-ts-ch-sh |
| ru.contrast.palatalization.brat (брат/брать) | ь | 018-cyrillic-shch-soft-hard |
| ru.contrast.stress.zamok (за́мок/замо́к) | stress | 019-cyrillic-stress-review |
| ru.contrast.stress.muka (му́ка/мука́) | stress | 019-cyrillic-stress-review |

And the CONTRAST stream gets the same fail-CLOSED ladder rule as the lexicon stream: in a
pack that declares a goal map, a contrast no unit references is NEW-ineligible. Claiming is
the fix for this pack; banding makes the next unclaimed contrast safe by construction.

### 2. Sentences — BAND now, claim deferred
The SENTENCE stream gets the same fail-CLOSED rule (pack with a goal map: sentences no unit
references are NEW-ineligible). Rationale: the acceptance bar for this card is "every plan
item derives from unit-attached content"; the exclusive goal-lock cannot see unclaimed rows,
so banding is the only construction that holds. The 161 orphans are dominated by story
sentences (kot-doma, moy-den, a2/b1/b2/cp story series): claiming them means attaching them
to band-appropriate units (and for a1 story sentences, possibly story-derived on-ramp units)
— that is a content-authoring campaign tracked as a follow-up card, not folded into this
lane. Story-mode reading/listening keeps working through the stories route regardless —
the gate covers plan NEW-seeding only. No sentence text/gloss changed, so no shard sweep
and no audio re-bake ride this card.

### 3. Lexicon orphans (192) — keep fail-CLOSED, claim deferred
Already NEW-ineligible since a731028; they stay as dictionary/pack weight — lookup and word
cards still reach them (those routes are not band-gated by design), they just never seed
plans. Group breakdown (orphan-ids.json): mostly B1+ domain vocabulary (argue/critical/
synthesis/housing/learning/nature…) plus 56 `stories202611` story words whose stories ship
without unit activities claiming them. Claiming = attaching them to their band's journey
units — deferred to a future vocab-claim card; the engine rule already makes the omission
safe.

## Engine rule shape (symmetric with SESSION-SEQUENCE-001)
`add_new_item_candidates`: one `claimed_by_units` set per pack (activities content_refs);
when `!goals.is_empty()`, the lexicon, contrast, and sentence streams each skip entries not
in that set. Packs without a goal map keep seeding raw (fixture escape hatch unchanged).

## Acceptance recipe
- Red-first test `unclaimed_contrast_and_sentence_rows_are_not_seeded` (synthetic appended
  rows + real orphan ids never seed; all 8 claimed RU contrasts DO seed for a zero-evidence
  profile — the content-claim guard).
- :17641-style live read on a fresh level-0 profile with the dev pack installed: every plan
  item's content_id ∈ unit-attached content_refs set; evidence under
  state/evidence/ORPHAN-CONTENT-001/.
- LANE gates: fmt; targeted desktop tests by name; clippy -p lts-desktop --all-targets
  -D warnings; content lanes also run `cargo test -p lts-langpack` + tools/audit_content_templates.py
  + tools/audit_learner_copy.py; validate_handoff green before push.

## Follow-ups to file
- RU-SENTENCE-CLAIM-001 (proposed): claim the 24 a1 orphan story sentences into on-ramp
  units and band-sweep the a2+/b1/b2/cp series into their journey units.
- RU-LEXICON-CLAIM-001 (proposed): attach the 192 orphan lexicon rows to band-appropriate
  units or accept them permanently as dictionary weight (record decision).
