# SPEECH-004 notes — Japanese constrained alignment prototype (2026-10-03)

## Acceptance mapping

1. **Expected short utterances align to useful units with confidence.**
   `WhisperConstrainedAligner` (embedded runtime, ADR-0008) runs
   whisper.cpp `-oj` (word/segment offsets) then `match_units` maps
   pack-declared units onto token spans via Needleman-Wunsch character
   matching. End-to-end: fixture `u01.wav` (こんにちは) aligned to unit
   `こんにちは` with overall confidence ≥ 0.6, span clamped inside the
   utterance buffer (`real_whisper_aligns_fixture_and_abstains_on_mismatch`,
   not skipped — no SKIP line in `state/evidence/SPEECH-004/cargo-test-2026-10-03.txt`).
   Hermetic matcher tests cover multi-unit phrases (per-unit spans with
   exact sample boundaries) and partial-unit confidence.

2. **Mismatch/low confidence abstains.**
   - Wrong expected text: match ratio < threshold →
     `UtteranceMismatch` (never a partial alignment). Hermetic test
     `wrong_expected_text_mismatches_never_partial_aligns`; end-to-end
     test aligns u02.wav (はじめまして) against こんにちは and gets
     `UtteranceMismatch`/`Abstained`.
   - No recognized speech → `Abstained { no-recognized-speech }`.
   - Units with local match fraction < 0.3 get no span
     (`unreliable_unit_is_dropped_but_phrase_still_aligns`).

3. **Embedded-runtime vs preparation-tooling decision recorded.**
   `docs/adr/0008-constrained-alignment-approach.md`: embedded runtime
   (whisper.cpp subprocess + constrained text matching) chosen for the
   prototype; preparation tooling (MFA/wav2vec2 per-pack artifacts)
   deferred with explicit revisit conditions (mora-level precision
   demand from SPEECH-005/006). sherpa token timestamps rejected
   (verified empty for tiny export in SPEECH-001).

## Design notes

- Alignment confidence is a text-match ratio, not an acoustic
  posterior; SPEECH-005 must not treat it as pronunciation evidence
  (ASR success ≠ pronunciation).
- whisper segment offsets span the padded 30 s window; spans are
  clamped to the utterance length (`max_sample`).
- Vendor artifacts (whisper.cpp, ggml-tiny.bin, fixtures) live in
  `$LTS_BENCH_VENDOR`; the end-to-end test skips with an explicit SKIP
  when absent, matcher tests are hermetic (CI signal).
