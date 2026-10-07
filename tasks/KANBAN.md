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

## next — AI authoring kit (the GitHub community-pack goal)

| card | epic | what | maps to |
| --- | --- | --- | --- |

## next — content production & expansion (owner-approved 2026-10-03)

| card | epic | what | maps to |
| --- | --- | --- | --- |
| K-45 | ja-JP | Kanji layer expansion beyond the seed; kanji forms gated into later bands with furigana readings (draft-labeled) | K-45 |
| (queued) | ja-JP | A2-band coverage as labeled drafts once K-40 goal map exists (map makes depth visible) | JA-A2-001 posture |

## owner — human/owner gates (never self-certifiable)

| card | what |
| --- | --- |
| O-01 | LIC-001 — CLOSED 2026-10-04: code Apache-2.0 (ADR-0010, owner delegation), pack content CC BY 4.0, TTS GPL payload-scoped (ADR-0009/TTS-002); publishing still gated by O-05 |
| O-02 | JA-A1-003: qualified human review of A1 content — owner 2026-10-04: owner is a learner and cannot perform the gate. DECIDED 2026-10-04: review delegated to GitHub contributors (REVIEWER_KIT + reviews.jsonl records; validator enforces record on status flip; community-reviewer → `validated`, qualified-human → `verified`); all content ships labeled AI-generated/draft until merged review PRs promote it |
| O-03 | Screen-reader matrix (NVDA/VoiceOver/Orca) + IME composition audit |
| O-04 | REL-001 release gates incl. pedagogical review + speech calibration |
| O-05 | GitHub publishing authorization for catalog assets — PARTIAL 2026-10-04: owner authorized repo upload as PRIVATE (`Berzerker5653/open-language-learning`, 82 commits pushed); 2026-10-07 owner authorized publishing both reference packs as private release assets (`org.openlanguage.ja-jp.reference-0.2.0`, `org.openlanguage.ru-ru.reference-0.2.0`; live `catalog/packs.json` wired — in-app anonymous download activates when repo goes public); switch to public deferred until owner declares ready |

## Sequencing rationale (updated 2026-10-07, post K-40/K-42)

1. **Engine outruns the human gates**: every remaining ROADMAP-required task
   chains through SPEECH-007 (calibration data) or qualified review capacity
   (needs public repo, O-05). No required task is `ready`; the K-4x tranche is
   kanban/optional work that improves the sole user's daily experience without
   touching gates.
2. **K-40/K-42 shipped 2026-10-07**: the goal map is live (75 pack goals
   with prereq gating + per-modality mastery), and draft posture is
   visible wherever content is presented.
3. **Content depth (K-45, A2) after the map**: the map is live, so more
   content can now go into visible structure.
4. **K-4x polish tranche complete 2026-10-07**: K-41 stress marks,
   K-43 claims panel, K-44 phrase entries, K-46 device-tier speech
   recommendation all shipped.
5. **K-44 follow-on is content work**: annotating the ~370 existing
   multi-word ja-JP entries with `kind: "phrase"` + slots rides with
   K-45 pack expansion.
6. **Owner-side unblocks stay ranked in `owner`**: public flip (O-05) then
   calibration data (O-04/SPEECH-007) are the only paths to REL-001.
