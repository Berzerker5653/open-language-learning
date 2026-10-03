# LEARN-001 — Evidence event model

Milestone M2, P0. Completed 2026-10-02.

## What was built

- `lts-domain::EvidenceEvent` gained `failure_reason: Option<String>`:
  machine-readable reason for non-linguistic outcomes (`asr-timeout`,
  `mic-denied`, …), never transcript/audio content (docs/08).
- `crates/storage` migration v3 adds `evidence_events.failure_reason`;
  append/query round-trip it. Forward-migration test now covers v1→v3.
- `lts-learner-model::AttemptDraft` — typed builder activities use to
  describe an attempt: targets/modality/activity, prompt family, attempt
  group (retry grouping, docs/03 §5), support level + concrete actions,
  `scored(score)` vs `technical_failure(reason, provider)` vs
  `abstained(reason, provider)`, raw provider confidence, assessment
  kind, held-out flag, rubric/policy versions. `finish(...)` freezes an
  immutable `EvidenceEvent`.

## Acceptance evidence

1. "Activities can append typed evidence with support/confidence/content
   versions" — `typed_attempt_carries_support_confidence_and_versions`:
   support level 2 + action list, confidence 0.62, rubric/policy/pack
   versions, attempt group, held-out all round-trip through the store.
2. "Events remain queryable after restart" —
   `events_remain_queryable_after_restart`: second `Store::open` over
   the same file returns the event with versions intact.
3. "Technical speech failures are representable separately from learner
   errors" — `technical_speech_failure_is_distinct_from_learner_error`:
   a scored `Incorrect` attempt and an `asr-timeout` failure coexist;
   only the former is `is_scored_evidence()`; the failure carries
   reason + provider and no score.

## Verification

- `cargo test -p lts-domain -p lts-storage -p lts-learner-model`:
  31 tests OK (20 domain + 8 storage + 3 new learner-model) —
  `state/evidence/LEARN-001/cargo-test-2026-10-02.txt`.
- `./scripts/ci.sh`: CI OK — `state/evidence/LEARN-001/ci-2026-10-02.txt`.

## Notes

- Builder enforces the invariant that speech-provider results never set
  `score` on failure/abstention paths (the methods clear it).
- `abstained` is distinct from `technical_failure` so the derivation
  layer can treat low-confidence judging differently from outages.
- No mastery derivation yet (LEARN-002/005); the model layer so far
  only constructs and persists events.
