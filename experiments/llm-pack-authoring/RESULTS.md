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

## Mode B dry run #2: v1 plan passes the checker (2026-10-04)

Same external model replanned after the v0 rejection:
`plans/ru-fullkit-v1.yaml` — 45 goals, 810 units (on-ramp 15, A1 90,
A2 90, B1 200, B2 400), cumulative budgets 60/540/600/1,200/2,400 new
items, 67 Cyrillic symbol records (33 upper + 33 lower + stress mark).
`validate_plan.py` rewritten to accept the plan's block shape (per-band
blocks with `lessons`/`files`, `cumulative_word_budget`, grammar
`concepts` maps, per-band `sentences.band_budgets`, orthography
`scripts[].total_symbol_records` + `teaching_order` sum check,
prerequisite-target existence, `unit_count` cross-check, block-aware
capacity math). **Result: plan OK, exit 0** (v0 still rejected).

Capacity is exactly at the cap in every band (e.g. A1: 90 units × 6 =
540 promised) — legal but zero slack: any unit that introduces 7 items
breaks the plan. Flagged for the model to keep 5 lex + 1
grammar-or-sentence per unit.

Content review of the plan (my read; NOT qualified human review):
Cyrillic teaching order is look-alike-first (А О М Т К Е Н С …), the
sound standard approach; Е/Ё and И/Й handled as distinct letters with
explicit notes; stress mark U+0301 treated as a teaching annotation,
not a letter — correct. Grammar staging (cases A1→B1, aspect A2/B1,
participles B1/B2) is conventional. Reading/writing-only scope is
honest vs capabilities. Cursive and audio explicitly deferred.

**Harness gap this plan exposed:** re-emitting whole 4,000-line JSONL
shards per batch is impossible (the plan's own `delivery_risk` said
so). `parse_response.py` now supports `### <path> (append)` blocks for
JSONL shards — appends only the new lines, rejects duplicate ids,
skips the block (preserving the shard) on violation; YAML files stay
whole-file. Smoke-tested: create → append → duplicate-rejected, shard
intact. Brief + README updated with the append convention.

Verdict: v1 plan needs no further adjustments; Phase 1 may start.

## Mode B Phase 1 batch: on-ramp delivered (2026-10-04)

External model's Phase 1 response (Russian on-ramp): 20 units (000-009
first words, 010-019 Cyrillic), 6 on-ramp goals, 67 symbol records, 50
lexicon + 7 sentences + 3 grammar concepts = exactly the 60 new items
the v1 plan promised for the band. Pasted as an attachment, which
truncated mid-record (last assessment `ru.assess.on-ramp.numbers-writing`
cut at `"kind":"p`) and stripped the `###`/fence markers — files were
transcribed manually into `candidates/ru-fullkit-v1/` instead of
`parse_response.py`.

Score: 6/7. The single failure chain is the truncated assessment
record (unresolved reference → lint warning → test/build fail).
Everything else green first pass: validate 0/0, all audits, build.

