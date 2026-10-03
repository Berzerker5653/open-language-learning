# Test layout and fixture conventions

Per `docs/19_PROJECT_FILE_ARCHITECTURE.md` and `docs/09_TESTING_AND_ACCEPTANCE.md`.

## Where tests live

- Rust unit/integration: `crates/<crate>/tests/` or inline `#[cfg(test)]`.
- TS unit/component: `packages/*/src/*.test.ts(x)`, app-level in `apps/desktop/src/`.
- Cross-system E2E: `tests/e2e/` (scripts driving the real app, e.g. `scripts/smoke-desktop.sh`).
- Pack conformance fixtures: `tests/fixtures/`; hostile archives: `tests/malicious-packs/`.
- Performance harnesses: `tests/performance/` (contracts frozen by PERF-001 before use).
- Handoff scaffold validator (spec-level, not app): `tools/` with `tests` in `audit/`.

## Fixture rules

1. Deterministic: fixed clocks, seeds, and locales; no wall-clock or network dependence.
2. Provenance: any imported data (dictionary rows, audio, corpora) needs a license/provenance
   record before it may be committed; private recordings are never committed (AGENTS.md security
   boundaries). Reference-only sources stay out of the repo.
3. Naming: fixtures named by behavior under test (`unknown-reference.yaml`, not `test1.yaml`).
4. Malicious/security fixtures stay under `tests/malicious-packs/` and are never installed by
   non-test code paths.
5. Speech fixtures follow `docs/05`/`docs/17` consent and permissioning rules; synthetic
   known-error audio requires human listening checks before use as labeled evidence.

## Adding a test

- Test observable behavior and invariants, not implementation trivia (AGENTS.md).
- A bug fix needs a regression test that fails before the fix when practical.
- Permanent tests must survive the full suite: isolated temp dirs, no shared mutable state.
