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

## Run 2 (2026-11-20, goal-set A) — scripted transform, four goals
Goals education-academic (235-249 + 833 revision), technology (265-279 + 834),
culture-tradition (280-294 + 835), society-rules (295-309 + 836):
60 units re-shaped + 4 revision units created. Per goal: 15 task_sequences
(all five roles engine-runnable), 15 requires_unit linear gates (units 2-15),
15 lv5->2 encounter demotions, 15 new lv0 recall/writing stages; listen-and-choose
audio pairs untouched at 3; allowed_grammar re-set per sentence-detected concepts
(romaji-token detector over the units' contract sentences, goal-1 precedent).
False grammar activity refs replaced with subject-ga on: 237/238/245/248
(to-iu-toka, you-form-volitional, kedo-keredo, rashii-sou-youda); 273/278
(onaji-chigai, te-iku-te-kuru); 285/288 (maeni-ato-de, ba-formal);
296/298/307/308 (ukemi-indirect, dake-bakari-shika, azu-ni, toba-conditional).
wo-only contracts in these goals: 48 -> 0. Shared-pair proof (meeting-starts +
reply-email in every unit) asserted per unit by the transform script.
4/4 gates 0 errors 0 warnings + zero task-sequence audit findings on lane units
(one battery run covering all four goals; see gates.log run-2 block).

Band-wide counters after run 2 (measured over all units whose goal_id is one of
the 13 legacy B1 goals, including work-notice + revision units): units 207,
task_seq 108, support_level-5 92 (of which 2 sit in the 821/822 work-notice
units, outside the legacy 15-unit families), wo-only contracts 72,
support_level-0 activities 119.
Remaining legacy goals: environment, travel-extended, emotions-personality,
advice-opinion, comparison-debate, health-wellness (6 x 15 units).

## Run 2 (2026-11-20, goal-set B) — band COMPLETE
Goals environment (310-324 + 837), travel-extended (325-339 + 838),
emotions-personality (340-354 + 839), advice-opinion (355-369 + 840),
comparison-debate (370-384 + 841), health-wellness (400-414 + 842):
90 units re-shaped + 6 revision units. Same shape as goal-set A.
False grammar refs replaced with subject-ga: 318/319 (shieki-ukemi, ni-yotte);
327/328/334/338 (nai-u-de, toi-toka, te-shimau, darou); 344/348/352 (ni-kuru,
wake-da, hou-ga-yoi); 357/365/368 (to-omoimasu, to-itara-domo, ni-chuui);
378/379/382 (ni-yori, shitsumon-ni-kotae, yori-mo); 407/408/414 (nagara, mazu,
ni-tsurete). wo-only contracts in these goals: 72 -> 0.
Battery B: validate/lint/audit-curriculum/test 0/0, zero task-sequence audit
findings on lane units. Commit-hygiene note: the first staging pass mixed goal
ranges; all six set-B commits were rebuilt (reset --mixed to aa629cd, exact
file lists re-committed as b3085c9..d567649; content of the tree is
identical, verified 96 files changed / 2977 insertions vs the first pass).

Final band counters (units whose goal_id is a legacy B1 goal, incl. revision +
work-notice units): 195/195 legacy 15-unit-family units now task_seq-gated,
wo-only generation contracts in the legacy families: 0, support_level-5 in the
legacy families: 0 (the 2 remaining lv5 sit in the 821/822 work-notice
scenario units, out of this card's legacy scope), support_level-0 recall/writing
stages: 13+90+... per-goal 15 each. All 13 legacy goals: journeys + contracts +
de-scaffold done; 10 revision units created (235, 831-842... 831/832 run-1,
833-842 run-2).
