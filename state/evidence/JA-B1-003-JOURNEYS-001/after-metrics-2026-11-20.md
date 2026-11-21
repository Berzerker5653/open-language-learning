# JA-B1-003-JOURNEYS-001 — after-metrics (increments shipped)

## Goal 1: ja.goal.b1.work-professional (units 220-234 + new revision unit 235)

Measured programmatically after the lane commit (same walk as before-metrics).

| metric | before | after |
| --- | --- | --- |
| units with `task_sequence` (goal legacy) | 0 | 15 |
| activities at `support_level: 5` (goal legacy) | 15 | 0 |
| contracts citing only `ja.grammar.particle.object-wo` | 12 | 0 |
| legacy activities at `support_level: 0` (independent) | 0 | 15 |
| `listen-and-choose` audio-backed activities changed | — | 0 (all stay at level 3) |
| task-sequence audit findings on goal units (audit_content_templates + langpack audit-curriculum) | — | 0 |

Every one of the 15 sequences names five activities that all have engine runners;
transfer/reuse context is proven by shared content_refs (no same-unit shortcuts),
and reuse is phase-gated via `requires_unit` (ADR-0022) on the new unit
`ja.unit.work-professional-revision` (235), which also closes unit 234's transfer.

allowed_grammar re-set sentence-by-sentence: e.g. 220 gains `ja.grammar.verb.tai-desu`
(とりたいです), 224 gains `ja.grammar.verb.te-form-connect` + `ja.grammar.particle.addition-mo`
(ふえて、そんしつも), 226/233/234 gain `ja.grammar.verb.ageru-kureru-morau` (もらいました),
223 gains `ja.grammar.b1.maeni-ato-de` (まえに). The three units whose activities cited
grammar no sentence uses (225 ukemi-passive, 228 keigo-soncho-intro, 232 susume-continuity)
had the false content_ref replaced with `ja.grammar.particle.subject-ga`, which their
sentences actually use.

Band-wide legacy counters (195 legacy units + new 235 / 13 goals) now: task_seq 15/196,
legacy lv5 180, wo-only contracts 143, support_level-0 activities 16.
Remaining legacy goals: media-news, storytelling,
education-academic, technology, culture-tradition, society-rules, environment,
travel-extended, emotions-personality, advice-opinion, comparison-debate, health-wellness
(12 × 15 units). Resume recipe: `state/notes/JA-B1-003-JOURNEYS-001.md`.
