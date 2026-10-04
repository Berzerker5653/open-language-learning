# Kit Test Results

Procedure: see `README.md`. Every candidate is scored by `score.sh`
(validate / lint / audit-curriculum / audit-sources / audit-licenses /
test / build). The strict bar is lint = 0 errors **and 0 warnings**.

## Runs

| Date       | Candidate                                                                                 | Result                                               | Notes                                                                                                                                                                                                  |
| ---------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-10-04 | `self-test` (`tools/pack-templates/example-pack`)                                         | 7/7 PASS                                             | proves the harness itself works                                                                                                                                                                        |
| 2026-10-04 | `calibration-self` (`candidates/calibration-self/`)                                       | 7/7 PASS                                             | self-authored German pack scored with the kit; proves `BRIEF.md` is achievable as written                                                                                                              |
| 2026-10-04 | `ru-starter` (`candidates/ru-starter/`) — external LLM (GPT-6 Astra Pro), Russian `ru-RU` | 18 errors first pass → 7/7 PASS after mechanical fix | only failures: schema-forbidden `status`/`sources` on goals/units/activities/assessments — invited by brief rules 3+5 wording (fixed). Russian content itself accurate; no language corrections needed |

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
