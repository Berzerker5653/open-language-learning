# SPEECH-CATALOG-001 — per-language speech models + remotely updatable catalog (ADR-0042)

## Scope (card created after the code began — said plainly)
The WIP that closes this card was drafted earlier the same day (ADR-0042 was
written with it). This is the card-first ceremony before the first commit, not
a veto on the work. Implementation lives entirely in the working tree at card
creation time; the lane gate battery below decides whether it lands.

What the card ships (design authority: `docs/adr/0042-per-language-speech-models-with-remote-catalog.md`):
1. **Catalog v2** (`apps/desktop/src-tauri/models/catalog.json`): `ModelEntry`
   gains `language: Option<String>` (locale like `ru`; absent/"any" =
   multilingual) and `recommended: bool`. Parsed + validated.
2. **Remote-updatable catalog**: app prefers cached remote catalog
   `<data>/models/catalog-remote.json`; `refresh_speech_model_catalog`
   fetches from the project catalog repo (same trust path as
   `packs::DEFAULT_CATALOG_URL`), adopts ONLY after full validation
   (size cap, `catalog_version >= 2`, unique non-empty ids, every non-local
   url passes `installable()`, no `..` in file paths); any failure keeps the
   previous cache/bundled copy (fail-closed). New model to every install =
   push payload + append entry to public `catalog/models.json`; no rebuild.
3. **Per-language preference** (`speech.json` v2):
   `{schema_version: 2, default_model, per_language: {locale: model_id|"off"}}`;
   v1 `{asr_model}` migrates on load. Resolution
   `per_language[locale] ?? default_model`; `off` valid at both levels.
4. **Locale source discipline**: consumption sites (aligner probe,
   pronunciation, dictation, free-speaking) resolve the locale from the pack
   manifest (`pack_target_locale`) — never UI language, never a guess.
5. **Honest runtime gating**: the bundled whisper sidecar executes its one
   pinned model on the production path; the picker governs every path that
   consumes installed catalog models. UI states this; no instant-effect lie.
6. **Settings UI**: per-language pickers + catalog refresh affordance
   (`apps/desktop/src/settings.tsx`, wiring in `App.tsx`).

## Frozen acceptance
- Catalog v2 fields parsed; remote catalog adopted only after full validation,
  fail-closed to last-good/bundled on any failure (tests cover reject paths).
- speech.json v2 read/write with v1 migration; resolution order and `off`
  semantics pinned by tests.
- Consumption sites resolve locale from the pack manifest.
- Settings exposes per-language pickers + refresh; copy passes
  `tools/audit_learner_copy.py`.
- LANE-tier gates green: `cargo fmt --all --check`;
  `cargo clippy -p lts-desktop --all-targets -- -D warnings`;
  `cargo test -p lts-desktop --lib`; `npx tsc --noEmit` + `npx vitest run`
  in `apps/desktop`; prettier/eslint on the changed frontend files.

## Files owned by this lane
apps/desktop/src-tauri/models/catalog.json, apps/desktop/src-tauri/src/models.rs,
apps/desktop/src-tauri/src/lib.rs (speech hunks only), apps/desktop/src/App.tsx,
apps/desktop/src/settings.tsx, docs/adr/0042-*.md, this note, evidence dir.

## Evidence
state/evidence/SPEECH-CATALOG-001/gates.log (controller re-run, full outputs).

## Explicitly NOT in this card (ADR-0042 follow-ups)
- Per-locale sidecar payloads (runtime gating becomes real per-language
  execution) — separate infra card when payloads exist.
- GigaAM/sherpa-onnx runtime + downloadable ru payloads.
