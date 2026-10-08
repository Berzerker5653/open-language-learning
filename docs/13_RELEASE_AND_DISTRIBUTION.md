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
