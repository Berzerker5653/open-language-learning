# 04 — Language Pack Specification

## Purpose

A language pack is a versioned, declarative package that teaches the engine how to represent and teach a target language without embedding that language's curriculum into core application code.

A human or AI author should be able to start from `examples/minimal-language-pack/`, follow the schemas, run the CLI, and produce a structurally valid candidate pack.

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
langpack audit-licenses <path>
langpack build <path>
langpack inspect <archive>
```

The CLI output must be machine-readable with `--json` for use by OMP/CI.
