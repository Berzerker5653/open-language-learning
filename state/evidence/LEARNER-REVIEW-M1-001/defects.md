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
| D-009 | JA content: wrong kana verb cards + loanword orthography | day 14-17 lesson_plan | fix | pinned in raw logs: `ja.lex.verbs.kaerimasu` displays かえりざく (not a word; gloss "to go back; to come back" wants かえります), `ja.lex.verbs.arukimasu` displays あるきだす (="start walking") with gloss "to walk" (wants あるきます), `ja.lex.verbs.nemasu` displays ねかす (transitive "put to sleep") with gloss "to sleep" (wants ねます); `ja.sent.concert-fun` こんさーと vs pack katakana-for-loanwords convention (コンサート) | FIX-M1-CONTENT-JA-001 (board card) |
| D-010 | JA split-item artifact (lane ja-049 items 1162-1165: gloss "the rest wish", おやすみ/なさい split across two practice_task surfaces) | mid-month | known-limit | reviewer lane verdict `review/verdicts/ja-049.md` | reproduce from raw day logs, then fold into FIX-M1-CONTENT-JA-001 if confirmed |
| D-011 | JA Month-1 audio subset ASR flags — 82 duration-suspect + 18 short-word transcript mismatches (1-2 mora: ほん/ペン/えん/ひゃく/あめ…) | 1-30 | known-limit | `asr-ja.jsonl` rows; prior-campaign cross-check: several ids recorded `round2:exhausted` in `PACK-AUDIO-VERIFICATION-001/disposition-*.csv`; ja-JP audio verification retired by owner 2026-11-06 (human audio QA Russian-only) | no blocker: advisory under the retired-ja-QA posture; RU subset is 149/149 clean. If the owner ever reopens JA audio QA, start from this row's flag list. |

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
- Aggregate flags: RU fix 70 / known-limit 54; JA fix 64 / known-limit 343
  (the JA known-limit mass is the D-003 catalog block counted per item).
  Real content fixes = D-008/D-009. Lexwarn verdicts: RU 4/72 real (all in
  D-008); JA 0/9 (all false positives — kanji-headword misses + valid yōon).

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
