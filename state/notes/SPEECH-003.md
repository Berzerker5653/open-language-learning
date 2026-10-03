# SPEECH-003 — Model manager / download metadata

Date: 2026-10-03

## Acceptance mapping

1. **Models are versioned, checksummed, licensed, and removable.**
   - Catalog `apps/desktop/src-tauri/models/catalog.json` (compiled in,
     `catalog_version: 0.1.0`): each model has `id`, `version`,
     `runtime`, `tier`, per-file `url`/`sha256`/`size_bytes`, and
     license fields (`license_code`, `license_model`, `source`).
   - Install is staged + SHA-256 verified per file; `installed.json`
     records version, checksums, license, and install time — trust is
     bound to the exact version (docs/17).
   - `delete_model` removes the model directory; `model_status` then
     reports `installed: false`.
   - `verify_installed` re-hashes installed files; `available_models`
     reports corrupted installs as missing.

2. **Base app does not require bundling all models.**
   - Nothing under `models/` ships in the app data dir; the catalog is
     metadata only. All M4 flows (onboarding, practice, progress, E2E)
     run with zero installed models — no test or command requires a
     model. Downloads are on-demand via `install_model` (ureq HTTPS,
     hard cap at pinned size).

3. **Missing model UX is recoverable.**
   - Failed install (checksum/size mismatch or interrupted fetch)
     removes the staging dir: no partial model is left; status stays
     `missing`; retry with good bytes succeeds (test
     `install_is_checksummed_atomic_and_removable` asserts exactly this
     sequence, plus corruption detection and delete).

## Verification

- `cargo test --workspace`: 153 passed (lts-desktop 7, +2 model-manager
  tests) — `cargo-test-2026-10-03.txt`.
- `./scripts/ci.sh` exit 0 — `ci-2026-10-03.txt`.
- All four catalog URLs verified live (HTTP 200) on 2026-10-03;
  checksums pinned from the SPEECH-001 benchmark run.

## Notes

- Catalog currently pins development-tier models only (ADR-0007:
  `tiny` tier is dev-only). Production tiers are added after the
  SPEECH-002 re-benchmark; adding a model is a catalog change with new
  pinned checksums, never a silent update.
- UI surface for model management (settings screen) rides along with
  SPEECH-002's microphone/model install flow.
