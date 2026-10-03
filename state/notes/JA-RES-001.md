# JA-RES-001 Acceptance Notes — Japanese source + license matrix

Date: 2026-10-02

## Deliverable

`docs/provenance/JA_SOURCE_MATRIX.yaml` — 31 entries across 7
categories, each with the docs/10 source-registry fields (id, title,
org, url, license, license_url, accessed, type, redistribution,
attribution, notes, alternative/blocker). Licenses were verified
against primary project/publisher pages on the access date; notes
separate verified facts from hypotheses.

## Acceptance 1: Covers functional standards, grammar, lexicon, orthography, phonology/prosody, corpora/audio

Categories present: `functional_standards` (JF Standard, CEFR,
ACTFL), `grammar` (Tae Kim, bunpou-db, jkindrix-jld, OpenJLPT),
`lexicon` (JMdict, KANJIDIC2, KRADFILE, UniDic, IPAdic, Waller),
`orthography` (KanjiVG, joyo lists, Aozora Bunko, ja-Wikipedia),
`phonology_prosody` (OJAD, NHK, IPAdic accent, JSUT/JVS),
`corpora_audio` (Common Voice ja, Tatoeba, Tanaka, CSJ, BCCWJ,
JNAS/ASJ), plus `speech_runtime_models` (sherpa-onnx, whisper.cpp,
Open JTalk, Piper) since model/voice licenses are a docs/10
requirement. Enforced by test `matrix_covers_required_categories`.

## Acceptance 2: Every candidate classified allowed/derived/reference-only/blocked/unknown

Distribution: allowed 6, derived 10, reference-only 6, blocked 5,
unknown 4. Canonical-vocabulary enforcement:
`every_entry_is_classified_with_registry_fields`.

Key verified classifications (primary-page checks on 2026-10-02):
- UniDic: official page states GPL-2.0/LGPL-2.1/BSD triple license →
  allowed via BSD option.
- IPAdic: permissive NAIST license (Debian wiki analysis; SPDX
  proposal) → allowed with notice preservation.
- KANJIDIC2/KRADFILE/JMdict: EDRDG CC BY-SA 4.0 → derived
  (share-alike isolated data layer).
- KanjiVG: CC BY-SA 3.0 (project README) → derived.
- Tatoeba: CC BY 2.0 FR default, some CC0 (terms page) → derived.
- Common Voice ja 27.0: CC0 copyright waiver but platform terms
  prohibit re-hosting/speaker ID → derived with acquisition-only
  rule (raw audio never bundled; manifest + upstream fetch).
- JSUT/JVS audio: research/non-commercial/personal terms → blocked.
- OJAD: academic/educational-only terms → blocked.
- CSJ/BCCWJ: NINJAL application-based research licenses →
  reference-only (aggregate statistics as facts may inform
  project-authored lists).
- Tae Kim: CC BY-NC-SA → blocked for our distribution model.

## Acceptance 3: Unknown/unclear licenses have alternatives or explicit blockers

Every unknown/blocked/reference-only entry carries `alternative` or
`blocker` (test `nonshippable_entries_have_alternative_or_blocker`):
e.g. Waller (unknown) → jkindrix-jld or own frequency lists;
bunpou-db (unknown) → blocker until Imabi/Tae Kim terms verified;
OJAD/NHK (blocked) → IPAdic/UniDic accent fields + authored drills;
JSUT/JVS (blocked) → Common Voice ja; Piper (unknown, archived) →
blocker, Open JTalk interim.

## Boundaries

This matrix is engineering evidence for LIC-001, not a legal
determination; final code/content licensing is owner-only and remains
open. Linguistic content derived from these sources still requires
REVIEW-001 human review; nothing here certifies that.

## Evidence

- `state/evidence/JA-RES-001/cargo-test-2026-10-02.txt` — 3 matrix
  contract tests green (`crates/langpack/tests/source_matrix.rs`).
- `state/evidence/JA-RES-001/ci-2026-10-02.txt` — full `./scripts/ci.sh`
  exit 0 ("CI OK") + handoff validator PASS (48 data files).
