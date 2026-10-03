# Third-Party Licenses and Notices

This file inventories third-party material this project builds with,
downloads, or distributes, and the scope of each license. The root `LICENSE`
(MIT) covers only original project code; it never relabels anything below.
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
(`apps/desktop/src-tauri/src/models/catalog.json`) offers:

- `whisper.cpp` (MIT) and its `ggml-tiny.bin` model (MIT) — fallback ASR
- `sherpa-onnx` (Apache-2.0) and the `sherpa-onnx-whisper-tiny` model
  (MIT) — default ASR
- ONNX Runtime (MIT), pulled in by sherpa-onnx builds

### Kokoro TTS chain — NOT in distributable builds (GPLv3 component)

The dev-only TTS provider uses `kokoro-multi-lang-v1_0` (Apache-2.0 model,
verified from its shipped LICENSE) run by a sherpa-onnx binary that bundles
**espeak-ng-data (GPLv3)**. Distribution of that binary/data combination
carries GPLv3 obligations that are not cleared. Decision (owner direction
2026-10-03): the TTS provider stays out of distributable builds until
licensing is cleared or a compatible provider replaces it; the rest of the
app is unaffected. Full audit and alternatives:
`docs/provenance/speech-distribution-audit.md`.

## Language content

- `tests/fixtures/packs/ja-demo`: glosses derived from JMdict/EDRDG
  (CC-BY-SA-4.0, attribution: Electronic Dictionary Research and
  Development Group; share-alike applies to the derived lexicon data).
  Pack media files are synthesized with Kokoro (Apache-2.0 model) and are
  labeled `model-output` in the pack's license records.
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
