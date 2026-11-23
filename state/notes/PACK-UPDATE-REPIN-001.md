# PACK-UPDATE-REPIN-001

Incident (owner dogfood, 2026-11-22): clicking "Update to v0.4.9" in Settings
downloaded/installed 0.4.9 into the store (`pack_installations` row + the
`current` pointer flipped at 20:34) but `profile_pack_selections` stayed at
0.4.8. `installed_version_for`/`installed_packs` read the PROFILE selection
first, so the Settings card kept claiming v0.4.8 and the Update button stood
— the owner saw "nothing happened". Repeat clicks early-return
(`current_version == catalog entry`) with zero progress stages: silent
forever. Root: `install_from_catalog_report` never re-points selections.

The orchestrator hot-fixed the live profile manually via sqlite
(0.4.8 -> 0.4.9); this card makes the flow do it itself.

## Frozen contract
- After a successful catalog install of a NEWER version of a pack a profile
  already studies, the profile's selection moves to the new version
  (version-migration semantics).
- A fresh install never enrols a profile that does not study the pack.
- A selection never moves to an OLDER version (same no-downgrade rule as the
  store `current` pointer, pinned by PACK-UPDATE-BANNER-001).
- The early-return path (store already at the pin) must REPAIR a stranded
  selection — the already-stuck learner self-heals on the next click.
- The Settings card must re-render to "installed (vX)" with the Update button
  gone; capture asserts before/after on the real engine.

## Implementation (shipped)
- `apps/desktop/src-tauri/src/packs.rs`:
  - `repoint_profile_selections(data, pack_id, version)` — moves every
    profile selecting an OLDER version of this pack onto `version`;
    best-effort (the install already succeeded; the repaired early-return
    path retries a failed move).
  - Called on the success path of `install_from_catalog_report` (after
    `install_pack_bytes_report` lands the pin) and on its early-return path
    (self-heal for the stranded shape).
- Red tests first (in packs.rs tests):
  - `a_catalogue_update_moves_every_profile_onto_the_new_version` — full
    offline catalog-install path (complete resumable partial satisfies the
    fetch, same verification gate); RED before the fix with exactly the
    incident's symptom (`left: Some("0.4.8") right: Some("0.4.9")`).
  - `a_stuck_update_click_still_moves_the_learner` — the second-click
    early-return shape; RED before the fix.
- No frontend change needed: the card renders from the catalog join's
  `installed_version`, and `installCatalogPack` re-reads it after the call
  (App.tsx `refreshLanguages()`).

## Acceptance capture
`scripts/pack-update-repin-capture.mjs` (dev-only): serve mode over an
isolated data dir; installs the dev-tree RU pack (0.4.9), winds the store
back to the measured broken state (0.4.8 row + directory + stranded
selection), then drives the REAL app: Settings shows "Update to v0.4.9"; a
real browser click runs the shipped `install_catalog_pack`; the flow itself
must flip the selection (sqlite before/after) and re-render to
"installed (v0.4.9)" with no Update button. Screenshots + result.json in
state/evidence/PACK-UPDATE-REPIN-001/capture/.

Run recipe:
  cargo build -p lts-desktop --bin lts-serve --features serve
  SERVE_BIN=target/debug/lts-serve SERVE_DIST=apps/desktop/dist \
    node scripts/pack-update-repin-capture.mjs

## Controller close (attempt 2, 2026-11-23)
Attempt 1 died at the model layer after committing nothing; the lane was
verified and shipped by the controller. All gates re-run fresh
(state/evidence/PACK-UPDATE-REPIN-001/gates.log): fmt/clippy green, lib
suite 230/230 with both card tests measured by name, capture 7/7 PASS with
before/after pngs vision-confirmed. Three harness fixes to the capture
script (pragma-row pollution, catalog_packs returns .entries not .packs,
cardFacts anchored to the 'Community catalog' section instead of the first
of two .pack-list sections) — product flow untouched. red-test.log stands
as the red-first evidence (incident symptom left 0.4.8 / right 0.4.9).
