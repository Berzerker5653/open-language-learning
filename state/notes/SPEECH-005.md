# SPEECH-005 notes — Japanese acoustic feature + pronunciation feedback MVP (2026-10-03)

## Acceptance mapping

1. **At least one validated high-value Japanese contrast taught with
   actionable feedback.**
   Contrast: vowel length (おばさん "aunt" vs おばあさん "grandmother"),
   a meaning-distinguishing minimal pair from JMdict-derived data
   (EDRDG, CC BY-SA 4.0). Declared in the pack: `language/phonology.yaml`
   (`ja.phon.long-vowel`, mode `assess-guided`) + `speech/profiles.jsonl`
   (calibration null → guided only). Actionable feedback templates:
   shorter/longer/close with concrete instruction ("hold the あ about
   twice as long"). End-to-end proof: `pronunciation_check_guides_vowel_length_and_abstains_on_mismatch`
   (desktop) and `real_pipeline_interprets_reference_pair`
   (speech-runtime) run whisper.cpp alignment + duration features +
   interpreter over real audio and return the `close` correction.
   Note: the pack entries are `status: draft`; qualified human review
   of production content remains an open owner gate (REVIEW-001). The
   contrast itself is dictionary fact, not a contested pedagogical claim.

2. **ASR success is not the pronunciation score.**
   Corrections require reliable duration evidence:
   `asr_success_alone_is_not_a_pronunciation_score` — high alignment
   confidence with no reliable features → `Abstained
   {no-reliable-duration-evidence}`. The verification gate (alignment
   mismatch) runs before any pronunciation evidence is considered
   (docs/05). No mastery/evidence event is ever recorded on this path
   (guided profile, calibration null).

3. **Feedback can abstain and exposes why.**
   Reason codes surface to the UI: `low-alignment-confidence`,
   `no-reliable-duration-evidence`, `invalid-duration-measurement`,
   plus pipeline reasons (`mismatch:*`, `quality:*`,
   `aligner-unavailable`, `reference-media-missing`). UI renders a
   human explanation per reason class (`pronunciation.tsx`
   `reasonLabel`), never invents feedback.

4. **User can hear reference and own retained-in-memory attempt during
   immediate comparison.**
   `reference_audio` command serves pack media (`media/<content-id>.wav`,
   allowlisted pack + validated content id — path traversal rejected in
   test). The recorded attempt is kept as an in-memory blob URL only
   (`App.tsx`: `URL.createObjectURL`, revoked on replace; nothing audio
   is persisted — docs/08). Both reference and attempt playback buttons
   are in `PronunciationPractice`.

## Design

- Self-normalized metric: ratio of long-word to short-word voiced
  duration in the learner's own attempt, compared against the same
  ratio measured on the reviewed reference audio. Cancels speaking
  rate; does not claim mora equality (docs/06).
- `VoicedDurationFeature` is an energy gate, not a glottal measure:
  spans with no voiced frames are unreliable (missing evidence ≠ zero).
- Bands are guided (`possible-issue`/`confident`); automatic mastery
  requires SPEECH-007 calibration (owner-gated).
- Aligner runtime is the vendor/dev whisper.cpp path (ADR-0008);
  production packaging (sidecar) is a release concern. Model prefers
  the installed catalog copy when present.

## Owner gates still open

- REVIEW-001: pack entries are draft; qualified review cannot be
  self-certified.
- SPEECH-007: calibration data for any automatic (non-guided) feedback.
- LIC-001: final licensing decisions.
