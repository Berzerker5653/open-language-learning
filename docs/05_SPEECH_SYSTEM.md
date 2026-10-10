# 05 — Speech, Listening, Pronunciation, and TTS System

## Goal

Make speaking/listening first-class without pretending automatic speech analysis is more reliable than it is.

## Pipeline

```text
microphone
  -> permission/capture
  -> level/quality checks
  -> preprocessing
  -> VAD/segmentation
  -> ASR / expected-utterance verification
  -> forced/soft alignment
  -> acoustic feature extraction
  -> language-specific feature interpretation
  -> confidence fusion
  -> feedback
  -> mastery evidence
```

No single stage's score is the final pronunciation score.

## Provider interfaces

Define stable provider contracts for:

- `AudioPreprocessor`
- `VoiceActivityProvider`
- `SpeechRecognitionProvider`
- `AlignmentProvider`
- `AcousticFeatureProvider`
- `ProsodyProvider`
- `PronunciationInterpreter`

Implementations may be native libraries, ONNX models, WASM, or optional cloud adapters.

There is no in-app speech-synthesis provider: the app performs no speech synthesis at read time (ADR-0024). Synthesis happens at pack build time and reaches the app only as baked language-pack media.

Provider results must distinguish `usable`, `quality-rejected`, `utterance-mismatch`, `unsupported`, `provider-error`, and `abstained` outcomes. Preserve per-stage reliability and reason codes instead of treating every failure as a learner error. A raw provider score is not automatically a calibrated probability and cannot be compared with another provider's score without validation.

## Initial provider research direction

Benchmark at least:

- `sherpa-onnx` for local ASR/VAD/TTS breadth and cross-platform deployment;
- `whisper.cpp` for robust local multilingual ASR;
- Japanese text analysis/G2P such as Open JTalk/pyopenjtalk or an equivalent licensed component for preprocessing/reference generation;
- a lightweight runtime alignment approach; Montreal Forced Aligner may be useful for offline corpus/reference preparation but should not be assumed suitable as an embedded mobile runtime.

Do not choose a provider only by WER. Evaluate latency, Japanese errors, timestamps/alignment, CPU/RAM, package size, mobile support, license, model license, and determinism.

## Recognition vs pronunciation

ASR answers: "What sequence was probably said?"

Pronunciation analysis answers: "How did the production differ from the target in ways that matter for intelligibility/naturalness?"

ASR success is positive evidence of intelligibility but cannot by itself prove pronunciation quality.

Recognition of a prompted target can also reflect language-model bias. Test wrong phrases, omitted/extra words, and silence with the same decoding prompts/options used in the app. Forced alignment to the expected text cannot by itself prove that the text was spoken; utterance verification must reject a mismatch before issuing pronunciation corrections.

## Input quality gate

Before linguistic scoring, detect:

- silence/no speech;
- clipped audio;
- extreme noise;
- mic level too low/high;
- recording too short/long;
- conflicting background speaker.

When input quality is poor, ask for a retry and do not create negative linguistic evidence.

Technical failures, unsupported features, quality rejection, and low-confidence abstention are excluded from linguistic mastery updates. Store an optional technical diagnostic event separately. They must not create either negative or positive language evidence, and repeated retries must not unlock a goal. A reliably established utterance mismatch may create linguistic evidence for the relevant task.

## Expected-utterance modes

### Constrained imitation

The app knows the expected phrase. Strongest opportunity for alignment and focused feedback.

### Semi-open response

Several utterances/intents are acceptable. First evaluate intent/semantic validity, then pronunciation features that can be aligned confidently.

### Open conversation

Use ASR/semantic interaction; pronunciation feedback should be sparse and confidence-gated, not a constant stream of speculative corrections.

## Alignment

The shipped aligner (ADR-0008) constrained-matches whisper.cpp `-oj` word/segment output against the expected pack units (Needleman-Wunsch over normalized characters); its confidence number is a text-match ratio, never pronunciation evidence. Alignment output should support time spans for language-relevant units. Japanese ideally supports phoneme/phone and mora-like grouping. Alignment provider must emit confidence and abstain when mismatch is large.

