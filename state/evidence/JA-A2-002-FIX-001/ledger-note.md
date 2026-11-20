# JA-A2-002-FIX-001 — ledger note (fixed ids + bake record)

Applies the JA-A2-002 review verdicts (findings in `state/evidence/JA-A2-002/findings-2026-11-20.md`).
Per frozen decision the 80 `changes-requested` rows in `languages/ja-JP/reviews.jsonl` stay as the
historical record — no verdict flips. This note is the fixed-id manifest.

## Corrections (80 rows, in place, content ids untouched)

80 review rows ↔ 80 corrected items (1:1, verified programmatically — every `target_id` of a
changes-requested A2 row has exactly one applied correction):

```
rev-2026-11-20-a2-015 -> ja.lex.admin.denpyou
rev-2026-11-20-a2-021 -> ja.lex.admin.jushou-todoke
rev-2026-11-20-a2-029 -> ja.lex.admin.kessaku
rev-2026-11-20-a2-030 -> ja.lex.admin.kin-yuu
rev-2026-11-20-a2-031 -> ja.lex.admin.kinen-bi
rev-2026-11-20-a2-036 -> ja.lex.admin.mibungou
rev-2026-11-20-a2-039 -> ja.lex.admin.nyuusatsu
rev-2026-11-20-a2-050 -> ja.lex.admin.taishu-kin
rev-2026-11-20-a2-063 -> ja.lex.admin.zei
rev-2026-11-20-a2-091 -> ja.lex.body.fukatsu
rev-2026-11-20-a2-092 -> ja.lex.body.fukkyuu
rev-2026-11-20-a2-099 -> ja.lex.body.inmu
rev-2026-11-20-a2-101 -> ja.lex.body.junyou
rev-2026-11-20-a2-102 -> ja.lex.body.kaffa
rev-2026-11-20-a2-107 -> ja.lex.body.kounyuu
rev-2026-11-20-a2-123 -> ja.lex.body.shinryoujo
rev-2026-11-20-a2-127 -> ja.lex.body.shoumyou
rev-2026-11-20-a2-131 -> ja.lex.body.taisha
rev-2026-11-20-a2-149 -> ja.lex.city.kanen
rev-2026-11-20-a2-293 -> ja.lex.ent.joju
rev-2026-11-20-a2-296 -> ja.lex.ent.kangeki
rev-2026-11-20-a2-299 -> ja.lex.ent.karaoke
rev-2026-11-20-a2-317 -> ja.lex.ent.taimu
rev-2026-11-20-a2-335 -> ja.lex.food.gozen
rev-2026-11-20-a2-338 -> ja.lex.food.houshi
rev-2026-11-20-a2-346 -> ja.lex.food.naifu
rev-2026-11-20-a2-367 -> ja.lex.food.tsukemono
rev-2026-11-20-a2-409 -> ja.lex.health4.ukuu
rev-2026-11-20-a2-415 -> ja.lex.questions.itsu
rev-2026-11-20-a2-422 -> ja.lex.rel.aishi
rev-2026-11-20-a2-428 -> ja.lex.rel.jijou-betsu
rev-2026-11-20-a2-434 -> ja.lex.rel.kazoku-no-uni
rev-2026-11-20-a2-438 -> ja.lex.rel.kokoro-bazuka
rev-2026-11-20-a2-441 -> ja.lex.rel.kyoudai-shita
rev-2026-11-20-a2-442 -> ja.lex.rel.kyoudai-ue
rev-2026-11-20-a2-446 -> ja.lex.rel.obaa-chan
rev-2026-11-20-a2-450 -> ja.lex.rel.omoide-bako
rev-2026-11-20-a2-451 -> ja.lex.rel.omoide-no-hi
rev-2026-11-20-a2-452 -> ja.lex.rel.omoide-no-hito
rev-2026-11-20-a2-453 -> ja.lex.rel.omoide-no-ki
rev-2026-11-20-a2-454 -> ja.lex.rel.omoide-no-kioku
rev-2026-11-20-a2-455 -> ja.lex.rel.omoide-no-machi
rev-2026-11-20-a2-456 -> ja.lex.rel.omoide-no-sora
rev-2026-11-20-a2-457 -> ja.lex.rel.omoide-no-tabi
rev-2026-11-20-a2-458 -> ja.lex.rel.omoide-no-uta
rev-2026-11-20-a2-466 -> ja.lex.rel.tsuui
rev-2026-11-20-a2-468 -> ja.lex.rel.yori-modosu
rev-2026-11-20-a2-474 -> ja.lex.shopping.fukuban
rev-2026-11-20-a2-487 -> ja.lex.shopping.keshi
rev-2026-11-20-a2-492 -> ja.lex.shopping.man-en
rev-2026-11-20-a2-494 -> ja.lex.shopping.mon
rev-2026-11-20-a2-507 -> ja.lex.shopping.sen-en
rev-2026-11-20-a2-509 -> ja.lex.shopping.shouhyou
rev-2026-11-20-a2-555 -> ja.lex.sports.jimu
rev-2026-11-20-a2-557 -> ja.lex.sports.joutairyoku
rev-2026-11-20-a2-563 -> ja.lex.sports.kessan
rev-2026-11-20-a2-573 -> ja.lex.sports.onsen-tou
rev-2026-11-20-a2-588 -> ja.lex.sports.taekwondo
rev-2026-11-20-a2-592 -> ja.lex.sports.tanso-undo
rev-2026-11-20-a2-599 -> ja.lex.weather2.amu
rev-2026-11-20-a2-614 -> ja.lex.weather2.kijitsu
rev-2026-11-20-a2-624 -> ja.lex.weather2.naga
rev-2026-11-20-a2-625 -> ja.lex.weather2.naru
rev-2026-11-20-a2-645 -> ja.lex.weather2.yuki-yinga
rev-2026-11-20-a2-646 -> ja.lex.weather2.yukidoke
rev-2026-11-20-a2-792 -> ja.sent.address-registration
rev-2026-11-20-a2-798 -> ja.sent.call-police
rev-2026-11-20-a2-799 -> ja.sent.check-balance
rev-2026-11-20-a2-802 -> ja.sent.city-hall
rev-2026-11-20-a2-806 -> ja.sent.describe-symptom
rev-2026-11-20-a2-809 -> ja.sent.eat-fruit
rev-2026-11-20-a2-810 -> ja.sent.explain-grammar
rev-2026-11-20-a2-821 -> ja.sent.health-check
rev-2026-11-20-a2-825 -> ja.sent.insurance-card
rev-2026-11-20-a2-829 -> ja.sent.keep-receipt
rev-2026-11-20-a2-836 -> ja.sent.on-sale
rev-2026-11-20-a2-837 -> ja.sent.pay-bill
rev-2026-11-20-a2-840 -> ja.sent.quarrel-reconcile
rev-2026-11-20-a2-843 -> ja.sent.recovery-onsen
rev-2026-11-20-a2-853 -> ja.sent.take-prevention
```

