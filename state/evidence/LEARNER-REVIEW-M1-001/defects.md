# LEARNER-REVIEW-M1-001 — defect ledger (Month-1 learner experience, RU + JA)

Format per the frozen contract (state/notes/LEARNER-REVIEW-M1-001.md):
`id | surface | day_reached | severity | evidence | disposition`

| id | surface | day_reached | severity | evidence | disposition |
|----|---------|-------------|----------|----------|-------------|
| D-001 | daily-plan content selection (engine) — both packs | 1 | **blocker — FIXED** | `rca-progression-starvation.md` + run-2 `sim/raw` day logs: RU learner received 6 practice items total across days 1-30, JA 15; from day 2 the plan was 100% weak-skill reviews, `current_offer` null every day, gate units frozen (RU `cyrillic-a-o-m-t` 3/4; JA `kana-hiragana-vowels-ko` 3/10). Post-fix re-sim (RUN 3): RU 94 / JA 230 unique content items over 30 days, offers 30/30 days — `experience-review.md` + fresh `sim/raw*` | fixed by FIX-M1-PROGRESSION-001 (code 87786961); re-verified this run |
| D-002 | journey-sim harness (tooling) | — | known-limit (tooling) | `Serve.stop()` SIGTERMs the faketime wrapper; on a worker kill the lts-serve children survive (60+ leaked processes observed, ~8 GB RSS) | harness patched same-run (`start_new_session` + process-group kill); sim-changelog entry in `~/.hermes/sim/lts.md` |
| D-003 | path view carries the whole pack catalog from day 1: 823 RU (803 locked) / 819 JA (777 locked) unit titles, many advanced English slugs ("carbon economics", "thesis defense", "writing petitions") in BOTH packs | 1 | fix | `experience-review.md` finding 1; `unit_path` day-30 payload in `sim/raw/*`; fresh-context lanes ja-012..042 + ru-027..032 independently flagged the same block | FIX-M1-PATH-VIS-001 (board card; collapse/hide far-future units behind band headers + wire-surface copy rule) |
| D-004 | RU new-content inflow ~3 items/day vs JA ~8 (94 items for the whole month) | 1-30 | fix | `experience-review.md` finding 2; per-day metrics in `exp-metrics.py` over `sim/raw` | FIX-M1-CONTENT-RU-001 (board card; densify early-unit pools) |
| D-005 | audit tooling (this card): worklist pulled non-learner-facing payload fields (morphology `labels`, plan `reason` slugs) inflating the learner-text inventory; AND the old mech-pass answer-key check was vacuous (keyed on a `practice_submit` field that does not exist) while its item-stable-choices model broke on the letter-drill rotation | — | known-limit (tooling) — FIXED in-run | this section + `gates.log` RUN 3. Gate-script change NAMED per the GATE INTEGRITY rule: `scripts/month1_mech_pass.py` now pairs submits with their practice_task in call order and checks per-occurrence: exactly one server-graded correct choice, member of that serving's choices; distractor legality per occurrence; rotating letter drills capped at 2 distinct keys (the FIX card's intended prompt-family rotation) | fixed in-run; residual over-inclusion labeled in experience-review finding 3; sim-changelog entry appended |
| D-006 | internal slugs (`weak-skill`, `due-review`, morphology tags like `acc.pl`) ride wire payloads one render away from learner eyes | 2+ | known-limit | `experience-review.md` finding 3 | fold a wire-surface rule into FIX-M1-PATH-VIS-001 acceptance (`tools/audit_learner_copy.py` extension) |
| D-007 | RU unit titles mix English ("Abuse") and Russian ("Вчера и в прошлом году") with no visible rule | 1 | known-limit (pending curriculum intent) | `experience-review.md` finding 4; reviewer lanes ru-027..032 | curriculum-owner decision; no code fix until intent is pinned |
| D-008 | RU content: wrong stress marks — and audio baked to the wrong marks | day 1 story/quiz surfaces | fix | pinned in source: `ru.sent.cp.p34` "Ско́лько стои́т батон хле́ба?" (should be бато́н хлеба́), `ru.sent.cp.p35` "Я пла́чу за проду́кты ка́рточкой." (плачу́ — as marked it is the cry-verb), `ru.sent.cp.p26` "В ле́су тихо и зелено́." (лесу́), story titles `Прогу́лка в ле́су` (stories/walk-in-the-forest.yaml) and `Ша́пка в са́ду` (stories/shapka-v-parke.yaml) (locatives лесу́/саду́); media manifest + words.jsonl rows carry the same marks | FIX-M1-CONTENT-RU-001 (text fix + re-bake list for the 3 sentence ids in that card) |
| D-009 | JA content: wrong kana verb cards + loanword orthography | day 14-17 lesson_plan | fix | pinned in raw logs: `ja.lex.verbs.kaerimasu` displays かえりざく / 返り咲く (a real word, "return to one's former glory" — but not the verb the id+gloss "to go back; to come back" promise; wants かえります), `ja.lex.verbs.arukimasu` displays あるきだす (="start walking") with gloss "to walk" (wants あるきます), `ja.lex.verbs.nemasu` displays ねかす (transitive "put to sleep") with gloss "to sleep; to go to bed" (wants ねます); `ja.sent.concert-fun` こんさーと (lexicon `ja.lex.ent.konsaato` is hiragana too) vs the pack's katakana-for-loanwords convention (コンサート) | FIX-M1-CONTENT-JA-001 (board card) |
| D-010 | JA morpheme-slot artifact (lane ja-049 items 1162-1165: junk label "the rest wish" on おやすみ, bound form なさい as its own slot) | 13, 14, 19 | **fix — REPRODUCED** | reviewer lane verdict `review/verdicts/ja-049.md`; **takeover-B reproduction from raw day logs**: `practice_task` item `ja.lex.greetings.oyasumi-nasai#recall-meaning` carries `slots [{text:"おやすみ",label:"the rest wish"},{text:"なさい",alternatives:["なさい","ませ"],label:"the polite ending",target:true}]` on days 13/14/19; root cause pinned in DATA — the same `slots` array is stored in `languages/ja-JP/lexicon/greetings.jsonl` (not an item split across two surfaces, as the reviewer lane inferred) | **confirmed -> FIX-M1-CONTENT-JA-001 scope 3** (reproduce-or-close gate satisfied; severity raised known-limit -> fix) |
| D-011 | JA Month-1 audio subset ASR flags — 82 duration-suspect + 18 short-word transcript mismatches (1-2 mora: ほん/ペン/えん/ひゃく/あめ…) | 1-30 | known-limit | `asr-ja.jsonl` rows; prior-campaign cross-check: several ids recorded `round2:exhausted` in `PACK-AUDIO-VERIFICATION-001/disposition-*.csv`; ja-JP audio verification retired by owner 2026-11-06 (human audio QA Russian-only) | no blocker: advisory under the retired-ja-QA posture; RU subset is 149/149 clean. If the owner ever reopens JA audio QA, start from this row's flag list. |
| D-012 | EN gloss naturalness in RU story surfaces (ru worklist items 670, 701: "Supper was already at home, but I was very glad." / "The open-air market works in the morning.") | day 20+ | fix | verdicts `review/verdicts/ru-028.md`, `ru-030.md` (both carry the suggested rewrite) | FIX-M1-CONTENT-RU-001 (gloss rewrites; text-only, no audio) |
| D-013 | RU vocabulary surfaces ship marked AND unmarked duplicates of the same word (items 909/910, 916/919, 917/920, 921/922, 923/924, 926/928, 931/932, 934/935) | day 24+ | known-limit | verdicts `ru-038.md`, `ru-039.md` (flagged once per chunk, "likely intentional pair") | confirm intent during FIX-M1-CONTENT-RU-001's stress sweep (marked form should win in the NEW pool; unmarked pair is dedupe/no-op); no learner-facing error proven |

