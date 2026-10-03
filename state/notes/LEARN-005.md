# LEARN-005 — Versioned mastery, assessment, and prerequisite policy

Milestone M2, P0. Completed 2026-10-02.

## What was built

- `docs/assessment/MASTERY_POLICY.yaml` (policy_version 0.1.0,
  schema_version 1, `status: provisional-hypotheses`):
  eligibility (only `scored` counts; technical-failure/abstained/
  skipped/deferred/excluded never linguistic; latency diagnostic-only;
  invalid content exclude-and-recompute), support semantics
  (independent ≤1, supported ≤3, per-dimension disqualifying support),
  amount/diversity/grouping (one observation per attempt group,
  prompt-family diversity unit, held-out rules, coached-retry cap),
  transition minimums with per-rule rationale, regression
  (2 consecutive confident mismatches → one step down; time decay
  explicitly NOT in the mastery rubric — scheduler concern),
  confidence semantics (uncalibrated heuristic, never a statistical
  interval), modality-aware prerequisite evaluation (dimension+state
  required, access ≠ mastery, deferral preserves other modalities),
  correction/recomputation rules, and the fixture manifest.
- `crates/learner-model/src/policy.rs`: strict loader + validator
  (canonical states, provisional marking, single-success guard,
  positive delay) and a deterministic evaluator `derive(policy,
  fixture, dimension) -> Decision{dimension, state, policy_version}` —
  every derived decision records the policy version (also stored in
  `mastery_snapshots.policy_version` / `evidence_events.policy_version`).
- 9 worked fixtures under `tests/fixtures/policy/` covering every
  transition, no-transition, regression, and exclusions.

## Acceptance evidence

1. Policy artifact specifies eligibility, transitions, support levels,
   diversity, delay, confidence, and modality-aware prerequisite
   evaluation with worked fixtures — the YAML + fixture manifest;
   `every_declared_fixture_exists_and_derives_expected_states` proves
   each fixture derives exactly its documented state.
2. Thresholds marked initial implementation hypotheses; memory
   scheduling supplies no proficiency rubric — `status:
   provisional-hypotheses` enforced by the validator
   (`policy_is_versioned_and_marks_thresholds_provisional`,
   `policy_validation_rejects_broken_artifacts` rejects a
   "calibrated-truth" relabel); YAML §Scheduler note carries the
   FSRS-must-not-grant-mastery rule.
3. Technical failures, abstention, skips, latency alone, invalid
   content never create negative linguistic outcomes; elapsed-time
   decay separate — fixtures `technical-failure-no-outcome`,
   `content-correction-leaves-no-residue`; `time_decay_in_mastery:
   false` + regression section.
4. Tests cover no-mic/no-audio tracks (`deferred-speaking-track-no-
   fabricated-credit`: reading advances, speaking stays unseen), novice
   (`novice-single-success-stays-introduced`), already-known
   (`known-diagnostic-reaches-independent`), supported success
   (`supported-successes-...-not-independent`), content correction,
   repeated prompt memorization (`repeated-prompt-memorization-capped`
   caps at supported), transfer/retention
   (`transfer-then-delayed-recheck-reaches-retained`) —
   `required_scenario_coverage` pins the manifest.
5. Policy version recorded with derived decisions; frozen before
   LEARN-002 — `Decision.policy_version` asserted in every fixture
   check; freeze + revision rule stated in the YAML header.

## Verification

- `cargo test -p lts-learner-model`: 8 tests OK (3 evidence + 5 policy)
  — `state/evidence/LEARN-005/cargo-test-2026-10-02.txt`.
- `./scripts/ci.sh`: CI OK — `state/evidence/LEARN-005/ci-2026-10-02.txt`.

## Notes / decisions

- The evaluator is deliberately minimal-deterministic: it implements
  the frozen transition rules so fixtures are executable contracts.
  LEARN-002 layers confidence scoring, prerequisite health, and
  snapshot persistence on top; policy changes then require a version
  bump + migration impact note (YAML header).
- PartiallyCorrect counts only toward introduced/supported
  (`evidence.partial_credit`), keeping "independent" strict.
- Prompt identity = prompt family when present, else the event id;
  flexible additionally requires a transfer/checkpoint assessment so
  practice exposure alone cannot reach it.
