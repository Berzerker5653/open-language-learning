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

Linux desktop renders through WebKitGTK's DMABUF/GBM path: on the proprietary NVIDIA
driver and under Xvfb it fails (`Failed to create GBM buffer of size WxH: Invalid argument`,
blank window). The binary forces `WEBKIT_DISABLE_DMABUF_RENDERER=1` itself unless the operator
already set it (`=0` asks for the accelerated path back); the xvfb `desktop-smoke` job rides it.

### Single app package (ADR-0024, owner decision 2026-10-10)

There is one app package. The TTS-bundled versus bare variant axis of
ADR-0009 is retired: no staged TTS payload, no
`scripts/build-tts-variants.sh`, no `dist/variants/tauri.tts.json`
overlay, no bring-your-own `LTS_TTS_DIR`, and no optional in-app
synthesis-model download. The app performs no speech synthesis at read
time; every clip a learner hears is baked language-pack media
(ADR-0016/ADR-0023, docs/05).

The shipped payload no longer carries the sherpa-onnx TTS runtime, the
Kokoro model/voices, or espeak-ng-data, and the model catalog's two
synthesis entries (`org.openlanguage.speech.kokoro-multi-lang`,
`org.openlanguage.speech.sherpa-onnx-runtime`) are gone; the catalog
keeps recognition entries only (`whisper-ggml` tiny/base/small and
`sherpa-whisper-tiny`). That takes roughly 400 MB off the app download;
language packs are unchanged in size. Because the app ships no GPL
payload, the espeak-ng GPL-3.0 obligations ADR-0009 carried
payload-scoped for the TTS variant — source offer, component license
texts, attribution UI entries — retire, and no GPL source offer ships
with the app; `third-party/notices/NOTICE.md` keeps the Kokoro/espeak-ng
history in a clearly-labeled build-time-tooling section and credits the
ADR-0023 bake engine. The application's own license
remains independent.

A user who installed the old synthesis payloads keeps them as dead
bytes: the catalog no longer names them, so they are never read,
updated, or removed automatically.

### Aligner sidecar payload (ADR-0019, owner decision 2026-10-08)

Speech input (constrained alignment for pronunciation feedback and
dictation) is a payload axis on the one binary (ADR-0024):
**aligner-bundled** or bare. Bare and dev builds — the default config —
carry no aligner runtime and abstain honestly with
`aligner-unavailable`, so the base
`apps/desktop/src-tauri/tauri.conf.json` must stay payload-free on
purpose; a release build opts in through the overlay emitted by
`scripts/stage-aligner-sidecar.sh overlay`.

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
pnpm --filter @openlang/desktop exec tauri build \
  --config dist/variants/tauri.aligner.json
