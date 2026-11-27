# REVIEW-G4-EXPLAIN-001 — STANDARDS verdict

**VERDICT: PASS-WITH-NOTES** — repo conventions per AGENTS.md + CODING_STANDARDS.md
section B, plus commit/ledger hygiene. No FIX card required.

## Ledger / commit hygiene

- Separate code (`63f139a8 feat(ai): …`) and ledger (`a5cabf22 ledger(…): done`)
  commits, ledger message names the code sha. GOOD.
- Evidence under `state/evidence/G4-EXPLAIN-001/gates.log`, referenced from
  task-state `evidence` (existing file path — validate_handoff-legal). GOOD.
- KANBAN.md row updated in the done table with sha + evidence + deferred note.
  GOOD. `python3 tools/validate_handoff.py --require-explicit-ledger-records`
  re-run at review time: PASSED (2 pre-existing unrelated WARNs).
- No junk in the diff: 15 files, every one feature-relevant or mandated
  (docs/18, test fixtures). No lockfile/Cargo.toml hunk, corroborating the
  "ureq was already a dependency, no new deps" claim.
- **Note S1:** the card acceptance says the *ledger commit* should carry
  `gates.log`; it rode the code commit instead (ledger message points at the
  path). Placement deviation only — the evidence is committed, complete, and
  referenced. No action.
- **Note S2:** gates.log records a first `tsc --noEmit` exit 1 with a passing
  rerun and no stated cause for the first failure. Transparent but thin — a
  one-line cause ("sibling lane WIP mid-run" / "fixture re-pin pending") would
  make the log self-explanatory. Immutable record; not touched.

## CODING_STANDARDS.md section B, item by item

- **Privacy minimized / no upload path without notice:** exemplary — off by
  default, consent before first byte with the notice naming exactly what leaves
  (card text + direction), consent re-checked server-side per press (revocation
  honored on the next press), failure copy "nothing was stored", URL scheme
  validated on store AND at request time. Pinned at both layers.
- **Offline first-class:** disabled/empty-URL/failure states are the honest
  unavailable panel; core app behaves exactly as before (pinned; test asserts
  zero provider calls when disabled).
- **Accessibility lands with the component:** `role="dialog"` + aria-label on
  consent, `role="status" aria-live="polite"` on loading/unavailable, labeled
  inputs in the Settings card. GOOD.
- **Confidence ≠ correctness:** the system prompt forbids grading/verdict
  language; the panel copy disclaims "never a grade"; honest abstention
  everywhere (empty content is a failure, not a blank panel). GOOD.
- **Deterministic core / behavior-not-trivia tests:** wiring is pure functions
  over injected `inv`; pins assert commands issued + copy, not internals. The
  prose-note count re-pins (12→13, 13→14) were updated in the same commit with
  explanatory comments — exactly the test-sweep discipline the lane skill
  demands when a shared component gains required props (all three SettingsProps
  fixtures updated in-commit).
- **Commit-message honesty:** every gate claim in the message matches gates.log;
  the live local-model round trip is marked DEFERRED, never claimed. GOOD.

## Reviewer-verified gates (see reviewer-gates.log)

Targeted vitest 15/15, targeted `cargo test -p lts-desktop explain::` 10/10
(incl. zero-store-writes), `tsc --noEmit` exit 0, validate_handoff PASSED —
all re-run independently at HEAD after SPEAK/WRITE-PRACTICE landed, so the
lane is still green under the current tree.
