# REVIEW-FIX-PLACEMENT-COVERAGE-001 — two-axis verdict (spec + standards)

Reviewed lane: code `97a73f9` (lib.rs only) + ledger `9fc86649`
Contract: `state/notes/FIX-PLACEMENT-COVERAGE-001.md`, ROADMAP acceptance trio
Reviewer: hermes-kanban-reviewer (default profile), 2026-11-23

## Verdict: SPEC — PASS

Diff scope vs card asks, item by item:

1. **Named test green at HEAD asserting the new builder-refused contract** — met.
   The diff rewrites only `tests::placement_coverage_names_why_a_rubric_has_no_question`
   cov[2]: old exact tuple `("no-content", "no-activity-at-modality:listening:...")`
   → `status == "modality-unsupported"` + reason pinned via
   `starts_with("builder-refused:comprehension-listening:ja.contrast.demo.vowel-length:")`
   and `contains("unknown practice target")`. This matches the observed HEAD
   behavior quoted verbatim in `repro-red-at-head.log` (left side of the failure),
   and mirrors the existing cov[3] assertion style in the same test
   (status eq + starts_with/contains on the reason) — same-test convention, not a
   weakening. `test-full-lib.log` line 130:
   `test tests::placement_coverage_names_why_a_rubric_has_no_question ... ok`,
   result 228 passed / 0 failed / 2 ignored.
2. **FAILED set = baseline minus this test** — met. gates.log baseline-diff line:
   pre-existing FAILED set {this test} (227/228 per PATH-VISUAL-001 gates.log),
   post-fix FAILED set empty. Repro shas c1ca2fe/1451aef + stranding merge 2b13a7b
   match the blame in the notes.
3. **LANE-tier gates logged** — met: fmt exit 0, full `--lib` suite, clippy
   `-p lts-desktop --all-targets -D warnings` clean (clippy-lts-desktop.log),
   frontend correctly skipped (lane touched no frontend files).

Nothing more: engine code untouched — both hunks are inside `mod tests`
(assertions + rationale strings). The sibling rationale-string refresh in
`placement_never_substitutes_or_repeats_a_diagnostic_item` is a one-line doc
string that became factually false via the same ORPHAN-CONTENT-001 fixture
claim; it is disclosed in the commit body and notes, behavior unchanged —
in-scope correction, not scope creep.

Nothing less: all three acceptance bullets evidenced; the engine-roadmap
question (serving contrast discrimination pairs) is explicitly deferred, not
silently implemented.

## Verdict: STANDARDS — PASS with 1 minor defect

Conventions honored:

- Commit separation and messages: `test(placement): ...` (code) and
  `ledger(FIX-PLACEMENT-COVERAGE-001): close — ...` (ledger) match repo
  type(scope) convention; ledger message carries the shas/suite numbers.
- Ledger hygiene: task-state record complete (status `done`, attempts 1,
  dependency ORPHAN-CONTENT-001 matches ROADMAP, all 5 evidence paths exist on
  disk, summary/notes honest incl. the stale-rlib env-artifact ruling-out);
  ROADMAP card + `execution_scope` entry added; zero `"status": "in_progress"`
  records at 9fc86649, so the one-in_progress rule is not violated by this close.
- Gate integrity: the test was rewritten to a *changed contract whose blame is
  isolated to 2b13a7b*, with the red-at-head repro preserved — the AGENTS.md
  "test asserted the superseded fixture shape" path, not a gate weakening.
  The old red log is kept as evidence rather than deleted.
- `python3 tools/validate_handoff.py` at HEAD: **PASSED** (2264 data files; 2
  standing WARNs unrelated to this lane).
- Note (not a defect): gates ran against `12b920b + lane`; the lane is now two
  other lanes downstream (HEAD 43474213) with this test still in the suite green
  at 228-test count — no re-run performed per review protocol (docs-only review).

### Defect list for the planner

- **D1 (minor, docs)** — `apps/desktop/src-tauri/src/lib.rs:12117`: the shared
  fixture's doc comment still says the kana-listen entry is "a listening rubric
  for a goal that declares no listening activity". The lane's own rewrite proves
  that shape is superseded (the kana goal now declares a listen-and-choose
  stage); the comment now misdescribes `JA_DEMO_PLACEMENT_ASSESSMENTS` to future
  readers. One-line comment fix, own card or ride the next lib.rs lane.

## Review record

`review-record.jsonl` in this directory follows the REVIEW-FIX-PATH-VISUAL-001-1
convention. No task-state/ROADMAP record added for this review card, matching
how earlier REVIEW-* cards landed (50ecb149).
