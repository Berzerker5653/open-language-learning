# LLM Pack-Authoring Test

Measures whether the pack-authoring kit (contract + example pack) is
sufficient for a *different* LLM to produce a validator-perfect pack in
one pass — i.e. whether the kit's requirements are unambiguous. Mode B
(full kit) is the production path; Mode A (starter) is the calibration
run that validates the kit itself.

## Procedure (Mode A calibration run)

1. Fill in the **Target language** block in `BRIEF.md` (language name +
   `target_locale`; the id prefix is derived from the locale) and set the
   Mode row to **A** for calibration runs. Paste the whole file to the
   test LLM.
2. Save the model's FULL response text to a file (e.g.
   `/tmp/<name>-response.md`) — no manual file copying — and run
   `./experiments/llm-pack-authoring/parse_response.py <response-file> <name>`
   to reconstruct `candidates/<name>/`.
3. Score: `./experiments/llm-pack-authoring/score.sh experiments/llm-pack-authoring/candidates/<name> <name>`
4. Record the outcome in `RESULTS.md` (gates passed, diagnostics, and any
   kit ambiguity the failure reveals).

### Mode B (full kit, batched)

Same brief, but the model works in phases in ONE chat (plan → on-ramp →
one band per response). Procedure per batch:

1. Phase 0 emits `CURRICULUM_PLAN.yaml`; `parse_response.py` saves it to
   `plans/<name>.yaml` (outside the pack, never scored). Run
   `.venv/bin/python experiments/llm-pack-authoring/validate_plan.py
   experiments/llm-pack-authoring/plans/<name>.yaml` — it mechanically
   checks id grammar, band order, coverage and the capacity math
   (units × 6 ≥ promised items). On errors, feed the diagnostics back
   and make the model replan. The human then confirms SCOPE only
   (bands, effort) — pedagogy is not certified here; content stays
   `draft` pending qualified human review.
2. For each later response, save the full text and run
   `parse_response.py <response-file> <name>` again with the SAME label:
   batches merge into `candidates/<name>/` (a touched file is replaced
   whole; untouched files persist).
3. `score.sh` after EVERY batch, not just the last. A batch that breaks
   a gate is fixed before the next band starts.
4. `RESULTS.md` records the per-batch gate results.

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
