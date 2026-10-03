# JA-RES-002 — Japanese phonology/prosody model policy

Date: 2026-10-02. Encoded inventory: `docs/assessment/JA_PHONOLOGY.yaml`
(validated against `schemas/v0.2/phonology.schema.json` by
`crates/langpack/tests/ja_phonology.rs`).

## 1. Inventory status (acceptance 1)

The encoded inventory covers the docs/06 required feature set:

- **segments**: five vowels (with the [ɯ] vs [u] learner contrast),
  consonant set relevant to feedback including [ɕ]/[tɕ]/[ɾ] contrasts,
  reference-only [ɸ] and [ʔ];
- **length**: `ja.phonotactics.vowel-length` (contrastive long vowels,
  script-convention differences);
- **gemination**: `ja.phonotactics.gemination` (mora-counting
  contrast; /N/ and /ʔ/ never geminate; /ɡ/ variable realization);
- **mora structure**: `mora-rhythm`, `moraic-nasal` (context-conditioned
  [m n ŋ ɴ]), `syllable-shape`, `palatalization`;
- **prosody**: `lexical-pitch-accent` (assess-guided only),
  `phrase-intonation` (reference-only), `mora-timing-instruction`,
  `final-particle-prosody`;
- **devoicing**: `vowel-devoicing` reference-only — F0 is unavailable
  in devoiced regions, never a low-pitch target (docs/05).

"Verified" here means cross-checked against open reference
descriptions and the pack's own review pipeline; nuanced naturalness
still requires REVIEW-001 qualified review (docs/16). Segment
realization audio targets additionally require the docs/05 review
protocol (actual audible output checked, not just labels).

No `assess-automatic` mode appears anywhere in the inventory:
automatic pronunciation scoring stays disabled until feature-specific
calibration exists (SPEECH-007, owner-gated).

## 2. Reference variety and natural variant policy (acceptance 2)

- Reference variety: `standard-japanese`, Tokyo-oriented where
  pronunciation reference is needed — declared once in pack identity
  and reused in phonology, speech profiles, and calibration records
  (docs/06 §Reference variety).
- The Tokyo orientation is a *teaching reference*, not a correctness
  oracle: regional/social realizations (e.g. Kyushu/Tōhoku accent
  systems, Kansai intonation, casual contractions) are natural
  variants, not learner errors.
- Accepted-variant policy: variants enter the accepted set only via
  reviewed context + evidence (review records naming the variety and
  register); an empty variant list never means "all deviation is
  wrong", and never licenses marking unreviewed variants correct in
  automatic feedback either.
- Devoicing, [ŋ] allophony, /ɡ/ gemination variability, and
  intervocalic [ɾ]→[ɭ]-type assimilation are treated as
  reference-only/descriptive, never scored.

## 3. Pitch-accent data plan (acceptance 3)

License-compatible acquisition only (cross-referenced against
`docs/provenance/JA_SOURCE_MATRIX.yaml`):

- **Primary**: IPAdic accent fields (permissive NAIST license) and
  UniDic (BSD-3-Clause option) for inflected-form accent alternation
  tables. Both `allowed` in the matrix; notices preserved.
- **Draft assistance**: Open JTalk/pyopenjtalk accent *prediction*
  may pre-fill draft targets; predictions are hypotheses, never
  shipped as verified targets without review, and code/dictionary/
  voice licenses are tracked separately (docs/05).
- **Explicitly excluded**: OJAD (academic-only terms) and NHK accent
  dictionaries (commercial copyright) are `blocked` in the matrix —
  no scraping, no bundling, no derivation. The plan does not depend
  on restricted sources.
- **Own data**: project-recorded/consented audio and authored
  contrast pairs supplement dictionary data; provenance recorded per
  docs/10.
- Isolated-word accent metadata is kept distinct from phrase contour
  targets: targets store utterance text, phrase boundaries, following
  material, and accepted variants (docs/05 §caution). Phrase/focus
  intonation is never graded against an isolated dictionary pattern.

## Boundaries

This document defines the model and policy; it does not certify
linguistic correctness, review qualification, or speech calibration —
those remain REVIEW-001/SPEECH-007 owner-gated obligations.
