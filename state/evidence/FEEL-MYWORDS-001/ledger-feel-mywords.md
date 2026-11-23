# FEEL-MYWORDS-001 — ledger close

Status: done (attempt 2; takeover of 80/80-capped run 207).

What shipped (code 8df121be, red contract b94a90c5, card 036b89a6):

- My Words list is now a `.mine-list` of `.mine-card` rows: surface bg,
  hairline `var(--line)` border, `var(--radius)`, `var(--shadow)`,
  `0.8rem 1rem` padding, `0.6rem` gaps — matching the TARGET mockup
  (`.mine-card` naming per contract; `.word-card` was taken by the mobile
  story sheet).
- Raw ISO due slice replaced by exported pure helper `relativeDueLabel`
  (yesterday / N days overdue / today / tomorrow / in N days / in ~N months /
  in ~N years) rendered as the accent `.due` pill with a `::before` clock
  glyph; unscheduled words get a quiet `.due--new` "new" pill.
- Remove is undoable: the row leaves at once, a `.undo-chip` (↺ UNDO + word)
  lives 4 s where the row stood, `mine_remove` fires only after the chip's
  life (measured: zero calls until t=6525 ms, exactly one after); UNDO
  cancels; a new Remove commits the previous pending one first; unmount
  flushes any pending delete.
- Add-word success pulse: `addMine` passes the returned id as `flashId`;
  the row runs `fade-up` + new `mine-arrive` wash once.
- Review reveal rides FEEL-GLOBAL: `.review-card` enters `card-in`,
  `.review-reveal` rises `fade-up`; grade buttons keep shared `.btn`
  transitions. All new durations in the `--dur-*` family; reduced-motion
  flattens it.

Verification: red-at-base real-engine capture 0/7 (red/) vs green 7/7 at
HEAD (capture-*-at-*.log, result.json, shots my-words-at-rest /
mid-undo-chip / add-word-pulse / review-reveal). Lane gates green on the
exact committed bytes at close — tsc 0, vitest 67 files / 580 tests, eslint,
prettier, audit_learner_copy findings 0 (gates.log). No Rust/engine change:
the undo window is a panel-side deferred delete; `mine_remove` semantics
untouched.

Takeover note: run 207 died at the iteration cap with code+red committed
and captures done; attempt 2 executed its frozen recipe (gate battery
re-run, evidence + ledger close) without re-deriving scope.
