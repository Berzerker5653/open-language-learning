# ADR-0023: Qwen3-TTS replaces Kokoro as the pack-audio bake engine

## Status

Accepted (owner decision 2026-10-10: "Lets lock in Qwen as the main TTS").
Supersedes only the *engine* choice of ADR-0016 (which still governs the
build-time-bake mechanism, manifest provenance, and non-committed binaries).
Amended by ADR-0024 (2026-10-10): the runtime fallback this ADR inherited
from ADR-0016 is deleted — the bake engine now speaks for 100% of the app's
audio, with the install-time coverage gate in place of the fallback.

## Context

ADR-0016 bakes all listening audio at build time with the runtime payload's
Kokoro engine. During O-06 the owner found Kokoro-ja mispronounces taught
content — all five Japanese voices rendered 名前/なまえ as "nomae", machine-
confirmed by whisper round-trip (shipping clip transcribes 「ノマエアですか?」).
Kokoro-ja is a C-range voice by its authors' own grading. A four-engine
bake-off (owner-reviewed, 19 sentences × ja/es/ko, `/tmp/tts-bakeoff/review/`)
compared license-clean candidates: Qwen3-TTS (clearly best, owner), Fun-CosyVoice3
(wrong ja), MeloTTS, OpenVoice V2. Kokoro remains in-app as the *runtime*
fallback synthesizer for items with no baked media; this ADR changes only the
bake engine, so what learners actually hear is Qwen audio.

## Decision

1. `scripts/generate-pack-audio.py` defaults to `--tts qwen3`, baking with
   `Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice` (Apache-2.0), speaker `ono_anna`
   (native-Japanese preset). CustomVoice, not VoiceDesign, because 4,614
   assets need one consistent voice identity and CustomVoice presets are
   fixed while VoiceDesign re-invents timbre per call.
2. `--tts kokoro` stays selectable to reproduce pre-switch payloads.
3. Provenance keeps the public `media-asset` synthesizer shape
   (runtime/model/model_sha256/voice; no schema change): speaker id rides
   `voice`; `model_sha256` is a sha256 fingerprint over the sorted
   (filename,size) shard listing; language and normalization ride `notes`.
4. Synthesis hardening, learned from smoke: edge-silence trimming, and a
   duration cap with re-sampling because LLM TTS occasionally runs away on
   very short texts (observed: a 2-char contrast word became 14 s of babble).
5. Reproducibility is *equivalence*, not bytes: sampling is stochastic, so a
   re-bake yields new bytes; the committed manifest pins inputs, model
   fingerprint, and text so any release can regenerate equivalent media and
   verify what shipped. This refines ADR-0016's "byte-identical" wording.

## Consequences

- Audio binaries stay out of version control; the manifest remains the
  committed artifact (unchanged from ADR-0016).
- Baking needs a Python env with torch + qwen-tts (`scripts/qwen3-tts-worker.py`
  runs resident workers); build machines must provide it, unlike the pure
  ONNX Kokoro path.
- Training data is not publicly enumerated for Qwen3-TTS; mitigations are
  baking only our own licensed text, `model-output` labeling, and an ASR
  round-trip QA gate before release. A data-provenance review is owed before
  any pack whose re-baked audio is published (O-05).
- Qwen3-TTS is not added to the app; download story is unchanged (users get
  app + pack (+ optional whisper)). Runtime-synthesis removal is tracked
  separately (K-90) and not decided here.
- Third-party notices: pack audio is now model output from an Apache-2.0
  model; the attribution/UI wording for audio provenance should name
  Qwen3-TTS at the next pack release.

## Alternatives rejected

- Keep Kokoro (fails the correctness bar the product exists for).
- CosyVoice3 (owner: Japanese sounded like Chinese; instruct mode produced
  gibberish in bake).
- OpenVoice/MeloTTS (acceptable but clearly below Qwen in the owner's listen;
  OpenVoice needs a reference clip per call — no standalone voice).
- Qwen3-TTS-VoiceDesign (best-sounding in the bake-off sample but stochastic
  voice identity per call; CustomVoice presets give the same family with a
  stable speaker).
- Recording native speakers (highest ceiling, out of scope/cost for a
  reference pack; revisit for the A1-quality course).
