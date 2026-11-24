# MUTATION-PERF-001 — file-mutation verifier speedup (not yet started)

## Why

`tools/test_validate_handoff.py` — the file-mutation verifier for the handoff validator. Each of its 37 cases re-copies the repo tree into a fresh temp dir in `setUp` (excluding `.venv`, `node_modules`, `target`, `tmp`, `dist`, `build`, `.git`, `*.wav`, `__pycache__`), even though the audit only reads tracked files. Measured 2026-11-23: ~10.5s per case, 37 tests, **371.5s full-suite wall time** — the suite is the gate that proves the validator still catches file mutations, so its cost is pure overhead on every full-run gate.

## Contract

- Build the baseline copy ONCE per test run (session-scoped, e.g. lazily on first `setUp`), then each case works on a cheap per-case overlay, e.g. hardlink copy (`os.link` on every file, or `cp -al`) of the pristine baseline — near-instant and semantically identical: each case still starts from a byte-pristine copy.
- Per-case overlays must be garbage-collected: tearDown removes the overlay directory; the baseline is removed at session end. No shared mutable temp state leaks between cases (same failure-set guarantee as today).
- **Semantics unchanged, gate integrity.** Every mutation case still asserts the same validator failure strings via `fails_with`; the baseline still passes with the same warnings. No validator changes, no test weakening, no new skip. The suite is still measuring the same failure modes (duplicate YAML key, broken references, missing files, stale done-without-evidence, cyclic graphs, etc.).
- Historical artifacts are records: the "44 tests" claims in `audit/validator-tests.txt`, `REVIEW_REPORT.md` and `VALIDATION_REPORT.md` are NOT rewritten (they are the Oct-2/Oct-4 records of a 44-test suite that no longer exists; the v0.2 rewrite cut it to 37). The discrepancy is recorded in the gates log at implementation time instead.
- Timing evidence: record before/after suite wall time in `state/evidence/MUTATION-PERF-001/gates.log` (before: ~371s at 2026-11-23; after: measured).

## Acceptance

- Full `python3 -m unittest discover -s tools -p test_validate_handoff.py` green before commit, timed; report the number.
- Suite wall time drops from ~371s to ≤ ~90s (hard cap; baseline-once + overlay is expected to land ~tens of seconds).
- All 37 mutation cases still fail-with their original error phrases; baseline still passes (unchanged assertions — diff the test file's test bodies: they must be untouched).
- No change to `tools/validate_handoff.py`.
- `state/evidence/MUTATION-PERF-001/gates.log` committed with before/after numbers and the measured failure-set comparison.

## Notes for the worker

- `setUp` today: `shutil.copytree(ROOT, self.root, ignore=shutil.ignore_patterns(...))` — the same 37-case × 2 methods (audit, edit_yaml, edit_state) that survive unchanged.
- The audit's own ignores list lives at the top of `setUp`; leave it as-is unless the copy is restructured.
- This is a gate-speed card, not a content or code-change card. Do not widen scope to validator logic.

## RUN 1 HANDOFF — 2026-11-23 (honest partial)

Work shipped (code + evidence, commit in this session):
- baseline-once + reflink overlay (`_baseline()`/`_overlay()` in tools/test_validate_handoff.py)
- per-case copy cost: ~10.5s -> 0.17s; baseline build: 0.4s once per run
- full suite GREEN after the change: Ran 37 tests in 363.061s — OK
- `state/evidence/MUTATION-PERF-001/gates.log` carries the instrumented breakdown

The ~90s target is NOT met. Profiling the baseline audit shows the suite is
AUDIT-bound, not copy-bound: every case instantiates a fresh
validator.Audit over the ~6.9k-file tree (fresh cache, full re-parse);
~9.7s per case x 37 = ~360s of the ~363s wall time. The sanctioned lever
(baseline-once + overlay) is exhausted; the remaining lever is a
validator-side file-hash cache in tools/validate_handoff.py — which this
card's own contract forbids and which needs its own review.

Genuine remaining acceptance; do NOT re-dispatch this card without an
owner decision to re-scope:
  1. re-scope: validator-side file-hash cache (data()/schema across Audit
     instances, same semantics) — new card, requires owner go
  2. or accept the ~363s suite as honest and record it as done with the
     honest verdict (target not met) in the ledger

Do NOT ship a second baseline/overlay attempt hoping it beats the audit —
it cannot.
