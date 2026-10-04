# Kit Test Results

Procedure: see `README.md`. Every candidate is scored by `score.sh`
(validate / lint / audit-curriculum / audit-sources / audit-licenses /
test / build). The strict bar is lint = 0 errors **and 0 warnings**.

## Runs

| Date       | Candidate                                                                                                                      | Result                                               | Notes                                                                                                                                                                                                               |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-10-04 | `self-test` (`tools/pack-templates/example-pack`)                                                                              | 7/7 PASS                                             | proves the harness itself works                                                                                                                                                                                     |
| 2026-10-04 | `calibration-self` (`candidates/calibration-self/`)                                                                            | 7/7 PASS                                             | self-authored German pack scored with the kit; proves `BRIEF.md` is achievable as written                                                                                                                           |
| 2026-10-04 | `ru-starter` (`candidates/ru-starter/`) — external LLM (GPT-6 Astra Pro), Russian `ru-RU`                                      | 18 errors first pass → 7/7 PASS after mechanical fix | only failures: schema-forbidden `status`/`sources` on goals/units/activities/assessments — invited by brief rules 3+5 wording (fixed). Russian content itself accurate; no language corrections needed              |
| 2026-10-04 | `russian-starter-v2` (`candidates/russian-starter-v2/`) — external LLM (GPT-6 Astra Pro), Russian `ru-RU`, **corrected brief** | **7/7 PASS first try**                               | zero errors, zero warnings, no fixes needed. Confirms the brief fixes closed the run-1 defects. Russian content accurate (see below)                                                                                |
| 2026-10-04 | `gemini-v2` (`candidates/gemini-v2/`) — external LLM (Gemini), Russian `ru-RU`, **corrected brief**                            | **7/7 PASS first try**                               | text response parsed by `parse_response.py`; zero errors/warnings. Copied one latent contradiction from the worked example (dictation activity + `listening: false`) — kit fixed (rule 9). Russian content accurate |

## Calibration findings (brief gaps found and fixed)

Scoring the first calibration draft surfaced exactly the schema traps an
external LLM would also hit. `BRIEF.md` was amended:

1. **Goal `prerequisites` are records, not ids** —
   `{target, dimension, required_state, strength}`. The worked example only
   showed `prerequisites: []`. Added a _Schema notes_ section with the full
   record shape and the `dimension` / `required_state` / `strength` enums.
2. **Assessment `kind` enum** is `recognition | recall | production |
interaction | transfer` — "cloze" is not a kind (cloze lives in unit
   activities). Documented in _Schema notes_.
3. **Assessment `modality` enum** `listening | speaking | reading | writing |
interaction` documented.
4. **`generation` provenance scope**: hard rule 4 demanded it on "every
   content record", but the schema allows it only on goals, grammar concepts,
   lexicon entries and sentences (not assessments/units), and the worked
   example omitted it entirely — contradicting "mirror its shapes exactly".
   Fixed both ways: `tools/pack-templates/example-pack/` now carries
   `generation` on all four record types (re-scored 7/7 PASS, `lts-langpack-cli`
   suite green), and rule 4 states the exact scope.

## Intended strictness (not a bug)

- `audit-sources` warns on original-content source entries without a URL and
  `lint` fails on warnings, so the brief mandates the example's URL pattern
  (a repo URL for original content). External LLMs must copy that shape.

## External LLM run: ru-starter (2026-10-04)

Source: `ru-starter-pack.zip` from the owner's external LLM test (model
self-reported "GPT-6 Astra Pro"). First pass: 18 schema errors, all one
class — `status`/`sources` fields on record types whose schemas forbid
them. Root cause was the brief, not the LLM:

1. **Rule 3 said "every content record uses `"status": "draft"`"** — but
   `status` exists only on lexicon/concept/sentence records; goals and
   assessments use `review_status`; units/activities have no status field.
   Rule rewritten to state per-type scope.
2. **Rule 5 said "every content record cites `sources:`"** — same problem;
   units/activities/assessments have no `sources` field. Rule rewritten.
3. **Prettier re-wrapped the brief's JSONL examples into multi-line
   JSON** (contradicting "one JSON object per line"). Prettier formats
   ` ```json ` AND ` ```jsonl ` fences; only ` ```text ` is left verbatim.
   Examples now live in ` ```text ` fences and stay single-line through
   `pnpm fmt` (verified prettier-stable).

After removing the forbidden fields (mechanical, no language judgment),
7/7 PASS. Content review (my read; NOT a substitute for qualified human
review — everything stays `draft`):

