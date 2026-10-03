# ADR 0005: SQLite baseline schema and forward-only migrations

Status: Accepted
Date: 2026-10-02

## Context

DATA-001 requires local SQLite profile storage (docs/08) with tested
forward migrations, offline profile creation, and privacy invariants
(raw audio never stored by default). The persisted data model is a
public contract: learner data outlives app versions, and pack updates
must not invalidate evidence (docs/08 §imports).

## Decision

- `crates/storage` (`lts-storage`) owns the only SQLite connection type
  (`Store`). rusqlite with the `bundled` feature: no system SQLite
  dependency, reproducible across platforms.
- Schema follows the docs/08 key tables. Version 1: profiles, settings,
  pack installations/selections, content versions, learner goals.
  Version 2: evidence events/corrections, mastery snapshots, scheduler
  state, sessions, retained recordings, reports.
- Migrations are forward-only, applied in one transaction per version,
  tracked by `PRAGMA user_version` plus a `schema_migrations` history
  table. Opening a newer database with an older app is a hard error
  (`TooNew`), never a silent downgrade.
- Evidence is append-only: `event_id` is the primary key and duplicate
  appends are rejected (returning false), so retries cannot
  double-count. Corrections are separate rows referencing prior events;
  originals are never deleted.
- Privacy invariants are schema-level: no BLOB columns exist anywhere;
  `retained_recordings` stores metadata + relative path only and rows
  are created solely through an explicit opt-in call. A test asserts
  the absence of BLOB columns across the whole schema.
- Profile ids are locally generated UUIDs; no account, email, or
  network participation in profile creation.
- WAL journal mode and foreign keys with `ON DELETE CASCADE` for
  profile-scoped data (docs/08 deletion contract: deleting a profile
  removes app-owned learner data; recording files are deleted by the
  caller, metadata rows cascade).

## Consequences

- Every schema change is a new numbered migration; tests must cover
  migrating from the initial schema to head.
- Export/import (DATA-002) builds on these tables; imports stage and
  commit transactionally.
- No downgrades are supported; recovery from a partially applied
  migration relies on the per-migration transaction.

## Alternatives

- Diesel or sqlx: heavier dependency trees and codegen; hand-written
  SQL keeps the schema auditable and the bundled engine pinned.
- `user_version` alone without `schema_migrations`: loses applied-at
  history that support and export diagnostics need.
- Soft-deleting evidence rows: rejected — docs/08 requires
  append-oriented evidence with tombstone corrections, not mutation.
