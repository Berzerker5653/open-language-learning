# SPEECH-006 notes — pitch/F0 visualization and guided comparison (2026-10-03)

## Acceptance mapping

1. **Normalized F0 contour can be shown accessibly for suitable voiced
   segments.**
   `AutocorrelationProsody` (crates/speech-runtime/src/prosody.rs)
   tracks F0 per frame with reliability flags; `normalize_semitones`
   yields semitones relative to the speaker's own median;
   `contour_shape_text` gives a plain-language shape description.
   UI renders an SVG polyline pair (reference vs attempt) with an
   `aria-label` carrying both shape descriptions, plus text lines —
   picture AND text, never picture alone
   (`shows normalized pitch contours accessibly...` UI test;
   `tracks_stable_pitch_with_reliability` /
   `normalized_contour_is_speaker_range_invariant` provider tests).
   "Suitable voiced segments": only aligned spans are analyzed;
   unvoiced/implausible frames are masked
   (`silence_is_masked_not_low_pitch`, `octave_jump_frames_are_masked`).

2. **No absolute-Hz correctness rule.**
   Comparison and display use semitones-relative-to-speaker-median.
   `normalized_contour_is_speaker_range_invariant`: the same contour
   sung an octave apart normalizes identically (max deviation < 1
   semitone). UI test asserts no numeric-Hz string appears; the only
   Hz mention is the disclaimer "never in absolute Hz". Desktop test
   asserts returned contour values are in semitone range, not Hz.

3. **Feature remains guided/reference while uncalibrated.**
   Pack declares `ja.phon.f0-contour` mode `reference-only` with
   `calibration: null` (phonology + speech profile). The UI labels it
   "reference-only until calibration evidence exists" and shows no
   grade; automatic eligibility is a SPEECH-007 owner gate.

## Design

- Autocorrelation with voiced-gate (RMS + peak ratio), octave-jump
  masking (frame doubling/halving vs both neighbours → unreliable).
- Missing F0 = masked frame, never a low-pitch target (docs/05).
- Contours compared per-speaker; no cross-speaker Hz comparison.
- Pack media reference (kokoro TTS) provides the reference contour;
  the attempt contour comes from the aligned user audio.

## Owner gates still open

- SPEECH-007 calibration (automatic eligibility), REVIEW-001, LIC-001.
