# Third-party notices

This is the canonical third-party notices file (`third-party/notices/NOTICE.md`;
older documents call it `THIRD-PARTY-NOTICES.md`). The license texts referenced
below sit next to this file.

## What ships in the app today

Current desktop builds are distributed in two variants (ADR-0019, ADR-0024): the
bare variant and the aligner variant, one binary each. **Neither variant ships a
text-to-speech payload, and neither ships any GPL-licensed component.** All speech
synthesis was removed from the app by ADR-0024; the audio a learner hears is
model output baked into language packs at build time (ADR-0016, ADR-0023).

| Component                                        | License | Where it appears                                             |
| ------------------------------------------------ | ------- | ------------------------------------------------------------ |
| whisper.cpp (whisper-cli, libwhisper, ggml libs) | MIT     | aligner-variant sidecar (`aligner/linux-x64/bin/`), ADR-0019 |
| `ggml-tiny.bin` (OpenAI Whisper weights, GGML)   | MIT     | aligner-variant sidecar (`aligner/linux-x64/model/`)         |

The aligner variant carries `LICENSE.whisper-cpp.txt` inside its `aligner/`
resource directory; the bare variant bundles no third-party binary at all. The
application's own license is independent of these.

## Models a user may download (not shipped)

The in-app model manager (`apps/desktop/src-tauri/models/catalog.json`) offers
speech-recognition models the user installs deliberately. Obligations attach to
whatever the user downloads; the catalog records a license code and a license
model string per entry, and every download records version, per-file checksums
and license.

| Catalog entry                                 | License    | Notes                                           |
| --------------------------------------------- | ---------- | ----------------------------------------------- |
| `org.openlanguage.speech.whisper-ggml-tiny`   | MIT        | OpenAI Whisper weights, upstream terms recorded |
| `org.openlanguage.speech.whisper-ggml-base`   | MIT        | OpenAI Whisper weights, upstream terms recorded |
| `org.openlanguage.speech.whisper-ggml-small`  | MIT        | OpenAI Whisper weights, upstream terms recorded |
| `org.openlanguage.speech.sherpa-whisper-tiny` | Apache-2.0 | sherpa-onnx runtime with Whisper weights        |

No synthesis model is offered; the two synthesis entries ADR-0009 carried were
removed with the rest of that payload.

## Build-time tooling and retired components (ADR-0024)

These components never reach a user's machine. They are listed because they
affect how packs are produced, and because their history explains the license
texts still kept in this directory.

- **Qwen3-TTS** (`Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice`, Apache-2.0) is the pack
  audio bake engine (ADR-0023). It runs only on a build machine; the pack ships
  its output as WAV clips, and `media/manifest.jsonl` credits the runtime, model
  fingerprint and speaker for every clip.
- **Retired TTS-bundled variant (ADR-0009, removed by ADR-0024):** espeak-ng
  (GPL-3.0, grapheme-to-phoneme data), Kokoro `kokoro-multi-lang-v1_0`
  (Apache-2.0, Japanese voice model), sherpa-onnx (Apache-2.0, speech runtime)
  and ONNX Runtime (MIT, inference engine). That variant distributed a
  roughly 375 MB synthesis payload with its own source-offer and attribution
  obligations. Those obligations retired when the payload stopped being
  distributed: the app ships no GPLv3 material, so no GPL source offer ships
  with it, and the Languages page no longer lists TTS components.
- `GPL-3.0.txt`, `Apache-2.0.txt` and `ONNX-Runtime-MIT.txt` are kept here for
  anyone rebuilding that retired variant, and `whisper-cpp-MIT.txt` is the text
  staged into the aligner payload.

## Pack content licenses and attribution

Application code is Apache-2.0 (ADR-0010). Pack content is licensed separately
and travels with the pack: `manifest.yaml` declares a pack-level
`content_license`, and `licenses.jsonl` carries the per-content-class inventory
that the `audit-licenses` gate checks. The two reference packs as published at
0.4.0 declare:

| Pack                               | `content_license` | Additional inventory records                                                                              |
| ---------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------- |
| `org.openlanguage.ja-jp.reference` | CC-BY-4.0         | two `derived-from-source` records at **CC-BY-SA-4.0** for the dictionary-sourced lexicon and kanji layers |
| `org.openlanguage.ru-RU.reference` | CC0-1.0           | original drafts and baked model output only                                                               |

The ja-JP ShareAlike records cover headword forms, kana/kanji forms and readings
sourced or spot-checked against jmdict-simplified 3.6.2, which is JMdict/JMnedict
data © Electronic Dictionary Research and Development Group, CC BY-SA 4.0
(<https://www.edrdg.org/edrdg/licence.html>). Gloss wording is this project's own
AI-drafted text and no dictionary definition text is reproduced. Anyone
redistributing that pack carries the attribution and the ShareAlike obligation on
that layer. Whether the ja-JP **pack-level** license should also become
CC-BY-SA-4.0 is an open owner licensing decision (raised 2026-10-13), not
something an agent may settle.

A third ShareAlike record exists in the prepared O-07 option-A patch (not landed): the
kanji `radicals` element lists are **KRADFILE** data — "files relating to the
decomposition of the 6,355 kanji in JIS X 0208 into their visible components" — © EDRDG,
CC BY-SA 4.0, consumed through the jmdict-simplified 3.6.2 `kradfile` conversion and
cross-checked against `ftp.edrdg.org/pub/Nihongo/kradfile.gz`. Two licence duties come with
it and are **open work items**, not satisfied paperwork: §3 asks that the acknowledgement
appear in an app "About"/"Sources" surface rather than only in files (the app renders no
pack attribution at all today — see the paragraph below), and §4 requires a procedure for
keeping incorporated EDRDG-derived data up to date. The pack's `sources.jsonl` pins the
exact conversion release and file hashes so that update check is concrete.

Attribution for pack content is data, not UI: it lives in each pack's
`licenses.jsonl`, `sources.jsonl` and `README.md`. No installed pack's
attribution is currently rendered anywhere in the app — a known gap, not a
claim that none is required.

## Attribution

The application no longer renders an attribution UI for synthesis components,
because it has none. Recognition attribution travels with the model a user
installs, and pack audio provenance is readable in each pack's
`media/manifest.jsonl`.
