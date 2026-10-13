# open-language-learning-platform 0.4.0-alpha.1 — public alpha

Tag: `open-language-learning-platform-0.4.0-alpha.1` · built from commit `70ec683`

The app states its own identity: **Settings → About this build** prints the
version and the commit. Please quote both in any report — a report that says
"the latest version" cannot be matched to a build (ADR-0015).

## What you get

- Desktop app for **Linux** (the only platform anyone here has actually run).
  Two install shapes:
  - **Base** — the app alone; language packs come from the in-app catalog.
  - **Aligner variant** — the same app with the optional whisper.cpp aligner
    sidecar bundled at `usr/lib/open-language-learning-platform/aligner/linux-x64/`.
- Two reference language packs, published separately as **0.4.0**:
  `org.openlanguage.ja-jp.reference` and `org.openlanguage.ru-ru.reference`
  (attached to their own releases). Nothing in either pack is human-reviewed yet.

| artifact | size | sha256 |
| --- | --- | --- |
| base `open-language-learning-platform_0.4.0-alpha.1_amd64.deb` | 12,309,544 B (11.74 MiB) | `f25dfd6de8cf98d220bb332004a3a40287e70890b3592097c3a6448d8dc586ec` |
| base `open-language-learning-platform_0.4.0-alpha.1_amd64.AppImage` | 72,739,320 B (69.36 MiB) | `8ec280f83715b6021121bd539700536449dd02d7356242e182e22b492c466457` |
| aligner deb | 83,781,498 B (79.90 MiB) | `158c079b80546fc956805dfcba6483d5d2b963a4fd2e79efcf5a8ef7d96465af` |
| aligner AppImage | 144,669,176 B (137.97 MiB) | `95581a7aa6c409cba8a9de7ec74c34658e5eaa25154afb20ce0604d56d600e56` |

## Install notes

- **Packs install from the in-app catalog with no configuration.** The build
  falls back to this repository's `catalog/packs.json`;
  `LTS_PACK_CATALOG_URL` still overrides it, and setting it to the empty string
  turns the catalog off (ADR-0027).
- The **AppImage needs `webkit2gtk-4.1` and `libjavascriptcoregtk-4.1` from your
  system**, exactly like the deb does — they are deliberately not bundled,
  because a bundled WebKit carries the build machine's helper-process paths and
  dies on every other machine. It also needs `--appimage-extract-and-run` inside
  containers and on systems without FUSE. A clean-machine boot has **not** been
  verified yet; if you are the first, please file a runtime report.
- The "Locate a language pack file" import path works, but it moves the whole
  archive through the web layer as base64: measured on the 317 MB ja-JP archive,
  process RSS grew by **1,007 MiB** (file + base64 + decode) before Rust's own
  copy. Catalog install holds one buffer. On a small machine, use the catalog.
- Windows and macOS builds are produced but **untested**. A platform moves to
  community-confirmed only when a human who ran that build files a runtime
  report.

## What is honest about the content

Every pack item is **AI-drafted and not human-reviewed** (`status: draft`), which
is why the packs are named "(Draft)". Coverage exists across all bands (ja-JP 786
units / 4,563 activities; ru-RU 809 units / 3,197 activities) but no band has
passed qualified review, and that review cannot be cleared by a machine.
Pronunciation feedback is **guided only** and makes no accuracy claim (ADR-0013,
docs/18). The app never synthesizes speech: packs carry the audio (ADR-0024), so
a pack without audio for an item says so rather than making something up.

## Known issues in this alpha

- **Romaji display in the Japanese pack was wrong, and is fixed in 0.4.0.** 510
  of 4,057 transliteration readings carried a digit or kana instead of romaji
  (`ronso2` for ろんそう, `kentoう`, `jiゅnり`) and 67 script-labelled fields
  carried the wrong kana label. The Japanese pack was repaired and re-versioned
  to 0.4.0, and the app now refuses to install content that has those defects:
  installing the old `ja-jp-reference-0.3.0` archive in this build reports
  `pack rejected by install validation: 561 error(s)`. If you have 0.3.0
  installed it keeps working, but reinstalling it will fail — install 0.4.0.
  A further 98 entries whose romaji is well-formed but no longer describes the
  entry, and 621 rows that follow a different romanisation convention, are
  listed for human review in
  `state/evidence/PACK-LINT-2026-10-13/transliteration-review-2026-10-13.csv`.
- Audio bake correctness is now enforced in one place: an incremental bake can no
  longer write a corrected reading over audio of the old wording. Before this
  build that was possible and every gate passed. If you find a clip that does not
  say what the item claims, that is the bug class; please report the item id.
- The board, worklists and this release's evidence trail are in the repository;
  the two things that need a human and are not done are a hands-on pass of the
  wizard/pack flow on a machine that never had the app, and qualified review of
  any content at all.

## Reporting

Use the issue templates. **Platform runtime report** wants OS build, app version,
app commit, pack id/version/sha256 and what happened; **content review** wants
your qualification and the item ids you checked. Both feed evidence files the
release gates actually read (`docs/platform/PLATFORM_REPORTS.yaml`,
`languages/*/review/REVIEW_POLICY.yaml`). A content review takes about fifteen
minutes and starts at `CONTRIBUTING.md` ("Reviewing language-pack content").