- All Russian forms correct: Добрый день, Спасибо, Пожалуйста, это, дом,
  стол, книга, мой/моя, наш/наша, чай, вода.
- Grammar explanations accurate: zero copula with Это; possessive agrees
  with the noun's gender, not the owner's; explicit out-of-scope notes
  (neuter/plural/oblique cases excluded) — good scoping discipline.
- `prohibited_ambiguity` correctly fences пожалуйста to the
  reply-to-thanks sense (its request sense is the classic learner trap).
- Multi-form entries (мой + моя as secondary form) handled well.
- Provenance honest: generation blocks on all four record types, single
  original source entry, all statuses draft.
- Flag for human review: «Добрый день» glossed "Good afternoon!" —
  plausible, but the day-part boundary is a native-speaker judgment.

Verdict: the kit's calibration fixes (prerequisite records, enums) held —
the external LLM got those right first try. Remaining brief defects were
mine, now fixed.

## Kit re-validation before external re-run (2026-10-04)

Static audit of the corrected brief (automated dry-run unavailable in
this environment: no completion tiers or subagent model configured):

- 37 claims in the brief checked against `schemas/v0.2/*` programmatically
  (status/review_status/generation/sources per record type, all enums,
  id pattern, manifest capabilities). All consistent; the single
  intentional delta: the brief REQUIRES `generation_contract` on units
  while the schema leaves it optional (brief is stricter — by design).
- All 9 worked-example blocks in the brief are semantically identical to
  `tools/pack-templates/example-pack/`, which scores 7/7.
