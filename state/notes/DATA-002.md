# DATA-002 Acceptance Notes — Profile export/import

Date: 2026-10-02

## Design

`crates/storage/src/export.rs`: versioned JSON bundle
(`EXPORT_FORMAT_VERSION = 1`) containing profile identity, settings,
goals, pack installations/selections, content versions, full evidence,
corrections, latest mastery snapshots, and scheduler state. No binary
payloads anywhere (consistent with the no-BLOB schema invariant);
the bundle is human-readable and JSON round-trip stable.

## Acceptance 1: Round-trip preserves evidence/mastery inputs/settings

`round_trip_preserves_evidence_mastery_inputs_and_settings`: a seeded
profile (2 evidence events, correction, mastery snapshot, scheduler
row, settings, goal, pack install/selection/content version) exports,
survives a JSON serialize/deserialize equality check, and imports into
a fresh store with every collection compared equal to the bundle.
Evidence rows are re-parented to the imported profile id (FK contract;
the bundle keeps the source id for provenance). Unknown bundle
versions are rejected (`unknown_bundle_versions_are_rejected`).

## Acceptance 2: Import never silently overwrites an existing profile

Three explicit modes (`ImportMode`):
- `NewProfile` — fresh generated id, never collides;
- `PreserveId` — fails with `ProfileExists` if the id exists (test
  asserts the refusal and that original data is untouched);
- `Overwrite` — requires the profile to exist and is an explicit
  caller decision; replaces cleanly (evidence count stays 2, no
  duplicates). Overwrite on a missing profile errors rather than
  silently creating.

## Acceptance 3: Recordings are opt-in to export

`ExportOptions::default()` has `include_recordings: false`; the bundle
field is `Option` and skipped in serialization — test asserts the
exported JSON text does not contain the recording path at all. With
opt-in, metadata (path/duration/purpose/consent timestamps — never
audio bytes) is exported and re-imported.

## Evidence

- `state/evidence/DATA-002/cargo-test-2026-10-02.txt` — lts-storage
  12 tests (4 new export/import + 8 existing) green.
- `state/evidence/DATA-002/ci-2026-10-02.txt` — full `./scripts/ci.sh`
  exit 0 ("CI OK") + handoff validator PASS (48 data files).
