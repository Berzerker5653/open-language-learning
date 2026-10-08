# ADR-0008: Constrained alignment via embedded runtime (prototype)

## Status

Accepted (prototype scope; production alignment quality open — see
Consequences).

Date: 2026-10-03

## Context

SPEECH-004 requires aligning expected short Japanese utterances to
pack-declared units with confidence, and abstaining on mismatch or low
confidence (docs/05: alignment alone cannot prove the expected text was
spoken). Two candidate architectures:

1. **Embedded runtime**: derive timestamps at app runtime from the ASR
   already installed via the model manager (whisper.cpp `-oj` word/
   segment offsets, verified working in SPEECH-001), then
   constrained-match the recognized text against the expected units
   (Needleman-Wunsch over normalized characters) to map units onto
   token spans.
2. **Preparation tooling**: a build-time forced aligner (e.g. MFA with
   a Japanese acoustic model, or wav2vec2-based aligners) that emits
   per-utterance timestamp files shipped inside packs.

## Decision

Adopt the embedded-runtime approach for the prototype:
`lts_speech_runtime::alignment::WhisperConstrainedAligner`
(subprocess whisper.cpp with `-oj`, then `match_units`).

Rationale:

- Zero new runtime dependencies beyond the already-selected
  whisper.cpp fallback (ADR-0007); packs stay pure data with no
  binary timestamp artifacts to license, version, or migrate.
- The verify-then-align order is explicit: the aligner first matches
  the recognized text against the expected text and returns
  `UtteranceMismatch` (never a partial alignment) when the match ratio
  is below threshold, and `Abstained` when nothing was recognized.
- Preparation tooling would give denser timestamps but adds a heavy
  per-pack build pipeline (acoustic model licensing, Japanese
  dictionary preparation, pack format growth) that is unjustified
  before SPEECH-005/006 show what granularity feedback actually needs.

## Consequences

- Alignment granularity is bounded by whisper token/segment offsets;
  segment offsets span the padded 30 s window, so spans are clamped to
  the utterance buffer. Mora-level precision is NOT guaranteed by the
  prototype.
- Alignment confidence is a text-match ratio, not an acoustic
  posterior. Downstream (SPEECH-005) must not treat it as
  pronunciation evidence; per-unit spans below 0.3 local match are
  dropped.
- If SPEECH-005/006 require mora-level precision, revisit preparation
  tooling as an additive pack capability (packs may ship optional
  alignment artifacts later); the provider contract
  (`AlignmentProvider`) does not change.
- tiny-tier ASR quality (SPEECH-001) caps prototype behavior; the
  hermetic matcher tests carry the CI signal, vendor tests prove the
  end-to-end path locally.

## Alternatives

- MFA/wav2vec2 preparation tooling (rejected for prototype: heavy
  licensing/pipeline, pack format growth, premature before feedback
  design is validated).
- sherpa-onnx token timestamps (rejected: verified to emit empty
  timestamps for the tiny export in SPEECH-001).
- Pure energy-based mora segmentation (rejected: no text constraint,
  cannot abstain on wrong phrase).

## Amendment (2026-10-08)

The embedded-runtime half of this decision was never *shipped*: the
prototype resolved `whisper-cli` from a development bench cache
(`$LTS_BENCH_VENDOR` / `~/.cache/lts-bench`), so a released desktop build
contained the matcher and no ASR. ADR-0019 supersedes that delivery
mechanism — the runtime now ships as a staged, hash-pinned, gitignored
sidecar payload with an explicit x86-64-v3 instruction-set floor and a
runtime CPU gate. Nothing else here changes: the `whisper.cpp -oj` +
Needleman-Wunsch architecture, confidence as a text-match ratio that is
never pronunciation evidence, and abstention on mismatch or low
confidence all stand.
