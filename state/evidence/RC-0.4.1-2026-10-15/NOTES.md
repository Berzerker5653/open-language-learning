# 0.4.1 release candidate built from the tracked tree — nothing published

Owner-authorized *preparation*: the version bump now lives on the tracked tree as a
reviewable diff, the archives are built from it, and the difference against the
published 0.4.0 archives is accounted for member by member. No tag, no upload, no
catalogue edit, no ADR status change.

Reproduce with `./state/evidence/RC-0.4.1-2026-10-15/build-rc-0.4.1.sh` then
`./state/evidence/RC-0.4.1-2026-10-15/account-040-041.sh` (the second re-downloads
the published archives unless a pin-verified copy already sits in `dist/rc-0.4.1/published/`).
Logs: `SUMMARY.txt`, `state.txt`, `rc-*.txt`, `published-*.txt`, `diff-*.txt`.

## Exact state that was built and validated

| item | value |
|---|---|
| `HEAD` | `fd767860038f7a43b522ee565df1e45a20c5270c` (equals `origin/main`) |
| tracked diff | `languages/ja-JP/manifest.yaml:4` and `languages/ru-RU/manifest.yaml:4`: `0.4.0` → `0.4.1` (`version-bump.patch`, 2 lines total) |
| added test | `crates/langpack/tests/media_upgrade.rs` (3 tests, this change) |
| pack manifests | ja `sha256` of `manifest.yaml` after the bump, recorded in `state.txt` with `content_license: "CC-BY-SA-4.0"`; ru unchanged licence, version bumped |

Every 0.4.0 reference in the repo was inspected before deciding what to change.
Changed: the two pack manifests. Left alone, with the reason:

| reference | why it stays |
|---|---|
| `catalog/packs.json:18-19,34-35` | describes the **published** 0.4.0 artifacts; the licence field was left at `CC-BY-4.0` deliberately by the owner (`state/evidence/LIC-002/owner-decision-O-01a-2026-10-13.md:49-51`). It changes only when a 0.4.1 entry is actually published. |
| `apps/desktop/src-tauri/src/packs.rs:1124,1165-1166` | live-install test; expected versions come from the catalogue pins, not from the tracked manifests |
| `apps/desktop/src-tauri/src/packs.rs:925` | historical download-URL fixture |
| `apps/desktop/src/journeys/harness.tsx:113`, `pack-install.journey.tsx:59,61` | journey fixtures (fake catalogue rows), historical by design |
| `README.md:13-21`, `SECURITY.md:57`, `docs/13:413-478`, `docs/adr/0027`, `catalog/preview-entries.json`, `docs/assessment/RELEASE_COVERAGE*.yaml`, everything under `state/evidence/` | statements about already-published artifacts or dated measurements |
| `.gitignore:28-50` | ADR-0032 exception block, removed only after replacement distribution is published and verified |

## Artifacts (gitignored under `dist/rc-0.4.1/`)

| pack | bytes | sha256 | members | `media/` members | git-tracked audio present |
|---|---|---|---|---|---|
| `ja-jp-reference-0.4.1.lpk` | 318,721,333 | `7d9c70453e0469d8dc4e53eda27b5f4eafdfee443d2e3f4e2406d5b6238db460` | 5,864 | 4,903 | 8 of 8 |
| `ru-ru-reference-0.4.1.lpk` | 318,489,935 | `9eb074fa8d59f508108bc0fa8c698e1ddbd7458648ee2d829edeb36fbcfc1d7a` | 5,788 | 4,857 | 10 of 10 |

The two shas are **identical** to the archives built earlier from a scratch copy
(`state/evidence/O-01B-2026-10-15/NOTES.md`), so the build is deterministic and the
tracked tree reproduces them exactly.

Pack gates — `validate`, `lint`, `test`, `audit-curriculum`, `audit-lexicon`,
`audit-licenses`, `audit-sources` — ran against the tracked pack directories:
14 invocations, all exit 0 (`rc-ja-JP-*.txt`, `rc-ru-RU-*.txt`).

