# Project Status

Generated handoff state: 2026-10-02

## Overall

Implementation started 2026-10-02. M1 complete; M2 learner core underway with the SQLite profile store in place.

## Current milestone

M2 — Local data and learner model

## Completed tasks

- `BOOT-001` — monorepo, toolchains, CI, ADR-0004 (evidence: `state/evidence/BOOT-001/`).
- `ARCH-001` — domain IDs/versions/evidence/mastery/curriculum/pack model + speech provider
  contracts (evidence: `state/evidence/ARCH-001/`).
- `BOOT-002` — Tauri 2 shell + shared UI skeleton + automated launch/home-route smoke test
  (evidence: `state/evidence/BOOT-002/`).
- `BOOT-003` — lint/quality gates, ADR + fixture conventions, secret scan + dependency audit
  baselines (evidence: `state/evidence/BOOT-003/`).
- `PERF-001` — named hardware tiers, provisional frozen-then-measured budget contract
  (`docs/performance/BUDGETS.yaml`, evidence: `state/evidence/PERF-001/`).
- `PACK-001` — 0.2 pack schemas for every logical content type, structural +
  semantic validator (`crates/langpack`), `langpack validate` CLI with JSON
  output, 0.1→0.2 prerequisite migration, conformance fixtures; 0.1 seed draft
  validates as scaffold and correctly fails install gates (evidence:
  `state/evidence/PACK-001/`).
- `PACK-002` — cross-file curriculum graph: prerequisite cycles with cycle
  path, dependencies.yaml mirror consistency, unreachable/dead goal audit
  (evidence: `state/evidence/PACK-002/`).
- `PACK-003` — source/license audit (`langpack audit-licenses`): blocked
  redistribution, reference-only bundling, missing license/attribution;
  attribution report; seed correctly non-distributable pending LIC-001
  (evidence: `state/evidence/PACK-003/`).
- `PACK-004` — deterministic `lts-pack/1` archives; hardened install
  (traversal/hash/bomb/symlink/unlisted-entry rejection, install-mode
  gate); store with atomic current pointer; upgrade/rollback
  (evidence: `state/evidence/PACK-004/`).
- `PACK-005` — full author CLI workflow (`init`/`lint`/`test`/
  `audit-curriculum`/`audit-sources` added), provenance audit,
  contributor quickstart (`docs/QUICKSTART_PACK_AUTHORING.md`),
  init→validate→build→inspect round-trip test
  (evidence: `state/evidence/PACK-005/`).
- `DATA-001` — SQLite profile store (`crates/storage`): forward-only
  migrations (v1→v2 tested from initial schema), offline profile
  creation, append-only evidence with duplicate-id rejection,
  metadata-only opt-in recordings, no BLOB columns (ADR-0005)
  (evidence: `state/evidence/DATA-001/`).
- `LEARN-001` — typed evidence events: `AttemptDraft` builder
  (support/confidence/content versions), `failure_reason` for
  technical speech failures (migration v3), restart-queryable —
  (evidence: `state/evidence/LEARN-001/`).
- `LEARN-005` — frozen versioned mastery policy
  (`docs/assessment/MASTERY_POLICY.yaml` v0.1.0, provisional
  hypotheses), strict loader + deterministic evaluator, 9 worked
  fixtures covering transitions/regression/exclusions/deferred tracks
  (evidence: `state/evidence/LEARN-005/`).
- `LEARN-002` — derived multimodal mastery: per-dimension
  `derive_mastery` (reading never grants speaking), uncalibrated
  confidence capped at 0.9 with support/diversity/recency factors,
  regression + needs-refresh, versioned snapshots in storage
  (evidence: `state/evidence/LEARN-002/`).
- `LEARN-003` — scheduler abstraction + FSRS spike: `Scheduler` trait,
  dependency-free `FsrsSpike` (labeled placeholder params, FSRS-4.5
  shape), evidence→rating mapping that never reviews unscored events,
  per-item due-time persistence + due query, bit-deterministic under
  fixed clock; research note compares fsrs-rs/rs-fsrs/ts-fsrs licenses
  (evidence: `state/evidence/LEARN-003/`).
- `LEARN-004` — session planner: 5/10/20/30+ budgets, balances due
  review / weak skills / progression with modality repetition caps,
  no attendance/streak objective, pure-function reproducible plans
  (evidence: `state/evidence/LEARN-004/`).
- `DATA-002` — profile export/import: versioned JSON bundle,
  round-trip preserves evidence/mastery/settings, import never
  silently overwrites (NewProfile/PreserveId/Overwrite modes),
  recordings opt-in, no binary payloads (evidence:
  `state/evidence/DATA-002/`).
