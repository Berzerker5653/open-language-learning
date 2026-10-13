# Third-Party Licenses and Notices

This file inventories third-party material this project builds with, downloads
or distributes, and the scope of each license. Three files cover adjacent
questions; keep them from drifting into each other:

- `NOTICE` — the Apache-2.0 copyright/notices stub for the application code
  (ADR-0010). The root `LICENSE` covers original project code only; it never
  relabels anything described below.
- this file — the source-level inventory: build dependencies, model downloads,
  build-time tooling and language content.
- `third-party/notices/NOTICE.md` — what is staged **inside distributed
  artifacts** (the aligner variant's bundled runtime and model), plus the
  license texts kept in that directory and the pack content licenses.
- Reproduce this file, or the referenced license texts, in distributed builds
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

## Speech runtimes and models (two channels)

- **Bundled — aligner variant only (ADR-0019).** whisper.cpp (MIT) and the
  `ggml-tiny.bin` model (MIT) ship inside the package.
  `scripts/stage-aligner-sidecar.sh` refuses to build that payload without
  `third-party/notices/whisper-cpp-MIT.txt` and stages it into the bundle as
  `aligner/LICENSE.whisper-cpp.txt`.
- **Bundled — bare variant: nothing.** No third-party binary, no model bytes.
- **Downloaded on demand.** `apps/desktop/src-tauri/models/catalog.json` pins
  recognition models by url, sha256 and `size_bytes`: whisper.cpp `ggml-tiny`,
  `ggml-base` and `ggml-small` (MIT), plus a sherpa-onnx whisper-tiny set
  (sherpa-onnx is Apache-2.0 and pulls in ONNX Runtime, MIT; the weights are
  OpenAI Whisper weights with upstream terms recorded). Every entry is
  `tier: development` — production tiers wait on the SPEECH-002 re-benchmark
  (ADR-0007). Anything the user downloads carries its own license; that path
  bundles nothing.

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
- `languages/ja-JP` (reference pack, unreviewed): project-original material and
  baked pack audio under CC BY 4.0, plus a CC BY-SA 4.0 layer over the
  dictionary-derived lexicon and kanji data (JMdict/JMnedict © the Electronic
  Dictionary Research and Development Group). Per-record licensing lives in
  `languages/ja-JP/licenses.jsonl`, sourcing in `languages/ja-JP/sources.jsonl`
  (the pack spec also accepts the older `LICENSES.yaml` / `SOURCES.yaml`
  spellings); provenance analysis is in `docs/provenance/ja-jp-draft-content.md`.
  Content licensing is chosen separately from the application code license.
- `languages/ru-RU` (reference pack, unreviewed): CC0 1.0, recorded in
  `languages/ru-RU/licenses.jsonl`.
- The JF Standard (The Japan Foundation) is cited as a reference-only
  framework; no text from it is copied into this repository.
- Mozilla Common Voice Japanese: candidate evaluation corpus only; not
  bundled; see its source record for access/use conditions.

## No executable pack code

Community language packs are untrusted declarative data. The installer
validates archive format, path safety, per-file and total size limits,
per-file checksums, and schema conformance before install; packs contain no
executable scripts and are never executed.