Files touched: `languages/ja-JP/lexicon/{admin,body,city,entertainment,food,health4,questions,relationships,shopping,sports,weather2}.jsonl`
and `languages/ja-JP/sentences/entries.jsonl`. Gloss/definition-only fixes did not invalidate audio;
every fix that changed a taught form/reading/sentence text is in the re-bake set below.

Late follow-up correction (caught during re-bake triage): `ja.lex.rel.omoide-no-machi` — the
coinage-cluster fix replaced the taught form with ふるさと/故郷 (furusato); audio re-baked to match.

## Audio re-bake (K-65 reading pairing — 63 assets)

All 63 invalidated assets re-baked with `scripts/generate-pack-audio.py --pack languages/ja-JP --force
--only <id>` (qwen3-tts-customvoice-1.7b / ono_anna):

- Batch (62 ids): 59 passed first pass — see `bake-batch.log`.
- 3 runaway-output failures (`ja.lex.admin.jushou-todoke`, `ja.lex.rel.omoide-no-machi`,
  `ja.lex.shopping.keshi` exceeded the duration cap after retries) re-rolled individually — all
  certified at natural duration (1.12 s / 2.0 s / 0.72 s).
- `ja.sent.eat-fruit` baked separately pre-batch.
- Settlement proof: all 63 manifest rows sha256-match their on-disk wavs (recomputed per id).

## Word-timing sidecar disposition

`media/words.jsonl` carried stale per-word timings for 62 of the 63 re-baked clips (timings derived
from the OLD audio). Those 62 rows were REMOVED — unaligned clips render plain-text per the sidecar
contract (missing row = plain playback, never wrong karaoke). Timing refresh for the 63 clips
follows as a dedicated card (WT infra, not this lane's gate).

## Gates (re-run at commit on the fixed + re-baked tree)

`cargo run -q -p lts-langpack-cli -- {validate,lint,audit-curriculum,audit-lexicon,audit-licenses,audit-sources,test} languages/ja-JP`
— all exit 0, **0 errors 0 warnings** (full battery log: `gates.log`, unit `lts-a2fix-gates`).

Pack version NOT bumped: publication is owner-gated (O-05) and the bump is coupled to archive
republish — the known published-archive drift (flagged in READER-FLOW-001 close, `9d57f25` evidence)
stands as the owner's republish decision.
