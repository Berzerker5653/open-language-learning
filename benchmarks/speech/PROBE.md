# Local pronunciation probe — how to test the feature yourself

Dev tool: `crates/speech-runtime/examples/vowel_length_probe.rs`. It runs the
**same** align → measure → interpret path the desktop app uses, over WAV clips
you supply, and prints what the feature _would_ say. It is **guided-mode
inspection only** — it does not enable automatic scoring or mastery (that stays
gated on SPEECH-007 calibration, docs/17 §127/§129).

## Run it

```
cargo run -p lts-speech-runtime --example vowel_length_probe -- \
  --ref-short <short.wav> --ref-long <long.wav> --clips <dir> [--model <ggml-*.bin>]
```

- `--ref-short/--ref-long`: the pack's reviewed short/long reference media, used
  to compute the reference ratio. For the demo pack:
  `tests/fixtures/packs/ja-demo/media/ja.lex.demo.obasan.wav` and
  `.../ja.lex.demo.obaasan.wav`.
- `--clips <dir>`: each attempt is `<name>.wav` + a `<name>.meta` file with two
  lines — the expected **short** text then the expected **long** text.
- `--model <ggml-*.bin>`: which whisper ggml model to align with (default
  `ggml-tiny.bin`). base/small are in the catalog; place them in the vendor dir
  (`~/.cache/lts-bench`) to compare sizes.
- `--data-dir <dir>`: read the app's device `speech.json` and use the model the
  app actually selected (resolved via the runtime catalog). If the preference is
  `off`, the probe falls back to `ggml-tiny.bin`. `--catalog <path>` overrides
  the catalog location (default `apps/desktop/src-tauri/models/catalog.json`).
  `--model` still wins if both are given.

## What a clip must contain

The exercise is **self-normalizing**: one attempt must say **both** words, short
then long (e.g. "おばさん … おばあさん"), because the feature compares the long
word's duration to the short word's _within the same attempt_ to cancel speaking
rate. A clip with only one word will (correctly) abstain with
`mismatch:expected-text-not-matched`.

## Your recordings

Record the minimal pair back-to-back (short, brief pause, long) into a mono
16-bit WAV, drop it in the clips dir with a matching `.meta`. Keep recordings
local; this probe reads them from disk and ships nothing. For anything beyond a
personal sanity check, use the consented-study flow (`benchmarks/speech/consent/`).

## Openly-licensed Japanese audio (for robustness, not calibration)

Real human audio checks that the feature does **not** false-correct on clean
native speech. Verify each license at acquisition (docs/17 §29); fetch upstream,
do not re-host raw audio.

| Source                      | What                                             | License / terms (verify)                                                                                    |
| --------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Mozilla Common Voice (ja)   | crowdsourced **read** speech                     | CC0 label, but release terms **prohibit re-hosting + speaker ID** (SOURCES.md §82–84) — fetch upstream only |
| JSUT (Kyoto Univ., T. Kita) | single native female, read sentences, known text | open, attribution — verify current terms                                                                    |
| JVS (AIST)                  | 100+ native speakers, read sentences             | research/commercial with conditions — verify                                                                |
| Pinned Kokoro TTS           | model output, known intended lengths             | Apache-2.0 chain (already vendored)                                                                         |

These are **native read speech** → useful for false-correction-on-clean-speech
robustness, **not** learner-error calibration (docs/17 §25).

## What actually makes feedback fire (corrected 2026-10-06)

An earlier note blamed the **whisper ggml-tiny** aligner for "mis-recognizing"
target words. That was **free transcription**, not the path the app uses. The
app uses `WhisperConstrainedAligner`, which constrains recognition to the
expected units and is far more robust. Re-running the probe across
**tiny / base / small** on a continuous minimal-pair take gives **identical**
results: the pair clip scores `speech.long-vowel.close` at `align_conf 0.9`
even on tiny; isolated single words abstain by design (no contrast in one word).

So the **aligner model size is not the bottleneck**. Two things gate feedback:

1. **A model must be selected.** The device speech preference defaults to
   `off` (privacy-first); with `off` the app abstains with `speech-model-off`
   and the aligner never runs. Pick a model in the Languages page to enable it.
2. **The attempt must contain both units** in one continuous take (the exercise
   format above). One word has no short↔long contrast to measure.

Larger models only help on longer natural phrases, not on this contrast feature.
Evidence: `state/evidence/SPEECH-007/probe-2026-10-06.txt` (addendum).
