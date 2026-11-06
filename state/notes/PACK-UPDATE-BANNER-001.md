# PACK-UPDATE-BANNER-001 — the banner's "installed version" fact

## Measured bug (2026-10-21, from the task card)

Hub status line read "Japanese Reference Pack version 0.2.0 is on this device"
while the store held 0.2.0/0.2.1/0.4.2/0.4.3, the store `current` pointer was
0.4.2, and the active profile selected 0.4.3.

## Root cause

Two independent defects compounded:

1. `packs::installed_packs` (apps/desktop/src-tauri/src/packs.rs) returned one
   row per `pack_installations` row — one per installed *version*. The
   catalogue join in `catalog_view_with` used `find(|i| i.pack_id == e.pack_id)`,
   which kept the first row (ordered by installed_at/version) — the lowest
   installed version. That is what crossed IPC and drove the Home/hub/Settings
   banner (App.tsx derives `packUpdates` from the `catalog_packs` entries;
   language.tsx joins the same entries per row).
2. `lts_langpack::archive::install_with_cancel` writes `current` to whatever
   version it unpacks — unconditionally, including an older one. So installing
   an older catalogue version silently downgraded the pointer, which is how
   such a store drifts in the first place.

## Fix (all in the Rust fact layer, packs.rs)

- **`installed_version_for(data, profile_id, pack_id)`** — one resolver for the
  "version X is on this device" fact, in this order:
  1. the profile's selection, when it names an installed version;
  2. with no profile context (`None`, what the `catalog_packs`/`installed_packs`
     commands use): the selection only if *all* profiles that selected this
     pack agree on it — the only reading of "the profile" that keeps Home, hub
     and Settings on one fact; on disagreement fall back to the pointer, which
     is the version the pack engine actually reads content from;
  3. the store `current` pointer, when that version is installed;
  4. otherwise the highest installed version (never the lowest).
- `installed_packs` now returns exactly one row per pack at that resolved
  version, so the join cannot pick the lowest row.
- `catalog_view_with` delegates to `catalog_view_profile_with(data, url,
  profile_id)` and the join uses the resolver. `catalog_packs` (lib.rs) keeps
  its profile-less signature (out of this card's file boundary); the
  consensus/pointer rule gives it the same fact the profile path derives in the
  single-profile case.
- **Pointer behavior (acceptance 3) — chosen: move only when newer.**
  `install_pack_bytes_report` captures the `current` pointer before unpacking
  and, if the unpacked version is not semver-newer, restores the pointer to the
  previous version via `archive::rollback(.., Some(previous))`. The install
  itself still succeeds: the older version lands on disk (available for an
  explicit selection) and is recorded, but the learner-visible "on this device"
  fact never regresses under anyone's feet. A refusal was rejected because it
  blocks content and the only way to reach an older version is a stale
  catalogue pin; a test pins the chosen behavior. If the restore fails, the
  previous version's directory is gone — pointing at the freshly installed
  version is then the only pointer that resolves, so nothing more honest is
  possible.
- Version comparison uses `lts_domain::SemVer` (already re-exported from the
  domain crate; src-tauri depends on lts-domain, so no Cargo.toml change). A
  version that fails to parse is treated as *not newer* — the pointer only
  moves when the new version is provably newer. Pack versions are semver by
  manifest schema, so that is a defensive fallback, not an expected path.

## Learner copy

No new learner-facing strings were added. The hub sentence
("version X is on this device. The pack catalogue lists version Y.") is
unchanged; only X's derivation is fixed. `tools/audit_learner_copy.py` stays
at 0 findings.

## Tests (apps/desktop/src-tauri/src/packs.rs)

- `installing_an_older_version_does_not_downgrade_the_current_pointer` —
  installs 0.2.0 → 0.4.3 → 0.2.1: pointer ends 0.4.3 (never moved down),
  0.2.1 still on disk and recorded, `installed_packs` shows one row at 0.4.3.
- `the_installed_fact_is_the_profile_selection_then_the_current_pointer` —
  installs 0.2.0/0.4.2/0.4.3; no selection → fact = pointer (0.4.3, not 0.2.0);
  profile selects 0.4.2 → fact = 0.4.2 for that profile and via the catalogue
  join; disagreeing profiles → fall back to pointer.

## Gates

`cargo test --workspace --locked`, `tools/audit_learner_copy.py`,
rustfmt/clippy on touched file. TS untouched (hub.tsx needed no change — its
copy already renders the derived fact).

## Concerns / follow-ups

- `catalog_packs` has no profile argument, so with multiple profiles selecting
  different versions the wire join uses the pointer (engine truth) rather than
  the active profile's selection. Making the wire join strictly per-active-
  profile needs a profile_id pass-through in lib.rs + App.tsx (outside this
  card's file boundary); `catalog_view_profile_with` is ready for that wiring.
- The bundled-pack install path (`install_bundled_pack_report`, lib.rs) calls
  `archive::install` directly and could in principle move a pointer down, but
  bundled packs are pinned at build time (one version each), so no learner
  path reaches that today.
