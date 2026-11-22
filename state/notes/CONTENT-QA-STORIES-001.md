# CONTENT-QA-STORIES-001 — agent accuracy pass over all RU reading stories

Owner delegation (2026-11-21, verbatim): "once again I can't verify if the stories are
accurate so I'll leave that to you to check it". Per the standing owner rule (2026-11-19)
this content-quality call is agent-decided; recorded below as a dated, reversible
acceptance. Stories stay `status: draft` in-pack; in-app learner confirms remain the
promotion gate.

## Story count (verified from files)

`languages/ru-RU/stories/` contains **20 story yaml files** (matches the pack claim):
3 content-parity (band `cp`, authored 2026-10-12) + 17 STORY-AUTHOR-001 batch stories
(5×A1 2026-11-17, 4×A2 2026-11-18, 4×B1 2026-11-18, 4×B2 2026-11-19).
136 sentence references total, all resolved; no duplicate ids; all jsonl shards parse.

## Mechanical layer — `tools/qa_stories.py` (committed, green)

Gate checks per story: structure (refs resolve, ids unique, jsonl parses, cloze targets
appear verbatim in sentence text), vocab budget (level pools from
`state/data/story-vocab-pools-2026-11.json`, budgets A1≤2/A2≤3/B1≤4/B2≤6 new lemmas;
`cp` band predates the pool contract so its budget is WARN — its counted lemmas must
still be glossed in the lexicon, which is enforced as ERROR), lexicon coverage of every
counted new lemma, and dictionary stress verification (accented token position vs the
pack lexicon readings). Final run: **20/20 PASS, exit 0**
(`state/evidence/CONTENT-QA-STORIES-001/qa-stories-final.json`).

Tooling bug found and worked around: the authoring-time `vocab-budget-check.py`
KeyErrors on band `cp` and fragments stress-marked words (U+0301 not in its token class),
scoring accented packs as garbage lemmas. `qa_stories.py` marks-strip-first and maps
`cp`→a1 for pool purposes; the older tool is left untouched (its batches are unmarked).
pykakasi/pymorphy alternative-parse coverage: `цветами` lemmatizes to `цвета|цвет|цветок`;
the strict checker only ever tries the first parse — `qa_stories.py` accepts any parse.

## Human-equivalent layer (native-grade RU judgment, sentence by sentence)

Real defects found and FIXED in source (rewrites use in-pool vocab only):

| sentence | defect | fix |
|---|---|---|
| `a2.avtobus-ne-prishol.u005` | «смотрел кругом» is not natural RU | «смотрел в окно: огни, ночь.» (окно in a1 pool) |
| `a2.telefon-v-taksi.u005` | «принёс мне телефон в наш дом» — wrong direction frame | «он принёс мой телефон к нам домой.» |
| `b1.pismo-ne-temu.u001` | «написала не тот адрес» stilted | «но адрес был не тот.» |
| `b2.dva-bileta-v-odin-teatr.u002` | case government: «в конкурсе за лучший рассказ» | «в конкурсе на лучший рассказ» |
| `b2.spor-o-budushchem.u001` | «мешали всем вокруг кофе и бутербродами» semantically broken | clause deleted, sentence intact |
| `b1.internet-v-derevne.u002` | gloss drift (RU past «не мог» vs gloss present-perfect) | gloss now 'No one in the village could ever do that.' |

Stress errors (dictionary-verified; story text contradicted correct lexicon readings) FIXED:
`cp.p34` сто́ит→стои́т, `cp.p37` го́рячий→горя́чий and мо́локо→молоко́, `cp.p11`
У́рок→Уро́к. Their `cloze_targets` re-aligned to the corrected surface (pack.rs does a
verbatim contains check).

