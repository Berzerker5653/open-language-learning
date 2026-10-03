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
- `UX-001` — onboarding: local profile (no account), bundled Japanese
  demo pack install via allowlisted ids, skippable microphone, honest
  privacy notice; desktop smoke handshake preserved (evidence:
  `state/evidence/UX-001/`).
- `UX-002` — home with scheduler-reasoned next actions (no streaks),
  5/10/20/30-minute budgeted practice from due/weak/progression inputs,
  per-dimension capability progress (evidence: `state/evidence/UX-002/`).
- `WRITE-001` — Japanese typing/composition: keyboard/IME-only input
  surface (handwriting unmodeled), variant-tolerant grading, writing
  evidence dimension-distinct from recognition (evidence:
  `state/evidence/WRITE-001/`).
- `M4-E2E` — no-speech vertical slice: fresh user completes the
  ja-demo on-ramp (encounter text placeholder -> recall -> IME typing),
  state persists, restart resumes with due reviews; E2E test covers the
  flow; no streak/heart mechanics (evidence: `state/evidence/M4-E2E/`).
- `SPEECH-001` — reproducible local ASR benchmark (whisper.cpp vs
  sherpa-onnx, pinned models/checksums, CER proxy + latency/RAM/size/
  license/timestamps; GPU + low tiers recorded unmeasured); ADR-0007
  selects sherpa-onnx default, whisper.cpp fallback (evidence:
  `state/evidence/SPEECH-001/`).
- `SPEECH-003` — model manager: versioned/checksummed/licensed
  removable models, staged atomic installs, corruption-aware status,
  on-demand download, base app bundles zero models (evidence:
  `state/evidence/SPEECH-003/`).
- `SPEECH-002` — local speech pipeline: energy VAD + quality gate
  (silence/clipping/empty → neutral retryable rejections, never
  negative mastery), sherpa-onnx subprocess ASR over installed model
  files; whole suite passes in a network-disabled namespace
  (evidence: `state/evidence/SPEECH-002/`).
- `SPEECH-004` — constrained alignment prototype: whisper.cpp word
  offsets + Needleman-Wunsch unit matching; abstains on mismatch/low
  confidence; ADR-0008 records embedded-runtime vs preparation-tooling
  (evidence: `state/evidence/SPEECH-004/`).
- `SPEECH-005` — guided pronunciation feedback MVP: vowel-length
  contrast (おばさん/おばあさん) declared in pack phonology + speech
  profile (assess-guided, calibration null); duration features,
  rate-normalized comparison, abstention with reasons; in-memory
  attempt + pack reference playback (evidence:
  `state/evidence/SPEECH-005/`).
- `SPEECH-006` — normalized F0 visualization: autocorrelation prosody
  with reliability masking and octave-jump detection; semitone-relative
  contours (no absolute-Hz rule); accessible SVG + text shapes;
  reference-only pack profile (evidence: `state/evidence/SPEECH-006/`).
- `TTS-001` — local Japanese TTS: sherpa-onnx Kokoro subprocess provider
  (Apache-2.0 model chain verified; espeak-ng-data GPLv3 flagged for
  LIC-001), pinned model catalog, TTS benchmark protocol + dev-tier
  results (RTF p50 1.43), media-first `speech_audio` with
  `licensed-recording`/`model-output` provenance labels (evidence:
  `state/evidence/TTS-001/`, `docs/provenance/tts-candidates.md`).
- `GAME-001` — capability-gated world layer: `lts-world` crate (deps:
  `lts-domain` only), declarative environments, pure `evaluate` over a
  capability snapshot; no counts/dates/streak parameters exist in the
  API; desktop `world_state` + "Places you can go" home section
  (evidence: `state/evidence/GAME-001/`).
- Owner direction 2026-10-03 (not a ROADMAP id): MIT app license +
  `THIRD-PARTY-NOTICES.md`; ja-JP draft provenance analysis
  (`docs/provenance/ja-jp-draft-content.md` — project-original, no
  copied third-party text); speech distribution audit
  (`docs/provenance/speech-distribution-audit.md` — Kokoro/espeak-ng
  chain confirmed absent from distributable builds); community pack
  catalog + local import + language switching
  (`apps/desktop/src-tauri/src/packs.rs`, `apps/desktop/src/language.tsx`,
  `catalog/packs.json`, `templates/language-pack-template/`,
  `docs/packs/CONTRIBUTING.md`) (evidence: `state/evidence/OWNER-DIR-2026-10-03/`).

## Next task

Remaining ROADMAP gates after the 2026-10-03 owner direction:
`REVIEW-001` (qualified reviewer capacity — blocks the whole JA-A1→B2
content chain) and `SPEECH-007` (owner-supplied preregistered
calibration recordings, docs/17). `LIC-001` is largely resolved: app
code is MIT with third-party notices; the Kokoro/espeak-ng TTS chain is
excluded from distributable builds pending an owner call
(docs/provenance/speech-distribution-audit.md); the only open piece is
the content license for project-original pack material (recommend
CC-BY-4.0). An honestly labeled preview (draft content, community
packs, guided-but-uncalibrated speech practice) is the sanctioned
posture while review/calibration remain pending. `active_task` stays
null: no ROADMAP task is unblocked without owner input.

## Owner decisions already resolved

## Owner decisions from 2026-10-03 direction

- Application code: MIT, third-party licenses preserved and scoped
  (`LICENSE`, `THIRD-PARTY-NOTICES.md`).
- ja-JP draft: keep (provenance supports distribution as
  project-original); document, don't replace. Review gates unchanged.
- Community packs on GitHub releases are a supported path; they stay
  labeled community and never satisfy review/calibration gates.
- Kokoro/espeak-ng TTS chain stays out of distributable builds until a
  licensing call; report tradeoffs before replacing (done:
  `docs/provenance/speech-distribution-audit.md`).
- Preview posture allowed: honestly labeled draft content + guided
  speech practice; no B2/calibrated/1.0 claims without evidence.

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
