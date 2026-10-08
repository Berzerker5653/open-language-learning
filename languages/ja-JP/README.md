# Japanese Reference Pack — Draft Scaffold

As of 2026-10-07 this folder is an **in-progress kana-first curriculum draft**: 771 units, 75 goals each with an assessment, 3,920 topic-sharded lexicon entries, 679 sentences, 147 hiragana/katakana chart entries, 84 kanji entries, 7 phonological contrasts, 160 grammar concepts, 4 scenario graphs, and 3 graded stories. Every item is `draft`/`review-needed` with `generation` provenance; it is not yet a validated curriculum. Learner-facing surfaces state that once, at pack level (ADR-0014), rather than badging each card.

Migrated in place from schema 0.1 to **0.2** (2026-10-03, K-06): the pack now authors its on-ramp goal graph, unit, a populated first-meeting scenario (`activities/scenarios/first-meeting.yaml`), and the transfer assessment `ja.assess.onramp.greeting-transfer` that the 0.1 manifest previously declared unresolved. 0.1-only files (`SOURCES.yaml`, `LICENSES.yaml`, `orthography/`, `phonology/`, `pragmatics/`, `speech/`) were replaced by the 0.2 layout (`sources.jsonl`, `licenses.jsonl`, `language/orthography.yaml`, `language/phonology.yaml`, `language/pragmatics.yaml`); romanization-scaffold, register, and speech feedback policy narratives live in `docs/assessment/`.

OMP must build the real pack through the research/validation tasks in `tasks/ROADMAP.yaml`. Do not promote this pack beyond `experimental` until review requirements are met.

The sample unit exists to exercise the format. Treat linguistic examples as content requiring normal review before stable release. All AI-assisted prose is marked `draft`/`review-needed` with `generation` provenance; qualified human review (REVIEW-001) cannot be self-certified.

The phonology inventory (`language/phonology.yaml`) was ported from the JA-RES-002 fixture during K-30: teach/reference-only modes plus one `assess-guided` pitch-accent feature — no `assess-automatic` claims, because automatic scoring requires a bound calibrated speech profile. Speech profiles remain empty: no provider, model, human-reviewed targets, or calibration evidence exists for this pack. Requested model capabilities are research targets, not availability promises.

Install is **not** license-blocked: LIC-001 closed 2026-10-04, `manifest.yaml` sets `content_license: CC-BY-4.0` with `redistribution_allowed: true`, and `licenses.jsonl` carries the content, dictionary-data and synthesis-chain records. What remains unfinished is qualified human content review (REVIEW-001) and, for distributed packs, a version bump when regenerated media changes pack bytes.

Listening audio is generated, never hand-collected or committed (ADR-0016): `scripts/generate-pack-audio.py` synthesizes every sentence and contrast item with the app's own Kokoro/sherpa-onnx chain and writes `media/manifest.jsonl`, which is the committed artifact — one schema-validated line per asset with sha256, format, provenance `model-output` and the synthesizer identity. The engine reads audio provenance from that manifest, so generated audio can never present itself as a licensed recording. This audio is comprehension input only: it is not a pronunciation reference, and production scoring still relies on pack-declared targets (ADR-0013).

Unlockable places are pack data too (ADR-0018): `world/environments.jsonl` is
AI-authored for this pack — five places (checking the price at the café, ordering a
drink, station navigation, buying a ticket, self-introduction), each gated on
three content ids this pack actually declares, using modalities the shipped
runners can record (recall, listening, writing recognition). The ids were checked
against `lexicon/`, `sentences/`, `grammar/` and `media/manifest.jsonl`, and the
validator enforces it (`environment_unknown_content`,
`environment_listening_without_audio`). The first draft gated the café on
`comprehension-reading`, which no runner credits — that is now a schema error, and
the place became *checking the price* (recall of two drinks, plus listening on a
price-tag sentence the pack has audio for). The
`display_name` values describe what the place affords and assert no learning
outcome or proficiency level; the thresholds are deliberately reachable at
`introduced`/`supported` through activities this pack can record. These places are
unlocked by derived mastery alone — no streaks, no activity counts (ADR-0002).

Use `docs/16_CONTENT_AUTHORING_AND_REVIEW.md` for review promotion and `docs/17_SPEECH_BENCHMARK_PLAN.md` for permissioned evaluation, independent test splits, thresholds, scoring coverage and calibration version binding. Do not create evidence records claiming tests or human approvals that have not occurred.
