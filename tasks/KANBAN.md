# Improvement Kanban

Planning view only. `tasks/ROADMAP.yaml` remains the canonical task contract
(docs/15); cards that map to roadmap tasks carry their ID. New cards need a
roadmap entry before `in_progress`.

Columns: `now` (start next) · `next` (queued) · `later` (backlog) ·
`owner` (blocked on owner/human gate).


## done — loop closure (2026-10-03, evidence in `state/notes/K-0*.md`)

| card | what | maps to |
| --- | --- | --- |
| K-01 | Scenario runtime wired into app UI: unlock by goal prereqs, per-node interaction evidence, pack-data dialogue graphs (`state/notes/K-01.md`) | SCENARIO-001 follow-on |
| K-02 | Listening runner: transcript hidden natively, media-first audio with honest provenance, per-modality scheduler row (`state/notes/K-02.md`) | UX follow-on |
| K-03 | READ-001 reader in practice: mastery-faded furigana/romaji, script-gated (never locale), reveals recorded as support 3 (`state/notes/K-03.md`) | READ-001 follow-on |
| K-04 | Script-instruction activity: `orthography/*.jsonl` pack data, `orthography-recognition` dimension, kana-literacy roll-up by Unicode script (`state/notes/K-04.md`) | feeds JA-A1-001 |
| K-05 | Profile picker / resume: launch opens "Welcome back" when profiles exist; wizard only for new profiles (`state/notes/K-05.md`) | UX follow-on |
| K-06 | `languages/ja-JP` migrated 0.1→0.2 in place; first-meeting scenario graph populated; `ja.assess.onramp.greeting-transfer` authored; install blocked only by LIC-001 (`state/notes/K-06.md`) | JA-A1-001 |
| K-10 | HVPT/minimal-pair perceptual training: `phonology/contrasts.jsonl` pack data, `phonological-discrimination` dimension (perception ≠ production), media-first audio (`state/notes/K-10.md`) | K-10 |
| K-11 | Shadowing: speak-along loop (model audio → record → self-compare), formative only, never evidence (`state/notes/K-11.md`) | K-11 |
| K-12 | Cloze + dictation: `sentences/entries.jsonl` pack data, typed grading, `orthographic-encoding` dimension keeps dictation off production-writing (`state/notes/K-12.md`) | docs/03 §9 |
| K-13 | Graded reading: `stories/*.yaml` pack data, interlinear reader with media-first audio + word lookup, formative only (`state/notes/K-13.md`) | community practice |
| K-14 | Sentence mining: `mined_items` table (migration v4), cited learner-owned words with own SRS rows, never mastery evidence (`state/notes/K-14.md`) | docs/03 §17 |
| K-15 | Placement/diagnostic: per-assessment low-stakes tasks, `Diagnostic`-tagged evidence, known foundations unlock via prereq gating (`state/notes/K-15.md`) | docs/03 §10 |
| K-16 | Kanji instruction: `kanji/entries.jsonl` pack data, meaning/reading drills on existing dimensions, SRS-gated resurfacing, mnemonics labelled by review status (`state/notes/K-16.md`) | WaniKani/Heisig practice |
| K-20 | Authoring contract: `docs/PACK_AUTHORING_CONTRACT.md` + unit-brief + lint-clean worked example pack + community CI template, all CI-checked (`state/notes/K-20.md`) | PACK-AI-001 |
| K-21 | Generation contract: `generation_contract` on units (allowed vocab/grammar, budget, register, validation method); validator enforces the envelope (`state/notes/K-21.md`) | docs/03 §12 |
| K-22 | Chunking conventions: topic-sharded lexicon, `NNN-<topic>` unit naming, sentence/kanji/story sharding rules — documented and validator-proven (`state/notes/K-22.md`) | layout contract |
| K-23 | Goals sharding: `curriculum/goals/*.yaml` accepted (ids pack-global, cross-file dupes fail) (`state/notes/K-23.md`) | layout contract |
| K-24 | `new-unit`/`new-lexicon` scaffold subcommands: schema-valid starters, goal auto-pickup, NNN+10 naming, placeholders as warnings (`state/notes/K-24.md`) | PACK-005 |
| K-30 | JA-A1 on-ramp curriculum authored: 31 units, 20 goals+assessments, 211 lexicon, 147 kana, 57 kanji, 61 sentences, 7 contrasts, 4 scenarios, 3 stories — all draft/review-needed, install blocked only by LIC-001 (`state/notes/K-30.md`) | JA-A1-001 |
| K-31 | A1 functional goal coverage: 20 goals all lesson+assessment-mapped, five modalities, ordering scenario wired, audit clean (`state/notes/K-31.md`) | JA-A1-002 |
| K-33 | automated a11y audit in CI: landmarks/skip-link, button+field naming, live regions, AA contrast math, reduced-motion/focus-visible CSS; ink-faint darkened to AA (`state/notes/K-33.md`) | ACC-001 |
| K-34 | PLAT-001 build config only: win/mac bundle targets + icons, CI compile-check matrix, docs/13 marks win/mac untested (Linux-only runtime testing) (`state/notes/K-34.md`) | PLAT-001 |
| K-35 | catalog happy path: `langpack catalog` generates packs.json entries (hash/version/size/tested_platforms) from built .lpk archives; `scripts/build-catalog.sh` builds all shipped pack artifacts; live catalog merge stays O-05 (`state/notes/K-35.md`) | GAP-VERIFY gap |
| K-32 | default pack replaced: on-ramp `org.openlanguage.ja-jp.reference` bundled (owner CC BY 4.0 decision 2026-10-04 unblocked install), ja-demo retired from candidates, pronunciation demo pack-driven, audio allowlists generalized (`state/notes/K-32.md`) | JA-A1-001 |
| TTS-002 | TTS variants per ADR-0009: directory-capable model catalog (archive-pinned, corruption-aware), kokoro+sherpa payload entries, layered TTS resolution (bundled/model/LTS_TTS_DIR/bench), `scripts/build-tts-variants.sh` staging + tauri overlay, payload-scoped GPL notices & source offer, attribution UI in Languages (`state/notes/TTS-002.md`) | TTS-002 |
| POLISH-001 | pre-publication hardening: honest failure-path tests (no-partial-install, honest catalog status, TTS abstention, unknown-model rejection), latency baseline, full-route UI walkthrough (smoke drives onboarding + all 11 routes, script asserts marker) (`state/evidence/POLISH-001/`) | quality |
| REVIEW-001 | review policy v1.0.0 (ai_screening acceleration-only layer, qualification categories, sampling rules, BLK-REVIEW-CAPACITY) + finite A1–B2 coverage map v1.0.0 (agreed by owner 2026-10-04) + reviewer kit; admits JA-A1-001/002 (`state/evidence/REVIEW-001/`) | REVIEW-001 |
| SPEECH-007-infra | eligibility registry (version/hash-bound, fail-closed), pronunciation guided/automatic gating with honest UI labels, preregistration protocol skeleton; calibration DATA blocked on owner decision (`state/evidence/SPEECH-007/`) | SPEECH-007 |
| K-40/K-42 | goal-level progress map (goal_map command + GoalMap UI: bands, prereq gating, per-modality mastery from derived evidence only) + draft-content honesty badges across practice/reading/kanji surfaces (display-only, no penalty semantics) — smoke asserts 75 goals over real IPC (`state/evidence/K-40-K-42/`) | K-40, K-42 |
| AI-REVIEW-06 | AI code review + fixes (AI-reviewed, no human verification): ru-RU YAML-anchor CI failure fixed (789 files expanded, semantic-equality proven) + ru-RU added to CI conformance; engine hardcoded `ja.activity.demo.*` evidence ids removed (content-id attribution); per-hop redirect host re-validation in pack downloads; fmt/prettier gates + catalog hashes repaired (`docs/review/2026-10-06-ai-code-review.md`) | quality |
| PACKS-PUBLISH-07 | Both reference packs published as private GitHub release assets (owner-authorized O-05 extension): tags `{pack_id}-{version}`, live `catalog/packs.json` wired with real URLs, canonical URL template in `build-catalog.sh`, authenticated download hash-verified; in-app anonymous download activates on public flip (`state/evidence/PACKS-PUBLISH-2026-10-07/`) | O-05 |
| K-41 | stress-mark visibility: U+0301 readings render with the stressed vowel highlighted (`StressText`), auto/on/off display setting persisted per profile (`display_settings`/`set_display_settings`, key `stress-mode`), toggle UI on Languages page; display-only — grading/evidence/scheduling never consult it; smoke walks all routes with the new IPC in load paths (`state/evidence/K-41/`) | K-41 |
| K-43 | per-pack content claims panel on Languages page: `pack_claims` command tallies units/goals/assessments/lexicon/sentences/grammar/orthography/kanji/contrasts/stories from the installed pack's own files, reports the pack's own review-posture distribution and `sources.jsonl` provenance as claims; `trust_state` passes through untouched (never promoted); UI labels the numbers as the pack's claims, not verification (`state/evidence/K-43/`) | K-43 |
| K-46 | runtime device-tier detection → dynamic recommended speech model: `recommended_speech_model` measures cores + RAM (`/proc/meminfo`), classifies low/typical/high per PERF-001 tier shape, recommends tiny/base/small by the BUDGETS.yaml memory budgets; detection failure abstains (null) with honest UI copy; static `RECOMMENDED_SPEECH_MODEL` constant deleted; badge reads "recommended for this device" (`state/evidence/K-46/`) | K-46 |
| K-44 | first-class `phrase` lexicon entries: schema 0.2 gains optional `kind`/`slots` (verbatim-validated slot text, non-verbatim dropped); runner exposes `PhraseSlotView` with exactly one deterministic target (`fnv1a(item_id) % slots.len()`); "Phrase structure" block in the practice runner (target badge, label, alternatives) — display-only, grading untouched; ~370 existing multi-word entries await pack-side annotation (content work) (`state/evidence/K-44/`) | K-44 |
| K-45 | ja-JP content depth in five slices: engine readers honor chunking for kanji/sentences/phonology (`jsonl_dir_texts`/`jsonl_dir_claims`, dictation picker included); five greeting + ten verb set phrases annotated `kind: phrase` + verbatim slots; 28 draft kanji in `kanji/a2-topics.jsonl` across the A2 goal topics; 19 draft A2 sentences in `sentences/a2-daily.jsonl` (verbatim cloze targets); duplicate 七 kanji record removed (`state/evidence/K-45/`) | K-45 |
| K-50 | pack-shipped model-output audio (ADR-0016): `scripts/generate-pack-audio.py` synthesizes every sentence + contrast item with the app's own chain and writes the committed `languages/ja-JP/media/manifest.jsonl` (sha256, bytes, rate, channels, seconds, synthesizer identity, `provenance: model-output`) validated by the new `media-asset` schema; `speech_audio_at`/`contrast_audio_at` read provenance from that manifest instead of calling any `media/` file a licensed recording; license + provenance records added; `.wav` bytes stay gitignored and are regenerated at build time — synthesis is not byte-reproducible, so the manifest pins the bytes that actually shipped. Published `0.2.0` archives predate the audio: shipping it is a version bump + O-05 republish | ADR-0016, K-50 |
| K-51 | content posture per owner decision (ADR-0014): per-item "draft content" badges removed from practice, listening, goal map, story and kanji surfaces; one derived pack-level statement ("AI-generated content · not human-reviewed" → "not fully…" → "every item carries a review record") rendered on Home and the Languages pack list; claims tallies relabeled (draft → "AI-generated, unreviewed", review-needed → "awaiting review"); pack display name read from the manifest. Validator rules, `reviews.jsonl` requirement, trust ladder and the band-completeness ban untouched; decision recorded in both `REVIEW_POLICY.yaml` files | ADR-0014 |
| K-52 | three-way platform status (ADR-0015): `langpack catalog --platform-reports` derives `community_confirmed_platforms`/`untested_platforms` from human runtime reports in `docs/platform/PLATFORM_REPORTS.yaml`, each bound to `app_version`+`app_commit` and `pack_version`+`pack_sha256`; malformed records, hash/version drift, duplicate ids and any attempt to declare `tested_platforms` fail the build with machine-readable codes and write nothing; live `catalog/packs.json` carries all three fields; docs/13 ladder rewritten; CI gains a manual `platform-bundles` job uploading win/mac artifacts named `-UNTESTED-<sha>` (never auto-published) | PLAT-001 |
| K-47 | pack | Pack-level consistency cutover — all four halves shipped 2026-10-07: display name read from the pack manifest (ADR-0014 §5); goal-map band tokens glossed with paraphrased CEFR Companion Volume wording (`on-ramp` → "Getting started"; an unknown token renders verbatim with its own gloss so a pack can never hide a goal by using a band we have not met) and the UI states bands are reference levels, not exam claims; the published JLPT→CEFR score crosswalk (pass N5 ≥80 → A1, pass N4 ≥90 → A2 …) recorded as reference data with title/URL/access date in `docs/assessment/RELEASE_COVERAGE.yaml` — one-way, pass-only, Linguistic+Reception, never marketing (docs/14); `band_sort_key` orders the ladder by proficiency so `on-ramp` leads instead of ASCII-sorting after `B2` (Rust tests: real-pack order, unknown band after the ladder, unlabelled last); stale docs corrected — `RELEASE_COVERAGE.yaml` header (v0.2.0, 75 goals, 771 units, 683 at A2/B1/B2, all still draft) and `languages/ja-JP/README.md` counts + `redistribution_allowed` | 2026-10-07 N5/claims audit |
| K-53 | SEC-001 automated remainder | `tools/sbom.py` emits one deterministic CycloneDX 1.5 SBOM covering both ecosystems — 743 components: 528 cargo (crates.io sha256 from `Cargo.lock`), 215 npm (lockfile `resolution.integrity` as SHA-512), 19 first-party flagged `scope: internal`, dev-only npm flagged `cdx:js:dev` only where no importer treats the package as production; byte-identical across runs so it diffs in review; CI `security` job uploads artifact `sbom-cyclonedx`. Rejected alternatives: `cargo-cbom` (no such crate in the registry) and `cargo-cyclonedx` 0.5.9 (no workspace mode — at the root it exits 0 and scatters one `<crate>.cdx.json` beside each member manifest, which then has to be policed and merged). SEC-001 still open on the human security/privacy review | SEC-001 |
| SPEECH-007 evidence | synthetic learner-proxy study `benchmarks/speech/results/20261008T030000Z/` answers "why can't an AI make the recordings" with numbers: scoring coverage 0.00–0.53 against the frozen 0.60 floor and it tracks the ASR model, not the planted condition; on 8 identical scored clips the verdict inverts 8/8 `close` → 8/8 `shorter` when only the reference-ratio source changes (0 planted errors caught vs a 1.0 false-correction rate); κ ≥ 0.70 is vacuous on synthetic ground truth; and the chain is not byte-reproducible (5 runs → 5 sha256), so calibration needs a stated measurement tolerance as well as recordings. The gate stays `blocked`; the owner decision is now the only remaining input | SPEECH-007 |
| K-56 | K-50 executed + gated (2026-10-07): generated the audio — 693 assets (679 sentence records incl. the 19 A2 ones, 14 contrast items), 96,511,536 B of `.wav` on disk, committed manifest of 693 rows; found Kokoro's ja path is OOV on bare kanji (`Ignore OOV '金'` → exit 2) so the three kin/sen/hyaku contrast items now declare kana readings and the generator synthesizes from the reading (86/693 assets speak a reading, not the written text; the manifest's `text` is what was fed to the model, kanji named in `notes`); fixed `Pack::load_dir` swallowing `media/manifest.jsonl` as a binary asset (it is now validated `media-asset` data); added the pairing gate — `Pack::audit_media` (missing/hash/size/unlisted/duplicate/unusable), enforced by `validate(Mode::Install)`, `langpack test` and `archive::build`, five tests in `crates/langpack/tests/media.rs`; verified on the real pack: one flipped byte makes `build` exit 1 naming both digests, clean build = 76,772,565 B / sha256 `ad5e712c…` | ADR-0016, JA-A1-003 |


