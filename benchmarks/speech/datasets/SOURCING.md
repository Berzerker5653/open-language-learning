# Dataset sourcing decision — ja.phon.vowel-length calibration (SPEECH-007)

Owner decision required. SPEECH-007 is blocked on **permissioned learner
speech + human labelers** (docs/17 §25, §129). This memo lays out how to obtain
the data so the frozen protocol (`protocols/ja-JP/vowel-length-0.2.0.yaml`) can
run. Metadata checked 2026-10-06; **verify exact license/access at acquisition**
— releases and terms change (docs/17 §29, SOURCES.md §84).

## The hard constraint

docs/17 §25 + docs/05 §223: a native read-speech corpus is an ASR baseline and
**cannot substitute for a human-labeled learner pronunciation calibration set**.
The feature is a phrase-scoped **vowel-length** contrast, so the data must
contain _learner_ productions of long-vowel minimal pairs (correct + shortened +
lengthened + ambiguous), consented and licensed for evaluation retention.

## Options

| Option                                                  | What it is                                                                                                                                              | Learner errors?                                                                                      | License / access                                                                                        | Verdict                                                                                                                                                                     |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. Consented targeted recording study** (recommended) | Recruit ≥40 consented learners to record the taught long-vowel minimal-pair set + controls, via the app's opt-in study flow or a small contracted panel | **Yes** — designed to elicit the exact contrast                                                      | We own consent + rights via `consent/participant-consent.md`; audio stays in study storage, never ships | **Primary path.** Matches privacy posture (docs/08, docs/12) and the phrase-scoped claim; smallest, cleanest data that satisfies docs/17 §25                                |
| **B. JANON-SPEECH** (Kaggle)                            | Read-speech corpus of **non-native Japanese** (isolated words + sentences)                                                                              | Partial — non-native, but _read_ speech, not spontaneous learner errors; long-vowel coverage unknown | Kaggle listing; **license + redistribution terms must be verified before use**                          | **Supplementary only.** Useful for dev/analysis if it contains the contrast and the license permits evaluation use; cannot alone prove learner-error accuracy (docs/17 §25) |
| **C. NII-SRC corpora** (ASJ-JIPDEC, JVPD vowel DB)      | Japanese speech resources; application-gated via the Speech Resources Consortium                                                                        | No — native speakers (JVPD = native vowels by sex/age)                                               | Application + use restrictions, not open                                                                | **ASR/acoustic baseline only.** Not a learner calibration source                                                                                                            |
| **D. Common Voice CV27 Japanese**                       | Crowdsourced **read** speech, CC0-1.0 label                                                                                                             | No — mostly native/fluent readers                                                                    | CC0 label but release-page terms **prohibit re-hosting and speaker identification** (SOURCES.md §82–84) | **ASR baseline only.** Not learner errors; cannot re-host                                                                                                                   |
| **E. NICT JLE / L2-ARCTIC / LearnerVoice**              | L2 speech corpora                                                                                                                                       | Wrong direction — Japanese-speaking-English or non-native **English**                                | various                                                                                                 | **Not applicable** to Japanese pronunciation                                                                                                                                |

## Recommendation

Take **A as primary**, optionally **B as a supplementary dev set** if its
license and content check out. A is the boring, safe path: it produces exactly
the labeled learner errors the protocol needs, keeps us fully inside the
privacy posture, and the sample is small because the feature is narrow.

### What the owner must supply / decide for path A

1. **Recruit the panel**: ≥40 consented learners spanning relevant L1/accent
   groups and proficiency bands (protocol `sampling_rationale`). Via an in-app
   opt-in study flow, or a small contracted/consented panel.
2. **Approve the consent instrument** (`consent/participant-consent.md`) —
   have a human review the wording before collection.
3. **Engage 2 qualified labelers** (+1 adjudicator) meeting the rubric's
   phonetics/assessment bar (`labeling/rubric-ja-vowel-length.md`); record their
   qualifications.
4. **Ratify the frozen thresholds** in `vowel-length-0.2.0.yaml` (a named
   qualified protocol reviewer signs off; an AI cannot self-certify).
5. **Provision access-controlled study storage** per `consent/data-handling.md`
   (outside the repo, outside distributed packs).

### What is NOT sufficient (do not substitute)

- A native read corpus (C/D) or synthetic TTS fixtures (the existing
  `ja-onramp-synth` set) — these are ASR/runtime baselines, not learner-error
  calibration (docs/17 §25).
- AI-only labeling — cannot satisfy the two-qualified-human-labeler gate
  (docs/16 §114, docs/17 §127).

## Until then

SPEECH-007 stays **blocked**; automatic pronunciation scoring stays disabled;
the stable-1.0 minimum ("at least one high-value contrast qualified") stays
open and is **not** satisfiable by infrastructure or planning alone. Guided /
reference pronunciation practice continues to ship (labeled as such).
