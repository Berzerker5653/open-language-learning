# M4-E2E — First no-speech playable vertical slice

Date: 2026-10-03

## Acceptance mapping

1. **Fresh user completes a small on-ramp Japanese flow with contextual
   listening/text placeholders and persistence.**
   - Test `fresh_user_onramp_flow_persists_and_resumes` (lts-desktop) drives
     the whole stack with zero pre-seeded state: install bundled
     `org.openlanguage.ja-demo` → local profile → onboarding (mic skipped)
     → encounter (text placeholder; the pack declares `listening: false`,
     so no speech path exists) → two recall attempts → IME-typed answer
     graded against the canonical form → evidence + scheduler state
     persisted → progress re-derived from the log (recall-meaning
     `Independent`, production-writing non-unseen).
   - On-ramp content is data-driven: `ja-demo/curriculum/units/000-greetings.yaml`
     (encounter-read / recall / produce activities over EDRDG-derived lexicon).

2. **Restart resumes safely.**
   - The test drops the store and reopens the same file at a later clock:
     `build_plan` succeeds, the FSRS item is now due and appears as a
     `due-review` plan item, and the goal's progression unlocks
     (prerequisite met, concept untouched). No corruption, no duplicated
     observations (attempt groups + append-only log).

3. **No streak/heart mechanics exist.**
   - Planner reasons are only `due-review` / `weak-skill` / `progression`
     (ADR-0002); the serialized plan JSON contains no "streak"/"heart".
   - UI tests (UX-001/UX-002) assert no streak/attendance/points/heart
     surface; storage schema has no attendance table.

4. **End-to-end test covers flow.**
   - The Rust test above is the E2E test: pack load → runtime render →
     attempts/support → storage → scheduler update → planner → progress.
   - `scripts/smoke-desktop.sh` additionally proves the native shell boots
     the new UI under xvfb and completes the smoke handshake.

## Verification

- `cargo test --workspace` — see `cargo-test-2026-10-03.txt` (lts-desktop 5).
- `./scripts/ci.sh` exit 0 — `ci-2026-10-03.txt`.
- `./scripts/smoke-desktop.sh` exit 0 (`smoke-ok home`) —
  `smoke-desktop-2026-10-03.txt`.

## Notes

- No speech anywhere in the slice: ja-demo manifest sets
  `listening: false, speaking: false`; the flow uses text placeholders
  for encounter and keyboard/IME for production (WRITE-001).
- M4 is complete after this task; remaining release blockers are
  owner-only (LIC-001, REVIEW-001, SPEECH-007) plus M5 speech work.