## done — owner-loop readiness (2026-10-08, findings in `state/notes/FEATURE-GAP-AUDIT-2026-10-08.md`)

| card | what | maps to |
| --- | --- | --- |
| D1 | A pack with none of its declared assets on disk now builds an **honest audio-less archive** (manifest dropped + warning) instead of an uninstallable one; a partially built pack is still refused. Also fixed `scripts/build-catalog.sh` generating audio **after** `build_pack`. 8 tests in `crates/langpack/tests/media.rs`; docs/13, PACK_AUTHORING_CONTRACT, ADR-0016 and README corrected (the `media_absent` code the docs named never existed) | ADR-0016 follow-on |
| D2 + D3 | Home offers a Start button for every runner-backed modality (six, `RUNNABLE_MODALITIES`, contract-pinned in `home.test.tsx`) and says plainly where there is no runner yet. Listening practice moved from lexicon words to **pack sentences with declared audio**: `listening_sentence_task_build` never sends the transcript over IPC, distractors come from other sentence glosses, and a sentence with no audio is refused rather than offered; media ids resolve through the manifest `file` field (pack-root-relative, traversal rows skipped, `{id}.wav` fallback for pre-ADR-0016 packs) | UX, ADR-0016 |
| K-48 | Kanji forms for the reference pack: 2,123 of 3,920 lexicon entries gained a kanji form derived from jmdict-simplified 3.6.2 (`scripts/derive-kanji-forms.py`, idempotent). 3,121 auto-tagged `band: A1` rows were **reverted** — a dictionary `common` marker is a statement about the language, not the level a learner meets it at; only goal-linked bands survive, so 1 row keeps a band. 1,265 kana-only entries have their competing spellings named in `notes` for human review | 2026-10-07 N5 audit |
| K-54 | Ruby semantics: `<ruby>/<rt>/<rp>` via `apps/desktop/src/ruby.tsx` (`Ruby`, `isKanaOnly`) behind the existing furigana toggle, replacing the sibling `<small>` line; 6 component tests + call-site repoint. Conformance is still O-03's to decide | docs/11:55-59 |
| K-55 | `state/evidence/PERF-001/tier-omarchy-2026-10-08.md`: `typical` tier measured (AMD Ryzen AI Max+ 395, no CUDA) — whisper tiny p50 201.3 / p95 214.7 ms (RTF 0.155), sherpa tiny 254.2/284.0, base 399.9/415.9 and 436.5/474.9; kokoro TTS wall p50 0.902 s (RTF 0.718). ASR clears the typical latency/cold/RTF lines; cold-process TTS misses the warm-phrase line, and the harness never measures warm resident TTS — said so in the record. `BUDGETS.yaml` left `provisional`: freezing needs a separate ADR, and `high`/GPU plus a real `low` device are still unmeasured | PERF-001 freeze |
| D5 | Unpublishable payloads stopped being offered: the catalog marks `kokoro-multi-lang` and `sherpa-onnx-runtime` `"availability": "unpublished"`, `models::installable()` treats unpublished / empty / `PENDING-RELEASE-URL` as unfetchable, `install_model_files` refuses **before** opening a connection, and the panel says "not published in this build" instead of rendering a Download button. Tests assert exactly those two entries are blocked, every installable entry has a real HTTPS URL, and a refused install fetches nothing | ADR-0009 staging |
| Settings | New `Settings` route (13 routes walked): microphone permission **enforced at capture** (`recordAttempt` refuses `getUserMedia` and names Settings), romaji display, speech-model choice, profile **export** (`<data>/exports/<profile>-<ts>.json`, recordings excluded) and one-shot profile **delete** with a two-step confirm — the privacy notice's promises made true. Honest copy where the app previously implied a runtime it does not ship; wizard explains what unlocks Continue. docs/08 records what exists and that import does **not**; docs/11 puts the route in O-03's scope | docs/08, docs/11 |
| D7 | Activities resolve the pack from the profile's `active_pack` instead of seven hardcoded `"org.openlanguage.ja-jp.reference"` fallbacks; no active pack means a refusal naming Languages, never a guessed pack. New `App.test.tsx` drives the resolution/request seam (mounting `<App/>` is not drivable in this repo's node-only vitest) | gap audit |
| K-49 | Grammar holes from the N5 audit closed: `ja.grammar.particle.subject-ga`, `companion-to`, `quotative-to` plus い-adjective negation/past concepts and A1 units riding the goal map (`501f198`). The wording/example flags it raised are queued as K-49-follow — they need a human linguist | 2026-10-07 N5 audit |
| K-57 | Environments are pack data (ADR-0018, **Proposed**): optional `world/environments.jsonl`, four error gates (`duplicate_environment_id`, `environment_unknown_content`, `environment_listening_without_audio`, `world_collection_missing`), a `modality` enum restricted to the six dimensions a shipped runner can credit, `world_state_at` reads the active pack, `demo_world_config()` deleted, ja-JP ships five places gated on verified content ids **and declared audio**. Home's "Places you can go" no longer shows app-authored Japanese content; the first draft's `comprehension-reading` gate (no runner records it) became `cafe-ask-price` | GAME-001, docs/00 neutrality |
| honesty | Copy corrected in pronunciation/dictation/language panels: "you turned it off" vs "this build has no such runtime" are no longer conflated, and no panel claims a speech model is available in a build that ships none | docs/18 |

