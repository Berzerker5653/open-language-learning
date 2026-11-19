# GRAMMAR-LABELS-001 — controller gate record (2026-11-19 ~09:35 MST)

Lane authored across the 03:00/06:00/09:00 driver bursts (all three hit their
iteration budget mid-card); verified + formatted + committed by the controller.

## What the lane contains
- Backend: `scripts/build-grammar-labels.py` (pymorphy3==2.0.6 pinned, dictionary-attested
  parses only, punctuation-probe hardened), `scripts/test_grammar_labels.py`.
- Data: `languages/ru-RU/media/labels.jsonl` — 937/945 ru sentences labeled,
  deterministic regeneration verified.
- Langpack: `GrammarLabel` type + `parse_grammar_labels` + Pack accessors + loader
  branch; audit/layout whitelists; `crates/langpack/tests/grammar_labels.rs` (3 tests).
- Desktop: token-label types + interlinear render + full-form expansions in the lookup
  panel (`reading.tsx`), global toggle in Display settings (`language.tsx`) persisted
  via new `grammar-labels` engine setting (on by default), `story_view` sidecar
  passthrough + settings round-trip Rust tests, `App.tsx` wiring, vitest fixtures +
  toggle test.

## Controller-verified gates (all personally re-run 2026-11-19 09:31-09:35)
- `python3 scripts/test_grammar_labels.py` — 11/11 OK (six cases, aspect pairs, degradation)
- `python3 scripts/build-grammar-labels.py --check` — labels.jsonl matches regeneration
- `cargo fmt --all --check` — clean after controller applied one outstanding fmt hunk
- `cargo clippy -p lts-langpack -p lts-desktop --all-targets -- -D warnings` — rc=0
- `cargo test -q -p lts-langpack` — all suites ok incl. 3 new grammar_labels tests
- `npm run -s typecheck` (apps/desktop) — rc=0
- `npm run -s test` (apps/desktop) — Test Files 49 passed, Tests 374 passed
- `npx eslint src/reading.tsx src/language.tsx src/stress.tsx src/App.tsx src/journeys/harness.tsx` — clean
- prettier reformat applied to lane files; `tools/audit_learner_copy.py` — 0 findings
- `cargo test -p lts-desktop --lib` + `cargo test -p lts-storage` — see appended result below

## Final results (09:38)
- `cargo test -q -p lts-desktop --lib` — ok, 190 passed / 0 failed (2 pre-existing ignored) incl. settings round-trip + story_view sidecar passthrough
- `cargo test -q -p lts-storage` — ok, 6+1 passed
- `python3 tools/validate_handoff.py --require-explicit-ledger-records` — PASS (see ledger commit)
VERDICT: implementation complete and gate-green; card -> review pending owner hands-on acceptance.
