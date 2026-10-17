# RU-042 Task 2 — version bump and display name

## Manifest change

`languages/ru-RU/manifest.yaml`:

- `:3` `display_name: "Russian Reference Pack (Draft)"` → `"Russian Reference Pack"`
- `:4` `version: "0.4.1"` → `"0.4.2"`
- `:10` `maturity: "experimental"` — confirmed unchanged.

## Where the draft wording went (schema finding)

The task brief presumed a description/summary field "that the manifest
schema already supports". It does not exist:

- `schemas/v0.2/language-pack-manifest.schema.json` (the schema `schema_version: "0.2"` selects) has `"additionalProperties": false` and these properties only: `schema_version`, `pack_id`, `display_name`, `version`, `target_locale`, `source_locales`, `engine`, `maturity`, `authors`, `scripts`, `world`, `capabilities`, `requested_model_capabilities`, `license`, `unresolved_references`. The v0.1 schema is the same shape. No `description`/`summary` key; adding one fails validation. The ja-JP manifest carries no such field either.
- Therefore no schema key was invented. The plain draft/unreviewed statement now lives in the pack-level description file `languages/ru-RU/README.md` (new; `.md` inside a pack is allowed by `crates/langpack/src/layout.rs` `is_documentation`, and the ja-JP pack already ships one). It says the content is "draft, AI-generated, unreviewed", that maturity is `experimental`, and that nothing may be read as human-verified. The ja pack is the precedent for an un-Drafted display name with the draft posture in README + `maturity`.
- Machine-readable draft claims also remain in every content item (`status: "draft"`, `generation.notes: "ai-drafted; human review required"`), which is what ADR-0014 derives the pack-level posture statement from.

## Grep for broken assertions

`grep -rn "Russian Reference Pack" crates/ apps/ tools/ scripts/` returned
**no hits** — no Rust/app/tool assertion pins the old display name (the
"expected hits in validate.rs / audit.rs" do not exist; the ru tests there
assert script-introduction units and license shape). The only repo-wide
references are `catalog/packs.json`, `catalog/preview-entries.json`,
`experiments/llm-pack-authoring/RESULTS.md` and historical evidence files
(`state/evidence/RC-0.4.1-*`), all outside this batch's ownership.

`crates/langpack/tests/validate.rs` / `audit.rs`: not modified (no ru
assertion broke).

## Catalog note (owner gate, untouched)

`catalog/packs.json:23` still carries `"display_name": "Russian Reference
Pack (Draft)"` (and `:35` the 0.4.1 version/asset bindings). The catalog is
regenerated only by the owner via `scripts/build-catalog.sh` — that script
was NOT run and `catalog/packs.json` was NOT edited. The stale entry until
the owner rebuilds is expected.