## next — queued after 2026-10-08

| card | epic | what | maps to |
| --- | --- | --- | --- |
| K-58 | pack | K-48 review queue: 1,265 entries left kana-only with competing kanji spellings named in `notes` need a human to pick; 76 matched with no kanji form and 456 unmatched are logged by the same script. Flagged, not guessed | K-48 follow-on |
| K-49-follow | pack | Grammar review flags raised while shipping K-49: が/は information-structure wording, the relative-clause が prohibition, inline examples that lack pack-sentence/audio backing, and the polite past-negative form. Needs a human linguist, not more generation | docs/16 |
| D4 | speech | The whisper.cpp aligner resolves only from `$LTS_BENCH_VENDOR/whisper.cpp/build/bin/whisper-cli` or `~/.cache/lts-bench/…`. The copy is now honest (the panel says the runtime is absent); shipping it as a sidecar per ADR-0008 is a packaging decision for the owner | ADR-0008 |
| D5-rest | release | Staging the two real payloads (kokoro zip 345,065,270 B; sherpa runtime 30,454,382 B, `linux-x64` only) is publishing work needing owner authorization. Engine-side the placeholder is refused and the button is gone, so nothing user-visible waits on it except TTS itself | ADR-0009 |
| P1 | ux | Profile switching after launch: the launch-time resume picker is the only entry, so changing profile mid-session means restarting the app. Not built speculatively — the owner's O-06 pass should say whether it is actually annoying | gap audit D9 |
| H1 | pack | `display_name` still says "(Draft)"; rides the O-05 version bump rather than a separate pack release | O-05 |

