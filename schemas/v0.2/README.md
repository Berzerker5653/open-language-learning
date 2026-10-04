# Pack schema 0.2

The 0.2 contract completes the provisional 0.1 seed set: every shipped
logical content type now has a schema. The 0.1 schemas remain frozen at the
`schemas/` root (the handoff checker and the Japanese draft pack depend on
them); `schema_version` in `manifest.yaml` selects the contract.

## Layout contract

| Path | Schema | Shape |
| --- | --- | --- |
| `manifest.yaml` | `language-pack-manifest` | single doc |
| `language/identity.yaml` | `language-identity` | single doc |
| `language/normalization.yaml` | `normalization` | single doc |
| `language/orthography.yaml` | `orthography` | single doc |
| `language/phonology.yaml` | `phonology` | single doc |
| `language/pragmatics.yaml` | `pragmatics` | single doc |
| `curriculum/goals.yaml` | `goal` | `{goals: [...]}` |
| `curriculum/units/*.yaml` | `unit` | single doc |
| `activities/scenarios/*.yaml` | `scenario` | single doc |
| `assessments/definitions.jsonl` | `assessment` | one per line |
| `lexicon/entries.jsonl` | `lexicon-entry` | one per line |
| `orthography/*.jsonl` | `orthography-unit` | one per line |
| `grammar/concepts.jsonl` | `concept` | one per line |
| `sources.jsonl` | `source-entry` | one per line |
| `licenses.jsonl` | `license-inventory` | one per line |
| `reviews.jsonl` | `review-record` | one per line |
| `speech/profiles.jsonl` | `speech-profile` | one per line |
| `phonology/contrasts.jsonl` | `phonology-contrast` | one per line |
| `sentences/entries.jsonl` | `sentence` | one per line |
| `stories/*.yaml` | `story` | single document |

`media/**` holds binary assets. Markdown/txt docs and `LICENSE`/`NOTICE*`
are allowed anywhere. Anything else is reported as `unknown_file`.

## Identifier namespaces

- **Content IDs** (`goal`, `unit`, `activity`, `scenario`, scenario node,
  `assessment`, lexicon entry, `concept`, script, phonology feature,
  `sent` sentence, `story` story, register, situation) must satisfy the shared grammar
  `^[a-z0-9]+(?:[._-][a-z0-9]+)*$` with at least a locale segment and a
  known kind segment (see `lts-domain::ContentKind`), and the first segment
  must equal the manifest `target_locale` primary subtag
  (e.g. `es.orth.latin`, `ja.phon.long-vowel`).
- **Record IDs** (`source-entry`, `license-inventory`, `review-record`,
  `speech-profile`, normalization rule names) match the same character
  grammar but are file-local, not namespaced.
- References between documents are resolved by the validator; unknown
  references are warnings in `scaffold` mode and errors in `install` mode.
  A draft pack may declare exceptions in
  `manifest.unresolved_references`, which still block install.

## Prerequisite records (docs/03 §7)

0.1 bare prerequisite IDs are invalid in 0.2. Each prerequisite is a record
`{target, dimension, required_state, strength}`. `lts-langpack::migrate`
converts bare IDs to conservative defaults flagged `migrated_from:
"0.1-bare"`; the validator warns until a human confirms the implied
dimension/state. Deferred-modality tracks are representable: prerequisites
scoped to speaking dimensions are valid even when the pack's speaking
capability is off.

## Validation modes

`langpack validate <dir> [--mode scaffold|install] [--json]
[--engine-version X]`

- `scaffold`: author-time posture. Draft state, declared unresolved
  references, and pending licenses are tolerated (info/warning).
- `install`: promotion gate. Declared/undeclared unresolved references,
  missing or blocking license inventory, and `redistribution_allowed:
  false` all fail. Handoff scaffold validation never confers installation
  or release eligibility.

Exit codes: 0 clean, 1 validation errors, 2 load/usage error.

## Conformance fixtures

`tests/fixtures/packs/` holds valid and invalid packs per contract rule;
`crates/langpack/tests/validate.rs` asserts the expected actionable
diagnostics for each.
