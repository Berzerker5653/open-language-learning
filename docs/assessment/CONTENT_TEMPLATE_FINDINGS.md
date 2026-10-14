# Content-template repetition findings — 2026-10-14

Review finding R12, acceptance criterion 3: "Template repetition warnings
queue review; counts and reference resolution do not certify instructional
depth."

`tools/audit_content_templates.py` is a deterministic, standard-library-only
auditor that measures structural repetition signals in language packs
(leading-token share, token-skeleton repeats, identical grammar-concept
reference sets per band, and single-stage-kind units). Every number below is
derived from the pack files themselves.

**These are structural repetition signals queued for qualified human
review. They are not CEFR judgments.** The auditor makes no claim about
CEFR level correctness, linguistic quality, or pedagogical validity; a
repetition count (or the fact that every referenced id resolves) says
nothing about instructional depth. Only qualified human review (REVIEW-001)
can decide whether a flagged pattern is a defect.

Commands (run from repo root, 2026-10-14):

```
python -m unittest discover -s tools -p 'test_audit_content_templates.py'   # 11 tests, OK
python tools/audit_content_templates.py --json languages/ru-RU languages/ja-JP
python tools/audit_content_templates.py languages/ru-RU languages/ja-JP
```

Headline measured numbers (defaults: leading-share 0.15, leading-n 1,
skeleton-min 2, group-min 2):

| Metric | ru-RU | ja-JP |
| --- | --- | --- |
| sentences / units parsed | 815 (2 files) / 809 units | 823 (3 files) / 786 units |
| leading-token | `sentences/entries.jsonl`: `это` starts 741/775 = 95.61%; `content-parity-2026-10-12.jsonl`: `я` 6/40 = 15.00% | no file-level prefix reaches the 15% threshold |
| top skeleton repeats | `это _`: 400× (b2), 188× (b1), 78× (a2), 61× (a1) | B2 band: 131× + 110× five/six-slot romaji skeletons; a2: `_ wa _ desu ka` 4×, `_ wa _ ka` 4× |
| largest identical grammar-concept set | b2: 400 units share the same 2-element set (`eto-identification` + `zero-present-copula`); b1 200, a2 99, a1 64 share it too | b2: 313 units share the same 1-element set (`object-wo`); b1 155, a2 21 share it; a1 largest: 7 units share a 2-element set |
| single-stage-kind units | 0 | 1 (`ja.unit.sound-contrasts`: `hvpt` only) |
| total findings | 30 | 89 |

The machine-generated review-queue section below is appended by
`--write-review docs/assessment/CONTENT_TEMPLATE_FINDINGS.md`; regenerate
it with the auditor rather than editing by hand.


## Content-template repetition audit (2026-10-14) — machine-measured, review-pending

Machine check: `python tools/audit_content_templates.py --json languages/ru-RU languages/ja-JP`

Structural repetition signals measured from pack files only. These counts queue qualified human review; they make NO claim about CEFR level correctness, linguistic quality, or pedagogical validity, and reference resolution / identical counts do not certify instructional depth.

### Pack `languages/ru-RU`

Measured 815 sentences in 2 file(s) and 809 curriculum units; 30 structural finding(s). Each needs qualified human review (REVIEW-001); none is a CEFR or quality judgment.

- leading-token — 2 finding(s):
  - [ ] prefix `я` covers 6/40 of `sentences/content-parity-2026-10-12.jsonl` (15.00%) — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] prefix `это` covers 741/775 of `sentences/entries.jsonl` (95.61%) — pattern is ai-drafted-template shaped, needs calibrated human review.

- skeleton — 22 finding(s):
  - [ ] band a1: skeleton `это _` repeated 61x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band a1: skeleton `это наш _` repeated 2x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band a2: skeleton `это _` repeated 78x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band a2: skeleton `_ _ _ _` repeated 6x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band a2: skeleton `это _ _ _` repeated 3x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band a2: skeleton `она _ _` repeated 2x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band b1: skeleton `это _` repeated 188x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band b1: skeleton `он _` repeated 3x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band b1: skeleton `это _ _` repeated 3x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band b1: skeleton `_ _` repeated 2x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band b1: skeleton `_ _ _` repeated 2x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band b2: skeleton `это _` repeated 400x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band on-ramp: skeleton `это _` repeated 3x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band on-ramp: skeleton `_ _` repeated 2x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band unbanded: skeleton `_ _ _` repeated 5x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band unbanded: skeleton `_ _ _ _` repeated 5x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band unbanded: skeleton `_ _` repeated 2x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band unbanded: skeleton `_ _ в _ _` repeated 2x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band unbanded: skeleton `_ _ и _` repeated 2x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band unbanded: skeleton `_ _ на _` repeated 2x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band unbanded: skeleton `мы _ _ _` repeated 2x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band unbanded: skeleton `я _ _` repeated 2x — pattern is ai-drafted-template shaped, needs calibrated human review.

