# ARCH-HOTSPOT-001 — 14-day hot-file duplication / entanglement scan

Scope: hottest code files per board card (git log --since='14 days ago'):
- apps/desktop/src-tauri/src/lib.rs — 37 touches, 23,241 lines (534 `fn`/`pub fn`-ish declarations, ~302 top-level `fn`, 104 `#[tauri::command]`)
- packages/ui/src/styles.css — 36 touches, 3,170 lines (see 2026-11-23 pass)
- apps/desktop/src/App.tsx — 34 touches, 5,287 lines
- apps/desktop/src/home.tsx — 28 touches, 1,886 lines

Method: line-level 5-line-block frequency scan over each hot file + manual read of the top clusters + grep of the 2026-11-23 ARCH-HOTSPOT scan (state/evidence/ARCH-HOTSPOT-2026-11-23/scan.md) for already-watched items.

## Concrete hotspot chosen: App.tsx — repeated settings-save IPC wrapper

apps/desktop/src/App.tsx has ~10-14 near-identical async settings handlers that all follow the same shape:
`if (!inv || !profileId) return; setSettingsError(null); try { setX((await inv("set_<...>", { profileId, ... })) as T); markSettingsSaved(); } catch (e) { setSettingsError(String(e)); }`

Evidence (file:line):
- line 2190 setMicSetting (lines 2190-2199; set_microphone_enabled)
- line 2201 pickMicrophoneSetting (lines 2201-2210; set_microphone_device)
- line 2212 pickPlaybackSetting (lines 2212-2224; set_playback_device)
- line 2225 setRomajiSetting (lines 2225-2237; set_romaji_mode)
- line 2238 setKanaKeyboardSetting (lines 2238-2252; set_kana_keyboard, note the slightly different guard `profileId === null`)
- lines 2049-2087: stress-mark and grammar-label saves with legacy message-formatting (`The <name> setting could not be saved: ...`) — the two drift points
- lines 2322/2333/2350/2369/2405: exportProfileData / previewRestore / confirmRestore / confirmProfileDelete / switchProfile — separate per-action shapes (not settings saves), noted for boundary

The repeated shape is a copy-paste primitive with three drift points (error message text varies: generic `String(e)` vs. `The <name> setting could not be saved: ...`; some set markSettingsSaved(), at least one does not via line 2149 fails-join path; each re-derives `const inv = detectInvoke(); if (!inv || !profileId) return;`).

Small diff NOT committed: App.tsx is dirty in the working tree with sibling WIP (uncommitted changes from concurrent lanes), so any `git add` would sweep another lane's half-finished work into this commit. Same for home.tsx and styles.css (sibling WIP). Per the lane protocol, the safe move is a note, not a diff.

## Secondary observations (not fixed)

1. lib.rs entanglement: 10k+ lines of inline `mod tests` (starts line 12059, file ends 23241 — ~46% of the file is tests). Duplicated test boilerplate: `tempfile::tempdir().unwrap()` + `install_ru_shaped_pack(data)` blocks repeated ~9x (lines ~12768-12770, ~13505, ~13653, ~17932, ~16107). Also ui_style/microphone command surface is flat: 104 tauri commands with no grouping. This is a structural entanglement; fixing it is a multi-file refactor, out of scope for one small diff.
2. styles.css: 2026-11-23 pass merged two verbatim stack-list pairs (a844f3e8). Watch list from that scan still applies (`.session-summary` ≡ `.session-panel`, both pinned by drill-feel.test.ts:77; `.plan-list > li` ≡ `.place-list > li`; `.word:focus-visible` redundant re-declare at 1656). Not re-attempted in this pass (sibling WIP in the file + pinned-selector risk).
3. home.tsx: no large duplicate blocks found (cleanest of the four); 28 touches but mostly small additive changes. No action.

## Numbered recommendations

1. SMALL (safe as a dedicated small commit, needs App.tsx WIP to settle first): extract a single `saveSetting(key, args, apply)` helper in App.tsx and collapse the ~10-14 settings handlers onto it. One helper + mechanical call-site rewrites; no visual or behavior change.
2. MEDIUM: split the inline `mod tests` in lib.rs (line 12059+) into a `crates/`-adjacent test module or a `tests/` integration file; start with the tempfile/install_ru_shaped_pack boilerplate factory (~2 functions) to cut the duplication.
3. LOW (deferred): re-attempt the styles.css `.session-summary`/`.session-panel` merge once the drill-feel.test.ts ruleBody pins are re-pinned to a shared class — needs the card to name the pin change, per the prior scan.
