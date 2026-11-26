# REVIEW-APP-SPLIT-003A — STANDARDS verdict

Target: APP-SPLIT-003A (code 88ce090e, ledger 0e66c227). Reviewer: default. Date: 2026-11-26.

## Verdict: PASS-WITH-NOTES

Ledger and commit hygiene are clean everywhere except one measured-claim defect
(D1): the recorded App.tsx after-LOC is wrong by 3 lines in every artifact that
states it.

## Clean

- Commit pairing: separate `feat(desktop)` code commit and `ledger(...)` commit;
  code commit touches exactly 2 files (App.tsx, history-wiring.tsx); ledger
  commit exactly 6 (gates.log, notes x2, task-state.json, KANBAN.md,
  ROADMAP.yaml). Nothing unrelated swept in.
- task-state evidence path `state/evidence/APP-SPLIT-003A/gates.log` exists;
  KANBAN.md `app-split-003a` row present and marked done; ROADMAP card present
  with existing-file `read_first` entries and an `optional_tasks` entry
  (required_for_desktop_1_0: false).
- `python3 tools/validate_handoff.py --require-explicit-ledger-records` re-run
  by the reviewer in a clean worktree at 88ce090e: PASSED (WARNs pre-existing).
- Gates not weakened: zero test/gate-script edits in either commit; vitest test
  count identical to the recorded baseline (694).
- Accessibility semantics preserved with the component (alertdialog role, aria
  label, testids) — CODING_STANDARDS B-list satisfied; no privacy/persistence/
  offline surface touched.
- Prettier-clean at commit for history-wiring.tsx (reviewer re-check).

## Defect D1 — recorded App.tsx after-LOC is wrong by 3 (evidence accuracy)

`git show 88ce090e:apps/desktop/src/App.tsx | wc -l` = **4594**, parent = 4650.
Every artifact claims **4591** (net −59); the true delta is 4650 → 4594
(net −56). Wrong in: commit 88ce090e message, ledger 0e66c227 message,
`state/evidence/APP-SPLIT-003A/gates.log` (twice), `state/notes/APP-SPLIT-003A.md`,
the `state/notes/APP-SPLIT-001.md` LEDGER table row, the `tasks/KANBAN.md` row,
and the task-state.json `summary`. gates.log additionally states
history-wiring.tsx is "140 lines"; the file is **138**.

Violation: CODING_STANDARDS B — "new docs claims are measured from artifacts"
and the commit-message rule that only verifications that actually ran may be
asserted in completed tense. Severity: low — a 3-line measurement/typo drift;
direction (net reduction) and all functional claims are true; the gates themselves
are independently re-verified green. Not a product-code defect.

Recommended FIX (planner to spawn; NOT fixed in this review card): a docs/ledger
correction commit updating the derived claims (task-state summary,
notes/APP-SPLIT-001.md LEDGER row, KANBAN.md row) to 4650 → 4594 and adding a
one-line correction note to the notes file. The shipped commit messages and the
lane's gates.log are immutable evidence records — annotate, never rewrite.

## Notes

- N2 — pre-existing fmt debt: main was prettier-red on App.tsx since the
  APP-SPLIT-002 serve-probe line landed; 88ce090e cleared it in passing. If CI's
  web `pnpm fmt:check` predates APP-SPLIT-002..0e66c227 pushes, that leg was red
  for unrelated reasons — informational only, already resolved by this lane.
