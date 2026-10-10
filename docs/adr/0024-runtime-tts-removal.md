# ADR-0024: No runtime TTS — language packs are the only speech audio

## Status

**Accepted — owner decision 2026-10-10** ("sounds like a major improvement"; board card K-90, roadmap TTS-004).

Supersedes the **distribution-variant** half of ADR-0009 (there is no TTS-bundled variant, no bring-your-own TTS directory, and therefore no payload-scoped GPL surface) and the **runtime fallback** role that ADR-0016 decision 3 and ADR-0023 deliberately left in place. What survives untouched: ADR-0016's bake mechanism (manifest identity, binaries out of git) and ADR-0023's engine choice (Qwen3-TTS CustomVoice) — those now carry 100% of the app's speech audio. Recognition, microphone and output-routing behavior are unchanged.

Date: 2026-10-10

## Context

ADR-0016 put model-output audio inside the pack and ADR-0023 re-baked it with a
proven engine — but both kept runtime synthesis alive as a gap-filler for items
with no baked asset. Three conditions had to hold before that fallback could
die, and by 2026-10-10 all three did:

- **Coverage.** `scripts/generate-pack-audio.py` bakes every item the desktop
  resolver can ask for — every sentence, every contrast item
  (`{contrast-id}-{index}`), every script-tagged lexicon entry: **4,614 assets**
  for `languages/ja-JP`, regenerated 2026-10-10 with loudness normalization,
  manifest `128f77e` (4,613 committed rows; the committed manifest alone is
  3.23 MB, which is why PS-09 raised `MAX_DATA_BYTES` to 8 MB). K-89 closed the
  remaining gap by re-baking.
- **A guard that makes coverage enforceable.** `crates/langpack/src/audit.rs`
  `audit_media` now enumerates exactly what the generator bakes and refuses an
  install whose manifest leaves an addressable item uncovered
  (`media_asset_missing`). Before ADR-0024, an uncovered pack could still ship —
  D1's 2026-10-08 fix deliberately built an **audio-less archive** (manifest
  dropped, warning) and `docs/13` recorded that "the app falls back to on-demand
  synthesis". That posture is what this ADR retires.
- **Evidence that the fallback is the dangerous path, not the safety net.**
  Finding 12 of `state/evidence/O-06-2026-10-10/owner-report.md`: all five
  Kokoro-ja voices render `私の名まえは何ですか` as "nomae" — on content whose
  kana reading is declared and fed to the engine verbatim — and the round-trip
  ASR of the shipped clip transcribes 「ノマエアですか?」. Baked audio is labeled
  `model-output` with provenance in `media/manifest.jsonl` and must clear the
  ASR round-trip QA gate (ADR-0023); audio synthesized at read time has neither
  label nor gate, and ADR-0013 measured that no available TTS realizes the
  long-vowel contrast at all. After coverage, the fallback can only fire on
  items nothing has ever measured — so it was the only path in the product that
  could put mispronounced, unlabeled audio into a learner's ears.

Meanwhile the runtime chain was the largest thing the app carried:
`kokoro-multi-lang` (345,065,270 B) plus `sherpa-onnx-runtime` (30,454,382 B)
— ~375 MB of catalog payload — and `espeak-ng-data` under GPLv3, which is what
made ADR-0009's variant axis, the source offer, the component notices, the
attribution UI and the GPL coupling of LIC-001 necessary in the first place. It
also cost a Settings status card, an onboarding synthesis notice, and an
`installable: false` dead end that made onboarding's speech step permanently
unsatisfiable (the 2026-10-10 speech-gate fix).

## Decision

1. **The app performs no speech synthesis at read time.** Removed from the
   shipped app: the resolver's synthesis fallback and its helpers in the desktop
   crate, the two `catalog.json` synthesis payload entries, the bring-your-own
   `LTS_TTS_DIR` resolution, the `TtsStatus` card, the onboarding synthesis
   notice, and the whole variant build mechanics — `scripts/build-tts-variants.sh`
   and its `dist/variants/tauri.tts.json` overlay. There is no "bare" versus
   "TTS-bundled" app; there is one package.
2. **Language packs are the only speech audio source.** A media id resolves
   through the pack's `media/manifest.jsonl` row and its `file` field
   (ADR-0016 decision 5, `{id}.wav` fallback for pre-ADR-0016 packs) to baked
   bytes produced at **build time** by `scripts/generate-pack-audio.py` with the
   ADR-0023 engine. The model catalog retains only recognition entries
   (`whisper-ggml` tiny/base/small and `sherpa-whisper-tiny`); the aligner
   sidecar stays bundled in shipped Linux builds (ADR-0019).
