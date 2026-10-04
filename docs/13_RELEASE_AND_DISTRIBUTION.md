# 13 — Release and Distribution

## Independent artifacts

Version separately:

1. application engine;
2. language packs;
3. model bundles;
4. optional voice packs.

## Desktop release

Target signed/packaged releases for Linux, Windows, and macOS after platform gates pass. Linux is the primary development reference but not the only 1.0 target.

### Platform test status (PLAT-001, owner decision 2026-10-03)

- **Linux**: the only tested platform. CI runs the full test suite plus the
  xvfb desktop smoke (`desktop-smoke` job).
- **Windows / macOS**: build configurations exist (Tauri bundle targets
  `nsis`/`msi` and `app`/`dmg`) and CI compile-checks the desktop crate on
  `windows-latest`/`macos-latest` (`platform-compile` job), but runtime
  behavior is **untested**. Any published Windows/macOS artifacts must be
  labeled untested in release notes and in the pack/app catalog
  (`tested_platforms: ["linux"]`) so public users know these are
  best-effort builds and can report issues.
- Promoting a platform to "tested" requires a human-run runtime pass
  (owner gate); compile checks alone never establish it.

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

## Release candidate and publication

`REL-001` produces a reviewable release candidate. Distribution to public channels, signing credentials and paid/store accounts require owner authorization. Resolve the source-code/original-content licenses before public redistribution. Mobile, optional AI, web and advanced content do not gate the desktop candidate.

All final audit reports bind to the exact application commit/build configuration, dependency lockfiles, pack hashes, model/provider hashes, review range, platform and hardware tiers. An affected update invalidates its previous evidence and reruns the relevant gates. Publish aggregate benchmark/review evidence without private recordings or reviewer identities.

## Authentic updates and interrupted downloads

Application updates use authenticated signed metadata/artifacts when that update channel exists; checksum-only metadata obtained from the same untrusted location is not publisher authentication. Trusted pack/model catalogs bind source URL, version, license/terms, size and digest to an authenticated catalog record. Third-party unsigned packs remain explicitly lower trust. Signature indicates publisher/integrity, not linguistic correctness.

Downloads stage to temporary storage, enforce length/hash limits, resume safely, support cancel, and activate atomically only after validation. Interrupted/disk-full/invalid-signature downloads keep the last working version. Keys live outside source/pack files; document rotation and recovery. Release-mode artifacts contain no debug driver or elevated test hooks. See the [Tauri updater reference](https://v2.tauri.app/plugin/updater/) when that provider is chosen.
