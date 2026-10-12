# Open Language Learning Platform — Development Handoff

Working title only. Rename the product before public release after a naming/trademark check.

This repository package is a **development specification and autonomous-build handoff** for a local-first, open-source language-acquisition platform. The first reference language is Japanese (`ja-JP`), but the core product is intentionally language-independent.

## Current state — public alpha (2026-10-12)

The desktop application runs today on **Linux**. Two reference language packs (`ja-JP`, `ru-RU`) are at **0.3.0** and install from the in-app catalog or by importing a `.lpk` file. Windows and macOS builds are produced but **untested**: a platform moves to *community-confirmed* only when a human who ran that build files a runtime report (`docs/platform/PLATFORM_REPORTS.yaml`, ADR-0015).

What the content actually covers — measured, not asserted: both packs carry units across **every band from on-ramp through B2**. `ja-JP` has 75 goals and 774 units (12 on-ramp, 79 A1, 100 A2, 195 B1, 388 B2) driving 4,359 activities; `ru-RU` has 60 goals and 809 units (20 on-ramp, 90 A1, 99 A2, 200 B1, 400 B2) driving 3,597 activities. Every unit's goal, content reference and assessment id resolves — no dangling ids. The limit is not the unit graph: **every goal in both packs is `review_status: draft`**, so none of it has qualified human review, and the pools under the activity graph are thinner than the graph itself (ja-JP: 3,921 lexicon entries, 679 sentences, 84 kanji, one assessment definition per goal). All first-party content is **AI-drafted** (ADR-0014), which is why pack display names keep their "(Draft)" marker. Pronunciation feedback is **guided-only and makes no accuracy claim to the learner** (ADR-0013, docs/18), and packs are the only source of spoken audio (ADR-0024) — the app never synthesizes speech.

`REL-001` (the desktop release candidate) still needs **12 of the 54 release-required tasks** (ledger: `state/task-state.json`): the assistive-technology audit (ACC-001), performance tiers (PERF-002), platform parity (PLAT-001), the security/privacy audit (SEC-001), qualified human content review for each band (JA-A2-002 / JA-B1-002 / JA-B2-002), and coverage depth in the thin bands (JA-A2-001 / JA-B1-001 / JA-B2-001 carry unit scaffolding across bands but have no acceptance record in the ledger). No agent may mark any of those passed.

Useful first contributions: a **platform runtime report** or a **content review**, both through the issue templates — each feeds an evidence file that the release gates actually read. The app states the version and commit you need for a report under **Settings → About this build**.

## Product in one sentence

Build a game-like learning environment in which progress means **what the learner can understand and do in the target language**, not how many lessons, points, or streak-days they have accumulated.

## Non-negotiable decisions

1. **No streak mechanics.** The product must never reward meaningless activity just to preserve a number.
2. **Speech, listening, reading, and writing are independent competencies.** Reading a word does not prove the learner can understand or pronounce it.
3. **Language packs are a first-class public interface.** A competent human or AI should be able to construct a candidate language pack from the published specification without editing core application code.
4. **AI-generated content is never trusted merely because it is syntactically valid.** Provenance, tests, quality gates, and review states are mandatory.
5. **Local-first and privacy-first.** Microphone recordings remain local by default; online services are optional providers, never hard dependencies.
6. **The language is the gameplay mechanic.** Progress unlocks situations and capabilities rather than merely XP.
7. **No single vendor/model lock-in.** ASR, TTS, alignment, pronunciation analysis, storage, and AI tutoring are provider interfaces.
8. **Offline core path.** A learner must be able to study the installed curriculum and use downloaded speech capabilities without an account or continuous internet connection.
9. **Accuracy over content velocity.** Wrong instruction is a critical defect.
10. **The repository is durable memory.** OMP/LLMs must not depend on chat history for project state.

## Review status

This is a proposed corrected handoff copy prepared on 2026-10-02. Read `REVIEW_REPORT.md` for findings, changes, and remaining implementation/review work. No application, B2 curriculum, benchmark calibration, or qualified human content review has been completed by this audit. The original archive is preserved separately.

## Start here

For an autonomous coding agent, read files in this order:

1. `START_HERE_OMP.md`
2. `AGENTS.md`
3. `docs/00_MASTER_SPEC.md`
4. `tasks/ROADMAP.yaml`
5. Only the documents listed by the selected task's `read_first` field.

Do **not** load every document into context for every task.

## Major documentation