- identical-grammar-sets — 6 finding(s):
  - [ ] band a1: 64 units share one 2-element grammar-concept set (ru.unit.a1.basic-messages-01, ru.unit.a1.basic-messages-02, ru.unit.a1.basic-messages-03, ru.unit.a1.basic-messages-04, ru.unit.a1.basic-messages-05, ru.unit.a1.basic-messages-06, ru.unit.a1.basic-messages-07, ru.unit.a1.basic-messages-09, ru.unit.a1.city-01, ru.unit.a1.city-02, ru.unit.a1.city-03, ru.unit.a1.city-04, … (+52 more, see --json)) — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band a2: 99 units share one 2-element grammar-concept set (ru.unit.a2.comparisons-01, ru.unit.a2.comparisons-02, ru.unit.a2.comparisons-03, ru.unit.a2.comparisons-04, ru.unit.a2.comparisons-05, ru.unit.a2.comparisons-06, ru.unit.a2.comparisons-07, ru.unit.a2.comparisons-08, ru.unit.a2.comparisons-09, ru.unit.a2.comparisons-10, ru.unit.a2.connected-messages-01, ru.unit.a2.connected-messages-02, … (+87 more, see --json)) — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band b1: 200 units share one 2-element grammar-concept set (ru.unit.b1.culture-media-01, ru.unit.b1.culture-media-02, ru.unit.b1.culture-media-03, ru.unit.b1.culture-media-04, ru.unit.b1.culture-media-05, ru.unit.b1.culture-media-06, ru.unit.b1.culture-media-07, ru.unit.b1.culture-media-08, ru.unit.b1.culture-media-09, ru.unit.b1.culture-media-10, ru.unit.b1.feelings-01, ru.unit.b1.feelings-02, … (+188 more, see --json)) — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band b2: 400 units share one 2-element grammar-concept set (ru.unit.b2.app-01, ru.unit.b2.app-02, ru.unit.b2.app-03, ru.unit.b2.app-04, ru.unit.b2.app-05, ru.unit.b2.app-06, ru.unit.b2.app-07, ru.unit.b2.app-08, ru.unit.b2.app-09, ru.unit.b2.app-10, ru.unit.b2.argue-01, ru.unit.b2.argue-02, … (+388 more, see --json)) — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band on-ramp: 4 units share one 1-element grammar-concept set (ru.unit.on-ramp.classroom-01, ru.unit.on-ramp.classroom-02, ru.unit.on-ramp.greetings-01, ru.unit.on-ramp.greetings-02) — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band on-ramp: 2 units share one 1-element grammar-concept set (ru.unit.on-ramp.numbers-01, ru.unit.on-ramp.numbers-02) — pattern is ai-drafted-template shaped, needs calibrated human review.

### Pack `languages/ja-JP`

Measured 823 sentences in 3 file(s) and 786 curriculum units; 89 structural finding(s). Each needs qualified human review (REVIEW-001); none is a CEFR or quality judgment.