## next — AI authoring kit (the GitHub community-pack goal)

| card | epic | what | maps to |
| --- | --- | --- | --- |

## next — content production & expansion (owner-approved 2026-10-03)

| card | epic | what | maps to |
| --- | --- | --- | --- |
| (queued) | ja-JP | Deeper A2-band coverage as labeled drafts riding the goal map (first pass shipped with K-45: 28 kanji + 19 sentences + 15 phrase annotations; remaining depth is ongoing content production) | JA-A2-001 posture |
| K-55 | perf | Remaining tiers for the PERF-001 freeze: `high`/GPU is unmeasurable on the current lab machines (no CUDA device), a real `low`-tier device is still missing, and `small`/`large` model tiers are unmeasured. `typical` was measured 2026-10-08 (done row above). Budgets stay `status: provisional, frozen: false` until a separate ADR freezes them, and only then does PERF-002 become measurable | PERF-001 freeze |

## owner — human/owner gates (never self-certifiable)

| card | what |
| --- | --- |
| O-01 | LIC-001 — CLOSED 2026-10-04: code Apache-2.0 (ADR-0010, owner delegation), pack content CC BY 4.0, TTS GPL payload-scoped (ADR-0009/TTS-002); publishing still gated by O-05 |
| O-02 | JA-A1-003: qualified human review of A1 content — owner 2026-10-04: owner is a learner and cannot perform the gate. DECIDED 2026-10-04: review delegated to GitHub contributors (REVIEWER_KIT + reviews.jsonl records; validator enforces record on status flip; community-reviewer → `validated`, qualified-human → `verified`); all content ships labeled AI-generated/draft until merged review PRs promote it. Scope change 2026-10-08 (ADR-0017 §2): because the project is unfunded and content is exclusively AI-created, qualified-human review is no longer a desktop-1.0 release blocker — the pack ships at its honest posture, and promotion still requires a human record the validator enforces. Quality machinery gets stricter instead of weaker: schema, lint, provenance, audits, posture labels |
| O-03 | Screen-reader matrix (NVDA/VoiceOver/Orca) + IME composition audit — worksheet ready: `docs/assessment/ACCESSIBILITY_AUDIT.md` (pinned-environment row per run, 14 journeys, Orca+Mozc setup, ruby/furigana and IBus composition risks, human-only sign-off). Needs a human AT pass on Linux/Orca; the Linux row is the only one blocking for the desktop RC because win/mac bundles are produced but untested (ADR-0015) |
| O-04 | **DECIDED 2026-10-08 by the owner — option (b)**, recorded in `docs/adr/0017-unfunded-ai-only-posture.md`: no funding, so no consented panel and no qualified labelers; desktop 1.0 ships guided-only pronunciation feedback, `SPEECH-007` leaves `required_for_desktop_1_0` and is dropped from JA-A1-003's dependencies (both annotated in `tasks/ROADMAP.yaml`), and all first-party content is exclusively AI-created at its honest review posture. Consequences: ACC-001 → PERF-002 → PLAT-001 → SEC-001 → REL-001 are no longer gated on calibration data; the accuracy claim stays absent (docs/18, ADR-0013); the SPEECH-007 protocol/consent/rubric stay in the repo and the task stays `blocked`, not `done`. The measured case for why synthetic takes cannot substitute stays in `benchmarks/speech/results/20261008T030000Z/` |
| O-05 | GitHub publishing — PARTIAL: repo is PRIVATE by owner decision 2026-10-07 (reconfirmed); both reference packs published as private release assets (`org.openlanguage.{ja-jp,ru-ru}.reference-0.2.0`), live `catalog/packs.json` wired, but the app fetches catalog and assets anonymously, so in-app download stays 404 while the repo is private. Two follow-on owner actions if wanted: flip public (also reopens the community-review promotion path and lets outsiders file platform runtime reports), or republish packs after ADR-0016 audio lands (a version bump: the published `0.2.0` archives predate generated media) |
| O-06 | Owner hands-on test pass before any public flip (owner 2026-10-08: "not going public until I run some testing through it; make it as feature complete and usable as can be"). AI cannot perform or sign it. Prepared for the owner: `docs/QUICKSTART_PACK_AUTHORING.md`-adjacent app paths, the O-03 AT worksheet, `state/PREVIEW_READINESS.md` evidence boundary, and a build the owner can run (`scripts/build-catalog.sh` regenerates audio, then `cargo tauri dev`). Blocking O-05's public flip |

