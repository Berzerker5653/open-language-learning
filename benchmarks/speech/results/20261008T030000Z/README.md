# Synthetic learner proxy — can TTS output stand in for the learner panel?

Run `20261008T030000Z`. Machine-readable numbers: `summary.json`. Raw per-clip probe
output: `runs/*.txt`. Generator: `benchmarks/speech/tools/synthetic-learner-proxy.py`.

```
eligibility: not_valid_synthetic_data
```

No number in this directory may be entered into the SPEECH-007 calibration registry.
This run measures the measurement pipeline. It contains no learner speech.

## Question

SPEECH-007 is the only `blocked` task left on the required chain, and it gates
JA-A1-003 → ACC-001 → PERF-002 → PLAT-001 → SEC-001 → REL-001. The gate is calibration
against ≥40 consented learners, scored by two qualified human labelers with an
adjudicator, against frozen thresholds (`vowel-length-0.2.0.yaml`: false-correction
≤ 0.05, scoring coverage ≥ 0.60, label agreement κ ≥ 0.70). The owner asked why an AI
cannot simply make the recordings. The answer is measured here rather than asserted.

## Method

Kokoro (`kokoro-multi-lang-v1_1`, sid 37, sherpa-onnx v1.13.8 — the same chain the app
synthesizes with) produced the minimal pairs おばさん/おばあさん and とおい/問い. The
long-word segment of each take was time-stretched to a **known** ratio
(0.85 / 1.00 / 1.25 / 1.45 / 1.70) and degraded (clean, broadband noise, +3 % pitch),
so ground truth is exact by construction: 15 clips per pair. Those takes were fed to
the real scoring path (`vowel_length_probe` → `interpret.rs` bands) with whisper.cpp
`base` and `small`, under two reference-ratio sources: the pack's declared
`expected_ratio` (the current ADR-0013 path) and the TTS output itself (the
pre-ADR-0013 path).

## Scoring coverage (gate ≥ 0.60)

| ASR | pair | reference source | measured ref ratio | scored | coverage |
|---|---|---|---|---|---|
| base | obasan | declared 1.25 | 1.330 | 3/15 | 0.20 |
| base | obasan | TTS output | 1.048 | 3/15 | 0.20 |
| base | toi | declared 1.5 | 0.930 | 0/15 | 0.00 |
| base | toi | TTS output | 0.618 | 0/15 | 0.00 |
| small | obasan | declared 1.25 | 1.330 | 8/15 | 0.53 |
| small | obasan | TTS output | 1.048 | 8/15 | 0.53 |
| small | toi | declared 1.5 | 0.930 | 1/15 | 0.07 |
| small | toi | TTS output | 0.618 | 1/15 | 0.07 |

Every configuration fails the 0.60 floor. Coverage doubles when the **ASR model** is
swapped and does not move at all when the planted speech condition changes — the
number being gated is a property of the transcriber. Dominant abstention:
`mismatch:expected-text-not-matched`.

The generator runs the probes itself (`runs/` here), so the study is one command.
`--reuse` re-measures existing audio instead of regenerating it, which matters
because the synthesis chain is not byte-reproducible (see below).

## The same 8 clips, one knob turned

`ggml-small`, obasan pair, 8 identical scored clips. The only difference between
columns is where the reference ratio comes from.

| planted ratio | meaning | TTS reference (1.048) | declared reference (1.330) |
|---|---|---|---|
| 0.85 | shortened — an error to catch | `close` | `shorter` |
| 1.25 | pack target | `close` | `shorter` |
| 1.45 | mora-correct production | `close` | `shorter` |
| 1.70 | over-lengthened — an error to catch | `close` | `shorter` |

Under the TTS reference the metric says "close" to everything: **0 of the planted
errors caught**. Under the declared reference it says "shorter" to everything,
including mora-correct and over-lengthened takes: **false-correction rate 1.0 against
a 0.05 ceiling**. Nothing about the audio changed between columns.

## Why this closes the shortcut

With synthetic data the label and the measurement come from the same knob. The metric
tracks the reference/synthesis parameter we chose, not any speaker property, so a
"pass" would be a restatement of our own input. `min_label_agreement` (κ ≥ 0.70) is
vacuous for the same reason: labels derived from generator parameters agree with the
audio at κ = 1.0 by construction, so that gate cannot fail and tells us nothing.

This is not an argument against using TTS audio in the product — ADR-0016 ships it as
comprehension input. It is an argument that generated audio cannot establish the
accuracy of pronunciation feedback, which is what the gate exists to protect.

Side finding, confirming ADR-0013: Kokoro's own long/short ratios are 1.048 (obasan)
and 0.618 (toi) against declared 1.25 and 1.5 — flattened and inverted. Generated
audio stays out of the pronunciation-reference path.

## Reproduction, and why it is not exact

A second run (`reproduction_check` in `summary.json`) re-synthesized everything from
scratch and reached the same conclusion: coverage 0.00–0.53, and on the eight clips
`ggml-small` scored under the obasan contrast, 8/8 `close` under the TTS reference
against 8/8 `shorter` under the declared reference. The clip set differed; the flip
did not.

The numbers are not identical because **generation** is not byte-stable: five
syntheses of one utterance with the pinned chain produced five distinct sha256
values — including with `--num-threads=1` — and the re-synthesized reference pairs
moved (obasan 1.330 → 1.313, toi 0.618 → 0.642), which flipped borderline clips
between scored and abstained.

**Measurement is stable.** Re-running with `--reuse` (byte-identical clips)
reproduced all four `ggml-small` transcripts byte-for-byte, alignments included.
So the jitter is the synthesizer's, not the aligner's: recorded learner audio, once
stored, is measured reproducibly, whereas a study that regenerates its own inputs
cannot compare across runs. Use `--reuse` whenever re-measuring.

## What would close the gate

Either the panel the protocol specifies (≥40 consented learners, 2 qualified
labelers + adjudicator, named ratifier — `datasets/SOURCING.md`,
`CALIBRATION_RUNBOOK.md`), or an explicit owner scope decision recorded against
`tasks/ROADMAP.yaml` shipping stable 1.0 with guided-only speech feedback, which
leaves SPEECH-007 out of the required chain and unblocks A1 → B2 → REL-001.