Install round-trip (`langpack install <archive> --store <dir>`), both exit 0:

```
store: dist/rc-0.4.1/store-ja-JP/org.openlanguage.ja-jp.reference/0.4.1
       current → 0.4.1, installed media files 4,902
store: dist/rc-0.4.1/store-ru-RU/org.openlanguage.ru-ru.reference/0.4.1
       current → 0.4.1, installed media files 4,856
```

## Published 0.4.0 versus candidate 0.4.1, member by member

Both published archives were re-downloaded and match their catalogue pins exactly
(size **and** sha256, `published-ja-JP.txt`, `published-ru-RU.txt`).

| pack | members 0.4.0 | members 0.4.1 | byte-identical members | same path, different bytes |
|---|---|---|---|---|
| ja-JP | 5,846 | 5,864 | 5,840 | **6** |
| ru-RU | 5,767 | 5,788 | 5,761 | **6** |

The complete lists are in `diff-ja-JP.txt` / `diff-ru-RU.txt`. Exactly six paths
changed bytes in each pack, all of them text or metadata — ja: `manifest.yaml`,
`media/manifest.jsonl`, `licenses.jsonl`, `README.md`, `grammar/concepts.jsonl`,
`language/pragmatics.yaml`; ru: `manifest.yaml`, `media/manifest.jsonl`,
`grammar/concepts.jsonl`, `curriculum/goals.yaml`,
`curriculum/units/010-cyrillic-a-o-m-t.yaml`, `world/environments.jsonl`. No
`media/*.wav` other than the new journey assets appears in any of the three sets.
The added lists carry the new content of this cycle: **8 new ja audio files and 10
new ru audio files** (the tracked journey assets), new curriculum units (the `810`
to `825` band files), new scenario files, `sentences/journeys-2026-10-14.jsonl` and
`review/WORKLIST-2026-10-14.md`. Nothing was deleted: taking the `removed` lines
(`24`/`15` for ja, `27`/`17` for ru) minus the six changed paths leaves **0** members
present in 0.4.0 and absent from 0.4.1 in both packs — every removed line is the
superseded hash of a path that still exists.

### Which audio changes touched file bytes, and which were manifest metadata

- **File bytes:** only the 18 journey assets are new audio. **No existing audio file
  changed**: across both archives 11,601 members are byte-identical and not one
  pre-existing `media/*.wav` appears in the changed or removed sets. There was no
  loudness rewrite — the claim that 5,270 ja / 3,899 ru files had been re-normalized
  is **retracted** here; the real measurement is
  `state/evidence/AUDIO-NORMALIZATION-2026-10-15/NOTES.md` (the synthesis path
  `scripts/generate-pack-audio.py::normalize_wav` already normalizes; all 18 tracked
  assets measure conforming, `rows updated=0`, `git status languages/` empty).
- **Manifest metadata:** `media/manifest.jsonl` grew by the new rows only
  (ja 3,315,477 → 3,322,502 B; ru 3,808,971 → 3,817,890 B); every pre-existing row
  keeps its `sha256`, which is what the byte-identical members confirm.
- **Licence metadata, measured:** the published ja `manifest.yaml` is 769 B
  (sha `57efd5ffe10f`), the candidate's is 772 B (sha `1532a0f0cdb7`). A three-byte
  growth matching the inserted `-SA` is consistent with docs/10:110 and
  `docs/13:472-478`: the **published 0.4.0 archive still carries
  `content_license: "CC-BY-4.0"`**, so a user installing today is told a weaker
  licence than the JMDict-derived content carries. That is the strongest factual
  argument for 0.4.1, independent of the new content.
- Size deltas against the pins: ja **+1,292,202 B**, ru **+1,873,593 B** — the same
  18 new files plus the metadata growth, not a mass rewrite.

## Can cached media silently mismatch a new manifest? No — and it is now pinned by a test

