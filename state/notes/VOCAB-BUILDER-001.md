# VOCAB-BUILDER-001 — automatic vocabulary builder (frozen contract)

Kindle Vocabulary Builder analogue per `state/notes/READING-STORY-UX-001.md`
Phase C: **the lookup IS the learning signal**. Every reader word-tap
auto-logs and auto-enters the existing review/mine pipeline; no manual Mine
step. Manual Mine keeps working until the owner retires it.

Builds on merged READER-FLOW-001 (word-tap semantics in `word_card_at`,
`reading.tsx`) and on ERR-SRS-LOOP-001 (landed 9a25202) — reuse its ledger
style and `pack_sentence_text` helper. Do NOT revert reader word-tap
semantics.

## Storage (lts-storage) — migration v8, SCHEMA_VERSION 7 -> 8

```sql
CREATE TABLE word_lookups (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  surface TEXT NOT NULL,      -- exactly the printed word tapped
  lemma TEXT,                 -- sidecar lemma when resolved; NULL = no claim
  story_id TEXT NOT NULL,     -- the story the learner was reading
  sentence_id TEXT NOT NULL,  -- the context sentence id
  created_at TEXT NOT NULL
);
CREATE INDEX idx_word_lookups_profile_surface ON word_lookups(profile_id, surface);
ALTER TABLE mined_items ADD COLUMN context_sentence_id TEXT;  -- NULL for manual mines
```

Module `lookups.rs` (append-only observation log like `error_ledger` —
taps never dedupe; each row keeps its own sentence+time, Kindle LOOKUPS
semantics): `record_word_lookup(profile_id, NewWordLookup)` and
`word_lookups(profile_id)`.

`mined.rs`: `NewMinedItem.context_sentence_id: Option<&str>`; insert
carries it; the repeat-mine conflict path folds it with COALESCE onto the
ORIGINAL row (anchor rule). `MinedItem.context_sentence_id: Option<String>`.

## Export (crates/storage/src/export.rs)

`EXPORT_FORMAT_VERSION` 4 -> 5. New bundle field
`word_lookups: Vec<WordLookup>` `#[serde(default)]` (v1-4 bundles import
unchanged); `MinedItem` gains `context_sentence_id` `#[serde(default)]`.
Import re-issues lookup ids via the fresh-id discipline and remaps
profile_id. Nothing here ever reaches the network — the export bundle is
the learner's own explicit action (docs/08).

## Desktop (apps/desktop/src-tauri/src/lib.rs)

- `word_card` / `word_card_at` gain `story_id: String` (validated with the
  same `checked_unit` shape check as sentence_id; NOT membership-checked —
  sentences are reused across stories, so the reading screen is the truth
  of which story). After the card resolves, BEFORE returning:
  1. `record_word_lookup` (surface = tapped token, lemma = sidecar
     resolution when any, story_id, sentence_id, now).
  2. auto-mine via the existing `add_mined` path — surface selection
     matches the manual Mine button exactly (pack entry surface when
     in-pack, else the tapped token), reading/gloss from the pack card
     fields (aux glosses never masquerade), `source_citation = story_id`,
     `context_sentence_id = sentence_id`. Idempotent: a repeat tap folds
     into the original row and its SRS anchor (K-61/K-14 rule).
- `WordCardView` gains `in_review: bool` — true once the word lives in the
  review pipeline. Frontend copy shows "In My words" without any claim.
- `MinedItemView` gains `context_sentence_id` + `context_sentence`
  (resolved via `pack_sentence_text` against the active pack; None = the
  drill falls back to bare display, honest).

## Frontend (apps/desktop/src)

- `reading.tsx`: `WordCardView.in_review`; the card shows an
  "In My words" state beside the still-working Mine button.
- `App.tsx`: `openStoryWordCard` passes `storyId: storyActive.id`
  (guard: no active story, no call). My-words drill: when an item carries
  `context_sentence`, show it and offer PLAY via the existing
  `story_audio` sentence path — the drill replays the original context
  sentence (Kindle flashcard behavior).

## Gates (lane tier)

- `cargo fmt --all --check`
- `cargo test -p lts-storage -p lts-desktop` (+ new: lookup log appends,
  cascade, migration v8, context fold; desktop: word_card logs+mines,
  repeat tap anchors, off-pack lookup also logs/mines, bad story id
  refused; export v5 round-trip + v4-bundle import)
- `cargo clippy -p lts-storage -p lts-desktop --all-targets -- -D warnings`
- `npx tsc --noEmit`, `npx vitest run` (reading.tsx + storage wire + App
  wiring)
- desktop env caveat: 34-37 ja-pack failures are the sibling pack lane's
  uncommitted manifest WIP — compare failure SETS against the pure-HEAD
  baseline (see state/evidence/ERR-SRS-LOOP-001/gates.log).