- skeleton — 58 finding(s):
  - [ ] band a1: skeleton `_ _` repeated 53x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band a1: skeleton `_ _ _` repeated 25x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band a1: skeleton `_ _ _ _` repeated 7x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band a1: skeleton `_` repeated 2x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band a1: skeleton `_ _ desu` repeated 2x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band a1: skeleton `_ desu` repeated 2x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band a2: skeleton `_ _ _` repeated 50x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band a2: skeleton `_ _` repeated 32x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band a2: skeleton `_ _ _ _` repeated 10x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band a2: skeleton `_ o _ _` repeated 6x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band a2: skeleton `_ wa _ desu ka` repeated 4x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band a2: skeleton `_ wa _ ka` repeated 4x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band a2: skeleton `_` repeated 3x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band a2: skeleton `_ _ _ yo` repeated 3x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band a2: skeleton `_ _ ni _` repeated 3x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band a2: skeleton `_ desu` repeated 3x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band a2: skeleton `_ kara _ ga _` repeated 3x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band a2: skeleton `_ ni _ _ _` repeated 3x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band a2: skeleton `_ ni _ ka` repeated 3x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band a2: skeleton `_ no _ desu` repeated 3x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band a2: skeleton `_ _ _ desu` repeated 2x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band a2: skeleton `_ _ _ desu ka` repeated 2x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band a2: skeleton `_ _ desu` repeated 2x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band a2: skeleton `_ _ ni _ o _ _` repeated 2x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band a2: skeleton `_ _ yo` repeated 2x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band a2: skeleton `_ de _` repeated 2x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band a2: skeleton `_ de _ _ no desu ga` repeated 2x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band a2: skeleton `_ desu ka` repeated 2x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band a2: skeleton `_ desu ka _ desu ka` repeated 2x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band a2: skeleton `_ mo _ ka` repeated 2x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band a2: skeleton `_ ni _` repeated 2x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band a2: skeleton `_ ni _ _` repeated 2x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band a2: skeleton `_ o _` repeated 2x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band a2: skeleton `_ o _ _ _` repeated 2x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band a2: skeleton `_ o _ ka` repeated 2x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band a2: skeleton `_ wa _ _ ni _` repeated 2x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band b1: skeleton `_ _ _ _ _` repeated 47x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band b1: skeleton `_ _ _ _ _ _ _` repeated 42x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band b1: skeleton `_ _ _ _ _ _` repeated 28x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band b1: skeleton `_ _ _ _` repeated 12x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band b1: skeleton `_ _ _ _ _ _ _ _` repeated 11x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band b1: skeleton `_ _ _` repeated 10x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band b1: skeleton `_ _ _ _ _ _ _ _ _` repeated 2x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band b2: skeleton `_ _ _ _ _` repeated 131x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band b2: skeleton `_ _ _ _ _ _` repeated 110x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band b2: skeleton `_ _ _ _ _ _ _` repeated 22x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band b2: skeleton `_ _ _` repeated 20x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band b2: skeleton `_ _ _ _` repeated 14x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band b2: skeleton `_ _ _ _ _ _ _ _` repeated 11x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band b2: skeleton `_ _ _ _ _ _ _ _ _` repeated 2x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band b2: skeleton `_ _ _ _ _ _ _ _ _ _ _` repeated 2x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band on-ramp: skeleton `_` repeated 3x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band on-ramp: skeleton `_ _` repeated 3x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band on-ramp: skeleton `_ _ _` repeated 2x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band unbanded: skeleton `_ _` repeated 6x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band unbanded: skeleton `_ _ _ _ _` repeated 5x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band unbanded: skeleton `_ _ _` repeated 3x — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band unbanded: skeleton `_ _ _ _` repeated 2x — pattern is ai-drafted-template shaped, needs calibrated human review.

