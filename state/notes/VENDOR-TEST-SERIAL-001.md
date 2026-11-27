# VENDOR-TEST-SERIAL-001 — serialize vendor-backed dictation tests

## Problem (measured, not guessed)
The 7 vendor-gated desktop lib tests (those calling `dictation_vendor()`) all spawn/tear down the
same local whisper.cpp sidecar. When the full `--lib` suite runs them concurrently (default
libtest threads) their starts/teardowns collide and a victim test gets `Some("engine-error")`
from `dictation_check` — flaked repeatedly across lanes (FIX-M1-PROGRESSION review cycle,
2026-11-27: two full-suite failures, both pre-fix binaries).

Cross-process shape also observed same day: a lane gate script and a full-suite run overlap and
cargo does NOT serialize test EXECUTION across processes — treat "gate script + full suite at the
same time" as prohibited on this repo (operational rule, logged in gates.log).

## Contract
- Test-only change in `apps/desktop/src-tauri/src/lib.rs`: one process-wide mutex;
  `dictation_vendor()` returns `(TempDir, MutexGuard)` so every vendor-backed test holds the lock
  for its full lifetime (spawn → checks → teardown).
- No production code touched. No test weakened; assertions unchanged.
- LANE gates: `cargo fmt --all --check`, `cargo clippy -p lts-desktop --all-targets -- -D warnings`,
  full `cargo test -p lts-desktop --lib` green.

## Shipped
In-chat (owner present) 2026-11-27. Full suite `264 passed; 0 failed; 2 ignored` in 386.90s after
the fix (serialized vendor tests lengthen wall time by design). Gate numbers in
`state/evidence/VENDOR-TEST-SERIAL-001/gates.log`.
