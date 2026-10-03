# PACK-001 notes — public pack schemas + structural validator

## What shipped

- `schemas/v0.2/`: 17 content schemas + `common.schema.json` ($defs shared
  grammar). Every shipped logical content type has a schema: manifest,
  identity, normalization, orthography, phonology, pragmatics, goal, unit,
  scenario, assessment, lexicon-entry, concept, source-entry,
  license-inventory, review-record, speech-profile. `$id` namespace
  `https://openlanguage.invalid/schemas/v0.2/...`; offline resolution only.
- 0.1 schemas stay frozen at `schemas/` root (handoff checker + ja-JP draft
  depend on them). `schema_version` in the manifest selects the contract;
  `schemas/v0.2/README.md` documents the 0.2 layout/ID/mode contract.
- `crates/langpack`: `Pack::load_dir` (YAML/JSONL → JSON), embedded schema
  registries (both versions), schema validation + semantic checks:
  ID grammar (`lts-domain::ContentId`), duplicate IDs, locale consistency
  (first segment == target_locale primary subtag), engine SemVer ordering +
  `--engine-version` compatibility (`EngineCompat`), manifest.scripts vs
  orthography script IDs (0.2 only; 0.1 display-name quirk preserved),
  reference resolution (scaffold=warning, install=error), declared
  `unresolved_references` (install-blocking), license/redistribution install
  gates, migrated-prerequisite review warnings.
- `crates/langpack::migrate::goal_0_1_to_0_2`: bare prerequisite IDs →
  `{target, dimension: recall-meaning, required_state: independent,
  strength: hard, migrated_from: "0.1-bare"}`; validator warns until human
  review. Deferred-modality prerequisite records are valid in packs with
  the modality capability off (fixture `valid-deferred-modality`).
- `langpack validate <dir> [--mode scaffold|install] [--json]
  [--engine-version X]` — machine-readable JSON, exit 0/1/2.
- Fixtures `tests/fixtures/packs/`: 5 valid (minimal, full, scaffold-draft,
  migrated-prereq, deferred-modality) + 8 invalid (id grammar, duplicate,
  locale mismatch, engine range, bare prereq, support level, undeclared
  ref, script unknown). 18 integration + 4 unit tests assert actionable
  diagnostics including the ja-JP seed in both modes.

## Decisions

- Two ID namespaces: namespaced content IDs (grammar+locale checked) vs
  file-local record IDs (source/license/review/profile/normalization names).
  0.1 structural ids are grammar-checked only when namespaced (contains
  `.`), preserving seed local names (`hiragana`, `neutral-common`).
- 0.1 layout keeps its own classifier (`classify_v1`): seven seeded schemas;
  other seed files parse structurally and contribute defined IDs
  (scenario/situation ids) without schema validation — the 0.1 contract was
  provisional.
- Install gates are version-independent: the 0.1 seed fails install with
  `license_inventory_missing`, `redistribution_blocked`,
  `declared_unresolved_reference` — scaffold validation never confers
  install/release eligibility.

## Verification

- `cargo test -p lts-langpack`: 22 passed (evidence:
  `state/evidence/PACK-001/cargo-test-2026-10-02.txt`).
- CLI runs incl. seed scaffold (0 errors) / seed install (3 errors, exit 1)
  / JSON output (`state/evidence/PACK-001/cli-2026-10-02.txt`).
- `./scripts/ci.sh` CI OK incl. handoff checker (48 files), 44 mutation
  tests, `--release-readiness` still failing with its 11 expected blockers
  (`state/evidence/PACK-001/ci-2026-10-02.txt`).

## Limits / follow-ups

- Cross-file graph checks (cycles, unreachable/dead audit) are PACK-002.
- `grammar/dependencies.yaml` encoding still unused until PACK-002.
- Seed ja-JP stays 0.1; migration of seed content to 0.2 happens when the
  content itself is revised (prerequisites are `[]` there anyway).
- Schema `additionalProperties: false` everywhere: additive evolution needs
  a new schema version (ADR required).
