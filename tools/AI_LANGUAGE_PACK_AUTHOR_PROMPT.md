# Template Prompt — Build a New Language Pack

Use this prompt with an AI coding/content agent. The toolchain runs today: scaffold with `scripts/new-pack.py`, then gate with `cargo run -q -p lts-langpack-cli -- <command> <pack-dir>`.

---

You are creating a candidate language pack for `<TARGET LANGUAGE / LOCALE>` for the Open Language Learning Platform in this repository.

Read, in order:
1. `docs/04_LANGUAGE_PACK_SPEC.md`
2. `docs/10_LICENSING_AND_PROVENANCE.md`
3. `docs/16_CONTENT_AUTHORING_AND_REVIEW.md`
4. `schemas/README.md` and all current schemas
5. `docs/QUICKSTART_PACK_AUTHORING.md` — the ordered route: scope, scaffold (including `scripts/new-pack.py`), gates, the three audio states, review.
6. `tools/pack-templates/example-pack/` (passes `validate`/`lint`) and `tests/fixtures/packs/ja-demo/` (passes every gate, including install mode, with honestly-labelled placeholder audio). `examples/minimal-language-pack/` is a manifest illustration only: it fails `validate` (`script_unknown`) and `test` (`license_inventory_missing`, `redistribution_blocked`, `script_unknown`, `sources_missing`) — do not start from it.
7. `languages/ja-JP/` only as a structural reference, not as a linguistic template.

Your goal is to create a structurally valid, source-grounded **candidate** pack without editing engine code. Script coverage is not an engine limit: declare each script in `language/orthography.yaml` and list it in `manifest.scripts` (an undeclared id is the `script_unknown` error). If something really is missing from the engine, stop and report the gap — do not patch the engine inside an authoring task.

Required process:
- First create a source/license matrix covering official proficiency frameworks where applicable, orthography, phonology/prosody, grammar, lexicon, pragmatics, and speech resources.
- Mark every source as allowed, derived-only, reference-only, blocked, or unknown. Do not copy reference-only material.
- Define language identity, scripts/direction, segmentation/tokenization assumptions, pronunciation/prosody model, dialect/reference variety, and register model.
- Build communicative goals and a prerequisite graph before bulk lesson generation.
- Band every goal with the schema `band:` enum (`on-ramp`, `A1`, `A2`, `B1`, `B2`, `C1`, `C2`). Ground a finite coverage map (`docs/assessment/RELEASE_COVERAGE_<lang>.yaml`) in a NAMED real framework — never invent levels, never claim equivalence or certification. Keep every band "partial (review pending)" until the gates pass; never claim completeness from unit/activity counts (docs/18). Single-band packs are allowed: use only the bands you cover.
- Build content in bounded batches and gate after each batch: `validate`, `lint`, `audit-curriculum`, `audit-lexicon`, `audit-licenses`, `audit-sources` (draft mode) and `test` (install mode, which also enforces audio coverage and redistribution rights) — `cargo run -q -p lts-langpack-cli -- <command> <pack-dir>`.
- Audio is **baked into the pack, never synthesized at read time** (ADR-0016/0023/0024): after authoring any audio-addressable item — every sentence, every phonology contrast item, every script-tagged lexicon entry — run `scripts/generate-pack-audio.py --pack <pack-dir> --language <lang>` so each has a `media/manifest.jsonl` row and its `.wav`; never hand-write or hand-hash manifest rows. Install-mode `validate`/`test`/`langpack build` refuse the pack (`media_asset_missing`) until coverage is complete; the `.wav` bytes stay gitignored. Ship every component on the **"Complete-pack checklist"** in `docs/PACK_AUTHORING_CONTRACT.md` (identity/normalization/orthography/phonology/pragmatics, orthography shards, phonology contrasts, curriculum + dependency mirrors, grammar concepts + dependencies, lexicon + sentences, activities/scenarios, stories, world/environments, assessments, review kit + dated worklists, sources, licenses, media manifest, `tests/README.md`, and the `docs/assessment/RELEASE_COVERAGE_<lang>.yaml` coverage denominator if you band goals) — not just the minimum that validates.
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

## Toolchain readiness and the boundary that remains

The SDK question is settled: `PACK-001`…`PACK-005` are done, the layout and per-type schemas are in `schemas/v0.2/`, and every gate above runs in this repository today (`cargo run -q -p lts-langpack-cli -- …`). A pack that passes all seven gates is **installable**, not validated as teaching material. What remains outside an agent's reach: install mode requires `media/manifest.jsonl` coverage — placeholder rows (`synthesizer.runtime: "fixture"`) are legitimate for a candidate and must never be described as real speech, while a release pack must bake with the ADR-0023 engine — and the review promotion (`review_status`, `reviews.jsonl` records) belongs to a qualified human, never to the author model.

Use a versioned finite capability/review plan. Record model/date/source batch provenance where AI generated material is used. Imported/dynamically generated variants require validation appropriate to their scoring risk. Conformance of a toy second language does not establish a production curriculum or proficiency. Stop at a reviewable candidate; do not contact reviewers, publish, spend, or self-certify human review.
