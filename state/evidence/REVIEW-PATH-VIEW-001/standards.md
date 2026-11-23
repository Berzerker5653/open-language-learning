# REVIEW-PATH-VIEW-001 — STANDARDS axis verdict

Diff: `64489e8` + `a69cde0` (code+harness), `7c69cdf` + `7d723b8` (ledger).
Reference posture: prior REVIEW-PATH-VISUAL-001 standards verdict.

## Outcome: approved-with-notes

### Commit / ledger hygiene — pass

- Code and ledger separated exactly per lane rule: `64489e8` code+evidence, `7c69cdf`
  ledger/gate record, `a69cde0` touches only the capture script (verified by file list),
  `7d723b8` ledger close. Commit messages match evidence numbers (vitest 482, 15/15 checks)
  and name blockers honestly (systemd 203/EXEC on the dead runs' gate unit).
- Evidence paths in the ledger close exist on disk: `gates.log`, `result.json`, and all
  three capture pngs. `state/task-state.json` PATH-VIEW-001 → done with acceptance evidence;
  ROADMAP PATH-VIEW-001 entry exists (added 7c69cdf) with read_first pointing at the
  evidence — no ledger n/a needed. This review card itself has no ROADMAP entry (board-only),
  so ledger n/a for it.
- Notes REMAINING RECIPE was executed as written; the stray root c1.png/c4.png junk was
  correctly left uncommitted.

### Gates posture — pass with standing note

- gates.log is a full battery digest with named crates/suites and exit codes, not
  tail-clipped: fmt, `-p` scoped clippy with `-D warnings`, scoped cargo test, tsc,
  vitest. It is summary-style rather than raw full output — same posture accepted at
  REVIEW-PATH-VISUAL-001; every run is attributable and no gate was weakened or skipped.

### Capture-harness pitfalls (serve-mode notes) — honored except one

Honored: serve binary built from current main; `SERVE_DIST` is the dist dir; pack installed
via serve's own `install_pack` command (same code as desktop); `Page.enable` after attach
with explicit sessionId; `scrollIntoView` + viewport-only pin shot with post-shot
`pinVisible` re-assert; element-walk assertions scoped to the path container (never
`body.innerText`); backdating fixture applied while serve was down; chrome profile cleanup.

Not honored (**D2**): no stable-home poll before shots and no post-shot home re-verify.
The acceptance pngs therefore show a contradictory "No language is set for this profile
yet" card on a fully-loaded plan/path screen. The lane recorded the banner as a home-region
observation, which keeps it honest, but a future capture run must poll for a stable healthy
home first (skill rule) so evidence shots don't carry transient/contradictory state.

### Engine-semantics drift — none

`unit_path_at` reads store + today's plan + scheduler_state only; done = evidence-backed
refs at the Introduced floor; review_due keyed by CONTENT id (the accepted attempt-2 fix);
shared command table means serve and desktop serve identical semantics. PATH-VISUAL-001's
done-floor semantics unchanged. No card re-plans anything.

### Repo conventions — pass

Typed node schema, behavior tests (state semantics, not trivia), accessibility of path rows
unchanged by this diff, no model binaries/private data committed. Vision QA performed on
2 representative shots (lane) plus 2 crops re-checked by this review; text glitches visible
in shots ("about 5 minutesReview due (2)" join) are already recorded for PATH-WHATSNEXT-001
in the ledger — correctly not fixed out-of-scope here.

### Harness wording note (not a defect)

Check "today's plan pins exactly one current unit" asserts `current.length >= 1` —
at-least-one, not exactly-one. Harness surface only; name or assertion should match next
time the harness is touched.
