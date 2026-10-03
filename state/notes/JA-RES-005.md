# JA-RES-005 — Japanese grammar/pragmatics dependency map

Date: 2026-10-03. Evidence: `state/evidence/JA-RES-005/{cargo-test,ci}-2026-10-03.txt`.

## What was built

Draft curriculum pack `tests/fixtures/packs/ja-curriculum-draft/` (validate in
`Mode::Scaffold`; `redistribution_allowed: false` + UNLICENSED originals pending
LIC-001; every instance `review_status: draft` / `status: draft` with generation
blocks — REVIEW-001 cannot be self-certified):

- `grammar/concepts.jsonl` — 21 concepts: 13 `ja.grammar.*` (syntax/morphology),
  4 `ja.strategy.*` pragmatics concepts (softening, apology-repair, hedging,
  register-selection), 4 `ja.orth.*` script concepts, 1 `ja.phon.*` concept.
- `grammar/dependencies.yaml` — 16 goal→goal edges mirroring
  `curriculum/goals.yaml` prerequisiteRecords plus 19 authoritative
  concept→concept dependency edges (v0.2 mirror convention: edges whose `from`
  is not a goal id are concept edges; cycle-checked and missing-dependency-checked
  by `crates/langpack/src/graph.rs`).
- `language/pragmatics.yaml` — 6 registers on a 0–4 formality scale
  (casual, polite-standard, formal-business, respectful, humble,
  honorific-negotiation) with situational notes; 16 `ja.situation.*` situations
  each with `typical_registers` (several multi-register).
- `curriculum/goals.yaml` — copy of `docs/curriculum/JA_GOAL_GRAPH.yaml`
  (15 goals, on-ramp→B2).
- `lexicon/entries.jsonl` (10), `language/orthography.yaml` +
  `language/phonology.yaml` (copies of the JA-RES-002/003 docs, ids renamed to
  `ja.orth.*` / `ja.phon.*` content-kind namespaces), `sources.jsonl`,
  `licenses.jsonl`, `speech/profiles.jsonl`, `assessments/definitions.jsonl`,
  empty `reviews.jsonl`.

Engine support: `graph.rs` extended (known_ids, v2 concept edges authoritative,
`missing_dependency` warning); `pack.rs` `Instance`/`instances()`/`structural_docs()`
accessors. Id namespaces enforced by `ContentKind` whitelist in `crates/domain/src/ids.rs`:
pragmatics strategies → `ja.strategy.*`, scripts → `ja.orth.*`, phonology features →
`ja.phon.*` (docs + tests updated to match).

## Acceptance mapping

1. **Concepts cover dependencies needed by mapped goals** —
   `ja_dependency_map.rs::concepts_cover_goal_requirements`: every
   `required_concepts` entry of all 15 goals exists as a pack instance
   (grammar, strategy, orth, phon, lex kinds).
2. **Register/politeness contextual, not binary** —
   `ja_dependency_map.rs::politeness_is_contextual`: ≥5 registers, ≥3 distinct
   formality levels, ≥1 situation with >1 `typical_registers` (register choice
   is a function of situation + formality gradient, never a polite/plain flag);
   `ja.strategy.softening` definition/usage_rules state the graded rule.
3. **Validator reports no cycles/missing dependencies** —
   `ja_dependency_map.rs::validator_clean_on_dependency_map`: zero
   `prerequisite_cycle`, `missing_dependency`, `dependency_graph_mismatch`
   findings and zero errors in `Mode::Scaffold` over the full draft pack.

## Verification

- `cargo test -p lts-langpack`: 46 tests green (incl. 3 new `ja_dependency_map`).
- `./scripts/ci.sh` exit 0 (fmt, clippy -D warnings, full workspace tests, web
  fmt, tauri smoke, python validator PASS 48 files, 44 mutation tests OK).
- `--release-readiness` still fails with expected owner blockers (LIC-001,
  REVIEW-001, SPEECH-007) — unchanged.

## Known limits

- Concept definitions are AI-assisted drafts pending qualified human review
  (REVIEW-001, owner-gated); `jf-standard` refs are reference-only (no text
  copied).
- Dependency map is a draft scaffold for pack authoring, not a shipped pack:
  `redistribution_allowed: false`, maturity `community`, UNLICENSED originals.
