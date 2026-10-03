# PACK-005 — Complete langpack CLI author workflow

Milestone M1, P1. Completed 2026-10-02.

## What was built

`langpack` CLI now covers the full author workflow (docs/04, docs/16):

- `init <dir> [--pack-id --locale --name]` — scaffolds a minimal 0.2 pack
  (manifest, empty goals, empty sources/licenses/concepts JSONL) that
  validates and lints clean immediately; refuses non-empty targets.
- `validate` (existing) — scaffold/install postures.
- `lint` — scaffold validation + curriculum + source audits; exits 1 on
  warnings as well as errors (quality gate).
- `test` — full conformance gate: install-mode validation +
  curriculum/sources/licenses audits; exits 1 on any error, warnings
  tolerated with a note. This is the CI command for pack releases.
- `audit-curriculum` — graph cycles/mirror/reachability only
  (`graph::audit_curriculum` now public).
- `audit-sources` — provenance completeness (`Pack::audit_sources`):
  `source_missing_url`, `source_missing_retrieved`,
  `source_terms_inconsistent` (reference-only + redistribution_allowed
  true), `unused_source` (Info). Warnings, not errors: url/retrieved are
  optional in the schema but required by docs/10 source-registry quality.
- `audit-licenses`, `build`, `inspect`, `install`, `rollback` (existing).

Supporting changes: `pack::references` made `pub(crate)`;
`valid-full` fixture sources.jsonl gained `url`+`retrieved` so the
reference fixture is provenance-clean; new fixture
`invalid-source-terms` (missing locator/date, reference-only claiming
redistribution, unused source).

## Acceptance evidence

1. All required commands exist — `state/evidence/PACK-005/cli-2026-10-02.txt`
   exercises init/validate/lint/test/audit-curriculum/audit-sources/
   audit-licenses (PACK-003)/build/inspect plus install/rollback.
2. Minimal pack init→validate→build→inspect from clean temp dir —
   automated test `init_validate_build_inspect_round_trip`
   (`crates/langpack-cli/tests/cli.rs`) + same flow in the CLI demo.
3. Contributor quickstart documented — `docs/QUICKSTART_PACK_AUTHORING.md`.

## Verification

- `cargo test -p lts-langpack -p lts-langpack-cli`: 45 tests OK
  (41 langpack incl. 2 new audit-sources tests + 4 new CLI e2e tests) —
  `state/evidence/PACK-005/cargo-test-2026-10-02.txt`.
- `./scripts/ci.sh`: CI OK — `state/evidence/PACK-005/ci-2026-10-02.txt`.
- Handoff validation PASS (48 files); strict release-readiness preflight
  still FAILS with the expected blockers (no content/review/rights yet) —
  `state/evidence/PACK-005/handoff-validation-2026-10-02.txt`.

## Notes / decisions

- `lint` fails on warnings (lint convention); fixtures used in CI for
  lint-clean checks are warning-clean by construction.
- `test` tolerates warnings (e.g. provenance gaps) but blocks on install
  gates; the seed ja-JP draft correctly fails `test` pending LIC-001 and
  review, which the CLI demo shows.
- No signing/trust changes here (unchanged from PACK-004 decision).