```

`tauri build` also runs `build.beforeBuildCommand`, which is `pnpm build` —
so the machine doing a release build needs pnpm, or must override the hook
with `-c '{"build":{"beforeBuildCommand":"npx vite build"}}'`. `npx tauri`
only resolves inside `apps/desktop`, and from there the config path becomes
`../../dist/variants/tauri.aligner.json`. That override
is how the 2026-10-08 verification build was made here (same vite, different
package manager), and CI uses pnpm directly. That run produced a 78.80 MiB
deb and a 180.56 MiB AppImage, payload present inside both at
`usr/lib/open-language-learning-platform/aligner/linux-x64/`, and the
packaged binary walked its 13 routes reporting `aligner:yes:bundled`. Per
ADR-0015 that is an agent run, not the human runtime report a platform
"tested" claim needs.

The same packaging pass surfaced the **content** half of the defect
(K-59): `bundled_packs()` resolved pack candidates through the
compile-time `CARGO_MANIFEST_DIR`, and the verification binary embeds the
absolute build directory of whatever machine compiled it (`…/apps/desktop/src-tauri`) next to
`languages/ja-JP` — so the deb carried the aligner payload but could only
find a language pack on the machine whose tree built it. The base config
carries no pack resources on purpose; the published-catalog path is the live
content route instead (ADR-0027): a build with no `LTS_PACK_CATALOG_URL` falls
back to this repository's `catalog/packs.json` on `raw.githubusercontent.com`,
and an explicit value — including an empty one — still overrides it. The
owner's 2026-10-08 decision is the merged
resources-overlay route: the pack-bundled content variant below. The
The merged bundle build has since been run (2026-10-08): deb
337.55 MiB, AppImage 428.91 MiB, and the deb's extraction was inspected
byte-for-byte for the sidecar mapping. A second-machine run followed on
2026-10-09 (Omarchy, no repo tree): the AppImage initially died because
it bundles `libwebkit2gtk`/`libjavascriptcoregtk` from this machine's
local `~/.wk41` build, whose helper-process paths are baked in — with
those two libs removed in favor of the system WebKit the app rendered
and the preload-trace proof fired: the packaged binary opened
`packs/BUNDLED.yaml` from its own resources (fd 33, no abstain path).
That AppImage defect (card K-59-follow) is now fixed by a finalize step:
`scripts/finalize-appimage.sh` drops those two libraries from the AppDir
and repacks via linuxdeploy with `--exclude-library`, so the AppImage
uses the target's system webkit2gtk-4.1 — the same runtime dependency
the deb has always declared. Re-run on 2026-10-09: 403,438,072 B
AppImage, zero bundled WebKit files, sidecar and 356 MB pack payload
intact; regression pinned by `scripts/test-finalize-appimage.sh`.
ADR-0015 platform status for the variant still awaits a human runtime
report.

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

### Pack-bundled content variant (K-59, owner decision 2026-10-08)

The third variant makes a release bundle self-contained for **content**:
it embeds the reference pack AND the whisper sidecar in one artifact, so
the artifact is testable on a machine with no repo tree. Building it is
stage, then overlay, then build with BOTH overlays — Tauri
JSON-merge-patches each `--config` over the base config and over the
other overlays, so the two `bundle.resources` maps compose:

```
scripts/generate-pack-audio.py            # languages/ja-JP only: a fresh
                                          # checkout refuses install-mode
                                          # validation with media_unbuilt
                                          # (committed manifest, gitignored
                                          # .wav bytes — ADR-0016)
scripts/stage-pack-bundle.sh stage        # validate --mode install, refuse
                                          # on any error, then copy the pack
                                          # source dir into dist/variants/
                                          # packs/resources/packs/<pack-id>
scripts/stage-pack-bundle.sh overlay      # re-validate every staged pack,
                                          # emit dist/variants/
                                          # tauri.pack.json
scripts/stage-aligner-sidecar.sh stage && scripts/stage-aligner-sidecar.sh overlay
cargo tauri build --config dist/variants/tauri.pack.json \
  --config dist/variants/tauri.aligner.json
