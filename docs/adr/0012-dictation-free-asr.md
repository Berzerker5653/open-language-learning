# ADR-0012: Dictation / speak-to-check via free ASR (guided)

## Status

Accepted (prototype scope; guided-only, no grade or mastery).

Date: 2026-10-06

## Context

Roadmap feature B (`docs/SPEECH_FEATURE_ROADMAP.md`): let a learner read a known
sentence aloud and get an honest "could the app recognize what I said" check.
Unlike the vowel-length contrast (ADR-0011, where model size is irrelevant),
dictation needs **free recognition of natural speech** — the first shipped place
where larger whisper models genuinely help.

Constraints:

- docs/05: false feedback is a critical defect; abstain rather than emit a wrong
  verdict; quality rejections are linguistically neutral retries.
- SPEECH-007: no automatic scoring/mastery from speech until calibration; this
  feature must not assign grades or mastery.
- The selected model is a whisper.cpp ggml file (ADR-0011 selector). This
  whisper.cpp build's `-oj` JSON exposes **no** per-segment confidence
  (`avg_logprob`/`no_speech_prob` absent) and `-ot` produced no token file, so
  there is no ASR confidence signal to threshold on.

## Decision

Add `dictation_check_at` (`apps/desktop/src-tauri/src/lib.rs`) + IPC
`dictation_check` + a presentational `DictationPractice` UI
(`apps/desktop/src/dictation.tsx`).

Pipeline, fail-closed end to end:

1. `off` preference → abstain `speech-model-off`; selected-but-missing model →
   `aligner-unavailable` (reuses `aligner_paths`).
2. `EnergyVad::quality` gate → `quality:<reason>` on silence/noise/clipping.
3. Free transcription via `lts_speech_runtime::alignment::run_whisper_words`
   (whisper.cpp `-oj`), concatenating segment texts. Empty → `asr-no-speech`.
4. Compare target vs transcript with `char_match` after `normalize_for_match`
   (drop whitespace/punctuation, then fold katakana→hiragana so the
   recognizer's kana choice does not cause a false negative).
5. Band on the match ratio: `>= 0.9` matched; `<= 0.4` not-matched; otherwise
   abstain `uncertain`. Because there is no ASR confidence, the uncertain band
   is the safety valve against both false positives and false negatives.

Always `mode: "guided"`; no grade, no mastery, no evidence event; the recording
is in-memory only (docs/08).

## Consequences

- **Larger models help here**: recognition accuracy on natural sentences is the
  bottleneck, so base/small can reduce `uncertain`/`asr-no-speech` abstentions
  versus tiny — the opposite of the contrast feature.
- **No confidence signal** in this whisper build, so the gate is quality +
  transcript + ratio bands. If a future build exposes `avg_logprob`, add a
  confidence threshold and tighten the bands.
- **Kana folding** prevents false negatives (e.g. ASR returning オバーさん for
  おばさん-family targets) but does not equate long-vowel marks; those fall in
  the uncertain band, which is honest.
- **Guided only**: no evidence/mastery. A speaking evidence event is a
  follow-up gated on SPEECH-007 calibration.
- **Target source (shipped 2026-10-06)**: `dictation_target_at` + IPC
  `dictation_target(pack_id, offset)` pick a sentence from pack content,
  preferring kana-only sentences (where `normalize_for_match(text) ==
  normalize_for_match(reading)`, so the ASR transcript matches the reading
  cleanly) and rotating via `offset % pool.len()`. Kanji-only sentences would
  land in the `uncertain` band, so they are avoided. The UI shows the target
  reading + gloss with a "New sentence" control.
- **Verification**: `cargo test --workspace` green (48 desktop lib incl.
  `dictation_check_matches_spoken_target`, `…_flags_clear_mismatch` (asserts the
  never-a-false-match invariant), `…_abstains_when_model_off`,
  `…_abstains_on_silence`, `dictation_target_prefers_kana_only_and_rotates`);
  frontend `vitest` 98 green incl. `dictation.test.tsx`; `tsc --noEmit` clean.
  Vendor-backed tests skip when whisper-cli/model absent. (Fixed a latent
  temp-file collision in `run_whisper_words`: the stem keyed on audio length, so
  two parallel runs over identical audio clobbered each other's wav/json; now
  keyed on pid + an atomic per-call counter.)

## Alternatives considered

- **sherpa-onnx ASR** (ADR-0007 default) — rejected for now: ADR-0008 recorded
  empty timestamps on the tiny export, and the app's selected model is a whisper
  ggml file; reusing the already-selected whisper keeps one model per device.
- **Token-probability confidence** (`-ot`) — rejected: this build produced no
  token file; no confidence to threshold on.
- **A pronunciation grade / mastery** — rejected: SPEECH-007 gate; dictation is
  a recognition check, not a pronunciation-quality score.
- **Hard true/false verdicts with no uncertain band** — rejected: without ASR
  confidence this risks false negatives on correct-but-mis-transcribed speech;
  the uncertain band keeps it fail-closed.