Store layout written by `archive::install` (`crates/langpack/src/archive.rs:271-360`):
`<store>/<pack_id>/<version>/…` plus a `<store>/<pack_id>/current` pointer file.
Install extracts to a staging directory inside the store, refuses unlisted entries,
symlinks and unsafe paths, caps decompressed size, verifies **every** member's sha256,
re-validates the extracted pack in `Mode::Install` (which runs `audit_media(true)`,
`crates/langpack/src/pack.rs:1020`), refuses an archive whose identity disagrees with
the pack manifest, then `remove_dir_all`s the destination version directory and
renames the staging dir into place. Media reads resolve through
`archive::current_version` (10+ call sites in `apps/desktop/src-tauri/src/lib.rs`), so
a stale version directory can never be read as if it were current.

New regression test `crates/langpack/tests/media_upgrade.rs` (this change):

```
an_upgrade_swaps_the_media_in_force_and_keeps_the_old_bytes_for_rollback ... ok
reinstalling_the_same_version_replaces_the_media_instead_of_merging_it ... ok
a_tampered_installed_asset_fails_install_validation ... ok
test result: ok. 3 passed; 0 failed
```

`cargo test -q -p lts-langpack --test media_upgrade` on GamingPC at this state. The
third test is the direct answer to the mismatch question: with the manifest untouched
and the installed bytes changed, install-mode validation reports
`media_hash_mismatch` and `media_size_mismatch`.

## Corrections to the earlier preparation note

`state/evidence/O-01B-2026-10-15/NOTES.md` said a tracked version bump "would
invalidate the `0.4.0` pins/tests" and listed five file paths as pins. Three of those
paths do not exist in this repository (`crates/speech/tests/rust_asr_sanity.rs`,
`apps/desktop/src-tauri/tests/commands.rs`, `tests/test_pack_build.py`) and the other
two do not assert the pack version. Re-measured: no test pins the tracked pack
version. The same note framed O-01a as unresolved; the owner decided
`CC-BY-SA-4.0` on 2026-10-13 and deliberately left the catalogue describing the
published artifact. Both statements are corrected above.

## What is still not established here

- The packs stay `maturity: "experimental"` and `--release-readiness` still fails for
  them: no qualified human review record exists (`state/evidence/REVIEW-001/`,
  `languages/*/review/REVIEWER_KIT.md`). A conformant build is not a content approval.
- Bulk audio (4,902 ja / 4,856 ru rows) is verified for presence/size/hash against the
  manifest, and was produced by the normalizing generator, but was not individually
  loudness-measured; only the 18 tracked assets were.
- Publication remains owner-only: bump is now committed, but the tag, the release
  assets, the hand-edit of `catalog/packs.json`, and the ADR-0032 end step (deleting
  the 18 tracked files plus the `.gitignore` exception) stay undone until approved,
  and the tracked journey audio stays in git until replacement distribution is
  published **and** verified.
- The candidate is reproducible from `HEAD` + the 2-line diff; it is not "released",
  and nothing in the app points at 0.4.1 yet (the catalogue still pins 0.4.0, which is
  correct until the artifacts exist).

## Canonical rebuild (same day): the earlier filenames were a script bug, not a pack difference

One run of `tmp/build-rc-0.4.1.sh` emitted `rc-ja-JP-audit-sources-0.4.1.lpk`-style names,
because a helper used the global name `sec` and clobbered the loop variable. The builder was
fixed (`local name=$1`) and re-run. The archives now carry the catalogue-convention names and
the bytes are **unchanged**:

| archive | size | sha256 | members | under `media/` |
| --- | --- | --- | --- | --- |
| `dist/rc-0.4.1/ja-jp-reference-0.4.1.lpk` | 318,721,333 | `7d9c70453e0469d8dc4e53eda27b5f4eafdfee443d2e3f4e2406d5b6238db460` | 5,864 | 4,903 |
| `dist/rc-0.4.1/ru-ru-reference-0.4.1.lpk` | 318,489,935 | `9eb074fa8d59f508108bc0fa8c698e1ddbd7458648ee2d829edeb36fbcfc1d7a` | 5,788 | 4,857 |

