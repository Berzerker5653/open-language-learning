# LEARNER-REVIEW-M1-001 — defect ledger (Month-1 learner experience, RU + JA)

Format per the frozen contract (state/notes/LEARNER-REVIEW-M1-001.md):
`id | surface | day_reached | severity | evidence | disposition`

| id | surface | day_reached | severity | evidence | disposition |
|----|---------|-------------|----------|----------|-------------|
| D-001 | daily-plan content selection (engine) — both packs | 1 | **blocker** | `rca-progression-starvation.md` + `sim/raw-{ru,ja}/` day logs: RU learner receives 6 practice items total across days 1-30, JA receives 15; from day 2 the plan is 100% weak-skill reviews of the day-1 set, `current_offer` is null every day, and every non-Cyrillic/non-kana unit stays locked with `refs_done` frozen (RU `cyrillic-a-o-m-t` 3/4 — the letter т is never served; JA `kana-hiragana-vowels-ko` 3/10) | FIX-M1-PROGRESSION-001 (board-linked parent; M1 auto-resumes when it lands) |
| D-002 | journey-sim harness (tooling) | — | known-limit (tooling) | `Serve.stop()` SIGTERMs the faketime wrapper; on a worker kill the lts-serve children survive (60+ leaked processes observed, ~8 GB RSS) | harness patched same-run (`start_new_session` + process-group kill); sim-changelog entry in `~/.hermes/sim/lts.md` |

## Mechanical pass (pass 1) — result so far

- RU days 1-30: **0 mechanical failures** over 994 unique texts
  (answer-key consistency/conflict, distractor legality, stress-mark
  validity, lexicon membership) — `mech-pass/mech-ru.{json,md}`.
- 53 deduped warnings (`ru.lexicon.unknown-lemma`) are letter-name
  transliterations and hyphenated compounds (по-деловому) plus
  pack lexicon misses like неисправность — routed to the fresh-context
  reviewer lanes (pass 2), NOT silently dropped.
- JA days 1-30: **0 mechanical failures / 0 warnings** over 968 unique
  texts — `mech-pass/mech-ja.{json,md}`.
- Worklist built over all 60 day logs: `sim/worklist.json` (RU 991 /
  JA 968 unique items), mechanical pass coverage **100.0%** on both.
- **Coverage caveat:** the mechanical pass ran at 100% coverage of the
  enumerated Month-1 set — but because of D-001 that set is 6 (RU) / 15
  (JA) practice items + UI chrome + never-reached unit titles. The
  mechanical pass must be re-run after D-001 lands, on the real month-1
  inventory (expected ~30 path nodes of pools, stories, quizzes).

## Pending (not defects — passes not yet run)

- P-1 ASR audio↔transcript re-verification (`scripts/qa-asr.py --ids`
  month-1 subset, PACK-AUDIO-VERIFICATION-001 pipeline) — meaningless
  subset until D-001 lands.
- P-2 fresh-context linguistic review per prose chunk (ru and ja separate
  lanes) — will review the real post-D-001 inventory.
- P-3 experience/pacing review (mode unlock timing, story/quiz mix,
  streak behavior) — first raw material: D-001 itself is the pacing
  finding the sim walk produced.
- P-4 residual-uncertainty manifest → known-limits copy — after P-2.
