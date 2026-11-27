# ADR-0042: Per-language speech models with a remotely updatable catalog

## Status

Accepted.

Date: 2026-11-27

## Context

ADR-0011 chose user-selectable speech models but shipped a **device-level**
preference (`speech.json: {asr_model}`) and a **bundled** catalog
(`include_str!` of `models/catalog.json`). Two facts now force the next step:

1. Language coverage is diverging. Whisper is multilingual but weak on short
   Russian utterances; GigaAM (SaluteDevices, MIT) is purpose-built for ru
   (WER 1.5% short utterances vs ~27% for Whisper large-v3), and zh will want
   a dedicated model too. A per-language model choice is what ADR-0011
   promised but never implemented.
2. The model landscape moves fast (the stated expectation: "we might be
   changing our model regularly"). With `include_str!`, adding or swapping a
   model requires shipping a new app build. The model *files* were already
   remote (pinned URLs + sha256 in the catalog); only the catalog itself was
   build-baked.

The catalog JSON already carried a `language` field per entry — the Rust
`ModelEntry` dropped it at parse time. Consumption sites (aligner probe,
pronunciation, dictation) resolve one device-global model string.

Constraints: ADR-0011 (models are opt-in, `off` default, abstention on
mismatch), ADR-0028 supply-chain pins (every payload keeps exact size +
sha256), AGENTS.md privacy (catalog refresh is metadata only; models are still
downloaded only on explicit user install), the existing `installable()` URL
allowlist (github.com / huggingface.co, https only).

## Decision

**Catalog v2** (`models/catalog.json`, `catalog_version: 2`): `ModelEntry`
gains `language: Option<String>` (a locale like `ru`; `"any"`/absent =
multilingual — wired through from the JSON that already had it) and
`recommended: bool` (the catalog's per-locale recommendation marker; the
device-tier logic still caps what is *offered* on weak hardware).

**Remote-updatable catalog**: the app prefers a cached remote catalog at
`<data>/models/catalog-remote.json`, refreshed on demand
(`refresh_speech_model_catalog`) from the project's public catalog repo
(same repo/path trust as `packs::DEFAULT_CATALOG_URL`). A remote catalog is
adopted only after full validation — size cap, `catalog_version >= 2`, unique
non-empty ids, every non-local url passing `installable()`, no `..` in file
paths — and any failure keeps the previous cache/bundled copy
(fail-closed; a bad or hostile update can never brick or silently re-point
model downloads). Adding a model to every install is now: push the payload to
the pinned host, append the entry (with size + sha256) to the public
`catalog/models.json`. No app rebuild.

**Per-language preference** (`speech.json` v2):
`{schema_version: 2, default_model, per_language: {locale: model_id|off}}`.
v1 `{asr_model}` migrates on load (`asr_model -> default_model`). Resolution
is `per_language[locale] ?? default_model`; `off` is a valid value at both
levels. Consumption sites resolve the locale from the **pack manifest**
(`pack_target_locale`, the same source as the ASR language) — never from the
UI language or a guess.

**Honest runtime gating**: the whisper sidecar runtime in current builds
carries one pinned model; on the production bundled path the sidecar's pinned
model executes, and the picker's per-language choice governs every path that
consumes installed catalog models (bench/vendor today, per-runtime payloads
when they ship). The UI states this rather than implying instant effect.

Implemented in `apps/desktop/src-tauri/src/models.rs` (schema, validation,
resolver, remote fetch), `lib.rs` (commands, pack-locale resolution),
`src/settings.tsx` (per-language pickers + catalog refresh).

## Consequences

+ New or swapped models reach users without an app release, keeping the
  supply-chain pin at the same time.
+ Russian (and later zh) users get language-appropriate recommendation when
  those payloads ship; the data plumbing is done.
- Catalog correctness now has a runtime failure mode (fetch/validation);
  mitigated by fail-closed fallback to the last good copy.
- `speech.json` gains a version; the migration is one-way (v2 wins if both
  present). Rollback to a pre-v2 build loses `per_language` (default_model
  survives).
- Follow-ups: stage per-locale sidecar payloads (runtime gating becomes real
  per-language execution); GigaAM payloads need a runtime that runs onnx/gguf
  (sherpa-onnx) — until then ru entries are BYO-visible, not downloadable.

## Alternatives considered

- **Rebuild-bundled catalog only** (status quo): rejected — the stated
  expectation is frequent model churn; a rebuild cycle per model change does
  not scale.
- **Server-side "best model for you" recommendation**: rejected — needs a
  trusted server computing on user hardware profiles; the catalog's
  `recommended` flag plus local device-tier caps is honest and offline-first.
- **Per-profile model choice**: rejected — preference belongs to the
  language being learned, not the learner profile; profiles already switch
  packs.
- **Silent background auto-refresh on every launch**: rejected — a surprise
  picker change is worse than an explicit "Check for new models" (the fetch
  is metadata-only but user-visible either way; explicit is reviewable).
