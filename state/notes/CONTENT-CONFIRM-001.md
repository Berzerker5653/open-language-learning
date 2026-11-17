# CONTENT-CONFIRM-001 — in-app community confirmation of content correctness

ADR-0040 (Accepted, owner directive 2026-10-20) named this card as the only
"checked by" path that will ever exist: a fluent user confirming content
inside the app, attributed, never an agent self-certifying. This note is the
frozen implementation contract for the lane.

## Acceptance (from tasks/ROADMAP.yaml)

1. A confirmation is attributed to the profile that gave it, stored locally,
   included in profile export, and rendered with its attribution; the app
   shows what users confirmed, never a claim of expert verification.
2. No automatic path marks content checked: only an explicit action by a
   user fluent in the language creates the mark, and packs keep their
   declared review posture regardless.

## Frozen interface

### Storage (crates/storage) — migration v6, SCHEMA_VERSION 5 -> 6

```sql
CREATE TABLE content_confirmations (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pack_id TEXT NOT NULL,
  content_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(profile_id, pack_id, content_id)
);
```

Types: `ContentConfirmation { id, profile_id, pack_id, content_id, created_at }`
and `ConfirmedBy { profile_id, display_name, created_at }` (attribution comes
from the profiles table join, never from a free-text name).

Store API:

- `confirm_content(profile_id, pack_id, content_id, id, created_at) ->
  Result<ContentConfirmation>` — idempotent: `ON CONFLICT DO NOTHING` then
  read back the existing row (same discipline as `add_mined`, K-61).
- `remove_content_confirmation(profile_id, pack_id, content_id) ->
  Result<bool>` — the learner's own mark, retractable.
- `content_confirmations(pack_id, content_id) -> Result<Vec<ConfirmedBy>>`.
- `profile_content_confirmations(profile_id) ->
  Result<Vec<ContentConfirmation>>` (export path).

Confirmations touch only this table. Nothing in this card writes a pack file,
an install row's `trust_state`, a `reviews.jsonl` record, or any manifest
field: packs keep their declared posture by construction (acceptance 2).

### Export/import (crates/storage/src/export.rs)

`EXPORT_FORMAT_VERSION` 2 -> 3. New bundle field
`content_confirmations: Vec<ContentConfirmation>` with `#[serde(default)]`,
so v1/v2 bundles import unchanged. Import re-issues confirmation ids via
`fresh_id` and remaps `profile_id` to the importing profile, exactly like
`mined_items` (R05/R06 discipline: global ids never collide, all-or-nothing
transaction).

### Desktop IPC (apps/desktop/src-tauri/src/lib.rs)

- `#[tauri::command] content_confirm(profile_id, content_id)` and
  `content_unconfirm(profile_id, content_id)` — resolve the active pack the
  same way `story_view_at` does (`packs::active_pack` first entry); no
  active pack is a refusal naming the cause, never a guessed pack (D7 rule).
  `content_id` passes the same id-shape check the story route uses.
- `StoryView` gains `confirmations: BTreeMap<String, Vec<ConfirmedByName>>`
  (`ConfirmedByName { display_name, at }`), keyed by content id, covering
  both sentence ids and the lexicon-entry ids in the lookup panel. One read
  at view time; no separate poll.

### Frontend (apps/desktop/src/reading.tsx + App.tsx)

The confirmation surface rides the tap-to-lookup panel in graded reading —
the place where pack text (sentences + lexicon entries) is presented:

- Sentence row: a "This looks right" toggle beside the gloss; word rows:
  the same toggle beside "Mine".
- Attribution renders next to the item: "confirmed by A, B" — display names
  only, no "verified/expert/reviewed" claim anywhere (docs/18).
- A learner who already confirmed sees "Undo"; clicking it retracts their
  own mark only (never anyone else's).
- The action is explicit: nothing in the app ever creates a mark without
  this button click.

No Settings audit list in this lane (recorded deviation): attribution at
point of use plus the export bundle satisfy the acceptance wording.

## Gates

- `cargo test -p lts-storage` (+ new behavior tests: idempotent confirm,
  attribution join, cascade on profile delete, migration v6 ledger).
- export round-trip: confirmations survive; a v2 bundle still imports
  (field absent -> empty list).
- `cargo test -p lts-desktop --lib` with the new command tests.
- `cargo fmt --all --check`, `cargo clippy --workspace --all-targets
  -- -D warnings`.
- apps/desktop: `tsc --noEmit`, vitest (component pin: toggle + attribution
  render, callbacks fire), prettier/eslint on touched files.
- `tools/audit_learner_copy.py` 0 findings.
- `tools/validate_handoff.py --require-explicit-ledger-records` PASS.