## Mechanical pass (pass 1) — RUN 3 (post-D-001-fix inventory)

- Worklist rebuilt over fresh 60 day logs: RU **1153** / JA **1350** unique
  text items (`sim/worklist.json`; build: `asr-ids-build.py` +
  `sim_month1.py --build-worklist`).
- `scripts/month1_mech_pass.py` with the occurrence-level model (D-005):
  **RU 0 failures / JA 0 failures, coverage 100.0% both packs**; 34 RU +
  78 JA rotating letter drills each verified ≤2 distinct server-graded keys
  with per-occurrence single-key + membership checks. Reports:
  `mech-pass/mech-{ru,ja}.{json,md}`.
- Warnings routed to reviewer lanes (not dropped): RU 72
  (`ru.lexicon.unknown-lemma`), JA 9 (`ja.lexicon.not-in-jmdict`).

## Fresh-context review (pass 2) — RUN 3

- 106 prose chunks (RU 49, JA 57, 24 items/chunk) + 2 lexwarn chunks,
  reviewed by 8 fresh-context lanes (4 RU-only, 4 JA-only; the content
  authors were prior cards, so any fresh lane is independent).
  Per-chunk verdicts + reasoning: `review/verdicts/`.
- Aggregate flags (RE-TALLIED programmatically over all 108 verdict files by
  takeover-B; derivation + the figures this supersedes in `gates.log` V2):
  **RU fix 7 / known-limit 57; JA fix 64 / known-limit 561** (the JA
  known-limit mass is the D-003 catalog block counted per item). Real
  content fixes = D-008 (ru items 670, 701, 895, 897, 906, 908, 913) and
  D-009/D-010 (ja items 162, 176, 990, 1162, 1165, 1183, 1188, 1257; the
  remaining ja fix flags are the wrong-level catalog rows of D-003).
  Lexwarn verdicts: RU 4/72 real (all in D-008); JA 0/9 (all false
  positives — kanji-headword misses + valid yōon). An earlier draft of this
  ledger stated "RU fix 70 / known-limit 54; JA fix 64 / known-limit 343";
  only JA fix 64 reproduced — the mismatch was a severity-token parse
  (the `fix: <suggestion>` shape and 66 severity-less "Re-level" lines in
  ru-014..026), not lost findings.
