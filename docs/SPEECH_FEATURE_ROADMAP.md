# Speech feature roadmap — recognition-heavy features

Status: **Proposal.** Not scheduled. No `tasks/ROADMAP.yaml` entry is opened and
`active_task` stays `null` until the owner explicitly scopes a feature. This
document is a menu + sequencing for owner decision, not authorization.

Date: 2026-10-06

## Why this exists

The shipped pronunciation feature (SPEECH-004/005/006) uses a **constrained**
aligner + a vowel-length contrast. ADR-0011 established that **model size does
not change its accuracy** — tiny/base/small score the minimal-pair clip
identically (`align_conf 0.9`). So offering larger models buys nothing for that
feature today.

Larger models (base/small) only pay off for features that need **free
recognition of natural, unprompted speech**. This doc enumerates those features,
what each actually requires, the gates, and a sequencing that puts the cheap,
high-ROI work first.

## Non-negotiable constraints (carry into every feature)

- **Privacy**: local, opt-in, `off` default, nothing uploaded; any upload-capable
  provider needs an obvious notice before first use (AGENTS.md, docs/08).
- **Fail-closed**: abstain rather than emit false feedback; confidence ≠
  correctness; abstention is allowed and expected (docs/05, docs/17).
- **Calibration gate**: no *automatic scoring / mastery* from speech until
  `SPEECH-007` calibration (owner-supplied permissioned learner data + qualified
  human labelers). AI cannot self-certify review or calibration (AGENTS.md).
- **Content as data**: packs stay declarative; no arbitrary code execution.
- **Model acquisition**: no new model downloaded without owner go-ahead +
  pinned license/checksum (SPEECH-001/002 model-manager decision).
- **No YouTube scraping**; open-source audio only, license verified at
  acquisition (docs/10, `benchmarks/speech/datasets/SOURCING.md`).

## Candidate features

### A. Real recordings + phrase exercises for the *existing* contrast feature
- **What**: replace synthetic demo clips with real continuous learner
  recordings, and broaden the drill from one minimal pair to a set of
  short/long phrase pairs.
- **Model need**: **none new** — tiny is sufficient (constrained aligner).
- **Hardware**: `low` tier fine.
- **Gate**: stays GUIDED until SPEECH-007; no new model, no new dependency.
- **Risk**: low. This is feature/content design, not ML.
- **ROI**: **highest** — directly improves the feature that already works.
- **Status (2026-10-06)**: learner mic capture is already wired (the attempt is
  a real recording; the UI already asks for both words in one take). The probe
  now honors the in-app selected model (`--data-dir`). **Blocked on reference
  media**: the real `languages/ja-JP` pack declares two vowel-length pairs but
  ships **no** contrast media, and `pronunciation_demo_at` uses only the first
  pair that has media.
- **TTS reference media REJECTED by verification (2026-10-06)**: synthesized
  Kokoro (sherpa-onnx, sid 37) references were measured with the same
  `voiced_seconds` the feature uses — おばさん/おばあさん ratio **1.04**,
  とおい/問い ≈ **1.39**. Kokoro does not reliably lengthen the long vowel, so
  TTS cannot anchor a length judgement (the bundled ja-demo clip is Kokoro,
  hence its 1.04). Scoring a learner against a ~1.0 reference would flag a
  correct ~1.8x contrast as "too long" — false feedback (docs/05).
- **Correctness gate added**: `pronunciation_check_at` now abstains
  `reference-contrast-weak` when the reference pair's long/short voiced ratio is
  `< 1.4`, before any learner scoring. The feature is therefore fail-closed on
  weak references (ja-demo → `reference-contrast-weak`; ja-JP → `reference-media-missing`).
- **Resolved via pack-declared targets (ADR-0013, 2026-10-06)**: OpenJTalk was
  also measured (ratio **1.07**) — *no* available TTS lengthens, so TTS cannot
  anchor or verify. Instead the contrast now **declares** its target
  (`production.expected_ratio`, mora-derived: obasan 1.25, toi/tooi 1.5) and the
  engine reads it — **no media, no recording, no TTS needed**. Language-neutral:
  every pack supplies its own target; the engine never counts morae. Verified
  end-to-end (`pronunciation_check_uses_pack_declared_target_without_media`):
  the weak TTS audio is now correctly judged `shorter`, not the old false
  `close`. Owner recordings remain the fallback (committed media still wins) and
  the only path to a *calibrated* target (SPEECH-007).

