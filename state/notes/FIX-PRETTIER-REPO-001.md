# FIX-PRETTIER-REPO-001 — repo-wide prettier so CI web job `pnpm fmt:check` goes green

## Contract
CI web job (`.github/workflows/ci.yml`, web job `pnpm fmt:check`) was red repo-wide at HEAD:
17 files drifted from Prettier, from several recent lanes (accumulation-screens, dictation,
settings-wiring, empty-states, home, walkthrough, serve-probe, reading, writing, free-writing +
harness from WRITE-PRACTICE-001, plus two scripts capture harnesses). eslint clean; formatting
drift only.

## Execution
- Red-at-HEAD file list captured at base a832bfae before touching anything
  (`state/evidence/FIX-PRETTIER-REPO-001/red-at-head.log`).
- `pnpm exec prettier --write` scoped to exactly the 17 flagged paths (list in
  red-at-head.log). 17 files changed, +172/-63 — whitespace/line-breaks/quotes only.
- Concurrent sibling lanes (FIX-M2-SUPPLY-RU-001: langpack/graph.rs + goals.yaml files)
  were dirty in the shared tree at claim time; NONE of their paths overlap the 17 and none
  were staged or touched.
- No Rust, no pack content, no schema touched → cargo gates not required by the card.

## Deferred / known-annoying
- CI's vitest prints a transform-cache hint (`fsModuleCache: true`); a perf card could bake it in.
- Prettier drift recurs because lanes commit before running `pnpm fmt`; the web job catches it
  at PR time. If it keeps recurring, a pre-commit hook or lane-protocol `pnpm fmt` step is the
  fix (not this card's scope).
