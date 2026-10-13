# Project Status

Snapshot generated 2026-10-02 and not maintained since; the text below
describes the M1/M2 tree. For the current state read `tasks/KANBAN.md` (board),
`docs/13_RELEASE_AND_DISTRIBUTION.md` (what is shipped and proven) and
`state/task-state.json` (machine-readable task statuses). The entries below are
kept as the historical record of the early milestones.

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
- Preview build-out 2026-10-03 (owner-authorized, not a ROADMAP id):
  original `eo-demo` pack (CC-BY-4.0, unreviewed), single-active-pack
  switching, empty-catalog + missing-TTS messaging, local release
  archives + `catalog/preview-entries.json` (no URLs invented),
  `state/PREVIEW_READINESS.md`, first-run journey test
  (evidence: `state/evidence/PREVIEW-2026-10-03/`).
- AI screening + corrections 2026-10-05/06 (owner-directed, not a ROADMAP id):
  full model-a screening pass over all 433 batches of both reference packs
  (1,252 flags); deterministic dictionary-gated fixes: 347 ja reading
  corrections + 2 duplicate ids removed (ja-JP 0.2.0), ru stress/pos/gender
  corrections (ru-RU 0.2.0); validator `duplicate_id` gap for v0.2 lexicon
  entries fixed with regression test; owner cloud-model packet
  (`docs/review/screening-packet-2026-10-05.zip`) stays optional second
  opinion (evidence: `docs/review/ai-screening-2026-10-05/` incl.
  `CORRECTIONS.md` + `applied.jsonl`).
- Speech-calibration prep 2026-10-06 (owner direction: unblock calibration,
  "plan it now, no data yet"; not a ROADMAP id): frozen preregistration protocol
  `benchmarks/speech/protocols/ja-JP/vowel-length-0.2.0.yaml` (limits 0.05 /
  0.60 / kappa 0.70, cluster-bootstrap CI rule, sampling plan), consent +
  data-handling instrument (`benchmarks/speech/consent/`), labeler rubric +
  qualification (`benchmarks/speech/labeling/`), dataset-sourcing decision
  (`benchmarks/speech/datasets/SOURCING.md` — no open permissioned Japanese
  learner-error corpus; recommend consented recording study), consented-dataset
  manifest template, and end-to-end runbook binding to the registry
  (`benchmarks/speech/CALIBRATION_RUNBOOK.md`). `SPEECH-007` stays **blocked**:
  no data/labels/metrics; automatic scoring stays disabled (evidence:
  `state/evidence/SPEECH-007/prep-2026-10-06.txt`).

- Speech-model selection 2026-10-06 (owner direction: let users control their
  speech models; privacy-first, opt-in, local). Added a **device-level** speech
  preference (`data_dir/speech.json`, `SpeechPref { asr_model }`) defaulting to
  **`off`**; the aligner resolves the selected `whisper.cpp` model (installed or
  vendor fallback) and abstains with `speech-model-off` when off. New IPC
  `get_speech_model`/`set_speech_model` + a radio-group selector in the
  Languages page (size + license + install/remove, honest "guided only, nothing
  uploaded"). `whisper-ggml-base`/`-small` added to the runtime catalog (MIT,
  pinned sha256). `InstalledCombination.model.id` now tracks the selected model
  (registry drift fails closed per model). ADR-0011.
  **Corrected probe finding** (probe now takes `--model`): across tiny/base/small
  the contrast feature scores a continuous minimal-pair take at `align_conf 0.9`
  even on tiny; isolated words abstain by design. **Model size is not the
  pronunciation fix** — what gates feedback is selecting a model (off was
  silently blocking the aligner) + a both-units continuous take. Verification:
  `cargo test --workspace` green (43 desktop lib incl. off-default + guide
  tests), frontend `vitest` 91 green incl. selector test, `tsc` clean (evidence:
  `state/evidence/SPEECH-007/probe-2026-10-06.txt` addendum). `SPEECH-007` stays
  **blocked**; automatic scoring stays disabled; feature ships GUIDED.

