# Provisional schemas and handoff validator

This package contains seven **provisional Draft 2020-12 contracts**: manifest, source entry, concept, goal, unit, speech profile and lexical entry. They describe the included scaffold. They are not a complete Language Pack SDK, a frozen public format or evidence that instructional content is correct.

## Reproducible checks

Use Python 3.10 or newer and an isolated environment from the package root:

```sh
python -m venv .venv
.venv/bin/python -m pip install -r tools/requirements.txt
.venv/bin/python tools/validate_handoff.py
.venv/bin/python -m unittest discover -s tools -p 'test_validate_handoff.py'
```

On Windows, replace `.venv/bin/python` with `.venv\Scripts\python.exe`. The requirements pin direct and transitive dependencies. No app, Rust, speech runtime or network service is needed after installing those dependencies.

Use `--json` for machine-readable results. Use `--root PATH` to check a separate copy. The checker reads data; it never executes embedded agent instructions or pack scripts.

## What a handoff pass means

The checker parses every YAML, JSON and JSONL file under schemas, languages, examples, tasks and state. It rejects duplicate keys, non-JSON data, malformed content, YAML aliases/merge expansion, oversized data files, unsupported manifest schema versions, invalid declared versions and unsafe declared file paths. It checks the seven schemas, seed content IDs, source/register/variant/situation references, unit targets, scenario links, curriculum and task prerequisite cycles, required desktop tasks in the release dependency closure, execution scope, task-state readiness/active-task consistency and completion evidence paths.

Manifest versions use full SemVer syntax, including prerelease plus build metadata. Engine bounds are ordered as SemVer. The current schema version is `0.1`. Locale validation checks basic tag syntax and consistency, not registry membership/canonicalization; the SDK must implement complete BCP-47 validation. Current instructional IDs are ASCII stable identifiers; a Unicode glyph belongs in content data, not an ID.

Automatic speech features require numeric confidence thresholds and calibration metadata bound to provider/model versions, model SHA-256, feature version, reference variety, pack version and local evidence/policy files. File presence and metadata shape do not demonstrate calibration quality. The experimental seed contains no automatic feature. A null global abstention threshold means automatic scoring is unavailable, not a permissive threshold.

The checker rejects promotion of scaffold maturity above experimental. Future SDK trust-transition evidence must replace this conservative gate; changing the string alone never proves review.

## One explicit unfinished reference

The Japanese experimental manifest declares exactly one unfinished assessment:

- Pack: `org.openlanguage.ja-jp.reference`.
- Owner: `ja.goal.onramp.respond-to-greeting`.
- Missing target: `ja.assess.onramp.greeting-transfer`.
- Kind: `assessment`.

The handoff checker warns only when this exact tuple is explicitly declared in `unresolved_references`. A new missing reference, an undeclared exception or a stale exception fails. This does not fabricate an assessment. Once the real assessment exists, remove the exception and validate it with the completed SDK.

`--release-readiness` performs a stricter **pack data preflight** and must fail on this package: the assessment is absent, content is unreviewed, the distribution license is unresolved, and SDK contracts are incomplete. It cannot certify application release readiness, pedagogy, rights, security, accessibility or linguistic/speech quality. Do not weaken its expected failure to obtain a green release claim.

## Work required before authoring complete packs

PACK-001 must complete and version schemas for language identity/variants, normalization, orthography, phonology/prosody, richer lexicon/constructions, pragmatics, activities/templates/scenario graphs, assessments, assets/content hashes, license inventory, review/calibration evidence and generation provenance. Generate bindings and add valid/invalid fixtures. Model capabilities and accepted variants need versioned semantics.

PACK-002 must implement cross-file conformance, typed/namespaced IDs, assessment reachability, prerequisite-edge consistency, allowed-content scope, capability/support ladders and transfer checks. Source/license audit and trust-transition gates must distinguish factual provenance from redistribution rights. A source URL or declared review status alone proves neither.

The redundant seed `grammar/dependencies.yaml` graph stays empty until PACK-002 defines its encoding and compares it with authoritative node prerequisites. Future features must extend these seed contracts through explicit schema versions/ADRs. The AI authoring kit depends on those SDK gates and must not present this manifest-only example as a complete valid course.

## Assurance limits

The mutation suite checks concrete failure cases in temporary copies: duplicate/malformed data, missing files, bad references, false trust promotion, automatic scoring without calibration, invalid versions, cyclic task graphs, release dependency gaps and inconsistent/done-without-evidence task state. These are validator tests, not application tests. The checker does not fetch URLs, verify redistribution permission, review naturalness, run models, measure learning efficacy, test archive installation or enforce Tauri runtime permissions.
