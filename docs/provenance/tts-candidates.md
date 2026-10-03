# TTS candidate license audit (TTS-001)

Date: 2026-10-03. Licenses of **models/voices** are audited separately
from **runtime code** (docs/10). This is an engineering audit record,
not the final licensing decision (LIC-001, owner-only).

## Selected candidate: sherpa-onnx + Kokoro

### Model/voice layer

- Artifact: `kokoro-multi-lang-v1_0` (sherpa-onnx export of Kokoro-82M).
  Source: https://huggingface.co/csukuangfj/kokoro-multi-lang-v1_0
  (accessed 2026-10-03).
- License: Apache-2.0. Verified from the `LICENSE` file shipped inside
  the downloaded export (Apache License, Version 2.0 text). Upstream
  model: https://huggingface.co/hexgrad/Kokoro-82M (Apache-2.0 per
  model card at access date; re-verify at release).
- Voice identity: synthetic speaker ids (e.g. sid 37); no human voice
  likeness claims. Voice embeddings ship inside `voices.bin` under the
  same Apache-2.0 grant.
- Output audio: model output; packs must record it with license
  inventory kind `model-output` + provenance (as done in the ja-demo
  fixture pack).

### Runtime code layer (audited separately)

- sherpa-onnx v1.13.8 (github.com/k2-fsa/sherpa-onnx): Apache-2.0.
- ONNX Runtime (linked by sherpa-onnx binaries): MIT.
- **espeak-ng-data** (bundled inside the kokoro export for
  grapheme-to-phoneme): espeak-ng is **GPLv3**. This is a copyleft
  obligation distinct from the Apache-2.0 model weights: distributing
  the app with this data triggers GPL source/notice obligations for
  that component. Flagged for LIC-001 (owner decision) before stable
  distribution; acceptable for local development.
- whisper.cpp (ASR side, listed for completeness): MIT.

## Rejected/deferred candidates (license posture only, not measured)

- open-jtalk / Japanese HMM TTS: tool BSD-3-clause; free voice corpora
  have varied non-commercial or restrictive terms — voice licensing
  audit would be per-voice and heavier.
- Piper ja_JP voices: model code MIT; phoneme backends commonly depend
  on espeak-ng (GPLv3) — same copyleft coupling as above.
- Cloud TTS: excluded by the offline-first non-negotiable (docs/00).

## Consequences

- The ja-demo fixture pack's reference audio is labeled
  `model-output` / Apache-2.0 with the kokoro source entry.
- Stable distribution packaging must resolve espeak-ng GPL obligations
  (bundle source offer, component notices) — owner gate LIC-001.
- Model manager cataloging of kokoro is deferred: the export includes a
  multi-file data directory (`espeak-ng-data`), which the current
  per-file catalog entries cannot pin atomically; a directory-capable
  catalog entry format is a follow-up before kokoro ships as an
  installable model.
