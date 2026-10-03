# DATA-001 — Local SQLite profile storage and migrations

Milestone M2, P0. Completed 2026-10-02.

## What was built

`crates/storage` (`lts-storage`) on rusqlite 0.37 (bundled SQLite):

- `Store::open(path)` / `Store::in_memory()`; WAL journal, foreign keys
  on, forward-only migrations per ADR-0005
  (`docs/adr/0005-sqlite-baseline-schema.md`).
- Schema v1: profiles, settings, pack_installations,
  profile_pack_selections, content_versions, learner_goals,
  schema_migrations. Schema v2: evidence_events, evidence_corrections,
  mastery_snapshots, scheduler_state, sessions, retained_recordings,
  reports (+ evidence indexes). `PRAGMA user_version` head +
  `schema_migrations` history; opening a newer DB errors (`TooNew`).
- Profiles: locally generated `prof-<uuid v4>` ids; create/get/list/
  delete; settings as JSON KV; learner goals with status/target date.
- Packs: installation records, per-profile selections, content-version
  mappings for evidence reproducibility.
- Evidence: `append_evidence` (duplicate event id → false, no write:
  retries cannot double-count), `evidence_for_profile` full-fidelity
  round-trip of `lts-domain::EvidenceEvent`, corrections referencing
  prior events (originals never deleted), `corrected_event_ids`.
- Recordings: metadata-only `retained_recordings` (relative path +
  consent timestamp); rows only via explicit `retain_recording`.

## Acceptance evidence

1. "Profile can be created without account/network" —
   `profile_created_without_account_or_network`: local file DB, local
   UUID id, no network code in the crate.
2. "Migrations are tested forward from initial schema" —
   `migrations_apply_forward_from_initial_schema`: hand-built v1 DB
   (user_version=1, legacy profile row) opened by current code →
   head (2), legacy row intact, v2 tables usable, history [1,2].
3. "Sensitive/raw audio is not stored by default" —
   `no_audio_blobs_and_no_recordings_by_default`: schema-wide
   `pragma_table_info` scan asserts zero BLOB columns; a normal
   profile has no recording rows; retention is explicit opt-in.

Extra invariants: `evidence_survives_restart_and_rejects_duplicate_ids`
(second `Store` over the same file; duplicate id rejected),
`delete_profile_removes_app_owned_learner_data` (cascade).

## Verification

- `cargo test -p lts-storage`: 8 tests OK —
  `state/evidence/DATA-001/cargo-test-2026-10-02.txt`.
- `./scripts/ci.sh`: CI OK, workspace suite incl. storage —
  `state/evidence/DATA-001/ci-2026-10-02.txt`.

## Notes / decisions

- rusqlite `bundled`: no system SQLite dependency (ADR-0005).
- No ORM; hand-written SQL keeps the persisted contract auditable.
- `Store::conn()` exposed read-only for privacy-audit queries.
- Recording *files* are managed by the audio layer; the DB stores only
  metadata, matching the docs/08 deletion contract (startup recovery
  reconciles leftover files later, with the audio pipeline).
