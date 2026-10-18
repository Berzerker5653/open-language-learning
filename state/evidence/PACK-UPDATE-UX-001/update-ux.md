# PACK-UPDATE-UX-001 — the update is visible without opening the pack panel

Run on GamingPC, 2026-10-17. Every number below was measured in this working tree.

## What changed

One installed-pack record now feeds Home, the practice hub and the onboarding wizard.

- `apps/desktop/src/App.tsx` — the parallel `installedPacks: string[]` state was
  deleted; the single source is `installed: InstalledPack[]` (`:320`), filled by
  `refreshInstalled()` (`:931-942`), which returns the records it read or `null`
  when the read failed. Boot gained its own `catalog_packs` read in a separate
  `try` (`:849-858`) because `catalog` is otherwise empty during the wizard.
  `updateFromCatalog(id)` (`:947-972`) calls the same `install_catalog_pack`
  command the Settings panel uses, then re-reads installed packs and the
  catalogue; `install(id)` re-checks via `refreshInstalled()` instead of
  inventing an installed record — `install_pack` returns a `PackCandidate` with
  no `version` (`apps/desktop/src-tauri/src/lib.rs:422-432`). The derived block
  (`:2840-2867`) joins `available_version` onto the wizard rows from `catalog`
  and derives `packUpdates` purely from `catalog`: an entry with a non-null
  `installed_version` that differs from `version`.
- `apps/desktop/src/onboarding.tsx` — `installed: InstalledPack[]` replaces
  `installedPacks: string[]`; `PackCandidate.available_version?` carries the
  catalogue version. A stale row states both versions and renders an
  `Update to v…` sibling button next to the unchanged `Install`/`Installed`
  button. `onUpdatePack` is a required prop: a row that can be stale must always
  have a working control.
- `apps/desktop/src/home.tsx` — exported `PackUpdate` type (`:134-144`) plus a
  `role="status"` notice (`:213-229`) listing every stale pack, with a
  `Review pack updates` button that routes to Settings.
- `apps/desktop/src/hub.tsx` — the same notice (`:94-110`) from the same type,
  so the hub and Home cannot disagree.

Version prose renders both facts and never says newer, latest, out of date or up
to date, and it never claims learner progress survives an update. `Continue` is
never disabled because of a version mismatch — that would manufacture the dead
end the card forbids.

## Acceptance criterion 1 — told without opening the pack panel

The notice is derived in `App.tsx` from `catalog_packs` and rendered on Home and
the hub, neither of which requires opening Settings ▸ Language packs. The wizard
states the on-device version and the listed version per row. Tests:
`apps/desktop/src/home.test.tsx` (installed 0.4.0, listed 0.4.1 → both versions
rendered; no-`updates` case renders neither version string),
`apps/desktop/src/hub.test.tsx` (same pair, plus the open handler),
`apps/desktop/src/onboarding.test.tsx` (three cases: stale row states both
versions and offers `Update to v…` while `Installed` stays disabled; matching
versions state both with no `Update`; a `null` catalogue version states only the
on-device version and no version comparison).

## Acceptance criterion 2 — re-verified against the new pin, old bytes kept

The frontend update path calls `install_catalog_pack`
(`apps/desktop/src-tauri/src/lib.rs:495-499`), which downloads through the
pinned path that re-verifies size and digest against the catalogue entry
(`apps/desktop/src-tauri/src/packs.rs:846-900`, `let pinned = entry.size_bytes`).
The keep-the-previous-version invariant is asserted by the existing engine test
`crates/langpack/tests/media_upgrade.rs:161
an_upgrade_swaps_the_media_in_force_and_keeps_the_old_bytes_for_rollback`
(`out_b.previous.as_deref() == Some("0.1.0")`). No engine code was changed for
this card.

## Acceptance criterion 3 — version-aware state tested

`onboarding.test.tsx` asserts installed `0.4.0` with catalogue `0.4.1` produces
the update state: the row is `Installed` and disabled, `Continue` stays enabled,
`Update to v0.4.1` is enabled, and clicking it calls `onUpdatePack` with the pack
id. The matching-version and no-catalogue cases are asserted in the same file.

## Acceptance criterion 4 — learner copy

No new learner-facing string names a ticket, ADR, migration or internal id.

```
$ .venv/bin/python tools/audit_learner_copy.py
LEARNER COPY AUDIT v1.0.0: 36 source files scanned, 22 test files skipped
findings: 0
```

## Commands run

```
$ cd apps/desktop && npx tsc --noEmit
TSC_RC=0                                   # zero errors

$ cd apps/desktop && npx vitest run
Test Files  29 passed (29)
     Tests  253 passed (253)               # was 29 files / 246 tests

$ .venv/bin/python tools/audit_learner_copy.py
findings: 0
```

Test-count delta measured per file (`git show HEAD:…` against the tree):
`onboarding.test.tsx` 15 → 18, `home.test.tsx` 25 → 26, `hub.test.tsx` 3 → 4,
`a11y.test.tsx` 10 → 10 — five new tests, no test deleted or weakened. The
journey harness needed no change: its `installed_packs` / `install_pack` /
`catalog_packs` cases already answer `InstalledPack` records
(`apps/desktop/src/journeys/harness.tsx:530-541`), and `first-run`,
`restart-resume` and `dup-install` all pass.

No Rust was changed, so `cargo test -p lts-desktop` was not re-run; the
attribution and catalogue surfaces it covers were verified at `45e4f7a`
(153 passed, 0 failed, 1 ignored).

## Not owner-verifiable here

`scripts/smoke-desktop.sh` cannot run on this machine: it fails with
`FAIL: 127.0.0.1:1420 is already bound` because the owner's running app holds
the Tauri single-instance lock. The visual check of the Home notice and the
wizard row in a real window is the owner's step.
