# PACK-BUNDLE-RU-001 — the certified Russian pack is not in the app bundle

## Found (2026-11-08, controller UX test on a clean data dir)
A brand-new install's onboarding "Available packs" lists only
Japanese Reference + Esperanto demo. Russian Reference — the pack with
4,856/4,856 human-certified clips (PACK-AUDIO-VERIFICATION-001) and
word-level karaoke timings (WORD-TIMING-001) — is offered nowhere:
- `dist/variants/packs/resources/packs/BUNDLED.yaml` lists only
  org.openlanguage.ja-jp.reference and org.openlanguage.eo-demo.
- docs/13 Release recipe calls `scripts/stage-pack-bundle.sh stage`
  with no `--locale`, and the script's default locale is ja-JP.
Catalog installs still work (catalog lists ru 0.4.2), but the fresh
onboarding flow — the only flow a new learner sees — never offers it.

## Contract
1. Staging: both reference packs staged into the bundle resources set
   (`stage --locale ja-JP` AND `stage --locale ru-RU` in docs/13 and any
   release recipe); BUNDLED.yaml ends with both entries.
2. Fresh-install check: with an empty data dir, onboarding shows the
   Russian Reference Pack row (Install button), selecting + installing
   it succeeds and creates the profile.
3. Honest overlay: `overlay` re-validates every staged pack incl. ru
   (media pairing gate over 4,856 clips).

## Deliberate limits
Bundle size grows (~320 MB more, 117 MiB AppImage grows accordingly);
owner already ships both packs in the catalog, so this is parity, not
new content. eo-demo + ja-demo stay bundled as demos.
