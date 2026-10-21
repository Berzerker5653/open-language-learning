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
- Worker environment, pinned and re-verified 2026-10-12: `qwen-tts==0.1.1` **from PyPI,
  non-editable**, into `~/.venvs/qwen-tts` (torch 2.14.1+cpu, torchaudio 2.11.0+cpu,
  transformers 4.57.3, onnxruntime 1.31.0). The original install was editable against
  `/tmp/tts-bakeoff/repos/qwen3-tts`, so when `/tmp` was cleared the venv could no longer
  import `qwen_tts` and a bake died at worker start with `ModuleNotFoundError` — the
  documented "any release can regenerate the media" claim was false until this line was
  true. `flash-attn` and `sox` warnings the package prints at import are cosmetic: the
  worker drives PyTorch and `soundfile` only.
- Provenance rows keep the public `media-asset` synthesizer shape:
  `runtime: "qwen3-tts"`, `model` = model directory name, `model_sha256` =
  sha256 over the sorted (filename,size) listing of the `.safetensors`
  shards (a fingerprint, not a re-hashable byte hash), `voice` = speaker
  id; the speech language and normalization note ride `notes`.

## Incremental runs must never relabel existing audio (2026-10-12)

The baker rebuilds every manifest line it touches, so an incremental run after a
content edit used to write the *new* declared reading into the row while keeping
the wav synthesized from the *old* one. Measured on five A2 sentences whose kana
was corrected: `--only` reported `generated=0 reused=5`, and `validate` then saw
row text and declared reading in perfect agreement — `media_text_not_declared_reading`
can only compare those two, so the stale bytes were invisible to every gate.
`reusable()` now refuses reuse unless the on-disk bytes match the recorded
`sha256`, the previous row credits the same `synthesizer`, AND the previous row's
`text` equals what this run would feed. A corrected reading therefore
re-synthesizes instead of relabelling. Covered by `ReusableTest` in
`scripts/test_generate_pack_audio.py`, now run by `scripts/ci.sh` and the
`schemas` CI job.

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

## Re-evaluation 2026-10-21: OmniVoice / VoiceStudio (the "open ElevenLabs clone")

Owner surfaced VoiceStudio (`debpalash/VoiceStudio`, AGPL-3.0 desktop app
marketed as "the open-source, fully-local ElevenLabs alternative", 646
languages). Its default engine is **k2-fsa/OmniVoice** (diffusion-LM
architecture on a Qwen3-0.6B backbone; 24 kHz output; RTF ~0.025 on GPU;
zero-shot cloning, voice design, pinyin/phoneme correction; paper
arXiv:2604.00688) — technically the strongest new candidate since the
2026-10-10 bake-off. **Decisive blocker:** the official model card states
the code is Apache-2.0 but the **pre-trained model is CC-BY-NC** "due to
constraints from its training data (e.g., Emilia)". Pack audio is derivative
output of the engine, and our packs publish under a CC-BY-SA-4.0 / CC0-1.0
stack with per-asset licence records kept honest by `audit-licenses`; an NC
encumbrance on the weights would contaminate that chain. The current engine's
weights (Qwen3-TTS CustomVoice) are Apache-2.0, which is precisely why the
2026-10-10 decision is safe to re-run anywhere. VoiceStudio's own AGPL is
not a media concern — the app is never shipped or linked. Same-week
adjacent candidate Fish Audio Drama 3 (Oct 14, 2026, 35B) carries a "free
for companies under $500k annual revenue" condition — incompatible with the
same provenance posture, and an order of magnitude heavier to bake with.
Decision: **Qwen3-TTS stays the bake engine.** Revisit OmniVoice only if
k2-fsa ships commercially-licensed weights or the owner deliberately changes
the media-licensing policy (owner decision, per docs/16).


## Board/roadmap

K-89 (this adoption + full pack re-bake) → `tasks/ROADMAP.yaml` TTS-003.
Runtime (in-app) synthesis removal is tracked separately (K-90) and is
NOT part of this decision.
