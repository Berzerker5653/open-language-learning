# Speech distribution audit: Kokoro / sherpa-onnx / espeak-ng-data / whisper.cpp aligner

Date: 2026-10-03, per owner direction to audit the exact components
included or downloaded, without assuming a user-triggered download removes
GPL obligations.

Aligner-sidecar rows and the redistribution stance were added
2026-10-08; the access date for the whisper.cpp upstream ref, version
strings and `ggml-tiny` weight bytes/SHA-256 recorded below is
2026-10-08. The 2026-10-03 GPL analysis is left as written.

## What a distributable build actually contains today

Verified against code, not intent:

- **Zero model or runtime bytes are bundled** (2026-10-03 state). The
  base app ships no speech binaries or models
  (`apps/desktop/src-tauri/src/models.rs` invariant; `models/` starts
  empty). **2026-10-08 amendment:** the base config is still
  payload-free, but the aligner-bundled desktop variant now stages a
  whisper.cpp runtime plus `ggml-tiny` weights as a gitignored
  sidecar payload (`scripts/stage-aligner-sidecar.sh`, ADR-0019) —
  the same weights the catalog already pins as a download entry.
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

(2026-10-08: that conclusion still holds for GPL. The payload added
since then carries only MIT components; see the stance below.)

## Component-level license facts

Dev vendor cache (2026-10-03):

| Component | License | Verified from |
| --- | --- | --- |
| sherpa-onnx v1.13.8 binary | Apache-2.0 | upstream repo LICENSE |
| ONNX Runtime (linked) | MIT | upstream |
| kokoro-multi-lang-v1_0 model files | Apache-2.0 | shipped LICENSE in model dir |
| espeak-ng-data (inside model dir + binary) | **GPLv3** | espeak-ng upstream |

Shipped payload components — the aligner sidecar staged by
`scripts/stage-aligner-sidecar.sh` (recorded 2026-10-08):

| Component | Upstream / pin | License | Payload-scoped notice | Bytes / SHA-256 |
| --- | --- | --- | --- | --- |
| whisper.cpp runtime (`bin/whisper-cli` plus `libwhisper.so.1`, `libggml.so.0`, `libggml-cpu.so.0`, `libggml-base.so.0`, `libgomp.so.1`) | `github.com/ggml-org/whisper.cpp` @ `60c0be6ac8fa71b1a2ae2dd938a31a34a508e774`, reported version 1.9.4, ggml 0.25.1 | MIT | `third-party/notices/whisper-cpp-MIT.txt` bundled at `aligner/LICENSE.whisper-cpp.txt` | per build machine; recorded per file in the regenerated `SIDECAR.yaml` (runtime closure 4,323,144 bytes on the staging machine) |
| `ggml-tiny.bin` weights | `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin` | MIT | same notice file | 77,691,713 bytes; sha256 `be07e048e1e599ad46341c8d2a135645097a538221678b7acdd1b1919c6e1b21` |

Verified from: the pinned values the staging script gates on (it
refuses a checkout at any other ref and a weight file whose bytes or
sha256 differ) plus the shipped notice file, all read in-repo on
2026-10-08. The notice text is the upstream LICENSE file copied verbatim
from that pinned ref (`Copyright (c) 2023-2026 The ggml authors`), and
matches the model catalog's existing `whisper-ggml-tiny` entry.

**Redistribution stance.** The MIT obligations attach to the payload:
the MIT text rides in the bundle next to the `whisper-cli` copy it
covers, so the notice travels with the copy. No source-offer or GPL
obligation applies to this component — neither whisper.cpp nor
ggml-tiny is a GPL combined work, so the espeak-ng analysis above
does not extend to it. Limits on what is recorded versus assumed: the
runtime's per-file sizes and hashes are recorded for the machine that
staged the payload only, and are not reproducible across build
machines; nothing here certifies that the payload runs on any given
machine (only `linux-x64` is staged, and per ADR-0015 platform status
requires a human runtime report); and no pronunciation-accuracy claim
attaches to these components.

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
- The aligner payload must pass `verify` in
  `scripts/stage-aligner-sidecar.sh` before `overlay` will emit a
  Tauri config: every declared size and sha256 is recomputed, and
  symlinks, missing files and payload files the manifest does not list
  are rejected; the payload root is gitignored, so weights never enter
  git. The staging script is pinned by
  `scripts/test-stage-aligner-sidecar.sh`, a hermetic CI step
  (synthetic payload, no network/cmake/cargo).