Shipped Linux desktop builds bundle the pinned whisper.cpp sidecar (ADR-0019): whisper.cpp ref 60c0be6ac8fa71b1a2ae2dd938a31a34a508e774 (reported version 1.9.4, ggml 0.25.1, MIT) plus the `ggml-tiny.bin` weights — 82,016,429 bytes staged in total on the machine that staged it, gitignored, hash-pinned in `SIDECAR.yaml` and mapped into the bundle by `dist/variants/tauri.aligner.json`. Before using the runtime the app checks payload integrity, host platform, and the payload's compiled CPU floor (x86-64-v3: SSE4.2, F16C, FMA, BMI2, AVX, AVX2; no AVX-512). The base `tauri.conf.json` stays payload-free, so bare and dev builds carry no aligner and must abstain honestly; only linux-x64 is staged today, and Windows/macOS builds carry no payload and abstain until a human runtime report (ADR-0015).

When the aligner cannot run, the app reports one of three distinct abstention reasons and the UI copy says which one applies: `speech-model-off` (the user turned the speech model off in Settings), `aligner-cpu-unsupported` (the build carries the runtime but this CPU is below its compiled-for instruction floor), and `aligner-unavailable` (no runtime in this build, or the staged payload is incomplete). This changes nothing about what an alignment proves: alignment alone cannot by itself prove the expected text was spoken, and the mismatch/low-confidence abstention above is the mechanism that enforces that.

## Acoustic features

Possible generic measurements:

- duration;
- energy;
- voicing;
- F0 contour;
- spectral/embedding-based phone evidence;
- pause timing;
- speaking rate.

Language packs decide which features matter.

## Japanese pronunciation targets

Where supported and calibrated:

- mora timing;
- long vs short vowels;
- geminate consonants;
- common phoneme contrasts/realizations relevant to learners;
- rhythm;
- F0 contour;
- lexical pitch accent;
- phrase-level pitch/intonation.

Pitch feedback should compare normalized relationships/contours rather than absolute Hz because speakers have different vocal ranges.

Distinguish isolated-word accent metadata from the contour of an actual phrase in its context. Store the reviewed reference variety, utterance text, phrase boundaries, relevant following material, and supported variants for a target. Phrase/focus/intonation differences must not be graded by matching an isolated dictionary contour. Duration comparisons likewise need context and speaking-rate calibration; a mora is not a rule that every measured interval must have identical duration.

F0 extraction must flag voicing and tracking reliability, mask unvoiced/unreliable regions, and detect implausible octave jumps. Missing F0 is unavailable evidence, not low pitch. If a reliable speaker-range estimate or alignment is unavailable, show a clearly labeled guided comparison or abstain. Visual contour similarity alone cannot establish linguistic correctness; provide equivalent audio/text explanations.

## Japanese pitch-accent caution

Pitch accent is pedagogically useful but data and variation must be handled carefully. The pack should declare a reference variety (initially standard/Tokyo-oriented where data is available), allow accepted variants, and avoid treating every regional/natural variation as "wrong."

Do not redistribute OJAD data by default; its published usage terms restrict use to academic/educational purposes and ask users to refrain from for-profit ventures. Treat it as a human research/reference source unless licensing is explicitly clarified for the project's distribution model.

Open JTalk/pyopenjtalk-style tooling can be evaluated for G2P/full-context/accent prediction, but generated values must be validated and the licenses of code, dictionaries, and voices tracked separately.

## Feedback hierarchy

1. Did the system hear usable speech?
2. Was the intended utterance/intent understood?
3. What was done well?
4. What one or two corrections would yield the most value?
5. Can the learner hear/see the contrast?
6. Retry.

Avoid overwhelming beginners with every measurable acoustic deviation.

## Confidence policy

Each correction includes a confidence band. User-facing UI may simplify this to:

- confident feedback;
- possible issue / compare examples;
- unable to assess reliably.

Do not present low-confidence numeric precision.

Automatic feedback remains disabled until a feature-specific protocol and independent evaluation support its thresholds. Use `docs/17_SPEECH_BENCHMARK_PLAN.md` for protocol, uncertainty, false-correction and scoring-coverage requirements. Null/missing calibrated thresholds mean unavailable automatic assessment; they are not defaults to a convenient number. Guided comparison never emits a numeric pronunciation grade or mastery credit based on an unvalidated acoustic score.

Calibration evidence must identify the exact provider/model/feature, their versions and model checksum, preprocessing, protocol and evaluation dataset versions, target/pack version, and reference variety. Verify this binding before enabling the feature. Material changes to any of these inputs disable automatic scoring until appropriate regression and revalidation pass. A runtime or model download being available does not imply that pronunciation assessment is supported.