- Brief is prettier-stable (JSONL examples in ` ```text ` fences).
- Target language block pre-filled Russian (`ru-RU`) for the re-run.

## Corrected-brief re-run #1: russian-starter-v2 (2026-10-04)

Same model as run 1 (GPT-6 Astra Pro), corrected brief, delivered as a
zip. **7/7 PASS on the first pass — no mechanical fixes required.** The
run-1 failure class (schema-forbidden `status`/`sources`) is gone: units,
activities and assessments carry no status/sources fields; goals and
assessments use `review_status`. The corrected rules 3+5 did their job.

Content review (my read; NOT a substitute for qualified human review —
everything stays `draft`):

- All Russian forms correct: доброе утро, добрый день, добрый вечер, до
  свидания, это, книга, стол, стул, да, нет, ручка, карандаш.
- Grammar accurate and well-scoped: neuter утро→доброе vs masculine
  день/вечер→добрый agreement; zero copula with Это; yes/no questions by
  question mark with да/нет one-word answers. Explicit out-of-scope notes
  (no negated questions, no existence constructions, no spoken-intonation
  inference).
- `prohibited_ambiguity` pedagogically careful: ручка = writing pen not
  handle; supply object identity in English rather than force guessing;
  written-only questions.
- `new_item_budget: 6` matches the summary's item count (4 lex + 1 sent +
  1 grammar) — internally consistent.
- Prerequisite records use valid dimension/state/strength and a sensible
  progression (greetings → identify → yes/no questions).

Verdict: corrected brief yields a clean first-pass pack from this model.
Awaiting the second model for the cross-model consistency check.

## Corrected-brief re-run #2: gemini-v2 + cross-model comparison (2026-10-04)

Second model (self-reported "Gemini"), same corrected brief, Russian
`ru-RU`. Delivered as a chat text response (it even refused the owner's
requests to produce a zip, correctly citing the brief's output-format
rule). `parse_response.py` reconstructed all 12 files; **7/7 PASS on the
first pass.**

Content review (my read; NOT a substitute for qualified human review —
everything stays `draft`):

- All Russian forms correct: привет, как дела, здравствуйте, пока, доброе
  утро, спасибо, пожалуйста, я, ты, это, кофе, чай, да, нет.
- Grammar accurate: T-V distinction (ты/вы), omitted present copula
  (Это кофе), gender intro (утро neuter → доброе).
- Flags for human review: `это` glossed "this is" (loose — it is "this",
  used identificationally); пожалуйста carries both the request and
  reply-to-thanks senses in one entry with an empty
  `prohibited_ambiguity` — the exact trap the ru-starter run fenced.

**Cross-model consistency (the point of the two-model run):** shapes
match. Both packs: 12 files, same layout (3 units, 2 lexicon shards, one
each of grammar/sentences/assessments/sources/licenses); `status` only on
lexicon/concepts/sentences; `review_status` on goals/assessments;
`generation` on all four record types; `sources` on goals/lexicon/
concepts/sentences and nowhere else; identical source/license/rubric
shapes; all-draft statuses; valid enums throughout. Content legitimately
differs (topics, examples). Pedagogical depth differs — GPT-6 produced
prerequisite records, 6 assessments (recognition+production per goal) and
substantive `prohibited_ambiguity`; Gemini left all prerequisites `[]`,
one assessment per goal, empty ambiguity fences, and 6 unreferenced
lexicon entries. All schema-legal; the gates grade structure, not
pedagogy — human review still owns quality.

**Latent kit defect found by the diff:** Gemini faithfully copied the
worked example's contradiction — a `dictation`/`listening` activity while
the manifest declared `listening: false`. No gate cross-checks activity
modality against manifest capabilities (validator gap, noted for the
Rust side). Kit fixed: example-pack manifest now declares `listening:
true` (re-scored 7/7), brief gained hard rule 9 (honest capabilities),
and all 9 worked-example blocks re-verified semantically identical to the
example pack. `gemini-v2` stays as delivered — the contradiction was the
kit's, not the model's.

**Verdict: success criterion met.** With the corrected brief, two
different models (GPT-6 Astra Pro, Gemini) both produce 7/7 first-pass
packs with matching shapes — the brief, not the model, is doing the work.

## Kit v2: script on-ramp + full-kit protocol (2026-10-04)

Owner direction: assume learners know NOTHING about the target language
(alphabet first), and let one chat produce all bands, not just a starter.

- **Hard rule 10 (script on-ramp):** non-Latin targets MUST ship
  `language/orthography.yaml` + `orthography/<script>.jsonl` (one record
  per symbol, `teaching_order`/`mnemonic`), a script-teaching on-ramp
  goal, and a symbol-drill unit (`exact-match`, `new_item_budget: 0`);
  script-reading goals get an `orthography-recognition` prerequisite on
  the script goal. Mirrors the proven ja-JP shape (`000` greeting →
  `010`-`015` kana → `020`+ vocabulary).
- **Mode B (full-kit protocol):** Phase 0 emits `CURRICULUM_PLAN.yaml`
  (bands, goal can-dos, numbered unit syllabus, per-band word budgets,
  grammar inventory) for human approval BEFORE any pack file; then
  skeleton+on-ramp, then one band per response, re-emitting touched
  files whole, never deleting delivered ids. `score.sh` after every
  batch. Word budgets (A1 ≈ 500 … B2 ≈ 4,000 cumulative) are marked
  planning estimates, not research claims.
- `parse_response.py` routes `CURRICULUM_PLAN.yaml` to `plans/<label>.yaml`
  (never scored); repeated parses with the same label merge batches.
- Verified: 16 new claims checked against `schemas/v0.2/*` (orthography
  required/optional fields, direction enum, layout recognition,
  `orthography-recognition` dimension, `exact-match` method, band enum,
  `framework_refs`) — all consistent; 9 worked-example blocks still
  identical to the example pack; parser plan-routing smoke-tested.

Not yet re-run against external models: the two-model agreement was
proven for Mode A pre-v2; a fresh round (and a Mode B dry run) is owed
after this contract change.

## Mode B dry run #1: external plan rejected by capacity math (2026-10-04)

Owner fed the v2 brief to an external model; Phase 0 returned
`plans/ru-fullkit-v0.yaml` (10 goals, 10 units, budgets 50→4,000,
33 Cyrillic symbols). Owner's question: why gate the plan past a human
who cannot judge Russian? Correct objection — the gate was never
supposed to be pedagogy judgment. Kit fixed accordingly:

- New `validate_plan.py`: mechanically checks band order, id grammar,
  unit numbering, goal↔unit coverage, shard sanity, and the capacity
  math implied by hard rule 8 (`units × 6 ≥ promised new items`).
  The human now confirms SCOPE only (bands, effort); pedagogy stays
  under qualified human review (everything remains `draft`).
- The dry-run plan FAILS: 10 units carry at most 60 items but promise
  4,033; on-ramp alone needs ≥14 units, A1 ≥75, full B2 kit hundreds.
  Also mis-sharded `orthography.jsonl` under lexicon. Saved as
  `plans/ru-fullkit-v0.yaml` for the record.
- Protocol fix: "one band per response" was impossible — replaced with
  capacity-bounded batches (≤10 units per response; a band spans as
  many responses as its budget requires). Phase 1 likewise capped.
  Checker smoke-tested both ways (rejects v0, accepts a valid
  on-ramp-only plan).