## Sequencing rationale (updated 2026-10-07, post K-40/K-42)

1. **Engine outruns the human gates**: every remaining ROADMAP-required task
   chains through SPEECH-007 (calibration data) or qualified review capacity
   (needs public repo, O-05). No required task is `ready`; the K-4x tranche is
   kanban/optional work that improves the sole user's daily experience without
   touching gates.
2. **K-40/K-42 shipped 2026-10-07**: the goal map is live (75 pack goals
   with prereq gating + per-modality mastery), and draft posture is
   visible wherever content is presented.
3. **K-45 content depth shipped 2026-10-07**: kanji/sentence/phonology
   shards now reach every engine reader; 28 A2-topic kanji, 19 A2
   sentences, and 15 phrase annotations (greetings + verbs) are live
   draft content riding the goal map. Deeper A2 coverage stays queued
   as ongoing content production.
4. **K-4x polish tranche complete 2026-10-07**: K-41 stress marks,
   K-43 claims panel, K-44 phrase entries, K-46 device-tier speech
   recommendation all shipped.
5. **N5/level-consistency audit 2026-10-07 → K-47..K-50 queued**: the pack
   would not pass JLPT N5 (official benchmarks: ~800 words, ~100 kanji,
   60/180 listening pts) — decisive blockers are kana-only vocabulary
   presentation (0 kanji forms across 3,920 entries), zero listening
   content, and missing が/と/い-adjective grammar. No false JLPT claim
   exists; the consistency defects are the hardcoded understating display
   name, unglossed band tokens, and the diverged RELEASE_COVERAGE.yaml
   denominator. K-47 (consistency cutover: display name, band gloss +
   sourced crosswalk, ladder ordering, stale docs) shipped the same day;
   K-48/K-49/K-50 are pack content with disjoint file ownership. Any N5 word-list
   crosswalk must route through verified provenance (jkindrix-jld CC
   BY-SA or project-authored) — OpenJLPT/Waller lists are license-
   unverified per `docs/provenance/JA_SOURCE_MATRIX.yaml`; label as
   reference alignment only, never a pass guarantee (docs/14).
