# UI-HYGIENE-001 takeover — board t_7984526c (2026-11-21)

Dead card t_822930b7 (circuit breaker, 2x iteration budget 60/60) left the lane
UNCOMMITTED. This takeover triaged, repaired, gated and committed it.

## Ownership triage of the dirty tree

- `apps/desktop/src-tauri/src/lib.rs` was based on a PRE-`c9e332e` tree (dead
  worker started before FIX-READER-FLOW-001b-1 landed at 05:54). Committing it
  as-is would have reverted `word_card_parses_the_aux_slice_once_not_per_tap`.
  The takeover restored that test and reverted a stray fmt glitch on
  `context_sentence_id` indentation, keeping only UI-HYGIENE hunks.
- `apps/desktop/src-tauri/src/lib.rs.rej` was stale junk: its hunks (fmt
  re-wraps of `word_card_at` calls) were already superseded on main by
  `c9e332e`/`12202f3`. Deleted.
- `crates/storage/src/migrations.rs`: the `//! 8. word_lookups` doc-comment
  lines belong to sibling VOCAB-BUILDER-001 (its migration v8 itself is
  already on main) — left UNSTAGED for that lane; the v9 `profiles.hidden`
  migration, SCHEMA_VERSION bump and test artifacts are UI-HYGIENE's and were
  staged via `git hash-object`/`git update-index` (partial stage).
- `state/task-state.json` in the dirty tree was stale escape-noise (it would
  have reverted the sibling's `JA-B1-003-FIX-002` ledger close at `fc4dd16`).
  Never staged; the ledger commit was rebuilt from HEAD + only this card's
  record, `ensure_ascii=False, indent=2`.
- All frontend hunks (App/home/home.test/onboarding/journeys/styles/audit
  tool) are UI-HYGIENE's own.

## Completion work the dead lane left red (found by this takeover's gates)

The chooser redesign (cards + `Continue`/`Hide` buttons) broke three journey
tests; the WIP had updated the harness button matcher (aria-label counts as
label) but missed the rest:

1. `journeys/keyboard.journey.tsx` — resume-picker tab stop is now the card's
   Continue button addressed by accessible name; the journey finds it by
   aria-label. Intent (tab-reachable profile, focus to H1) unchanged.
2. `journeys/export-restore.journey.tsx` — chooser rows became cards; asserts
   two `Dana` cards and clicks the second card's Continue. Intent unchanged.
3. Dedupe semantics refined in `onboarding.tsx`: blanket same-name dedupe
   violated the restore contract (a restored backup deliberately creates a
   second same-name profile the learner must be able to resume — journey d).
   Dedupe now collapses only contentless twins (no pack, no due count, no
   practice stamp — the automated-test-fixture shape). A profile with recorded
   state is never hidden by name collision.
   The journey harness `list_profiles` was made wire-realistic (pack,
   due_count, last_studied) so journey fixtures exercise real chooser state.

## Pre-existing HEAD red found while baselining (NOT this lane)

`journeys/content-confirm.journey.tsx` word_card fixture lacked `storyId` —
merged VOCAB-BUILDER-001 wire change never updated the fixture. Reproduced
red at pure HEAD in a scratch worktree (that file's other two journeys green
at HEAD). Fixed as its own `chore(rot)` commit before the lane commit.

## Toolchain pitfall hit during gating

`cargo test -p lts-desktop --lib` failed with "no field `hidden` on type
`Profile`" while the storage source had the field: a sibling's earlier
worktree-at-HEAD run left a stale HEAD-keyed `lts-storage` rlib in the shared
`CARGO_TARGET_DIR` (storage mtime older than the rlib -> cargo deemed it
fresh; first `cargo clean -p lts-storage` attempt was killed by a 5 s tool
timeout and never completed). Verified `cargo clean -p lts-storage`
(Removed 1008 files) and re-ran clippy + desktop --lib + storage cleanly.

## Stale test fixtures stranded by the v9 bump (fixed by this takeover)

Two assertions broke because the lane legitimately bumps SCHEMA_VERSION
8 -> 9; both were completed to assert the NEW contract, none weakened:

1. `crates/storage/src/migrations.rs` upgrade-path test: the rewind to v4
   deleted `schema_migrations` rows 5..8 only, so the re-applied v9 insert
   hit `UNIQUE constraint failed: schema_migrations.version`. Rewind now
   also deletes the v9 marker row.
2. `crates/storage/tests/lookups.rs` (merged VOCAB-BUILDER-001 test):
   pinned `schema_version() == 8` literally — now pinned to
   `lts_storage::SCHEMA_VERSION` with an explicit `>= 8` "v8 applied"
   assert; the v8 artifact assertions below are untouched.
