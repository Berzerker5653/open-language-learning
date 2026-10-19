# 04 — Language Pack Specification

## Purpose

A language pack is a versioned, declarative package that teaches the engine how to represent and teach a target language without embedding that language's curriculum into core application code.

A human or AI author should be able to start from a scaffold, follow the schemas, run the CLI, and produce a structurally valid candidate pack. The scaffold is `scripts/new-pack.py` and the ordered route, including the seven gate commands, is `docs/QUICKSTART_PACK_AUTHORING.md`; two generated packs that pass every gate are checked in as conformance proofs (`examples/eo-community/`, `examples/ar-ma/`).
`examples/minimal-language-pack/` is a manifest illustration of the smallest legal manifest — measured at this head it fails `validate` with 1 error (`script_unknown`) and install-mode `test` with 4 errors, so it is not a starting point for a candidate pack.

## Design principles

- declarative by default;
- schema validated;
- stable IDs;
- explicit dependencies;
- source/provenance attached to claims and assets;
- language-specific capabilities declared rather than assumed;
- no arbitrary executable code;
- deterministic build output where practical;
- semantic versioning;
- engine compatibility ranges;
- pack migrations are explicit.

## Archive layout

Canonical source layout:

```text
<locale>/
  manifest.yaml
  README.md
  SOURCES.yaml
  LICENSES.yaml
  language/
    identity.yaml
    variants.yaml
    normalization.yaml
  orthography/
    scripts.yaml
    transliteration.yaml
    symbols.yaml
  phonology/
    inventory.yaml
    features.yaml
    prosody.yaml
  lexicon/
    vocabulary.jsonl
    expressions.jsonl
  grammar/
    concepts.yaml
    constructions.yaml
    dependencies.yaml
  pragmatics/
    registers.yaml
    situations.yaml
    culture.yaml
  curriculum/
    goals.yaml
    units/*.yaml
    assessments/*.yaml
  speech/
    profile.yaml
    accepted-variants.yaml
    rubrics.yaml
  activities/
    templates/*.yaml
    scenarios/*.yaml
  world/
    environments.jsonl
  assets/
    audio/
    images/
  tests/
    conformance/
    curriculum/
    regression/
```

Files may be split differently for scale if the schema and build tool produce the same logical model.

## Manifest

The manifest declares:

- pack ID;
- display name;
- BCP-47 target locale;
- learner/interface source language(s);
- optional world collection (`world: environments.jsonl`, ADR-0018);
- pack version;
- schema version;
- compatible engine range;
- authors/contributors;
- trust/maturity state;
- declared scripts;
- declared capabilities;
- optional model bundles;
- license summary;
- content hashes in built form.

See `schemas/language-pack-manifest.schema.json`.

## Language identity

Must describe:

- canonical BCP-47 locale;
- language name(s);
- default script/direction;
- supported regional/dialect variants;
- default teaching variant;
- segmentation/tokenization assumptions;
- case behavior if relevant;
- punctuation/spacing behavior at the level required by the engine.

The engine must not assume spaces, left-to-right text, alphabetic scripts, grammatical gender, tense systems, or English-like word order.

## Orthography

Declare one or more writing systems and how they are introduced. Data may include:

- graphemes/symbols;
- readings/pronunciations;
- composition rules;
- variant forms;
- direction;
- learner transliteration;
- temporary scaffolds;
- handwriting targets if supported.

Transliteration is a scaffold, not the canonical representation unless the language itself uses that script.

## Phonology/prosody

Declare features the teaching system may care about:

- phoneme/phone inventory;
- syllable/mora/other timing units;
- contrastive length;
- tones;
- lexical accent;
- stress;
- gemination;
- aspiration;
- phonotactics;
- connected-speech processes;
- intonation/prosody.

Not every feature needs automated scoring. Each feature declares whether it is `teach`, `assess-automatic`, `assess-guided`, or `reference-only`.

### Production scoring targets (language-neutral)

