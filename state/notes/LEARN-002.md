# LEARN-002 — Derived multimodal mastery model

Milestone M2, P0. Completed 2026-10-02.

## What was built

- `crates/learner-model/src/derive.rs`: `derive_mastery(policy,
  content_id, dimension, events, corrections, now) -> DerivedMastery`
  over real `EvidenceEvent`s under the frozen policy (LEARN-005
  pipeline refactored into reusable `observations()` + `ladder()`).
  Per (content, dimension): state, heuristic confidence, needs_refresh
  flag, `policy_version` + `algorithm_version` ("mastery-derive-0.1.0").
- Confidence heuristic (documented uncalibrated): state rank ×
  support factor (avg support of successes weakens it) × diversity
  factor (distinct prompt families) × recency factor; capped at 0.9 —
  never near certainty without calibration.
- `needs_refresh`: valid evidence exists but none within
  `stale_after_days_without_valid_evidence` (30d provisional); display
  guidance, not a mastery state (docs/03 §16).
- `crates/storage/src/mastery.rs`: `record_mastery_snapshot` /
  `latest_mastery` (latest per content+dimension, history kept for
  audit).

## Acceptance evidence

1. "Reading success does not automatically grant speaking/listening
   mastery" — `reading_success_never_grants_speaking_mastery`: two
   reading successes → reading `independent`, speaking `unseen` with
   confidence 0.0 (derivation filters by exercised modality).
2. "Support use weakens evidence strength relative to independent
   performance" — `supported_success_is_weaker_evidence_than_independent`:
   identical counts, support 2 vs 0 → strictly lower confidence; state
   ladder additionally caps scaffolded successes at `supported`.
3. "Regression/needs-refresh state is possible" —
   `regression_and_needs_refresh_are_possible`: two confident mismatches
   regress independent→supported; 55 days of silence sets
   `needs_refresh` (state unchanged, no shame framing).
4. "Algorithm version is recorded" —
   `snapshots_record_algorithm_and_policy_versions`: snapshot round-trip
   carries `mastery-derive-0.1.0` + policy version; every
   `DerivedMastery` carries both.

## Verification

- `cargo test -p lts-learner-model -p lts-storage`: 20 tests OK (12
  learner-model incl. 4 new derive tests + 8 storage) —
  `state/evidence/LEARN-002/cargo-test-2026-10-02.txt`.
- `./scripts/ci.sh`: CI OK — `state/evidence/LEARN-002/ci-2026-10-02.txt`.

## Notes

- Determinism: pure function of (events, corrections, now, policy);
  test clocks throughout. Recomputation after algorithm change is the
  intended upgrade path (docs/03 §3).
- Corrections excluded before derivation; originals stay in the log.
- Confidence numbers are engineering heuristics; the policy's
  `confidence.limits` block is the contract the factors implement.
