# PACK-004 notes — secure pack archive build/install/inspect

## What shipped

- `crates/langpack::archive` + CLI `build` / `inspect` / `install` /
  `rollback`.
- Format `lts-pack/1`: zip with sorted entries, fixed DOS epoch
  timestamps, deflate, and `MANIFEST.json` (format, pack_id, version,
  schema_version, per-file `{path, sha256, size}`). Build requires
  scaffold-clean validation first.
- Determinism: same pack dir → byte-identical archive + SHA-256
  (test-asserted).
- Install hardening (all reject with no partial state; extraction happens
  in a staging dir inside the store, then one atomic rename):
  - path traversal / absolute / backslash / drive-letter / dot components
    rejected in both manifest and zip entries;
  - symlink entries rejected (unix mode check);
  - unlisted zip entries rejected;
  - per-file 32 MiB / total 256 MiB declared-size limits;
  - decompression bombs: extraction is capped at `declared size + 1`
    bytes, so oversized expansion is caught without OOM;
  - every file's SHA-256 re-verified against the manifest;
  - extracted pack must pass install-mode validation (license gates,
    unresolved references) — scaffold-only packs cannot install;
  - archive manifest identity must agree with the pack manifest.
- Store layout `<store>/<pack_id>/<version>/` + atomic `current` pointer.
  Install keeps prior versions; `rollback` repoints `current` (highest
  other semver by default, or `--to VERSION`).

## Tests

- `crates/langpack/tests/archive.rs` (8): determinism, build rejects
  invalid pack, install→upgrade→rollback cycle (old version kept),
  traversal, hash mismatch, bomb, unlisted entry, install-mode gate on
  `valid-scaffold-draft`.
- 39 langpack tests total; full `./scripts/ci.sh` green; release-readiness
  blockers preserved.

## Decisions

- zip (deflate only, `default-features = false`) rather than tar+gzip:
  per-entry random access lets install verify names/sizes before reading
  any payload.
- No signing in PACK-004: integrity (SHA-256) and safety are enforced;
  authenticity/trust transitions belong with the install UX + trust
  states (docs/04) once LIC-001/review gates exist.
- `current` pointer file (not symlinks) so rollback is atomic and
  testable without filesystem privilege assumptions.

## Limits / follow-ups

- Signature verification + trust-state transitions: later (needs key
  policy decision).
- `langpack inspect` prints manifest only; richer queries land with
  PACK-005.
