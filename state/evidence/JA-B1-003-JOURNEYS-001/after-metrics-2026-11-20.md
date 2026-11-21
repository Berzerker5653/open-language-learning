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

## Goal 2: media-news (250-264 + 831 revision) — same shape, 15 task_sequences,
15 lv5->2, 15 new lv0 stages, wo-only contracts 11->0 (node-versus-kara / zu-ni-de /
shieki-causative / kanoukei-expansion false refs replaced with subject-ga; gains include
companion-to, te-form-connect, counters.general, de-means, topic-wa, quotative-to,
i-inflection, goal-e, suki-na, koto-no-noun, time.expressions). 4/4 gates 0/0.

## Goal 3: storytelling (385-399 + 832 revision) — 15 task_sequences, 15 lv5->2,
15 new lv0 stages, wo-only 12->0 (to-toki / dakara / sou-da false refs replaced with
subject-ga; gains include companion-to, relative-clauses, de-means, suki-na).
4/4 gates 0/0 (same battery run as goal 2, logged together).
Honesty note: 399's sentence (`おんがく の ことが で だいすき です`) is grammatically
garbled and sits in FIX-002's rewrite queue; grammar tagging reflects current text.

Band-wide legacy counters (195 legacy units + 235/831/832 revisions / 13 goals) now:
task_seq 45/198, legacy lv5 150, wo-only contracts 120, support_level-0 activities 46.
Remaining legacy goals: media-news, storytelling,
education-academic, technology, culture-tradition, society-rules, environment,
travel-extended, emotions-personality, advice-opinion, comparison-debate, health-wellness
(12 × 15 units). Resume recipe: `state/notes/JA-B1-003-JOURNEYS-001.md`.
