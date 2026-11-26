# MUTATION-PERF-001 — close-note (superseded by MUTATION-PERF-CACHE-001)

Decision (owner, 2026-11-25): re-scope to the validator-side cache card the successor card had already shipped.

Facts:
- Parent lane (2026-11-23) shipped baseline-once + reflink overlay (per-case copy ~10.5s -> ~0.17s; test bodies unchanged). Suite GREEN but ~363s wall — audit-bound (fresh validator.Audit re-parses the ~6.9k-file tree per case, ~9.7s x 37), target ~90s not met. Validator untouched.
- Parent was then blocked with the scope-conflict verdict (only remaining honest lever = validator-side cache — forbidden by this card's contract, requiring its own review).
- Successor MUTATION-PERF-CACHE-001 shipped that validator-side file-hash cache (code eee3e20b; FIX-MUTATION-PERF-CACHE-001 cb6a67ee closed the SPEC-fail defects - suffix-keyed cache + roadmap() deep-copy; REVIEW-MUTATION-PERF-CACHE-001 verdicts fcb92241). Suite: 363.0s -> 62.2s (~5.8x; target <= ~90s MET; 37/37 OK). task-state evidence points at state/evidence/MUTATION-PERF-CACHE-001/gates.log + FIX-MUTATION-PERF-CACHE-001/gates.log.
- Board card MUTATION-PERF-CACHE-001 COMPLETED 2026-11-24 (ledger 0b60a7fc).

Close: parent MUTATION-PERF-001 is done-by-succession; the validator-side cache IS the shipped lever. No further work on the parent.
