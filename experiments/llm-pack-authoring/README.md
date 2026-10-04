# LLM Pack-Authoring Test

Measures whether the pack-authoring kit (contract + example pack) is
sufficient for a *different* LLM to produce a validator-perfect pack in
one pass — i.e. whether the kit's requirements are unambiguous.

## Procedure

1. Fill in the **Target language** block in `BRIEF.md` (language name +
   `target_locale`; the id prefix is derived from the locale — that is the
   only language-specific edit needed). Paste the whole file to the test LLM.
2. Save the model's FULL response text to a file (e.g.
   `/tmp/<name>-response.md`) — no manual file copying — and run
   `./experiments/llm-pack-authoring/parse_response.py <response-file> <name>`
   to reconstruct `candidates/<name>/`.
3. Score: `./experiments/llm-pack-authoring/score.sh experiments/llm-pack-authoring/candidates/<name> <name>`
4. Record the outcome in `RESULTS.md` (gates passed, diagnostics, and any
   kit ambiguity the failure reveals).

## What "perfect" means

All gates green: validate 0 errors; **lint 0 errors 0 warnings**; all three
audits 0 errors; install-mode `test`; deterministic `build`. Plus human
review of target-language correctness — the validator cannot certify
language quality, only structure/references/honesty.

## Harness self-test

`./experiments/llm-pack-authoring/score.sh tools/pack-templates/example-pack self-test`
must be all-PASS; it validates the harness itself (the example pack is the
lint-clean reference).

## Known grading edges

- `audit-sources` warns (not errors) on original-content sources without a
  URL; `lint` fails on warnings, so the brief's "original source with URL"
  pattern matters — a candidate that drops the URL fails lint, which is
  intended strictness.
- Status honesty is machine-enforced: `validated`/`verified` without a
  review record fails (`review_promotion_unsupported`).
