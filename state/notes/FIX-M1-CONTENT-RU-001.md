# FIX-M1-CONTENT-RU-001 — fix Month-1 RU stress-mark defects + thin early-content supply

Source: LEARNER-REVIEW-M1-001 defect ledger (D-008, D-004). Evidence:
state/evidence/LEARNER-REVIEW-M1-001/defects.md + review/verdicts/ru-037.md,
ru-038.md, ru-lexwarn.md.

## Scope

1. **Stress fixes** (exact rows pinned in defects.md D-008):
   - `ru.sent.cp.p34` — батон → бато́н, хле́ба (gen sg of хлеб) → хлеба́
   - `ru.sent.cp.p35` — пла́чу → плачу́ (pay-verb; as marked = cry-verb)
   - `ru.sent.cp.p26` — В ле́су → В лесу́ (locative)
   - stories/walk-in-the-forest.yaml title ле́су → лесу́;
     stories/shapka-v-parke.yaml title са́ду → саду́
   - Sweep ALL RU story/sentence text for unmarked/mis-marked locatives
     (в лесу, в саду, на дому, вверху́-class) before closing.
2. **Audio re-bake** for the three sentence ids (TTS follows the marks —
   media/manifest rows carry the wrong pronunciation; per
   lts-pack-audio-qa per-batch story bake lane, then ASR re-verify).
3. **D-004 thin RU supply**: RU Month-1 sim inflow ~3 new items/day vs JA
   ~8 (94 items/month). Densify the early RU unit pools (claim existing
   unclaimed band-matched content into on-ramp/A1 units; sentence-claim
   campaign rules from ROADMAP precedent: band tag == unit goal band,
   allowed_vocab coverage, fresh-plan exclusion assertion).

## Acceptance

- `python3 tools/qa_stories.py` green (stress vs lexicon readings).
- Shard sweep applied (sentences/entries.jsonl + content-parity-*.jsonl;
  patch by json round-trip over ALL shards; re-align cloze_targets).
- Re-baked wavs pass `scripts/qa-asr.py` for the touched ids.
- Fresh 30-day journey-sim (sim_month1.py) shows RU unique items >= 150
  (target parity-class with JA 230) with logs archived.
- A desktop test that installs the dev pack still passes (content_ref /
  allowed_vocab rule).
- gates.log under state/evidence/FIX-M1-CONTENT-RU-001/.