A `phonology/contrasts.jsonl` entry may carry an optional `production` block
declaring the target the engine compares a spoken attempt against (e.g. a
`voiced-duration-ratio` with an `expected_ratio`). The engine reads the declared
number and **never infers the phonology itself** — mora counting, syllable
weight, tone contours, etc. are the pack author's derivation, not engine logic.
This is how every language supplies its own target: a Japanese author derives
`expected_ratio` from mora counts (obaasan 5 / obasan 4 = 1.25); a Finnish or
German author derives it from their language's own length phonology; a tone
language would declare a different `measure`. Absent a `production` block, the
feature cannot score production and falls back to a reference recording (or
abstains). Declared targets are **uncalibrated** until SPEECH-007; they are
guided-only and must not carry a calibrated/certified label.

## Lexicon

Each lexical entry should support:

- stable ID;
- forms;
- readings;
- meanings/glosses;
- part of speech or language-appropriate category;
- register;
- variants;
- prerequisite orthography/phonology where relevant;
- example references;
- semantic tags;
- optional `band` and `framework_refs` using the same band vocabulary as
  curriculum goals (`on-ramp`, `A1`…`C2`) — reference alignment only, set only from
  goal linkage in the pack's own curriculum, never a JLPT pass or certification
  claim (docs/18). A dictionary "common word" marker is not a band: it says the
  word is common in the language, not that a beginner meets it at that level.
- `forms[].script` / `readings[].script` use the pack's bare script labels
  (`hiragana`, `katakana`, `kanji`), which is what the engine's kana and ruby
  checks compare against; the `ja.orth.*` ids declared in
  `language/orthography.yaml` are what curriculum orthography references point
  at. Two vocabularies for one idea is a known inconsistency pending a
  reconciliation pass — do not add a third.
- source/provenance IDs;
- review/trust status.

Do not embed proprietary dictionary text without compatible rights.

## Grammar

Represent teachable constructions as structured concepts, not one enormous prose grammar file. A construction may specify:

- ID;
- communicative functions;
- form/pattern representation;
- constraints;
- prerequisites;
- examples;
- common learner errors;
- register;
- related/contrasting constructions;
- sources;
- review state.

Language packs may include prose explanations for learners, but the engine-facing graph remains structured.

## Pragmatics and culture

Pack data must be able to teach appropriateness, not only grammaticality. Include registers, social relationships, speech acts, repair/clarification behavior, and cultural context where needed.

Culture notes must avoid presenting broad stereotypes as rules. Distinguish conventions, tendencies, region/generation differences, and context-dependent behavior.

## Curriculum goals

A goal is a real-world capability. Required fields include:

- stable ID;
- human description;
- framework alignment if any;
- prerequisites;
- modalities;
- contexts as references to declared situation IDs, with display labels kept in situation data;
- required knowledge/skills;
- assessment plan;
- transfer criteria;
- source/review metadata.

## Unit files

Units are delivery groupings, not the truth source for prerequisite order. Units reference graph nodes and scenario activities. Reordering a unit must not destroy mastery history.

A unit may declare an optional `capabilities` array (ADR-0021): a closed list
of feature names, currently only `script-introduction`. Each entry is a claim
the app MAY surface for the unit — not an instruction to run; naming a
capability makes nothing in the engine execute, and the engine never matches
script names or file layout. `script-introduction` declares that the unit's
items are the writing-system set a new learner is introduced to first, which
is how the app can teach a script without knowing what it is called. A claim
without content is meaningless, so a unit that declares capabilities must
reference at least one content item (`unit_capability_items_missing`
validation error), and an unknown feature name fails schema validation so a
typo cannot silently disable the feature. A pack that declares no capabilities
keeps its existing behavior: the app offers no script instruction for it,
which is a supported state, not an error.

