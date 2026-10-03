# JA-RES-002 Acceptance Notes — Japanese phonology/prosody model

Date: 2026-10-02

## Acceptance 1: Verified inventory for mora, length, gemination, major pronunciation features is encoded

`docs/assessment/JA_PHONOLOGY.yaml` (schema 0.2 `phonology` document):
23 segments (5 vowels incl. the [ɯ] contrast; [ɕ]/[tɕ]/[ɾ] learner
contrasts; reference-only [ɸ]/[ʔ]), 8 phonotactics entries
(`mora-rhythm`, `moraic-nasal` with [m n ŋ ɴ] allophony, `gemination`
incl. /N/-/ʔ/-non-gemination and variable /ɡː/, `vowel-length`,
`palatalization`, `vowel-devoicing`, `syllable-shape`, `rendaku`),
4 prosody entries (`lexical-pitch-accent`, `phrase-intonation`,
`mora-timing-instruction`, `final-particle-prosody`).

Enforced by `crates/langpack/tests/ja_phonology.rs`:
- `inventory_validates_against_v02_phonology_schema` (jsonschema,
  offline registry);
- `required_feature_areas_are_encoded` (named ids + five-vowel check).

"Verified" = cross-checked against open reference descriptions;
naturalness nuance and target audio still require REVIEW-001 review
(stated in the policy doc; not self-certified).

## Acceptance 2: Reference variety and natural variant policy documented

`docs/assessment/JA_PHONOLOGY_MODEL.md` §2: single `standard-japanese`
reference variety (Tokyo-oriented teaching reference, reused across
identity/phonology/speech-profiles/calibration); regional/social
realizations are natural variants, not errors; accepted-variant
membership requires review records with variety+register; empty
variant list is neither prohibition nor license; variable phenomena
(devoicing, [ŋ], /ɡ/ gemination) are reference-only and never scored.

## Acceptance 3: Pitch-accent data plan is license-compatible, no restricted scraping

Policy §3 + matrix cross-reference: primary data from IPAdic
(permissive NAIST) and UniDic (BSD-3 option) — both `allowed`;
Open JTalk prediction is draft assistance only (hypotheses, never
shipped unreviewed; code/dict/voice licenses tracked separately);
OJAD and NHK are `blocked` in `docs/provenance/JA_SOURCE_MATRIX.yaml`
with no scraping/bundling/derivation; own consented recordings
supplement. Isolated-word accent metadata stays distinct from phrase
contour targets (utterance context, boundaries, following material
recorded).

Calibration gate: `no_automatic_scoring_without_calibration` test
asserts zero `assess-automatic` modes; pitch accent is `assess-guided`
only until SPEECH-007 calibration (owner-gated) exists.

## Evidence

- `state/evidence/JA-RES-002/cargo-test-2026-10-02.txt` — 3 contract
  tests green.
- `state/evidence/JA-RES-002/ci-2026-10-02.txt` — full `./scripts/ci.sh`
  exit 0 ("CI OK") + handoff validator PASS (48 data files).