**Kit defect found:** the model wrote script-level `teaching_order` as
a list of symbol ids — the schema wants an INTEGER (script order among
the language's scripts, cf. ja-JP 0-3); per-symbol order lives in each
symbol record's own `teaching_order`. The brief's rule 10 never stated
the type. Fixed in the brief (explicit integer + "NOT a list of symbol
ids"); candidate fixed mechanically.

Protocol note: the model delivered 20 units in one response (Phase 1
cap is ≤10). It matched the plan's on-ramp block exactly and scored
clean, so the cap is a reliability guard, not a content gate — watch
it on bigger bands where response size actually bites.

Content review of the batch (my read; NOT qualified human review —
everything stays `draft`): letter names and mnemonics correct
(эм/тэ/ка/эн/эс/эр/вэ/ха/бэ/пэ/дэ/гэ/эль/зэ/жэ/и краткое/эф/цэ/че/ша/ща,
мягкий/твёрдый знак "no independent sound"); stress marks in all 50
readings correct (здра́вствуйте, спаси́бо, пожа́луйста, извини́те,
чита́йте, пиши́те, вы́берите, повтори́те, объясни́те, помоги́те,
четы́ре, во́семь, де́вять, …); T-V distinction fenced; ручка fenced to
the pen sense; это-identification "unchanged before feminine noun"
correct; commands fenced as fixed chunks, not imperative rules;
capabilities honest (no listening/speaking activities). Source URL is
`urn:uuid:…` — audit-sources accepts it (has a url), a new variant of
the original-source pattern; fine.

Pending: owner to resend the tail of the response (the
`numbers-writing` assessment record) as an append block or plain text;
then re-score for 7/7.

**Phase 1 closed: 7/7 (2026-10-04).** The model re-emitted the whole
pack (34 files, ~1,190 lines) instead of the requested single missing
record — the exact whole-file re-emission the `(append)` convention
exists to prevent; harmless here but it also re-emitted the invalid
`teaching_order` list (the model's chat still holds the pre-fix brief),
so the 12th assessment was appended manually and the orthography fix
kept. The recovered record is sound: «четыре/восемь/девять» soft-sign
spelling is exactly the on-ramp number trap. On-ramp band done: 6
goals, 20 units, 67 symbols, 50 lex, 7 sentences, 3 grammar, 12
assessments — all gates green.

## Takeover: agent authors the remaining bands (2026-10-04)

Owner directive: after the model's Phase 2 batch, the agent finishes
both kits (overnight-capable). Staged: `TAKEOVER_PLAN.md` (protocol +
definition of done), `BATCH_AUTHOR_GUIDE.md` (per-batch contract),
`PROGRESS.json` (resumable state — any session resumes from it).
Subagent delegation is unavailable in this environment (no model
configured for task agents), so batches are authored inline.

ja-JP: baseline re-scored **7/7** (`results/ja-JP-draft`). Extension
plan `plans/ja-fullkit-v1.yaml` authored and checker-approved: 54 new
goals, 740 new units (062-807), 3,789 new words (→ ~4,000 cumulative),
72 grammar concepts, 570 sentences; kanji staging +60/+150/+450/+1000
per band; capacity exact in every band. Authoring starts at 062-071.

ru-RU: A1 units 020-029 stay reserved for the external model's Phase
2; agent authoring resumes at 030 once that batch lands (goals.yaml is
single-writer).

## 2026-10-04 — ja-JP batch 1: A1 units 062-071 (transport)

Agent-authored in place: goal `ja.goal.a1.transport`, 10 units, 50-word
`lexicon/transport.jsonl` (kana-only forms), 3 grammar records
(`particle.de-means`, `verb.te-form-connect`, `particle.wo-traversal`),
7 sentences, 1 assessment (`ja.assess.transport`), 1 source
(`ai-drafted-extension`). Goal prerequisite mirrored in
`grammar/dependencies.yaml`. Score: **7/7** (`results/ja-JP-draft`).

## 2026-10-04 — ja-JP batch 2: A1 units 072-081 (health-basics)

Goal `ja.goal.a1.health-basics` (prereq transport, mirrored in
dependencies), 10 units, 50-word `lexicon/health.jsonl`, 5 grammar
(`verb.tai-desu`, `adjectives.na-attributive`, `particle.ni-destination`,
`verb.past-negative`, `counters.general`), 5 sentences, 1 assessment
(`ja.assess.health-basics`). Score: **7/7**.

## 2026-10-04 — ja-JP batch 3: A1 units 082-091 (free-time)

Goal `ja.goal.a1.free-time` (prereq health-basics, mirrored), 10 units,
50-word `lexicon/leisure.jsonl`, 5 grammar (`verb.te-form-sequence`,
`verb.ageru-kureru-morau`, `syntax.relative-clauses`, `time.expressions`,
`verb.experience-ta`), 5 sentences (2 initial ids collided with baseline
sentences; replaced with `watch-movie`/`listen-news`), 1 assessment.
Score: **7/7**. A1 grammar quota (12) now fully consumed.

## 2026-10-04 — ja-JP batch 4: A1 units 092-100 (home-life)

Goal `ja.goal.a1.home-life` (prereq free-time, mirrored), 9 units,
45-word `lexicon/home.jsonl`, 9 sentences (A1 grammar quota already
consumed), 1 assessment. Score: **7/7**.

## 2026-10-04 — ja-JP batch 5: A1 units 101-110 (work-school)

Goal `ja.goal.a1.work-school` (prereq home-life, mirrored), 10 units,
50-word `lexicon/work.jsonl` (suru-verb ids hyphenated to satisfy id
schema), 10 sentences (one collided with baseline `study-japanese`;
renamed to `study-everyday`), 1 assessment. Score: **7/7**.

## 2026-10-04 — ja-JP batch 6: A1 units 111-118 (past-stories) — A1 BAND COMPLETE

Goal `ja.goal.a1.past-stories` (prereq work-school, mirrored), 8 units,
40-word `lexicon/narrative.jsonl`, 8 sentences, 1 assessment. Score:
**7/7**. A1 extension complete: 57 units (062-118), 6 goals, 280 new
words, 12 grammar, 44 sentences, 6 assessments. Next: A2 120-219.

## 2026-10-04 — ja-JP batch 7: A2 units 120-129 (city-services)

Goal `ja.goal.a2.city-services` (prereq a1.past-stories, mirrored), 10
units, 50-word `lexicon/city.jsonl`, 2 grammar (`verb.te-ichidan`,
`verb.nakereba-naranai`), 8 sentences, 1 assessment. Score: **7/7**.

## 2026-10-04 — ja-JP batch 8: A2 units 130-139 (food-cooking)

Goal `ja.goal.a2.food-cooking` (prereq city-services, mirrored), 10
units, 50-word `lexicon/food.jsonl`, 2 grammar (`verb.to-omou`,
`verb.koto-no-noun`), 6 sentences, 1 assessment. Score: **7/7**.

## 2026-10-04 — ja-JP batch 9: A2 units 140-149 (shopping-services)

Goal `ja.goal.a2.shopping-services` (prereq food-cooking, mirrored), 10
units, 50-word `lexicon/shopping.jsonl` (apostrophe ids fixed to hyphens;
baseline dupes replaced), 2 grammar (`verb.kanoukei-intro`,
`adjectives.jouzu-heta-ni`), 8 sentences (1 collided with baseline
`how-much`; reused baseline), 1 assessment. Score: **7/7**.

## 2026-10-04 — ja-JP batch 10: A2 units 150-159 (health-body)

Goal `ja.goal.a2.health-body` (prereq shopping-services, mirrored), 10
units, 50-word `lexicon/body.jsonl`, 1 grammar (`verb.ba-conditional`),
8 sentences, 1 assessment. Score: **7/7**.

## 2026-10-04 — ja-JP batch 11: A2 units 160-169 (communication)

Goal `ja.goal.a2.communication` (prereq health-body, mirrored), 10
units, 50-word `lexicon/communication.jsonl`, 2 grammar
(`verb.tara-conditional`, `conjunction.node-reason`), 8 sentences,
1 assessment. Score: **7/7**.

## 2026-10-04 — ja-JP batch 12: A2 units 170-179 (weather-seasons)

Goal `ja.goal.a2.weather-seasons` (prereq communication, mirrored), 10
units, 50-word `lexicon/weather2.jsonl` (initial write clobbered baseline
`weather.jsonl`; restored from git, shard renamed), 1 grammar
(`conjunction.noni-contrast`), 9 sentences, 1 assessment. Score: **7/7**.

## 2026-10-04 — ja-JP batch 13: A2 units 180-189 (entertainment)

Goal `ja.goal.a2.entertainment` (prereq weather-seasons, mirrored), 10
units, 50-word `lexicon/entertainment.jsonl`, 2 grammar
(`verb.you-ni-suru`, `verb.hajimeru-owaru`), 8 sentences, 1 assessment.
Score: **7/7**.

## 2026-10-04 — ja-JP batch 14: A2 units 190-199 (sports-fitness)

Goal `ja.goal.a2.sports-fitness` (prereq entertainment, mirrored), 10
units, 50-word `lexicon/sports.jsonl`, 1 grammar
(`quotative.to-itta-koto`), 9 sentences, 1 assessment. Score: **7/7**.

## 2026-10-04 — ja-JP batch 15: A2 units 200-209 (relationships)

Goal `ja.goal.a2.relationships` (prereq sports-fitness, mirrored), 10
units, 50-word `lexicon/relationships.jsonl`, 1 grammar
(`particle.youni-versus-to`), 9 sentences, 1 assessment. Score: **7/7**.

## 2026-10-04 — ja-JP batch 16: A2 units 210-219 (daily-admin) — A2 BAND COMPLETE

Goal `ja.goal.a2.daily-admin` (prereq relationships, mirrored), 10
units, 50-word `lexicon/admin.jsonl`, 10 sentences (A2 grammar quota
consumed), 1 assessment. Score: **7/7**. A2 extension complete: 100
units (120-219), 10 goals, 500 new words, 15 grammar, 80 sentences,
10 assessments. Next: B1 220-414.

## 2026-10-04 — ja-JP batch 17: B1 units 220-229 (work-professional part 1)

Goal `ja.goal.b1.work-professional` (prereq daily-admin, mirrored;
spans 220-234), 10 units, 50-word `lexicon/work2.jsonl`, 2 grammar
(`b1.ukemi-passive`, `b1.keigo-soncho-intro`), 8 sentences, 1
assessment. Score: **7/7**.

## 2026-10-04 — ja-JP batch 18: B1 units 230-239 (work-professional part 2 + education-academic part 1)

Goals `ja.goal.b1.work-professional` (complete, 220-234) and
`ja.goal.b1.education-academic` (prereq work-professional, mirrored;
spans 235-249), 10 units, 50-word `lexicon/edu.jsonl`, 3 grammar
(`b1.susume-continuity`, `b1.to-iu-toka`, `b1.you-form-volitional`), 8
sentences, 1 assessment. Score: **7/7**.

## 2026-10-04 — ja-JP batch 19: B1 units 240-249 (education-academic part 2 — goal complete)

Goal `ja.goal.b1.education-academic` complete (235-249), 10 units,
50-word `lexicon/edu2.jsonl`, 2 grammar (`b1.kedo-keredo`,
`b1.rashii-sou-youda`), 8 sentences. Score: **7/7**.

## 2026-10-04 — ja-JP batch 20: B1 units 250-259 (media-news part 1)

Goal `ja.goal.b1.media-news` (prereq education-academic, mirrored;
spans 250-264), 10 units, 50-word `lexicon/media.jsonl`, 2 grammar
(`b1.node-versus-kara`, `b1.zu-ni-de`), 8 sentences, 1 assessment.
Score: **7/7**.

## 2026-10-04 — ja-JP batch 21: B1 units 260-269 (media-news complete + technology start)

Goals `ja.goal.b1.media-news` (complete, 250-264) and
`ja.goal.b1.technology` (prereq media-news, mirrored; spans 265-279),
10 units, 25-word `lexicon/media2.jsonl` + 25-word `lexicon/tech.jsonl`,
2 grammar (`b1.shieki-causative`, `b1.kanoukei-expansion`), 8
sentences, 1 assessment. Score: **7/7**.

## 2026-10-04 — ja-JP batch 22: B1 units 270-279 (technology goal complete)

Goal `ja.goal.b1.technology` complete (265-279), 10 units, 50-word
`lexicon/tech2.jsonl`, 2 grammar (`b1.onaji-chigai`,
`b1.te-iku-te-kuru`), 8 sentences. Score: **7/7**.

## 2026-10-04 — ja-JP batch 23: B1 units 280-289 (culture-tradition part 1)

Goal `ja.goal.b1.culture-tradition` (prereq technology, mirrored;
spans 280-294), 10 units, 50-word `lexicon/culture.jsonl`, 2 grammar
(`b1.maeni-ato-de`, `b1.ba-formal`), 8 sentences, 1 assessment.
Score: **7/7**.

## 2026-10-04 — ja-JP batch 24: B1 units 290-299 (culture-tradition complete + society-rules start)

Goals `ja.goal.b1.culture-tradition` (complete, 280-294) and
`ja.goal.b1.society-rules` (prereq culture-tradition, mirrored; spans
295-309), 10 units, 25-word `lexicon/culture2.jsonl` + 25-word
`lexicon/society.jsonl`, 2 grammar (`b1.ukemi-indirect`,
`b1.dake-bakari-shika`), 9 sentences, 1 assessment. Score: **7/7**.

## 2026-10-04 — ja-JP batch 25: B1 units 300-309 (society-rules goal complete)

Goal `ja.goal.b1.society-rules` complete (295-309), 10 units, 50-word
`lexicon/society2.jsonl`, 2 grammar (`b1.azu-ni`,
`b1.toba-conditional`), 8 sentences. Score: **7/7**.

## 2026-10-04 — ja-JP batch 26: B1 units 310-319 (environment part 1)

Goal `ja.goal.b1.environment` (prereq society-rules, mirrored; spans
310-324), 10 units, 50-word `lexicon/env.jsonl`, 2 grammar
(`b1.shieki-ukemi`, `b1.ni-yotte`), 8 sentences, 1 assessment.
Score: **7/7**.

## 2026-10-04 — ja-JP batch 27: B1 units 320-329 (environment complete, travel-extended start)

Goal `ja.goal.b1.environment` complete (310-324). Goal
`ja.goal.b1.travel-extended` (prereq environment, mirrored; spans
325-339) started, 5 units. 10 units, 50 words split across
`lexicon/env2.jsonl` + `lexicon/travel.jsonl`, 2 grammar
(`b1.nai-u-de`, `b1.toi-toka`), 8 sentences, 1 assessment.
Score: **7/7**.

## 2026-10-04 — ja-JP batch 28: B1 units 330-339 (travel-extended complete)

Goal `ja.goal.b1.travel-extended` complete (325-339). 10 units,
50-word `lexicon/travel2.jsonl`, 2 grammar (`b1.te-shimau`,
`b1.darou`), 8 sentences. Score: **7/7**.

## 2026-10-04 — ja-JP batch 29: B1 units 340-349 (emotions-personality part 1)

Goal `ja.goal.b1.emotions-personality` (prereq travel-extended,
mirrored; spans 340-354) started, 10 units, 50-word
`lexicon/emotion.jsonl`, 2 grammar (`b1.ni-kuru`, `b1.wake-da`),
8 sentences, 1 assessment. Score: **7/7**.

## 2026-10-04 — ja-JP batch 30: B1 units 350-359 (emotions complete, advice-opinion start)

Goal `ja.goal.b1.emotions-personality` complete (340-354). Goal
`ja.goal.b1.advice-opinion` (prereq emotions-personality, mirrored;
spans 355-369) started, 5 units. 10 units, 50 words split across
`lexicon/emotion2.jsonl` + `lexicon/advice.jsonl`, 2 grammar
(`b1.hou-ga-yoi`, `b1.to-omoimasu`), 8 sentences, 1 assessment.
Score: **7/7**.

## 2026-10-04 — ja-JP batch 31: B1 units 360-369 (advice-opinion complete)

Goal `ja.goal.b1.advice-opinion` complete (355-369). 10 units,
50-word `lexicon/advice2.jsonl`, 2 grammar (`b1.to-itara-domo`,
`b1.ni-chuui`), 8 sentences. Score: **7/7**.

## 2026-10-04 — ja-JP batch 32: B1 units 370-379 (comparison-debate part 1)

Goal `ja.goal.b1.comparison-debate` (prereq advice-opinion,
mirrored; spans 370-384) started, 10 units, 50-word
`lexicon/debate.jsonl`, 2 grammar (`b1.ni-yori`,
`b1.shitsumon-ni-kotae`), 8 sentences, 1 assessment. Score: **7/7**.

## 2026-10-04 — ja-JP batch 33: B1 units 380-389 (comparison complete, storytelling start)

Goal `ja.goal.b1.comparison-debate` complete (370-384). Goal
`ja.goal.b1.storytelling` (prereq comparison-debate, mirrored;
spans 385-399) started, 5 units. 10 units, 50 words split across
`lexicon/debate2.jsonl` + `lexicon/story.jsonl`, 2 grammar
(`b1.yori-mo`, `b1.to-toki`), 8 sentences, 1 assessment.
Score: **7/7**.

## 2026-10-04 — ja-JP batch 34: B1 units 390-399 (storytelling complete)

Goal `ja.goal.b1.storytelling` complete (385-399). 10 units,
50-word `lexicon/story2.jsonl`, 2 grammar (`b1.dakara`,
`b1.sou-da`), 8 sentences. Score: **7/7**.

## 2026-10-04 — ja-JP batch 35: B1 units 400-409 (health-wellness part 1)

Goal `ja.goal.b1.health-wellness` (prereq storytelling, mirrored;
spans 400-414) started, 10 units, 50-word `lexicon/health2.jsonl`,
2 grammar (`b1.nagara`, `b1.mazu`), 8 sentences, 1 assessment.
Score: **7/7**.

## 2026-10-04 — ja-JP batch 36: B1 units 410-414 complete + B2 units 420-424 (politics start)

B1 band complete (220-414). Goal `ja.goal.b1.health-wellness`
complete (400-414). Goal `ja.goal.b2.politics-governance` (prereq
health-wellness, mirrored; spans 420-434) started, 5 units. 10
units, 50 words split across `lexicon/health3.jsonl` +
`lexicon/politics.jsonl`, 2 grammar (`b1.ni-tsurete`,
`b1.ka-ni-shitara`), 8 sentences, 1 assessment. Score: **7/7**.

## 2026-10-04 — ja-JP batch 37: B2 units 425-434 (politics-governance complete)

Goal `ja.goal.b2.politics-governance` complete (420-434). 10
units, 50-word `lexicon/politics2.jsonl`, 2 grammar
(`b2.ni-yotte`, `b2.toiu-koto`), 8 sentences. Score: **7/7**.

## 2026-10-04 — ja-JP batch 38: B2 units 435-444 (economics-work start)

Unit 435 (governance-essay) closes politics-governance. Goal
`ja.goal.b2.economics-work` created (436-449; 445-449 remain). 10 units,
50-word `lexicon/economy.jsonl`, 2 grammar (`b2.ni-shite`, `b2.dake-de`),
8 sentences, assessment `ja.assess.economics-work`. Score: **7/7**.

## 2026-10-04 — ja-JP batch 39: B2 units 445-449 (economics-work 436-449 done)

5 units, 25-word `lexicon/economy2.jsonl`, 1 grammar (`b2.mono-da`),
4 sentences. Plan note: economics-work spans 436-451; 450-451 in batch 40.
Score: **7/7**.

## 2026-10-04 — ja-JP batch 40: B2 units 450-459 (economics-work complete, law-justice start)

Goal `ja.goal.b2.law-justice` created (452-467). 10 units, 10-word
`lexicon/economy3.jsonl` + 40-word `lexicon/law.jsonl`, 2 grammar
(`b2.wake-da`, `b2.ni-tsunete`), 8 sentences, assessment
`ja.assess.law-justice`. Score: **7/7**.

## 2026-10-04 — ja-JP batch 41: B2 units 460-469 (law-justice complete, philosophy-ethics start)

Goal `ja.goal.b2.philosophy-ethics` created (468-482). 10 units,
41-word `lexicon/law2.jsonl` + 9-word `lexicon/philosophy.jsonl`, 2 grammar
(`b2.ni-kansuru`, `b2.ni-yoru`), 8 sentences, assessment
`ja.assess.philosophy-ethics`. Score: **7/7**.

## 2026-10-04 — ja-JP batch 42: B2 units 470-479 (philosophy-ethics cont)

10 units, 50-word `lexicon/philosophy2.jsonl`, 2 grammar
(`b2.toiu-mono`, `b2.mono-ka`), 8 sentences. Score: **7/7**.

## 2026-10-04 — ja-JP batch 43: B2 units 480-489 (philosophy-ethics complete, literature-study start)

Goal `ja.goal.b2.literature-study` created (484-498). 10 units,
20-word `lexicon/philosophy3.jsonl` + 30-word `lexicon/lit.jsonl`, 2 grammar
(`b2.ni-kagiru`, `b2.ni-junzuru`), 8 sentences, assessment
`ja.assess.literature-study`. Score: **7/7**.

## 2026-10-04 — ja-JP batch 44: B2 units 490-494 (literature-study cont)

5 units, 25-word `lexicon/lit2.jsonl`, 1 grammar (`b2.ni-kagite`),
5 sentences. Score: **7/7**.

## 2026-10-04 — ja-JP batch 45: B2 units 495-499 (literature-study complete)

Goal `ja.goal.b2.literature-study` complete (484-499). 5 units,
25-word `lexicon/lit3.jsonl`, 1 grammar (`b2.ni-yoru-to`), 4 sentences.
Score: **7/7**.

## 2026-10-04 — ja-JP batch 46: B2 units 500-509 (film-analysis start)

Goal `ja.goal.b2.film-analysis` created (500-514). 10 units,
50-word `lexicon/film.jsonl`, 2 grammar (`b2.ni-tsurete`, `b2.dake-dewa`),
8 sentences, assessment `ja.assess.film-analysis`. Score: **7/7**.

## 2026-10-04 — ru-RU Phase 2 merged (units 020-029 personal-details)

External model response (`responses/phase2-personal-details.md`) parsed via
`parse_response.py` into `candidates/ru-fullkit-v1/`: 10 units, goal
`ru.goal.a1.personal-details`, 50 new lex (`lexicon/personal.jsonl` full
supersede, 60 total), 6 grammar, 4 sentences, 2 assessments. Pack totals:
30 units, 7 goals, 100 lex, 9 grammar, 11 sentences, 14 assessments.
Score: **7/7**.

## 2026-10-04 — ru-RU agent batch ru01: A1 units 030-039 (people-family)

Goal `ru.goal.a1.people-family` created. 10 units, 50-word
`lexicon/family.jsonl`, 2 grammar (`a1.u-possession`,
`a1.possessive-pronouns`), 8 sentences, 2 assessments. Score: **7/7**.

## 2026-10-04 — ru-RU agent batch ru02: A1 units 040-049 (home)

Goal `ru.goal.a1.home` created. 10 units, 50-word `lexicon/home.jsonl`,
2 grammar (`a1.location-v-na`, `a1.na-vs-v`), 8 sentences, 2 assessments.
Score: **7/7**.

## 2026-10-04 — ru-RU agent batch ru03: A1 units 050-059 (routines)

Goal `ru.goal.a1.routines` created. 10 units, 50-word `lexicon/routines.jsonl`,
2 grammar (`a1.telling-time`, `a1.frequency-adverbs`), 8 sentences, 2 assessments.
Score: **7/7**.

## 2026-10-04 — ru-RU agent batch ru04: A1 units 060-069 (food)

Goal `ru.goal.a1.food` created. 10 units, 50-word `lexicon/food.jsonl`,
2 grammar (`a1.accusative-food`, `a1.polite-order`), 8 sentences, 2 assessments.
Score: **7/7**.

## 2026-10-04 — ru-RU agent batch ru05: A1 units 070-079 (shopping)

Goal `ru.goal.a1.shopping` created. 10 units, 50-word `lexicon/shopping.jsonl`,
2 grammar (`a1.adjective-agreement`, `a1.genitive-quantity`), 8 sentences, 2 assessments.
Score: **7/7**.

## 2026-10-04 — ru-RU agent batch ru06: A1 units 080-089 (city)

Goal `ru.goal.a1.city` created. 10 units, 50-word `lexicon/city.jsonl`,
2 grammar (`a1.motion-idti-ehat`, `a1.direction-prepositions`), 8 sentences, 2 assessments.
Score: **7/7**.

## 2026-10-04 — ru-RU agent batch ru07: A1 units 090-099 (time-plans)

Goal `ru.goal.a1.time-plans` created. 10 units, 50-word `lexicon/timeplans.jsonl`,
2 grammar (`a1.plan-construction`, `a1.time-when`), 8 sentences, 2 assessments.
Score: **7/7**.

## 2026-10-04 — ru-RU agent batch ru08: A1 units 100-109 (basic-messages)

Goal `ru.goal.a1.basic-messages` created. 10 units, 50-word
`lexicon/messages.jsonl`, 2 grammar (`a1.modal-impersonal`, `a1.polite-requests`),
8 sentences, 2 assessments. Score: **7/7**. **A1 band complete (000-109).**

## 2026-10-04 — ja-JP batch 47: B2 units 510-519 (film-analysis tail + history-critical start)

Goal `ja.goal.b2.history-critical` created (+deps edge, +assessment). 10 units,
30-word `lexicon/film2.jsonl`, 20-word `lexicon/history.jsonl`,
2 grammar (`b2.ni-oujite`, `b2.ni-tomonai`), 8 sentences. Score: **7/7**.

## 2026-10-04 — ja-JP batch 48: B2 units 520-529 (history-critical)

10 units, 50-word `lexicon/history2.jsonl`, 2 grammar (`b2.to-okeru`,
`b2.ni-kagete`), 8 sentences. Unit 520 uid `economic-history-b` (446 collision).
Score: **7/7**.

## 2026-10-04 — ja-JP batch 49: B2 units 530-539 (history-critical tail + society-change start)

Goal `ja.goal.b2.society-change` created (+deps edge, +assessment). 10 units,
10-word `lexicon/history3.jsonl`, 40-word `lexicon/society3.jsonl`,
2 grammar (`b2.ni-yosure`, `b2.dake-naraba`), 8 sentences. Score: **7/7**.

## 2026-10-04 — ja-JP batch 50: B2 units 540-549 (society-change tail)

10 units, 50-word `lexicon/society4.jsonl`, 2 grammar (`b2.ni-kagitte`,
`b2.bakari-ka`), 8 sentences. Unit 548 uid `supply-development` (437 collision).
Score: **7/7**.

## 2026-10-04 — ja-JP batch 51: B2 units 550-559 (science-tech-ethics)

Goal `ja.goal.b2.science-tech-ethics` created (+deps edge, +assessment). 10 units,
50-word `lexicon/science.jsonl`, 2 grammar (`b2.ni-totoi`, `b2.wake-hodo`),
8 sentences. Score: **7/7**.

## 2026-10-04 — ja-JP batch 52: B2 units 560-569 (science-tech-ethics tail + education-pedagogy start)

Goal `ja.goal.b2.education-pedagogy` created (+deps edge, +assessment). 10 units,
20-word `lexicon/science2.jsonl`, 30-word `lexicon/edu3.jsonl`,
2 grammar (`b2.ni-sotte`, `b2.bakari-da`), 8 sentences. Score: **7/7**.

## 2026-10-04 — ja-JP batch 53: B2 units 570-579 (education-pedagogy tail)

10 units, 50-word `lexicon/edu4.jsonl`, 2 grammar (`b2.ni-kanren-shite`,
`b2.ni-kagiri`), 8 sentences. Score: **7/7**.

## 2026-10-04 — ja-JP batch 54 + lexicon kana data fix

Goal `ja.goal.b2.global-issues` created (+deps, +assessment). Units 580-589,
50-word `lexicon/global.jsonl`, 2 grammar (`b2.ni-jou-shite`, `b2.dake-no-hanwa`).
**Data fix** (`fix_kana.py`): b47-b54 shards (film2, history, history2, history3,
society3, society4, science, science2, edu3, edu4, global) had English text in
`forms`/`readings`; all 350 entries rewritten to hiragana/katakana with correct
script tags; part_of_speech normalized (n→noun, adj-na→na-adjective, v→verb).
Score: **7/7**.

## 2026-10-04 — ja-JP batch 55

Goal `ja.goal.b2.academic-skills` created (+deps, +assessment). Units 590-599,
50 words (`lexicon/global2.jsonl` 20, `lexicon/academic.jsonl` 30), 2 grammar
(`b2.ni-chikai`, `b2.ni-hiku`), 8 sentences. Kana authored directly in WORDS.
Score: **7/7**.

## 2026-10-05 — ja-JP batch 56

Units 600-609 (academic-skills tail), 50 words (`lexicon/academic2.jsonl`),
2 grammar (`b2.wake-ni-wa-ikanai`, `b2.zaru-o-enai`), 8 sentences.
Score: **7/7**.

## 2026-10-05 — ru-RU batch 9 (A2 start)

Goal `ru.goal.a2.past-events` created (+2 assessments). Units 110-119,
50 words (`lexicon/pastevents.jsonl`), 2 grammar (`a2.past-tense`,
`a2.time-connectors`), 10 sentences. Cloze targets must match text
case-sensitively (capitalized sentence-initial words fail).
Score: **7/7**.

## 2026-10-05 — ja-JP batch 57

Goals `ja.goal.b2.academic-writing` + `ja.goal.b2.formal-correspondence` created
(+assessments, +deps; prereq b1.work-professional). Units 610-619,
50 words (`lexicon/formal.jsonl`), 2 grammar (`b2.moushi-agemasu`,
`b2-yoroshiku`), 9 sentences. Score: **7/7**.

## 2026-10-05 — ru-RU batch 10

Goal `ru.goal.a2.travel` created (+2 assessments). Units 120-129,
50 words (`lexicon/travel.jsonl`), 2 grammar (`a2.prepositional-transport`,
`a2.time-of-departure`), 10 sentences. Score: **7/7**.

## 2026-10-05 — ja-JP batch 58

Goal `ja.goal.b2.art-design` created (+assess, +deps). Units 620-629,
50 words (`lexicon/formal2.jsonl`), 2 grammar (`b2-ni-tomonau`, `b2-ni-totte`),
9 sentences. Score: **7/7**.

## 2026-10-05 — ru-RU batch 11

Goal `ru.goal.a2.services` created (+2 assessments). Units 130-139,
50 words (`lexicon/services.jsonl`), 2 grammar (`a2.want-accusative`,
`a2.genitive-negation`), 10 sentences. Score: **7/7**.

## 2026-10-05 — ja-JP batch 59

Units 630-639 (art-design), 50 words (`lexicon/art2.jsonl`),
2 grammar (`b2-to-shite`, `b2-ni-motte`), 8 sentences. Score: **7/7**.

## 2026-10-05 — ru-RU batch 12

Goal `ru.goal.a2.wellbeing` created (+2 assessments). Units 140-149,
50 words (`lexicon/wellbeing.jsonl`), 2 grammar (`a2.dative-health`,
`a2.imperative-advice`), 10 sentences. Score: **7/7**.

## 2026-10-05 — ja-JP batch 60

Goal `ja.goal.b2.media-critique` created (+assess, +deps). Units 640-649,
50 words (`lexicon/media3.jsonl`), 2 grammar (`b2-to-iu-koto`, `b2-wake-da`),
8 sentences. (First run clobbered existing `media.jsonl`/`media2.jsonl`;
restored, shard renamed media3.) Score: **7/7**.

## 2026-10-05 — ru-RU batch 13

Goal `ru.goal.a2.work-study` created (+2 assessments). Units 150-159,
50 words (`lexicon/workstudy.jsonl`), 2 grammar (`a2.instrumental-role`,
`a2.genitive-of-achievement`), 10 sentences. Score: **7/7**.

## 2026-10-05 — ja-JP batch 61

Goal `ja.goal.b2.psychology-mind` created (+assess, +deps). Units 650-659,
50 words (`lexicon/critique.jsonl`), 2 grammar (`b2-ni-yoru`, `b2-wake-dewa-nai`),
8 sentences. Score: **7/7**.

## 2026-10-05 — ru-RU batch 14

Goal `ru.goal.a2.social-plans` created (+2 assessments). Units 160-169,
50 words (`lexicon/socialplans.jsonl`), 2 grammar (`a2.let-us-imperative`,
`a2.invitation-accusative`), 10 sentences. Score: **7/7**.

## 2026-10-05 — ja-JP batch 62

Units 660-669 (psychology-mind), 50 words (`lexicon/psych.jsonl`),
2 grammar (`b2-ni-hikurabete`, `b2-ni-tsurezuru`), 8 sentences. Score: **7/7**.

## 2026-10-05 — ru-RU batch 15

Goal `ru.goal.a2.comparisons` created (+2 assessments). Units 170-179,
50 words (`lexicon/comparisons.jsonl`), 2 grammar (`a2.comparative-short`,
`a2.potomu-chto`), 10 sentences. Score: **7/7**.

## 2026-10-05 — ja-JP batch 63

Goal `ja.goal.b2.medicine-society` created (+ASSESS +DEP). Units 670-679
(psych tail + medicine start), 50 words (`lexicon/med.jsonl`), 2 grammar
(`b2-ni-wakat-te`, `b2-ppoi`), 8 sentences. Score: **7/7**.

## 2026-10-05 — ru-RU batch 16

Goal `ru.goal.a2.instructions` created (+2 assessments). Units 180-189,
50 words (`lexicon/instructions.jsonl`), 2 grammar (`a2.imperative-instructions`,
`a2.infinitive-steps`), 10 sentences. Score: **7/7**.

## 2026-10-05 — ja-JP batch 64

Goal `ja.goal.b2.urban-life` created (+ASSESS +DEP). Units 680-689
(medicine tail + urban start), 50 words (`med2.jsonl`, `urban.jsonl`), 2 grammar
(`b2-dake-atte`, `b2-muke-no`), 8 sentences. Score: **7/7**.

## 2026-10-05 — ru-RU batch 17

Goal `ru.goal.a2.problems-solutions` created (+2 assessments). Units 190-199,
50 words (`lexicon/problems.jsonl`), 2 grammar (`a2.prosba-requests`,
`a2.genitive-shortage`), 10 sentences. Score: **7/7**.

## 2026-10-05 — ja-JP batch 65

Units 690-699 (urban-life), 50 words (`lexicon/urban2.jsonl`), 2 grammar
(`b2-wake-ka`, `b2-to-itte`), 8 sentences. Score: **7/7**.

## 2026-10-05 — ru-RU batch 18

Goal `ru.goal.a2.connected-messages` created (+2 assessments). Units 200-209,
50 words (`lexicon/messages2.jsonl`), 2 grammar (`a2.connectors`,
`a2.reflexive-feelings`), 10 sentences. Score: **7/7**.

## 2026-10-05 — ja-JP batch 66

Goal `ja.goal.b2.environment-policy` created (+ASSESS +DEP). Units 700-709
(urban tail + environment start), 51 words (`urban3.jsonl`, `env3.jsonl`), 2 grammar
(`b2-to-ha`, `b2-ni-kaete`), 8 sentences. Score: **7/7**.

## 2026-10-05 — ru-RU batch 19

Goal `ru.goal.b1.narration` created (+2 assessments; B1 band starts). Units 210-219,
50 words (`lexicon/narration.jsonl`), 2 grammar (`b1.narrative-past`,
`b1.sequence-connectors`), 10 sentences. Score: **7/7**.

## 2026-10-05 — ja-JP batch 67

Goal `ja.goal.b2.language-linguistics` created (+ASSESS +DEP). Units 710-719
(environment tail + linguistics start), 50 words (`env4.jsonl`, `ling.jsonl`), 2 grammar
(`b2-hazu-da`, `b2-to-naruto`), 8 sentences. Score: **7/7**.

## 2026-10-05 — ru-RU batch 20

Units 220-229 (narration continued), 50 words (`lexicon/narration2.jsonl`),
2 grammar (`b1.imperfective-background`, `b1.viewpoint-markers`), 10 sentences.
Score: **7/7**.

## 2026-10-05 — ja-JP batch 68

Units 720-729 (language-linguistics), 50 words (`lexicon/ling2.jsonl`), 2 grammar
(`b2-darou`, `b2-to-omo-u`), 8 sentences. Score: **7/7**.

## 2026-10-05 — ru-RU batch 21

Goal `ru.goal.b1.experiences` created (+2 assessments). Units 230-239,
50 words (`lexicon/experiences.jsonl`), 2 grammar (`b1.experience-negation`,
`b1.reaction-predicatives`), 10 sentences. Score: **7/7**.

## 2026-10-05 — ja-JP batch 69

Goal `ja.goal.b2.culture-identity` created (+ASSESS +DEP). Units 730-739
(linguistics tail + culture start), 50 words (`ling3.jsonl`, `cult.jsonl`), 2 grammar
(`b2-ni-anto-shite`, `b2-ni-mukete`), 8 sentences. Score: **7/7**.

## 2026-10-05 — ru-RU batch 22

Units 240-249 (experiences: travel), 50 words (`lexicon/travel2.jsonl`),
2 grammar (`b1.travel-reflexives`, `b1.lessons-perfective`), 10 sentences. Score: **7/7**.

## 2026-10-05 — ja-JP batch 70

Units 740-749 (culture-identity tail, abstract-debate start), 50 words
(`lexicon/cult2.jsonl`, `lexicon/abst.jsonl`), 2 grammar (`b2-to-sureba`, `b2-ni-hokanaranai`),
8 sentences, new goal `ja.goal.b2.abstract-debate` + assessment + DEP edge. Score: **7/7**.

## 2026-10-05 — ru-RU batch 23

Units 250-259 (service failures, explanatory correspondence), 50 words
(`lexicon/problems2.jsonl`), 2 grammar (`b1.proshu-requests`, `b1.v-svyazi-s`), 10 sentences,
new goal `ru.goal.b1.practical-problems` + 2 assessments. Score: **7/7**.

## 2026-10-05 — ja-JP batch 71

Units 750-759 (abstract-debate reasoning), 50 words (`lexicon/abst2.jsonl`),
2 grammar (`b2-ni-taishite`, `b2-to-areba`), 8 sentences. Score: **7/7**.

## 2026-10-05 — ja-JP batch 72

Units 760-769 (abstract-debate tail, nuance-register start), 50 words
(`lexicon/abst3.jsonl`, `lexicon/reg1.jsonl`), 2 grammar (`b2-ni-kagiru`, `b2-to-itara`), 9 sentences,
new goal `ja.goal.b2.nuance-register` + assessment + DEP edge. Score: **7/7**.

## 2026-10-05 — ru-RU batch 24

Units 260-269 (housing and community problems), 50 words (`lexicon/housing.jsonl`),
2 grammar (`b1.net-genitive`, `b1.instrumental-tools`), 10 sentences. Score: **7/7**.

## 2026-10-05 — ja-JP batch 73

Units 770-779 (nuance-register tail, humor-wordplay start), 50 words
(`lexicon/reg2.jsonl`, `lexicon/play1.jsonl`), 2 grammar (`b2-ni-shite-wa`, `b2-to-ieba`), 8 sentences,
new goal `ja.goal.b2.humor-wordplay` + assessment + DEP edge. Score: **7/7**.

## 2026-10-05 — ru-RU batch 25

Units 270-279 (learning methods, progress, decisions), 50 words (`lexicon/learning.jsonl`),
2 grammar (`b1.chtoby-goals`, `b1.reshit-vybrat`), 10 sentences,
new goal `ru.goal.b1.learning-work` + 2 assessments. Score: **7/7**.

## 2026-10-05 — ja-JP batch 74

Units 780-789 (humor-wordplay: comedy, satire, manga), 50 words (`lexicon/play2.jsonl`),
2 grammar (`b2-ni-totte-iru`, `b2-wake-deshou`), 9 sentences. Score: **7/7**.