### B. Dictation / speak-to-check (free ASR)
- **What**: learner dictates a target sentence; the app transcribes and checks
  it against the target text (links listening + orthography + a speaking
  evidence event).
- **Model need**: **free ASR** — this is where base/small genuinely beat tiny
  (natural-sentence recognition). Whisper free transcription, not constrained.
- **Hardware**: base on `low`, small on `typical`; latency is user-facing.
- **Gate**: needs a **recognition** benchmark (Japanese WER + abstain-on-low-
  confidence), distinct from pronunciation calibration. Guided feedback only
  until reviewed.
- **Risk**: medium — ASR errors must abstain, never mark a correct answer wrong.
- **ROI**: **the clearest win for bigger models**; a self-contained modality.
- **Status (2026-10-06)**: **prototype shipped** (ADR-0012). `dictation_check`
  reuses the selected whisper model for free transcription, gates on
  `EnergyVad` quality + a kana-folded character-match ratio with an uncertain
  abstain band (this whisper build exposes no ASR confidence), and is always
  guided — no grade/mastery/evidence. UI: `DictationPractice` (Speaking tab).
  Follow-ups: recognition benchmark (WER), evidence events (SPEECH-007-gated),
  target sentences sourced from pack content, confidence threshold if a future
  build exposes `avg_logprob`.

### C. Mora/segment-level pronunciation feedback (forced aligner)
- **What**: per-mora feedback on natural phrases, not just a whole-pair ratio.
- **Model need**: a **forced phoneme aligner** (wav2vec2/MFA-class). ADR-0008
  flagged that whisper token/segment offsets do **not** give mora precision;
  bigger whisper does not fix this — a different tool does.
- **Hardware**: heavier than whisper; needs a tier decision.
- **Gate**: SPEECH-005/006 must first show what granularity feedback needs;
  scoring gated on SPEECH-007.
- **Risk**: high — new dependency + licensing + pack alignment artifacts.
- **ROI**: high *if* granularity proves necessary; premature before B/A.

### D. Open speaking scenarios / conversation
- **What**: free-form spoken responses in scenarios (ADR-0006 branches).
- **Model need**: **most demanding** — robust free ASR (small) + response
  handling; hallucination risk is real (we observed `small` hallucinating on
  short clips).
- **Hardware**: `typical`/high; likely tier-gated.
- **Gate**: calibration + qualified review; strict abstention.
- **Risk**: highest. Defer.

## Capability → model matrix

| feature | recognition type | min model today | new dependency? |
|---|---|---|---|
| A. real recordings / phrase drills | constrained | tiny | no |
| B. dictation / speak-to-check | **free ASR** | base (`low`) / small (`typical`) | no (whisper already) |
| C. mora-level feedback | forced aligner | n/a (aligner, not whisper) | **yes** |
| D. open conversation | free ASR + NLU | small | likely |

## Hardware / tier policy (PERF-001)

- Tiers: `low` (8 GB, 4c/8t, integrated), `typical` (16 GB, 8c). `small` is a
  ~488 MB download with heavy RAM/CPU/latency → gate behind `typical` or an
  explicit opt-in, never the default.
- **Follow-up (not yet built)**: there is **no runtime device-tier detection** in
  the app. To "default by tier," add tier detection and surface the recommended
  model accordingly. Until then the selector marks tiny as recommended (cheapest
  equivalent for the shipped feature).

## Recommended sequencing

1. **Now, cheap, no new model**: A — real mic recordings + phrase-pair content
   for the existing feature; wire the probe to honor the in-app selected model.
2. **Next, needs owner scope + a recognition benchmark**: B — dictation. This is
   where base/small earn their keep.
3. **Later, needs a dependency/licensing decision**: C — forced aligner, only if
   SPEECH-005/006 show mora-level feedback is needed.
4. **Defer**: D — open conversation, until calibration + review capacity exist.

## What the owner must decide before any of this is scheduled

- Which feature(s) to fund and in what order.
- Tier policy for `small` (gate by detected tier vs explicit opt-in).
- Whether to add a forced-aligner dependency (C) — new licensing + pack format.
- Supply of calibration data + labelers (unblocks *scoring* for A–D; prep is
  already done per `benchmarks/speech/CALIBRATION_RUNBOOK.md`).

## Explicit non-goals of this proposal

- It does **not** open a ROADMAP task or change `active_task`.
- It does **not** authorize downloading a new model or adding a dependency.
- It does **not** enable automatic speech scoring (still `SPEECH-007`-gated).
