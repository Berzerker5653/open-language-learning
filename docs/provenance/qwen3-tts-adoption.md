# Qwen3-TTS adoption as the pack audio bake engine

Date: 2026-10-10. Owner decision, verbatim: "out of the 3 Qwen3 TTS by far
sounds the best. Cozyvoice was more chinese then japanese. Lets lock in
Qwen as the main TTS."

## What was tested

Four license-clean engines baked the same 19-sentence probe set (ja×8,
es×6, ko×5; probe file `/tmp/tts-bakeoff/probes.json`, review tree
`/tmp/tts-bakeoff/review/`, per-clip manifests beside each engine):

| engine | license | result |
| --- | --- | --- |
| Qwen3-TTS-12Hz-1.7B-VoiceDesign | Apache-2.0 (HF card, repo LICENSE, checked 2026-10-10) | owner: clearly best |
| Fun-CosyVoice3-0.5B-2512 | Apache-2.0 | Japanese wrong ("more Chinese than Japanese"), instruct-mode gibberish |
| MeloTTS (JP/ES/KO) | MIT | acceptable, flatter |
| OpenVoice V2 | MIT + MyShell free-commercial clause | acceptable; zero-shot only (needs a reference clip) |

Kokoro (the runtime payload engine, ADR-0016) was disqualified for taught
audio by the owner's ears on all five Japanese voices and by whisper
round-trip: the shipping voice transcribes 「ノマエアですか?」 for
`私の名まえは何ですか` (owner-report finding 12). All four bake-off
engines transcribe the same probe as 「私の名前は何ですか」.

## Production configuration

- Model: `Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice` (Apache-2.0), local copy
  `~/.cache/lts-bench/tts/qwen3-tts-customvoice-1.7b`. CustomVoice (named
  preset speakers) rather than VoiceDesign because the bake-off's own
  consistency caveat — VoiceDesign re-invents the timbre per call, while
  4,614 pack assets need ONE voice identity.
- Voice: speaker id `ono_anna` — the only native-Japanese preset
  ("playful Japanese female voice with a light, nimble timbre").
- Baking: `scripts/generate-pack-audio.py --tts qwen3` (default), workers
  via `scripts/qwen3-tts-worker.py` in a dedicated venv
  (`~/.venvs/qwen-tts`: torch 2.14 CPU + qwen-tts). Output 24 kHz mono,
  then the standard loudness normalization (active-speech RMS −16.5 dBFS,
  peak ≤ 0.70) — unchanged from the O-06 owner decision.
- Provenance rows keep the public `media-asset` synthesizer shape:
  `runtime: "qwen3-tts"`, `model` = model directory name, `model_sha256` =
  sha256 over the sorted (filename,size) listing of the `.safetensors`
  shards (a fingerprint, not a re-hashable byte hash), `voice` = speaker
  id; the speech language and normalization note ride `notes`.

## Known caveats (deliberately accepted with owner sign-off)

- Qwen3-TTS training data is not disclosed. Mitigations: we bake only our
  own licensed content; audio is labeled `model-output` (never presented
  as a human recording); the ASR round-trip QA gate checks every baked
  clip's content before release. A formal data-provenance review remains
  owed before O-05 of any pack whose audio was re-baked.
- Reproducibility is per-run, not per-epoch: sampling is stochastic, so a
  re-bake with identical inputs yields different bytes. The manifest (the
  committed artifact) records exact inputs + model fingerprint + text, so
  any release can re-derive equivalent media and verify what it shipped.
- Speed: 2026-10-10 bake-off ran CPU-only (GamingPC GPU booked by this
  session's inference server); production bakes should use the GPU.

## Board/roadmap

K-89 (this adoption + full pack re-bake) → `tasks/ROADMAP.yaml` TTS-003.
Runtime (in-app) synthesis removal is tracked separately (K-90) and is
NOT part of this decision.
