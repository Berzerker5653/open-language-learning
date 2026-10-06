# Corrections applied from AI screening pass (2026-10-05/06)

Machine screening of all 433 content batches (model-a pass: project agent model;
see `model-a-merged.jsonl`, `flags.jsonl`). Fixes applied only through
deterministic dictionary gates (JMdict 3.6.2, Zaliznyak 6th ed., pymorphy3);
model judgment was used only to *find* candidates, never to write content.
Full per-change log: `applied.jsonl`.

## ja-JP (pack 0.1.0 -> 0.2.0)

- **Duplicate ids removed** (2): `ja.lex.body.taisha` (identical dupe),
  `ja.lex.work2.shouhou` (kept gloss "praise" = 称報; removed wrong "proposal").
  Root cause: validator `duplicate_id` was blind to v0.2 `lexicon-entry`
  (registration list still said `lexical-entry`) — fixed in `lts-langpack`
  with fixture + regression test.
- **347 kana readings corrected** to the real JMdict word matching the entry's
  English gloss within ≤2 kana edits (e.g. ぜんそう->ぜんてい "premise",
  はんたい->はんろん "counterargument", さくほう->しゅほう "method",
  めるでぃ->めろでぃ). Romaji readings regenerated (modified Hepburn).
- **703 flagged entries left unchanged** (`action: unresolved` in
  `applied.jsonl`): no unique dictionary reading within 2 edits. These remain
  `draft` and are the priority list for any future review pass.

## ru-RU (pack 0.1.0 -> 0.2.0)

- **Stress corrected** against Zaliznyak 6th ed.: писа́ть->пи́сать (x2),
  дорого́й->доро́гой, plus 13 whole-lexicon re-checks; тотчас restored to
  тотча́с after the index briefly accepted a double-stress headword variant
  (index now rejects multi-stress entries).
- **Part-of-speech**: 20 adjectival participles verb->adjective (pymorphy3
  confirmed); правда particle->noun.
- **Gender**: filled for unambiguous nouns via pymorphy3; 110 empty-string
  genders removed (schema violation introduced and cleaned same session).

## Not applied (deliberate)

- Gloss rewrites: the gloss is the author's intent; the reading is what drifts.
  Replacing glosses with dictionary senses of garbled readings preserved errors.
- Sentence rewrites: dictionary-token matching produced garbage substitutions
  (e.g. "What time is it?" -> こんぜさくひ); all reverted. Sentence-level
  correction needs real grammar tooling or human review.
- Assessment rubric edits: judgment calls, no deterministic gate.

## Method notes (for reuse)

- `tools/pack-audit/fix-ru-screening.py`, `tools/pack-audit/apply-screening-fixes.py`
  are the applied fixers; batch construction in `docs/review/` packet zip.
- Screening verdicts: completion-with-schema proved unreliable at scale
  (stream stalls, ~70% group failure); `judge_batch`-style per-item judgment
  over rendered items + dictionary context was reliable (0 failures / 9,024
  items) and is the recommended harness shape.