6. **Owner-side unblocks stay ranked in `owner`**: public flip (O-05) then
   calibration data (O-04/SPEECH-007) are the only paths to REL-001.
7. **Four owner decisions landed 2026-10-07 and are implemented** (ADR-0014
   posture labeling, ADR-0015 platform ladder, ADR-0016 pack audio; cards
   K-50/K-51/K-52). The owner also challenged the SPEECH-007 premise ("why
   can't an AI make the recordings"). That is answered with measurements, not
   assertion, in `benchmarks/speech/results/20261008T030000Z/`: the gate is not
   about having audio, it is about who the accuracy claim is about. That decision
   was made 2026-10-08 (ADR-0017 / O-04): no funding, exclusively AI-created
   content, desktop 1.0 guided-only — `SPEECH-007` leaves the required chain, so
   ACC-001 → PERF-002 → PLAT-001 → SEC-001 → REL-001 are gated on engineering
   work plus the owner's own human passes (O-03 AT audit, security review, O-06
   hands-on test), not on an unobtainable dataset. Nothing may claim
   pronunciation accuracy (docs/18) or human review (ADR-0014).

8. **2026-10-08: the tranche was aimed at the owner's hands-on pass (O-06), not at
   gates.** A feature-gap audit (`state/notes/FEATURE-GAP-AUDIT-2026-10-08.md`)
   produced seven defects D1–D7; all seven are closed. The pattern they share is a
   promise the software did not keep: an uninstallable pack build (D1), activities
   that could not be started (D2), listening items with nothing to hear (D3),
   download buttons for payloads that were never staged (D5), Home content the app
   itself invented (D6/K-57), drills aimed at a hardcoded pack (D7), and a privacy
   notice describing export/delete/microphone controls that did not exist (the
   settings slice). Each was fixed by making the software do the thing, or by
   saying plainly what it cannot do — never by deleting the promise. Two things
   deliberately remain owner work: staging the real TTS payloads (D5-rest) and
   shipping the aligner as a sidecar (D4). `ADR-0018` is **Proposed** awaiting the
   owner's acceptance.
