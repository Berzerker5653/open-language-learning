# PERF-001 — Speech/TTS performance tier measurement (Omarchy)

Card: K-55. Purpose: measure this machine's speech/TTS tier so `docs/performance/BUDGETS.yaml` can later be frozen against real evidence. This file records measurements only; it does NOT freeze budgets (that requires a separate ADR).

## Environment

Measured 2026-10-08 on the Omarchy machine (this workspace's host). Idle load at measurement time: load average 0.00/0.02/0.43.

- **OS**: Omarchy 4.0.4 (Arch Linux based, ID_LIKE=arch), BUILD_ID 4.0.4
- **Kernel**: Linux 7.2.5-3-omarchy x86_64
- **CPU**: AMD Ryzen AI Max+ 395 w/ Radeon 8060S (Strix Halo), family 26, model 112, stepping 0
  - 16 cores / 32 threads, 1 socket, SMT2
  - Min/max MHz: 625 / 5187.5 (frequency boost enabled)
  - Scaling governor (cpu0): `performance`
  - Caches: L1d 768 KiB (16×), L1i 512 KiB (16×), L2 16 MiB (16×), L3 64 MiB (2 instances)
  - SIMD (from /proc/cpuinfo): avx, avx2, avx512f, avx512dq, avx512ifma, avx512cd, avx512bw, avx512vl, avx512_bf16, avx512_vbmi2, avx512_vnni, avx_vnni, fma, f16c (full AVX-512 set)
- **Memory**: 62 GiB total, ~46 GiB available at check time; 124 GiB swap (0 used)
- **GPU**: AMD Strix Halo iGPU — `lspci`: `c5:00.0 Display controller: AMD/ATI Strix Halo [Radeon Graphics / Radeon 8050S / Radeon 8060S] (rev c1)`
- **Discrete NVIDIA GPU**: none (`nvidia-smi -L` → no devices; command absent/failed)
- NUMA: single node (0-31)

Commands used: `lscpu`, `free -g`, `cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor`, `nvidia-smi -L`, `lspci | grep -i -E 'vga|3d|display'`, `uname -srm`, `/etc/os-release`, `/proc/cpuinfo` flags, `uptime`.

## Results

Protocol/inputs are harness defaults: asr-0.1.0, dataset `ja-onramp-synth-0.1.0` (12 utterances), trials=3 per utterance (first trial counted as cold), sherpa `--num-threads=4`, whisper.cpp default 4 threads, CPU backend. Idle machine (loadavg 0.00/0.02/0.43), governor `performance`.

### ASR — `tiny` size (run_id 20261008T145857Z)

Command: `python3 benchmarks/speech/harness/run_bench.py --out state/evidence/PERF-001/asr-tiny`

Raw output: `state/evidence/PERF-001/asr-tiny/summary.json` (+ `raw/*.json`). Total wall time 16.6 s for both candidates.

| candidate | model | cold_load_ms | warm p50_ms | warm p95_ms | RTF median | peak RSS ΔMB | model disk MB | cer_mean | failures |
|---|---|---|---|---|---|---|---|---|---|
| whisper.cpp | ggml-tiny | 182.8 | 201.3 | 214.7 | 0.155 | 180.3 | 77.7 | 0.6037 | 0 |
| sherpa-onnx | whisper-tiny-onnx | 239.4 | 254.2 | 284.0 | 0.200 | 96.5 | 152.2 | 0.5300 | 0 |

Weight identity verified: ggml-tiny.bin sha256 `be07e048e1e5…` matches the 2026-10-03 baseline weights.

### ASR — `base` size (run_id 20261008T145939Z)

The harness hardcodes tiny filenames and has no size flag; `benchmarks/**` sources were not edited. Instead the run used a staging vendor dir (`/tmp/lts-bench-base-stage`, symlinks only) with `LTS_BENCH_VENDOR` pointing at it, so the tiny-named paths resolve to the real **base** weights. Same binaries, protocol, dataset, thread counts.

Command: `LTS_BENCH_VENDOR=/tmp/lts-bench-base-stage python3 benchmarks/speech/harness/run_bench.py --out state/evidence/PERF-001/asr-base`

Raw output: `state/evidence/PERF-001/asr-base/summary.json` (+ `raw/*.json`). Total wall time 30.2 s. The summary labels these rows "ggml-tiny"/"whisper-tiny-onnx" — that is the harness's hardcoded label; the recorded model hashes (`ggml` `60ed5bc3dd14…` = ggml-base.bin; ONNX `5a6b87cb…`/`8a12c3f6…` = base-encoder/decoder.onnx, verified against `sha256sum`) and model_disk (148.0 / 291.6 MB) prove base weights.

| candidate | model (actual weights) | cold_load_ms | warm p50_ms | warm p95_ms | RTF median | peak RSS ΔMB | model disk MB | cer_mean | failures |
|---|---|---|---|---|---|---|---|---|---|
| whisper.cpp | ggml-base | 376.5 | 399.9 | 415.9 | 0.307 | 288.1 | 148.0 | 0.4493 | 0 |
| sherpa-onnx | whisper-base-onnx | 390.0 | 436.5 | 474.9 | 0.325 | 218.8 | 291.6 | 0.4524 | 0 |

### TTS — kokoro (protocol tts-0.1.0, run stamp 20261008T150029Z)

The TTS harness has no whisper size (TTS uses kokoro, not whisper) and no `--out` flag; it writes its run dir under `benchmarks/speech/results/` by design. It was run unmodified; only `summary.json` was copied here and the generated run dir (12 wavs + summary) was deleted again, per this job's file-creation limits. One synthesis per phrase, fresh process per phrase (so every wall time includes model load — no warm trial exists).

Command: `python3 benchmarks/speech/harness/run_tts_bench.py`

Raw output: `state/evidence/PERF-001/tts-20261008T150029Z-summary.json`. Total wall 11.6 s.

| metric | value |
|---|---|
| wall p50 | 0.902 s |
| wall max | 1.320 s (t10, "ゆっくり 話してください") |
| RTF p50 | 0.718 |
| RTF range | 0.589 – 0.786 |
| per-phrase wall | 0.846 – 1.320 s (all 12 phrases) |

## Comparison vs 2026-10-03 baselines

Baseline files: `state/evidence/SPEECH-001/bench-summary-2026-10-03.json` (asr-0.1.0, run 20261003T071328Z) and `benchmarks/speech/results/20261003T075830Z/summary.json` (tts-0.1.0). The ASR baseline machine was the ref-dev box (Linux 7.2.8-1-cachyos, 32 threads, x86-64-v3); this machine adds full AVX-512/VNNI and much higher single-thread clocks, so deltas are cross-machine.

ASR `tiny` (same weights verified: ggml sha `be07e048…`):

| candidate | metric | baseline | this machine | delta |
|---|---|---|---|---|
| whisper.cpp | warm p50 ms | 336.8 | 201.3 | −40.2% |
| whisper.cpp | warm p95 ms | 431.7 | 214.7 | −50.3% |
| whisper.cpp | cold load ms | 303.2 | 182.8 | −39.7% |
| whisper.cpp | RTF | 0.273 | 0.155 | −43.2% |
| whisper.cpp | RSS ΔMB | 180.4 | 180.3 | ≈0 |
| whisper.cpp | cer_mean | 0.5929 | 0.6037 | +0.011 abs |
| sherpa-onnx | warm p50 ms | 430.1 | 254.2 | −40.9% |
| sherpa-onnx | warm p95 ms | 491.6 | 284.0 | −42.2% |
| sherpa-onnx | cold load ms | 382.2 | 239.4 | −37.4% |
| sherpa-onnx | RTF | 0.322 | 0.200 | −37.9% |
| sherpa-onnx | RSS ΔMB | 96.1 | 96.5 | +0.4% |
| sherpa-onnx | cer_mean | 0.4744 | 0.5300 | +0.056 abs |

Latency dropped ~37–50% on every timing metric. CER moved slightly despite byte-identical ggml weights — different SIMD kernel selection (AVX-512 here vs x86-64-v3 there) changes logits, so transcripts differ a little. That is a kernel effect, not a regression.

ASR `base`: **no baseline exists** (2026-10-03 measured tiny only); nothing to diff.

TTS:

| metric | baseline (20261003T075830Z) | this machine | delta |
|---|---|---|---|
| wall p50 | 1.784 s | 0.902 s | −49.4% |
| RTF p50 | 1.428 | 0.718 | −49.7% |

## What this tier can support

Tier classification: 16c/32t and 62 GB RAM exceed the `typical` tier class (8 cores, 16 GB), but there is **no CUDA-capable discrete GPU**, so this machine does **not** qualify as `high`. These numbers describe an above-typical CPU-only machine; they do not prove a nominal typical-class device meets the budgets.

Satisfied by these measurements (typical-tier lines):
- `speech.asr_short_utterance_warm_ms` (typical p50 500 / p95 1500): all four ASR rows pass with large margin — worst p50 436.5 ms, worst p95 474.9 ms (whisper.cpp and sherpa-onnx, tiny and base).
- `speech.asr_cold_model_load_ms` (typical p95 5000): worst measured cold load 390 ms.
- `speech.real_time_factor_max` (typical 0.5): ASR only — tiny 0.155/0.200, base 0.307/0.325. TTS fails it (0.718 > 0.5; would pass the `low` line of 1.0).
- `memory.total_with_compact_model_mb` (typical 1500): only partially supported — provider RSS deltas (tiny 180.3/96.5 MB, base 288.1/218.8 MB) leave ample room, but the app's base RSS was not measured, so the total cannot be asserted.

Not satisfied by the measured (cold-process) TTS number:
- `speech.tts_short_phrase_warm_ms` typical p50 300 / p95 1000: measured p50 902 ms, p95 ≈1114 ms — fails both. `low` (600/2000): p50 fails, p95 passes. Caveat: the TTS harness never measures warm/resident synthesis, so the *warm* line is not strictly tested; every measured number includes model load. A warm TTS measurement is needed before concluding kokoro fails this line.

Untestable/unmeasured on this run (budget lines get no evidence here):
- `app.*` entirely (startup, session_plan, ui_responsiveness, cancellation) — no app under test in these harnesses.
- `speech.vad_quality_gate_2s_clip_ms`, `speech.alignment_plus_features_ms` — not exercised by either harness.
- `memory.app_rss_base_mb`, `memory.gpu_vram_with_recommended_model_mb` — no CUDA device present; `high` tier cannot be characterized here at all.
- `disk.*` bundle lines — bundle composition not measured.
- Protocol deviations from BUDGETS §protocol: trials=3 (harness default, matches the 2026-10-03 baseline) not 20; p95 from 11 warm samples.

Still unmeasured overall: a real `low`-tier device (4c/8t, 8 GB); whisper `small`/`large` sizes (weights exist in the vendor cache but were excluded from scope); GPU/CUDA paths; warm/resident-process TTS; and the 20-trial cold/warm protocol BUDGETS specifies. Freezing any of this against BUDGETS.yaml still requires the separate ADR — not done and not touched here.
