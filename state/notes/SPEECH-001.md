# SPEECH-001 — Benchmark local ASR/VAD candidates for Japanese

Date: 2026-10-03

## Acceptance mapping

1. **Reproducible benchmark compares at least sherpa-onnx and
   whisper.cpp-class candidates (if feasible).**
   - Both candidates measured: whisper.cpp (built from master, CPU) with
     ggml-tiny, and sherpa-onnx v1.13.8 (ONNX Runtime, CPU, 4 threads)
     with whisper-tiny-onnx.
   - Harness: `benchmarks/speech/harness/run_bench.py` (+ `gen_fixtures.py`),
     stdlib-only, pinned model checksums recorded per run; protocol
     versioned at `benchmarks/speech/protocols/ja-JP/asr-0.1.0.yaml`;
     dataset manifest at `benchmarks/speech/datasets/ja-onramp-synth-0.1.0/`.
   - Run artifact: `benchmarks/speech/results/20261003T071328Z/summary.json`
     (also copied to `bench-summary-2026-10-03.json` here).

2. **Measures Japanese accuracy proxy, latency, RAM/CPU/GPU, size,
   timestamps, licenses, platforms.**
   - CER proxy (NFKC-normalized character error rate; pinned
     normalization in the protocol): whisper.cpp 0.593, sherpa-onnx 0.474.
   - Latency: warm p50/p95 + cold load per candidate; RTF; peak RSS
     delta (180 MB vs 96 MB); model disk MB + SHA-256; timestamps
     verified per candidate (whisper.cpp segment offsets yes;
     sherpa tiny export none); licenses (MIT / Apache-2.0 + upstream
     model terms); platforms (linux-x86_64 CPU).
   - GPU tier: NOT measured — recorded honestly in the protocol
     (`not_measured` with reason); CUDA toolchain exists but CPU builds
     were pinned for reproducibility. Low-tier device also not
     measured (no representative hardware) — recorded.
   - Accuracy-proxy caveat (per protocol): synthetic TTS read-speech
     fixtures; learner-speech claims prohibited from this dataset.

3. **ADR chooses initial provider or records split-provider decision.**
   - `docs/adr/0007-initial-speech-provider-selection.md`: default
     sherpa-onnx (lower CER at equal tier, half the RSS, Apache-2.0,
     mobile APIs), whisper.cpp secondary/fallback; tiny tier marked
     development-only with re-benchmark requirement for the production
     tier; TTS/G2P explicitly deferred (split-provider note).

## Verification

- Benchmark run exit 0; both candidates 0 invocation failures;
  results committed under `benchmarks/speech/results/`.
- `./scripts/ci.sh` exit 0 — `ci-2026-10-03.txt`.

## Notes / honesty ledger

- Automatic scoring remains DISABLED (protocol declares no empirically
  justified thresholds); SPEECH-007 calibration data is owner-only and
  still outstanding.
- Vendor binaries/models live outside the repo (`~/.cache/lts-bench`,
  `$LTS_BENCH_VENDOR`); checksums pinned in the run summary.
- CER numbers rank runtimes at one model tier; they are not product
  accuracy and must not be quoted as such.
