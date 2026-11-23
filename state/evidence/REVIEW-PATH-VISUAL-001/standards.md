# REVIEW-PATH-VISUAL-001 — STANDARDS axis verdict

Diff: `758bd71` (code) + `409140f` (ledger close), against
CODING_STANDARDS.md section A (gates: named, not re-litigated) and B
(judgement calls).

## Outcome: approved-with-notes

### Gate tier (A)

- Lane-scoped tier correct: fmt, clippy `-p lts-desktop -D warnings`,
  `cargo test -p lts-desktop --lib`, tsc, vitest, acceptance capture — full
  workspace sweeps are release-tier only (owner directive 2026-11-19).
- The one red in the lane battery (`placement_coverage_names_why_a_rubric_
  has_no_question`) was NOT weakened or skipped: named, counted (227/228),
  and re-proven red at pre-lane HEAD `1451aef` in a throwaway worktree
  (gates.log CONTROLLER APPENDIX). No gate was bent to pass. J8 holds.
- Independently re-verified by this review at HEAD: the named red test
  (`letter_unit_goes_in_progress_then_done_as_its_refs_are_proven`) and the
  attendance red test both PASS; `cargo fmt --all --check` OK; `tsc
  --noEmit` OK; vitest path-view suite 12/12;
  `python tools/validate_handoff.py --require-explicit-ledger-records`
  exit 0.

### Judgement calls (B)

- **Commit hygiene** ✓ — code and ledger in separate commits; commit message
  asserts only verifications that ran, and every named number checks out
  against gates.log/result.json. Follow-up honesty is exemplary: the lane
  flagged its own two cosmetic defects (sway overlap, duplicate "You are
  here") in the ledger commit, which became FIX-PATH-VISUAL-001-1.
- **Deterministic core logic** ✓ — sway is a pure function of node index;
  capture and vitest measure the same constants every run. No clocks, no
  RNG in the track.
- **Behavior over implementation trivia** ✓ — the engine test drives real
  drill/encounter flows through the API. Minor note: vitest asserts the
  ±29/0 sway px values in markup (slightly trivia-adjacent), but that is
  the audit's cross-check handle for the documented formula — acceptable.
- **Data layer discipline** ✓ — engine change is confined to the path VIEW
  projection (`UnitPathNodeView` additive fields); the `done` rewrite from
  `.all(...)` to `refs_done == refs.len()` is semantically identical
  (incl. empty-refs edge). No storage/schema/pack changes; no
  versioning/migration obligations triggered.
- **Out-of-scope extras**: none — capture script is named in the card's
  gate 3, harness.tsx fields are required by the new interface, ROADMAP
  card is validator-required. The card rode the code commit, as the ledger
  note states.
- **Privacy/offline** ✓ — no new collection; capture harness is dev-only,
  serve stays trusted-network local.
- **Copy standard** ✓ — en-US, no ticket ids or bare unit ids in
  learner-facing strings.

### Notes (not defects)

- **N1 — gates.log is a digest, not a raw transcript.** One summary line
  per gate plus the failing test's full result line. Honest and
  diagnosable (the failure is named and re-proven at HEAD), but a future
  lane should keep the raw output; the skill's tail-clipping pitfall is
  adjacent here.
- **N2 — accessibility: state semantics are visual-only beyond the text
  labels.** Ring and lock glyph are correctly `aria-hidden` as decoration,
  but the locked/current distinction has no accessible-name equivalent
  (node `<li>` carries only `data-state`). Partial progress IS conveyed
  textually ("In progress (n/m learned)") for unpinned nodes. Pre-existing
  PATH-VIEW-001 pattern; worth one a11y follow-up when the path component
  gets its aria pass.
