# SPEECH-002 notes — local speech pipeline (2026-10-03)

## Acceptance mapping

1. **Silence/noise/clipping can yield retry without negative mastery.**
   `crates/speech-runtime/src/quality.rs` (`EnergyVad`): `quality()`
   returns `ProviderOutcome::QualityRejected` with reasons `empty`,
   `silence`, `clipping`; `detect()` additionally rejects
   `no-speech-frames`. Tests assert `is_linguistically_neutral()` is
   true for these outcomes, so the activity container records no
   evidence event and mastery is untouched — the learner is simply
   prompted to retry. See `quality_rejections_are_neutral_and_retryable`
   in `state/evidence/SPEECH-002/cargo-test-2026-10-03.txt`.

2. **Short Japanese utterance recognized locally after model install.**
   `crates/speech-runtime/src/asr.rs` (`SherpaSubprocessAsr`) runs the
   installed sherpa-onnx runtime over the installed whisper-tiny model
   files (the SPEECH-003 model-manager layout). The integration test
   `real_sherpa_recognizes_installed_model_offline` reads fixture
   `u01.wav` (こんにちは), gates it through the VAD, and asserts the
   transcript contains こんにちは. The run was NOT skipped (vendor
   artifacts present; no SKIP line in the log) and completed in ~0.4s.
   The test skips with an explicit SKIP message when vendor artifacts
   are absent, keeping CI hermetic.

3. **Network-disabled integration test passes.**
   `state/evidence/SPEECH-002/network-disabled-2026-10-03.txt`: the
   whole `lts-speech-runtime` suite (3 tests, including the real
   sherpa recognition) passes inside `unshare -rn` (new user + network
   namespace, no connectivity). Every provider in the crate asserts
   `requires_network == false` in tests.

## Design

- Quality gating is a provider concern returning neutral outcomes; the
  mastery/evidence path only ever sees `Usable`/`UtteranceMismatch`
  values (activity container contract).
- ASR adapter is a subprocess over installed files (ADR-0007): no
  network, no build-time native deps; audio crosses via temp WAV.
- Vendor artifacts (sherpa-onnx binary, whisper-tiny ONNX, kokoro TTS,
  synthetic fixtures) live in `$LTS_BENCH_VENDOR` (default
  `~/.cache/lts-bench`), never in the repo.

## Known limits

- tiny-tier accuracy is dev-only (protocol `asr-0.1.0` keeps automatic
  scoring disabled); CER numbers belong to SPEECH-001, not product
  claims.
- Confidence is `None` from sherpa CLI (no calibrated score yet);
  downstream must not treat recognition success as pronunciation
  correctness (SPEECH-005 gate).