A unit may also declare an optional `requires_unit` array (ADR-0022):
`{unit: <unit id>, state: <masteryState>}` entries, at least one, all
required (AND semantics). The unit's content becomes NEW material only when
every content item the named unit references has derived state ≥ the named
state — the pack-declared form of "advanced content requires prior units'
items at Introduced or better" (`docs/03`). ja-JP gates the katakana chart
behind all five hiragana chart units at `introduced`, so a learner meets the
hiragana chart once, in the pack's order, before katakana-riding material
appears; because a word's letters must each have been introduced (see the
learned-kana rule in ADR-0022), the same unit order bounds which words can
appear and when. The gate filters the NEW pool only; due reviews and
already-introduced items keep scheduling normally. A gate that can never be
satisfied — self-reference (`unit_gate_self_reference`), a target that is not
a declared unit (`unit_gate_not_a_unit`), or a unit in a gate cycle
(`unit_gate_cycle`) — is an error in every mode; a gate on an undeclared id
follows the unresolved-reference rule.

A unit may declare an optional `task_sequence` object (ADR-0037): five
required roles — `input`, `scaffolded`, `independent`, `transfer`, `reuse` —
each naming one activity id in the pack. It states, in pack data, that this
unit's goal is exercised end to end: the learner meets the language with
meaningful input, responds with support, responds without support, uses the
same items in a changed context, and meets them again later. `input`,
`scaffolded` and `independent` name activities of this unit; `transfer` and
`reuse` may name activities of a later unit in the same goal, which is how a
pack that splits a journey across units (introduce, changed context, delayed
reuse) declares one sequence instead of three unrelated lessons. The field is
a claim, not an instruction: nothing in the engine reads it and naming a
sequence executes nothing. `tools/audit_content_templates.py` checks the
claim — every named activity has an engine runner, the scaffolded stage
carries support while the independent stage carries none, the transfer stage
really changes context (it names a scenario, or it lives in a different unit
that reuses this unit's content), and the reuse stage's unit is phase-gated
on this unit — and reports the failures as findings (`task-sequence-*`)
without failing CI, because a sequence claim is a coverage statement, not a
release gate. A pack or band that declares no sequence is reported once per
band (`task-sequence-missing-band`), not once per unit.

## Speech profile

The pack declares:

- ASR locale/model hints;
- normalization rules for transcript comparison;
- units for alignment;
- pronunciation features to teach;
- prosodic features;
- accepted variants/dialects;
- assessment confidence requirements;
- feature-specific feedback templates;
- reference-audio requirements.

## Activities/scenarios

Scenario definitions should be data-driven where possible:

- world/location;
- characters/roles;
- objective;
- allowed learner language;
- expected intents;
- dialogue graph;
- support ladder;
- failure/recovery paths;
- assessment targets;
- difficulty variants.

U07 (2026-10): scenario nodes may carry `action_labels` — a learner-facing
label for every `expected_actions` token; the internal token must never be
what a button shows, and the runtime substitutes a generic word when a
label is absent — and `support` payloads: `{level, kind, text}` with
`kind` in `hint|model|gloss|choices`, plus `options` (≥ 2 readable replies)
for `choices`. Both fields are optional at schema level so 0.1-era packs
stay valid. The validator enforces the promise for packs that declare it:
manifest `capabilities.scenario_help: true` (ADR-0038; absent means false,
a non-bool is a schema error) makes
`scenario_support_rung_undelivered` (every ladder level > 0 needs a
level-matching payload on every node), `scenario_action_label_missing`
(every declared intent token, recovery-branch tokens included, needs a
label once the pack is in the labelled regime), and
`scenario_support_choices_small` (choices help with fewer than two
options) errors in both authoring and install posture. Archives published
before the promise do not declare it and stay installable. Either way the
runtime refuses a ladder rung the current node has no payload for — before
consuming it or stamping the learner's evidence — and says why
(ADR-0038). A pressed-but-empty support button is a validation error in a
declaring pack and an honest refusal in any other, never a silent no-op.

## World environments (`world/environments.jsonl`, ADR-0018)

Unlockable places are pack data; the engine ships none. The manifest key
`world: environments.jsonl` is optional — a pack without it simply offers no
places, which is a valid state, not an error.

One JSON object per line:

- `schema_version`: `1`;
- `id`: pack-unique, `^[a-z0-9][a-z0-9._-]*$` (a scene id, not a content id);
- `display_name`: what the place affords. It must not assert a learning outcome
  or a proficiency level — progression claims belong to the requirements;
- `requires`: one or more `{content_id, modality, min_state}` rules. `modality` is
  restricted to the dimensions a shipped activity can actually record
  (`recall-meaning`, `comprehension-listening`, `orthography-recognition`,
  `phonological-discrimination`, `production-writing`, `orthographic-encoding`);
  `min_state` uses the `MasteryState` vocabulary (`unseen` … `retained`). An
  unlock has to be earnable: gating a place on a dimension nothing in the app
  records (today `comprehension-reading`, where the reader is formative, and
  `production-speaking`, which abstains) would leave a place that can never
  open, so the vocabulary is a schema enum, not a review note. Widen it when a
  runner that records the dimension ships.

Validation errors, never warnings, because none is a legitimate draft state:

- `duplicate_environment_id`;
- `environment_unknown_content` — a requirement naming a content id this pack
  does not declare can never be met;
- `environment_listening_without_audio` — a `comprehension-listening` rule on
  content this pack declares no audio for. Checked only once the pack declares
  audio for anything, so an unbuilt media set stays a legal draft state
  (ADR-0016);
- `world_collection_missing` — the manifest names the collection but the pack
  ships no rows.

Thresholds remain a judgement call: `crates/world` derives unlock state from
derived mastery alone — no activity counts or streaks feed it (ADR-0002) — and a
place asking for `independent` on half a dozen items is one most learners will
never reach.

Pinned by `crates/langpack/tests/world.rs` (absent collection, typed accessor,
unknown content id, duplicate id, declared-but-empty, schema-owned state
vocabulary, unrecordable modality, missing declared audio) and
`world_unlocks_follow_pack_declared_capabilities` /
`a_pack_without_environments_gives_an_empty_world` in `lts-desktop`.

## Sources and licenses

Every externally derived dataset/asset requires an entry in `SOURCES.yaml` and `LICENSES.yaml` or equivalent generated registry. High-impact linguistic claims should reference source IDs. The build must fail on missing required license/provenance metadata.

## Trust states

- `experimental`: incomplete; may contain unreviewed AI content.
- `community`: usable community submission; automated gates pass.
- `validated`: structural/curriculum audits pass and sampled linguistic review exists.
- `verified`: defined linguistic/content review coverage and speech/assessment calibration pass.
- `reference`: maintained by the project as the canonical example of the current spec.

Trust state requirements are defined in testing docs and must become increasingly strict over time.

## AI authoring contract

An AI building a pack must:

1. create a research/source inventory before bulk content generation;
2. declare what sources are redistributable vs reference-only;
3. build the phonology/orthography/grammar capability model before curriculum bulk generation;
4. create functional goals and prerequisite graphs;
5. generate content in bounded batches;
6. run schema + lint + graph audits after each batch;
7. record unresolved questions rather than invent answers;
8. never promote its own pack beyond the trust level warranted by review evidence.

## Compatibility

Built packs include a schema version and compatible engine range. Breaking schema changes require a major schema version and migration tooling/documentation.

## Security

Pack archives:

- cannot contain executable scripts that the app automatically runs;
- cannot write outside their install sandbox;
- have size/file-count limits;
- reject absolute paths and `..` traversal;
- validate hashes before activation;
- only permit whitelisted asset formats;
- treat HTML/Markdown as untrusted and sanitize rendering.

## CLI contract

Target commands:

```text
langpack init <locale>
langpack validate <path>
langpack lint <path>
langpack test <path>
langpack audit-curriculum <path>
langpack audit-sources <path>
langpack audit-lexicon <path>
langpack audit-licenses <path>
langpack build <path>
langpack inspect <archive>
```

The CLI output must be machine-readable with `--json` for use by OMP/CI.