- Merge audit (takeover-B): two verdict findings had NO ledger row and are
  now ledgered here — the awkward English glosses (ru items 670 "Supper was
  already at home, but I was very glad." → "Dinner was already waiting at
  home…", 701 "The open-air market works in the morning." → "…is open in the
  morning") = **D-012**; the marked/unmarked vocabulary duplicate pattern the
  RU lanes flagged once per chunk (ru-038 items 909/910, ru-039 items
  916/919/920/922/924/928/932/935) = **D-013**. The JA lanes graded the same
  D-003 catalog block `fix` (remove/reschedule: "possibly wrong-pack
  content") while the RU lanes graded it `known-limit`; the ledger keeps the
  more conservative disposition (D-003 -> FIX-M1-PATH-VIS-001 hides it from
  the learner) and records the disagreement here: if the catalog titles are
  curriculum intent they stay, and only D-007's owner decision settles it.

## ASR audio subset (pass 1 sub-pass P-1) — RUN 3

- 149 RU + 215 JA manifest ids intersected with the Month-1 worklist
  (`asr-ids-build.py`, `asr-ids-{ru,ja}.txt`); judge whisper.cpp
  ggml-large-v3-turbo (PACK-AUDIO-VERIFICATION-001 posture), forced to CPU
  (GPU at 30.7/32.6 GB from the local 27B engine; first attempt's model load
  crashed — see `gates.log`).
- Results: `asr-{ru,ja}.jsonl`; tallies: **ru 149/149 ok**; **ja 115/215
  ok, 100 flagged** — 82 duration-suspect (short-clip cap heuristic) + 18
  heard-transcript mismatches, all 1-2-mora words. See gates.log RUN 3 +
  D-011. The id-set generator script died with the interrupted run-3
  worker (not committed); provenance re-verified by takeover-A (ids ⊆
  media manifest; drill stems trace to sim-referenced curriculum units).

## Residual uncertainty + continuation

- `residual-uncertainty.md` — the honesty manifest (human native review,
  register, narrator timbre, contested stress, curriculum intent).
- M2 continuation: `LEARNER-REVIEW-M2-001` (days 31-60, same contract,
  scoped by M1's defect distribution: catalog visibility, RU pool density,
  stress/orthography spot-checks).
