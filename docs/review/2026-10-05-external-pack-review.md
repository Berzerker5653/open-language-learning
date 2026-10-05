# External accuracy review — ja-JP and ru-RU packs (2026-10-05)

## Method and sources (safety-verified before use)

| Source | What it verifies | Provenance / license | Safety check |
| --- | --- | --- | --- |
| [jmdict-simplified](https://github.com/scriptin/jmdict-simplified) release `3.6.2+20260928191014` (`jmdict-eng` JSON, 218,840 entries) | Japanese headword existence, kana form, English gloss overlap | JMdict/EDRDG data (Electronic Dictionary Research and Development Group), CC BY-SA 4.0; repo 394 stars, automated signed GitHub releases | Static JSON data only — no code executed; downloaded to gitignored `tmp/` |
| [gramdict/zalizniak-2010](https://github.com/gramdict/zalizniak-2010) (Zaliznyak *Grammatical Dictionary*, 6th ed. 2010, ~110k headwords) | Russian word stress position and headword letters | Published with consent of the rights holder (Anna A. Zaliznyak), CC BY-NC | Plain text files; verification-only use (no incorporation into CC0 pack content) |
| `pymorphy3` + `pymorphy3-dicts-ru` (PyPI, isolated venv) | Russian word-form validity, lemma, POS | MIT; OpenCorpora/Zaliznyak-derived offline dictionaries | Well-known maintained package (144 stars); offline dictionaries; no network at runtime |

All verification data stayed in `tmp/` (gitignored). Nothing was copied into pack content; packs remain CC0.

## Findings and fixes applied

### ru-RU (4,000 lexicon entries) — fixed in `f57d253`

1. **Precomposed Latin accented vowels inside Cyrillic readings** (~2,100 entries): early batches encoded stress as `é á ú ó ý` (Latin) instead of Cyrillic vowel + U+0301. Converted mechanically.
2. **Wrong stress positions** (~340 entries): e.g. `ракови́на` → `ра́ковина`, `стро́фа` → `строфа́`, `ра́сизм` → `раси́зм`, `товари́щество` → `това́рищество`, `мене́джер` → `ме́неджер`. Corrected to Zaliznyak.
3. **Letter typos in readings** (~60 entries): e.g. `апе́ка`→`апте́ка`, `мо́сор`→`му́сор`, `принцы́п`→`принци́п`, `канцеляру́т`→`канцеляри́т`, `бы́нт`→`бу́нт`. Repaired by rebuilding the reading from the form letters at the stressed index, or adopting the Zaliznyak headword.
4. **Missing stress on ё-stressed words** (~55): e.g. `надежность` → `наде́жность` (Zaliznyak marks these with inherent `ё`).

Post-fix state: **0 stress mismatches** vs Zaliznyak across 3,412 checkable headwords; 0 reading/form letter mismatches; pack still 7/7 gates.

Remaining (acceptable / need human review):
- 258 readings without stress: overwhelmingly monosyllabic words (`дом`, `ложь`) and phrases where Zaliznyak itself marks no stress.
- 91 forms unknown to pymorphy3: multi-word phrases (`не понимаю`), indeclinables (`такси`, `кафе`), modern coinages (`вещдок`). No action.

### ja-JP (3,922 lexicon entries) — fixed in `ja-JP: fix 11 malformed lexicon forms`

1. **Script contamination** (11 entries, fixed): Hangul characters in `く라우드` (→ `くらうど`), Latin `no` inside 8 phrase forms (`おもいで-no-きおく` → `おもいで の きおく`), romaji form `henkyou` (→ `へんきょう`), kanji `化` in `トークン化` (→ `とーけんか`).
2. **JMdict coverage**: after katakana→hiragana normalization and masu-form lookup, 3,642/3,922 forms match a JMdict headword. 280 unmatched are compound phrases (`かていにってい`) and suru-verb inflections — not dictionary headwords.
3. **Gloss divergence** (~684 flagged, NOT auto-fixed): token-overlap check against JMdict. Many are false positives (plural/derived gloss forms, hiragana policy, conjugations), but a real suspect subset exists, e.g.:
   - `ja.lex.med.hoken`: `ほうけん` glossed "health insurance" — `ほうけん` is feudalism; health insurance is `ほけん`.
   - `ja.lex.economy2.boeki`: `ぼえき` glossed "trade" — trade is `ぼうえき` (貿易); `ぼえき` is "mother liquor".
   - `ja.lex.rel2.kaisi`: `かいし` glossed "reflection" — reflection is `はんしゃ`; `かいし` matches "mysterious death".
   - `ja.lex.abst2.juri`: `じゅり` glossed "logic" — logic is `じゅんり`.
   An automated rewrite was attempted and **reverted**: the gloss signal also matched valid words wrongly (e.g. would rewrite `はじめまして`). These entries need human review with a candidate list; full list in `tmp/review-findings.jsonl` (local, regenerable via `tmp/review.py`).

## Limitations

- Gloss checking is token-overlap based; it flags divergence, it does not adjudicate it.
- Zaliznyak covers headwords; inflected/plural forms were checked via pymorphy lemmas only.
- Per AGENTS.md, none of this substitutes for qualified human review; all content remains `draft`.

## Repro

```
tmp/venv-review/bin/python tmp/review.py          # counts + tmp/review-findings.jsonl
tmp/venv-review/bin/python tmp/ja-deep.py         # ja deep pass (hiragana/masu matching)
tmp/venv-review/bin/python tmp/fix-ru-stress.py   # idempotent ru stress repair
```
