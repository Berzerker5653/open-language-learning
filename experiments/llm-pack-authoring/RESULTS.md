# Kit Test Results

Procedure: see `README.md`. Every candidate is scored by `score.sh`
(validate / lint / audit-curriculum / audit-sources / audit-licenses /
test / build). The strict bar is lint = 0 errors **and 0 warnings**.

## Runs

| Date       | Candidate                                           | Result   | Notes                                                                                     |
| ---------- | --------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------- |
| 2026-10-04 | `self-test` (`tools/pack-templates/example-pack`)   | 7/7 PASS | proves the harness itself works                                                           |
| 2026-10-04 | `calibration-self` (`candidates/calibration-self/`) | 7/7 PASS | self-authored German pack scored with the kit; proves `BRIEF.md` is achievable as written |

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

## External LLM runs

_None yet._ When a candidate returns from the external LLM: save its files
under `candidates/<name>/`, run
`./experiments/llm-pack-authoring/score.sh experiments/llm-pack-authoring/candidates/<name> <name>`,
and log the outcome (plus any kit ambiguities it exposes) in the table above.