- `JA-RES-001` — authoritative Japanese source + license matrix:
  31 entries across 7 categories with verified licenses,
  classification (allowed/derived/reference-only/blocked/unknown) and
  alternative-or-blocker for every non-allowed entry; contract tests
  (evidence: `state/evidence/JA-RES-001/`).
- `JA-RES-002` — Japanese phonology assessment model: segment/
  phonotactics/prosody inventory (`docs/assessment/JA_PHONOLOGY.yaml`,
  ids `ja.phon.*`), reference-variety + variant policy, pitch accent
  assess-guided only pending SPEECH-007 calibration (evidence:
  `state/evidence/JA-RES-002/`).
- `JA-RES-003` — orthography + script policy: kana on-ramp, kanji
  selection by frequency/communicative value (never arbitrary lists),
  adaptive furigana, romaji fade support, comprehension/production
  competency separation (`ja.orth.*` ids) (evidence:
  `state/evidence/JA-RES-003/`).
- `JA-RES-004` — Japanese goal graph: 15 draft goals on-ramp→B2 with
  scoped prerequisite records, JF-standard band refs, required
  concepts; DAG validated, all `review_status: draft` (evidence:
  `state/evidence/JA-RES-004/`).
- `JA-RES-005` — grammar/pragmatics dependency map: draft pack
  `tests/fixtures/packs/ja-curriculum-draft` with 21 concepts,
  authoritative concept→concept dependency edges (cycle +
  missing-dependency checked), 6-register 0–4 formality model with
  16 multi-register situations — politeness contextual, not binary
  (evidence: `state/evidence/JA-RES-005/`).
- `JA-RES-006` — reviewed lexical import pipeline: reproducible
  byte-identical imports into separate `lexicon/imported-*.jsonl`,
  curriculum never touched, generated derived-from-source license +
  attribution, non-redistributable sources rejected, imported entries
  always draft with no teaching order (evidence:
  `state/evidence/JA-RES-006/`).
- `ACT-001` — activity runtime + support ladder: four activity kinds
  (encounter/comprehension/retrieval/explanation) render from pack data
  as serializable specs; hint/replay/translation actions recorded in
  evidence with ordinal levels; correct-with-strong-help never flagged
  independent and derives lower mastery (evidence:
  `state/evidence/ACT-001/`).
- `READ-001` — adaptive kana/furigana/romaji support: visibility
  adapts to per-item reading mastery + user modes; reveals always
  available and recorded as support; canonical stays Japanese script;
  reading evidence never touches listening/speaking dimensions
  (evidence: `state/evidence/READ-001/`).
- `SCENARIO-001` — data-driven scenario runtime: pack-defined graph
  with intents, support ladder, recovery branches (ADR-0006 schema
  extension), transfer variants; per-node evidence; identical code
  path for Spanish and Japanese scenarios (evidence:
  `state/evidence/SCENARIO-001/`).

## Next task

`UX-001` — onboarding + privacy-first Japanese selection (M4, P0).
Note: `REVIEW-001` (reviewer capacity) and `LIC-001` (final licensing
decisions) are owner-only and remain open blockers for release.

## Owner decisions already resolved

- OMP-only autonomous development workflow.
- No streaks.
- Local-first/offline-capable core.
- Japanese is the first reference language.
- Language packs must be AI-authorable and declarative.
- Speech recognition and pronunciation analysis are separate.
- Privacy defaults to local microphone processing.

## Do not ask the owner again for these unless they explicitly change them.

## Environment note (native builds)

`webkit2gtk-4.1` is not installed system-wide and `sudo` needs a password. BOOT-002 is unblocked
via the user-local sysroot (`scripts/setup-tauri-sysroot.sh` + `scripts/tauri-env.sh`); smoke and
CI pass. Optional owner convenience: `sudo pacman -S webkit2gtk-4.1` makes the workaround inert.

## Handoff audit status

Proposed corrections prepared 2026-10-02; original archive preserved. Handoff validation passes
(44 validator tests); strict pack preflight fails as expected (11 blockers) and those requirements
are preserved. Implementation began 2026-10-02.

Default goal: desktop Japanese B2-like release candidate (`REL-001`). Optional AI/mobile/web/advanced work and public publication require separate scope. Before public release, source-code and original-content licenses remain owner decisions (`LIC-001`); qualified review capacity, source rights and speech calibration are still future gates. See `REVIEW_REPORT.md` for findings and validation limits.
