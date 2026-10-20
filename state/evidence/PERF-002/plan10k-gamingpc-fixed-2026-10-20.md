# PERF-002 — app.session_plan_10k_evidence_ms (gamingpc, fixed build, 2026-10-20)

Same harness and corpus generation as `plan10k-gamingpc-2026-10-20.md`
(`scripts/perf-plan10k.sh`; 10,000 synthetic evidence_events seeded through
the storage contract, pack lexicon targets, throwaway store deleted at
exit). Machine identical (`machine.json` — Ryzen 9 5950X, 32 GiB, NVMe).
Binary: 0.4.3-alpha.1 with the `derive_pairs` bucketing fix (each pair now
receives its own pre-bucketed evidence slice instead of re-scanning the
whole corpus).

| walk | practice_plan ms |
|---|---|
| baseline (fresh profile) | 17 |
| loaded-1 | 90 |
| loaded-2 | 88 |
| loaded-3 | 89 |
| loaded-4 | 91 |
| loaded-5 | 93 |

**Loaded-corpus p50 = 90 ms, p95 = 93 ms** (n=5, nearest-rank) — an ~8×
improvement over the pre-fix 729/766 ms on the same machine and corpus.

## Verdict against `docs/performance/BUDGETS.yaml`

`session_plan_10k_evidence_ms`: typical p50 50 / p95 150.
- p95 93 ms — **PASS**.
- p50 90 ms — **over the provisional typical p50 of 50 ms** (low tier
  120/400 is passed). The remaining cost is linear per-call corpus work:
  full deserialization of 10k evidence rows plus per-pair policy
  evaluation and pack lexicon reloads. Getting p50 under 50 ms on this
  hardware needs a persisted/incremental mastery cache — a storage-model
  change (migration + invalidation rules), not a micro-optimization, and
  its own ADR.

Owner decision recorded as pending: either (a) calibrate this provisional
line (it predates any real-corpus measurement) in the budget-freeze ADR,
or (b) fund the mastery-cache slice. Both `plan10k-*-marker.txt` raw
markers currently on disk are from this fixed run.
