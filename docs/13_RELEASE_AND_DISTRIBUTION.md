# 13 — Release and Distribution

## Independent artifacts

Version separately:

1. application engine;
2. language packs;
3. model bundles;
4. optional voice packs.

## Desktop release

Target signed/packaged releases for Linux, Windows, and macOS after platform gates pass. Linux is the primary development reference but not the only 1.0 target.

### Platform status ladder (PLAT-001, owner decisions 2026-10-03 and 2026-10-07, ADR-0015)

Platform status is three-way and is **never inferred from a successful build**:

- **`tested_platforms` — maintainer/owner runtime evidence.** Linux only: CI runs
  the full test suite plus the xvfb desktop smoke (`desktop-smoke` job). This
  field is maintainer-owned; nothing a reporter writes can populate it.
- **`community_confirmed_platforms` — human runtime reports.** A platform is
  confirmed for a specific pack entry when a human who actually ran that build
  files a report in `docs/platform/PLATFORM_REPORTS.yaml` with outcome
  `works`/`works-with-issues`. `langpack catalog --platform-reports …` derives
  the field and refuses the build on any record that is malformed, duplicated,
  or not bound to the exact app build (`app_version` + `app_commit`) and the
  exact archive (`pack_version` + `pack_sha256`). A later `fails` record clears
  the confirmation. Confirmed is **not** tested: the UI and release notes keep
  saying "not tested by us, confirmed by N reporters".
- **`untested_platforms` — everything else.** Windows and macOS today. Per the
  owner's 2026-10-07 decision, builds for those systems **may** be published,
  but they ship labeled untested; CI compile-checks them (`platform-compile`)
  and bundle artifacts are produced so they can be tried, never promoted.

Invalidation: any change to the app build or the pack archive changes the
binding hashes, so prior confirmations stop matching and the platform falls
back to untested. Reporters re-run and re-report.

Promotion of a platform to `tested` requires a maintainer/owner-run runtime pass
(owner gate). Compile checks and reporter traffic never establish it.

### TTS distribution variants (ADR-0009, owner decision 2026-10-04)

Downloads come in two variants, same binary, different staged resources:

- **TTS variant**: ships the offline synthesis payload (sherpa-onnx
  runtime, Kokoro model/voices, espeak-ng-data). The espeak-ng GPL-3.0
  obligations (source offer, component license texts, attribution UI
  entries) are carried for this variant's payload only.
- **Bare variant**: no TTS payload; audio-dependent features degrade
  honestly and never block non-audio practice. Users who reject GPL
  components or want their own synthesis use this variant, optionally
  pointing at a user-supplied local TTS runtime (documented config), or
  installing the TTS payload later as an optional in-app model download
  (TTS-002).

Build mechanics: `scripts/build-tts-variants.sh` stages the payload
(runtime + model + license texts + `NOTICE.md` source offer) and emits
the Tauri config overlay; the bare variant is the default config. The
app resolves TTS in priority order: bundled payload → model-manager
installs (in-app download of the same payload, pinned as directory
catalog entries) → bring-your-own `LTS_TTS_DIR` → development bench
vendor (never shipped). Bring-your-own layout:

```
$LTS_TTS_DIR/sherpa/bin/sherpa-onnx-offline-tts   # any local TTS runtime build
$LTS_TTS_DIR/kokoro/model.onnx                    # + voices.bin, tokens.txt,
                                                  #   espeak-ng-data/ (or your own)
```

When no source resolves, audio features report
`tts-runtime-unavailable` and non-audio practice is unaffected.

Variant builds and their notices are release-gated (REL-001/O-04); the
application's own license remains independent of optional payloads.

### Aligner sidecar payload (ADR-0019, owner decision 2026-10-08)

Speech output has two variants; speech input (constrained alignment
for pronunciation feedback and dictation) is an independent payload
axis on the same binary: **aligner-bundled** or bare. Bare and dev
builds — the default config — carry no aligner runtime and abstain
honestly with `aligner-unavailable`, so the base
`apps/desktop/src-tauri/tauri.conf.json` must stay payload-free on
purpose; a release build opts in through an overlay, the
`scripts/build-tts-variants.sh` pattern.

The release sequence is stage, then overlay, then build with that
overlay:

