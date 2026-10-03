# ADR-0007: Initial local speech provider selection (Japanese)

## Status

Accepted (engineering selection for development; production model tier
open — see Consequences).

Date: 2026-10-03

## Context

M5 requires local, offline Japanese ASR behind the provider contract in
`lts-speech-api` (docs/05). docs/17 requires the choice to come from a
reproducible benchmark, not popularity. SPEECH-001 ran the harness at
`benchmarks/speech/harness/` under protocol
`benchmarks/speech/protocols/ja-JP/asr-0.1.0.yaml` against pinned
candidates (results: `benchmarks/speech/results/20261003T071328Z/`):

| candidate | model tier | CER proxy | warm p50 | warm p95 | cold load | RTF | peak RSS | model MB | timestamps | license |
|---|---|---|---|---|---|---|---|---|---|---|
| whisper.cpp (built from master, CPU) | ggml-tiny | 0.593 | 337 ms | 434 ms | 307 ms | 0.27 | 180 MB | 78 | segment offsets (`-oj`) | MIT |
| sherpa-onnx v1.13.8 (ONNX Runtime, CPU, 4 threads) | whisper-tiny-onnx | 0.474 | 430 ms | 492 ms | 386 ms | 0.34 | 96 MB | 152 | none with this export | Apache-2.0 |

Fixtures are synthetic TTS read-speech (kokoro-multi-lang-v1_0, ja);
per protocol these are an accuracy **proxy** only — learner-speech
accuracy and any automatic pronunciation feature remain gated on
SPEECH-007 calibration data (owner-supplied).

## Decision

1. **Default ASR runtime: sherpa-onnx** (ONNX Runtime backend).
   - Lower CER at the identical model tier; ~half the resident memory;
     Apache-2.0 code; official Android/iOS APIs match the mobile
     milestone requirement (docs/01 platforms); actively maintained
     (v1.13.8).
2. **whisper.cpp is the secondary/fallback runtime**, kept behind the
   same `lts-speech-api` contract: MIT, lowest latency on CPU, useful
   where ONNX Runtime is impractical, and its verified segment
   timestamps are useful for alignment experiments.
3. **Model tier: `tiny` is development-only.** Both candidates' CER
   (0.47–0.59) is far above what any feedback feature could use. The
   production tier (whisper `small`/`medium` vs Japanese-specialized
   models such as SenseVoice/Paraformer-class) must be re-benchmarked
   with the SPEECH-002 harness extension before SPEECH-002 ships an
   install flow; model downloads stay opt-in with checksum pinning
   (docs/07).
4. **Split-provider note:** TTS/G2P (SPEECH-005/006) are not decided
   here; the benchmark harness is provider-agnostic and will be
   extended rather than replaced.

## Alternatives considered

- **whisper.cpp as default**: lost on memory (1.9x), CER at equal tier,
  and mobile path (no first-class mobile bindings comparable to
  sherpa-onnx's).
- **Cloud ASR**: violates the offline-first core requirement (docs/00
  non-negotiables); not benchmarked.
- **Deferring the choice**: blocks SPEECH-002 adapter work; the
  contract crate already isolates the decision.

## Consequences

- `lts-speech-runtime` will implement the sherpa-onnx adapter first
  (subprocess or C-API binding decided in SPEECH-002), whisper.cpp
  adapter second.
- GPU tier not measured (CPU builds pinned for reproducibility); the
  benchmark protocol records this gap. GPU numbers are required before
  advertising accelerated performance.
- The tiny-tier proxy CER numbers must never be quoted as product
  accuracy; they exist to rank runtimes.
- Benchmark reproducibility depends on pinned vendor artifacts
  (checksums in each run's `summary.json`); vendor binaries/models live
  outside the repository (`$LTS_BENCH_VENDOR`, default
  `~/.cache/lts-bench`) — models are large and license-restricted.
