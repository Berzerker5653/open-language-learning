# Feature plan — everything we can build, and what the "no reviewer" reality blocks

Status: **Plan.** Not a schedule; opens no `tasks/ROADMAP.yaml` task and does not
change `active_task` (stays `null`). Owner decision required to fund any tranche.

Date: 2026-10-06

## The governing constraint

The owner is the **sole user/learner** and there is **no qualified external
reviewer or calibration study**. Per AGENTS.md, *qualified human review and
calibrated feature eligibility cannot be self-certified by an AI*, and a single
self-user is not a calibration study (the frozen protocol needs multiple
consented learners + independent labelers + inter-rater agreement, kappa ≥ 0.70).

This splits every feature into three honest buckets:

- **BUILD** — buildable and usable now. Guided/personal feedback, no population
  claim. Verification = automated tests + the owner's own dogfooding.
- **AUTHOR** — buildable, but the *verified/reviewed* label is gated. Content can
  ship as an explicitly labeled draft (owner decision 2026-10-05); it can never
  carry a "qualified-reviewed" or "B2-complete" label without REVIEW-001.
- **GATED** — needs calibration or qualified review that a sole self-user + AI
  **cannot** supply. Stays OFF. Self-use does not unblock these.

What the owner's self-use **does** give us: a consented **n=1** corpus and
continuous dogfooding. That is excellent for *personalization* and *robustness
spot-checks*, and it is **not** population calibration. We must never convert
"it works for me" into "it is calibrated/certified."

## Where we already are

68 ROADMAP tasks are `done`; only `SPEECH-007` is `blocked`. The guided feature
set is largely shipped in the preview: SRS practice + planner + derived mastery
(uncalibrated, capped at 0.9), local storage/migrations, pack pipeline, reading
(interlinear), writing/composition, sentence mining, kanji, placement, scenarios,
shadowing, perceptual discrimination, listening, dictation (ADR-0012), the
speech-model selector (ADR-0011), and the world/progression layer.

So "all the features we can" is mostly **content depth + a few guided speech
refinements + optional platforms**, not new core systems.

## Feature matrix

### Core loop — shipped, keep
| feature | bucket | note |
|---|---|---|
| SRS practice, session planner, FSRS spike | shipped | deterministic; no gate |
| Derived multimodal mastery (per-dimension) | shipped | uncalibrated cap 0.9; **automatic speech mastery is GATED** |
| Local profile store, migrations, export/import | shipped | DATA-001/002 |
| Pack schema/validator/CLI, secure install | shipped | PACK-001..005 |

### Reading / writing / lexicon — shipped, expand content
| feature | bucket | note |
|---|---|---|
| Interlinear graded reading (K-13) | shipped | content depth = AUTHOR |
| Typing/composition (WRITE-001), cloze (K-12) | shipped | |
| Sentence mining / learner lexicon (K-14) | shipped | |
| Kanji instruction (K-16) | shipped | |
| Placement / diagnostic (K-15) | shipped | **scores are personal, not certified** |

### Speech — guided is buildable; automatic is gated
| feature | bucket | note |
|---|---|---|
| Model selector (off/tiny/base/small) | shipped | ADR-0011 |
| Pronunciation vowel-length contrast | shipped (guided) | automatic = GATED; scores via **pack-declared target** (ADR-0013) — no media/recording needed; target uncalibrated |
| Dictation / speak-to-check | shipped (guided) | ADR-0012; automatic = GATED |
| Shadowing (K-11), discrimination (K-10), listening (K-02) | shipped (guided) | |
| **Dictation targets from pack content** | shipped (guided) | `dictation_target_at` picks kana-only sentences, rotates; ties dictation to curriculum |
| **Mora/segment pronunciation feedback** | BUILD (guided) | the constrained aligner now ships as a bundled sidecar (ADR-0019), but its `whisper.cpp` word tokens are not mora timing; mora/segment feedback still needs a phoneme-level aligner, and MFA/wav2vec2 stay rejected per ADR-0008. Guided only, automatic GATED |
| **Real learner recordings as exercise media** | AUTHOR | no longer required for length scoring (ADR-0013 declared target); still the only path to a *calibrated* target (SPEECH-007) |
| **Automatic speech scoring / speech mastery** | **GATED** | SPEECH-007; sole user cannot satisfy |

