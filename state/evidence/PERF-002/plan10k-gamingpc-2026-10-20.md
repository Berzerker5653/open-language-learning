# PERF-002 — app.session_plan_10k_evidence_ms (gamingpc, 2026-10-20)

Corpus: 10000 synthetic evidence_events seeded through the storage
contract (columns as written by `Store::append_evidence`) into the
throwaway smoke store; targets sampled from the installed pack's lexicon
ids; rows tagged `activity_id='perf.activity.plan10k.seed'` and the store
is deleted at exit — no learner data exists or ships from this run.

Machine: `machine.json` in this directory (Ryzen 9 5950X, 32 GiB, NVMe —
`high` tier per `docs/performance/BUDGETS.yaml` machine classes).
Harness: `scripts/perf-plan10k.sh` (5 walks on one seeded store, plus a
fresh-profile baseline walk before seeding).

| walk | practice_plan ms |
|---|---|
| baseline (fresh profile) | 15 |
| loaded-1 | 729 |
| loaded-2 | 766 |
| loaded-3 | 713 |
| loaded-4 | 724 |
| loaded-5 | 765 |

**Loaded-corpus p50 = 729 ms, p95 = 766 ms** (n=5, nearest-rank).

## Verdict against `docs/performance/BUDGETS.yaml` (pre-fix binary)

`session_plan_10k_evidence_ms` budgets: typical p50 50 / p95 150,
low p50 120 / p95 400. Measured on `high`-class hardware:
p50 729 / p95 766 — **FAILS every published tier**, by ~5x on p95 vs
typical and ~1.9x vs the low-tier ceiling. Scaling is ~O(n)
(fresh corpus 15 ms → 10k events 729 ms ⇒ ≈73 µs/event; a 100k probe
run could not complete a walk within 900 s).

This is a real engine defect for long-lived profiles, not a budget
calibration question: a two-year heavy learner on flagship hardware
would wait three quarters of a second for the practice plan. Numbers
here are ground truth; the budget file is provisional and was NOT
edited.

**Update (same day):** hot spot confirmed — `derive_pairs`
re-scanned every evidence row for every (content, dimension) pair
(`derive_mastery_in_pack` filter chain over the full corpus, per pair).
Bucketing the corpus by (content, dimension) once fixed it to
90/93 ms; see `plan10k-gamingpc-fixed-2026-10-20.md`. Raw
`plan10k-*-marker.txt` files in this directory were later overwritten
by the fixed run's markers.
