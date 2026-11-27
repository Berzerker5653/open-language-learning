# REVIEW-SPEAK-PRACTICE-001 — STANDARDS verdict

Reviewed diff: 6e5bc83e (code) + 4559d124 (ledger). Verdict: **PASS-WITH-NOTES**.

## Ledger / commit hygiene — all verified against git, not from prose

- Separate code vs ledger commits. MET. 6e5bc83e is `feat(desktop): ...` touching ONLY the
  9 product files (lib.rs, App.tsx, free-speaking.{tsx,test.tsx}, hub.tsx, journey,
  harness.tsx, session-chrome.test.tsx, styles.css); 4559d124 is
  `ledger(SPEAK-PRACTICE-001): done ...` touching only evidence logs + task-state +
  KANBAN.md. No cross-contamination.
- Evidence under state/evidence/SPEAK-PRACTICE-001/ — MET. gates.log, gates-frontend.log,
  gates-backend.log all committed and present on disk; task-state `evidence` array points
  at those exact existing paths.
- tasks/KANBAN.md row — MET. Row present, marked done 2026-11-27, links the code sha, the
  gates file, the contract, and states the deferred GUI leg.
- state/task-state.json — MET. status done, attempts 2 (honest: attempt 1 died at the
  board iteration budget with uncommitted WIP; attempt 2 re-verified and shipped),
  `updated: 2026-11-27` is a bare ISO date, notes prose records the takeover, the real
  gate numbers, and the not-claimed deferral. Small diff (14 lines) — no whole-file
  \uXXXX rewrite noise.
- `python3 tools/validate_handoff.py --require-explicit-ledger-records` — reviewer re-ran
  at HEAD: PASSED (only pre-existing WARN rows; 0 FAIL).
- No junk committed — MET. No temp harnesses, screenshots of scratch, backups or stray
  files in either commit.

## Commit-message honesty

Every completed-tense gate claim in the code message traces to committed logs
(fmt/clippy/test 251/0 x2 runs, vendor real-recording, tsc, vitest 81 files/716 tests)
and the reviewer independently reproduced the scoped subset at HEAD (reviewer-gates.log).
The manual GUI leg is the one claim NOT made — correctly recorded as deferred instead.
This is the honest shape AGENTS.md asks for.

## Notes (no defect)

1. gates-backend.log contains raw output from TWO concurrent suite writers (attempt-1
   writer and the attempt-2 re-verify) with interleaved sections from an fd collision;
   the two `test result: ok. 251 passed; 0 failed; 2 ignored` lines are unambiguous and
   the collision is disclosed in gates.log. Minor evidence-hygiene noise, honestly handled.
2. session-chrome badge pin derives from HUB_MODES.length (correct re-pin, strengthens
   maintainability). Theoretical soft spot: total-count equality could mask a 0-badge +
   2-badge pair; acceptable for a card-count pin.
3. Abstain boundary is `ratio <= 0.4` while prose says "<40%" — the closed boundary is
   strictly more fail-closed, consistent with SPEECH-007 posture. No action.