### Scenarios / world / UX — shipped, expand content
| feature | bucket | note |
|---|---|---|
| Scenario runtime + recovery branches (SCENARIO-001, K-01) | shipped | content = AUTHOR |
| World/progression layer (GAME-001) | shipped | unlocks by capability, not streaks |
| Onboarding + privacy-first setup (UX-001), home/budget/progress (UX-002) | shipped | |
| Profile picker / resume (K-05) | shipped | |

### Content coverage — authorable, label gated
| feature | bucket | note |
|---|---|---|
| A1 on-ramp coverage (JA-A1-001/002) | shipped (draft) | verified label needs JA-A1-003 (REVIEW-001) |
| A2 / B1 / B2 coverage (JA-A2/B1/B2-001) | AUTHOR | can author as labeled draft; **B2 claim is GATED** |
| Qualified review of any of the above (…-002, REVIEW-001) | **GATED** | sole self-user cannot self-certify |

### Optional / deferred platforms
| feature | bucket | note |
|---|---|---|
| Constrained AI conversation/explanation (AI-001) | BUILD (opt-in) | provider abstraction; privacy notice; never a grade |
| C1/C2 content architecture (ADV-001) | AUTHOR | far future |
| Windows/macOS parity (PLAT-001), mobile (PLAT-002), web/PWA (WEB-001) | BUILD | platform work, no learning gate |
| TTS distribution variants (TTS-002), polish (POLISH-001) | BUILD | licensing call pending |

### Release gates (the ones the sole user cannot clear)
| gate | status | why |
|---|---|---|
| SPEECH-007 calibration | **GATED** | needs multiple consented learners + qualified labelers |
| REVIEW-001 qualified review | **GATED** | AI cannot self-certify; owner is not an independent qualified reviewer of own AI content |
| ACC-001 accessibility audit | BUILD (partial automated) | K-33 automated portion buildable; full audit needs human assistive-tech use |
| PERF-002 measured perf | BUILD | measure on the owner's machine = one data point, not all tiers |
| SEC-001 privacy/security audit | BUILD (automated) + human review | scan + review |
| REL-001 1.0 RC | **blocked by the above** | cannot reach "1.0/certified" without review+calibration |

## What self-use can and cannot substitute for

- **Can**: dogfooding every guided feature; supplying consented n=1 recordings
  (feeds robustness + personalization); catching UX/quality bugs; measuring perf
  on one machine; running the automated accessibility/perf/scan gates.
- **Cannot**: satisfy SPEECH-007 (population calibration), REVIEW-001
  (independent qualified review), or any public/certified/B2 claim. These stay
  OFF and must be labeled as such (docs/18).

## Recommended build order for "all we can"

1. **Guided speech polish (no new gates):** dictation targets from pack content;
   real owner recordings as exercise media (unblocks the pronunciation drill
   breadth); optional forced-aligner mora feedback (guided).
2. **Content depth as labeled drafts:** expand A1→A2 coverage (AUTHOR), keep the
   draft label; wire more scenarios/reading to that content.
3. **Personalization from n=1 (shipped 2026-10-06):** `personalize_progression`
   spends the fixed new-item budget on dimensions the learner is developing and
   withholds it from mastered ones, from their own recorded attempts — personal,
   never a population claim. (Error patterns from guided *speech* features that
   abstain from evidence — dictation/pronunciation — are not yet a signal; that
   would need a personal-only signal channel, kept separate from the speech gate.)
4. **Optional platforms / AI conversation (opt-in, privacy-noticed).**
5. **Automated gates only:** K-33 accessibility automated portion, PERF-002 on
   the owner's machine, SEC-001 scans.

## Explicit non-goals under this constraint

- No automatic speech scoring or speech-derived mastery (SPEECH-007).
- No "qualified-reviewed", "calibrated", or "B2-complete" labels (REVIEW-001).
- No public publication or certified claims (docs/18; `public_publication_authorized: false`).
- No treating the owner's single-learner results as evidence of population
  validity.

## Decisions the owner must make to fund any tranche

- Which tranche to start (recommend #1: guided speech polish — highest value to
  your own learning, no gates).
- Whether to record reference audio yourself (the only path that unblocks
  pronunciation-drill breadth — TTS-generated media with verified length
  contrast was tried and **failed verification**: Kokoro ratio ~1.04).
- Whether to add a forced-aligner dependency (mora feedback) — new licensing.
- Whether/when to pursue external calibration+review later (the only path to the
  GATED bucket and to 1.0).
