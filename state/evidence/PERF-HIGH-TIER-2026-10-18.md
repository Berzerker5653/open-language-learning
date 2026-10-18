# The `high` performance tier: what the decision actually is (2026-10-18)

Owner question: *"I'm not sure what it is you are asking me with regards to the high
tier perf question."* This file answers it with the measurement behind each claim, so
the choice can be made without re-reading the release machinery.

## 1. What the tiers are

`docs/performance/BUDGETS.yaml:19-49` declares four named machine tiers. The file is
not a set of measurements — `status: provisional`, `frozen: false` (`:9-10`), and
`:2-7` says plainly: *"These numbers are engineering targets chosen from docs/05 …
NOT measured baselines."*

| tier | declared hardware (`BUDGETS.yaml`) | measured? | where / when |
| --- | --- | --- | --- |
| `ref-dev` (`:20-27`) | Ryzen 9 5950X 16c/32t, 128 GB, **RTX 5090 32 GB**, NVMe, `pinned: true`, "development-and-baseline-spikes-only — not a support target" | baseline spikes only | this host; the tier row *is* GamingPC |
| `low` (`:28-35`) | 4c/8t x86-64, 8 GB RAM, integrated graphics, SATA SSD | **no** | no lab machine matches it |
| `typical` (`:36-42`) | 8 physical cores / 16 GB, integrated or entry discrete | **yes** | `state/evidence/PERF-001/tier-omarchy-2026-10-08.md` (2026-10-08) |
| `high` (`:43-49`) | 16+ cores, 32 GB, **"discrete GPU with >= 12 GB VRAM, CUDA-capable"** | **no** | — |

Freezing the budgets — which is what makes them pass/fail gates — requires baseline
provider spikes **on the named tiers** plus an ADR recording the provider/model per
tier (`:11-14`). That, not hardware, is what holds `PERF-002` open.

## 2. What is measured and what is not

- Only `typical` has a real measurement, taken on Omarchy on 2026-10-08.
- A stale line in the board (`K-55`) said there is no CUDA device. It is wrong today.
  Measured on GamingPC, 2026-10-18:

  ```
  NVIDIA GeForce RTX 5090, 32607 MiB, driver 615.78.08
  /opt/cuda/bin/nvcc  Build cuda_13.4.r13.4/compiler.38855100_0
  ```

  So by its own definition (`:43-49`) GamingPC satisfies `high` (16c/32t, 128 GB,
  32 GB VRAM CUDA GPU, NVMe). **Hardware is not the blocker.**
- The real blocker is the shipped speech aligner. The pinned payload
  `apps/desktop/sidecar/linux-x64/SIDECAR.yaml` is CPU-only by construction:

  ```
  build_flags: -DGGML_NATIVE=OFF -DGGML_SSE42=ON -DGGML_F16C=ON -DGGML_FMA=ON
               -DGGML_BMI2=ON -DGGML_AVX=ON -DGGML_AVX2=ON -DGGML_AVX512=OFF …  (:11, no -DGGML_CUDA=ON)
  requires_cpu: x86-64-v3 …                                                    (:12)
  files: bin/whisper-cli, libwhisper, libggml, libggml-cpu, libggml-base, libgomp (:13-31)
  model: ggml-tiny, 77,691,713 B                                               (:32-37)
  ```

  Measured on disk: `apps/desktop/sidecar/linux-x64/bin/` contains `libggml-cpu.so.0`
  and no `libggml-cuda*`. So on a `high` machine the aligner would run on the CPU.
  "Accelerated-tier" (`:44`) currently describes the *machine*, not anything the app
  accelerates.

## 3. The three honest options

**A — Build the aligner with CUDA, then measure `high` on GamingPC.**
`scripts/stage-aligner-sidecar.sh stage` with `-DGGML_CUDA=ON` added to the cmake
invocation. Consequences: `SIDECAR.yaml` is rewritten with new sha256s and byte
counts for every file, a new `libggml-cuda.so` (and usually a large CUDA runtime
dependency set), docs/13's payload section and the aligner ADR need updating, and the
downloadable aligner builds grow — README today advertises 84 MB / 145 MB for the
aligner variants, and a CUDA build is far larger (`INFERENCE`: order of hundreds of
MB, dominated by the CUDA runtime, not by whisper.cpp itself). This is a product
decision because it trades download size and install time — the very thing I05
complains about — for speed nobody has measured yet. Effort: one staging run plus a
payload re-pin commit plus a docs/ADR update; the measurement itself is then a
PERF-002 protocol run (`protocol:` at `:54-63`, 20 warm + 3 cold per bucket).

**B — Declare `high` out of scope for desktop 1.0.**
Record it where the release contract lives: `docs/13` (release gates), `PERF-002` in
`tasks/ROADMAP.yaml`, and a line in `BUDGETS.yaml` saying which tiers gate desktop
1.0. Then `high` stays an aspirational row, honestly labelled, and nothing pretends
GPU acceleration exists. Repo rule (`AGENTS.md` documentation requirements: supported
platforms) makes that a docs change, and freezing the budgets later still needs the
ADR (`:11-14`).

**C — Measure `high` CPU-only and say so.**
GamingPC already matches the tier row on cores/RAM/disk. Running the `typical`
protocol there costs one measurement session and no payload change, and the record
says: measured on CUDA-capable hardware, with the shipped CPU-only aligner, so the
tier currently buys CPU headroom only. Option A can come later without invalidating
this. It does not require any pin change.

## 4. What none of the options fixes

The `low` tier (`:28-35`) has no machine anywhere in the lab: it wants a 4-core/8-thread
x86-64 with 8 GB RAM and a SATA SSD. GamingPC (16c/32t, 128 GB) and Omarchy and Hermes
worker all overshoot it. Measuring `low` means borrowing or buying a modest laptop, or
narrowing that tier — and narrowing it is a *supported-hardware* decision, which is the
owner's alone.

## 5. The one question

For desktop 1.0, should the `high` tier mean **(A)** a GPU-enabled aligner shipped in
the download, **(B)** an explicitly out-of-scope tier, or **(C)** a measured CPU-only
row that says plainly the app does not use the GPU yet? My read: **C now, A only if a
measured `typical`-tier latency failure justifies the download cost** — because
pack-install size and first-run time are already the documented complaint (I05), and
shipping hundreds of MB of CUDA runtime to fix an unmeasured problem would be the
wrong order.
