# 10 — Licensing, Provenance, and Content Governance

## Rule

If we cannot explain where content/model/data came from and under what rights it is redistributed, it does not ship.

## Separate licenses

Always distinguish:

- application source-code license;
- dependency license;
- language-pack content license;
- dictionary/corpus license;
- audio/image asset license;
- ML model code license;
- model weights license;
- voice/model training-data restrictions where known.

A permissive inference library does not imply its downloaded model is permissively licensed.

## Recommended project source license

OMP should evaluate MIT vs Apache-2.0 during bootstrap and record an ADR. Apache-2.0 is a reasonable default for a broad open-source SDK due to explicit patent language, but owner preference controls final choice.

Do not stamp a final license without verifying all intended bundled code/content compatibility.

## Japanese candidate sources

### JMdict / EDRDG

EDRDG states its dictionary files are available under Creative Commons Attribution-ShareAlike 4.0, with attribution requirements. Derived dictionary data must be handled in accordance with those conditions.

Use a clearly isolated data-import/generated layer and preserve attribution, modification notices, license text/links, and applicable share-alike terms for dictionary adaptations. Isolation makes the audit easier; it is not a legal determination that a particular combination avoids obligations. Resolve uncertain derivative/collection boundaries before redistribution.

### Mozilla Common Voice

Current Japanese Common Voice releases are published as CC0 datasets. Dataset size and release version change over time. Use as a candidate ASR evaluation/training resource only after confirming the exact release metadata and model-training implications.

### OJAD

OJAD's published terms describe educational/academic use and ask users to refrain from for-profit ventures. Do not bundle/scrape its data for general redistribution without explicit compatible permission. It may be a research/reference resource.

### Open JTalk / pyopenjtalk

Code and bundled dictionaries/voices can carry different licenses. Audit each component. Current pyopenjtalk documentation identifies MIT for the wrapper, Modified BSD for Open JTalk, and separate conditions for voices; dictionary notices must be preserved.

## Source registry

Every pack source record should contain:

- source ID;
- title;
- organization/author;
- URL/DOI;
- accessed date;
- type (official framework, dictionary, paper, corpus, asset, model);
- license/terms URL;
- redistribution status: allowed / derived-only / reference-only / unknown;
- attribution text;
- notes;
- content IDs derived from it where practical;
- dataset/model release identifier and artifact hash when used;
- access/use/download terms separate from the copyright license;
- whether data may be re-hosted, participant restrictions, and consent scope;
- verification status and evidence location, distinguishing a candidate from a reviewed dependency.

## AI provenance

AI-generated text records:

- model/provider if known;
- generation date/batch;
- source set supplied to generation;
- validation state;
- human review state.

The AI is not the source for linguistic truth. Record the underlying references.

## Asset generation

Original project-generated art/audio should have contributor/license records. If synthetic media is generated, retain generation provenance and verify provider terms allow redistribution.

## License audit build behavior

`langpack audit-licenses` should fail the reference build on:

- missing license for distributed third-party asset;
- `unknown` redistribution status;
- reference-only source copied into pack;
- attribution requirement with no generated attribution entry;
- incompatible license combination that the policy marks blocking.

## Attribution UI

The app needs a Sources/Licenses screen able to aggregate:

- app dependencies;
- active language-pack sources;
- model/voice licenses;
- required acknowledgements.

## Current draft distribution status

The handoff intentionally has no final application `LICENSE`; Japanese original content is `UNLICENSED-DRAFT`. This is an unresolved public-distribution decision, not permission to distribute the completed project as open source. `LIC-001` prepares compatibility/attribution evidence and records the owner's final code and content choices. Local implementation may proceed while that decision is pending. Never relabel third-party derived content under an incompatible project license.

Common Voice copyright metadata may say CC0 while the download service imposes separate access/use conditions. The checked Japanese release page also prohibits attempts to identify speakers and re-hosting/re-sharing the dataset. Keep raw benchmark data outside the repository and shipped packs; use authorized upstream fetches, a dataset/version/hash manifest, and aggregate results. Verify current service conditions at acquisition. See the exact release link in `docs/SOURCES.md`.
