# MUTATION-PERF-CACHE-001 — validator-side file-hash cache (re-scoped from MUTATION-PERF-001)

Date: 2026-11-24. Re-scoped from the MUTATION-PERF-001 card (blocked, strike 1, needs owner decision).

## What happened (MUTATION-PERF-001)

The mutation suite is audit-bound, not copy-bound:
- baseline-once + reflink overlay shipped (copy 10.5s -> 0.17s; full suite
  371.529s -> 363.061s, green)
- every case instantiates a fresh validator.Audit over a fresh overlay; the
  audit re-parses the ~6.9k-file tree (languages/ja-JP + ru-RU lexicon,
  schemas/, tasks, state) — ~9.7s per case x 37 ~= ~360s of the wall time
- the sanctioned lever was exhausted; the ~90s target is unreachable from
  the test file alone

## The remaining honest lever (this card)

A validator-side file-hash cache in tools/validate_handoff.py — e.g. a
module-level cache keyed by file content hash (json/yaml data() results and
schema validations) shared across Audit instances, or a documented
baseline-audit reuse path. Semantics must not change: identical inputs
produce identical errors; the per-case overlay must still see its own
mutated content. This is a change to the gate itself (tools/validate_handoff.py),
which this re-scoped card explicitly allows and requires review for.

## Acceptance (to be completed by a future worker)

- Full suite wall time drops measurably toward <= ~90s (target shared with
  the original card, now measured against an honest fresh run)
- Test bodies, the 37 cases and every assertion remain unchanged
- The mutation suite still passes: identical error cascades, same pins
- No weakened gate: tools/validate_handoff.py passes the same inputs
  (its own run must produce the same error count on the baseline tree)
- Historical 44-vs-37 discrepancy stays recorded, not rewritten

## Honest verdict on MUTATION-PERF-001

Keep MUTATION-PERF-001 blocked (strike 1) with the reason already recorded;
this card is the honest successor. Do NOT silently unblock MUTATION-PERF-001
and re-run it against the same forbidden lever.