Member counts are the `inspect` listing minus its header line (`lts-pack/1 <pack_id> v0.4.1
(schema 0.2)`); `rc-inspect-*.txt` in this directory are those listings. Third byte-identical
build of the same content, so reproducibility is measured three ways, not claimed.

`dist/rc-0.4.1/packs.json` (the CLI **proposal**, never applied to the tracked file) is now
internally consistent: `url` matches the docs/13 convention
`…/releases/download/org.openlanguage.ja-jp.reference-0.4.1/ja-jp-reference-0.4.1.lpk`
(note the **dot** before `reference` — a hand-built hyphen URL 404s), and `sha256` /
`size_bytes` match the archives above. `catalogue-proposal-diff.txt` records field-by-field
what the tracked entry would change. One field there is **not** a build fact and needs the
owner's eye: the proposal sets ja `display_name` to `Japanese Reference Pack`, dropping
`(Draft)`, because `languages/ja-JP/manifest.yaml:3` has carried no suffix since the 0.2.1
bump while `catalog/packs.json:7` still says `(Draft)`. A hand-edit that copies the proposal
silently renames the pack in the desktop catalogue; a hand-edit that keeps `(Draft)` keeps a
name the pack no longer declares. Either is defensible; it must be a choice, not an accident.
The ru entry needs no such decision — manifest and catalogue agree on `(Draft)` there.

## Version bump reverted on the tracked tree — the bump rides publication

Measured at the pushed batch head `b5bafc8`, Actions run `38772271396`: `rust` (job
`116550909282`) and `desktop-smoke` (job `116550909671`) failed at the step "Restore
reference-pack audio (published archives)"; `web`, `schemas`, `security`,
`platform-compile (windows-latest)` and `platform-compile (macos-latest)` were `success` and
`platform-bundles` was `skipped`. Verbatim refusal:

```
fetch-pack-audio: catalog: no single catalog/packs.json entry for org.openlanguage.ja-jp.reference 0.4.1 — the pack archive must be published (owner gate O-05) before its audio can be restored into a checkout
```

`scripts/fetch-pack-audio.sh` looks the archive up by `<pack_id, version>` in
`catalog/packs.json`, which is the hand-maintained record of **published** archives. A
manifest version with no published entry is therefore unbuildable in CI by design — the same
gate that caught the archive-vs-tree divergence recorded in ADR-0032. Making it fall back to
the newest published version was rejected: a checkout would then restore media that does not
correspond to the pack version it declares.

The candidate archives are unaffected (they were built from the bumped tree, and rebuilding
from that tree reproduces the same digests), but the bump cannot land on its own. Ordered
release recipe, all in one owner-landed change:

1. `git apply state/evidence/RC-0.4.1-2026-10-15/version-bump.patch` — verified with
   `git apply --check` against the reverted tree (only the two `version:` lines change);
2. rebuild both `.lpk` files (`dist/rc-0.4.1/build-rc-0.4.1.sh` shape; deterministic, expect
   the exact shas recorded above) or reuse the files on disk at `dist/rc-0.4.1/` — note
   `dist/` is gitignored, so those archives exist only on this machine;
3. enable immutable releases (**before** the upload, so 0.4.1 itself is locked — decision D3);
4. tag `org.openlanguage.ja-jp.reference-0.4.1` / `org.openlanguage.ru-ru.reference-0.4.1`
   and upload the assets under the URL convention in docs/13;
5. hand-edit the two `catalog/packs.json` entries (`version`, `size`, `sha256`, `url`, and
   the ja `display_name` question above) — never `scripts/build-catalog.sh` on the tracked file;
6. push; CI goes green at the bumped version because the catalogue now resolves.

Until that change lands the tracked manifests stay at `0.4.0`, matching the published pins:
`fetch-pack-audio.sh --verify-only` then reports `rows checked=4902 … rows failing=0` (ja)
and `4856 … 0` (ru).