```

Pack resources exist **only** in builds that pass the pack overlay: the
base `tauri.conf.json` stays payload-free on purpose and bare/dev builds
keep abstaining honestly. `stage` refuses to stage anything its
`validate --mode install` gate rejects (installable gate, incl. the
ADR-0016 media pairing and ADR-0024 media coverage gates); it is idempotent — a re-run verifies and
keeps. `overlay` re-runs the same gate over the staged copies, refuses
when nothing is staged, and writes atomically (temp + mv), so a failed
run leaves no partial overlay a build could pick up. The staged root is
under `dist/` (gitignored); `stage` refuses roots git cannot prove
ignored.

Runtime resolution contract (implemented by the companion K-59 change in
`apps/desktop/src-tauri/src/lib.rs`, not by the staging script; this row
is the contract both sides quote):

| Build variant | bundle pack resources | runtime pack resolution |
| --- | --- | --- |
| bare / dev (base config, default) | none | today's behavior unchanged |
| pack-bundled (tauri.pack.json overlay) | `packs/<pack-id>/` under the resource dir, named by `packs/BUNDLED.yaml` (`schema_version: 1`; pack_id/locale/maturity per entry, written by `stage`) | at startup `BUNDLED_PACKS: OnceLock<PathBuf>` is set from `app.path().resource_dir().join("packs")` (same pattern as `BUNDLED_SIDECAR`); `bundled_packs()` prefers the repo tree when present (dev), else reads the sidecar and its `<pack-id>/` directories and fails closed — a missing, unparsable, wrong-version, or dangling sidecar yields no candidates and the app never guesses a locale or maturity; a bare build without the resource dir keeps today's behavior |

Evidence state, stated honestly: the staging/overlay scripts are pinned
by `scripts/test-stage-pack-bundle.sh` (hermetic: broken pack refused,
valid fixture staged, overlay JSON gate, idempotent re-stage, refusal
with nothing staged), run as the "Pack bundle staging script regression
The merged bundle build has been run here (deb 337.55 MiB, AppImage
428.91 MiB) and the packaged binary was proven on a second machine
(Omarchy, no repo tree): it opened `packs/BUNDLED.yaml` from its own
resources — full write-up in `state/evidence/K59-omarchy-2026-10-09/`.
The AppImage carries an unrelated webkit-bundling defect (K-59-follow).
Per ADR-0015 platform status still comes only from human runtime reports.
It interacts with
K-68: baking lexicon audio into the pack grows the embedded payload;
the size consequences belong to that card, measured rather than guessed.

**Packaging question, resolved:** multiple `--config` overlays merge,
which is what the pack+aligner route above relies on, and the merged
bundle builds (2026-10-08/09) ran with exactly those two overlays.
ADR-0024 retired the synthesis overlay (`dist/variants/tauri.tts.json`
no longer exists), so pack+aligner is the complete overlay set and no
TTS-carrying combination remains to verify.

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

Base app should remain reasonably small. Prompt for optional speech-recognition model downloads only when the user selects capabilities needing them (ADR-0024 removed synthesis from the catalog). Display size, privacy/local status, and hardware recommendation.

## Reproducibility

CI should produce checksums, SBOM/dependency reports where practical, release notes, and pack/model manifests.

## Pack audio and archive integrity

A pack may ship generated audio. The committed `media/manifest.jsonl` is the
identity of that audio — hash, size, sample rate, synthesis chain, provenance —
while the `.wav` bytes stay out of git and are regenerated by
`scripts/generate-pack-audio.py` before the archive is built — `scripts/build-catalog.sh`
generates audio ahead of its `langpack build` calls, since an archive built
before synthesis could never carry audio.

Content coverage is a hard release gate (ADR-0024): every published pack
must pass install-mode `audit_media` media coverage, whose enumeration
of audio-addressable items (sentences, contrast items, script-tagged
lexicon entries) mirrors `scripts/generate-pack-audio.py` `targets()`.
Every item needs a manifest row **and** its wav, or install and
`langpack build` both refuse the pack:

- `media_asset_missing` — aggregated Error in every mode (first 8 ids
  named): a built or partially built manifest leaves addressable items
  uncovered, and nothing synthesizes at read time to cover them.
- `media_missing` — Error per item: a row is declared, its wav is
  absent while others are present (partial media build).
- `media_manifest_absent` / `media_unbuilt` — Error when media is
  expected (install/build), Info in a source checkout, where the `.wav`
  bytes stay gitignored.

The audio-less archive that `build` once emitted after a loud warning
is gone: with no runtime synthesis an uncovered item is permanent
silence, so failing the gate loudly at build/install is the honest
shape. Consequence: a pack can only publish after its bake has run. Both
reference packs were baked with 4,894 (ja-JP) and 4,846 (ru-RU) manifest rows
on 2026-10-13, which is what their published 0.4.0 archives carry.
A fresh checkout has the manifests **without** the gitignored `.wav` bytes, and
that is not a cosmetic gap: measured on the public repo 2026-10-13 (run
`38432671203`), `cargo test --workspace` fails 8 desktop tests that install the
reference pack and `scripts/smoke-desktop.sh` fails outright, because
`lts_langpack::archive::build` refuses to emit a silent archive
(`crates/langpack/src/archive.rs:97`).
Those tests pass locally only because untracked baked audio sits in the working
tree. `scripts/fetch-pack-audio.sh` closes the gap without putting 634 MB into
git: it reads `pack_id`+`version` from the pack's own `manifest.yaml`, resolves
that entry in `catalog/packs.json`, downloads the published `.lpk`, refuses any
archive whose size or sha256 differs from the pin (including a cached one),
unpacks it **through the langpack install gate** into a throwaway store, copies
only the files the tracked manifest names, then verifies every row — file
present, sha256 equal, byte length equal — naming offending ids and exiting
non-zero. `--verify-only` runs just that audit, offline and without cargo. A pack
version that has not been published yet fails with a message saying its archive
must be published first, which is the honest ordering: bake → publish → restore.
CI (`rust`, `desktop-smoke`) now restores both reference packs before the steps
that need them, caching the archives by `hashFiles('catalog/packs.json')` and
re-verifying on every cache hit, and because the audio is now present CI also
runs install-mode `test` for both packs instead of skipping it. Measured on this
tree: `--verify-only` reports `rows checked=4902 … rows failing=0` for ja-JP and
`rows checked=4856 … rows failing=0` for ru-RU (2026-10-14). A contributor needs
one command per pack before `cargo test --workspace`. The pairing itself stays
enforced on the
release path (`scripts/build-catalog.sh` bakes, then builds) and pinned by
`crates/langpack/tests/media.rs`.

The tree can also run **ahead** of a published archive, and the same step says
so: after the 2026-10-14 content-depth batch, the manifests declare 4,902 ja-JP
and 4,856 ru-RU rows while the pinned 0.4.0 archives carry 4,894 and 4,846, and
CI (`rust`, `desktop-smoke`) failed the restore with the eighteen unmatched ids
named (`the archive carries no ja.sent.office-notice-time.wav matching the
manifest row`). Refusing is correct — the alternative is a checkout whose
listening items have no audio. ADR-0032 (Proposed) records the temporary
answer: those 18 journey assets are tracked in git by name, bounded and
enumerated in `.gitignore`, until the owner republishes both packs at a version
whose archive covers them, at which point the tracked files and the negations
are deleted and ADR-0024's rule stands alone. Republishing is an owner action
(`docs/15` scope rule), so an agent cannot close this by itself.

The app reads audio provenance from the manifest rather than assuming a file in
`media/` is a licensed recording, and resolves a media id through the manifest's
`file` field, so filenames stay pack data. Synthesis is not byte-reproducible: a
regeneration is a pack change (version bump, fresh catalog hashes, and any
platform report bound to the old `pack_sha256` stops confirming), never a no-op.
See `ADR-0016` and `ADR-0024`.

Two ways a learner gets a pack, at very different cost. **Catalog install**
fetches the archive in the Rust layer and holds one buffer (~300 MB for the
reference packs). **File import** goes through the web layer: the browser hands
over the file, the UI base64s it and the Rust layer decodes it, so the same
pack costs three buffers at once — measured 2026-10-12 on the 302 MB ru-RU
archive, process RSS went 780 MiB → 1,787 MiB (+1,007 MiB: 302 file + 403
base64 + 302 decoded) before Rust's own IPC copy and decode. Import is kept
because the web layer deliberately has no filesystem capability
(`src-tauri/capabilities/default.json`), so a path-based import needs an
owner-approved capability change; until then alpha users are pointed at the
catalog, and the cost is a PERF-tier input rather than a surprise.

## Release candidate and publication

`REL-001` produces a reviewable release candidate. Distribution to public channels, signing credentials and paid/store accounts require owner authorization. Resolve the source-code/original-content licenses before public redistribution. Mobile, optional AI, web and advanced content do not gate the desktop candidate.

All final audit reports bind to the exact application commit/build configuration, dependency lockfiles, pack hashes, model/provider hashes, review range, platform and hardware tiers. An affected update invalidates its previous evidence and reruns the relevant gates. Publish aggregate benchmark/review evidence without private recordings or reviewer identities.

### Alpha 0.4.0-alpha.1 — published build evidence (2026-10-13)

Built from commit `70ec683` with the pinned toolchain (Rust 1.97.1 from
`rust-toolchain.toml`, Node 26 + npm; the build runs
`npm run tauri -- build` with a `beforeBuildCommand` override because no pnpm is
installed on this host), then `scripts/finalize-appimage.sh` over both AppImages
so they use the target system's webkit2gtk-4.1 the way the deb does. Artifacts
live in `dist/artifacts/alpha.13/`:

| artifact | bytes | sha256 |
| --- | --- | --- |
| base deb | 12,309,544 | `f25dfd6de8cf98d220bb332004a3a40287e70890b3592097c3a6448d8dc586ec` |
| base AppImage | 72,739,320 | `8ec280f83715b6021121bd539700536449dd02d7356242e182e22b492c466457` |
| aligner deb | 83,781,498 | `158c079b80546fc956805dfcba6483d5d2b963a4fd2e79efcf5a8ef7d96465af` |
| aligner AppImage | 144,669,176 | `95581a7aa6c409cba8a9de7ec74c34658e5eaa25154afb20ce0604d56d600e56` |

The AppImages are ~49 MiB / ~40 MiB smaller than the 2026-10-12 builds because
those were **not** finalized: they bundled this machine's
`libwebkit2gtk-4.1`/`libjavascriptcoregtk-4.1`, whose helper-process paths are
baked in, which is exactly the K-59-follow defect that SIGABRTs a borrowed
AppImage on another machine. They are superseded, and nothing built from before
the lexicon repair should be handed out: the published `ja-jp-reference-0.3.0`
archive is now refused by the install gate (561 lexicon errors), so the alpha's
packs ship as 0.4.0.

Verified in the shipped payload, not just on disk: the binary inside the base deb
carries the stamped identity (`0.4.0-alpha.1` and commit `70ec683`) that
`build_identity` reports, which is what lets a runtime report bind to a build
(ADR-0015). The aligner deb unpacks the sidecar under
`usr/lib/open-language-learning-platform/aligner/linux-x64/` (`bin/whisper-cli`,
`libwhisper.so.1`, four `libggml*`/`libgomp` libraries, `model/ggml-tiny.bin`,
`SIDECAR.yaml`) plus `aligner/LICENSE.whisper-cpp.txt`, and the base deb unpacks
no aligner path at all.

Gates on the exact built tree: `cargo test --workspace --exclude lts-desktop`
249/0, `cargo test -p lts-desktop` 124/0, clippy `--workspace --all-targets
and eslint/prettier clean, `validate`/`lint`/`test`/`audit-curriculum`/
`audit-lexicon`/`audit-licenses` all 0 errors 0 warnings for both packs, python
tool suites 37 + 20 OK, `tools/validate_handoff.py` PASSED (1,905 data files),
gitleaks clean over the full history. `--release-readiness` still fails honestly
and on purpose: both packs are `experimental/unreviewed` and
`examples/minimal-language-pack` is a manifest-only fixture.