Provenance gap FIXED: aukcion story notes claim 5 new lemmas glossed in
`lexicon/stories202611.jsonl` but **пахнуть was never added**. Added, plus retro-glosses
for the 13 unglossed lemmas the cp stories count against budget (батон, накупить,
горячий, варить, одеваться, выходить, начинаться, светить, ярко, петь, заря, ветка,
птичка) — 14 new draft entries, stress per standard literary norm (no zalizniak checkout
is present on this box, so provenance says so honestly), human review still required.

Judgment calls where the text was left alone (defensible, noted):
- `b2.gorod-bez-karty` «Как можно жить там, чего нет на карте?» — genitive-of-negation
  play, valid in this magical-realism register.
- `b2.perevodchik` «думали про замороженные ягоды» — colloquial «про» fits the farce
  register at B2.
- `a2.sosed-s-gitarioy.u004` «попросила соседа: давай тише» — direct-speech colloquial,
  fine at A2.
- `a1.shapka-v-parke` — romanized id slug says "park" but the story is set in a сад;
  cosmetic id/slug mismatch, rename deliberately deferred (id ripples through media ids,
  activities, published archives for zero learner benefit).
- Two `stress_unverified` WARNs manually verified correct: «хо́лодное», «сиди́т» (their
  lemmas simply lack lexicon entries; stress positions are right).
- `no_stress_marks` WARN: the 2026-11 batches (17 stories) carry zero stress marks in
  sentence text while the cp shard is fully marked. Not a correctness defect, but A1
  text without marks is a real learner-display gap — left as a follow-up for the next
  content pass (marking 800+ words needs per-word stress verification; not this budget).

## Per-story verdicts

PASS after fixes: at-the-market (stress fixes), aukcion-odnoy-kartiny (lexicon gap),
avtobus-ne-prishol (u005), dva-bileta-v-odin-teatr (u002), internet-v-derevne (gloss),
morning-of-anna (У́рок + glosses), pismo-ne-temu (u001), spor-o-budushchem (u001),
telefon-v-taksi (u005), walk-in-the-forest (glosses).
PASS untouched: gorod-bez-karty, kluch-ot-dachi, kot-doma, moy-den, noch-v-poezde,
perevodchik-vse-pereputal, podarok-dlya-mamy, rybalka-zimoy, shapka-v-parke (slug note),
sosed-s-gitarioy.
No story quarantined. No version bump in this card.

## Deferred to the next RU publish (RU-REPUBLISH pattern)

Sentence text changed → existing audio no longer matches text and must be re-baked at the
next publish (ids for `generate-pack-audio.py --force --only`):
ru.sent.a2.avtobus-ne-prishol.u005, ru.sent.a2.telefon-v-taksi.u005,
ru.sent.b1.pismo-ne-temu.u001, ru.sent.b2.dva-bileta-v-odin-teatr.u002,
ru.sent.b2.spor-o-budushchem.u001 (rewrites) and
ru.sent.cp.p34, ru.sent.cp.p37, ru.sent.cp.p11 (stress marks — the old TTS takes may
have FOLLOWED the wrong marked stress, e.g. MOloko; re-bake + gate, not just text swap).
`b1.internet-v-derevne.u002` changed gloss only — no re-bake.
New lexicon entries carry no audio (drill audio only if a later manifest campaign wants it).

## Acceptance statement

**Accepted for dogfood on 2026-11-21, reversible**: all 20 RU reading stories passed the
mechanical accuracy gate (`tools/qa_stories.py` exit 0) and a sentence-by-sentence
agent naturalness/grammar/accuracy review; found defects were fixed in source this pass.
This is an agent acceptance decision under owner delegation — it is NOT a qualified-human
review and changes no `review_status`; stories stay `status: draft`; the in-app
learner-thumbs-up confirm remains the promotion gate. A future human (native) pass may
re-open any verdict here.

## Gate log (lane tier)

See `state/evidence/CONTENT-QA-STORIES-001/gates.log`: qa_stories green 20/20,
unittest tools/test_qa_stories.py 4/4, cargo test -p lts-langpack green at
HEAD+lane-content worktree, langpack CLI validate 0 errors (scaffold mode),
validate_handoff green.
