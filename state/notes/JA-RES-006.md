# JA-RES-006 — reviewed lexical import pipeline

Date: 2026-10-03. Evidence: `state/evidence/JA-RES-006/{cargo-test,ci}-2026-10-03.txt`.

## What was built

- `crates/langpack/src/leximport.rs` — `import_lexicon(pack_root, source_id,
  input, gloss_locale)`:
  - Source must already be registered in `sources.jsonl`; sources with
    `use.redistribution_allowed: false` are rejected (`SourceNotRedistributable`)
    — reference-only/blocked data is never re-hosted (docs/10).
  - Source-side JSONL input (`key/form/reading/glosses/pos/tags`) is mapped
    explicitly to pack `lexicon-entry` records; entries are always
    `status: draft`, `generation.method: "imported"`, carry the source id in
    `sources`, and contain no ordering/curriculum-linkage fields.
  - Output goes to a separate file `lexicon/imported-<source>.jsonl`
    (layout v0.2 now accepts `lexicon/*.jsonl`, matching the documented
    layout contract); curriculum files and `lexicon/entries.jsonl` are never
    written.
  - Deterministic: entries sorted by source key, stable serialization, no
    wall-clock timestamps; id slugs from reading with numeric suffixes for
    collisions.
  - Generates the `derived-from-source` license-inventory entry when missing
    (spdx + redistribution + attribution text from the source entry) and
    returns the required attribution report; re-import is idempotent.
- CLI: `langpack import-lexicon <pack> --source <id> --input <file>
  [--gloss-locale]` prints outcome + required attribution (docs/10
  Sources/Licenses screen).
- Fixture: `tests/fixtures/leximport/jmdict-sample.jsonl` (4 raw lexemes,
  incl. duplicate-reading collision case).

## Acceptance mapping

1. **Reproducible and separated from original curriculum data** —
   `leximport.rs::import_is_reproducible_and_separated_from_curriculum`:
   two independent runs on identical pack+input produce byte-identical
   `lexicon/imported-*.jsonl` and `licenses.jsonl`; `curriculum/goals.yaml`,
   `lexicon/entries.jsonl`, `grammar/*` bytes unchanged by import.
2. **Attribution/license requirements are generated** —
   `attribution_and_license_requirements_are_generated`: after removing the
   pre-existing entry, import regenerates the `derived-from-source` license
   entry (CC-BY-SA-4.0, redistribution_allowed, EDRDG attribution text) and
   returns the attribution; re-import adds no duplicate. CLI smoke printed
   the attribution block.
3. **Imported data does not automatically become teaching order** —
   `imported_data_never_becomes_teaching_order`: every imported entry is
   `draft` with no `teaching_order`/`frequency_rank`/goal/unit linkage; no
   curriculum file references `ja.lex.imported.*`. Plus
   `deterministic_ids_and_collision_handling` and
   `non_redistributable_source_is_rejected` (jf-standard blocked, nothing
   written).

## Verification

- `cargo test -p lts-langpack`: 52 tests green (6 new `leximport`).
- CLI smoke: import into a copy of the draft pack → 4 entries, validate
  scaffold 0 errors; jf-standard import → exit 1 with clear error.
- `./scripts/ci.sh` exit 0 (fmt, clippy -D warnings, workspace tests, web
  fmt, tauri smoke, python validator, 44 mutation tests OK).
- `--release-readiness` unchanged: expected owner blockers (LIC-001,
  REVIEW-001, SPEECH-007).

## Known limits

- Imported entries stay `draft` until human review (REVIEW-001, owner-gated);
  the pipeline deliberately provides no promotion path.
- Input format is the project's normalized source-side JSONL; per-vendor
  adapters (JMdict XML etc.) are pack-author tooling beyond this task.