- identical-grammar-sets — 30 finding(s):
  - [ ] band a1: 7 units share one 2-element grammar-concept set (ja.unit.describe-things, ja.unit.health-body-head, ja.unit.narrative-once-upon, ja.unit.narrative-story-feelings, ja.unit.transport-directions, ja.unit.transport-near-far, ja.unit.transport-timetable-speed) — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band a1: 2 units share one 1-element grammar-concept set (ja.unit.numbers-counters, ja.unit.shopping-prices) — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band a1: 2 units share one 1-element grammar-concept set (ja.unit.classroom-phrases, ja.unit.keeping-talk-going) — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band a1: 3 units share one 1-element grammar-concept set (ja.unit.health-habits, ja.unit.weather-talk, ja.unit.work-school-people) — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band a1: 3 units share one 2-element grammar-concept set (ja.unit.home-adverbs-home, ja.unit.home-rooms, ja.unit.transport-travel-airport) — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band a1: 7 units share one 1-element grammar-concept set (ja.unit.health-body-limbs, ja.unit.home-chores, ja.unit.leisure-ball-sports, ja.unit.leisure-media-basics, ja.unit.leisure-reading-media, ja.unit.work-adverbs-degree, ja.unit.work-study) — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band a1: 2 units share one 2-element grammar-concept set (ja.unit.health-sick-ok, ja.unit.home-house-adjectives) — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band a1: 4 units share one 2-element grammar-concept set (ja.unit.health-medicine, ja.unit.home-furniture, ja.unit.home-in-out-verbs, ja.unit.narrative-people-voice) — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band a1: 2 units share one 1-element grammar-concept set (ja.unit.health-clinic-visit, ja.unit.narrative-land-sea) — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band a1: 2 units share one 2-element grammar-concept set (ja.unit.home-home-appliances, ja.unit.leisure-like-dislike) — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band a1: 2 units share one 2-element grammar-concept set (ja.unit.leisure-play-listen, ja.unit.work-job-hunt) — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band a1: 2 units share one 2-element grammar-concept set (ja.unit.home-chore-verbs, ja.unit.narrative-lose-find) — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band a1: 2 units share one 2-element grammar-concept set (ja.unit.narrative-think-remember, ja.unit.work-classroom) — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band a2: 9 units share one 1-element grammar-concept set (ja.unit.admin-holidays, ja.unit.admin-household, ja.unit.body-hospital, ja.unit.city-police-fire, ja.unit.comm-contact, ja.unit.comm-questions, ja.unit.rel-grandparents, ja.unit.weather-seasons, ja.unit.weather-summer-things) — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band a2: 18 units share one 1-element grammar-concept set (ja.unit.admin-banking, ja.unit.body-clinic-visit2, ja.unit.body-prevention, ja.unit.city-city-hall, ja.unit.comm-social, ja.unit.comm-translation, ja.unit.comm-writing, ja.unit.ent-music, ja.unit.ent-venues, ja.unit.shopping-paying, ja.unit.sports-combat, ja.unit.sports-gym, … (+6 more, see --json)) — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band a2: 21 units share one 1-element grammar-concept set (ja.unit.admin-applications, ja.unit.admin-appointments, ja.unit.admin-documents, ja.unit.admin-insurance, ja.unit.admin-money-out, ja.unit.body-symptoms, ja.unit.city-shops, ja.unit.comm-sounds, ja.unit.ent-games, ja.unit.ent-tv, ja.unit.food-dairy-sweets, ja.unit.food-dishes, … (+9 more, see --json)) — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band a2: 2 units share one 2-element grammar-concept set (ja.unit.city-time-every, ja.unit.city-time-this) — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band a2: 11 units share one 1-element grammar-concept set (ja.unit.body-body-parts2, ja.unit.comm-greetings2, ja.unit.ent-people, ja.unit.ent-sports, ja.unit.food-meals, ja.unit.food-tastes, ja.unit.food-treats, ja.unit.rel-bonds, ja.unit.rel-family, ja.unit.rel-family-members, ja.unit.weather-cold-warm) — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band a2: 4 units share one 1-element grammar-concept set (ja.unit.admin-confirm, ja.unit.admin-money-in, ja.unit.food-cooking-verbs, ja.unit.shopping-fitting) — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band a2: 4 units share one 1-element grammar-concept set (ja.unit.ent-results, ja.unit.shopping-money, ja.unit.shopping-numbers-shop, ja.unit.weather-temperature) — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band a2: 2 units share one 1-element grammar-concept set (ja.unit.shopping-counters1, ja.unit.shopping-counters2) — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band a2: 3 units share one 1-element grammar-concept set (ja.unit.body-minor-ailments, ja.unit.rel-feelings, ja.unit.weather-small-big) — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band a2: 2 units share one 1-element grammar-concept set (ja.unit.body-habits, ja.unit.comm-how-to) — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band a2: 2 units share one 1-element grammar-concept set (ja.unit.body-checkup, ja.unit.rel-life-events) — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band a2: 2 units share one 1-element grammar-concept set (ja.unit.weather-storms, ja.unit.weather-weather-talk) — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band a2: 2 units share one 1-element grammar-concept set (ja.unit.ent-parties, ja.unit.sports-fitness) — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band a2: 3 units share one 1-element grammar-concept set (ja.unit.rel-memories, ja.unit.sports-competition, ja.unit.sports-recovery) — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band b1: 155 units share one 1-element grammar-concept set (ja.unit.accepting-feedback, ja.unit.ai-tool-talk, ja.unit.anecdote-telling, ja.unit.application-essay, ja.unit.argument-paragraphs, ja.unit.article-summary, ja.unit.attending-ceremonies, ja.unit.background-setting, ja.unit.balanced-nutrition, ja.unit.booking-problems, ja.unit.border-documentation, ja.unit.building-suspense, … (+143 more, see --json)) — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band b2: 313 units share one 1-element grammar-concept set (ja.unit.660-motivation-theory, ja.unit.661-personality-psychology, ja.unit.662-development-stages, ja.unit.663-social-psychology, ja.unit.664-emotion-theory, ja.unit.666-wellbeing-research, ja.unit.667-behavior-change, ja.unit.669-language-and-mind, ja.unit.670-decision-science, ja.unit.671-mental-health-policy, ja.unit.673-public-health, ja.unit.674-epidemiology-basics, … (+301 more, see --json)) — pattern is ai-drafted-template shaped, needs calibrated human review.
  - [ ] band on-ramp: 3 units share one 1-element grammar-concept set (ja.unit.greetings-times, ja.unit.partings, ja.unit.politeness-basics) — pattern is ai-drafted-template shaped, needs calibrated human review.

- no-stage-progression — 1 finding(s):
  - [ ] unit `ja.unit.sound-contrasts` (band a1): types ['hvpt'] never exceed stage kinds ['scaffolded'] — pattern is ai-drafted-template shaped, needs calibrated human review.
