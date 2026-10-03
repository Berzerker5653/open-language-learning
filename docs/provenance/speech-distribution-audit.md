# Speech distribution audit: Kokoro / sherpa-onnx / espeak-ng-data

Date: 2026-10-03, per owner direction to audit the exact components
included or downloaded, without assuming a user-triggered download removes
GPL obligations.

## What a distributable build actually contains today

Verified against code, not intent:

- **Zero model or runtime bytes are bundled.** The base app ships no
  speech binaries or models (`apps/desktop/src-tauri/src/models.rs`
  invariant; `models/` starts empty).
- **The download catalog** (`apps/desktop/src-tauri/models/catalog.json`)
  pins exactly two entries: `whisper-ggml-tiny` (whisper.cpp ggml model,
  MIT) and `sherpa-whisper-tiny` (OpenAI Whisper tiny exported to ONNX,
  MIT). Both are ASR models; no TTS entry exists in the catalog.
- **Provider binaries are config-injected paths**, never shipped or
  downloaded by the app (`SherpaSubprocessAsr`/`SherpaSubprocessTts` take
  a `binary: PathBuf`).
- **The Kokoro TTS chain is dev-only.** `speech_audio_at` resolves the
  TTS runtime from the developer vendor cache (`$LTS_BENCH_VENDOR`,
  default `~/.cache/lts-bench`); when absent it returns
  `tts-runtime-unavailable` and the UI degrades to licensed pack media.
  The Kokoro model, the sherpa-onnx binary, and **espeak-ng-data (GPLv3)**
  are therefore already absent from distributable builds.

**Conclusion: the current distribution arrangement is already safe** —
nothing GPLv3 is included or downloaded by a released build. The GPL
question only arises if we start shipping/offering the Kokoro TTS chain.

## Component-level license facts (dev vendor cache)

| Component | License | Verified from |
| --- | --- | --- |
| sherpa-onnx v1.13.8 binary | Apache-2.0 | upstream repo LICENSE |
| ONNX Runtime (linked) | MIT | upstream |
| kokoro-multi-lang-v1_0 model files | Apache-2.0 | shipped LICENSE in model dir |
| espeak-ng-data (inside model dir + binary) | **GPLv3** | espeak-ng upstream |

## Why "user-triggered download" does not clear GPLv3

The sherpa-onnx release binary bundles espeak-ng (GPLv3) and the Kokoro
model directory ships espeak-ng-data. Distributing our app *plus* a
catalog entry that fetches that binary means we distribute (or induce
distribution of) a GPLv3 combined work; the obligations (provide
corresponding source for the GPL parts, license the combined work
compatibly) attach to our distribution regardless of the click that
triggered the download. Treat it as: shipping Kokoro TTS = shipping
GPLv3 components, full stop.

## Options and tradeoffs (report before replacing anything)

1. **Keep status quo (recommended for preview).** TTS stays dev-only;
   distributable builds use licensed pack media (`media/*.wav`,
   Apache-2.0 model-output recordings) for listening/speaking content.
   Cost: no on-demand synthesis of arbitrary text in released builds.
2. **Ship the Kokoro chain with full GPLv3 compliance.** Include
   espeak-ng source, license the combined artifact GPLv3-compatible,
   document obligations. Cost: license contamination of the TTS
   artifact; owner legal review needed.
3. **Open JTalk / HTS Japanese TTS.** Engine code is permissive
   (BSD-style), but the Japanese voice models are typically
   **CC-BY-NC** (non-commercial) — blocks commercial distribution, and
   voice quality is dated. Cost: licensing wall again, different color.
4. **MeCab + own phonemizer + a permissive acoustic model.** Cleanest
   license path (MeCab is dual MIT/GPL — choose MIT path; IPAdic is
   permissive IPA license) but real engineering cost, and good
   open Japanese acoustic models are scarce.
5. **Cloud TTS.** Violates the local-first core requirement; only as an
   explicit opt-in provider later.

Decision per owner direction: option 1 stands for now; no provider
replacement performed. If TTS becomes release-blocking, option 2 or 4
needs an owner call.

## Guardrails in place

- Model catalog entries pin exact URLs, SHA-256, and sizes; installs are
  staged and checksum-verified; nothing installs silently.
- `speech_audio` prefers pack media (`licensed-recording`); synthesis is
  only reachable when a runtime is present on the machine, and its output
  is labeled `model-output`.
- ASR/TTS providers are separate from language content: packs declare
  capabilities; they never reference binaries.
