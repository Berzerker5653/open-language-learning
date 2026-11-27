# REVIEW-APP-SPLIT-003B — STANDARDS verdict

Target: APP-SPLIT-003B (code bc0307cb, ledger 5738ccf4). Reviewer: default. Date: 2026-11-26.

## Verdict: PASS-WITH-NOTES

Commit/ledger hygiene is clean, and — unlike 003A — **every numeric claim
re-measured by the reviewer was exactly right** (the D1 defect class did not
recur; the lane even re-measured and annotated the 003A discrepancy honestly).
One evidence-accuracy overstatement remains (D1: "ALL IDENTICAL" is true for
5 of 6 bodies; the sixth deviates by one redundant `!` — see spec N1). No
product-code defect, so per the review-card contract: no FIX card; corrected
wording folded into this verdict.

## Re-measured claims (all verified)

| Claim (commit msg / task-state / gates.log / KANBAN.md) | Reviewer re-measure |
| --- | --- |
| App.tsx 4594 -> 4509 | `git show 0e66c227:App.tsx \| wc -l` = **4594**; `git show bc0307cb:App.tsx \| wc -l` = **4509**. Exact, incl. the parenthetical "wc -l at the 003A base read 4594". |
| −85 lines | 4594 − 4509 = 85; diff shortstat `2 files changed, 301 insertions(+), 151 deletions(-)` decomposes as App.tsx +66/−151 (net −85 ✓) plus settings-wiring.tsx +235 (new file). |
| settings-wiring.tsx 235 lines | `wc -l` at bc0307cb = **235**. |
| Gates: tsc + vitest 77/694 PASS | Not re-executed per card instruction; corroborated as in spec-verdict (zero test-file touches; 694 invariant in 003A reviewer-verified run and in 003C/003D descendant gates.log). |
| Security scan of added lines -> no matches | Reviewer re-ran an independent grep over `git show bc0307cb` added lines for eval/exec/child_process/pickle/secret/api-key/password/token/innerHTML/dangerouslySet/require(/Function(/http:// -> **no matches**. Claim holds. |
| validate_handoff --require-explicit-ledger-records PASSED | Re-run by reviewer in a clean worktree at **5738ccf4**: `HANDOFF VALIDATION PASSED (2286 data files checked)`, exit 0 (WARNs pre-existing). |
| Prettier | Reviewer check at the committed bytes: `settings-wiring.tsx` and `App.tsx` at bc0307cb both PASS `prettier --config .prettierrc.json` (printWidth 100). (Pitfall logged in reviewer-gates.log: prettier run from outside the repo silently uses the 80-col default and produces false diffs.) |
| Ledger commit names the slice sha | 5738ccf4 subject ends "code bc0307cb". ✓ |
| task-state summary claim "Pure move verified token-identical per body" | Overstated by one line — see D1. |

## Clean (hygiene checklist)

- Commit pairing: separate `feat(desktop)` code commit (exactly 2 files:
  App.tsx, settings-wiring.tsx) and `ledger(...)` commit (exactly 5 files:
  gates.log, notes/APP-SPLIT-001.md, task-state.json, tasks/KANBAN.md,
  tasks/ROADMAP.yaml). Nothing unrelated swept in; no `git add -A` artifacts.
- ROADMAP card present, mirrors 003A's shape: existing-file `read_first`
  entries, plain-scalar acceptance bullets, `required_for_desktop_1_0: false`
  WITH a matching `execution_scope.optional_tasks` entry.
- task-state entry: `status: done`, `attempts: 1`, `updated` an ISO date,
  evidence path `state/evidence/APP-SPLIT-003B/gates.log` exists on disk.
- KANBAN.md `app-split-003b` row present and marked done.
- APP-SPLIT-001 blocker LOC refresh is honest and current (5336 -> 4509,
  codes list extended with 88ce090e + bc0307cb — the ledger-trail rule).
- Gates not weakened: zero test/gate-script edits in either commit.
- **003A-D1 adoption (commend):** gates.log carries a parenthetical recording
  that the notes table's 003A row (4591) disagreed with this slice's measured
  base (4594), and the new notes-table row states the true numbers WITHOUT
  rewriting the immutable 003A row — exactly the annotation-not-rewrite shape
  003A recommended. The APP-SPLIT-001 ledger row remains the one artifact still
  stating 4591 as fact (it is 003A's own record; the 003B review cannot fix it
  and 003A's review already prescribed the correction).
- No accessibility/privacy/persistence surface touched (pure move of handler
  bodies; IPC surface unchanged — same commands, same args).

## Defect D1 — "token-identical per body" overstated (evidence accuracy)

gates.log "Pure-move verification" ends "ALL IDENTICAL" for the six bodies;
independent re-run: 5/6 identical, primeSettingsReads deviates on one line by a
redundant non-null assertion (`deps.refreshLanguages!()` vs `refreshLanguages()`,
spec N1 — compile-time no-op, zero behavior impact). Same claim repeated in the
task-state summary ("token-identical per body") and the ledger commit message
("proves the move is verbatim").

Violation: CODING_STANDARDS B — claims must be measured from artifacts.
Severity: LOW — the deviation is a no-op and the functional claims are all
true; but the record should say "5 identical + 1 mechanical type adaptation".
**Disposition: no FIX card.** Corrected statement: five bodies verbatim-identical;
primeSettingsReads identical except a redundant `!` on a non-nullable member.
If a future lint config enables `@typescript-eslint/no-unnecessary-condition`
(or the file is touched for any other reason), the `!` should be dropped then —
tracked here, not spawned as a card (a one-character cosmetic would cost more
than it fixes).

## Notes

- N4 — the review card itself made no task-state flip by design (docs/evidence
  outcome per the card body); this commit is evidence-only.
- N5 — `SettingsWiringDeps` extends `SettingsPrimeDeps` and is passed to
  `runSettingsPrimes(deps: SettingsPrimeDeps)`: correct structural typing, no
  duplicate bundle. The doc comment on `runSettingsPrimes`'s interface says
  "the six engine-backed writes" (same FEEL-LOADING-001 prose as spec N2).
