# O-07 preparation: kanji fields compared against EDRDG references (mechanical, not a provenance conclusion)

Scope: all 84 rows in `languages/ja-JP/kanji/entries.jsonl` (56) and
`languages/ja-JP/kanji/a2-topics.jsonl` (28). Nothing in the repository was
changed by this comparison; the dictionary files live in `/tmp/kanjidic-compare/`
and are NOT committed.

Reference files used (accessed 2026-10-13):

| file | URL | bytes | sha256 |
| --- | --- | --- | --- |
| KANJIDIC2 | https://www.edrdg.org/kanjidic/kanjidic2.xml.gz | 1,488,582 | c1faf3214ba58748757cb297619414d427434ee76b68eaaf31e89d707b4d4ef5 |
| KRADFILE | http://ftp.edrdg.org/pub/Nihongo/kradfile.gz | 47,301 | 0c5487c1de77e36ffb5bde652f469f2de9c52efc8320137c115506f3500e9c5f |

Both are EDRDG data under the CC BY-SA licence statement
(https://www.edrdg.org/edrdg/licence.html). `kradfile2.gz` returned 404 at that
host, so KRADFILE v1 (the JIS X 0208 set, 6,355 lines) was used; all 84 pack
characters are in it. The archive copy is EUC-JP encoded.

Structural choices (stated because the counts depend on them):

- KANJIDIC2 entries matched on `<literal>`; readings taken from
  `reading_meaning/rmgroup/reading` with `r_type` in {ja_on, ja_kun, s_on, s_kun,
  ja_in, japanese_kun, special_on, special_kun}; meanings from
  `rmgroup/meaning` **without** an `m_lang` attribute, i.e. the English glosses
  only (the file also carries fr/es/pt/ru/de/hu glosses); indexing radical from
  `radical/rad_value[@rad_type='classical']`, turned into a glyph through the
  Kangxi Radical block (U+2F00+n-1, NFKC).
- KRADFILE lines are `<kanji> : <element> <element> …`; the pack's `radicals`
  field was compared against that element list as glyphs. KRADFILE records what
  is visible in typical glyphs and its elements can be further subdivided, so it
  is a containment list, not a canonical decomposition.
- Readings: KANJIDIC2 stores kana, the pack stores romanized readings, so a
  comparison needs a transliteration. **The kana→romaji table and the folding
  rules (`shy`→`sh`, `chy`→`ch`, `sy`→`sh`, `ty`→`ch`, `jy`→`j`, `ou`→`o`,
  `uu`→`u`) are mine.** They are not the pack's convention and not KANJIDIC2's.
  Under a stricter policy (exact transliteration only, no folding) the match count
  was 89/101 for `entries.jsonl`; under the folded policy it is 139/142 for all
  84 rows. The spread is an artefact of romanization style, not of the data.

Counts over all 84 rows (142 readings, 84 meanings, 136 radical entries):

| comparison | result |
| --- | --- |
| readings with a KANJIDIC2 on/kun counterpart | 139 / 142 |
| readings with none | 3 |
| meanings word-for-word equal to an English KANJIDIC2 gloss | 35 / 84 |
| meanings overlapping an English gloss | 46 / 84 |
| meanings absent from the English glosses | 3 |
| radical elements listed by KRADFILE for that character | 86 / 136 |
| radical elements absent from KRADFILE for that character | 50 / 136 |
| characters whose radical list contains the KANJIDIC2 indexing radical | 60 / 84 |

The three readings with no KANJIDIC2 counterpart are word forms rather than
single-kanji readings: 小 `chii`, 明 `aka`, 見 `mi` (KANJIDIC2 has ショウ /
ちい.さい, メイ / あ.かり, ケン / み.る). The three meanings absent from the
English glosses are 行 "to go" (KANJIDIC2: going, journey, carry out, conduct,
act, line), 帰 "to return (home)" (homecoming, arrive at, lead to, result in) and
晴 "clear". KRADFILE disagreements are in both directions: the pack lists 一 for
二 where KRADFILE lists only 二, 口 for 四 where KRADFILE lists 儿 and 囗, 艹 for
万 where it lists ｜ ノ 一; KRADFILE also lists elements the pack does not.

Pack-side metadata, unchanged: all 56 `entries.jsonl` rows name only
`jf-standard` in `sources`; all 28 `a2-topics.jsonl` rows name
`jf-standard` and `jmdict-simplified`. No row names KANJIDIC2 or KRADFILE, while
`docs/provenance/JA_SOURCE_MATRIX.yaml` lists both as research sources with
`redistribution: derived`.

What this does **not** show: a value that matches a reference dataset may have
arrived from that dataset or independently — especially single morphemes such as
"one", "two", "mountain". A value that differs may still have been derived from
it and edited. O-07 asks whether these fields *were* taken from KANJIDIC2, and
that is a judgement about how the content was produced; the records were drafted
by an agent whose claimed source is `jf-standard`, which is not self-certifying.
The gate stays with the human owner.

What a human still has to decide: whether the observed overlap is derivation,
and if so whether the pack needs `derived-from-source` records for KANJIDIC2 and
KRADFILE, attribution text, and a widened ShareAlike obligation on the kanji
layer.
