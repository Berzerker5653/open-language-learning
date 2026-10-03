# READ-001 — adaptive kana/furigana/romaji support

Date: 2026-10-03. Evidence: `state/evidence/READ-001/{cargo-test,ci}-2026-10-03.txt`.

## What was built

`crates/activity/src/reading.rs` — engine-level adaptive reader
implementing `docs/assessment/JA_ORTHOGRAPHY_POLICY.yaml` (JA-RES-003):

- `script_of`/`is_kana_only`: Unicode-block script classification.
- `ReadingItem`: canonical Japanese-script text (required) + kana
  reading + auxiliary romaji; `render_reading_display` asserts the
  canonical contains Japanese script (`canonical_form_rule`).
- `ReaderSettings`: `romaji_mode` (auto/always/off per `user_modes`),
  per-render `furigana_forced`/`romaji_forced` (on-demand reveals),
  `kana_literacy_established`.
- Adaptive rules: furigana auto-hidden at/above `HIDE_AT_STATE`
  (mirrors policy `hide_at_state: supported`; never on kana-only items
  per `furigana.never_on`); romaji auto-fades at/above the state for
  kanji items and with kana literacy for kana items (`auto_rules`);
  `always`/`off` user modes honored.
- Reveals are never blocked (`always_on_demand`) and attach
  `SupportAction::SuppliedReading` / `RomajiReveal` (level 3) to any
  attempt made with the display (`reveal_counts_as: support`), so
  supplied readings can never masquerade as unsupported decoding
  (docs/03 §5).
- `ReadingDisplay.canonical` is always the untouched Japanese-script
  form; romaji is a separate auxiliary field (`fade_is_not_removal`).

## Acceptance mapping

1. **Visibility responds to mastery/settings** —
   `reading.rs::visibility_responds_to_mastery` (scaffolds visible
   below `supported`, auto-faded at/above, no support recorded for
   auto-fade) and `visibility_responds_to_settings_and_kana_literacy`
   (user modes, kana-literacy fade, furigana never on kana items) and
   `on_demand_reveal_is_always_available_and_counts_as_support`.
2. **Canonical text remains Japanese script** —
   `canonical_text_remains_japanese_script`: canonical stays "私" with
   romaji shown; runtime assert rejects non-Japanese canonical.
3. **Reading evidence independent from listening/speaking** —
   `reading_evidence_is_independent_from_listening_and_speaking`: a
   reading attempt with revealed furigana+romaji records
   `supplied-reading`/`romaji-revealed` support, is not an independent
   success, moves only the reading dimension;
   comprehension-listening and production-speaking derive `unseen`
   (never polluted, so romaji state can never gate speaking/listening
   progression — `never_gates`).

## Verification

- `cargo test -p lts-activity`: 10 tests green (5 runtime + 5 reading).
- `cargo test --workspace`: 139 passed.
- `./scripts/ci.sh` exit 0 (fmt, clippy -D warnings, tests, web fmt,
  tauri smoke, python validator, 44 mutation tests OK).
- `--release-readiness` unchanged: expected owner blockers.

## Known limits

- Settings persistence (reader prefs in profile settings table) and the
  actual text-run rendering (per-kanji furigana spans) belong to the UI
  tasks (UX-002/M4-E2E); this task delivers the decision engine and
  evidence semantics.
- Per-kanji (not per-item) mastery granularity: current policy keys
  hiding on the item's reading state; finer kanji-level state is a
  future refinement.
