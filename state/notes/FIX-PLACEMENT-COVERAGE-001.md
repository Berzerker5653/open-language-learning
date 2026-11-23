# FIX-PLACEMENT-COVERAGE-001 — placement coverage test HEAD-red

## Symptom
`tests::placement_coverage_names_why_a_rubric_has_no_question` failed at HEAD
(red verified by the PATH-VISUAL-001 controller at c1ca2fe and 1451aef,
state/evidence/PATH-VISUAL-001/gates.log). `lts-desktop --lib` was otherwise
fully green.

Failure line: the listening rubric `ja.assess.demo.kana-listen` reported
`modality-unsupported / builder-refused:comprehension-listening:ja.contrast.demo.vowel-length:unknown practice target`
while the test asserted `no-content / no-activity-at-modality:listening:ja.goal.demo.kana-hiragana`.

## Env artifact ruled out first
A first local run died with `cannot find value ERROR_REVIEW_SCHEDULER` —
the known stale-rlib artifact from worktree runs sharing CARGO_TARGET_DIR
(the symbol exists in `crates/scheduler`). `cargo clean -p lts-scheduler`
fixed compilation; the assertion failure underneath is the real lane issue.

## Blame / root cause
`git log -S discriminate-vowel-length` isolates **2b13a7b** (ORPHAN-CONTENT-001,
2026-11-22): that lane claimed the demo contrast `ja.contrast.demo.vowel-length`
onto unit 010-kana-hiragana with a `listen-and-choose`/`listening` activity so
the fail-CLOSED ladder rule has no orphan contrast in the scaffold. The goal
therefore *does* declare a listening stage now. The runner table
(`activity_runner`) intentionally maps `("listen-and-choose","listening")` →
`comprehension-listening`, and the practice builder refuses the contrast pair
("unknown practice target"), so the engine's honest abstention blocker moved
from "no activity at modality" to "builder refused" — exactly the shape the
same test already asserts for printed-symbols rubric cov[3].

## Decision (per skill rule)
The test asserted the superseded fixture shape; the engine semantics did not
regress and the fixture change is required by the ladder rule. **Rewrote the
test** to assert the new contract (cov[2] = modality-unsupported with the
builder refusal over the contrast), and refreshed the sibling assertion's
stale rationale string in `placement_never_substitutes_or_repeats_a_diagnostic_item`
(behavior unchanged there — the plan contents are identical).

## Deferred / follow-up candidates (not in scope)
- Whether placement should ever be able to serve listen-and-choose contrast
  pairs (a discrimination runner) is an engine-roadmap question, not a test fix.
