# IME-TOGGLE-UX-001 — in-app input keyboard: script-agnostic toggle + input-mode bubble

## What shipped

1. **Shortcut (acceptance 1).** `Ctrl+Shift+K` (`Cmd+Shift+K` on macOS) flips the
   active pack's in-app keyboard from any in-app screen without opening
   Settings. The handler lives on `window` in capture phase (App.tsx), so a
   focused in-app-keyboard field can never eat the chord; `useKanaIME`
   additionally stands down for any modified key, so the chord never leaks a
   letter into a buffer. It writes the same per-profile setting Settings shows
   (`set_kana_keyboard`) — one value, one write path — and it no-ops (not
   even preventDefault) while the active pack declares no in-app keyboard.
   Documented here, in `docs/11_ACCESSIBILITY_AND_LOCALIZATION.md` ("In-app
   input keyboard"), and surfaced in-app via the bubble's title.

2. **Bubble (acceptance 2).** `InputModeBubble` (kana-ime.tsx) is rendered by
   App.tsx inside the `AppShell` on every in-app route (fixed position via
   `.input-mode-bubble` in `@openlang/ui/styles.css`), and is present **iff**
   the active pack's declared `scripts:` resolve to a registered converter
   (SETTINGS-PACK-CAPABILITY-001 plumbing reused: `InstalledPack.scripts`).
   Its label is composed by `inputModeLabel` from the pack's own declared
   script ids (last segment: `ja.orth.hiragana` → "hiragana") plus converter
   data (`sourceName`: "romaji") — no language literal anywhere in the UI.
   Clicking it performs the same setting flip. The mode text sits in a
   `role="status" aria-live="polite"` region so mode changes announce
   (A11Y-FLOW-001 semantics). It renders last in content order so a route's
   own status announcements stay the page's first status region.

3. **Generalized input layer (acceptance 3).** `ime.ts` now holds a
   script-keyed converter registry (`ScriptKeyboardConverter` +
   `IN_APP_KEYBOARD_CONVERTERS`); the kana converter (issue #2 phase 1) is
   the single instance. `inAppKeyboardForScripts(scripts)` resolves the
   keyboard from pack-declared capability + mapping data; a pack whose
   scripts no converter serves resolves `null` — no keyboard, no bubble,
   dead shortcut. Adding another script's keyboard = one registry entry (its
   own mapping module) + pack content; no language branch in engine or UI
   (pinned by a structural test in `ime.test.ts` that fails if a quoted
   language/script literal ever appears in App.tsx or kana-ime.tsx).
   `useKanaIME` takes an optional `converter` so a future panel can type a
   different script without touching this hook's contract.

## Setting key decision

The per-profile storage key stays `kana-keyboard` (Rust `get/set_kana_keyboard`,
export bundles). The task allows a rename; it was **not** done because the key
lives in `apps/desktop/src-tauri` (outside this task's file boundary) and in
restored-profile bundles. The stored *value* is now defined as the converter
id — phase 1's mode `"romaji-kana"` is exactly `ROMAJI_KANA_CONVERTER.id` —
so the setting selects a converter, not a language. A future rename
(`input-keyboard`) is a storage-engine task.

## Evidence / tests

- `apps/desktop/src/ime.test.ts`: registry resolution (ja manifest grants;
  ru-RU Cyrillic resolves nothing; a `ryu.orth.katakana` pack gets the same
  converter — the gate reads scripts, never language), label derivation
  (`ja.orth.hiragana+katakana` → "romaji → hiragana · katakana"; a
  hypothetical `xx.orth.katakana` pack → "romaji → katakana"), plus the
  no-language-literal structural test.
- `apps/desktop/src/journeys/ime-mode-bubble.journey.tsx`: bubble present on
  every route with the pack's metadata words in its label; Ctrl+Shift+K from
  the Today route writes `set_kana_keyboard romaji-kana` and romaji typing on
  My Words lands as kana; the chord pressed inside a focused field flips back
  and types nothing; bubble click flips and the `[role="status"]` text
  changes; ru-RU fixture: no bubble, chord no-ops, no setting written.
- Gates: apps/desktop `pnpm typecheck` clean; `pnpm test` 46 files / 335
  tests green; prettier + eslint clean on touched files;
  `tools/audit_learner_copy.py` 0 findings.

## Known limits

- Phase 1 registers only the kana converter; panels still type the boolean
  `kanaInput` gate (App resolves it from pack + setting), which is honest
  while the registry has one entry.
- The chord's letter is matched by `key`/`code`, not a layout-dependent
  binding table; fine for phase 1.
