# ADR-0019: Bundling the whisper.cpp aligner as a staged sidecar payload

## Status

Accepted (owner decision, 2026-10-08: ship the alignment runtime as a bundled
sidecar rather than leaving the desktop build without one).

Date: 2026-10-08

## Context

ADR-0008 chose constrained alignment through an embedded whisper.cpp
subprocess, but only as a *prototype*: `WhisperConstrainedAligner` shells out
to a `whisper-cli` binary, and until now that binary was resolved only from a
development tree (`$LTS_BENCH_VENDOR/whisper.cpp/build/bin/whisper-cli` or
`~/.cache/lts-bench/...`). A shipped desktop build therefore contains the
aligner *code* and no aligner *runtime*: pronunciation feedback and dictation
silently abstain with `aligner-unavailable` on every user machine, which is
kanban item D4.

Two properties make this a distribution decision rather than a build detail:

- the runtime is third-party compiled code, so it carries licence and
  provenance obligations (ADR-0009 precedent for payload-scoped notices);
- compiled binaries are CPU- and OS-specific, so "it runs" is a per-platform
  and per-microarchitecture claim (ADR-0015: platform status comes only from
  human runtime reports, never from a build script).

Measured before deciding, on the same pinned commit and the same 2.2 s pack
sample (`languages/ja-JP/media/ja.sent.drink-coffee.wav`, 2.2175 s of audio):

| build | instruction set | wall time |
|---|---|---|
| `-DGGML_NATIVE=OFF`, default levels | baseline x86-64 | 3.6 s |
| `-DGGML_NATIVE=OFF` plus explicit SSE4.2/F16C/FMA/BMI2/AVX/AVX2 | x86-64-v3 | 370–397 ms |

A portable build is roughly nine times slower, which turns "available" into
"technically present, unusably slow". `objdump -d bin/libggml-cpu.so.0`
confirms the shipped library: 14,833 AVX (`%ymm`) instructions, 0 AVX-512
(`%zmm`).

## Decision

Ship the aligner as a **staged, hash-pinned, gitignored sidecar payload** that
a release build stages into resources, mirroring the ADR-0009 TTS variant
pattern rather than adding payload paths to the base Tauri config.

1. **Staging**: `scripts/stage-aligner-sidecar.sh` clones whisper.cpp at a
   pinned ref, builds `whisper-cli` with portable cmake flags, downloads the
   weights behind a sha256 gate, copies the real bytes (not symlinks) under
   their SONAME names, writes a `SIDECAR.yaml` manifest, and only then moves
   the payload into place. `verify` re-checks declared sizes and hashes.
2. **Pinned versions**: whisper.cpp (now `ggml-org/whisper.cpp`)
   `60c0be6ac8fa71b1a2ae2dd938a31a34a508e774`, reported version 1.9.4
   (ggml 0.25.1), MIT. Weights `ggml-tiny.bin`, 77,691,713 bytes,
   sha256 `be07e048e1e599ad46341c8d2a135645097a538221678b7acdd1b1919c6e1b21`,
   from `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin`.
3. **Explicit instruction set**: `-DGGML_NATIVE=OFF` is *not* a plain x86-64
   build at this ref — ggml's `INS_ENB` defaults keep SSE4.2/F16C/FMA/BMI2/
   AVX/AVX2 on (`ggml/CMakeLists.txt:141-158`). Every level is therefore
   passed explicitly so the ISA is identical on any build machine, and the
   requirement string (`x86-64-v3 (SSE4.2, F16C, FMA, BMI2, AVX, AVX2; no
   AVX-512)`) is recorded in the manifest as `runtime.requires_cpu`.
4. **Runtime gate**: `crates/speech-runtime/src/sidecar.rs` refuses a payload
   whose schema, component, `built_for` platform, CPU requirement, or declared
   files (missing / wrong size / symlink / path-escaping) do not check out.
   The desktop takes one further deep pass — recomputing every declared sha256,
   the model included — once per payload per process (measured 0.05 s warm over
   the whole 82,016,429 B payload, so it is paid once rather than per probe).
   Declared sizes cannot see same-size corruption, and a weights file with a
   flipped byte still loads and returns confident nonsense, which is the worst
   failure mode a learning product has. That pass is integrity against damage,
   not a security boundary: the manifest sits beside the files it attests, so
   package signing is what carries authenticity. A rejected payload never runs;
   the aligner falls back or abstains.
5. **Honest abstention**: a CPU below the compiled-for floor is reported as
   `aligner-cpu-unsupported`, distinct from `aligner-unavailable` (no payload)
   and `speech-model-off` (user opted out), and the UI copy says the build
   carries the runtime but this machine is below its instruction floor. Per
   docs/18 an abstention must say the thing that is true.
6. **No capability claims in the manifest**: the payload manifest has no
   `tested_platforms` field, per ADR-0015. Only `linux-x64` is staged today;
   Windows and macOS ship without the payload and abstain until a human
   reports a runtime.
7. **Sizing**: 82,016,429 bytes total on the machine that staged it — a
   4,323,144-byte runtime closure, the 77,691,713-byte weights, and the
   1,572-byte manifest. Staged payload bytes and their hashes are never
   committed, and they are not identical across build machines.

## Consequences

- The Linux desktop variant gains working pronunciation feedback and dictation
  out of the box, at +82 MB install size. Staging needs cmake and network
  access at build time; a release build regenerates `SIDECAR.yaml` because the
  payload bytes are not byte-reproducible across build machines (two builds
  on the same machine produced identical sizes with different sha256), for the
  same reason ADR-0016 treats synthesis as non-reproducible.
- Machines below x86-64-v3 do not get a crawling aligner; they get an explicit
  abstention and every other practice mode keeps working.
- The subprocess boundary is kept deliberately: the runtime is out-of-process,
  so a whisper.cpp crash degrades one exercise instead of the app, and the
  app never loads third-party code into its own address space.
- Payload libraries carry a build-machine RUNPATH, so the aligner child is
  launched with `LD_LIBRARY_PATH` pointed at the payload's own `bin/`
  (`apply_runtime_env`); `libgomp.so.1` is bundled because the build links it.
- Alignment remains what ADR-0008 and ADR-0017 said it is: guided feedback
  from a text-match ratio, never a pronunciation accuracy claim.
- Windows and macOS sidecars are open work items: they need a staging run on
  (or for) that platform plus a human runtime report before the platform
  ladder may call them working.

## Alternatives considered

- **Download the runtime on demand through the model manager.** Rejected: the
  model manager is a *weights* channel with a privacy notice and an
  offline-first contract, the master spec treats third-party content as
  untrusted data, and shipping an executable the user must fetch before the
  feature exists reproduces D4 for every offline user.
- **Bundle a baseline x86-64 build with no CPU floor.** Rejected on the
  measurement above: nine times slower, and the manifest would then assert a
  capability the machine can barely deliver.
- **Link whisper.cpp into the app (`whisper-rs` / static lib).** Rejected: the
  cmake dependency does not disappear, the app's build matrix grows, and a
  crash in third-party inference would take the process with it.
- **Leave the desktop payload-less and document the dev tree as a prerequisite.**
  Rejected: that makes pronunciation feedback unavailable to every shipped
  install and leaves D4 open.
