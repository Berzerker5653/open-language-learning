# Owner acceptance — 2026-10-19

The owner accepted the review-column card `guided-session` (this task) on
2026-10-19, together with the paired U-findings from the 2026-10-14/15
review pass. Acceptance covers the implemented behavior as recorded in
`state/evidence/GUIDED-SESSION-001/IMPLEMENTATION-2026-10-15.md`.

U-findings closed against this card since implementation (commits on
main, measured runs in `state/notes/`):

- U01 idle Today freeze — `state/notes/U01.md` (idle-stability journey pins 1/1 counts).
- U02 language switch wedged — `state/notes/U02.md` (coordinated `switchLearning`, generation guard, switch journey).
- U03 new-word list dead — `state/notes/U03.md` (`mine_new`/`mine_new_at` + words journey leg).

What remains owner-gated and is NOT covered by this acceptance: the
hands-on pass against the published artifact (O-03 / the
`docs/21_HUMAN_REVIEW_RUNBOOKS.md` human sweep).