- Selector honesty refinement + feature plan 2026-10-06 (owner: "proceed
  forward; then plan the larger-model features"). Reframed the selector copy +
  labels so size is **not** sold as pronunciation accuracy (it is identical
  across sizes for the shipped feature); the choice is framed as privacy +
  device footprint, with a static **recommended** marker on tiny (cheapest
  equivalent; no runtime device-tier detection exists yet — a noted follow-up).
  Frontend `vitest` 91 green incl. updated selector test, `tsc` clean. Wrote a
  forward plan for recognition-heavy features — real recordings/phrase drills
  (no new model, highest ROI), dictation (free ASR, where base/small earn their
  keep), forced-aligner mora feedback, open conversation — with a capability→model
  matrix, tier policy, and sequencing: `docs/SPEECH_FEATURE_ROADMAP.md`
  (**Proposal**, not scheduled; opens no ROADMAP task, `active_task` stays null).

- Phase A start 2026-10-06 (owner: "proceed"). Wired the dev probe to honor the
  in-app selected model: `vowel_length_probe --data-dir <dir>` reads the device
  `speech.json` + runtime catalog and uses the selected ggml file (falls back to
  tiny when `off`); verified base→`ggml-base.bin`, off→tiny. Confirmed the app
  already captures a real mic attempt and the UI already prompts for both words
  in one take (the feature's contract). **Found**: the real `languages/ja-JP`
  pack declares two vowel-length pairs but ships **no** contrast reference media,
  and `pronunciation_demo_at` uses only the first pair with media — so
  broadening the drill is blocked on licensed/TTS reference audio (provenance
  decision), not fabricated. No ROADMAP task opened; `active_task` stays null.

- Feature B — dictation / speak-to-check 2026-10-06 (owner: "proceed with B").
  Shipped a guided prototype: `dictation_check` (IPC) + `dictation_check_at`
  transcribe the learner's spoken sentence with the **selected** whisper model
  (free ASR, `run_whisper_words`), gate on `EnergyVad` quality + a kana-folded
  `char_match` ratio with an uncertain abstain band (this whisper build exposes
  no ASR confidence), and always return `mode: guided` — no grade, mastery, or
  evidence (docs/05, SPEECH-007). UI: `DictationPractice` on a new **Speaking**
  tab, reusing the shared WebAudio capture. ADR-0012. Verification:
  `cargo test --workspace` green (47 desktop lib incl. 4 dictation tests —
  match, never-a-false-match, off-abstain, silence-abstain), frontend `vitest`
  97 green incl. `dictation.test.tsx`, `tsc` clean. This is the first feature
  where larger models genuinely help (recognition accuracy). No ROADMAP task
  opened; `active_task` stays null.

- Feature plan 2026-10-06 (owner: "plan all the features we can; I'm the only
  user, no one to check this"). Wrote `docs/FEATURE_PLAN.md`: a product-wide plan
  splitting every feature into **BUILD** (guided/personal, usable now), **AUTHOR**
  (content as labeled draft; verified label gated), and **GATED** (needs
  calibration/qualified review a sole self-user + AI cannot supply). Key honest
  conclusion: the guided feature set is largely shipped; what remains buildable is
  content depth + guided speech polish (dictation-from-content, real recordings,
  optional mora feedback) + optional platforms/AI. **SPEECH-007 (automatic speech
  scoring) and REVIEW-001 (qualified review / B2 / certified labels) stay OFF** —
  the owner's self-use is dogfooding + a consented n=1 corpus (personalization,
  robustness), never population calibration. Recommended first tranche: guided
  speech polish. No ROADMAP task opened; `active_task` stays null.

- Guided speech polish tranche 2026-10-06 (owner: "guided speech polish").
  **Slice 1 — dictation targets from pack content (shipped):** `dictation_target_at`
  + IPC `dictation_target(pack_id, offset)` pick kana-only sentences from the
  installed pack (where the ASR transcript matches the reading cleanly) and
  rotate via `offset % pool.len()`; the Speaking tab now shows a pack sentence +
  gloss with a "New sentence" control. Test `dictation_target_prefers_kana_only_and_rotates`.
  **Slice 2 — TTS reference media: REJECTED by verification.** Synthesized Kokoro
  references were measured with the feature's own `voiced_seconds`:
  おばさん/おばあさん ratio **1.04**, とおい/問い ≈ **1.39** — Kokoro does not
  reliably lengthen the long vowel (the bundled ja-demo clip is Kokoro, hence its
  1.04). No failing media committed. Added a **correctness gate**: `pronunciation_check_at`
  now abstains `reference-contrast-weak` when the reference pair's long/short
  voiced ratio `< 1.4`, before any learner scoring — scoring against a ~1.0
  reference would flag a correct ~1.8x contrast as "too long" (false feedback,
  docs/05). The guide test was converted to a fail-closed proof (the old positive
  path was tautological: attempt = concatenation of the same weak media).
  **Also fixed a latent race** in `run_whisper_words`: the temp stem keyed on
  audio length, so two parallel runs over identical audio clobbered each other's
  wav/json (surfaced by the new test); now keyed on pid + an atomic per-call
  counter. Verification: `cargo test --workspace` green (48 desktop lib, 15
  speech-runtime), frontend `vitest` 98 green, `tsc` clean. **Conclusion for the
  owner:** the vowel-length drill cannot be broadened with TTS; it needs
  owner-recorded minimal pairs. No ROADMAP task opened; `active_task` stays null;
  `SPEECH-007` stays blocked.

- Pack-declared production targets 2026-10-06 (owner: "implement option 3,
  verify with OpenJTalk, think of all languages"). **Verification finding:**
  OpenJTalk (mora-timing HMM TTS) was measured with the feature's own
  `voiced_seconds` — obasan/obaasan ratio **1.07** (and あ/ああ/あああ barely
  differ) — so *neither* Kokoro *nor* OpenJTalk lengthens the long vowel; **no
  available TTS can anchor or verify a length target.** The mora-derived target
  rests on Japanese mora-timing phonology; empirical confirmation needs native
  recordings (gated SPEECH-007). **Decision (ADR-0013):** make the target a
  language-neutral **pack-declared number** — `phonology/contrasts.jsonl` gains
  an optional `production { measure, expected_ratio, tolerance_low?,
  tolerance_high? }`; the engine reads it and never infers phonology (mora
  counting stays a pack-author derivation). `pronunciation_check_at` prefers the
  declared target (reference media becomes optional, used only for pitch), else
  falls back to the gated media path. ja-JP declares mora targets (obasan 1.25,
  toi/tooi 1.5, `tolerance_low 0.85` so a no-contrast production reads `shorter`,
  not the old false `close`). **The vowel-length drill now scores with zero
  media/recording/TTS**, and the design generalizes to any language's length/
  tone contrast. Schema is additive/optional (no version bump). Verification:
  `cargo test --workspace` green (49 desktop lib incl.
  `pronunciation_check_uses_pack_declared_target_without_media`, 15
  speech-runtime), frontend `vitest` 98, `tsc` clean. Docs: ADR-0013, docs/04
  production-target guidance, roadmap feature-A, FEATURE_PLAN. Known limitation:
  whole-word voiced ratio is a weak discriminator for 4-vs-5 mora pairs (vowel
  isolation = follow-up). No ROADMAP task opened; `active_task` stays null;
  `SPEECH-007` stays blocked.

- SEC-001 automated portion 2026-10-06 (owner: "no human confirmation available;
  proceed onwards"). Ran the human-free release-hygiene checks: `cargo audit`
  (528 deps) -> **0 vulnerabilities**, 2 low-risk warnings (`proc-macro-error`
  unmaintained build-time; `glib` unsoundness via tauri/webkit). Targeted secret
  grep -> **no matches**. License review -> app MIT, Rust deps permissive, the
  only copyleft (espeak-ng GPLv3) is dev-only and absent from distributable
  builds (per `docs/provenance/speech-distribution-audit.md`). Evidence:
  `state/evidence/SEC-001/automated-2026-10-06.txt`. **Automated portion PASS.**
  SBOM automation landed 2026-10-07: `tools/sbom.py` emits one CycloneDX 1.5
  document for both ecosystems (743 components — 528 cargo with crates.io
  sha256 from `Cargo.lock`, 215 npm with lockfile integrity hashes, 19
  first-party flagged `scope: internal`), byte-identical across runs so it is
  diffable in review; the `security` CI job uploads it as `sbom-cyclonedx`.
  (`cargo-cbom` does not exist in the registry and `cargo-cyclonedx` 0.5.9
  silently writes nothing on this workspace — a 40-line generator we can read
  beat a broken dependency.) Remaining for full SEC-001: the human
  security/privacy review, not available under the sole-user constraint. No
  ROADMAP task opened; `active_task` stays null.

- n=1 personalization 2026-10-06 (owner: "no human confirmation; proceed
  onwards"; picked the one feature needing no dependency/licensing/authorship
  decision). The session planner already balances due-reviews + weak-skill
  practice + curriculum progression under fixed shares. Added
  `personalize_progression` (`apps/desktop/src-tauri/src/lib.rs`): the fixed
  new-item (progression) budget is spent on dimensions the learner is still
  **developing** and withheld from dimensions they have **mastered**, ranked by
  the mean derived confidence of the learner's OWN recorded attempts per
  dimension. Stable sort preserves within-dimension curriculum order; unseen
  dimensions keep the neutral `WEAK_CONFIDENCE` (fresh learner = no-op). The
  scheduler stays pure (reorder happens at the caller). **Personal tuning only**
  — records nothing, makes no mastery/population claim (docs/18), and does not
  touch the speech-evidence gate. Test
  `personalize_progression_favors_developing_dimensions`. Verification:
  `cargo test --workspace` green (50 desktop lib, 244 total), frontend `vitest`
  98. No ROADMAP task opened; `active_task` stays null.

- AI code review + fixes 2026-10-06 (owner: "review the project; add anything
  that needs no owner input; label AI-made/AI-reviewed where human verification
  is the gate"). Full report: `docs/review/2026-10-06-ai-code-review.md`.
  **Fixed:** (1) CI red at HEAD — 789 ru-RU unit files used YAML anchors the
  handoff validator rejects; expanded with per-file semantic-equality proof,
  ru-RU added to the CI pack-conformance job (the gap that let it ship),
  `catalog/preview-entries.json` regenerated; (2) engine-neutrality violation —
  evidence for listening/recall/writing recorded hardcoded `ja.activity.demo.*`
  activity ids; now the practiced content record is the activity id for every
  modality (provenance-only field; no policy consumer); (3) redirect
  allowlist gap in `packs.rs` — ureq 2.x followed redirects without re-checking
  the host; `fetch_capped` now re-validates https + GitHub host allowlist on
  every hop (test covers evil-host bounce); (4) carried WIP failed
  `cargo fmt`/`prettier` gates — formatted. **Verified:** cargo test 244 green
  (51 desktop lib incl. new redirect test), vitest 98, tsc/eslint/prettier/
  rustfmt/clippy clean, handoff validator PASS (1842 files), ja-JP + ru-RU
  validate/lint/test 0 errors. All review work is **AI-reviewed**; human gates
  (REVIEW-001, SPEECH-007, ACC-001 screen readers) stay open and unlabeled.
  No ROADMAP task opened; `active_task` stays null.

- Pack publishing to GitHub — private 2026-10-07 (owner: "get both language packs added
  to github as private for now"; extends O-05). Published `org.openlanguage.ja-jp.reference`
  0.2.0 + `org.openlanguage.ru-ru.reference` 0.2.0 as release assets on the private repo
  (tags `{pack_id}-{version}`); `scripts/build-catalog.sh` URL template now canonical;
  `catalog/packs.json` (live) carries both entries with real URLs; preview-entries
  regenerated (demo placeholder entries dropped — no assets published for them); ru manifest
  gained `authors` (archive rebuilt, asset replaced). Verification: deterministic rebuild
  hashes match; authenticated API download sha256+size match catalog entries; anonymous
  asset GET 404 (private gate — expected); desktop lib 51 green incl. redirect-allowlist
  test. **Limitation:** the app fetches catalog+assets anonymously, so the in-app catalog
  flow stays offline-status until the repo goes public; local import of `dist/preview/*.lpk`
  exercises the same install gate meanwhile (evidence: `state/evidence/PACKS-PUBLISH-2026-10-07/`).
  No ROADMAP task opened; `active_task` stays null.

- `K-40` + `K-42` — goal-level progress map + draft-content honesty 2026-10-07:
  native `goal_map` command reads installed pack goal files (K-23 sharding) +
  assessment ids; per-goal band/prereqs/per-modality mastery derive from
  derived mastery only (activity-volume test proves no count/streak semantics,
  ADR-0002). Progress route renders `GoalMap` above the per-content table.
  K-42: pack-record `status` flows through lexicon/orthography/kanji/contrast/
  sentence/story readers into `PracticeTask.status` + story/kanji views; UI
  shows "draft content" badges on practice, listening, reading, kanji surfaces
  — display-only, grading/scheduling never consult it. Smoke walkthrough now
  asserts `goal-map:75` over real IPC. Environment repairs: sysroot patch now
  covers the non-NUL injected-bundle path (webview was silently dead);
  the smoke run relies on the same fallback renderer, which the binary now
  forces itself, and works without pnpm (evidence: `state/evidence/K-40-K-42/`).


- `K-41` — stress-mark visibility 2026-10-07: readings carrying U+0301
  combining acute render with the stressed base+mark pair highlighted
  (`StressText` + `.stress` style) in practice, placement/kanji practice,
  and writing reading-hints. Entirely data-driven: packs without stress
  data render unchanged (`pack_has_stress` scans installed lexicon text).
  Per-profile auto/on/off toggle persisted under setting key
  `stress-mode` (`display_settings`/`set_display_settings` native
  commands; toggle UI in the Languages page "Display settings" section).
  Display-only — grading, evidence, and scheduling never consult it
  (native test proves persistence + data-driven flip; UI tests cover
  split/render/override). Smoke walks all routes with the new IPC in the
  load paths; smoke script fix: vite must start from `apps/desktop`
  (repo-root cwd served index.html 404 → webview hung) (evidence:
  `state/evidence/K-41/`).

- `K-43` — per-pack content claims panel 2026-10-07: native
  `pack_claims` tallies units/goals/assessments/lexicon/sentences/
  grammar/orthography/kanji/phonological contrasts/stories from the
  installed pack's own files (JSONL + sharded YAML readers; posture
  tallies read `status`/`review_status`), reports the pack's own
  review-posture distribution and `sources.jsonl` provenance as
  claims. `trust_state` passes through from the install gate — claims
  never promote it. Languages page renders "What this pack claims"
  with explicit "the pack's claims, not our verification" copy.
  Native test ties counts to the real ja-JP pack (goals == goal_map
  length, postures tally to counts, zero verified lexicon rows); UI
  test covers render + honesty copy + null-claims absence (evidence:
  `state/evidence/K-43/`).

- `K-46` — runtime device-tier detection 2026-10-07: the recommended
  speech model is measured, not hardcoded (static
  `RECOMMENDED_SPEECH_MODEL` deleted). `recommended_speech_model`
  reads logical cores + `/proc/meminfo` MemTotal, classifies
  low/typical/high per the PERF-001 tier shape in
  `docs/performance/BUDGETS.yaml`, and recommends tiny/base/small per
  the memory budgets (`total_with_compact_model_mb`). Detection
  failure abstains (`recommended_model: null`) and the UI says so.
  Badge reads "recommended for this device"; tier copy names the
  measured cores/RAM. Native test covers all three tiers, RAM-poor
  high-core machines, abstention, and the real-machine measurement;
  UI test pins the badge to the detected model only (evidence:
  `state/evidence/K-46/`).


- `K-44` — first-class `phrase` lexicon entries 2026-10-07: schema
  0.2 lexicon records gain optional `kind` ("word"|"phrase", default
  word — existing packs unaffected) and `slots`
  (`{text, alternatives?, label?}`). Verbatim rule: a slot's text
  must occur in the primary surface or it is dropped, never guessed
  (same discipline as sentence `cloze_targets`). The runner exposes
  `PhraseSlotView` with exactly one deterministic target per item
  (`fnv1a(item_id) % slots.len()`, same FNV rule as choice
  placement). The practice runner renders a "Phrase structure" block
  (target badged "the part to change", label, alternatives) —
  display-only; grading/evidence/scheduling never consult slots.
  Native test covers parsing, verbatim drop, single deterministic
  target, and word entries rendering none; UI test pins the render.
  Pack-side annotation of the ~370 existing multi-word ja-JP entries
  is content work riding with K-45 (evidence: `state/evidence/K-44/`).


- `K-45` — ja-JP kanji layer expansion + A2 content 2026-10-07, five
  slices: (1) engine readers honor the chunking conventions for
  kanji/sentences/phonology (`jsonl_dir_texts`/`jsonl_dir_claims`;
  drills, cloze/dictation, contrast runner, claims panel all see
  shards); (2) five greeting set phrases annotated `kind: phrase` +
  verbatim slots; (3) 28 draft kanji in `kanji/a2-topics.jsonl`
  across the A2 goal topics (draft-labeled, ai-assisted provenance,
  jmdict-simplified pending verification); (4) 19 draft A2 sentences
  in `sentences/a2-daily.jsonl` with verbatim cloze targets, plus
  removal of the duplicate 七 kanji record; (5) ten verb set phrases
  annotated (stem+ます / noun+します). Tests:
  `sharded_pack_directories_reach_every_reader`,
  `bundled_pack_phrase_entries_carry_valid_slots`; native 59 passed,
  workspace green, langpack validate/lint/test clean (evidence:
  `state/evidence/K-45/`).

## Next task

**Packs published (private) + live catalog wired** (2026-10-07, entry above):
the in-app catalog download flow activates automatically when the repo goes
public (owner gate O-05); local import of `dist/preview/*.lpk` exercises the
same install gate meanwhile.

**Next tranche: deeper content depth (queued)** — K-45 shipped its
first pass 2026-10-07 (28 kanji + 19 A2 sentences + 15 phrase
annotations, shard plumbing included); further A2-band coverage is
ongoing content production. All BUILD-bucket
(`docs/FEATURE_PLAN.md`): no gates, no new dependencies, no owner input needed.

Stable-release gates stay open and visible: `SPEECH-007` (calibration
recordings — prep complete 2026-10-06: frozen protocol + consent + rubric +
sourcing plan; owner must supply data + labelers per
`benchmarks/speech/datasets/SOURCING.md`) and qualified review capacity
(O-02 community path needs the repo public). The TTS GPLv3 distribution call
stays open (provider out of distributable builds). Licensing is settled: app
code Apache-2.0 (ADR-0010, 2026-10-04), original pack content CC-BY-4.0,
dictionary-derived data CC-BY-SA-4.0. `active_task` stays null until a
kanban `now` card is picked up.


## Owner decision from 2026-10-05 direction

- Content posture for now: AI-generated content ships as-is (labeled draft);
  qualified-human verification is a future path, not a current blocker. The
  purpose of model screening passes is error-hunting only — do not build
  human-review queues/worklists for it. The cloud-model screening packet
  (second model family) is optional owner-side verification.

## Owner decisions already resolved

## Owner decisions from 2026-10-03 direction

- Application code: MIT, third-party licenses preserved and scoped
  (`LICENSE`, `THIRD-PARTY-NOTICES.md`). *Superseded 2026-10-04 by ADR-0010:
  Apache-2.0 (owner-delegated choice).*
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

## 2026-10-07 — owner decisions implemented, SPEECH-007 answered with measurement

Four owner decisions were taken in-session and implemented, each behind an ADR:

- **Posture labeling (ADR-0014).** Per-item "draft content" badges removed from
  practice, listening, goal map, story and kanji surfaces; one pack-level
  statement derived from the pack's own review tallies ("AI-generated content ·
  not human-reviewed" / "not fully human-reviewed" / "every item carries a review
  record") renders on Home and the Languages pack list; claim posture words
  relabeled. Validator rules, the `reviews.jsonl` record requirement, the trust
  ladder and the ban on band-completeness claims are untouched — AI still
  promotes only to `screened`. Decision recorded under `owner_scope_decisions`
  in both `languages/*/review/REVIEW_POLICY.yaml`.
- **Platform status (ADR-0015).** Three-way ladder instead of a single tested
  flag: `tested_platforms` (maintainer runtime evidence, Linux only),
  `community_confirmed_platforms` (derived only from human runtime reports in
  `docs/platform/PLATFORM_REPORTS.yaml`, each bound to `app_version` +
  `app_commit` and `pack_version` + `pack_sha256`), `untested_platforms`
  (everything else). `langpack catalog --platform-reports` refuses the build with
  machine-readable codes on malformed records, hash/version drift, duplicate ids
  or any attempt to populate `tested_platforms`, and writes nothing in that case.
  `catalog/packs.json` and `docs/13` updated; CI gained a manual
  `platform-bundles` job whose artifacts are named `-UNTESTED-<sha>` and are
  never auto-published.
- **Pack audio (ADR-0016).** `scripts/generate-pack-audio.py` synthesizes every
  sentence and phonology-contrast item with the app's own chain and writes
  `languages/<pack>/media/manifest.jsonl`; the new `media-asset` schema validates
  each line and `crates/langpack` classifies it. `speech_audio_at` and
  `contrast_audio_at` no longer label any file in `media/` as
  `licensed-recording` — provenance is read from the manifest. `.wav` bytes are
  gitignored; licenses/sources records name the synthesis chain.
- **Repo stays private (O-05).** Consequence recorded: the app fetches catalog
  and assets anonymously, so in-app download stays 404, and the community
  promotion paths (review PRs, platform reports) have no outside traffic.

**SPEECH-007 (the only `blocked` required task) was challenged by the owner**:
"why can't we use a TTS model to make the sounds". The answer is measured in
`benchmarks/speech/results/20261008T030000Z/` (tool:
`benchmarks/speech/tools/synthetic-learner-proxy.py`): on synthetic takes with
exact planted long-vowel ratios, scoring coverage is 0.00–0.53 against the frozen
0.60 floor and moves with the ASR model rather than the planted condition; on the
eight clips `ggml-small` scores under the obasan contrast, changing only the
reference-ratio source inverts every verdict (8/8 `close`, catching 0 of the
planted errors, versus 8/8 `shorter`, a false-correction rate of 1.0 against a
0.05 ceiling); κ ≥ 0.70 is satisfied trivially because the labels come from the
generator parameters. A second run on freshly synthesized audio reproduced the
conclusion while the borderline clips moved: generation is not byte-reproducible
(five runs of one utterance, five sha256, including `--num-threads=1`), while the
measurement path is — re-measuring byte-identical clips reproduced every transcript
exactly, so the jitter is the synthesizer's and recorded audio would be measured
reproducibly.
The gate remains `blocked`. What is needed is one owner decision: fund the
specified panel (≥40 consented learners, 2 qualified labelers + adjudicator), or
record a scope decision that stable 1.0 ships guided-only speech feedback, which
removes SPEECH-007 from the required chain and unblocks JA-A1-003 → ACC-001 →
PERF-002 → PLAT-001 → SEC-001 → REL-001.

Verification for this change set: `cargo test --workspace` (every suite `ok`,
zero failures), `cargo test -p lts-langpack-cli` (9 integration tests, including
the new platform-report derivation test), `cargo test -p lts-desktop --lib` (62
tests, including the new manifest-provenance and band-ordering tests),
`cargo test -p lts-langpack`, frontend `vitest` (111 tests), `tsc --noEmit`,
eslint and prettier clean, `langpack validate|lint|test languages/ja-JP` clean
with generated media present, `scripts/build-catalog.sh` producing four archives
plus a draft catalog carrying the three-way platform status, and
`tools/validate_handoff.py` passing (1845 data files checked).

Landed later the same day: K-47's remaining halves (goal-map band glosses with
the sourced JLPT→CEFR crosswalk recorded in `docs/assessment/RELEASE_COVERAGE.yaml`,
`band_sort_key` ladder ordering so `on-ramp` leads instead of ASCII-sorting after
`B2`, and the stale coverage/README headers); the SEC-001 automated remainder
(`tools/sbom.py` emits one deterministic CycloneDX 1.5 document uploaded by the
CI `security` job — `cargo-cbom` is not in the registry, and `cargo-cyclonedx`
0.5.9 has no workspace mode: run at the root it exits 0 and scatters one
`<crate>.cdx.json` beside each member manifest); and the O-03 worksheet
`docs/assessment/ACCESSIBILITY_AUDIT.md`.

Not done: the human gates stay human — pedagogical review, security review,
release sign-off, and the screen-reader matrix (the worksheet is ready; a human
AT run is not). The goal-map change is verified by rendered-markup assertions,
`tsc` and the Rust ordering tests; no screen-reader or Tauri-window run happened,
so announcement behaviour stays unproven (that is exactly what O-03 covers).
PERF-002 stays unmeasurable: `docs/performance/BUDGETS.yaml` is `frozen: false`
and SPEECH-001 spiked only the `ref-dev` tier (K-55 records the tier gap, and no
gate evaluator should run against provisional budgets). Furigana is still a
sibling `<small>` line rather than ruby markup (K-54). Pack version bump +
republish is required before the generated audio reaches distributed packs.

K-56 executed the audio and closed its integrity loop the same day
(`83cee21`): 693 assets generated (679 sentence records — the 660 plus the 19
A2 — and 14 contrast items), 96,511,536 B of `.wav` gitignored behind a
committed 693-row `media/manifest.jsonl`. Two defects found by running the
pipeline, not by reading it: Kokoro's Japanese path is OOV on bare kanji
(`Ignore OOV '金'` → `Failed to convert '金' to token IDs`, exit 2), so the
three kin/sen/hyaku contrast items had to gain kana readings — the same chain
voices those items inside the app, so without a reading they are silent for a
learner too; and `Pack::load_dir` had been sweeping `media/manifest.jsonl` into
the opaque binary-asset branch, so the manifest was never parsed or validated.
Pairing is now enforced: `Pack::audit_media` checks manifest↔directory in both
directions (`media_missing` errors at install/build, `media_absent` is only
informational in a checkout where the bytes are gitignored by design, hash/size
drift errors in every mode, an undeclared file is a warning because its
provenance cannot be stated), and `archive::build` refuses to ship a manifest
that lies. Verified against the real pack: flipping one byte of
`media/ja.contrast.vowel-length.obasan-0.wav` in a copy makes `build` exit 1
naming both digests; the clean build is 76,772,565 B
(sha256 `ad5e712c4490ea494fa2e2fd4ab8f4b23b9b661800efecca8fdff0ee39787d4e`)
against the 850,167 B published `0.2.0` archive — so O-05's version bump is now
also a 90 MB payload decision, not a metadata one.

## 2026-10-08 — owner-loop tranche (D1–D8, settings slice, environments as pack data)

The feature-gap audit (`state/notes/FEATURE-GAP-AUDIT-2026-10-08.md`) turned its
findings into fixes, aimed at the owner's hands-on pass (O-06) rather than at a
gate: honest audio-less pack builds (D1), a Start button for every runner the app
actually has (D2), listening drills built from sentences with declared audio (D3),
unpublishable payloads no longer offered for download (D5), Home's Places section
fed by pack data (D6/K-57), activities resolving the profile's active pack instead
of a hardcoded ja-JP id (D7), and My Words asking the engine which words are due
(D8). A Settings route (13th smoke route) made the privacy notice's promises true:
capture refused while the microphone is off, profile export with recordings
excluded, one-shot profile delete behind a two-step confirm.

`ADR-0018` (environments are pack data) stays **Proposed** pending the owner. Its
first cut repeated the audit's own D6 defect — a café gated on
`comprehension-reading`, which no runner credits — so reachability is now
mechanical rather than reviewed: the row schema's `modality` enum holds only the
six dimensions a shipped runner records, and
`environment_listening_without_audio` rejects a listening unlock on content the
pack declares no audio for.

Gates at this point: `cargo test --workspace` ok (56 targets), `lts-desktop --lib`
70, the `lts-langpack` world suite 8, all seven pack gates 0 errors / 0 warnings,
tsc + eslint clean with vitest 13 files / 133 tests, `SMOKE OK (26 routes walked)`
over 13 routes. The audio-bearing reference archive builds deterministically at
76,867,477 B, sha256 `a3819b85c2e2cf4d4fa98d4d159e74feacb8d5b61321c1dababf2e69ca666577`, against the
850,167 B published `0.2.0`.

What no automated gate can close: O-03's human AT pass (Settings is now inside its
scope), the security/privacy review, qualified human content review (O-02, delegated
to community PRs), and O-05 — shipping the audio-bearing pack is a version bump plus
the owner's call on the repo going public.

## 2026-10-08 — the aligner runtime ships (D4, ADR-0019)

Owner decision: bundle the whisper.cpp alignment runtime as a sidecar. A
released desktop build used to contain the matcher and no ASR, so pronunciation
feedback and dictation abstained on every machine except the one that had been
used for benchmarking.

- `scripts/stage-aligner-sidecar.sh` builds whisper.cpp at pinned ref
  `60c0be6ac8fa71b1a2ae2dd938a31a34a508e774` (1.9.4, MIT) with explicit portable
  cmake flags and fetches `ggml-tiny.bin` (77,691,713 B, sha256 `be07e048…`)
  behind a size/hash gate, staging a gitignored payload: 82,016,429 B here
  (runtime closure 4,323,144 B + weights + manifest). `verify` recomputes every
  declared size and sha256 and rejects symlinks, path escapes and payload files
  the manifest does not list — demonstrated against a truncated copy of the real
  model, which it refused on both bytes and digest.
- The payload carries an explicit x86-64-v3 floor because a portable build
  measured 3.6 s against 370–397 ms on the same 2.2 s sample (≈9×; `objdump`:
  14,833 `%ymm`, 0 `%zmm`). A CPU below the floor is refused as
  `aligner-cpu-unsupported` instead of being handed a crawling aligner.
- `crates/speech-runtime/src/sidecar.rs` gates the payload at load (schema,
  component, platform, CPU, every declared file at its declared size and never a
  symlink) and points the child process at the payload's own libraries. Worth
  recording: the hand-rolled SHA-256 that arrived with this design clobbered its
  own buffer length, so `finalize` spun forever and `verify_hashes` hung on any
  non-empty file — replaced by the workspace `sha2` crate, with
  `a_tampered_payload_byte_fails_the_deep_check_and_names_the_file` pinning the
  behaviour the hang had hidden.

- The desktop adds one deep digest pass per payload per process on top of that
  load gate. Declared sizes cannot see same-size corruption, and weights with a
  flipped byte still load and return confident nonsense; the pass costs 0.05 s
  warm over the whole payload, so it is paid once. It is integrity against
  damage, not a security boundary — the manifest sits beside the files it
  attests, so package signing carries authenticity.
- `overlay` writes `dist/variants/tauri.aligner.json` (each staged platform dir →
  `aligner/<platform>`, MIT notice → `aligner/LICENSE.whisper-cpp.txt`) so the
  base `tauri.conf.json` stays payload-free and bare/dev builds keep working and
  abstain; `stage` refuses a payload root git could commit.
  `scripts/test-stage-aligner-sidecar.sh` (12 hermetic checks) is now a CI step.
- User-visible: Languages → Speech states which runtime this build carries —
  bundled `whisper.cpp 1.9.4`, a development runtime path, an unmet CPU floor
  naming x86-64-v3, or genuinely absent. That panel and Settings both asserted
  "this build does not include" whisper.cpp, which stopped being true the moment
  the payload shipped; both are build-neutral now, and the tests that pinned the
  old wording were rewritten to pin the invariant instead of the sentence.

Gates after this change: workspace suite green — 57 test targets, 297 tests, 0
failures, exit 0 (`lts-desktop --lib` 75,
`lts-speech-runtime` 32 — the sidecar suite contributing 11); clippy
`--workspace --all-targets -D warnings` clean **after repairing three lints that
were already red at HEAD** (two `err().expect()` in `crates/langpack/tests/media.rs`
from the D1 commit, one `useless_vec` in the desktop band-ordering test);
`cargo fmt --all --check` clean; the seven pack gates 0 errors / 0 warnings; tsc,
eslint and prettier clean with vitest 13 files / 135 tests; `SMOKE OK
(26 routes walked)` and, for a fresh profile, `aligner runtime: no:speech-model-off`.
The overlay release build has been run here (owner-approved, same day):
`npx tauri build -c dist/variants/tauri.aligner.json` produced
`target/release/bundle/deb/open-language-learning-platform_0.1.0_amd64.deb`
(78.80 MiB) and `…_0.1.0_amd64.AppImage` (180.56 MiB). Every payload file came out
of the deb at its exact staged byte count with the model digest still
`be07e048…`, and the packaged binary walked all 13 routes reporting
`aligner:yes:bundled` — so `resource_dir()` really does find
`aligner/linux-x64` in the installed layout, which the dev-tree hardlink had only
suggested. Flipping one byte at offset 4,000,000 of the *bundled* model — still
77,691,713 B, digest `be07e048…` → `2240d23d…` — made that same binary refuse it:
`aligner:yes:bench` with a `~/.cache/lts-bench` tree around, and
`aligner:no:aligner-unavailable` with `LTS_BENCH_VENDOR` pointed at an empty
directory, the app still completing its route walk either way; putting the file
back gave `bundled` again. This was an agent run, so per ADR-0015 it is not the
human runtime report O-06 owes — it does mean the owner can install a `.deb`
rather than build one. `cargo tauri dev` carries no payload on purpose, which is
the point of keeping the base `tauri.conf.json` payload-free.

One caveat the packaging exposed (pre-existing, not introduced here): that deb
has content only because it was built here. `bundled_packs()` resolves pack
candidates from `env!("CARGO_MANIFEST_DIR")`, and the packaged binary embeds
`/home/hunter/game-dev/LTS/apps/desktop/src-tauri` plus `languages/ja-JP`, so on a
machine without this checkout an installed bundle would carry the aligner and no
language at all. Recorded in docs/13 and as kanban `K-59`; not yet demonstrated on
a clean machine, because there is no second Linux box to try it on.

## 2026-10-08 — the blank desktop window is fixed inside the binary

- Symptom: the bare `target/debug/lts-desktop` on the Gaming PC (X11 + NVIDIA
  RTX 5090, driver 615.71.09, WebKitGTK 2.52.6 from
  `~/.local/opt/tauri-sysroot`) printed
  `Failed to create GBM buffer of size 1100x720: Invalid argument` twice on
  stderr and the window stayed blank; screenshots before/after the fix (solid
  white → onboarding UI).
- Root cause: WebKitGTK 2.44+ paints through a DMABUF/GBM accelerated path; on
  the proprietary NVIDIA driver, and on software/virtual GPUs (Xvfb has no
  DRI3), GBM buffer allocation fails, WebKit logs that error and never draws.
- Fix: `force_webkit_fallback_renderer()` runs as the first statement of
  `run()` in `apps/desktop/src-tauri/src/lib.rs` and sets
  `WEBKIT_DISABLE_DMABUF_RENDERER=1` unless the operator already set that
  variable — `=0` is WebKitGTK's own re-enable switch back to the accelerated
  path, measured, not assumed (`=0` leaves the accelerated path active, an
  empty value disables it).
- Coverage: the now-redundant `export WEBKIT_DISABLE_DMABUF_RENDERER=1` lines
  in `scripts/launch-preview.sh`, `scripts/update-preview.sh` and
  `scripts/smoke-desktop.sh` were removed, so an operator's own setting is
  honoured instead of overridden.
- Verification: unit test
  `the_blank_window_workaround_forces_the_fallback_renderer_only_when_unset`;
  the rebuilt debug binary run with the variable absent printed nothing and
  `import -window` on it showed the onboarding UI (before: two GBM errors,
  solid white); `./scripts/smoke-desktop.sh` → `SMOKE OK (25 routes walked)`
  with no script-level export left, which is the Xvfb path the CI
  `desktop-smoke` job depends on; and the escape hatch was checked on the fixed
  binary — `WEBKIT_DISABLE_DMABUF_RENDERER=0` brings the two GBM errors back,
  so the operator override really does reach WebKitGTK.
- Not in the bundle built earlier the same day:
  `target/release/bundle/deb/open-language-learning-platform_0.1.0_amd64/` came
  from the 12:47 build, so an installed `.deb`/AppImage of that build still
  needs the variable exported by hand — a re-run of
  `npx tauri build -c dist/variants/tauri.aligner.json` is what carries the
  fix into a package.

## 2026-10-08 — the owner's hands-on pass (O-06): six fixes, and latency finally measured

The owner ran the preview themselves and filed what broke and what felt wrong
(`state/evidence/O-06-2026-10-08/owner-report.md`). Six cards came out of it;
verification for all of them is in `state/evidence/O-06-2026-10-08/verification.md`.

- **K-60 (hard error)** — the Languages route died with
  `missing required key scenarioId`: eight `#[serde(rename_all = "kebab-case")]`
  attributes on the scenario views renamed keys the frontend reads as
  `scenario_id`. The attributes are gone (every other view in `lib.rs` is
  snake_case; no consumer used the kebab keys) and a wire-shape test in
  `scenarios.rs` pins it, because the failure was silent in CI and loud only in
  a real window. The walkthrough now clicks a scenario row and presses Start,
  and `scripts/smoke-desktop.sh` refuses a run without a `scenario-*` marker.
- **K-61 (data integrity)** — mining a word twice created a second row and
  orphaned the first one's SRS history. `add_mined` now returns
  `{id, was_new}` via `INSERT … ON CONFLICT DO NOTHING` plus a change-count
  discriminator (a pre-check would let two simultaneous Mine clicks race), the
  original row id survives, and the UI says the word is already there.
- **K-64** — Settings gained a microphone picker backed by the
  `microphone-device` setting; device enumeration is bounded at 2 s and also
  user-triggered (`#mic-detect`), because a WebKitGTK that never answers a
  device query must not freeze a settings page. If the chosen device cannot be
  opened, capture falls back to the system default **and says so** — only
  `OverconstrainedError` triggers the fallback. Proven live by the
  `mic-picker:present` marker.
- **K-65 / K-65b (wrong pronunciation)** — the owner heard a wrong word for
  こんにちは. The cause was the pack's own manifest row, not the app: the asset
  was regenerated from the declared kana (`5893507c…`, 72,722 B, 1.514 s) and
  `crates/langpack/src/audit.rs` now fails any `model-output` asset whose
  manifest text does not tie to the declared reading. `speech_audio` lost its
  caller-supplied `text` parameter entirely: the app resolves what to speak
  from the content id, so no caller can hand the engine an unreadable string.
  Retracted premise, measured the same day: all 3,920 ja-JP lexicon entries
  have kana primary forms and none is kanji-primary, so the earlier "~419
  entries without readings" figure was fabricated; the real gap is 8 contrast
  items with no declared reading, logged for human review.
- **K-67 (pack side)** — "teach me the script" is pack data: optional
  `capabilities: [script-introduction]` on units, enforced by
  `unit_capability_items_missing`, declared once by
  `ja.unit.kana-hiragana-vowels-ko`; the engine's `"hiragana"` string literal is
  gone. ADR-0021 is `Proposed`; the app surface that keys on it waits on
  ADR-0020, which is the owner's call.
- **K-62 (silence read as a hang)** — installs now report the stage they have
  entered on one event channel (`engine-progress`), with `percent` sent only for
  model files whose sizes the catalog pins. The silent wrappers were deleted
  rather than left as shims, and the walkthrough asserts the renderer really
  heard `prepare`, `install` and `record`.
- **K-63 (latency)** — instrumented before being touched. Warm command costs
  `pack_claims 431 ms` and `scenario_list 550 ms` fell to **1 ms** and **11 ms**
  once the parsed pack and activity runtime were cached per immutable version
  directory (`packcache.rs`) and the claim tallies were memoised per pack root
  with `trust_state` deliberately excluded; the Scenarios tab went 575 ms →
  43 ms. The Languages tab did not move (480 → 465 ms), which is the useful
  part: with the commands at ~1 ms and a single batched state commit, the rest
  is renderer work, and that is now K-63-follow with a number attached rather
  than a feeling. Instrumentation also caught that StrictMode was running the
  entire walkthrough twice — the 77 MB pack was being installed twice per smoke
  run — halving the run from 103 s to 44 s.
- **K-63b (the lag chased to the end)** — the same markers then separated the
  last slow tab. The wrong guess first, measured instead of argued: the blanket
  `WEBKIT_DISABLE_DMABUF_RENDERER=1` from the blank-window fix was blamed for the
  Languages tab's ~465 ms, and re-running the walkthrough with that variable
  exported to `0` gave **484 ms** — the fallback stays as it is. Leaving the tab
  and coming back gave **81 ms against 460 ms**: a cold process paying for one
  parse, not painting. So the lexicon parse is memoized per immutable version
  root (`LEXICON_CACHE`), and installing a pack — or starting the app with packs
  already installed, on a background thread while the window comes up — primes
  the parsed pack, activity runtime, lexicon and claim tallies. Result: Languages
  first visit **460 → 63 ms**, `home_state` **249 → 62 ms**, every warm command
  1-12 ms. That work also retired two tests that wrote rows into an
  already-installed pack and read them back: an installed version is immutable by
  contract, the caches now depend on it, and building the pack with the content
  joined beforehand immediately rejected a demo contrast row that was missing
  `feature_id`. The same method then removed the two remaining parse-per-call
  costs: curriculum units and assessments — ja-JP declares 774 unit YAML files —
  are parsed once per version root, taking `placement_plan` **421 → 1 ms** and the
  Placement tab **447 → 45 ms**; and the pack-derived writing target list is built
  once per root, taking `writing_task` **99 → 1 ms** and the Writing tab
  **126 → 46 ms**. One attempt paid nothing and was reverted rather than kept: a
  memo of each pack directory's raw text moved no measured number at all, which is
  the proof that the cost was JSON parsing per call and not file reading.

Not closed by this tranche: `home_state` and `practice_plan` still cost ~60 ms
each, which is store reads plus plan assembly rather than pack parsing, and every
tab now sits at or below the walkthrough's own navigation floor — a
leave-and-return with no engine call measures ~80 ms. Settings
scroll and the record-stop delay remain unmeasured because no headless driver
can produce them; the model-install progress line is pinned by test only, since
this environment has no downloadable payload; and whether ~3,920 word audio
assets get baked into the pack (pack ~77 MB → several hundred MB) is an owner
decision, as is ADR-0020, which is what K-66 waits on. Nothing was committed in
this session: the working tree is HEAD `49197b1` plus all of the above.

---

## 2026-10-08 — K-59/K-66/K-68: the bundle carries content, the first run is guided, every word has audio

Three cards the owner unblocked with the 2026-10-08 decisions (ADR-0018/0020/0021
acceptances, the merged resources-overlay route, bake-all-audio). Full rows with
evidence are in `tasks/KANBAN.md`; the parts worth remembering:

- **K-68** baked all 4,613 pack audio assets (3,919 new, 352,027,402 B; manifest
  committed, wavs gitignored). The pack now legitimately exceeds the old
  256 MiB archive ceiling — `MAX_TOTAL_BYTES` went to 1 GiB with the reasoning
  in the code comment — and the smoke walkthrough's 90 s watchdog was raised to
  240 s after measuring a healthy run at ~135 s. The bake also exposed a real
  regression the pack-size change had caused silently: the plan path re-parsed
  the media manifest per compose (`practice_plan` ~60→141 ms); media ids are now
  memoized per immutable version root and warmed at install (markers back to
  73/83 ms).
- **K-59** ships the reference pack inside the bundle via
  `scripts/stage-pack-bundle.sh` (validate-install gate, `BUNDLED.yaml`
  sidecar, resources overlay). Extracting the first deb caught the overlay
  mapping pack dirs but **not** the sidecar — the fail-closed loader would have
  seen no packs on any other machine. Fixed and pinned (test 5c, 15 checks);
  the rebuilt deb (337.55 MiB) verifiably contains the sidecar and all 4,613
  wavs. Installing it on a second machine is an owner step.
- **K-66** built the guided first run from pack data alone: plan `kind`,
  goal-map ordering (band → unit → content, content-id keyed, locked goals
  skipped), `next_goal`, and `first_run_steps` (≤3: the declared
  `script-introduction` unit's first content in its own `teaching_order`, then
  plan introductions, then the first review). Home renders the groupings and
  abstains honestly when the pack declares nothing. Smoke asserts
  `fresh-plan:5`/`first-run:3`; docs/03 §8 states that a proposed item is not
  evidence.

Verification: `cargo test --workspace` green; `lts-desktop` lib 101/101 (with
the baked pack through the production install path); vitest 150, `tsc --noEmit`
clean, `test-stage-pack-bundle.sh` 15 checks, `smoke-desktop.sh` SMOKE OK over
13 routes. One existing test deleted a wav from an installed version directory
to prove abstention — rewritten to the never-declared-sentence case, since an
installed version is immutable by contract and the new caches rest on that.
Everything above lands as task-scoped commits on `main` (2026-10-08); no
remote push — the owner keeps distribution private until they say otherwise.

## 2026-10-09 — walkthrough tranche committed; bundle proves itself on a second machine

Owner authorized committing and testing on Omarchy, with no public
remote. The K-60…K-68 tranche landed as seven task-scoped commits on
`main` off `49197b1` (langpack audio; storage capture fix; the engine
tranche incl. ADR-0020/0021; the desktop UI; K-59 packaging;
state/preview; smoke assertions). Tree clean; `origin` untouched.

Second-machine test (Omarchy, Arch, no repo tree): the AppImage first
SIGABRTs because linuxdeploy bundled the machine-local `~/.wk41` WebKit
libs with baked helper paths — a real AppImage-only defect, carded as
**K-59-follow**. With system WebKit the app rendered the onboarding
wizard, and an `LD_PRELOAD` open-trace caught the packaged binary
opening `packs/BUNDLED.yaml` from its own resources (fd 33, no abstain
path) — the K-59 loader works on a clean machine. The wizard click-through
and the install leg were not exercised remotely (no pointer injection
without root); ADR-0015 platform status still awaits a human run. Full
write-up with screenshots: `state/evidence/K59-omarchy-2026-10-09/`.
The test directory on Omarchy was removed afterwards.

K-59-follow closed the same day: `scripts/finalize-appimage.sh` drops
`libwebkit2gtk-4.1`/`libjavascriptcoregtk-4.1` from the AppDir and
repacks via linuxdeploy `--exclude-library` (tauri-cli 2.12.1 exposes no
exclusion knob; the AppDir survives the build, so the recipe is
scripted). The repacked image (403,438,072 B, zero WebKit files, sidecar
and 356 MB pack payload intact) ran on Omarchy unmodified — renders,
and the open-trace again caught `packs/BUNDLED.yaml` → fd 33. So the
AppImage now carries every payload but WebKit, exactly like the deb:
the target's system webkit2gtk-4.1 is the documented runtime dependency.
Regression pinned by `scripts/test-finalize-appimage.sh` (fixture links
the real sysroot WebKit, asserts the repack cannot re-add it). The
wizard click-through/install leg and ADR-0015 platform status remain
human-run work.

## 2026-10-09 — owner-walkthrough fix tranche: gates, ordering, honest audio, one Settings

The approved 2026-10-09 walkthrough cards K-69..K-80 are all implemented
(K-73 `ccee3f0`, K-74 `435eee1`, K-69 `06edc6b`, K-79 `4330106`, K-71
`340a251`, K-80 `5da1076`, K-72 `1efdd6b` landed earlier; K-70, K-75,
K-76, K-78, K-77 landed in this session — commits below).

**K-70 (ADR-0022)** — day-1 plans no longer interleave alphabets or
untaught words. Packs declare unit gates (`requires_unit: [{unit,
state}]`; ja-JP gates katakana on the five hiragana units at
`introduced`), the validator rejects self-reference, unknown units, and
cycles (`crates/langpack/tests/unit_gates.rs`), and the engine locks
NEW-content seeding only — reviews are never locked. The learned-kana
filter admits a word only when every kana of its declared reading is
learned, folding handakuten/dakuon and small-mora marks to their
learned base but never the moraic ン or the ー elongation, which must
be learned as themselves; unresolvable kana forms fail closed.

**K-75** — scenarios order by readiness (playable → near → later) with
exactly one recommendation and lock reasons from goal/prereq data.

**K-76/K-78** — the audio rule: every speech-audio surface resolves the
engine's block token (`tts-runtime-unavailable`, `tts-voice-unavailable`,
`tts-chain-unavailable`) into a sentence naming what is missing, with a
"Set up speech" jump only where an install can fix it. Root causes
pinned while implementing: W-08 was never media-gating — the target
*read* failed during the half-finished install and the generic
"no targets" empty text hid the Record control; the UI now distinguishes
loading/error/empty/ready and offers Retry + setup on error. W-10 was
the published `reference-0.2.0` archives predating K-68's baked media
(republish = owner-authorized version bump, O-05). Contrast references
get **no** synthesized fallback: the measured Kokoro length ratio
(~1.04 for おばさん/おばあさん) would teach the wrong contrast — the
message names the pack version's missing recording instead.
`speech_readiness()` reports the persisted probe (K-74), never re-hashes.

**K-77** — the Languages tab is gone: pack management is the first
section of the Settings route, and the speech-model picker exists
exactly once (Settings also carries recognition models with
sizes/licenses/tier recommendation, TTS payloads, and the
runtime-availability line). Nav floor in `scripts/smoke-desktop.sh`
11→10.

Housekeeping: the pre-outage `models.rs` code had skipped `cargo fmt`
(K-73/K-74 landed before the gate ran); `cargo fmt --all` normalizes it
in its own commit. Lab note: Omarchy's endpoint has been down since the
power outage (sshd refuses the tunnel target), so native `task`
subagents (model role `lab-omarchy`) were unusable; remote slices ran
as `lab_task` jobs on Hermes worker with GamingPC inference
(model `main`), verified locally after `git apply` every time.

Verification: `cargo test --workspace` green (125 desktop-lib incl. the
new K-70/K-75/K-76 tests; 7 `unit_gates`); frontend vitest green and
`tsc --noEmit` clean; `validate --mode install` 0/0 on both packs;
smoke walkthrough re-run after the merge. Gaps stated honestly: the
shadowing *capture* failure path (mic in WebKitGTK) is not headless-
testable — its gating is pinned at unit level only; K-70 day-1 behavior
is proven at selection/engine level, not by a fresh-profile UI run;
re-publishing the published packs with baked media stays owner work.

**Follow-on same day — UI/IA field research (no code).** The owner asked
whether we had researched how other teaching applications handle UI design
and structure. We had not: the only prior note
(`docs/research/2026-10-09-todays-work-and-onboarding.md`) covered
daily-work mechanics, not information architecture. Three parallel research
slices produced `docs/research/2026-10-09-ui-structure-and-navigation-patterns.md`
(46 sources: Duolingo/Busuu/Babbel/Mondly/Memrise; Bunpro/WaniKani/LingoDeer;
NN/g, WCAG 4.1.3 and 2.2.1, ARIA APG range widgets, and the streak/gamification
literature including one randomized field experiment, a classroom counter-study,
and a meta-analysis). What it settles for us: settings-under-profile is the field
norm, so today's K-77 fold is the conventional choice; the empty/loading/error
discipline the K-76/K-78 work implemented is exactly what NN/g prescribes; the
indeterminate-progress and `aria-valuenow`-omission rules match the honesty
contract already in `progress.rs`; and our streak-free posture is the
evidence-consistent one. What it opens (owner decisions, nothing implemented):
12 top-level nav tabs against a 4–6 field norm, the unlabeled new-vs-review mix
on Today, missing mark-known/drill-now overrides, and a Progress dashboard whose
opportunity is real but whose measured effect sizes are modest. Every claim is
tagged FACT / `[INFERENCE]` / `[UNCERTAIN]`, with a dead-ends section naming
what could not be read (Duolingo help is a JS shell; Mondly returns 403; Bunpro
article bodies are JS-rendered; LingoDeer is marketing-only; end-of-session
summary screens need a human with the apps installed).

---

## 2026-10-10 (latest) — project-sweep implementation tranche: PS-01..PS-09

The owner approved implementing the 2026-10-09 deep-sweep cards ("Proceed
with next steps"). Full audit evidence and the per-card gate log live in
`.project-sweep/runs/2026-10-09-deep/`, gitignored by owner call ("not needed
for the end user… only for us to make sure we have everything done
correctly") — the durable record is the KANBAN done rows and `state/`.

**PS-01 + PS-09 — the CI `schemas` job was red twice over at afbe550.**
`execution_scope.optional_tasks` had never picked up the ADR-0017 flips of
JA-A1-003/SPEECH-007; and separately the validator's undocumented 2 MB
data-file cap rejected the committed 3.23 MB ja-JP `media/manifest.jsonl`
(4,613 entries — first-class per docs/13 "Packs with generated audio";
next-largest scanned file is 752 KB). The board card listed only the first
failure because the audit's validator output was truncated. Fix: two ids
into the scope list; `MAX_DATA_BYTES` 2→8 MB with a docs/13 comment (the
runaway-file guard stands — the 118 MB jmdict scratch file is gitignored).
Validator exit 0; `unittest discover -s tools` 37/37 green (669 s).

**PS-02 — honest states on the last three unprotected handlers.**
`openProgress` got a real try/catch: alert + Retry + a loading line, and
the summary view is hidden while the read failed — a failed read never
renders as "no progress yet". `changeBudget` reverts to the previous
minutes and says so (engine-backed values are only real once
`practice_plan` returns). `finishPractice`'s plan refresh reports into
`practiceError`. The Writing route's mutually exclusive error/loaded-empty/
loading sections enforce the K-76/K-78 rule: "No new writing targets in
this pack" now requires a successful empty read (`writingLoaded`).

**PS-03 — WCAG 4.1.3 timing, three sites.** The practice verdict region
now pre-exists grading (empty polite paragraph outside the `graded`
guard). Implementing it exposed that the audit had mis-recorded Writing
and Pronunciation as "already persistent": their own a11y pin rendered
the graded state — a tautology. Both mount-at-mutation bugs fixed
(permanent polite wrapper) and the pin replaced with one that renders
the UNGRADED / result-null state.

**PS-04 — one h1 per route.** Promoted at every card-named site:
Pronunciation, Shadowing, Graded reading, My words, Placement, Kanji,
Writing (all three states), inline Practice via a new `routeHeading` prop
(embedded runners deliberately get none — their route section owns the
h1), and the Writing/Pronunciation route components. The card's settings
claim was wrong — that route already carries `<h1>Language packs</h1>`
(language.tsx:180); no second h1 added. The a11y h1 loop now covers
practice/pronunciation/pronunciation-feedback/writing surfaces; the
promoted inline App sections are covered by typecheck + review, not the
static harness (App remains unmountable — rides K-81/decomposition).

**PS-05 — one profile file, honest concurrency.** `busy_timeout(5 s)` is
now explicit in `from_conn`, with a discovery recorded in the code
comments: rusqlite 0.37 already defaults connections to 5 s, so the line
pins the contract rather than fixing a live bug (proved by stash-run:
the new test passes with and without the line). The permanent test
`crates/storage/tests/concurrency.rs` pins the contract regardless:
two Stores on one file interleave writes, a `BEGIN IMMEDIATE`-held lock
with a blocked writer thread lands its write, four concurrent
opener-writers all land, and a third connection reads back every row.
Second launch is now refused politely: `tauri-plugin-single-instance`
focuses/unminimizes the existing window (Rust-side plugin — no
capability change).

**PS-06/07/08.** `playBlobUrl` revokes on ended/error/play-rejection (the
only other revoke, dictation's `attemptUrl`, is a safe no-op now);
role-less `aria-label`s got real `role="group"` semantics or were removed
(practice meta panel, word lookup, reading/romaji `<p>`s); the onboarding
shell's dead `#onboarding` Setup anchor is gone (`nav={[]}`, matching
the runtime shell).

Backlog trio: unused deps removed (`thiserror` ×2, `lts-domain`) —
`cargo machete` exit 0; SEC-001 input note written
(`state/notes/SEC-001-dependency-disposition.md`: 0 vulnerabilities; glib
RUSTSEC-2024-0429 unreachable from our code and unpatchable inside
tauri 2.12's gtk 0.18 stack — `cargo update -p glib` locks 0 packages;
proc-macro-error is build-time only — owner gate stays open, the note is
input, not self-certification); App.tsx decomposition NOT started, it
rides the K-81 nav decision.

Verification (all post-change): `cargo fmt --check` / `clippy -D
warnings` / `test --workspace --locked` / `machete` all exit 0;
`./scripts/smoke-desktop.sh` `SMOKE OK (12 routes walked)` with max route
95 ms; apps/desktop `tsc --noEmit` clean and vitest 168/168 incl. every
new pin; `eslint` clean; prettier clean on source. Delegation note: the
two fix subagents both hit the 30-min cap mid-flight — their surviving
diffs were reviewed line-by-line, two compile errors in the new Rust test
were fixed in-session, and the entire App.tsx batch was done in the main
session. Gaps stated honestly: handler-level DOM tests are still absent
by design (node-only vitest, frozen lockfile — no jsdom without an
owner-approved dependency change); the single-instance behavior itself is
proven by build + code review, not a headless double-launch.
