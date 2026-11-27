# STANDARDS verdict — SPEECH-CATALOG-001 (code 6626cc73, chore 16acebff, ledger 873bd3db)

**Verdict: PASS-WITH-NOTES.** Repo conventions, ledger hygiene, and evidence
honestness hold. Notes D2/D3 from the spec axis are also standards findings
(copy claim vs mechanism; AGENTS.md test minimum). Nothing here blocks.

## A. Machine gates — reviewer re-runs at 873bd3db (detached worktree, shared CARGO_TARGET_DIR)

See `reviewer-gates.log`. All independently re-run, not trusted from the card:

- `cargo fmt --all --check` — exit 0
- `cargo clippy -p lts-desktop --all-targets -- -D warnings` — exit 0
- `cargo test -p lts-desktop --lib` — 264 passed / 0 failed / 2 ignored (matches the lane's claimed number exactly)
- `npm run -s typecheck` (tsc strict) — exit 0
- `npm run -s test` (vitest) — 725 passed / 725 (matches the claimed number)
- `python3 tools/validate_handoff.py` at the ledger commit in the clean worktree — PASSED
- `python3 tools/audit_learner_copy.py` — 0 findings

## B. Judgement calls

- **Versioning + migration for persisted data:** `speech.json` gains
  `schema_version` with a v1→v2 load migration and rollback consequence stated
  in ADR-0042. PASS.
- **ADR for a major architecture change:** ADR-0042 present and committed
  before the code (3192c6a1), with Context/Decision/Consequences/Alternatives.
  PASS — but D1: the shipped startup auto-refresh contradicts the ADR's own
  rejected-alternatives list; governance requires the ADR to be amended, not
  the code excused.
- **Fail-closed / offline-first:** remote catalog is an enhancement; bundled
  copy always remains and the offline path is first-class (fetch failure or
  hostile payload keeps last-good). PASS.
- **Privacy:** catalog refresh is metadata-only GET of the project's own
  public file; models still download only on explicit install. No new
  collection. PASS.
- **Confidence ≠ correctness:** `off`-abstention semantics preserved at both
  preference levels. PASS.
- **Accessibility with the component:** new picker rows use real `<label
  htmlFor>` + `<select id>`; refresh button is `type=button` with `aria-busy`
  and a disabled busy state. PASS.
- **Commit discipline:** three commits, each scoped and honestly messaged —
  the feat commit states its gate battery, the chore commit explains why
  pre-existing rot was removed first (and only asserts checks the diff shows
  were run), the ledger commit carries only task-state. Ledger commit separate
  from code. PASS.
- **Evidence logs real:** `state/evidence/SPEECH-CATALOG-001/gates.log`
  contains full command output with 525 `test … ok` lines and the exact
  `264 passed` line; `vitest-retry.log` ends `vitest_retry_exit=0`; the
  controller addendum records the freshness-test ordering fix and the
  dictation vendor-flake classification as flakes-with-green-standalone, not
  as never-failed. Spot-checked against my own re-run — no overclaiming. PASS.
- **Out-of-scope extras (CODING_STANDARDS B):** the startup stale-gated
  background refresh is beyond the card's six-item ship list (→ D1); the
  prettier-only reformat in App.tsx is incidental to owned files. Minor,
  disclosed. PASS-WITH-NOTE.
- **Copy claims measured from artifacts:** the "checks at startup and weekly"
  copy overstates the mechanism (startup-only; no weekly timer) — this is the
  same defect as spec D2, and it fails the "measured, not hoped" bar even
  though `audit_learner_copy` doesn't catch it. FLAG.
- **Ledger:** `active_task` correctly nulled on close, status `done` with all
  three evidence paths, attempts untouched. PASS.
- **Hygiene:** no pack audio, no secrets, no model binaries; `catalog/models.json`
  carries the same supply-chain pins as the bundled copy. PASS.

## Net

Ship stays `done`. Spawned FIX card for: D1 (ADR alignment), D2 (copy honesty),
D3 (frontend tests), D4 (bundled catalog_version), D5 (unpinned validation
rules), D6 (zero-files installable hole). D7/D8 noted in the spec verdict for
whatever future lane touches that surface.
