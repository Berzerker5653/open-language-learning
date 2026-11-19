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


## A2 batch COMPLETE + B1 resume recipe (controller, 2026-11-18 ~15:45)

A2 LANDED: 4 stories, 26 sentences, 4 lexicon entries, 30 clips baked and ASR-certified
(28 pass round 1 + 2 pass round 2), validate/lint languages/ru-RU 0 errors, budget check
2/3+3/3+2/3+1/3 exit 0. Evidence: state/evidence/STORY-AUTHOR-001/a2-bake/gates.log.

B1 RESUME RECIPE (next burst; do not re-derive):
1. Author 4 B1 stories per the slate above (kluch-ot-dachi, internet-v-derevne,
   pismo-ne-temu, noch-v-poezde): 7-9 sentences each, complex sentences +
   conditionals, <=4 new lemmas/story vs the B1 drill pool; sentence ids
   ru.sent.b1.<slug>.NNN; story YAML + lexicon ids romanized ([a-z0-9._-]).
2. Budget-check on GamingPC with ~/.venvs/vocab/bin/python tools/vocab-budget-check.py
   (pymorphy3 now installed there; stories.json input shape = the A2 recipe in the
   mid-flight section below).
3. Bake on omarchy: copy source files there, then run the loop in a FRESH DIR
   (see gates.log ENV TRIAGE: stale qa-rN.jsonl in ~/LTS root poisons resume)
   with LANG='russian' (generate rejects 'ru'), keep a pristine ids copy
   (the loop rewrites its IDS file in place), fish shell -> launcher script.
4. scp wavs + manifest rows back, sha-verify per row, then
   cargo run -p lts-langpack-cli -- validate languages/ru-RU -> expect 0 errors
   (the 6 'package' schema rows were fixed as a chore 2026-11-18 — baseline is now 0).
5. Commit content lane, then ledger (task-state + this notes file + KANBAN row).
6. B2 batch last (8-10 sentences; participles/gerunds, subjunctive; <=6 new lemmas).

## A2 batch mid-flight state + resume recipe (controller, 2026-11-18 ~14:00)
The 13:34 burst drafted the A2 batch then hit its iteration limit mid-verification. Controller triage since:
- DRAFTED (uncommitted, working tree): 4 stories (`avtobus-ne-prishol`, `sosed-s-gitarioy`, `rybalka-zimoy`, `telefon-v-taksi`), 26 sentences appended to sentences/entries.jsonl, 4 lexicon entries in lexicon/stories202611.jsonl, 4 story YAMLs, tools/vocab-budget-check.py (all budgets pass: 2/3, 3/3, 2/3, 1/3 new lemmas).
- FIXED by controller: the 4 lexicon ids were Cyrillic (pack grammar is [a-z0-9._-]) -> romanized slugs fonar/gitara/lunka/sidene; A1 cloze capital bugs (ru.sent.a1.kot-doma.u003, ru.sent.a1.podarok-dlya-mamy.u004) -> targets now match sentence-initial "Чашка"/"Чек" (cloze checks are verbatim `text.contains(target)` — sentence-initial targets must be capitalized).
- Remaining validate errors are ONLY: 6 pre-existing manifest synthesizer 'package' schema rows (older campaign artifacts, not this lane) + media_asset_missing x30 = this lane's unbaked ids.

RESUME ORDER for the next burst (do not re-derive):
1. Bake 30 clips (26 sentences ru.sent.a2.<slug>.uNNN + 4 lexicon ru.lex.stories202611.{fonar,gitara,lunka,sidene}) on omarchy exactly as the A1 batch did — see state/evidence/STORY-AUTHOR-001/bake.log for the working invocation (`generate-pack-audio.py --tts qwen3 --speaker ono_anna`, voice guard will enforce narrator).
2. ASR gate via qa-asr.py round-trip + scripts/bake-repair-loop.sh for failures (soft-sign rules from the R15-R18 native rulings apply to word clips).
3. Copy manifest rows ONLY back into the pack tree (wavs stay gitignored), re-run `cargo run -p lts-langpack-cli -- validate languages/ru-RU` -> expect only the 6 pre-existing 'package' rows.
4. Commit as ONE lane: story YAMLs + entries.jsonl (incl. the controller cloze fixes) + lexicon + tool + evidence dir + ledger update (STORY-AUTHOR-001 stays in_progress; B1 batch next).
5. Story clips remain word-timing substrate only (reading-first directive): no listen-mode UI work.

