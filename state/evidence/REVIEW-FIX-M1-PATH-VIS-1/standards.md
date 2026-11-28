# REVIEW-FIX-M1-PATH-VIS-1 — STANDARDS axis verdict (board t_edc58d06, 2026-11-28)

Scope: AGENTS.md + CODING_STANDARDS.md §B judgement list, test hygiene,
commit/ledger hygiene, accessibility of the touched control. Reviewer ran on
HEAD b3c3e272; no product file drifted since b106252b (git log empty for the 4
touched paths).

## VERDICT: STANDARDS PASS (one non-actionable observation recorded, no defect).

- PASS — tests assert behavior, not implementation trivia. The SSR pin asserts
  learner-visible strings and the arithmetic invariant (header total == rendered
  rows + counted row); the tap pin asserts DOM outcomes after a real click
  (rows appear, control unmounts, header aria-expanded flips honest). No pin
  asserts internal state shape or CSS trivia.
- PASS — test hygiene: no assertion was weakened; two harness checks were
  TIGHTENED. The `collapsedTotal >= 400` floor (the exact mask that hid S-D1:
  803/811 passed it) became strict equality; the weak tap check
  (`rows > before`, on-ramp only — the case that proved nothing) was replaced by
  two strictly stronger checks (closed band: rowsInSection 0 -> 0+counted exactly,
  control gone; plus the accordion-moved band). Old coverage (on-ramp tap)
  survives as the reopened instance of the stronger invariant — replaced, not dropped.
- PASS — lane-tier gates honest and sufficient: no Rust or pack touched, and
  gates.log says so instead of faking cargo rows. The claimed vitest figure is
  backed independently — the verification lane re-ran 735/735 at aca24b1e, and
  the reviewer re-ran the two pinned files at HEAD (48/48, 2 files passed)
  with zero drift since the fix commit.
- PASS — commit hygiene: one tree labeled for both cards (the precedent the
  parent card pre-authorized, and gates.log says why splitting would be false
  archaeology); a3ed01e7's message asserts only verifications that ran
  (code-read at HEAD, capture re-read, gates re-run); b106252b..HEAD is
  forward-only, no rewrite/reset of shared main.
- PASS — ledger accurate end-to-end (reviewer re-ran the machine gate at HEAD):
  `python3 tools/validate_handoff.py --require-explicit-ledger-records` ->
  HANDOFF VALIDATION PASSED (only pre-existing WARN rows). task-state
  FIX-M1-PATH-VIS-1 + FIX-M1-PATH-VIS-2 both `done`, attempts 1, ISO dates, and
  EVERY evidence path in both entries exists on disk (reviewer ls'd all 6).
  KANBAN.md line 46 records both cards under one row with the correct
  measurements (811/811, 0->91, 0->21, 11/11). ROADMAP additions landed in
  aca24b1e (28 lines) and validate legal. 95b0abbf (evidence) is an ancestor of
  HEAD (`git merge-base --is-ancestor` verified).
- PASS — accessibility of the touched control: it is the SAME native
  `<button type="button">` (keyboard path unchanged); min-height 3rem = 48px
  (packages/ui/src/styles.css:2260-2263, unchanged by the diff) meets the 44px
  floor, and the capture carries a green geometry audit
  ("layout integrity: counted group rows meet the 44px touch minimum"). The
  new behavior keeps the state honest: the button's static aria-expanded=false
  is accurate (its tail is closed while it exists); after a tap the button
  unmounts and the section header's dynamic aria-expanded={isOpen} reports true
  — pinned in path-view-tap.test.tsx.
- PASS — no privacy/offline/versioning dimension touched (UI counting logic
  only; no persisted-data, pack-schema, or provider changes).

Observation (NON-defect, no FIX-CANDIDATE): b106252b's message sentence
"Capture re-run evidence lands in state/evidence/FIX-M1-PATH-VIS-1/" is
inaccurate about the landing DIR — the capture artifacts actually landed in
state/evidence/FIX-M1-PATH-VIS-001/ (tag vis1-green). No in-tree corrective
exists to make: the machine ledger (task-state evidence arrays) cites the TRUE
paths, FIX-M1-PATH-VIS-1/gates.log documents the true output location and the
worktree-build provenance, evidence commit 95b0abbf's own stat is
self-correcting, and commit history is immutable per CODING_STANDARDS.md.
Future capture re-runs that want per-card evidence dirs should pass the dir,
not only CAPTURE_TAG; the planner inherited this imprecision into card bodies
(THIS review card's body repeats it) — worth a one-line planner wording note,
not a FIX card.

Defect tally: 0 MAJOR / 0 MINOR / 0 FIX-CANDIDATE comments.