## Reference audio

The audio a learner hears is baked language-pack media, and that is the whole of it: the app performs no speech synthesis at read time (ADR-0024). The former resolution layers — bundled TTS payload, model-manager synthesis download, bring-your-own `LTS_TTS_DIR`, development bench — and the on-demand synthesis fallback are removed.

Audio is made at pack build time: `scripts/generate-pack-audio.py` synthesizes every audio-addressable item with the ADR-0023 engine (Qwen3-TTS CustomVoice), the pack's `media/manifest.jsonl` records each asset (content id, file, hash, sample rate, provenance), and a pack whose media leaves an addressable item uncovered fails the install/build coverage gate (docs/13). At read time the resolver looks the content id up in its manifest row and plays the row's `file` (`{id}.wav` fallback for pre-ADR-0016 packs). On a miss it reports the honest answer — `media-asset-missing: This pack does not ship audio for this item, and the app never synthesizes speech, so there is nothing to play.` — and the scheduler refuses to plan a silent item as a listening activity. The message must never promise synthesis; a media miss is the normal state of hand-authored dev packs and of any checkout that has not run the generator.

Preferred sources for core-curriculum audio:

1. appropriately licensed human recording for core curriculum (ADR-0016's honest ceiling, unchanged);
2. baked model-output media that cleared the ADR-0023 ASR round-trip QA gate, with the engine, text and identity recorded in the manifest.

Synthetic audio must be tagged so it can be audited. TTS provider and voice licenses are separate concerns.

Core pronunciation targets need qualified review of text/readings, G2P, accent/context and the actual audible recording or synthesis output. A correct text string or predicted accent label alone does not verify its audio. Slower listening playback should preserve pitch; replays and speed reductions count as support in learner evidence. Synthetic changes used to construct known-error fixtures must also be checked by human listeners; labels cannot be inferred solely from generation settings.

## Model distribution

Do not bundle every model in the base app. Use signed/versioned downloadable model bundles with:

- model ID/version;
- language/capabilities;
- architecture/provider;
- size;
- minimum hardware;
- license;
- source;
- checksum;
- expected quality tier.

The app supports `compact`, `recommended`, and optionally `high-quality` profiles where useful.

The download channel carries recognition payloads only (`whisper-ggml` tiny/base/small, `sherpa-whisper-tiny`); ADR-0024 removed the synthesis entries from the catalog, and pack media — not a downloadable synthesizer — is the audio source.

The alignment sidecar is the one deliberate exception to the download-only rule: shipped Linux desktop builds bundle the pinned whisper.cpp runtime and its `ggml-tiny` weights in the app payload instead of waiting on a model-manager download (ADR-0019). It is a fixed hash-pinned payload with a declared CPU floor, not a selectable bundle; selectable larger models still arrive through the model-manager channel.

## Offline requirement

Once a needed model bundle is installed, the corresponding speech feature must work without internet unless explicitly labeled as a cloud-only provider.

## Performance targets (initial)

Set and benchmark realistic hardware tiers instead of universal guarantees. Initial desktop targets for short utterances:

- VAD/quality feedback feels immediate;
- partial/complete ASR feedback within a conversationally tolerable delay;
- pronunciation analysis should normally complete shortly after ASR;
- audio UI remains responsive during inference.

The implementation team must convert these into measured thresholds after baseline spikes on representative hardware.

## Evaluation dataset

Maintain a permissioned regression set including:

- native/reference speech;
- clear learner speech;
- known vowel-length errors;
- known gemination errors;
- pitch-pattern contrasts where licensed/consented;
- wrong utterances;
- silence;
- noise;
- clipping;
- multiple microphones.

Never commit private recordings without explicit redistribution permission.

Microphone access permission is separate from research participation, audio retention, model training, and publication/redistribution consent. Evaluation collection must document each permitted purpose, participant eligibility, storage/access controls, retention, deletion/withdrawal handling, and whether de-identified metadata may be shared. Keep identifiable/raw learner recordings outside source control and distributed packs unless consent and rights expressly permit inclusion. Public or CC0 source labels do not replace checking the exact dataset's access/use conditions. Native read-speech corpora may support ASR evaluation but cannot substitute for a human-labeled learner pronunciation calibration set.

## False feedback is a critical defect

Pronunciation tests should measure false-positive rates. If a feature cannot be scored reliably enough, downgrade it to guided comparison/reference instead of fabricating automated certainty.
