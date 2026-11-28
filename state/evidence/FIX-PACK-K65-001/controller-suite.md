# FIX-PACK-K65-001 — controller combined-tree suite + attribution (2026-11-27/28)

## Combined lib suite (this lane + FIX-SPEECH-CATALOG-001, tree at 1067ff6d)
`cargo test -p lts-desktop --lib` (full, quiet tree):
**261 passed / 3 failed / 2 ignored** (649.78s)

The 3 during that run:
1. `tests::letter_drills_span_two_prompt_families_and_reach_independent` — REAL
2. `tests::provenance_payload_covers_every_installed_pack_verbatim` — writer race
3. `tests::writing_targets_are_parsed_once_per_version_root` — writer race

1067ff6d (kuukimasu audio re-roll) landed mid-suite; its wav write raced the two
media-reading tests (skill writer-race pattern). Re-run of all 3 on a fully
quiet tree afterwards:
**provenance PASS, writing_targets PASS, letter_drills FAIL.**

## letter_drills attribution (controller, clean-room)
- Detached worktree at 6119fd71 (both lanes' commits REMOVED), main tree's
  gitignored `gen/audio` symlinked in, `languages/*/media/*.wav` symlinked in
  (fresh worktrees have no generated audio; install_reference_pack_fast builds
  the archive and ADR-0016/K-90 refuses silent packs).
- Result at 6119fd71, no writers: FAIL at lib.rs:23673 —
  panic "the drill offers the letter's symbol or sound" (today's rotation day's
  choices contain neither `а` nor `a`).
- Test derives the drill family from `now_secs()/86400` → state rotates with
  the calendar; introduced by 87786961 (FIX-M1-PROGRESSION-001).
- Verdict: MAINLINE defect, pre-existing both lanes. Tracked as
  FIX-LETTER-DRILLS-001 (board t_703f4b81).
- Bisect window: the suite measured 264/0 at 576ccccc (VENDOR-TEST-SERIAL-001
  ledger); the only content change in 576ccccc..6119fd71 is 04bdd7c8
  (FIX-M1-CONTENT-RU-001 RU stress-mark corrections + supply densify) — the
  trigger candidate; exact RCA + bisect assigned on the card.

## K-65 acceptance note (honesty)
Card acceptance said "lib suite fully green". Modulo the attributed mainline
letter_drills defect, every failure this card was opened for is green: the 4
named reds are 2 fixed by this lane (provenance, writing_targets), 1 by
FIX-SPEECH-CATALOG-001 (calibration_record_qualified...), and pronunciation_
check_abstains... green. Card closed with this carve-out recorded here and on
the board.
