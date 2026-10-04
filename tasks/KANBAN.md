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

## now — core loop closure (engine wiring, zero-knowledge on-ramp)

| card | epic | what | maps to |
| --- | --- | --- | --- |

## next — training methods the research says we're missing

| card | epic | what | evidence |
| --- | --- | --- | --- |
| K-16 | methods | **Kanji instruction** (radicals + mnemonic stories + Heisig/WaniKani-style SRS gating) for A1+ reading track | WaniKani/Heisig practice; JA-RES-003 kanji selection rules |

## next — AI authoring kit (the GitHub community-pack goal)

| card | epic | what | maps to |
| --- | --- | --- | --- |
| K-20 | kit | **PACK-AI-001**: single agent-facing authoring contract: requirements digest (quickstart + schema README + CONTRIBUTING merged), per-unit authoring brief template, worked full-unit example, CI template for community pack repos | PACK-AI-001 |
| K-21 | kit | **Generation contract in pack schema**: expose docs/03 §12 (allowed vocab/grammar, new-item budget, register, validation method) as machine-checkable per-unit fields so AI-drafted units can be validated against their own constraints | docs/03 §12; AI-curricular-alignment research |
| K-22 | kit | **Chunking conventions**: document topic-sharded lexicon (`lexicon/food.jsonl`, …) and unit-per-lesson naming; already legal in layout contract, needs convention + template | layout.rs supports `lexicon/*.jsonl` |
| K-23 | kit | Allow `curriculum/goals/*.yaml` sharding (only single-file remaining as packs grow past A1) | schema v0.3 candidate |
| K-24 | kit | `langpack new-unit` / `new-lexicon` scaffold subcommands so agents author one lesson at a time with instant `validate` feedback | PACK-005 follow-on |

## later — content production & expansion

| card | epic | what | maps to |
| --- | --- | --- | --- |
| K-30 | content | JA-A1-001: author full on-ramp curriculum (kana-first, ~30–50 units, hundreds of sourced entries) using the CLI loop; AI-drafted, `review-needed` | JA-A1-001 |
| K-31 | content | JA-A1-002: A1 functional goal coverage | JA-A1-002 |
| K-32 | content | Replace `ja-demo` default with real on-ramp pack once K-30 passes `langpack test` | — |
| K-33 | platform | ACC-001 accessibility audit (auto portion) | ACC-001 |
| K-34 | platform | PLAT-001 Windows/macOS parity | PLAT-001 |
| K-35 | kit | Community catalog happy path: publish `dist/preview/*.lpk` as release assets + `catalog/packs.json` entries | GAP-VERIFY gap |

## owner — human/owner gates (never self-certifiable)

| card | what |
| --- | --- |
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
