# ADR-0011: User-selectable local speech models (off by default)

## Status

Accepted.

Date: 2026-10-06

## Context

Pronunciation feedback (SPEECH-004/005/006) needs an ASR/aligner model, but the
aligner path (ADR-0008) was hardcoded to `whisper-ggml-tiny`. The owner wants
users to feel they control their learning, and the product is privacy-first:
speech models run locally and nothing is uploaded, but a user who does not want
a speech model must be able to have none.

Constraints in play:

- AGENTS.md privacy: minimize collection; microphone is permission-gated; an
  upload-capable provider needs an obvious notice. A bundled, always-on
  mic-capable model conflicts with opt-in.
- docs/05: false pronunciation feedback is a critical defect; the aligner must
  abstain rather than score garbage.
- SPEECH-007 (automatic pronunciation scoring) stays **blocked**; the feature
  ships GUIDED only. AI cannot self-certify calibration (AGENTS.md).
- The model manager (SPEECH-001/002) installs models **once per device**.

Options on the table: (a) bundle one model always-on; (b) a device-level
user-selected model with an `off` default; (c) per-profile selection.

## Decision

Add a **device-level speech preference** with an `off` default, wired through
the existing model manager.

- `apps/desktop/src-tauri/src/models.rs`: `SpeechPref { asr_model: String }`
  (default `"off"`), persisted at `data_dir/speech.json`. `save_speech_pref`
  validates the value is `"off"` or a catalog id whose `runtime == "whisper.cpp"`.
- `apps/desktop/src-tauri/src/lib.rs`: `aligner_paths` returns `None` when the
  pref is `off`; otherwise it resolves the selected model's file (installed
  `model_dir/<file.path>`, else the vendor fallback). `pronunciation_check_at`
  abstains with `speech-model-off` (pref off) vs `aligner-unavailable` (model
  selected but binary/model missing). `InstalledCombination.model.id` now
  reflects the **selected** model, so registry drift fails closed per model.
- New IPC `get_speech_model` / `set_speech_model`; a radio-group selector in the
  Languages page (`apps/desktop/src/language.tsx`) lists `Off` plus each
  `whisper.cpp` model with size + license + install/remove, and states the
  honest scope (guided only, nothing uploaded).
- `whisper-ggml-base` and `whisper-ggml-small` added to the runtime catalog
  (MIT, pinned sha256, sizes) so the owner can select them in-app.

The selector is limited to `runtime == "whisper.cpp"` (tiny/base/small);
sherpa-onnx/kokoro are TTS and stay under the existing TTS section.

## Consequences

- **Privacy**: the base app bundles zero speech models; speaking stays "not
  assessed" until the user opts in. Nothing is uploaded on any path.
- **Honest finding — model size is not the pronunciation fix.** Re-running the
  probe (`crates/speech-runtime/examples/vowel_length_probe.rs`, now with a
  `--model` flag) across tiny/base/small gives **identical** results on the
  contrast feature: a continuous minimal-pair take scores
  `speech.long-vowel.close` at `align_conf 0.9` even on tiny; isolated single
  words abstain by design (no short↔long contrast within one attempt). The
  selector's value is **user control + privacy**, not accuracy. Evidence:
  `state/evidence/SPEECH-007/probe-2026-10-06.txt` (addendum).
- **Device-level, not per-profile**: models install once per device, so the
  preference is device config kept separate from per-profile learner data
  (privacy minimization). Multi-profile users share the device model choice.
- **Follow-ups** (not in this change): the selector copy/labels are framed
  honestly (size ≠ pronunciation accuracy; choice = privacy + device footprint;
  tiny marked recommended — no runtime device-tier detection exists yet, a noted
  follow-up). Richer feedback comes from feature design, not bigger models:
  real continuous mic recordings + phrase drills (no new model), dictation via
  free ASR (where base/small help), a forced phoneme aligner for mora-level
  feedback, and open speaking scenarios — sequenced in
  `docs/SPEECH_FEATURE_ROADMAP.md` (Proposal; opens no ROADMAP task). Automatic
  scoring still requires SPEECH-007 calibration by a qualified human.
- **Verification**: `cargo test --workspace` green (43 desktop lib tests, incl.
  `speech_pref_defaults_off_and_validates_selection`,
  `pronunciation_check_abstains_when_speech_model_is_off`, and the guide test
  now opting into a model); frontend `vitest` 91 green incl. the selector test;
  `tsc --noEmit` clean; probe run across three model sizes recorded.

## Alternatives considered

- **Always-on bundled model** — rejected: silently installs a mic-capable model,
  contradicting opt-in and privacy minimization.
- **Per-profile selection** — rejected: models are device-level artifacts;
  duplicating install per profile wastes disk and complicates migration. The
  preference is device config.
- **Larger model as the default** — rejected: size does not improve this
  contrast feature (tiny == base == small), a larger download works against
  minimization, and `off` is the honest default.
- **sherpa-onnx for alignment** — rejected now: ADR-0008 recorded empty token
  timestamps on the tiny export; revisit if a forced aligner is added.