3. **Install-time media-coverage enforcement** (`crates/langpack` audit,
   `Mode::Install`; the enumeration mirrors `scripts/generate-pack-audio.py`
   `targets()`): every audio-addressable item must have a manifest row **and**
   its wav. Codes and severities:
   - `media_asset_missing` — **Error in every mode** (aggregated, first 8 ids
     named): built or partially built media leaves addressable items with no
     manifest row, so there is nothing to play for them and nothing synthesizes
     at read time. Regenerate with `scripts/generate-pack-audio.py`.
   - `media_missing` — Error (per item): a row is declared, the wav is absent
     while others are present.
   - `media_manifest_absent` — Error when media is expected (install), Info in a
     source checkout: addressable items exist and the manifest has no rows.
   - `media_unbuilt` — Error when media is expected, Info in a checkout: the
     manifest is committed but zero present wavs.
   Existing row-level codes (`media_row_unusable`, `media_hash_mismatch`,
   `media_size_mismatch`, `media_duplicate`, `media_text_not_declared_reading`,
   `media_item_without_reading`, `media_unlisted`) are unchanged. The audio-less
   archive D1 added is gone: a pack that fails this gate does not build.
4. **The honest no-media path stays, and is now the whole of it.** The
   resolver emits `media-asset-missing: This pack does not ship audio for
   this item, and the app never synthesizes speech, so there is nothing to
   play.`, and the scheduler refuses to plan a silent item as a listening
   activity ("pack declares no audio for this sentence", D2/D3's rule).
   This is the normal state of hand-authored dev packs
   (`tests/fixtures/packs/ja-demo`, `languages/ru-RU`, which ship no media
   at all and are audited in a source checkout) and of any checkout that
   has not run the generator. The message must never promise synthesis.
5. **Recognition and audio I/O are explicitly out of scope.** whisper.cpp ASR,
   the bundled aligner sidecar, microphone capture and the per-profile playback
   output device (K-88) all stay exactly as they are.

## Consequences

- **Every clip a learner hears is graded audio.** The engine that voiced it, the
  text it was fed and its identity are in the manifest, and the bake cleared the
  ASR round-trip gate. There is no remaining code path that can speak taught text
  with an engine nobody evaluated — the `nomae` failure mode cannot reappear in
  the app unnoticed; it can only reappear in a bake, where the gate and the
  owner's ears are in the loop.
- **Roughly 400 MB comes off the download**, and the TTS variant axis — overlay
  config, staged `resources/tts`, source-offer job, attribution-UI entries,
  payload-scoped license texts — disappears entirely.
- **The app ships no GPLv3 material.** espeak-ng-data (GPLv3) and the Kokoro
  runtime closure are no longer distributed, so ADR-0009's payload-scoped
  obligations retire with it and LIC-001's GPL coupling stops constraining the
  shipped app. `THIRD-PARTY-NOTICES.md` moves the Kokoro/espeak-ng history to a
  clearly-labeled build-time-tooling section and adds the ADR-0023 bake engine
  (Qwen3-TTS, Apache-2.0) there; whisper.cpp and the recognition stack stay where
  they were.
- **Content coverage becomes a hard gate.** Adding a sentence, contrast item or
  script-tagged lexicon entry to a pack without re-baking fails the install with
  `media_asset_missing` naming the items, and `scripts/build-catalog.sh` keeps
  generating audio **before** every `langpack build`. Pack authors and CI are
  affected; the app is not.
- **Build machines need the bake environment** (Python + torch + qwen-tts,
  ADR-0023); users' machines never need a synthesizer at all.
- **Already-downloaded payloads become dead bytes.** A user who installed the
  old synthesis payloads keeps them on disk: the catalog no longer names them, so
  they are never read, updated or removed automatically.
- **Docs move with the code**: `docs/05_SPEECH_SYSTEM.md` describes pack media as
  the audio source instead of a TTS hierarchy; `docs/13_RELEASE_AND_DISTRIBUTION.md`
  loses the variant section and states single-package release plus the coverage
  gate; `docs/adr/README.md` indexes this ADR; ADR-0009 is annotated
  superseded-in-part; ADR-0016 and ADR-0023 get an amendment recording that
  their runtime-fallback role is removed and only build-time baking remains.
- Not decided here: the long-standing "licensed human recording" ceiling
  (ADR-0016's honest limit) and any future **cloud** audio path (docs/05's
  deferred cloud ASR/TTS). Neither puts a synthesizer back in the shipped app.

## Alternatives considered

- **Keep Kokoro as an in-app gap-filler** (the explicit ADR-0023 compromise):
  rejected. Once the bake covers every addressable item and the guard enforces
  it, the only items a runtime engine could voice are items the pack author has
  not baked — i.e. unmeasured content — and that is exactly the population where
  "nomae" was found. The gap-filler was the defect.
- **Keep the payload for GPL-averse or bring-your-own users** (ADR-0009's
  variant axis): rejected. A variant axis exists to fence GPL obligations around
  a payload the app no longer uses; one package with no GPL payload is strictly
  simpler, and the "bring your own" case is served by the same pack-media path.
- **Move TTS behind a separate optional download**: rejected. Same
  unlabeled-mispronunciation risk, still needs a status card and an onboarding
  notice, still cannot pass the round-trip QA gate, and buys nothing now that
  packs carry every asset.
- **Warn instead of fail on uncovered items**: rejected. That is the current
  defect — an audio-less archive that "falls back" to a synthesizer nobody
  graded. With nothing synthesizing at read time, an uncovered item is permanent
  silence, so failing loudly at install/build is the honest shape.
