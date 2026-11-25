# ARCH-HOTSPOT-2026-11-25 — 14-day hot-file duplication scan (round 2)

Scope: same four hot files as ARCH-HOTSPOT-001 (lib.rs, styles.css, App.tsx, home.tsx).

## FIX SHIPPED: App.tsx — saveSetting helper

The five near-identical engine-backed settings handlers (setMicSetting,
pickMicrophoneSetting, pickPlaybackSetting, setRomajiSetting,
setKanaKeyboardSetting, lines ~2190–2252 at HEAD) now share one
`saveSetting<T>(cmd, args, apply)` helper: same guard (`!inv || !profileId`),
`setSettingsError(null)`, apply-then-markSettingsSaved, `setSettingsError(String(e))`.
Net -10 lines in App.tsx; no visual or behavior change. setStressMode /
setGrammarLabelsSetting keep custom error messages and were left alone.

Evidence: state/evidence/ARCH-HOTSPOT-2026-11-25/gates.log

## Not fixed (out of scope / risk)

1. lib.rs: ~46% inline mod tests (line 12059+) + repeated tempfile/
   install_ru_shaped_pack boilerplate (~9x). Structural split — deferred,
   per ARCH-HOTSPOT-001 note.
2. styles.css: remaining duplicate pairs (.session-summary ≡ .session-panel)
   still pinned by drill-feel.test.ts — pin-re-pin risk, not attempted.
3. home.tsx: no large duplicates found.