- `docs/00_MASTER_SPEC.md` — authoritative product contract
- `docs/01_PRODUCT_AND_UX.md` — user experience, game structure, anti-streak rules
- `docs/02_LEARNING_SCIENCE.md` — pedagogical model and evidence boundaries
- `docs/03_CURRICULUM_AND_MASTERY.md` — typed curriculum graph, learner model, mastery and scheduling
- `docs/04_LANGUAGE_PACK_SPEC.md` — public language-pack architecture
- `docs/05_SPEECH_SYSTEM.md` — local ASR, alignment, pronunciation/prosody feedback
- `docs/06_JAPANESE_REFERENCE.md` — Japanese-specific reference requirements
- `docs/07_TECHNICAL_ARCHITECTURE.md` — recommended software architecture
- `docs/08_DATA_AND_PRIVACY.md` — storage, privacy, sync boundaries, threat model
- `docs/09_TESTING_AND_ACCEPTANCE.md` — quality gates and definition of done
- `docs/10_LICENSING_AND_PROVENANCE.md` — licenses, source tracking, dataset rules
- `docs/11_ACCESSIBILITY_AND_LOCALIZATION.md` — accessibility and UI localization
- `docs/12_OBSERVABILITY_AND_RESEARCH.md` — privacy-safe metrics and efficacy evaluation
- `docs/13_RELEASE_AND_DISTRIBUTION.md` — builds, models, packs, release channels
- `docs/14_FAQ_AND_DECISIONS.md` — anticipated product/engineering questions
- `docs/15_AUTONOMOUS_DEVELOPMENT.md` — how OMP should execute unattended
- `docs/16_CONTENT_AUTHORING_AND_REVIEW.md` — review and trust-promotion protocol
- `docs/17_SPEECH_BENCHMARK_PLAN.md` — provider and calibration protocol
- `docs/18_PUBLIC_CLAIMS_AND_SCOPE.md` — claim and completeness gates
- `docs/19_PROJECT_FILE_ARCHITECTURE.md` — file ownership boundaries
- `docs/SOURCES.md` — research/source registry

## Scope target

The architecture must support CEFR A1–C2-like capability ranges. The **first public-quality Japanese release should be complete and validated through at least independent-user/B2-level communicative coverage**, with the architecture and content pipeline capable of continuing through C1/C2. Advanced content must not be faked to claim completeness.

## Repository status

This handoff package is a specification scaffold, not a finished application. `tasks/ROADMAP.yaml` is designed so an autonomous agent can bootstrap the implementation and continue through the milestones while persisting status in `state/`.

## Validate this handoff

Use Python 3.10 or newer in a virtual environment. This validates the specification scaffold; it does not build an application or certify educational quality.

```bash
python3 -m venv .venv
# POSIX shells
. .venv/bin/activate
# Windows PowerShell instead: .venv\Scripts\Activate.ps1
python -m pip install -r tools/requirements.txt
python tools/validate_handoff.py
python -m unittest discover -s tools -p 'test_validate_handoff.py'
```

See `schemas/README.md` for the exact validation scope, draft-reference warning, and stricter pack-readiness command. The pack SDK CLI described in docs/04 exists (`crates/langpack`, `langpack` CLI: validate/lint/test/build/catalog/install).

## Intended handoff boundary

The default implementation goal is the desktop Japanese B2-like **release candidate** defined by `REL-001`, with the gate set ADR-0017 records: nothing in this project is funded, all content is AI-created, and the human gates that remain (security review, privacy review, assistive-technology audit, hands-on test pass) belong to the owner and cannot be self-certified by an agent. There is no human speech-calibration dataset, so pronunciation feedback stays guided-only and makes no accuracy claim to the learner. Earlier partial alpha/beta builds may be useful without changing that goal. Optional AI, mobile, web, and advanced content remain separate scope. Preparing a release candidate does not authorize public publication, external messages, paid services, or signing/store credentials. Licensing is settled (`LIC-001` closed 2026-10-04): application code Apache-2.0 (ADR-0010), original pack content CC-BY-4.0, dictionary-derived data CC-BY-SA-4.0; note that a license is a permission grant, not proof of authorship, and third-party obligations (JMdict/EDRDG CC BY-SA 4.0, fonts, whisper terms, the GPL-3.0 `espeak-ng-data` payload per ADR-0009) are unchanged by AI-only authorship. Public distribution still requires explicit owner publication authorization.
