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

## now — core loop closure (engine wiring, zero-knowledge on-ramp)

| card | epic | what | maps to |
| --- | --- | --- | --- |

## next — training methods the research says we're missing

| card | epic | what | evidence |
| --- | --- | --- | --- |

## next — AI authoring kit (the GitHub community-pack goal)

| card | epic | what | maps to |
| --- | --- | --- | --- |

## next — content production & expansion (owner-approved 2026-10-03)

| card | epic | what | maps to |
| --- | --- | --- | --- |

## owner — human/owner gates (never self-certifiable)

| card | what |
| --- | --- |
| K-32 | Replace `ja-demo` default with the on-ramp pack — BLOCKED by O-01: `langpack test` fails only on LIC-001 gates, so the pack cannot install yet |
| O-01 | LIC-001: espeak-ng GPLv3 distribution obligation + final content licensing |
| O-02 | JA-A1-003: qualified human review of A1 content |
| O-03 | Screen-reader matrix (NVDA/VoiceOver/Orca) + IME composition audit |
| O-04 | REL-001 release gates incl. pedagogical review + speech calibration |
| O-05 | GitHub publishing authorization for catalog assets |

## Sequencing rationale

1. **K-01..K-06 first**: the learner-visible loop is the product; every card
   is wiring of already-built engines, cheap and high-impact.
2. **K-04 (kana) before K-30 (content)**: authoring an on-ramp course
   without a kana-teaching activity recreates the current hole.
3. **K-20..K-24 (kit) before K-30**: the same kit serves community packs;
   authoring ja-JP A1 *with* the kit dogfoods it.
4. Methods cards K-10..K-16 each need an activity-kind decision
   (`classify_type` families) — batch the schema decision, implement
   incrementally.
