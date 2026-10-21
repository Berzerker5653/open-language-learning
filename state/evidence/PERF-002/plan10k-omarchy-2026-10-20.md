# PERF-002 — app.session_plan_10k_evidence_ms (omarchy, 2026-10-20)

Corpus: 10000 synthetic evidence_events seeded through the storage
contract (columns as written by `Store::append_evidence`) into the
throwaway smoke store; targets sampled from the installed pack's lexicon
ids; rows tagged `activity_id='perf.activity.plan10k.seed'` and the store is
deleted at exit — no learner data exists or ships from this run.

| walk | practice_plan ms |
|---|---|
| baseline (fresh profile) | 12 |
| loaded-1 | 57 |
| loaded-2 | 61 |
| loaded-3 | 61 |
| loaded-4 | 60 |
| loaded-5 | 59 |

**Loaded-corpus p50 = 60 ms, p95 = 61 ms** (n=5, nearest-rank).
Raw markers: `plan10k-*-marker.txt` in this directory.
