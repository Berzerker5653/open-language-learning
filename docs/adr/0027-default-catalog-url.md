# ADR 0027: Default catalog URL for released builds

Status: Accepted — the owner directed the public flip of the app and the packs
in-chat 2026-10-13; the compiled-in fallback is an agent decision within spec bounds.
Date: 2026-10-13

## Context

The pack catalog the app fetches was configured only through the
`LTS_PACK_CATALOG_URL` environment variable (`apps/desktop/src-tauri/src/packs.rs`),
and nothing in the repository set it: not `scripts/tauri-env.sh`, not
`scripts/launch-preview.sh`, not the bundle. The feature-gap audit
(`state/notes/FEATURE-GAP-AUDIT-2026-10-08.md`, item D8) recorded that as an
honest-but-inert surface — correct while no pack archive was published anywhere
(owner gate O-05). That precondition no longer holds: `catalog/packs.json` is
maintained in this repository, reference packs are published as GitHub release
assets, and the public alpha's only content path for a new user is
Languages → Community catalog. A user who installs the published `.deb` today
sees "Community packs are coming soon — this build has no catalog configured
yet" and cannot obtain any language content at all.

Options on the table: keep env-only configuration and tell users to export the
variable; bundle the packs inside the app (the resources-overlay route, +~300 MB
per artifact); or compile in a default catalog URL.

## Decision

Compile a default into the desktop app:
`apps/desktop/src-tauri/src/packs.rs::DEFAULT_CATALOG_URL` =
`https://raw.githubusercontent.com/Berzerker5653/open-language-learning/main/catalog/packs.json`.
`catalog_view()` uses it when `LTS_PACK_CATALOG_URL` is unset; an explicit value
wins, including an explicit empty string, which keeps the "no catalog" state
reachable for offline, kiosk or third-party builds. `catalog_view_with()` stays
environment-independent so the honest-status behaviour
(`live` / `cached` / `no-catalog-url` / `offline-cached` / `offline-no-cache`)
remains testable without mutating process environment, and
`catalog_url_from()` pins the precedence rule.

The catalog file itself, the archive hashes it pins and the release assets behind
it stay owner-published artifacts (O-05); this ADR only decides what the app
requests when nobody told it otherwise. Everything else about the install path is
unchanged: https + GitHub release hosts enforced by `validate_entry`, pinned
SHA-256 and size, and the same content-validation gate as bundled packs.

## Consequences

A public-alpha install has content on first launch with zero configuration, which
is what makes the alpha's stated install route ("install a pack from the in-app
catalog") true. The app now has a project-specific network default, so moving the
repository or the catalog file invalidates it — the default is one constant, the
env override stays available, and the failure mode is an honest
`offline-no-cache` status rather than a wrong install. Because the default points
at `main`, editing `catalog/packs.json` changes what released builds fetch without
any rebuild: the catalog file therefore carries the same weight as shipped code
(its hashes are what the app verifies), and a bad entry is a shipping defect.
Follow-up: if a second distribution channel appears, the default moves to a
per-variant build config instead of a constant.

Verification: unit test
`the_published_catalog_is_the_default_and_explicit_config_overrides_it` pins
default-when-unset, empty-string-disables, and explicit-value-wins. The rebuilt
`org.openlanguage.ja-jp.reference` 0.4.0 and `org.openlanguage.ru-ru.reference`
0.4.0 archives were installed through `langpack install` against a clean store
with this gate in place, and the previously published ja-JP 0.3.0 archive was
confirmed rejected by it (561 lexicon errors), which is why the catalog entry was
moved to 0.4.0 rather than left in place.

## Alternatives considered

- **Env-only configuration (status quo).** No code change and no vendor default,
  but it puts a shell-environment step in front of every non-technical alpha
  user's only content path; rejected because the precondition that made it
  acceptable (nothing published) is gone.
- **Bundle the packs in every artifact**
  (`scripts/stage-pack-bundle.sh` + `dist/variants/tauri.pack.json`). Works
  offline and was already demonstrated, but inflates each artifact by roughly
  300 MB, freezes the pack at build time, and would need a rebuild for every pack
  repair — the 510 transliteration fixes in this cycle are exactly that kind of
  change. Kept as the offline/embedded variant it already is.
- **Ship the default only in release builds via build configuration.** Slightly
  less surprising for contributors running dev builds, but Tauri config
  layering cannot set a Rust-side env default reliably at the point the code
  reads it, and the difference between dev and release behaviour here buys
  nothing.