Nothing here is signed, and tagging/uploading is an owner action. The hashes above
are the values to publish; a superseded build invalidates them per the paragraph
above.

**Publication state (2026-10-13).** The repository is public and the four
artifacts above are attached to the pre-release
`open-language-learning-platform-0.4.0-alpha.1`; both reference packs are
attached to normal releases under their pack tags, and `catalog/packs.json`
points at those asset URLs. The public path was proven from outside the build
machine: unauthenticated `GET` of the raw catalog returns 200,
`ja-jp-reference-0.4.0.lpk` downloaded over its public release URL hashes to
`f0aa971f…b713a5f` — identical to the catalog pin — and
`langpack install --store <empty-store>` accepted it
(`installed org.openlanguage.ja-jp.reference v0.4.0`). GitHub computes the same
`sha256:` digests for every uploaded asset.

**Licensing paper corrected after publication.** The published ja-JP 0.4.0
archive carries three `licenses.jsonl` records. The tree now carries five: the
baked-audio record was corrected to name the Qwen3-TTS bake engine (ADR-0023; the
record still said kokoro/sherpa-onnx), and two `derived-from-source` records at
**CC-BY-SA-4.0** were added for the dictionary-sourced lexicon and kanji layers
with the EDRDG attribution — the pack README had asserted a dictionary-data record
that did not exist. So the downloadable 0.4.0 archive predates that correction and
understates a ShareAlike obligation; it should be republished as 0.4.1. The
paired **pack-level** decision (O-01(a)) was settled by the owner on 2026-10-13:
`languages/ja-JP/manifest.yaml` now declares **CC-BY-SA-4.0**, because its
lexicon and kanji layers descend from the EDRDG JMDict dictionary. The gap is now
checked rather than asserted: `audit-licenses` compares a declared licence with
the licences of the sources it derives from (ADR-0028) and reported this
mismatch at `info` severity on every run until the declaration was fixed.

## Authentic updates and interrupted downloads

Application updates use authenticated signed metadata/artifacts when that update channel exists; checksum-only metadata obtained from the same untrusted location is not publisher authentication. Trusted pack/model catalogs bind source URL, version, license/terms, size and digest to an authenticated catalog record. Third-party unsigned packs remain explicitly lower trust. Signature indicates publisher/integrity, not linguistic correctness.

Downloads stage to temporary storage, enforce length/hash limits, resume safely, support cancel, and activate atomically only after validation. Interrupted/disk-full/invalid-signature downloads keep the last working version. Keys live outside source/pack files; document rotation and recovery. Release-mode artifacts contain no debug driver or elevated test hooks. See the [Tauri updater reference](https://v2.tauri.app/plugin/updater/) when that provider is chosen.
