# STORY-AUTHOR-001 — RU story slate plan (owner-scoped 2026-11-17)

Owner directive: "a handful of stories for each difficulty; stories must make sense,
fit the knowledge degree the app represents for that level, be fun, and NOT repeat
the same concept across levels."

## Vocab/grammar grounding rule (how "fits the level" is enforced)
- Story sentences may only use lemmas from **that level's existing drill pool**
  (lemma set extracted from `ru.sent.<level>.*` sentences) **plus a small new-word
  budget**: A1 ≤2, A2 ≤3, B1 ≤4, B2 ≤6 new lemmas per story. New lemmas get a pack
  lexicon entry (stress checked against zalizniak-2010, pack convention) so the
  reader word-card can gloss them.
- Grammar per level matches the pack grammar inventory for that band (A1: present
  tense, no prefixed motion verbs; A2: past tense, basic aspect pairs, basic motion
  verbs; B1: complex sentences, conditionals; B2: participles/gerunds, passive,
  subjunctive, abstract register).
- Concept diversity: one concept family (comedy/mystery/cozy/sci-fi-farce/etc.) may
  appear at most once across the whole slate.

## Slate (16 new stories; keep existing 3 CP stories as-is until replaced)
Each story: story-owned sentence ids `ru.sent.st.<slug>.NN`, 5–10 sentences forming
one paragraph flow, declared readings (stress marks), status: draft (ADR-0040),
one narrator per story (pack narrator ono_anna; STORY-LISTEN-001 gate).

### A1 (5–6 sentences; cozy/everyday comedy)
1. `kot-doma` — «Кот дома»: the cat stays alone and "attends" the family's online lesson. (comedy, POV twist)
2. `moy-den` — «Мой день»: a morning routine where everything is slightly, cheerfully wrong. (routine comedy)
3. `shapka-v-parke` — «Шапка в парке»: a hat travels from head to pigeon to dog to child. (object-chase, no conflict)
4. `podarok-dlya-mamy` — «Подарок для мамы»: baking a secret cake goes messily right. (warm/family)

### A2 (6–8 sentences; past tense, motion, small adventures)
1. `avtobus-ne-prishol` — «Автобус не пришёл»: waiting for a bus becomes a walk full of small discoveries. (journey farce)
2. `sosed-s-gitarioy` — «Сосед с гитарой»: noisy neighbor → improvised duet. (music, likable conflict+resolution)
3. `rybalka-zimoy` — «Рыбалка зимой»: caught nothing, told everything — tall-tale contest between friends. (humor of exaggeration)
4. `telefon-v-taksi` — «Телефон в такси»: lost phone, race across the city, kind stranger. (mini-thriller, gentle)

### B1 (7–9 sentences; complex sentences, conditional, mild mystery)
1. `kluch-ot-dachi` — «Ключ от дачи»: a key found in a second-hand jacket opens a real door. (mystery)
2. `internet-v-derevne` — «Интернет в деревне»: city techie vs. village Wi-Fi; grandpa wins. (tech-vs-tradition comedy)
3. `pismo-ne-temu` — «Письмо не тому адресату»: wrong-address letters turn into a pen-friendship. (correspondence, warmth)
4. `noch-v-poezde` — «Ночь в поезде»: one train compartment, four travelers, one story each. (framed micro-tales)

### B2 (8–10 sentences; participles/gerunds, subjunctive, abstract play)
1. `aukcion-odnoy-kartiny` — «Аукцион одной картины»: two bidders, one painting, one secret. (social comedy with twist)
2. `perevodchik-vse-pereputal` — «Переводчик всё перепутал»: conference mistranslation snowball. (language farce — self-aware for a language app)
3. `gorod-bez-karty` — «Город без карты»: a town that appears on no map, only in one shop's receipts. (magical realism)
4. `dva-bileta-v-odin-teatr` — «Два билета в один театр»: strangers, one seat, a time-twist ending. (clever twist)
5. `spor-o-budushchem` — «Спор о будущем»: café debate about machines that think, settled by the waiter. (ideas-comedy)

## Pipeline (per story, existing tools — no new infra)
1. Author sentences with readings (stress) → `sentences/stories-2026-11.jsonl` +
   `stories/<slug>.yaml` (new `level: a1|a2|b1|b2` field; no app loader validates
   stories yet — READER-FLOW-001 will).
2. New lemmas → `lexicon/stories-2026-11.jsonl`, stress verified via zalizniak-2010
   checkout (c39322c), pymorphy3 for POS/gender (pack convention).
3. Bake audio via `generate-pack-audio.py --tts qwen3 --speaker ono_anna` (pack
   narrator; voice gate applies) on omarchy; ASR gate (`qa-asr.py`) + `bake-bestof.py
   --k 8` for failures; exhausted clips flagged, never shipped garbled.
4. All content stays `status: draft` — in-app 👍/👎 confirmations (accepted
   CONTENT-CONFIRM-001 mechanic) are the promotion gate; no content gate weakened.
5. Bump pack version per PACK-VERSION-BUMP; validate_handoff must pass.

## Sequencing
Authoring is independent per level → driver lane can do one level per burst
(A1 first: smallest vocab pool, fastest to validate the format end-to-end,
then owner auditions A1 stories before A2–B2 are mass-authored).
