# LEARNER-REVIEW-M1-001 — audit the real Month-1 learner experience (RU + JA)

Source: 2026-11-26 owner directive after shipping 0.5.0-alpha.1. Owner intent: use the app
every single day; wants the full first-month learning experience reviewed and the content
"110% correct and accurate" before/while that happens. Gated on SPEAK-PRACTICE-001 and
WRITE-PRACTICE-001 landing so the review covers the finished six-mode practice set.

## What "Month 1" means here (measured, not assumed)

The audited scope is **the exact content a from-zero learner meets on days 1–30 of daily
use**, enumerated by running the journey harness (`JOURNEY-SUITE-001` machinery) as a
simulated daily learner in each language — not by guessing the schedule. The simulation log
(days advanced, items served per day, modes exercised) becomes the audit worklist and part of
the evidence. Expect roughly the first ~30 path nodes + their pools, the early graded stories
and quizzes they unlock, listening audio, and every prompt/option/distractor in all six modes.

## Review passes (all required)

1. **Mechanical 100% pass** on every enumerated text item: dictionary/lexicon membership,
   ru stress marks, ja kana/kanji validity + reading consistency, distractor plausibility
   checks, quiz answer-key re-derivation, audio↔transcript ASR re-verification
   (`lts-pack-audio-qa` pipeline). Zero-defect gates already exist — re-run them on exactly
   the Month-1 subset and archive the logs.
2. **Fresh-context linguistic review**: independent agent lanes (author ≠ reviewer, SB rule)
   each receive the Month-1 generated prose — story sentences, scenario lines, quiz prompts,
   mode copy — in chunks with no memory of authoring, and must flag grammar/naturalness/
   level-appropriateness defects. ja and ru reviewed separately; reviewer verdicts + reasoning
   saved per chunk.
3. **Experience review** (the "process" part): step through the simulated month as a learner
   UI-side and record pacing complaints — mode unlock timing vs. difficulty, story levels vs.
   pool coverage, quiz repetition, streak/missed-day behavior, daily-plan next-action quality.
   Findings become fix cards; the review itself writes no product code.

## Defect ledger + honesty contract

- All findings land in `state/evidence/LEARNER-REVIEW-M1-001/defects.md` as a ledger:
  `id | surface | day_reached | severity (blocker/fix/known-limit) | evidence | disposition`.
- Every blocker fixed in this card or a named follow-up card; fix commits reference ledger ids.
- **Residual-uncertainty manifest required**: anything mechanical checks can't settle
  (naturalness calls, register, narrator timbre) stays labeled unverified in release/known
  notes — the owner cannot confirm language accuracy personally (owner statement 2026-11-26),
  so the app must never claim more confidence than the evidence supports.

## Continuation (self-perpetuating, do not skip)

On completion, immediately scope `LEARNER-REVIEW-M2-001` (+M3…) with the same contract for
the next month of path content, informed by M1's defect distribution. Record creation in the
M1 summary and task-state notes so no lane drops the chain. Owner explicitly asked for
per-month checks to continue.

## Acceptance

- Journey-sim logs for both packs days 1–30; mechanical pass logs at 100% coverage of the
  enumerated set; per-chunk reviewer verdicts; defects ledger with dispositions; residual
  manifest; follow-up cards (if any) created and `ready`; gates.log under the evidence dir;
  M2 card created.
