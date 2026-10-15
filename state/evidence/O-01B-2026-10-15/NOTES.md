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
the version string was raised. Nothing under `languages/**` was modified at the time,
so this preparation could not pre-empt the owner's decision.

**Corrected 2026-10-15.** The reason originally given for not bumping the tracked tree
— that a bump "would invalidate the `0.4.0` pins/tests" — is false, and the file paths
listed here as pins are not all real. Measured at `fd76786`: no test asserts the
tracked pack version. The only `0.4.0` assertions are the live-install test
`apps/desktop/src-tauri/src/packs.rs:1124`, whose expected versions come from the
catalogue pins, and historical fixtures (`packs.rs:925`,
`apps/desktop/src/journeys/harness.tsx:113`, `pack-install.journey.tsx:59,61`).
`crates/speech/tests/rust_asr_sanity.rs`, `apps/desktop/src-tauri/tests/commands.rs`
and `tests/test_pack_build.py` do not exist in this repository. The bump is now on the
tracked tree, and the archives, gates and member-level accounting are re-measured in
`state/evidence/RC-0.4.1-2026-10-15/NOTES.md`.

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
the licence from the pack, so regenerating the entry corrects it. **The licence itself
is not an open question:** owner gate O-01a was decided on 2026-10-13 in favour of
`CC-BY-SA-4.0` for the pack
(`state/evidence/LIC-002/owner-decision-O-01a-2026-10-13.md:8-16`), and
`catalog/packs.json` was deliberately left at `CC-BY-4.0` because that entry describes
the already-published 0.4.0 artifact, whose embedded manifest still says `CC-BY-4.0`
(measured: the published archive's `manifest.yaml` is 769 B, the 0.4.1 candidate's is
772 B — the inserted `-SA`). ru's entry agrees with its manifest (`CC0-1.0`), so the
earlier claim that both catalogue entries were mislabelled was wrong and is corrected
in `tasks/KANBAN.md` (republish-packs row). The catalogue licence changes as part of
publishing a 0.4.1 entry, not before.

## Owner sequence — status of each step

1. **Done 2026-10-15, on the tracked tree.** `version:` in
   `languages/{ja-JP,ru-RU}/manifest.yaml` bumped to `0.4.1`; this is what makes the
   archives reproducible from the repository instead of from a scratch copy.
2. **Done.** Archives built from the tracked tree; bytes, sha256, member counts, the
   install round-trip and a member-level accounting against the published 0.4.0
   archives are in `state/evidence/RC-0.4.1-2026-10-15/NOTES.md`.
3. **Owner only.** Consider the repository-protection order **first**: enable
   immutable releases (`PUT /repos/…/immutable-releases`) *before* publishing, because
   it only locks **future** releases — publishing 0.4.1 first leaves it mutable, and no
   republish workflow is documented. A pattern-scoped tag ruleset then covers the seven
   tags that already exist. Today **zero rulesets exist**, so nothing blocks tag
   creation or movement; the earlier claim that a push ruleset would have protected tags
   was wrong (that feature is Team-plan, private/internal-only, content-scoped).
   Measured state, docs quotes and the proposed JSON:
   `state/evidence/O-08-2026-10-15/mechanisms-2026-10-15.md`. Nothing was applied.
   Then create the tag and upload the two assets.
4. **Owner only.** Replace the two `catalog/packs.json` entries by hand — never
   `scripts/build-catalog.sh`, which drops the platform fields and invents URLs.
5. **Owner only, and only after 3 and 4 are verified to work.** Then end ADR-0032:
   delete the 18 tracked media files and the `.gitignore` exception block; moving the
   ADR to `Accepted` is a human decision.

Steps 3-5 publish state. The tracked journey audio stays in git until replacement
distribution is published **and** verified.
