# REVIEW-ONLY evidence — ARCH-HOTSPOT-001

- Date: 2026-11-24
- Files scanned: the four 14-day hot files (git log --since='14 days ago'):
  apps/desktop/src-tauri/src/lib.rs (37), packages/ui/src/styles.css (36),
  apps/desktop/src/App.tsx (34), apps/desktop/src/home.tsx (28)
- Line counts at scan: lib.rs 23,241; styles.css 3,170; App.tsx 5,287; home.tsx 1,886
- Method: 5-line-block frequency scan + manual read of top clusters + prior
  ARCH-HOTSPOT-2026-11-23 scan (state/evidence/ARCH-HOTSPOT-2026-11-23/scan.md).

## Hotspot picked: App.tsx settings-save wrapper duplication
Top clusters (block count, first line):
- 6x `} catch (e) {` near 2196, 3424, 3712
- 5x `markSettingsSaved();` near 2195
- 4x `} catch (e) {` near 3285
Actual named handlers sharing the shape: setMicSetting (2190), pickMicrophoneSetting
(2201), pickPlaybackSetting (2212), setRomajiSetting (2225), setKanaKeyboardSetting
(2238), plus stress-mark/grammar-label saves at 2049-2087 with legacy message-formatting.
Duplicate body line count: ~10-14 near-identical ~10-line async wrappers; three drift
points (generic String(e) vs 'The <name> setting could not be saved: ...', guard style,
markSettingsSaved() presence).

Decision: NO code diff this pass. App.tsx/styles.css/home.tsx are all dirty in the
working tree with sibling WIP; staging them would sweep another lane's half-finished
work. lib.rs (a smaller, cleaner candidate) is 46% inline tests (line 12059+) with ~9x
duplicated tempfile/install_ru_shaped_pack boilerplate — a structural refactor that
exceeds one small diff. Note filed at state/notes/ARCH-HOTSPOT-001.md with
file:line evidence and numbered recommendations.

## Gates
Review-only lane: no code diff, so no lane gates required. Frontend untouched.

## Working tree state (sibling WIP, untouched)
M apps/desktop/src/App.tsx, home.tsx, home.test.tsx, styles.css, journeys/*, onboarding.tsx, path-view.test.tsx + untracked sibling evidence dirs (PATH-CONNECT-PILL-001, RU-CONTENT-FREEZE-047-001, RU-STORIES-MEDIA-001). Reported, never reverted/touched.