```
scripts/stage-aligner-sidecar.sh stage    # cmake + network required:
                                          # clone/build the pinned
                                          # runtime, fetch weights
                                          # behind a sha256 gate,
                                          # stage apps/desktop/sidecar/
scripts/stage-aligner-sidecar.sh overlay  # verify every staged payload,
                                          # emit dist/variants/
                                          # tauri.aligner.json
cargo tauri build --config dist/variants/tauri.aligner.json
```

`tauri build` also runs `build.beforeBuildCommand`, which is `pnpm build` —
so the machine doing a release build needs pnpm, or must override the hook
with `-c '{"build":{"beforeBuildCommand":"npx vite build"}}'`. That override
is how the 2026-10-08 verification build was made here (same vite, different
package manager), and CI uses pnpm directly. That run produced a 78.80 MiB
deb and a 180.56 MiB AppImage, payload present inside both at
`usr/lib/open-language-learning-platform/aligner/linux-x64/`, and the
packaged binary walked its 13 routes reporting `aligner:yes:bundled`. Per
ADR-0015 that is an agent run, not the human runtime report a platform
"tested" claim needs.

The payload is `apps/desktop/sidecar/<platform>/`: `bin/`
(whisper-cli plus libwhisper.so.1, libggml.so.0, libggml-cpu.so.0,
libggml-base.so.0, libgomp.so.1 as real bytes, never symlinks),
`model/ggml-tiny.bin`, and `SIDECAR.yaml`. It is generated and
gitignored — `stage` refuses a payload root git could commit — and
never committed, so each staging run regenerates `SIDECAR.yaml`:
per-file sizes and hashes differ per build machine. `verify`
recomputes every declared size and sha256 and rejects symlinks,
missing files, and payload files the manifest does not list.
`overlay` runs that same gate over every staged platform and refuses
to write anything if a payload fails it or the MIT notice file is
missing, and it writes atomically, so a failed run leaves no partial
overlay a build could pick up. The overlay maps each staged platform
dir to bundle resource `aligner/<platform>` plus
`third-party/notices/whisper-cpp-MIT.txt` to
`aligner/LICENSE.whisper-cpp.txt`; the app resolves
`<resource_dir>/aligner/<host platform>/SIDECAR.yaml`.

At runtime the app gates a bundled payload on schema, component,
`built_for`, the declared CPU floor, and every declared file at its
declared size — and then takes one deep pass over the declared sha256
values, the model included, the first time a process touches that
payload (measured 0.05 s warm across the whole 82 MB, so it is paid
once rather than per probe). Declared sizes cannot see same-size
corruption, and weights with a flipped byte still load and return
confident nonsense, which is the worst thing a learning product can
do. That pass is integrity against damage, not a security boundary:
the manifest lives beside the files it attests, so package signing is
what carries authenticity. A payload failing any of these gates reads
as absent — `aligner-unavailable` — rather than running.

Cost: **+82 MB** of install size. Measured on the machine where the
payload was staged, the linux-x64 payload is 82,016,429 bytes — a
4,323,144-byte runtime closure, the 77,691,713-byte `ggml-tiny.bin`
weights, and the 1,572-byte `SIDECAR.yaml`. Those numbers are that
machine's; they are not a reproducible claim across build machines.

The payload has an explicit, host-independent instruction-set floor,
recorded in the manifest as `runtime.requires_cpu`: x86-64-v3
(SSE4.2, F16C, FMA, BMI2, AVX, AVX2; no AVX-512). The floor is a
measurement, not a performance guarantee: at the pinned commit, on
the same 2.2 s Japanese pack sample (2.2175 s of audio), a portable
baseline build took 3.6 s per utterance against 370–397 ms for the
x86-64-v3 build
(about 9×). A CPU below the floor gets `aligner-cpu-unsupported`
instead of a crawling aligner.

Only `linux-x64` is staged. `windows-x64` and macOS builds ship
without an aligner and abstain until that platform has been staged
and reported: no build script emits a `tested_platforms` claim, and
platform status comes only from human runtime reports (ADR-0015).
The staging script is pinned by `scripts/test-stage-aligner-sidecar.sh`
(hermetic: synthetic payload, no network/cmake/cargo), run in CI as
the "Aligner sidecar staging script regression test" step of the
rust job.

