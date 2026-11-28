# Review record — REVIEW-WRITE-PRACTICE-001 (board t_630db88c)

Reviewer: @default (Hermes, GamingPC). Date: 2026-11-27 (two runs: attempt 1
built the battery + verdicts, timed out at the iteration budget; attempt 2
re-verified on a clean tree, reproduced the probes, closed the record).

Lane reviewed: WRITE-PRACTICE-001 — free-writing practice with offline
mechanical feedback. Code `e858ca0d`, ledger `efceed45` (separate commits,
code-first; both verified ancestors of main `80fb8720`).
Frozen contract: `state/notes/WRITE-PRACTICE-001.md`.

## Verdicts
- SPEC: **PASS WITH DEFECTS** — 1 MAJOR (S-D1), 2 minor (S-MINOR-1 N-lower-
  bound short-set band, S-MINOR-2 pin placement). Contract table point-by-
  point in `spec-verdict.md`. No scope creep; zero AI wiring in the diff
  (verified by grep); completion-signal-only invariant pinned twice.
- STANDARDS: **PASS WITH MINOR DEFECTS** — 2 minor (S-S1 prettier drift —
  repo-wide, CI web job red; S-S2 review-method era artifact, recorded as a
  recipe). Commit/ledger hygiene, migration contract, privacy cascade,
  evidence reality all PASS in `standards-verdict.md`.

## Defects -> FIX cards (spawned, ready)
- S-D1 MAJOR -> **FIX-WRITE-PRACTICE-FORMS-001** (t_a2709e84): RU usage
  chips can never light for inflected forms — 0 of 4,071 ru lexicon entries
  carry >1 form (measured twice, frozen + clean HEAD); fix shapes (a) offline
  pymorphy forms[] pre-generation, (b) copy softening; mandatory inflected-
  sentence Rust pin.
- S-S1 -> **FIX-PRETTIER-REPO-001** (t_df30384a): repo-wide chore(fmt) so
  `pnpm fmt:check` (ci.yml:209) greens; includes the lane's 3 files.
- S-MINOR-1 / S-MINOR-2: recorded only (design posture / accepted deviation)
  — no card, per low stakes; decide in WRITE-PRACTICE notes if ever revisited.

## Gate verification (raw log: `reviewer-gates.log`)
- Frozen `e858ca0d` (detached worktree): fmt 0, clippy 0, audit_learner_copy
  0 (re-measured), validate_handoff PASSED (2 pre-existing WARN). lib/vitest
  runs at the frozen commit are ENV-blocked (media-era mismatch — 57 phantom
  pack failures; S-S2 recipe: gate at current HEAD + frozen only for media-
  independent commands).
- HEAD `80fb8720`: fmt 0, clippy 0, storage suite green, tsc 0,
  vitest 84 files / 733 tests green; lib suite 263 passed / 1 failed / 2
  ignored — the 1 red is letter_drills, proven pre-existing mainline, tracked
  as FIX-LETTER-DRILLS-001 (t_703f4b81), outside this lane (test origin
  87786961 not an ancestor of the lane).
- Attempt 2 re-ran the lib suite on a clean HEAD checkout after attempt 1's
  HEAD run had uncommitted probe edits in the same worktree; result appended
  as CLEAN-HEAD-LIB in reviewer-gates.log.
- Independent reproductions by attempt 2: lexicon multi-form census (PROBE 1,
  exact match), prettier 3-file red at HEAD (PROBE 2), CI fmt:check step
  existence (PROBE 3).

## Disposition
Lane stands shipped. MAJOR defect is a content/data gap behind a real product
promise, owned by FIX-WRITE-PRACTICE-FORMS-001; not a revert condition.
No sim entry (review-only card; no harness/config/skill/tooling changes).
