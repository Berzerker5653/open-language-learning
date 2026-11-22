# SPEECH-INFRA-001 — eligibility registry + honest capability gating (data-independent half of SPEECH-007)

## Contract
SPEECH-007 stays `blocked` on owner-supplied calibration data (unchanged). This card
ships the architecture half so that when calibration data lands, qualifying a feature
means **dropping a calibration record file into the installed pack** — not changing code:

- Eligibility registry: `crates/speech-api/src/calibration.rs` — `CalibrationRecord`
  binds feature, provider, model id/version/sha256, interpreter, pack id/version,
  target variety, protocol/dataset/result hashes, frozen thresholds, held-out metrics
  and the enrollment envelope. Unfilled thresholds/metrics, envelope misses, and
  version/hash drift all fail closed.
- Per-feature gating: `pronunciation_check_at` in `apps/desktop/src-tauri/src/lib.rs`
  resolves the record for the exact installed combination and stamps every result with
  `mode: guided|automatic` + machine-readable `mode_reason`
  (`no-calibration-record`, `model-version-drift`, ...).
- Honest UI labels ride the mode (shipped frontend + `audit_learner_copy` clean).

## What was already on main (audited, run 1)
Everything above shipped 2026-10-04 in `2c722a5` ("SPEECH-007 calibration
infrastructure (infra-only per owner scope)"), including the registry's own unit
tests (`version_or_hash_drift_invalidates` et al., 9 tests in lts-speech-api) and the
guided/automatic vitest coverage. The measured gap was the **end-to-end contract**:
nothing proved that a Qualified record in the installed pack actually flips the
production path, or that drift fails it closed, through the real pipeline.

## What this card adds
Two vendor-gated contract tests in `apps/desktop/src-tauri/src/lib.rs`
(behind the same `dictation_vendor()` gate as the rest of the speech pipeline;
registry unit tests run everywhere):

1. `calibration_record_qualified_for_installed_combination_flips_to_automatic` —
   writes a Qualified record bound to exactly the combination the gate resolves
   (catalog model version+hash, interpreter info, pack version, variety), scores the
   obasan/obaasan attempt, asserts `mode == "automatic"`, `mode_reason == None`, and
   that the scored audio outcome is unchanged (record changes posture, never audio path).
2. `calibration_record_with_model_version_drift_fails_closed_to_guided` — same record
   bound to a decoy model version: feedback still runs guided, `mode_reason ==
   "model-version-drift"`, automatic never rides a drifted binding (docs/17 §97).

Run-1 helper bug fixed by run 2: `write_calibration_record` unified
`Option<&str>` with a cloned `Option<String>` (E0308) — restructured to
`Option<String>` via match.

## Run history
- Run 1 (attempt 1, 2026-11-21 23:25): audited shipped infra, wrote the two tests in
  worktree `~/.hermes/cache/scratch/lts-speech-infra-work`, died (model no-reply)
  mid-compile with E0308 in its helper. Gate logs it left: `gates-tests.log`
  (speech-api 6/6 + desktop compile FAIL), `audit-learner-copy.log` (0 findings, run
  in main tree), `vitest-pronunciation.log` (12/12, run in main tree).
- Run 2 (this): fixed E0308, re-ran the full LANE battery in the worktree at
  HEAD+lane (shared CARGO_TARGET_DIR), unit `lts-speechinfra2`, results in
  `state/evidence/SPEECH-INFRA-001/gates-lane.log`.

## Gate notes
- `cargo fmt --all --check` was RED at HEAD because LAN-TOGGLE-PIN-001 landed
  fmt-dirty `serve.rs` (import order + assert wraps). Fixed as a separate
  `chore(fmt)` commit (`fmt-rot.log` shows HEAD-red → green); the lane battery then
  ran fmt-green including that fix.
- lts-desktop lib tests are vendor-gated like the rest of the speech pipeline: they
  execute for real on this box (`~/.cache/lts-bench` whisper.cpp + ggml-tiny present)
  and skip-with-return on vendor-less machines; registry unit tests run everywhere.
- Main tree held PRACTICE-GATE-001 WIP (incl. its own hunks in lib.rs) the whole
  time: the lane commit staged lib.rs as HEAD+lane-blob (hash-object), and the same
  hunk was applied to the dirty working copy so the sibling's later commit keeps it.

## Deferred / follow-on
- Calibration DATA stays owner-blocked on SPEECH-007 (unchanged blockers, see
  `state/evidence/SPEECH-007/`). The two contract tests are the regression fence the
  campaign will ride on.
