# REVIEW-FIX-PATH-VISUAL-001-1 — STANDARDS axis verdict

Target: `e1ee8231` (code) + `12b920bc` (ledger close) + surrounding
chore commits `218652d8` (fmt) / `5af75bf4` (lint).

## Outcome: approved-with-notes

### Hygiene verified

- **Code vs ledger separated.** `e1ee8231` = view + CSS + test +
  harness only; `12b920bc` = task-state + ROADMAP + notes + evidence.
  Controller fmt/lint fixes rode their own chore commits — the
  sanctioned fix-on-spot shape, honestly labeled and disclosed in
  gates.log and the notes.
- **Evidence paths exist per task-state record.** All six listed paths
  (gates.log, result.json, capture-run.log, both pngs, notes) on disk
  under `state/evidence/FIX-PATH-VISUAL-001-1/`.
  `python3 tools/validate_handoff.py --require-explicit-ledger-records`
  re-run at HEAD: PASSED (2262 data files; only pre-existing optional-
  task WARNs, unrelated).
- **ROADMAP link verified.** `FIX-PATH-VISUAL-001-1` card exists with
  dependencies `[PATH-VISUAL-001]`, existing-file read_first paths,
  plain-scalar acceptance bullets, and `required_for_desktop_1_0:
  false` correctly mirrored into `execution_scope.optional_tasks`.
  task-state entry: `done`, attempts 1, ISO date `updated`, summary +
  notes (home.tsx hotspot flag present — see hotspot note below).
- **Capture harness measures element rects, not innerText.** New gates
  use `getBoundingClientRect` pairwise; no body-text assertions added.
  The pin gate reports DOM pin units alongside the API's real current
  list — measurement crosses the API/DOM boundary honestly.
- **No weakening of the winding-look gate.** `dom.xSpread >= 20`
  present verbatim in the committed script (lines 417-418); capture
  measured xSpreadPx 58. The lane's own notes reject amplitude
  shrinking for exactly this reason.
- **Gate tier correct.** Rust untouched -> fmt only, no fake scoped
  cargo test claims; frontend lane -> tsc + vitest (490/490 logged) +
  eslint/prettier + root pnpm test 502/502 logged. Reviewer did not
  re-run the full battery (NO-REVERIFY); the named acceptance test was
  independently re-run green at HEAD.
- **Commit-message honesty.** Every completed-tense claim in the
  message matches gates.log + capture-run.log + result.json values
  (17/17, overlapCount 0, minClearancePx 3, domPins 1 / apiCurrent 3,
  xSpread 58).
- **Vision inspection done by this review** (owner rule: green harness
  != inspection): pin-region png shows one "You are here" on the first
  teal current ring with a second teal current ring uncaptioned and no
  ring/text overlap; full-journey png shows the serpentine sway with a
  straight label column, exactly one caption anywhere, no clipping or
  right-edge overflow. The full shot's top banner still shows
  serve-mode capability text — that is pre-SERVE-BANNER-001 bytes at
  capture time, not a defect of this lane.

### Notes

- **gates.log is digest-style, not verbatim full output** (commands +
  rc + counts, full capture log separate as capture-run.log). Same
  note as the parent review; nothing was tail-clipped hiding errors.
- **`home.tsx` hotspot flag stands** (already in task-state notes):
  three path lanes touched it within 24h (this fix, PATH-LOCK-ORDER-
  001, TODAY-FIRSTSCREEN-001) plus PATH-PIN-CONSISTENCY-001 queued
  against the same pin rule — decompose before more work lands there.
- **Precedence coupling worth knowing:** pinTarget rides
  `pathNodeState` current-beats-in-progress; the queued
  PATH-PIN-CONSISTENCY-001 will redefine pin placement (first
  in-progress else first not-done unlocked). That is planned evolution,
  not drift in this lane.
