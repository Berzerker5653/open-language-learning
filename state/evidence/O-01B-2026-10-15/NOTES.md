# O-01b preparation — 0.4.1 reference-pack archives built, nothing published

Owner gate O-01b is "republish both reference packs at 0.4.1". This directory is
**preparation only**: no tag, no release, no asset upload, and `catalog/packs.json`
was not touched (it is hand-edit only; the CLI `catalog` output here is a proposal
under `dist/`).

## What was built, and from what

Scratch copies at `tmp/0.4.1-prep/{ja-JP,ru-RU}` (gitignored). `diff -rq` against
the tracked `languages/{ja-JP,ru-RU}` reports exactly one differing file per pack,
and that difference is one line:

```
< version: "0.4.0"
> version: "0.4.1"
```

So every byte of content in these archives is the content in the tracked tree; only
the version string was raised. Nothing under `languages/**` was modified, because a
tracked version bump would invalidate the `0.4.0` pins/tests and would pre-empt the
owner's decision.

Builder: `tmp/build-041.sh` (scratch), logs in this directory, table in
`SUMMARY.txt`.

## Gates against the scratch packs

All 14 gate invocations exited 0 — `validate`, `lint`, `test`, `audit-curriculum`,
`audit-lexicon`, `audit-licenses`, `audit-sources` for each of `ja-JP` and `ru-RU`
(`prep-ja-JP-*.txt`, `prep-ru-RU-*.txt`).

## Archive identity

| pack | bytes | sha256 | members | `media/` members |
|---|---|---|---|---|
| `ja-jp-reference-0.4.1.lpk` | 318,721,333 | `7d9c70453e0469d8dc4e53eda27b5f4eafdfee443d2e3f4e2406d5b6238db460` | 5,864 | 4,903 |
| `ru-ru-reference-0.4.1.lpk` | 318,489,935 | `9eb074fa8d59f508108bc0fa8c698e1ddbd7458648ee2d829edeb36fbcfc1d7a` | 5,788 | 4,857 |

Member counts are lines matching `^ *[0-9]+ +[0-9a-f]{12} ` in `inspect-*.txt`
(`inspect` prints an echoed command line, one `lts-pack/1 … (schema 0.2)` header and
an `EXIT=` line, which is why `grep -c ""` over-counts by three). The `media/` counts
are the media manifest plus every declared audio file, which matches the tree's
`languages/ja-JP/media/manifest.jsonl` (4,902 rows) and
`languages/ru-RU/media/manifest.jsonl` (4,856 rows).

Against the pins the tracked catalogue carries for 0.4.0 (`org.openlanguage.ja-jp.reference`
317,429,131 B sha `f0aa971f…`, `org.openlanguage.ru-ru.reference` 316,616,342 B sha
`899e0c67…`), 0.4.1 is **+1,292,202 B** and **+1,873,593 B** respectively.

## Install round-trip

`langpack install <archive> --store <dir>` for both archives exited 0:

```
installed org.openlanguage.ja-jp.reference v0.4.1 at dist/preview-0.4.1/store-ja-JP/org.openlanguage.ja-jp.reference/0.4.1
installed org.openlanguage.ru-ru.reference v0.4.1 at dist/preview-0.4.1/store-ru-RU/org.openlanguage.ru-ru.reference/0.4.1
```

The staged stores were removed after the check; the archives remain under
`dist/preview-0.4.1/` (gitignored, ~640 MB total — delete when the decision is
recorded, or re-run `tmp/build-041.sh` to regenerate).

## ADR-0032's end condition is now demonstrable

ADR-0032 (still **Proposed**) tracks 18 pack audio files in git as a bounded
exception, because the published 0.4.0 archives predate them. Verified here: all 18
tracked `.wav` paths from `git ls-files languages` (8 ja, 10 ru) appear in the 0.4.1
`inspect` listings — 18 of 18 present, 0 missing. That is exactly the condition under
which the exception ends: once archives containing them are published, the tracked
copies can go.

## Proposed catalogue change — NOT applied

`dist/preview-0.4.1/packs.json` was produced by
`langpack catalog <two archives> --file dist/preview-0.4.1/packs.json
--url-template 'https://github.com/Berzerker5653/open-language-learning/releases/download/{pack_id}-{version}/{filename}'
--platform-reports docs/platform/PLATFORM_REPORTS.yaml`. Diff against the tracked
`catalog/packs.json`, per entry:

| field | tracked (0.4.0) | proposed (0.4.1) |
|---|---|---|
| ja `license` | `CC-BY-4.0` | `CC-BY-SA-4.0` |
| ja `version` / `sha256` / `size_bytes` | `0.4.0` / `f0aa971f…` / 317,429,131 | `0.4.1` / `7d9c7045…` / 318,721,333 |
| ru `license` | `CC0-1.0` | `CC0-1.0` (unchanged) |
| ru `version` / `sha256` / `size_bytes` | `0.4.0` / `899e0c67…` / 316,616,342 | `0.4.1` / `9eb074fa…` / 318,489,935 |
| both `url` | `…/download/<pack_id>-0.4.0/<file>-0.4.0.lpk` | `…/download/<pack_id>-0.4.1/<file>-0.4.1.lpk` |
| both platform fields | `tested_platforms: ["linux"]`, `community_confirmed_platforms: []`, `untested_platforms: ["windows","macos"]` | unchanged |

The `license` row is the substantive one: `catalog/packs.json:8` has said
`CC-BY-4.0` for ja since the entry was added, while the pack declares
`content_license: "CC-BY-SA-4.0"` (`languages/ja-JP/manifest.yaml:33`). The CLI takes
the licence from the pack, so regenerating the entry corrects it. Whether the pack or
the catalogue is the wrong one is owner gate **O-01a** (CC-BY vs CC-BY-SA); the two
cannot both stand. ru's entry already agreed with its manifest, so the earlier claim
that both entries were mislabelled was wrong and is corrected in
`tasks/KANBAN.md` (republish-packs row).

## Sequence the owner would authorize (nothing below is done)

1. Bump `version:` in `languages/{ja-JP,ru-RU}/manifest.yaml` on the tracked tree and
   commit (that is what makes these archives reproducible from the repo instead of
   from a scratch copy).
2. Build the archives from the tracked tree; record sha256/bytes.
3. Create the tag and the release assets — **check the tag ruleset first**: the
   proposed O-08 ruleset with `restrict creations` would block a new tag until it is
   either applied after tagging or configured to allow the release actor
   (`state/evidence/O-08-2026-10-15/rulesets-probe.md`).
4. Replace the two `catalog/packs.json` entries by hand (never `scripts/build-catalog.sh`).
5. Then end ADR-0032: delete the 18 tracked media files and the `.gitignore` exception
   block, and move the ADR to Accepted with the end condition met.

Steps 1–5 touch published state and the licence question, so they need the owner.