## B2 RESUME RECIPE (controller, 2026-11-18 23:30 — the numbered recipe the B1 row references)
Slate accounting: the slate is **17 stories** (A1 4 + A2 4 + B1 4 + B2 5). 12 landed. B2 is the LAST batch — after it, STORY-AUTHOR-001 content is complete pending owner acceptance; do not invent more stories.
1. Author the 5 B2 stories per the slate rows above (slugs: aukcion-odnoy-kartiny, perevodchik-vse-pereputal, gorod-bez-karty, dva-bileta-v-odin-teatr, spor-o-budushchem): 8-10 sentences each, participles/gerunds/subjunctive/abstract register, new-lemma budget <=6/story, ids `ru.sent.st.<slug>.NN`, status: draft. Lexicon entries with zalizniak-2010 (c39322c) stress verification; lexicon/sentence ids must be `[a-z0-9._-]` only (romanize, never Cyrillic).
2. Bake ON OMARCHY ONLY (ssh omarchy, user aih, ~/LTS clone): fresh b2b dir (never reuse dirs), generate-pack-audio qwen3/ono_anna, qa-asr round-trip, bake-repair-loop for failures, bake-bestof --k 8 as last resort; exhausted ids flagged, never shipped. scp wavs back; sha256+bytes must match manifest rows 1:1 before proceeding (~35 clips/hr sustained).
3. Cloze targets must appear VERBATIM (capitalized forms for capitalized targets) in the sentence text; run vocab-budget-check (exit 0), lts-langpack-cli validate + lint, cargo test -p lts-langpack.
4. Commit content lane + ledger lane (evidence under state/evidence/STORY-AUTHOR-001/b2-bake/). `python3 tools/validate_handoff.py --require-explicit-ledger-records` MUST PASS un-piped before push. After B2 commits, mark the card review (owner acceptance + 0.4.5 republish are owner-gated, not agent-doable) and promote READER-FLOW-001 into `now`.


## B2 BAKE STATUS (controller, 2026-11-19 01:25 — CLEARED 01:50: chain EXIT-0 clean, controller ran copy-back + commit; B2 is now LANDED)
- B2 content is DRAFTED in the working tree (5 story yamls, +40 sentences incl. u008 cloze fixed to "написал", +34 lexicon incl. 9 retro glosses; vocab-budget strict all OK; validate = 1 error = the 74 unbaked ids). UNCOMMITTED by design until the bake lands.
- The 74-clip bake runs ON OMARCHY as systemd user unit `lts-b2b` (dir ~/LTS/b2b, ids b2b/b2ids.txt, 4 rounds, log b2b/b2-loop.log, completion marker b2b/CHAIN.done). Started 01:25, ETA ~03:30-04:00.
- 03:00 burst: DO NOT start a new bake and DO NOT touch the content lane. If `ssh omarchy test -e ~/LTS/b2b/CHAIN.done` fails, just report "b2 chain running, commit deferred" and end (controller handles copy-back/commit; the controller is watching CHAIN.done).
- Copy-back after CHAIN.done: scp wavs for the 74 ids + take manifest rows for those ids from omarchy manifest.jsonl; verify sha256+bytes 1:1; append rows to local media/manifest.jsonl; validate/lint 0 errors; cargo test -p lts-langpack; then commit per the recipe (chore tool-fix lane, content lane, ledger lane). Card -> review when done (owner acceptance + 0.4.5 are owner-gated).
