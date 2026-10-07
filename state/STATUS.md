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
  Full SEC-001 still needs gitleaks+cargo-about in CI and the human security/
  privacy review (not available under the sole-user constraint). No ROADMAP task
  opened; `active_task` stays null.

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

## Next task

**Packs published (private) + live catalog wired** (2026-10-07, entry above):
the in-app catalog download flow activates automatically when the repo goes
public (owner gate O-05); local import of `dist/preview/*.lpk` exercises the
same install gate meanwhile.

**Next tranche (kanban `now`/`next`): sole-user learning experience** —
K-40 goal-map progress UI, K-42 draft-content honesty in practice, then
K-41 ru stress visibility, K-43 content-claims panel, K-44 phrase entries,
K-45 kanji expansion, K-46 device-tier detection. All BUILD-bucket
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
