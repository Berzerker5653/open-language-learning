# SETTINGS-PACK-CAPABILITY-001 — evidence note

**Status: implemented and verified (desktop + host read path).** 2026-11-06.

## What was built

The "Kana keyboard (in-app)" settings card now exists **iff the active pack's
own manifest grants it**, via a minimal capability read path:

1. **Host (`apps/desktop/src-tauri/src/packs.rs`)**: `InstalledPack` gained
   `scripts: Vec<String>`, read verbatim from the installed pack's
   `manifest.yaml` `scripts:` list in `display_for()` (absent/unparseable
   manifest → empty list). The host never interprets the ids.
2. **Type (`apps/desktop/src/language.tsx`)**: `InstalledPack` mirrors
   `scripts: string[]` — "feature gates read these, never `locale`".
3. **Gate (`apps/desktop/src/ime.ts`)**: `packDeclaresInAppKanaKeyboard(scripts)`
   is true iff a declared script id's script name (last `.`-segment) is one the
   in-app converter can type (`IN_APP_KANA_KEYBOARD_SCRIPT_NAMES`:
   hiragana/katakana). A Japanese-locale-shaped pack declaring only
   kanji/latin grants nothing; a non-Japanese-locale pack declaring katakana
   grants the card. Empty list grants nothing.
4. **Plumb (`apps/desktop/src/App.tsx`)**: computes the boolean from the active
   installed-pack record and passes `packDeclaresKanaKeyboard` into
   `Settings`. No active pack → false.
5. **Render (`apps/desktop/src/settings.tsx`)**: the card is conditionally
   rendered on that prop — absent, not disabled, when ungranted.

No `lang === "ja"` / locale / pack-id check exists anywhere on this path
(grep of `settings.tsx`, `App.tsx` gate lines confirms: the only reads are
`activeRecord.scripts` → `packDeclaresInAppKanaKeyboard`).

## Acceptance proof

- **Criterion 1 (toggle absent for non-kana pack, present for kana pack):**
  - `apps/desktop/src/settings.test.tsx` — "shows the kana keyboard card iff
    the active pack declares a script the keyboard can type": static-markup
    render contains `Kana keyboard (in-app)` + `name="kana-keyboard"` for the
    verbatim ja-JP manifest scripts, and **neither** for the verbatim ru-RU
    scripts (`ru.orth.cyrillic`); a third case proves the grant is not
    language-bound (`ryu.orth.katakana` → true, `ja.orth.kanji/latin` → false).
  - `apps/desktop/src/journeys/kana-card-gating.journey.tsx` — whole-app
    journey: profile on the kana pack sees the card in Settings; profile on the
    Cyrillic pack sees no heading and no `[name="kana-keyboard"]` node, while
    Settings itself stays alive ("Profile data" present).
  - `apps/desktop/src/ime.test.ts` — 4 cases pinning the gate function itself
    against both reference manifests plus empty-declaration.
  - `apps/desktop/src-tauri/src/packs.rs` test
    `manifest_scripts_travel_with_the_installed_pack_view` pins that the
    manifest `scripts:` ride to the renderer (kana pack → hiragana+katakana,
    Cyrillic pack → cyrillic, no manifest → empty).
- **Criterion 2 (gate reads pack-declared manifest `scripts:`, never a
  hardcoded language code):** the gate input is `InstalledPack.scripts` sourced
  from `manifest.yaml`; the gate matches on script names, and the tests assert
  locale-independence in both directions. The spec (`docs/04_LANGUAGE_PACK_SPEC.md`)
  already lists "declared scripts" as pack manifest content — no spec change needed.

## Gates run (honest outputs)

| Gate | Result |
|---|---|
| `pnpm typecheck` (apps/desktop) | clean (exit 0) |
| `pnpm test` (apps/desktop) | **45 files, 324/324 passed** — includes this task's 7 new tests (4 gate-fn in ime.test.ts, 1 iff-render in settings.test.tsx, 2 in kana-card-gating.journey.tsx) |
| `cargo test --lib packs` (src-tauri) | 29 passed, 1 failed — the failure is `russian_contrast_arrives_as_the_packs_own_pair` (ru-pack build validation, `"voice" is a required property`, lib.rs:9264). **Verified pre-existing: fails identically with my packs.rs change stashed** — belongs to the ru-pack audio lane, not this card. My Rust test `manifest_scripts_travel_with_the_installed_pack_view` passes standalone. |
| `npx prettier --check` all 10 touched TS/TSX files | clean |
| `npx eslint` all 10 touched TS/TSX files | clean |
| `cargo fmt --check` packs.rs | clean |
| `python3 tools/audit_learner_copy.py` | **0 findings** (51 source files scanned) |

## Owner-rule check

No learner-facing string names the ticket or any internal concept: the card's
text is unchanged from before (only its presence is gated); ticket ids appear
only in code comments and this note.

## Concerns

- Pre-existing failing Rust test `russian_contrast_arrives_as_the_packs_own_pair`
  on main (ru pack `voice` schema mismatch) — needs the audio/pack lane to fix;
  untouched here.
- The renderer interprets which script names the in-app keyboard can serve
  (`IN_APP_KANA_KEYBOARD_SCRIPT_NAMES`); a future keyboard for another script
  adds its own gate module — deliberate separation (pack declares, module
  interprets), called out in the ime.ts doc comment.
