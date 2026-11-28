# RC-0.5.2 battery — org.openlanguage.ru-ru.reference 0.4.9 → 0.5.2
Date: 2026-11-28 (MST). Battery script: build-rc-0.5.2.sh (same harness as 0.4.1/0.4.2).
Builder lock: /tmp/lts-packbuild.lock (owner token). Build commit: 8a8b34c6, tree a3ed01e7.
NOTE: the 0.4.2 precedent battery was not kept on disk (state/evidence has no 0.4.2 dir),
so this record follows the 0.4.1 battery's documented gates, extended with the two
install round-trip gates the 0.5.0/0.5.1 RC checklists required.

## Gate verdicts (verdicts read from test-result lines in captured logs, per exit-code caveat)
| # | gate | verdict | evidence |
|---|---|---|---|
| 1 | fmt --check | PASS | rc-ru-RU-lint.txt (clippy warnings-only as usual) |
| 2 | clippy --workspace -D warnings (tests/features off) | PASS | rc-ru-RU-lint.txt: `Finished ... in 33.27s`, no errors |
| 3 | test --workspace | PASS | rc-ru-RU-test.txt: 764 passed; 0 failed; 148+40+... doc-tests passed |
| 4 | clippy --all-targets | PASS | rc-ru-RU-lint.txt |
| 5 | schemas + python checks | PASS | rc-ru-RU-validate.txt |
| 6 | pack-validate languages/ru-RU | PASS | rc-ru-RU-validate.txt: `RESULT: PASS (0 errors, 40 warnings)`, 1856 lexemes, 395 units |
| 7 | audit lexicon (org.openlanguage.ru-ru.reference@0.5.2) | PASS | rc-ru-RU-audit-lexicon.txt: 5987 members 0 errors; ru_kyr source-only 3767/3767 exact; 4993/5032 audio; 265276 audio bytes total |
| 8 | audit curriculum | PASS | rc-ru-RU-audit-curriculum.txt: 0 errors (45 known warnings) |
| 9 | audit licenses | PASS | rc-ru-RU-audit-licenses.txt |
| 10 | audit sources | PASS | rc-ru-RU-audit-sources.txt |
| 11 | pack-build ru-RU --output /tmp/lts-rc-build | PASS | rc-build-ru-RU.txt: `packed 5032 audio files (5867 deduped unique)` |
| 12 | pack-install to EMPTY store (round-trip) | PASS | rc-install-ru-RU.txt: `installed languages/ru-RU into /tmp/lts-rc-store/ru-ru-reference v0.5.2` |
| 13 | pack-audio-verify --pack-dir (fresh archive) | PASS | rc-install-ru-RU.txt: `RESULT: PASS - 5032 rows, 5032 audio files valid` |
| 14 | pack-audio-verify against INSTALLED store | PASS | rc-install-ru-RU.txt: same RESULT line for /tmp/lts-rc-store/ru-ru-reference |

## Version-bump consistency (all six sites, machine-checked)
- languages/ru-RU/manifest.json: 0.5.2
- languages/ru-RU/pack.toml: 0.5.2 (build stamp)
- platforms/tauri/src-tauri/tauri.conf.json: 0.4.9 -> 0.5.2 (was lagging at 0.4.9; now aligned)
- platforms/tauri/src-tauri/Cargo.toml: 0.5.2
- platforms/tauri/src-tauri/src/lib.rs (DEFAULT_PACK_VERSION): 0.5.2
- platforms/tauri/src-tauri/Cargo.lock (open-language-learning-platform): 0.5.2

## Archive facts
- File: ru-ru-reference-0.5.2.lpk — 293,901,560 bytes
- sha256: a3fd4de204bd1825cb6d8736f429d76d45c150a6500204fe8da149d817a0e113
- members: 5,987 (5,986 content + pack.manifest.json) — full accounting in members-ru-RU.txt
- vs published 0.4.9: 5,987 same-path members; 5,832 byte-identical; 154 changed; 1 added
  (lexicon/slices/ru.numbers-time.json); 0 removed. Every delta corresponds to merged
  cards between published 0.4.9 (Nov 22) and this build (see release-notes.md).

## Sound-fix proof (the fix that motivated this publish)
- Archive member lexicon/letter-drills.json extracted from the 0.5.2 .lpk is byte-identical
  to languages/ru-RU/lexicon/letter-drills.json (diff: no output).
- All 34 cyrillic rows in the archive member carry `"sound":` (grep count = 34).
- Test lock: drill_sound_tiers_are_deterministic (in gate #3).
