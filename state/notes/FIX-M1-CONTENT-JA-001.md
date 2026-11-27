# FIX-M1-CONTENT-JA-001 — fix Month-1 JA kana verb cards + loanword orthography

Source: LEARNER-REVIEW-M1-001 defect ledger (D-009, D-010). Evidence:
state/evidence/LEARNER-REVIEW-M1-001/defects.md + review/verdicts/ja-050.md,
ja-053.md, ja-049.md, ja-lexwarn.md.

## Scope

1. **Wrong verb cards** (raw-lesson_plan provenance, ids pinned in D-009):
   - `ja.lex.verbs.kaerimasu` display かえりざく → かえります
     (the row's kanji form is 返り咲く / reading kaerizaku — "return to one's
     former glory" — a real word, but not the verb the id and gloss promise)
   - `ja.lex.verbs.arukimasu` display あるきだす → あるきます
   - `ja.lex.verbs.nemasu` display ねかす → ねます
   Locate rows in languages/ja-JP lexicon shards; sweep the verb table for
   any other display≠reading-vs-gloss mismatches (extend
   month1_mech_pass-style check or one-off script; findings beyond these
   three go in this card's ledger update).
2. **Loanword orthography**: `ja.lex.ent.konsaato` (lexicon/
   entertainment.jsonl) primary form こんさーと → コンサート, and its consumer
   `ja.sent.concert-fun` (+ media re-bake + ASR re-verify for both ids). Pin
   the pack's loanword convention (katakana — measured: コーヒー x5, テレビ
   x3, パン x2 vs こんさーと x3 in the sentence shards) in the pack
   README/authoring note so it is enforceable.
3. **D-010 morpheme-slot artifact — CONFIRMED by takeover-B reproduction**
   (the reproduce-or-close gate this card depended on is satisfied):
   `practice_task` item `ja.lex.greetings.oyasumi-nasai#recall-meaning`
   carries slots `[{text:"おやすみ",label:"the rest wish"},{text:"なさい",
   alternatives:["なさい","ませ"],label:"the polite ending",target:true}]`,
   observed on sim days 13/14/19. The `slots` array lives in
   languages/ja-JP/lexicon/greetings.jsonl — fix the junk label there (and
   re-check whether the bound form なさい belongs in a learner slot at all).

## Acceptance

- Rows fixed across all shards (json round-trip sweep), manifest/audio
  re-baked + ASR green for touched ids.
- A regression check (test or gate script) rejects lexicon rows where the
  kana display is not a word matching the gloss class for verbs (cheapest
  honest version: display must equal reading AND appear in the pack's own
  verb table).
- gates.log under state/evidence/FIX-M1-CONTENT-JA-001/.
