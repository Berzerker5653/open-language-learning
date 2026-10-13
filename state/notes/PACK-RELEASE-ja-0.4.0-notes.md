# org.openlanguage.ja-jp.reference 0.4.0 (draft)

Japanese reference language pack. **Every item is AI-drafted and not
human-reviewed**: all 5,129 rows sit at `status: draft`, 153 at
`review-needed`, nothing at `validated` or `verified`. That is why the display
name keeps its "(Draft)" marker, and it is the honest state of the content, not a
label we will quietly drop.

| | |
| --- | --- |
| pack id | `org.openlanguage.ja-jp.reference` |
| version | `0.4.0` |
| archive | `ja-jp-reference-0.4.0.lpk` |
| size | 317,429,131 bytes |
| sha256 | `f0aa971f30ec88c0f09ca86085d04133616944d9fff6a75345bf31931b713a5f` |
| content license | CC-BY-4.0 |
| built from | commit `70ec683` (`langpack build languages/ja-JP`) |
| gates | `validate`, `lint`, `test`, `audit-curriculum`, `audit-lexicon`, `audit-licenses`: 0 errors / 0 warnings |

## Why 0.4.0 instead of the published 0.3.0

0.3.0 carried malformed learner-visible romaji and wrong kana script labels, and
the app now refuses such content at install time. Installing
`ja-jp-reference-0.3.0.lpk` in app 0.4.0-alpha.1 reports
`pack rejected by install validation: 561 error(s)`.

- **510 transliteration readings regenerated** from each entry's own declared
  kana. They had carried a digit or kana instead of romaji (`ronso2` for
  ろんそう, `kentoう`, `jiゅnり`), which shows up directly in the learner's
  romaji display.
- **67 script-labelled fields in 34 entries relabelled** (katakana words labelled
  `hiragana`: マナー, ガイド, ランキング). Mixed-script words (エコくるま,
  はんばーガー) were left alone: no single label describes them, so the new rule
  fires only when a label is outright wrong.
- **`ja.lex.media.head` corrected and re-baked.** The entry was spelled へッド
  with a `hiragana` label; it is ヘッド. Text, script label and romaji were fixed
  and the clip was re-synthesized from the corrected text
  (`sha256 bfa19fbf0a88ffdf151d98ebcc5ed9ac5f7ffd4e447b5282dac1f695ae57088c`,
  61,484 bytes). No other clip's spoken text changed, so nothing else was
  re-baked: every one of the 4,894 audio targets matches the manifest exactly.
- Long vowels and gemination are spelled out consistently in the repaired rows
  (`koutsuう`-style shapes are gone; `kouka`, `itchi`). 621 well-formed rows that
  follow the collapsed convention (`koka`, `haken`) were **not** touched:
  harmonising published content is editorial judgement, not a mechanical fix.
- 98 entries whose romaji is well-formed Latin but no longer describes the entry
  (60 carry the English word: `vitamin`, `manner`, `web-site`; 38 are different
  words: `inmu` for しびれ, `rinkou` for ちんぎん) are listed for human review in
  `state/evidence/PACK-LINT-2026-10-13/transliteration-review-2026-10-13.csv`.

## Coverage

75 goals, 786 units (12 on-ramp, 79 A1, 112 A2, 195 B1, 388 B2), 4,563
activities, 4,057 lexicon entries, 823 sentences, 84 kanji entries, 4,894 baked
listening clips. Pronunciation feedback is guided-only and makes no accuracy
claim (ADR-0013); the app never synthesizes speech, so this archive is the only
source of audio (ADR-0024).

## Install

The app's in-app catalog already points at this archive; no configuration is
needed (ADR-0027). To verify an archive yourself:
`langpack inspect ja-jp-reference-0.4.0.lpk`, then
`sha256sum` against the value above.

Reviewers: start at `CONTRIBUTING.md` ("Reviewing language-pack content") and
`languages/ja-JP/review/REVIEWER_KIT.md`. A `community-reviewer` record is a real
contribution: it can move an item to `validated`, and the engine refuses any
status flip that has no matching approved record.
