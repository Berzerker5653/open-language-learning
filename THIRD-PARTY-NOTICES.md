# Third-Party Licenses and Notices

This file inventories third-party material this project builds with,
downloads, or distributes, and the scope of each license. The root `LICENSE`
(Apache-2.0, ADR-0010) covers only original project code; it never relabels anything below.
Reproduce this file (or the referenced license texts) in distributed builds
alongside the binaries.

## Build/runtime dependencies (source-level)

All Rust crates and JS packages used to build the app are MIT and/or
Apache-2.0 licensed (see each crate's `Cargo.toml` / each package's
`package.json`); both permit redistribution with attribution. Notable:

- Tauri 2 (MIT / Apache-2.0) plus its transitive crates
- serde, serde_json, serde_yaml, thiserror, semver, sha2, base64, zip,
  rusqlite, ureq, jsonschema (MIT and/or Apache-2.0)
- React (MIT), Vite (MIT), TypeScript (Apache-2.0), Vitest (MIT),
  Prettier (MIT)
- On Linux the webview uses WebKitGTK (LGPL-2.0+); system packages are
  installed by the user's distro, not bundled by us.

## Speech models and runtimes (downloaded on demand, never bundled)

The base app ships zero model bytes. The pinned catalog
(`apps/desktop/src-tauri/models/catalog.json`) offers:

- `whisper.cpp` (MIT) and its `ggml-tiny.bin` model (MIT) — fallback ASR
- `sherpa-onnx` (Apache-2.0) and the `sherpa-onnx-whisper-tiny` model
  (MIT) — default ASR
- ONNX Runtime (MIT), pulled in by sherpa-onnx builds

The catalog names recognition payloads only: ADR-0024 removed the synthesis
entries, and every clip the app plays is baked language-pack media under the
pack's own content licenses (see Language content below).

## Build-time tooling / historical components (not distributed)

Nothing below ships in the app or in model downloads; these entries record
what past builds carried and what runs only on build machines (ADR-0024).

- **Qwen3-TTS CustomVoice (Apache-2.0)** — the pack-audio bake engine
  (ADR-0023). `scripts/generate-pack-audio.py` runs it on build machines;
  its **output** ships as language-pack media, labeled `model-output` with
  engine, text and identity recorded in `media/manifest.jsonl`. The model
  itself is never distributed and never runs on a user's machine.
- **Kokoro TTS chain (historical)** — past dev and TTS-variant builds used
  `kokoro-multi-lang-v1_0` (Apache-2.0 model, verified from its shipped
  LICENSE) run by a sherpa-onnx binary that bundles **espeak-ng-data
  (GPLv3)**. ADR-0024 removed runtime synthesis: neither the Kokoro runtime
  closure nor espeak-ng-data is distributed, the model catalog names no
  synthesis payload, and the GPLv3 payload-scoped obligations ADR-0009
  carried for the TTS-bundled variant — the source offer in the staged
  `NOTICE.md`, component license texts, attribution UI entries — retired
  with the variant axis. No GPL source-offer obligation attaches to the
  shipped app. Full audit and alternatives:
  `docs/provenance/speech-distribution-audit.md`.
- **espeak-ng-data (GPLv3)** — appeared only inside the retired Kokoro
  runtime closure above; the single app package ships no GPL-licensed
  component.

## Language content

- `tests/fixtures/packs/ja-demo`: glosses derived from JMdict/EDRDG
  (CC-BY-SA-4.0, attribution: Electronic Dictionary Research and
  Development Group; share-alike applies to the derived lexicon data).
  Pack media files are test-fixture placeholder audio (`fixture-silence`
  manifest rows) labeled `model-output` in `media/manifest.jsonl`.
- `languages/ja-JP` (draft reference pack): project-original seed content;
  provenance analysis in `docs/provenance/ja-jp-draft-content.md`. Its
  content license is tracked in `languages/ja-JP/LICENSES.yaml` and is
  selected separately from application code.
- The JF Standard (The Japan Foundation) is cited as a reference-only
  framework; no text from it is copied into this repository.
- Mozilla Common Voice Japanese: candidate evaluation corpus only; not
  bundled; see its source record for access/use conditions.

## No executable pack code

Community language packs are untrusted declarative data. The installer
validates archive format, path safety, per-file and total size limits,
per-file checksums, and schema conformance before install; packs contain no
executable scripts and are never executed.
