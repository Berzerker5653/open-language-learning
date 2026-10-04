# Japanese Reference Pack — Draft Scaffold

This folder is intentionally **not a complete Japanese curriculum yet**. It is a schema/conformance seed and a roadmap target.

Migrated in place from schema 0.1 to **0.2** (2026-10-03, K-06): the pack now authors its on-ramp goal graph, unit, a populated first-meeting scenario (`activities/scenarios/first-meeting.yaml`), and the transfer assessment `ja.assess.onramp.greeting-transfer` that the 0.1 manifest previously declared unresolved. 0.1-only files (`SOURCES.yaml`, `LICENSES.yaml`, `orthography/`, `phonology/`, `pragmatics/`, `speech/`) were replaced by the 0.2 layout (`sources.jsonl`, `licenses.jsonl`, `language/orthography.yaml`, `language/phonology.yaml`, `language/pragmatics.yaml`); romanization-scaffold, register, and speech feedback policy narratives live in `docs/assessment/`.

OMP must build the real pack through the research/validation tasks in `tasks/ROADMAP.yaml`. Do not promote this pack beyond `experimental` until review requirements are met.

The sample unit exists to exercise the format. Treat linguistic examples as content requiring normal review before stable release. All AI-assisted prose is marked `draft`/`review-needed` with `generation` provenance; qualified human review (REVIEW-001) cannot be self-certified.

Phonology and speech profiles are intentionally empty: no verified inventory, provider, model, human-reviewed targets, or calibration evidence exists for this pack, so no automatic grading is claimed. Requested model capabilities are research targets, not availability promises.

Install remains blocked only by the owner license decision (LIC-001): `licenses.jsonl` carries pending `UNLICENSED` entries and the manifest sets `redistribution_allowed: false`. The original-content license, actual lesson/reference audio, lexical sourcing, and qualified human content review also remain unfinished.

Use `docs/16_CONTENT_AUTHORING_AND_REVIEW.md` for review promotion and `docs/17_SPEECH_BENCHMARK_PLAN.md` for permissioned evaluation, independent test splits, thresholds, scoring coverage and calibration version binding. Do not create evidence records claiming tests or human approvals that have not occurred.