**Open packaging question, not a decision:** Tauri takes a single
`--config` overlay. A build that wants both the TTS payload
(`dist/variants/tauri.tts.json`) and the aligner payload
(`dist/variants/tauri.aligner.json`) needs a merged overlay; neither
staging script emits one, and that combination has not been built
here, so no single-command variant with both payloads may be
documented as working today.

## Mobile

Tauri 2 supports Android/iOS targets, but mobile is a separate milestone because microphone permissions, app-store packaging, model memory/storage, background behavior, and native dependencies need validation.

## Web/PWA

A web build may offer reduced-capability learning. Do not weaken privacy promises or force cloud speech solely to claim browser parity.

## Update channels

- stable;
- beta;
- development/nightly.

Reference language-pack updates can ship independently after compatibility validation.

## Model registry

Maintain a signed/verified metadata registry or static catalog describing compatible model bundles. Downloads are resumable and checksummed.

## First-run downloads

Base app should remain reasonably small. Prompt for optional speech/TTS model download only when the user selects capabilities needing them. Display size, privacy/local status, and hardware recommendation.

## Reproducibility

CI should produce checksums, SBOM/dependency reports where practical, release notes, and pack/model manifests.

## Pack audio and archive integrity

A pack may ship generated audio. The committed `media/manifest.jsonl` is the
identity of that audio — hash, size, sample rate, synthesis chain, provenance —
while the `.wav` bytes stay out of git and are regenerated by
`scripts/generate-pack-audio.py` before the archive is built — `scripts/build-catalog.sh`
generates audio ahead of its `langpack build` calls, since an archive built
before synthesis could never carry audio however the media rule is written.

Two distinct cases, deliberately different:

- **Partially built pack:** the manifest contradicts what is present, so
  install-mode validation and `langpack build` both refuse it. An archive can
  never ship a manifest that lies about the bytes inside it.
- **Nothing generated (a fresh checkout):** `build` drops
  `media/manifest.jsonl` from the archive after a loud warning, producing an
  honest **audio-less** archive. Refusing instead would make the pack
  uninstallable from every clean clone and CI machine, which is the path
  onboarding takes; the app simply falls back to on-demand synthesis and no
  feature claims media it was not given. CI therefore runs install-mode pack
  gates only for packs that ship no manifest, and the media integrity rules are
  pinned by `crates/langpack/tests/media.rs` plus the release script.

The app reads audio provenance from the manifest rather than assuming a file in
`media/` is a licensed recording, and resolves a media id through the manifest's
`file` field, so filenames stay pack data. Synthesis is not byte-reproducible: a
regeneration is a pack change (version bump, fresh catalog hashes, and any
platform report bound to the old `pack_sha256` stops confirming), never a no-op.
See `ADR-0016`.

## Release candidate and publication

`REL-001` produces a reviewable release candidate. Distribution to public channels, signing credentials and paid/store accounts require owner authorization. Resolve the source-code/original-content licenses before public redistribution. Mobile, optional AI, web and advanced content do not gate the desktop candidate.

All final audit reports bind to the exact application commit/build configuration, dependency lockfiles, pack hashes, model/provider hashes, review range, platform and hardware tiers. An affected update invalidates its previous evidence and reruns the relevant gates. Publish aggregate benchmark/review evidence without private recordings or reviewer identities.

## Authentic updates and interrupted downloads

Application updates use authenticated signed metadata/artifacts when that update channel exists; checksum-only metadata obtained from the same untrusted location is not publisher authentication. Trusted pack/model catalogs bind source URL, version, license/terms, size and digest to an authenticated catalog record. Third-party unsigned packs remain explicitly lower trust. Signature indicates publisher/integrity, not linguistic correctness.

Downloads stage to temporary storage, enforce length/hash limits, resume safely, support cancel, and activate atomically only after validation. Interrupted/disk-full/invalid-signature downloads keep the last working version. Keys live outside source/pack files; document rotation and recovery. Release-mode artifacts contain no debug driver or elevated test hooks. See the [Tauri updater reference](https://v2.tauri.app/plugin/updater/) when that provider is chosen.
