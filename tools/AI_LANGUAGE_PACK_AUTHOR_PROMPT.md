# Template Prompt — Build a New Language Pack

Use this prompt with an AI coding/content agent **after** the Language Pack SDK exists.

---

You are creating a candidate language pack for `<TARGET LANGUAGE / LOCALE>` for the Open Language Learning Platform in this repository.

Read, in order:
1. `docs/04_LANGUAGE_PACK_SPEC.md`
2. `docs/10_LICENSING_AND_PROVENANCE.md`
3. `docs/16_CONTENT_AUTHORING_AND_REVIEW.md`
4. `schemas/README.md` and all current schemas
5. `examples/minimal-language-pack/`
6. `languages/ja-JP/` only as a structural reference, not as a linguistic template.

Your goal is to create a structurally valid, source-grounded **candidate** pack without editing engine code unless you discover a genuinely missing cross-language capability.

Required process:
- First create a source/license matrix covering official proficiency frameworks where applicable, orthography, phonology/prosody, grammar, lexicon, pragmatics, and speech resources.
- Mark every source as allowed, derived-only, reference-only, blocked, or unknown. Do not copy reference-only material.
- Define language identity, scripts/direction, segmentation/tokenization assumptions, pronunciation/prosody model, dialect/reference variety, and register model.
- Build communicative goals and a prerequisite graph before bulk lesson generation.
- Build content in bounded batches and run `langpack validate`, `lint`, `audit-curriculum`, `audit-sources`, `audit-licenses`, and `test` after each batch.
- Keep skills/modalities independent. Do not assume English grammar, whitespace, alphabetic scripts, tense, gender, or word order.
- For speech, declare which pronunciation features can be taught, automatically assessed, guided, or reference-only. Do not claim automatic scoring without calibration evidence.
- If a linguistic fact is uncertain, create a `REVIEW_REQUIRED` item with sources/questions instead of guessing.
- AI-generated content remains draft/review-needed. Do not self-promote the pack to verified/reference.
- Do not add arbitrary executable code to the pack.

Finish by producing:
1. the candidate pack;
2. a validation report;
3. source/license report;
4. unresolved review questions;
5. recommended human review coverage;
6. any engine capability gap discovered.

Continue autonomously until the candidate pack passes all automated gates or is blocked by a documented source/license/engine limitation.

## SDK readiness and completion boundary

This template becomes executable only after `PACK-001` through `PACK-005` and the review/provenance schemas exist. The current starter schemas and minimal example are scaffold contracts, not a complete SDK. Candidate validation may record unresolved drafts, but a built/installable pack must resolve every required reference and every redistributed asset's rights.

Use a versioned finite capability/review plan. Record model/date/source batch provenance where AI generated material is used. Imported/dynamically generated variants require validation appropriate to their scoring risk. Conformance of a toy second language does not establish a production curriculum or proficiency. Stop at a reviewable candidate; do not contact reviewers, publish, spend, or self-certify human review.
