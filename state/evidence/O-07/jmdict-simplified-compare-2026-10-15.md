# O-07 preparation: kanji fields compared against jmdict-simplified 3.6.2 (mechanical, not a provenance conclusion)

Scope: all 84 rows in `languages/ja-JP/kanji/entries.jsonl` (56) and
`languages/ja-JP/kanji/a2-topics.jsonl` (28), compared against the kanji
datasets of the **exact release the pack cites**: jmdict-simplified
`3.6.2+20260928191014` (named in `languages/ja-JP/sources.jsonl`, source id
`jmdict-simplified`, retrieved 2026-10-05). Nothing in the repository was
changed by this comparison; the reference files live in `/tmp/o07js/` and are
NOT committed. Companion artifact: `state/evidence/O-07/kanjidic-compare-2026-10-13.md`
(same 84 rows against raw EDRDG KANJIDIC2 XML and KRADFILE; drew no conclusion).

## Reference files used (accessed 2026-10-15)

| file | URL | HTTP | bytes | sha256 |
| --- | --- | --- | --- | --- |
| kanjidic2-en tgz | https://github.com/scriptin/jmdict-simplified/releases/download/3.6.2%2B20260928191014/kanjidic2-en-3.6.2%2B20260928191014.json.tgz | 200 | 1,253,439 | 7e13c92d1a8e32286fe548f310aac7050bf1e1ba42b38d88d188046d514d4756 |
| kradfile tgz | https://github.com/scriptin/jmdict-simplified/releases/download/3.6.2%2B20260928191014/kradfile-3.6.2%2B20260928191014.json.tgz | 200 | 106,129 | 5948198f92fe5afd2ed85f27d1b204b9a2fed258c128edaac147d73ee69c9d97 |
| radkfile tgz (fetched for completeness; not used below) | https://github.com/scriptin/jmdict-simplified/releases/download/3.6.2%2B20260928191014/radkfile-3.6.2%2B20260928191014.json.tgz | 200 | 134,312 | 4de171c361db64d77ee83a7a7408f36cf777eb3c9da878dbc022d76742f64423 |

Extracted members (the archives each contain one single JSON document, not
JSONL): `kanjidic2-en-3.6.2.json` 14,830,710 bytes sha256
`b9feb444032ee7905bedcebb7b640b31f9a151a5452761011d49645dcefe033e`;
`kradfile-3.6.2.json` 447,522 bytes sha256
`90369021899d89159ee6e079bccd7d83915daa3191f0c6ed7efc2473e088c086`;
`radkfile-3.6.2.json` 339,960 bytes sha256
`ff1f16c9bd7892ae61bd888f68f5cd14383237d2b1eb034f3dd81518c2d7f265`.
Downloaded byte sizes match the sizes GitHub's release API reports for those
assets. Self-reported dataset metadata inside `kanjidic2-en-3.6.2.json`:
`version 3.6.2`, `dictDate 2026-09-28`, `databaseVersion 2026-271`,
10,384 characters; all 84 pack characters are present (none missing).

Upstream-location notes, stated explicitly:

- The job brief named `kimath/jmdict-simplified`; that GitHub path returns
  404. The live project the pack's `sources.jsonl` already cites is
  **`scriptin/jmdict-simplified`**, and all downloads above come from it.
- The brief described the artefacts as `kanji/kanji.jsonl.gz` and
  `kanji/krad.jsonl.gz`. Those file names do not exist in the current
  release layout. jmdict-simplified publishes one release series
  (`<jmdict-version>+<build-timestamp>`) whose assets include the kanji
  subset as `kanjidic2-en-<ver>.json` (plus a multilingual
  `kanjidic2-all`), the component file as `kradfile-<ver>.json`, and
  `radkfile-<ver>.json`. **No substitute release was needed**: the assets
  of the pinned `3.6.2+20260928191014` build were available on 2026-10-15.
- Content identity matters for reading the numbers: `kanjidic2-en` is
  jmdict-simplified's mechanical JSON conversion of **KANJIDIC2**, and
  `kradfile` is its conversion of **KRADFILE** — i.e. the same upstream data
  the 2026-10-13 artifact measured directly. The "jmdict-simplified kanji
  file" and the EDRDG kanji files are two renderings of one dataset.

## How the run is reproduced

`curl -sL` the three tgz URLs into `/tmp/o07js/`, `tar xzf` each, then run
`python3 /tmp/o07compare.py` from the repo root. The full script source is
Appendix A; its complete stdout is Appendix B.

## Transliteration policy (reused from the 2026-10-13 artifact)

The 2026-10-13 artifact declared fold rules (`shy→sh`, `chy→ch`, `sy→sh`,
`ty→ch`, `jy→j`, `ou→o`, `uu→u`) but its kana→romaji table was not preserved
(it lived in an uncommitted `/tmp` script). This run reuses the declared
fold rules verbatim, applied to **both** sides, and declares its table in
Appendix A (Hepburn-style; long vowels stay as literal digraphs `ou/uu/ii/ei`,
no macrons are produced; sokuon doubles the following consonant; the
consonant folds are therefore no-ops for this table — the vowel folds are
active). Because the 2026-10-13 table is lost, this run additionally
**replicates its measurement axis**: whole reading string with okurigana
dots AND prefix/suffix dashes removed, declared folds, no stem forms. That
replication returns 139/142 with exactly the failures the prior artifact
recorded (小 `chii`, 明 `aka`, 見 `mi`) — see "Cross-checks".

## Structural choices (stated because the counts depend on them)

- **Reading sets merged**: jmdict-simplified's `ja_on` + `ja_kun` values
  only (16,670 and 13,677 across the file; `status` is always null — its
  conversion folds KANJIDIC2's `s_on`/`special_on`/`ja_in` subtypes into
  `ja_on`, and `s_kun`/`japanese_kun`/`special_kun` into `ja_kun`, so this
  reproduces the prior artifact's eight-type r_type set as two sets).
  Pinyin (11,956), Korean romanized (8,999) and Hangul (7,060), Vietnamese
  (16,501) and the separate `nanori` name-reading lists are **excluded**.
- **Per-value unit**, not per-record: each pack `readings[]` element and each
  meaning token is counted once; duplicate pack values would count twice
  (none occur; no id appears in both files — checked).
- **List order is ignored** everywhere: readings and radicals are compared
  as sets; `krad` element order and pack order play no role.
- **Reading normalisation classes**: *verbatim* = pack romaji equals the
  transliterated whole reading string (okurigana dots removed; prefix/suffix
  dashes **kept**, e.g. `-ake` for the suffix form `-あ.け`); *normalised* =
  match after (a) the declared long-vowel folds `uu→u`, `ou→o` (the macron
  bridge `uu→ū→u` is this equivalence class; `ii→i`, `ei→e`, `oo→o` are
  **not** folded) or (b) okurigana stripping (reading stem = the segment
  before the first dot, e.g. `み.る`→`mi`). Hiragana↔katakana never bites:
  the pack stores romaji and the table maps both scripts to the same output.
- **Multi-value meanings fields**: each `meanings[]` string is split on `;`
  and each token compared to the English gloss set (`m.lang == "en"`).
  *Verbatim* token = exact string equal to a gloss. *Normalised* token =
  equal after casefolding, whitespace collapsing, dropping parenthesised
  qualifiers, dropping a leading `to `, stripping a leading word before a
  hyphen (`-`-prefixed grammatical stems) and a trailing period. **No**
  plural/stem folding: `heaven` vs gloss `heavens`, `eye` vs `eyeball` are
  counted as *nowhere*, deliberately — the normalisation set is closed and
  listed here.
- **Radicals** compared as glyph sets after NFKC (all pack radical glyphs
  were already NFKC-normal; the Kangxi block does not appear in the pack).
  The kanjidic2 indexing radical number is turned into a glyph through the
  Kangxi block (U+2F00+n−1, NFKC) exactly as the prior artifact did.
  kradfile is a containment list whose elements can be further subdivided
  and can include the character itself — same caveat the prior artifact
  stated.

## Counts over all 84 rows (142 readings, 133 meaning tokens from 84
records, 136 radical elements)

### Readings (per pack value)

| bucket | count | ids |
| --- | --- | --- |
| verbatim in `ja_on`/`ja_kun` (whole string, dashes kept) | 137 | full list in Appendix B |
| only under normalisation | 4 | `ja.kanji.oo` (`oo`←stem `おお.きい`), `ja.kanji.chii` (`chii`←stem `ちい.さい`), `ja.kanji.aka` (`aka`←stem `あか.るい`), `ja.kanji.mi` (`mi`←stem `み.る`) |
| nowhere | 1 | `ja.kanji.aka` (`ake` — jmdict-simplified renders 明's suffix kun as `-あ.け`, so the whole string is `-ake`; no bare `ake` form exists in the file) |
| **replication of the 2026-10-13 axis** (dots+dashes removed) | **139 / 142** | failures: `ja.kanji.chii` `chii`, `ja.kanji.aka` `aka`, `ja.kanji.mi` `mi` |

Per file: entries.jsonl 96 verbatim / 4 normalised / 1 nowhere (101);
a2-topics.jsonl 41 / 0 / 0 (41).

Reverse direction: **304** jmdict-simplified on/kun readings (whole-string
or stripped-stem form, folded) for these 84 characters are **absent from the
pack** — per-character lists in Appendix B. The pack is a small learner
subset; e.g. 上 has 20 such js readings, 下 has 16, 明 has 15.

### Meanings (per token; pack strings split on `;`)

| bucket | count |
| --- | --- |
| verbatim (token equals an English gloss) | 94 |
| only under normalisation | 11 |
| nowhere | 28 |

Non-exact buckets by id (token → matching gloss, or None):

- normalised (11 tokens, 8 records): `ja.kanji.mi` to see→[see];
  `ja.kanji.yomu` to read→[read]; `ja.kanji.kaku` to write→[write];
  `ja.kanji.taberu` to eat→[eat]; `ja.kanji.kiku` to hear→[hear], to ask→[ask];
  `ja.kanji.kuru` to come→[come]; `ja.kanji.deru` to go out→[go out], to exit→[exit];
  `ja.kanji.hairu` to enter→[enter]; `ja.kanji.nomu` to drink→[drink]
  (all via the leading-`to ` rule — glosses are bare verb stems).
- nowhere (28 tokens, 24 records): `ja.kanji.hito` people; `ja.kanji.ue` on;
  `ja.kanji.shita` under; `ja.kanji.kuchi` opening; `ja.kanji.te` skill;
  `ja.kanji.aka` clear, next (as in tomorrow); `ja.kanji.ato` after;
  `ja.kanji.go-n` hour (zodiac); `ja.kanji.mae` front, past (time);
  `ja.kanji.kuni` nation; `ja.kanji.otoko` man; `ja.kanji.mi` to look;
  `ja.kanji.kaku` book, writing; `ja.kanji.iku` to go;
  `ja.kanji.kaeru` to return (home); `ja.kanji.hairu` to get in;
  `ja.kanji.weather.ten` heaven; `ja.kanji.weather.sei` clear weather;
  `ja.kanji.place.sha` one who; `ja.kanji.body.gan` eye;
  `ja.kanji.admin.kai` gather; `ja.kanji.film.ei` project;
  `ja.kanji.sport.sha` fire; `ja.kanji.rel.wa` story; `ja.kanji.city.shi` send.

Per record (the 2026-10-13 unit): **72** records have ≥1 verbatim gloss,
**8** have only normalised matches (`ja.kanji.mi`, `ja.kanji.yomu`,
`ja.kanji.kaku`, `ja.kanji.kiku`, `ja.kanji.kuru`, `ja.kanji.deru`,
`ja.kanji.hairu`, `ja.kanji.nomu`), **4** have no related gloss at all
(`ja.kanji.iku`, `ja.kanji.kaeru`, `ja.kanji.weather.sei`,
`ja.kanji.body.gan`).

Whole-string meaning axis (the prior artifact's "word-for-word" unit — the
pack string as written, no `;`-split): **35 / 84** records contain a
`meanings[]` string that is exactly one gloss (id list in Appendix B).

Reverse direction: **121** English glosses for these 84 characters do not
appear (after normalisation) in the pack — per-character lists in
Appendix B (e.g. 行 has 8, 使 6, 見 6, 目 6).

### Radicals: pack set vs jmdict-simplified `kradfile` element set

| bucket (pack set vs krad set) | count | ids |
| --- | --- | --- |
| exact equality | 27 | list in Appendix B |
| pack is a strict subset | 16 | `ja.kanji.san`, `ja.kanji.shita`, `ja.kanji.kuchi`, `ja.kanji.ashi`, `ja.kanji.ato`, `ja.kanji.mae`, `ja.kanji.mi`, `ja.kanji.deru`, `ja.kanji.weather.ten`, `ja.kanji.weather.ki`, `ja.kanji.weather.fuu`, `ja.kanji.weather.sei`, `ja.kanji.body.tou`, `ja.kanji.sport.kyou`, `ja.kanji.rel.ai`, `ja.kanji.rel.wa` |
| pack is a strict superset | 2 | `ja.kanji.oo` (大 + 人), `ja.kanji.ki` (木 + 十) |
| partial overlap | 18 | `ja.kanji.sen`, `ja.kanji.ue`, `ja.kanji.hidari`, `ja.kanji.migi`, `ja.kanji.toshi`, `ja.kanji.ji`, `ja.kanji.go-n`, `ja.kanji.kuni`, `ja.kanji.yomu`, `ja.kanji.iku`, `ja.kanji.weather.un`, `ja.kanji.place.ka`, `ja.kanji.place.chou`, `ja.kanji.place.sha`, `ja.kanji.admin.ki`, `ja.kanji.film.ei`, `ja.kanji.film.e`, `ja.kanji.city.kai` |
| disjoint | 21 | `ja.kanji.ni`, `ja.kanji.yon`, `ja.kanji.go`, `ja.kanji.roku`, `ja.kanji.hachi`, `ja.kanji.kyuu`, `ja.kanji.man`, `ja.kanji.naka`, `ja.kanji.ima`, `ja.kanji.nani`, `ja.kanji.kaku`, `ja.kanji.taberu`, `ja.kanji.kuru`, `ja.kanji.kaeru`, `ja.kanji.hairu`, `ja.kanji.nana`, `ja.kanji.body.tai`, `ja.kanji.admin.kai`, `ja.kanji.admin.hen`, `ja.kanji.rel.yuu`, `ja.kanji.city.shi` |
| character has no kradfile entry | 0 | — |
| pack elements absent from krad (element unit) | 50 / 136 | per-record detail in Appendix B |
| krad elements absent from pack (element unit) | 120 | per-record detail in Appendix B |
| pack radicals contain the kanjidic2 indexing radical | 60 / 84 | list in Appendix B |
| pack radicals lack it | 24 / 84 | list in Appendix B |
| krad element list contains the indexing radical | 69 / 84 | — |

Every non-exact record appears with its pack set, krad set, and both
difference sets in Appendix B (lines "per-record detail …"). Characteristic
disagreement kinds, as the prior artifact already noted for KRADFILE: the
pack often lists the **indexing radical** where kradfile lists the whole
character (二 pack 一 vs krad 二; 中 pack 中 vs krad ｜ 口 is the converse —
pack lists the character, krad the elements); and pure glyph-identity
differences (pack 八 U+516B vs krad ハ U+30CF for 八/六; pack 丿 U+4E3F vs
krad ノ U+30CE for 千/年/午; pack 亻 vs krad's 化 decomposition for 体/何/使).

## Cross-checks against the 2026-10-13 artifact

Both measurements cover the same 84 rows. Where the axes overlap:

| axis | 2026-10-13 (raw KANJIDIC2 XML / KRADFILE) | this run (jmdict-simplified 3.6.2) |
| --- | --- | --- |
| readings matching a Japanese on/kun reading under the declared folds | 139 / 142 (failures: 小 chii, 明 aka, 見 mi) | **139 / 142, same three failures** (replication axis) |
| meanings equal, word-for-word, to an English gloss | 35 / 84 | **35 / 84** (whole-string axis) |
| pack radical elements found in the reference element list | 86 / 136 (50 absent) | **86 / 136 (50 absent)** |
| characters whose pack radicals contain the indexing radical | 60 / 84 | **60 / 84** |

The two runs therefore measure the same underlying data twice —
expected, since `kanjidic2-en` and `kradfile` are conversions of KANJIDIC2
and KRADFILE (the conversion is dated `dictDate 2026-09-28`,
`databaseVersion 2026-271`; the 2026-10-13 KANJIDIC2 download from
edrdg.org is not preserved in this snapshot so its version string could not
be compared, but every overlap axis agrees exactly).

Method differences, stated so the other numbers are comparable: this run's
*primary* reading buckets (137/4/1) differ from the prior 139/142 because
(a) primary verbatim keeps prefix/suffix dashes, which the lost 2026-10-13
transliteration evidently stripped — that alone moves 大 `oo` and 明 `ake`;
and (b) this run adds an okurigana-stripping *normalisation* bucket, which
moves 小 `chii`, 明 `aka` (via `あか.るい`, a kun form the prior artifact's
summary did not cite), 見 `mi` and 大 `oo` out of "nowhere". The meanings
count difference in the *no-related-gloss* bucket (prior 3: 行, 帰, 晴;
here 4: 行, 帰, 晴 + 眼) is definitional: the prior "overlaps an English
gloss" bucket was looser than the closed normalisation rules stated above,
so 眼 "eye" (gloss `eyeball`) counted as an overlap there and nowhere here.
The prior artifact quotes 晴's pack meaning as "clear"; the record now reads
"clear weather" — under either wording it is absent from the gloss set.
Their per-file strict-transliteration figure (89/101 for entries.jsonl) is
not reproducible without their table and is not contradicted here: fold
policy alone moved their total by 50 (89 strict → 139 folded).

## What this shows and what it does not

- It shows the pack's kanji `readings`/`meanings`/`radicals` values are
  **consistent with the file the pack's own records cite** (`jmdict-simplified`,
  3.6.2+20260928191014): 139/142 readings, 72/84 records with a verbatim
  gloss, 86/136 radical elements contained in the kradfile element lists.
- It does **not** prove the copy path. `kanjidic2-en` is a conversion of
  KANJIDIC2, so agreement with it is the *same evidence* as agreement with
  KANJIDIC2 — this measurement cannot distinguish "taken from
  jmdict-simplified", "taken from KANJIDIC2/KRADFILE directly", or
  "produced from model memory of the same dictionary data". The 41/41 and
  35/84 consistencies are equally expected under all three paths.
- It repeats the 2026-10-13 caveat verbatim in substance: a value that
  matches a reference dataset may have arrived from it or independently —
  especially single morphemes such as "one", "two", "mountain"; a value
  that differs may still have been derived and edited. Shared single
  morphemes prove nothing either way.
- The mismatches are small and in both directions (1 nowhere reading;
  28 nowhere meaning tokens concentrated in verb-stem glosses the file
  stores bare; 50/136 radical elements absent, mostly indexing-vs-whole-
  character style and glyph-identity variants). That is what an
  abridged/edited learner subset looks like regardless of provenance; it
  is not exculpatory.
- This artifact states **no legal conclusion** and changes no licence or
  pack record. The ShareAlike question for the kanji layer is already
  recorded: `languages/ja-JP/licenses.jsonl` carries `lic-kanji-dictionary`
  at CC-BY-SA-4.0 with source_id `edrdg-jmdict` — quote below. Whether the
  *measured* fields' content in fact matches that record's scope claim is
  the human owner's O-07 judgement.

## The `lic-kanji-dictionary` record (literal quote, unchanged)

From `languages/ja-JP/licenses.jsonl`:

```json
{"id":"lic-kanji-dictionary","scope":{"kind":"derived-from-source","path_glob":"kanji/*.jsonl","source_id":"edrdg-jmdict"},"license":{"spdx":"CC-BY-SA-4.0","notes":"Kanji entries carry character/meaning/reading data sourced against JMdict/EDRDG data (CC BY-SA 4.0, upstream source record `edrdg-jmdict`) via the read-only jmdict-simplified 3.6.2 mirror; mnemonics are ai-drafted original text. KANJIDIC2 is listed as a research source in docs/provenance/JA_SOURCE_MATRIX.yaml but no record in this pack cites it, so no KANJIDIC-derived inventory entry is claimed here (kanji `radicals` provenance is an open question, O-07)."},"redistribution_allowed":true,"attribution":"JMdict/JMnedict © Electronic Dictionary Research and Development Group, CC BY-SA 4.0 (consulted via jmdict-simplified 3.6.2; https://www.edrdg.org/edrdg/licence.html)"}
```

Scope-coverage check against this measurement, wording only: the scope
`path_glob: "kanji/*.jsonl"` is file-level, so it *literally covers every
field* of both kanji shards, including `meanings`, `readings` and
`radicals`. The notes, however, describe the covered content as
"character/meaning/reading data sourced against **JMdict**/EDRDG data …
via the read-only jmdict-simplified 3.6.2 mirror". The kanji datasets
measured here (`kanjidic2-en`, `kradfile`) are JMdict-project-family data
in the sense that EDRDG maintains all of it and jmdict-simplified mirrors
it, but they are the **KANJIDIC2/KRADFILE** datasets, not the JMdict word
dictionary; and the notes themselves flag `radicals` provenance as open
(O-07) while asserting the meaning/reading sourcing. Whether that wording
covers the fields accurately is exactly the unresolved O-07 fact question;
this artifact does not resolve it.

What a human still has to decide (unchanged from 2026-10-13): whether the
overlap is derivation, and if so whether attribution and the ShareAlike
obligation on the kanji layer are correctly and completely recorded by the
existing `lic-kanji-dictionary` scope.

## Appendix A — comparison script source (`/tmp/o07compare.py`, throwaway, not committed)

```python
#!/usr/bin/env python3
# O-07 measurement: ja-JP kanji pack fields vs jmdict-simplified 3.6.2+20260928191014
# datasets kanjidic2-en + kradfile. Read-only comparison; prints a report.
# Run from the repo root: python3 /tmp/o07compare.py
import json, unicodedata, re, collections

PACK = ["languages/ja-JP/kanji/entries.jsonl", "languages/ja-JP/kanji/a2-topics.jsonl"]
KJI = "/tmp/o07js/kanjidic2-en-3.6.2.json"
KRD = "/tmp/o07js/kradfile-3.6.2.json"

def nfkc(s): return unicodedata.normalize("NFKC", s)

# ---------------------------------------------------------------- transliteration
# kana -> romaji table (Hepburn), declared explicitly because the 2026-10-13
# artifact declared only the fold rules, not its table. Long vowels stay as the
# literal kana digraph (ou, uu, ii, ei, oo); no macrons are produced.
MORA = {}
_ROWS = [
 ("a",("あ","ア")),("i",("い","イ")),("u",("う","ウ")),("e",("え","エ")),("o",("お","オ")),
 ("ka",("か","カ")),("ki",("き","キ")),("ku",("く","ク")),("ke",("け","ケ")),("ko",("こ","コ")),
 ("sa",("さ","サ")),("shi",("し","シ")),("su",("す","ス")),("se",("せ","セ")),("so",("そ","ソ")),
 ("ta",("た","タ")),("chi",("ち","チ")),("tsu",("つ","ツ")),("te",("て","テ")),("to",("と","ト")),
 ("na",("な","ナ")),("ni",("に","ニ")),("nu",("ぬ","ヌ")),("ne",("ね","ネ")),("no",("の","ノ")),
 ("ha",("は","ハ")),("hi",("ひ","ヒ")),("fu",("ふ","フ")),("he",("へ","ヘ")),("ho",("ほ","ホ")),
 ("ma",("ま","マ")),("mi",("み","ミ")),("mu",("む","ム")),("me",("め","メ")),("mo",("も","モ")),
 ("ya",("や","ヤ")),("yu",("ゆ","ユ")),("yo",("よ","ヨ")),
 ("ra",("ら","ラ")),("ri",("り","リ")),("ru",("る","ル")),("re",("れ","レ")),("ro",("ろ","ロ")),
 ("wa",("わ","ワ")),("wi",("ゐ","ヰ")),("we",("ゑ","ヱ")),("wo",("を","ヲ")),("n",("ん","ン")),
 ("ga",("が","ガ")),("gi",("ぎ","ギ")),("gu",("ぐ","グ")),("ge",("げ","ゲ")),("go",("ご","ゴ")),
 ("za",("ざ","ザ")),("ji",("じ","ジ")),("zu",("ず","ズ")),("ze",("ぜ","ゼ")),("zo",("ぞ","ゾ")),
 ("da",("だ","ダ")),("ji",("ぢ","ヂ")),("zu",("づ","ヅ")),("de",("で","デ")),("do",("ど","ド")),
 ("ba",("ば","バ")),("bi",("び","ビ")),("bu",("ぶ","ブ")),("be",("べ","ベ")),("bo",("ぼ","ボ")),
 ("pa",("ぱ","パ")),("pi",("ぴ","ピ")),("pu",("ぷ","プ")),("pe",("ぺ","ペ")),("po",("ぽ","ポ")),
 ("vu",("ゔ","ヴ")),
]
for _rom, _kanas in _ROWS:
    for _k in _kanas: MORA[_k] = _rom
_YOON = {}
for _hir, _rom in [
 ("きゃ","kya"),("きゅ","kyu"),("きょ","kyo"),("しゃ","sha"),("しゅ","shu"),("しょ","sho"),
 ("ちゃ","cha"),("ちゅ","chu"),("ちょ","cho"),("にゃ","nya"),("にゅ","nyu"),("にょ","nyo"),
 ("ひゃ","hya"),("ひゅ","hyu"),("ひょ","hyo"),("みゃ","mya"),("みゅ","myu"),("みょ","myo"),
 ("りゃ","rya"),("りゅ","ryu"),("りょ","ryo"),("ぎゃ","gya"),("ぎゅ","gyu"),("ぎょ","gyo"),
 ("じゃ","ja"),("じゅ","ju"),("じょ","jo"),("ぢゃ","ja"),("ぢゅ","ju"),("ぢょ","jo"),
 ("びゃ","bya"),("びゅ","byu"),("びょ","byo"),("ぴゃ","pya"),("ぴゅ","pyu"),("ぴょ","pyo")]:
    _YOON[_hir] = _rom
for _kat, _rom in [
 ("キャ","kya"),("キュ","kyu"),("キョ","kyo"),("シャ","sha"),("シュ","shu"),("ショ","sho"),
 ("チャ","cha"),("チュ","chu"),("チョ","cho"),("ニャ","nya"),("ニュ","nyu"),("ニョ","nyo"),
 ("ヒャ","hya"),("ヒュ","hyu"),("ヒョ","hyo"),("ミャ","mya"),("ミュ","myu"),("ミョ","myo"),
 ("リャ","rya"),("リュ","ryu"),("リョ","ryo"),("ギャ","gya"),("ギュ","gyu"),("ギョ","gyo"),
 ("ジャ","ja"),("ジュ","ju"),("ジョ","jo"),("ビャ","bya"),("ビュ","byu"),("ビョ","byo"),
 ("ピャ","pya"),("ピュ","pyu"),("ピョ","pyo")]:
    _YOON[_kat] = _rom

def fold_declared(s):
    # The fold rules declared by the 2026-10-13 artifact, applied to BOTH sides.
    # With the Hepburn table above the consonant folds are no-ops (they target
    # syu/tyu-style tables); the vowel folds uu->u, ou->o are active.
    for a, b in (("shy","sh"),("chy","ch"),("sy","sh"),("ty","ch"),("jy","j"),
                 ("ou","o"),("uu","u")):
        s = s.replace(a, b)
    return s

def translit(s):
    # kana reading string -> raw romaji; the okurigana dot is kept as '.'.
    out, i, gem = [], 0, False
    s = nfkc(s)
    while i < len(s):
        if s[i] in "っッ":
            gem, i = True, i + 1; continue
        if s[i] in ".・":
            out.append("."); i += 1; continue
        if s[i:i+2] in _YOON:
            rom = _YOON[s[i:i+2]]; i += 2
        elif s[i] in MORA:
            rom = MORA[s[i]]; i += 1
        else:
            out.append(s[i]); i += 1; continue
        out.append(rom[0] + rom if gem else rom); gem = False
    return "".join(out)

def fold_vowels(s):
    # declared long-vowel folds only (uu->u, ou->o); ii/ei/oo are NOT folded.
    return s.replace("uu", "u").replace("ou", "o")

def norm_meaning(s):
    s = nfkc(s).strip().lower()
    s = re.sub(r"\(([^)]*)\)", " ", s)          # drop parenthesised qualifiers
    s = re.sub(r"\s+", " ", s).strip()
    s = re.sub(r"^[^ ]+[-–]", "-", s)            # -suite / back- style stems
    if s.startswith("to "): s = s[3:]
    return s.rstrip(".")

# ---------------------------------------------------------------- load inputs
recs = []
for p in PACK:
    for line in open(p, encoding="utf-8"):
        r = json.loads(line); r["_file"] = p.split("/")[-1]; recs.append(r)

kj = json.load(open(KJI, encoding="utf-8")); kd = {e["literal"]: e for e in kj["characters"]}
kr = {nfkc(k): [nfkc(x) for x in v] for k, v in json.load(open(KRD, encoding="utf-8"))["kanji"].items()}

def js_sets(lit):
    e = kd[lit]
    on  = [rd["value"] for g in e["readingMeaning"]["groups"] for rd in g["readings"] if rd["type"] == "ja_on"]
    kun = [rd["value"] for g in e["readingMeaning"]["groups"] for rd in g["readings"] if rd["type"] == "ja_kun"]
    nan = e["readingMeaning"].get("nanori") or []
    mean = [m["value"] for g in e["readingMeaning"]["groups"] for m in g["meanings"] if m["lang"] == "en"]
    krad = kr.get(lit, [])
    idx = nfkc(chr(0x2F00 + next(r["value"] for r in e["radicals"] if r["type"] == "classical") - 1))
    return on, kun, nan, mean, krad, idx

# reading type/status census (proves which sets the merge draws on)
rtypes = collections.Counter(
    (rd["type"], rd["status"]) for e in kd.values()
    for g in e["readingMeaning"]["groups"] for rd in g["readings"])

# ---------------------------------------------------------------- compare
R = {"verbatim": [], "norm": [], "nowhere": []}; r_total = 0
why = {}
rev_readings = {}
REP = []; rep_total = 0; rep_fail = []          # 2026-10-13 replication axis
M = {"verbatim": [], "norm": [], "nowhere": []}; m_total = 0
mwhy = {}
rev_gloss = {}
exact_rec, overlap_rec, absent_rec = [], [], []
whole_hit, whole_total = [], 0                  # 2026-10-13 meaning unit (whole string)
RAD = {k: [] for k in ("exact","subset","superset","partial","disjoint","no_krad")}
rad_detail = {}
pack_only, krad_only = collections.Counter(), collections.Counter()
idx_in_pack, idx_not_in_pack = [], []
krad_has_idx = 0
missing_char, pack_glyph_not_nfkc = [], []
perfile = {p: collections.Counter() for p in ("entries.jsonl","a2-topics.jsonl")}

for r in recs:
    ch = r["character"]; f = r["_file"]
    if ch not in kd:
        missing_char.append((r["id"], ch)); continue
    on, kun, nan, mean, krad, idx = js_sets(ch)

    # ---- readings ----
    packr = list(r["readings"])
    packfold = {fold_vowels(fold_declared(x)) for x in packr}
    full, core, rep = {}, {}, set()   # full=whole reading; core=okurigana-stripped stem;
                                      # rep=whole reading with dots+dashes removed (13-replication)
    for kind, lst in (("on", on), ("kun", kun)):
        for kana in lst:
            t = translit(kana)
            x = fold_declared(t.replace(".", ""))
            full.setdefault(x, (kind, kana))
            rep.add(fold_declared(t.replace(".", "").replace("-", "")))
            if "." in kana:
                c = fold_declared(translit(kana.split(".")[0]))
                core.setdefault(c, (kind, kana))
    for v in packr:
        r_total += 1; perfile[f]["readings"] += 1
        vf = fold_declared(v)
        rep_total += 1
        if vf in rep: REP.append(r["id"])
        else: rep_fail.append((r["id"], v))
        if vf in full:
            R["verbatim"].append(r["id"]); perfile[f]["readings_verbatim"] += 1; continue
        hit   = [x for x in full if fold_vowels(x) == vf]
        hitc  = [x for x in core if fold_vowels(x) == vf]
        hitc0 = [x for x in core if x == vf]
        if hit or hitc or hitc0:
            R["norm"].append(r["id"]); perfile[f]["readings_norm"] += 1
            why[(r["id"], v)] = ([("stem", core[hitc0[0]])] if hitc0 else []) + \
                                ([("longvowel", full[hit[0]])] if hit else []) + \
                                ([("stem+longvowel", core[hitc[0]])] if hitc and not hitc0 else [])
        else:
            R["nowhere"].append(r["id"]); perfile[f]["readings_nowhere"] += 1
            why[(r["id"], v)] = [("no counterpart", None)]
    for x in set(full) | set(core):
        if fold_vowels(x) not in packfold: rev_readings.setdefault((r["id"], ch), set()).add(x)

    # ---- meanings ----
    packm = [x.strip() for m in r["meanings"] for x in m.split(";")]
    pmn = {norm_meaning(x) for x in packm}
    verbatim_any, norm_any = False, False
    for w in r["meanings"]:
        whole_total += 1
        if w in mean: whole_hit.append(r["id"])
    for tok in packm:
        m_total += 1; perfile[f]["mtokens"] += 1
        if tok in mean:
            M["verbatim"].append(r["id"]); perfile[f]["m_verbatim"] += 1
            verbatim_any = True; continue
        alt = [g for g in mean if g != tok and norm_meaning(g) == norm_meaning(tok)]
        if alt:
            M["norm"].append(r["id"]); perfile[f]["m_norm"] += 1; norm_any = True
            mwhy[(r["id"], tok)] = alt; continue
        M["nowhere"].append(r["id"]); perfile[f]["m_nowhere"] += 1
        mwhy[(r["id"], tok)] = None
    if verbatim_any: exact_rec.append(r["id"])
    elif norm_any: overlap_rec.append(r["id"])
    else: absent_rec.append(r["id"])
    for g in mean:
        if norm_meaning(g) not in pmn: rev_gloss.setdefault((r["id"], ch), set()).add(g)

    # ---- radicals (pack glyph set vs krad element set) ----
    P = {nfkc(x) for x in r["radicals"]}
    for x in r["radicals"]:
        if nfkc(x) != x: pack_glyph_not_nfkc.append((r["id"], x, nfkc(x)))
    if not kr.get(ch):
        RAD["no_krad"].append(r["id"])
    elif P == set(krad): RAD["exact"].append(r["id"])
    elif P <= set(krad): RAD["subset"].append(r["id"])
    elif set(krad) <= P: RAD["superset"].append(r["id"])
    elif P & set(krad): RAD["partial"].append(r["id"])
    else: RAD["disjoint"].append(r["id"])
    if ch in kr:
        pack_only[r["id"]] = len(P - set(krad)); krad_only[r["id"]] = len(set(krad) - P)
        if P != set(krad):
            rad_detail[r["id"]] = dict(ch=ch, pack=sorted(P), krad=sorted(set(krad)),
                                       pack_minus_krad=sorted(P - set(krad)),
                                       krad_minus_pack=sorted(set(krad) - P),
                                       index_radical=idx)
        if idx in set(krad): krad_has_idx += 1
    if idx in P: idx_in_pack.append(r["id"])
    else: idx_not_in_pack.append(r["id"])

# ---------------------------------------------------------------- report
def pr(title, lst):
    print(f"{title}: {len(lst)}")
    for i in range(0, len(lst), 10): print("   ids:", ", ".join(lst[i:i+10]))

print("== jmdict-simplified version", kj["version"], "| dictDate", kj["dictDate"],
      "| databaseVersion", kj["databaseVersion"], "| characters", len(kd))
print("reading type/status census:", dict(sorted(rtypes.items())))
print("pack chars missing from kanjidic2-en:", missing_char)
print("non-NFKC pack radical glyphs:", pack_glyph_not_nfkc)

print("\n-- readings, per pack value (verbatim = whole reading string, dashes kept) --")
for k in ("verbatim", "norm", "nowhere"): pr(k, R[k])
print("total readings:", r_total, "| per file:", dict(perfile["entries.jsonl"]),
      "|", dict(perfile["a2-topics.jsonl"]))
print("non-verbatim detail ((id, value) -> match kind):")
for k, v in why.items(): print("   ", k, v)
print("REPLICATION of 2026-10-13 policy (whole reading string, dots AND dashes removed, declared folds):")
print("   matched:", len(REP), "/", rep_total, "| failed:", rep_fail)
print("reverse: js on/kun (full or stripped, folded) absent from pack, per record:")
tot = 0
for (rid, ch), v in rev_readings.items():
    tot += len(v); print("  ", rid, ch, sorted(v))
print("reverse reading total:", tot)

print("\n-- meanings, per token (pack strings split on ';') --")
for k in ("verbatim", "norm", "nowhere"): pr(k, M[k])
print("total meaning tokens:", m_total, "| per file:", dict(perfile["entries.jsonl"]),
      "|", dict(perfile["a2-topics.jsonl"]))
print("non-verbatim detail ((id, token) -> matching gloss or None):")
for k, v in sorted(mwhy.items()): print("   ", k, v)
pr("records with >=1 verbatim gloss", exact_rec)
pr("records with >=1 normalised-not-verbatim gloss (no verbatim)", overlap_rec)
pr("records with no related gloss at all", absent_rec)
pr("WHOLE-STRING axis (2026-10-13 unit): pack meanings[] string equal to one gloss", whole_hit)
print("   whole strings compared:", whole_total)
print("reverse: js English gloss absent from pack (normalised compare), per record:")
tot = 0
for (rid, ch), v in rev_gloss.items():
    tot += len(v); print("  ", rid, ch, sorted(v))
print("reverse gloss total:", tot)

print("\n-- radicals: pack set vs jmdict-simplified krad element set --")
for k, v in RAD.items(): pr(k, v)
print("pack radical elements absent from krad (total):", sum(pack_only.values()))
print("krad elements absent from pack (total):", sum(krad_only.values()))
print("per-record detail for every non-exact record:")
for k in ("subset","superset","partial","disjoint"):
    for rid in RAD[k]:
        d = rad_detail[rid]
        print(f"   {k:8s} {rid} {d['ch']} pack={d['pack']} krad={d['krad']} "
              f"pack\\krad={d['pack_minus_krad']} krad\\pack={d['krad_minus_pack']} idx={d['index_radical']}")
print("\n-- indexing radical (kanjidic2 classical, Kangxi-glyph form) --")
pr("pack radicals contain the indexing radical", idx_in_pack)
pr("pack radicals lack it", idx_not_in_pack)
print("krad element list contains the indexing radical:", krad_has_idx)
```

## Appendix B — complete script output (`/tmp/o07report.txt`, verbatim)

```
== jmdict-simplified version 3.6.2 | dictDate 2026-09-28 | databaseVersion 2026-271 | characters 10384
reading type/status census: {('ja_kun', None): 13677, ('ja_on', None): 16670, ('korean_h', None): 7060, ('korean_r', None): 8999, ('pinyin', None): 11956, ('vietnam', None): 16501}
pack chars missing from kanjidic2-en: []
non-NFKC pack radical glyphs: []

-- readings, per pack value (verbatim = whole reading string, dashes kept) --
verbatim: 137
   ids: ja.kanji.ichi, ja.kanji.ichi, ja.kanji.ni, ja.kanji.ni, ja.kanji.san, ja.kanji.yon, ja.kanji.yon, ja.kanji.go, ja.kanji.roku, ja.kanji.hachi
   ids: ja.kanji.kyuu, ja.kanji.juu, ja.kanji.hyaku, ja.kanji.sen, ja.kanji.man, ja.kanji.man, ja.kanji.hito, ja.kanji.hito, ja.kanji.hito, ja.kanji.oo
   ids: ja.kanji.chii, ja.kanji.naka, ja.kanji.naka, ja.kanji.ue, ja.kanji.ue, ja.kanji.shita, ja.kanji.shita, ja.kanji.hidari, ja.kanji.hidari, ja.kanji.migi
   ids: ja.kanji.migi, ja.kanji.kuchi, ja.kanji.kuchi, ja.kanji.me, ja.kanji.me, ja.kanji.mimi, ja.kanji.te, ja.kanji.te, ja.kanji.ashi, ja.kanji.ashi
   ids: ja.kanji.ki, ja.kanji.ki, ja.kanji.hi, ja.kanji.hi, ja.kanji.hi, ja.kanji.tsuki, ja.kanji.tsuki, ja.kanji.toshi, ja.kanji.toshi, ja.kanji.ji
   ids: ja.kanji.ima, ja.kanji.ima, ja.kanji.aka, ja.kanji.ato, ja.kanji.ato, ja.kanji.go-n, ja.kanji.mae, ja.kanji.mae, ja.kanji.na, ja.kanji.na
   ids: ja.kanji.hon, ja.kanji.kuni, ja.kanji.kuni, ja.kanji.nani, ja.kanji.nani, ja.kanji.yama, ja.kanji.kawa, ja.kanji.ta, ja.kanji.ta, ja.kanji.onna
   ids: ja.kanji.onna, ja.kanji.otoko, ja.kanji.otoko, ja.kanji.mi, ja.kanji.yomu, ja.kanji.yomu, ja.kanji.kaku, ja.kanji.kaku, ja.kanji.taberu, ja.kanji.taberu
   ids: ja.kanji.kiku, ja.kanji.kiku, ja.kanji.iku, ja.kanji.iku, ja.kanji.kuru, ja.kanji.kuru, ja.kanji.kaeru, ja.kanji.kaeru, ja.kanji.deru, ja.kanji.deru
   ids: ja.kanji.hairu, ja.kanji.hairu, ja.kanji.nana, ja.kanji.nana, ja.kanji.nomu, ja.kanji.nomu, ja.kanji.weather.ten, ja.kanji.weather.ki, ja.kanji.weather.fuu, ja.kanji.weather.fuu
   ids: ja.kanji.weather.un, ja.kanji.weather.ame, ja.kanji.weather.yuki, ja.kanji.weather.sei, ja.kanji.place.shin, ja.kanji.place.shin, ja.kanji.place.ka, ja.kanji.place.chou, ja.kanji.place.chou, ja.kanji.place.ka2
   ids: ja.kanji.place.ka2, ja.kanji.place.sha, ja.kanji.body.shin, ja.kanji.body.shin, ja.kanji.body.tai, ja.kanji.body.tai, ja.kanji.body.tou, ja.kanji.body.tou, ja.kanji.body.gan, ja.kanji.admin.ki
   ids: ja.kanji.admin.kai, ja.kanji.admin.hen, ja.kanji.film.ei, ja.kanji.film.e, ja.kanji.film.e, ja.kanji.sport.kyou, ja.kanji.sport.kyou, ja.kanji.sport.sha, ja.kanji.rel.yuu, ja.kanji.rel.yuu
   ids: ja.kanji.rel.ai, ja.kanji.rel.wa, ja.kanji.rel.wa, ja.kanji.city.kai, ja.kanji.city.kai, ja.kanji.city.shi, ja.kanji.city.shi
norm: 4
   ids: ja.kanji.oo, ja.kanji.chii, ja.kanji.aka, ja.kanji.mi
nowhere: 1
   ids: ja.kanji.aka
total readings: 142 | per file: {'readings': 101, 'readings_verbatim': 96, 'mtokens': 90, 'm_verbatim': 60, 'm_nowhere': 19, 'readings_norm': 4, 'readings_nowhere': 1, 'm_norm': 11} | {'readings': 41, 'readings_verbatim': 41, 'mtokens': 43, 'm_nowhere': 9, 'm_verbatim': 34}
non-verbatim detail ((id, value) -> match kind):
    ('ja.kanji.oo', 'oo') [('stem', ('kun', 'おお.きい'))]
    ('ja.kanji.chii', 'chii') [('stem', ('kun', 'ちい.さい'))]
    ('ja.kanji.aka', 'aka') [('stem', ('kun', 'あか.るい'))]
    ('ja.kanji.aka', 'ake') [('no counterpart', None)]
    ('ja.kanji.mi', 'mi') [('stem', ('kun', 'み.る'))]
REPLICATION of 2026-10-13 policy (whole reading string, dots AND dashes removed, declared folds):
   matched: 139 / 142 | failed: [('ja.kanji.chii', 'chii'), ('ja.kanji.aka', 'aka'), ('ja.kanji.mi', 'mi')]
reverse: js on/kun (full or stripped, folded) absent from pack, per record:
   ja.kanji.ichi 一 ['hito', 'hito-', 'hitotsu']
   ja.kanji.ni 二 ['futa', 'futatabi', 'futatsu']
   ja.kanji.san 三 ['mi', 'mitsu', 'mittsu', 'zo']
   ja.kanji.yon 四 ['yo', 'yotsu', 'yottsu']
   ja.kanji.go 五 ['itsu', 'itsutsu']
   ja.kanji.roku 六 ['mu', 'mui', 'mutsu', 'muttsu', 'riku']
   ja.kanji.hachi 八 ['hatsu', 'ya', 'yatsu', 'yattsu', 'yo']
   ja.kanji.kyuu 九 ['kokono', 'kokonotsu', 'ku']
   ja.kanji.juu 十 ['ji', 'so', 'to', 'too']
   ja.kanji.hyaku 百 ['byaku', 'momo']
   ja.kanji.sen 千 ['chi']
   ja.kanji.man 万 ['yorozu']
   ja.kanji.hito 人 ['-ri', '-to']
   ja.kanji.oo 大 ['-oo', '-ooini', 'oo-', 'ookii', 'tai']
   ja.kanji.chii 小 ['chiisai', 'ko-', 'o-', 'sa-']
   ja.kanji.naka 中 ['ata', 'ataru', 'uchi']
   ja.kanji.ue 上 ['-a', '-agari', '-agaru', '-ageru', '-ue', 'a', 'agari', 'agaru', 'ageru', 'kami', 'nobo', 'nobori', 'noboru', 'noboseru', 'nobosu', 'shan', 'sho', 'tatematsu', 'tatematsuru', 'uwa-']
   ja.kanji.shita 下 ['-kuda', '-kudasu', 'ge', 'kuda', 'kudari', 'kudaru', 'kudasaru', 'kudasu', 'moto', 'o', 'oriru', 'orosu', 'sa', 'sagaru', 'sageru', 'shimo']
   ja.kanji.hidari 左 ['sha']
   ja.kanji.migi 右 ['yu']
   ja.kanji.kuchi 口 ['ku']
   ja.kanji.me 目 ['-me', 'boku', 'ma-']
   ja.kanji.mimi 耳 ['ji']
   ja.kanji.te 手 ['-te', 'ta-', 'te-', 'zu']
   ja.kanji.ashi 足 ['ta', 'tariru', 'taru', 'tasu']
   ja.kanji.ki 木 ['boku', 'ko-']
   ja.kanji.hi 日 ['-bi', '-ka']
   ja.kanji.tsuki 月 ['getsu']
   ja.kanji.ji 時 ['-doki', 'toki']
   ja.kanji.ima 今 ['kin']
   ja.kanji.aka 明 ['-a', '-ake', 'a', 'akaramu', 'akari', 'akarui', 'akarumu', 'akasu', 'akeru', 'aki', 'akiraka', 'aku', 'akuru', 'min', 'myo']
   ja.kanji.ato 後 ['ko', 'nochi', 'oku', 'okureru', 'ushi', 'ushiro']
   ja.kanji.go-n 午 ['uma']
   ja.kanji.mae 前 ['-mae']
   ja.kanji.na 名 ['-na', 'myo']
   ja.kanji.hon 本 ['moto']
   ja.kanji.nani 何 ['ka', 'nan-', 'nani-']
   ja.kanji.yama 山 ['san', 'sen']
   ja.kanji.kawa 川 ['sen']
   ja.kanji.onna 女 ['me', 'nyo']
   ja.kanji.otoko 男 ['nan', 'o']
   ja.kanji.mi 見 ['mieru', 'miru', 'miseru']
   ja.kanji.yomu 読 ['-yo', '-yomi', 'doku', 'to', 'yo']
   ja.kanji.kaku 書 ['-ga', '-gaki', 'ka']
   ja.kanji.taberu 食 ['ha', 'hamu', 'jiki', 'ku', 'kurau', 'ta']
   ja.kanji.kiku 聞 ['ki', 'kikoeru', 'mon']
   ja.kanji.iku 行 ['-i', '-iki', '-yu', '-yuki', 'an', 'gyo', 'i', 'oko', 'okona', 'okonau', 'yu', 'yuku']
   ja.kanji.kuru 来 ['ki', 'kita', 'kitaru', 'kitasu', 'ko', 'ku', 'tai']
   ja.kanji.kaeru 帰 ['kae', 'kaesu', 'oku', 'okuru', 'totsu', 'totsugu']
   ja.kanji.deru 出 ['-da', '-dasu', '-de', 'da', 'dasu', 'de', 'i', 'idasu', 'ideru', 'sui']
   ja.kanji.hairu 入 ['-i', '-ire', '-iri', '-iru', 'hai', 'i', 'ireru', 'iru', 'ju']
   ja.kanji.nana 七 ['nanatsu', 'nano']
   ja.kanji.nomu 飲 ['-no', '-nomi', 'no', 'on']
   ja.kanji.weather.ten 天 ['ama-', 'amatsu', 'ame']
   ja.kanji.weather.ki 気 ['iki', 'ke']
   ja.kanji.weather.fuu 風 ['kaza-', 'kaze']
   ja.kanji.weather.un 雲 ['-gumo', 'kumo']
   ja.kanji.weather.ame 雨 ['-same', 'ama-', 'ame']
   ja.kanji.weather.yuki 雪 ['yuki']
   ja.kanji.weather.sei 晴 ['-ba', '-bare', 'ha', 'harasu', 'hare', 'hare-', 'hareru']
   ja.kanji.place.ka 花 ['hana', 'ke']
   ja.kanji.place.ka2 家 ['ke', 'uchi', 'ya']
   ja.kanji.place.sha 者 ['mono']
   ja.kanji.body.shin 心 ['-gokoro']
   ja.kanji.body.tai 体 ['katachi', 'tei']
   ja.kanji.body.tou 頭 ['-gashira', 'kaburi', 'kashira', 'zu']
   ja.kanji.body.gan 眼 ['gen', 'manako', 'me']
   ja.kanji.admin.ki 期 ['go']
   ja.kanji.admin.kai 会 ['a', 'atsu', 'atsumaru', 'au', 'awaseru', 'e']
   ja.kanji.admin.hen 変 ['ka', 'kaeru', 'kawari', 'kawaru']
   ja.kanji.film.ei 映 ['-ba', '-bae', 'ha', 'haeru', 'utsu', 'utsuru', 'utsusu']
   ja.kanji.sport.kyou 強 ['go', 'kowa', 'kowai', 'shi', 'shiiru', 'tsuyo', 'tsuyomaru', 'tsuyomeru']
   ja.kanji.sport.sha 射 ['i', 'iru', 'sa', 'sasu', 'u', 'utsu']
   ja.kanji.rel.ai 愛 ['ito', 'itoshii', 'kana', 'kanashii', 'mana', 'me', 'mederu', 'o', 'oshimu']
   ja.kanji.rel.wa 話 ['hana', 'hanasu']
   ja.kanji.city.kai 届 ['-todo', '-todoke', 'todo', 'todokeru']
   ja.kanji.city.shi 使 ['-tsuka', '-tsukai', '-zuka', '-zukai', 'tsuka', 'tsukau']
reverse reading total: 304

-- meanings, per token (pack strings split on ';') --
verbatim: 94
   ids: ja.kanji.ichi, ja.kanji.ni, ja.kanji.san, ja.kanji.yon, ja.kanji.go, ja.kanji.roku, ja.kanji.hachi, ja.kanji.kyuu, ja.kanji.juu, ja.kanji.hyaku
   ids: ja.kanji.sen, ja.kanji.man, ja.kanji.hito, ja.kanji.oo, ja.kanji.oo, ja.kanji.chii, ja.kanji.chii, ja.kanji.naka, ja.kanji.naka, ja.kanji.ue
   ids: ja.kanji.ue, ja.kanji.shita, ja.kanji.shita, ja.kanji.hidari, ja.kanji.migi, ja.kanji.kuchi, ja.kanji.me, ja.kanji.mimi, ja.kanji.te, ja.kanji.ashi
   ids: ja.kanji.ashi, ja.kanji.ki, ja.kanji.ki, ja.kanji.hi, ja.kanji.hi, ja.kanji.tsuki, ja.kanji.tsuki, ja.kanji.toshi, ja.kanji.ji, ja.kanji.ji
   ids: ja.kanji.ima, ja.kanji.aka, ja.kanji.ato, ja.kanji.ato, ja.kanji.go-n, ja.kanji.mae, ja.kanji.na, ja.kanji.hon, ja.kanji.hon, ja.kanji.hon
   ids: ja.kanji.kuni, ja.kanji.nani, ja.kanji.yama, ja.kanji.kawa, ja.kanji.ta, ja.kanji.onna, ja.kanji.onna, ja.kanji.otoko, ja.kanji.taberu, ja.kanji.nana
   ids: ja.kanji.weather.ten, ja.kanji.weather.ki, ja.kanji.weather.ki, ja.kanji.weather.fuu, ja.kanji.weather.un, ja.kanji.weather.ame, ja.kanji.weather.yuki, ja.kanji.place.shin, ja.kanji.place.ka, ja.kanji.place.chou
   ids: ja.kanji.place.chou, ja.kanji.place.ka2, ja.kanji.place.ka2, ja.kanji.place.sha, ja.kanji.body.shin, ja.kanji.body.shin, ja.kanji.body.tai, ja.kanji.body.tou, ja.kanji.admin.ki, ja.kanji.admin.ki
   ids: ja.kanji.admin.kai, ja.kanji.admin.hen, ja.kanji.admin.hen, ja.kanji.film.ei, ja.kanji.film.e, ja.kanji.film.e, ja.kanji.sport.kyou, ja.kanji.sport.sha, ja.kanji.rel.yuu, ja.kanji.rel.ai
   ids: ja.kanji.rel.wa, ja.kanji.city.kai, ja.kanji.city.kai, ja.kanji.city.shi
norm: 11
   ids: ja.kanji.mi, ja.kanji.yomu, ja.kanji.kaku, ja.kanji.taberu, ja.kanji.kiku, ja.kanji.kiku, ja.kanji.kuru, ja.kanji.deru, ja.kanji.deru, ja.kanji.hairu
   ids: ja.kanji.nomu
nowhere: 28
   ids: ja.kanji.hito, ja.kanji.ue, ja.kanji.shita, ja.kanji.kuchi, ja.kanji.te, ja.kanji.aka, ja.kanji.aka, ja.kanji.ato, ja.kanji.go-n, ja.kanji.mae
   ids: ja.kanji.mae, ja.kanji.kuni, ja.kanji.otoko, ja.kanji.mi, ja.kanji.kaku, ja.kanji.kaku, ja.kanji.iku, ja.kanji.kaeru, ja.kanji.hairu, ja.kanji.weather.ten
   ids: ja.kanji.weather.sei, ja.kanji.place.sha, ja.kanji.body.gan, ja.kanji.admin.kai, ja.kanji.film.ei, ja.kanji.sport.sha, ja.kanji.rel.wa, ja.kanji.city.shi
total meaning tokens: 133 | per file: {'readings': 101, 'readings_verbatim': 96, 'mtokens': 90, 'm_verbatim': 60, 'm_nowhere': 19, 'readings_norm': 4, 'readings_nowhere': 1, 'm_norm': 11} | {'readings': 41, 'readings_verbatim': 41, 'mtokens': 43, 'm_nowhere': 9, 'm_verbatim': 34}
non-verbatim detail ((id, token) -> matching gloss or None):
    ('ja.kanji.admin.kai', 'gather') None
    ('ja.kanji.aka', 'clear') None
    ('ja.kanji.aka', 'next (as in tomorrow)') None
    ('ja.kanji.ato', 'after') None
    ('ja.kanji.body.gan', 'eye') None
    ('ja.kanji.city.shi', 'send') None
    ('ja.kanji.deru', 'to exit') ['exit']
    ('ja.kanji.deru', 'to go out') ['go out']
    ('ja.kanji.film.ei', 'project') None
    ('ja.kanji.go-n', 'hour (zodiac)') None
    ('ja.kanji.hairu', 'to enter') ['enter']
    ('ja.kanji.hairu', 'to get in') None
    ('ja.kanji.hito', 'people') None
    ('ja.kanji.iku', 'to go') None
    ('ja.kanji.kaeru', 'to return (home)') None
    ('ja.kanji.kaku', 'book') None
    ('ja.kanji.kaku', 'to write') ['write']
    ('ja.kanji.kaku', 'writing') None
    ('ja.kanji.kiku', 'to ask') ['ask']
    ('ja.kanji.kiku', 'to hear') ['hear']
    ('ja.kanji.kuchi', 'opening') None
    ('ja.kanji.kuni', 'nation') None
    ('ja.kanji.kuru', 'to come') ['come']
    ('ja.kanji.mae', 'front') None
    ('ja.kanji.mae', 'past (time)') None
    ('ja.kanji.mi', 'to look') None
    ('ja.kanji.mi', 'to see') ['see']
    ('ja.kanji.nomu', 'to drink') ['drink']
    ('ja.kanji.otoko', 'man') None
    ('ja.kanji.place.sha', 'one who') None
    ('ja.kanji.rel.wa', 'story') None
    ('ja.kanji.shita', 'under') None
    ('ja.kanji.sport.sha', 'fire') None
    ('ja.kanji.taberu', 'to eat') ['eat']
    ('ja.kanji.te', 'skill') None
    ('ja.kanji.ue', 'on') None
    ('ja.kanji.weather.sei', 'clear weather') None
    ('ja.kanji.weather.ten', 'heaven') None
    ('ja.kanji.yomu', 'to read') ['read']
records with >=1 verbatim gloss: 72
   ids: ja.kanji.ichi, ja.kanji.ni, ja.kanji.san, ja.kanji.yon, ja.kanji.go, ja.kanji.roku, ja.kanji.hachi, ja.kanji.kyuu, ja.kanji.juu, ja.kanji.hyaku
   ids: ja.kanji.sen, ja.kanji.man, ja.kanji.hito, ja.kanji.oo, ja.kanji.chii, ja.kanji.naka, ja.kanji.ue, ja.kanji.shita, ja.kanji.hidari, ja.kanji.migi
   ids: ja.kanji.kuchi, ja.kanji.me, ja.kanji.mimi, ja.kanji.te, ja.kanji.ashi, ja.kanji.ki, ja.kanji.hi, ja.kanji.tsuki, ja.kanji.toshi, ja.kanji.ji
   ids: ja.kanji.ima, ja.kanji.aka, ja.kanji.ato, ja.kanji.go-n, ja.kanji.mae, ja.kanji.na, ja.kanji.hon, ja.kanji.kuni, ja.kanji.nani, ja.kanji.yama
   ids: ja.kanji.kawa, ja.kanji.ta, ja.kanji.onna, ja.kanji.otoko, ja.kanji.taberu, ja.kanji.nana, ja.kanji.weather.ten, ja.kanji.weather.ki, ja.kanji.weather.fuu, ja.kanji.weather.un
   ids: ja.kanji.weather.ame, ja.kanji.weather.yuki, ja.kanji.place.shin, ja.kanji.place.ka, ja.kanji.place.chou, ja.kanji.place.ka2, ja.kanji.place.sha, ja.kanji.body.shin, ja.kanji.body.tai, ja.kanji.body.tou
   ids: ja.kanji.admin.ki, ja.kanji.admin.kai, ja.kanji.admin.hen, ja.kanji.film.ei, ja.kanji.film.e, ja.kanji.sport.kyou, ja.kanji.sport.sha, ja.kanji.rel.yuu, ja.kanji.rel.ai, ja.kanji.rel.wa
   ids: ja.kanji.city.kai, ja.kanji.city.shi
records with >=1 normalised-not-verbatim gloss (no verbatim): 8
   ids: ja.kanji.mi, ja.kanji.yomu, ja.kanji.kaku, ja.kanji.kiku, ja.kanji.kuru, ja.kanji.deru, ja.kanji.hairu, ja.kanji.nomu
records with no related gloss at all: 4
   ids: ja.kanji.iku, ja.kanji.kaeru, ja.kanji.weather.sei, ja.kanji.body.gan
WHOLE-STRING axis (2026-10-13 unit): pack meanings[] string equal to one gloss: 35
   ids: ja.kanji.ichi, ja.kanji.ni, ja.kanji.san, ja.kanji.yon, ja.kanji.go, ja.kanji.roku, ja.kanji.hachi, ja.kanji.kyuu, ja.kanji.juu, ja.kanji.hyaku
   ids: ja.kanji.sen, ja.kanji.man, ja.kanji.hidari, ja.kanji.migi, ja.kanji.me, ja.kanji.mimi, ja.kanji.toshi, ja.kanji.ima, ja.kanji.na, ja.kanji.nani
   ids: ja.kanji.yama, ja.kanji.kawa, ja.kanji.ta, ja.kanji.nana, ja.kanji.weather.fuu, ja.kanji.weather.un, ja.kanji.weather.ame, ja.kanji.weather.yuki, ja.kanji.place.shin, ja.kanji.place.ka
   ids: ja.kanji.body.tai, ja.kanji.body.tou, ja.kanji.sport.kyou, ja.kanji.rel.yuu, ja.kanji.rel.ai
   whole strings compared: 84
reverse: js English gloss absent from pack (normalised compare), per record:
   ja.kanji.ichi 一 ['one radical (no.1)']
   ja.kanji.ni 二 ['two radical (no. 7)']
   ja.kanji.hachi 八 ['eight radical (no. 12)']
   ja.kanji.man 万 ['10,000']
   ja.kanji.naka 中 ['center', 'in', 'mean']
   ja.kanji.shita 下 ['descend', 'give', 'inferior', 'low']
   ja.kanji.me 目 ['care', 'class', 'experience', 'favor', 'insight', 'look']
   ja.kanji.ashi 足 ['be sufficient', 'counter for pairs of footwear']
   ja.kanji.hi 日 ['Japan', 'counter for days']
   ja.kanji.toshi 年 ['counter for years']
   ja.kanji.aka 明 ['light']
   ja.kanji.ato 後 ['back']
   ja.kanji.go-n 午 ['11AM-1PM', 'seventh sign of Chinese zodiac', 'sign of the horse']
   ja.kanji.mae 前 ['in front']
   ja.kanji.na 名 ['distinguished', 'noted', 'reputation']
   ja.kanji.hon 本 ['counter for long cylindrical things', 'present', 'real', 'true']
   ja.kanji.kawa 川 ['river or three-stroke river radical (no. 47)', 'stream']
   ja.kanji.ta 田 ['rice paddy']
   ja.kanji.mi 見 ['chances', 'hopes', 'idea', 'look at', 'opinion', 'visible']
   ja.kanji.kiku 聞 ['listen']
   ja.kanji.iku 行 ['act', 'bank', 'carry out', 'conduct', 'going', 'journey', 'line', 'row']
   ja.kanji.kuru 来 ['become', 'cause', 'due', 'next']
   ja.kanji.kaeru 帰 ['arrive at', 'homecoming', 'lead to', 'result in']
   ja.kanji.deru 出 ['come out', 'leave', 'protrude', 'put out']
   ja.kanji.hairu 入 ['insert']
   ja.kanji.nomu 飲 ['smoke', 'take']
   ja.kanji.weather.ten 天 ['heavens', 'imperial']
   ja.kanji.weather.ki 気 ['atmosphere', 'mind', 'mood']
   ja.kanji.weather.fuu 風 ['air', 'manner', 'style']
   ja.kanji.weather.sei 晴 ['clear up']
   ja.kanji.place.shin 森 ['woods']
   ja.kanji.place.chou 町 ['block', 'village']
   ja.kanji.place.ka2 家 ['expert', 'family', 'performer', 'professional']
   ja.kanji.place.sha 者 ['someone']
   ja.kanji.body.shin 心 ['heart radical (no. 61)', 'spirit']
   ja.kanji.body.tai 体 ['counter for images', 'object', 'reality', 'substance']
   ja.kanji.body.tou 頭 ['counter for large animals']
   ja.kanji.body.gan 眼 ['eyeball']
   ja.kanji.admin.ki 期 ['term', 'time']
   ja.kanji.admin.kai 会 ['association', 'interview', 'join', 'meet', 'party']
   ja.kanji.admin.hen 変 ['unusual']
   ja.kanji.film.ei 映 ['projection', 'reflection']
   ja.kanji.film.e 絵 ['drawing', 'sketch']
   ja.kanji.sport.sha 射 ['archery', 'onto', 'shine into']
   ja.kanji.rel.ai 愛 ['affection', 'favourite']
   ja.kanji.rel.wa 話 ['tale']
   ja.kanji.city.kai 届 ['arrive', 'forward', 'notify', 'report']
   ja.kanji.city.shi 使 ['ambassador', 'cause', 'envoy', 'messenger', 'order', 'send on a mission']
reverse gloss total: 121

-- radicals: pack set vs jmdict-simplified krad element set --
exact: 27
   ids: ja.kanji.ichi, ja.kanji.juu, ja.kanji.hyaku, ja.kanji.hito, ja.kanji.chii, ja.kanji.me, ja.kanji.mimi, ja.kanji.te, ja.kanji.hi, ja.kanji.tsuki
   ids: ja.kanji.aka, ja.kanji.na, ja.kanji.hon, ja.kanji.yama, ja.kanji.kawa, ja.kanji.ta, ja.kanji.onna, ja.kanji.otoko, ja.kanji.kiku, ja.kanji.nomu
   ids: ja.kanji.weather.ame, ja.kanji.weather.yuki, ja.kanji.place.shin, ja.kanji.place.ka2, ja.kanji.body.shin, ja.kanji.body.gan, ja.kanji.sport.sha
subset: 16
   ids: ja.kanji.san, ja.kanji.shita, ja.kanji.kuchi, ja.kanji.ashi, ja.kanji.ato, ja.kanji.mae, ja.kanji.mi, ja.kanji.deru, ja.kanji.weather.ten, ja.kanji.weather.ki
   ids: ja.kanji.weather.fuu, ja.kanji.weather.sei, ja.kanji.body.tou, ja.kanji.sport.kyou, ja.kanji.rel.ai, ja.kanji.rel.wa
superset: 2
   ids: ja.kanji.oo, ja.kanji.ki
partial: 18
   ids: ja.kanji.sen, ja.kanji.ue, ja.kanji.hidari, ja.kanji.migi, ja.kanji.toshi, ja.kanji.ji, ja.kanji.go-n, ja.kanji.kuni, ja.kanji.yomu, ja.kanji.iku
   ids: ja.kanji.weather.un, ja.kanji.place.ka, ja.kanji.place.chou, ja.kanji.place.sha, ja.kanji.admin.ki, ja.kanji.film.ei, ja.kanji.film.e, ja.kanji.city.kai
disjoint: 21
   ids: ja.kanji.ni, ja.kanji.yon, ja.kanji.go, ja.kanji.roku, ja.kanji.hachi, ja.kanji.kyuu, ja.kanji.man, ja.kanji.naka, ja.kanji.ima, ja.kanji.nani
   ids: ja.kanji.kaku, ja.kanji.taberu, ja.kanji.kuru, ja.kanji.kaeru, ja.kanji.hairu, ja.kanji.nana, ja.kanji.body.tai, ja.kanji.admin.kai, ja.kanji.admin.hen, ja.kanji.rel.yuu
   ids: ja.kanji.city.shi
no_krad: 0
pack radical elements absent from krad (total): 50
krad elements absent from pack (total): 120
per-record detail for every non-exact record:
   subset   ja.kanji.san 三 pack=['一'] krad=['一', '二'] pack\krad=[] krad\pack=['二'] idx=一
   subset   ja.kanji.shita 下 pack=['一', '卜'] krad=['|', '一', '卜'] pack\krad=[] krad\pack=['|'] idx=一
   subset   ja.kanji.kuchi 口 pack=['口'] krad=['口', '囗'] pack\krad=[] krad\pack=['囗'] idx=口
   subset   ja.kanji.ashi 足 pack=['口', '止'] krad=['口', '止', '足'] pack\krad=[] krad\pack=['足'] idx=足
   subset   ja.kanji.ato 後 pack=['彳'] krad=['夂', '幺', '彳'] pack\krad=[] krad\pack=['夂', '幺'] idx=彳
   subset   ja.kanji.mae 前 pack=['月'] krad=['一', '刈', '并', '月'] pack\krad=[] krad\pack=['一', '刈', '并'] idx=刀
   subset   ja.kanji.mi 見 pack=['儿', '目'] krad=['儿', '目', '見'] pack\krad=[] krad\pack=['見'] idx=見
   subset   ja.kanji.deru 出 pack=['山'] krad=['|', '凵', '山'] pack\krad=[] krad\pack=['|', '凵'] idx=凵
   subset   ja.kanji.weather.ten 天 pack=['一', '大'] krad=['一', '二', '大'] pack\krad=[] krad\pack=['二'] idx=大
   subset   ja.kanji.weather.ki 気 pack=['气'] krad=['ノ', '丶', '乞', '气'] pack\krad=[] krad\pack=['ノ', '丶', '乞'] idx=气
   subset   ja.kanji.weather.fuu 風 pack=['几', '虫'] krad=['ノ', '几', '虫', '風'] pack\krad=[] krad\pack=['ノ', '風'] idx=風
   subset   ja.kanji.weather.sei 晴 pack=['日', '青'] krad=['二', '亠', '土', '日', '月', '青'] pack\krad=[] krad\pack=['二', '亠', '土', '月'] idx=日
   subset   ja.kanji.body.tou 頭 pack=['豆', '頁'] krad=['ハ', '口', '并', '目', '豆', '貝', '頁'] pack\krad=[] krad\pack=['ハ', '口', '并', '目', '貝'] idx=頁
   subset   ja.kanji.sport.kyou 強 pack=['弓', '虫'] krad=['厶', '弓', '虫'] pack\krad=[] krad\pack=['厶'] idx=弓
   subset   ja.kanji.rel.ai 愛 pack=['夂', '心', '爪'] krad=['冖', '夂', '心', '爪'] pack\krad=[] krad\pack=['冖'] idx=心
   subset   ja.kanji.rel.wa 話 pack=['舌', '言'] krad=['口', '舌', '言'] pack\krad=[] krad\pack=['口'] idx=言
   superset ja.kanji.oo 大 pack=['人', '大'] krad=['大'] pack\krad=['人'] krad\pack=[] idx=大
   superset ja.kanji.ki 木 pack=['十', '木'] krad=['木'] pack\krad=['十'] krad\pack=[] idx=木
   partial  ja.kanji.sen 千 pack=['丿', '十'] krad=['ノ', '十'] pack\krad=['丿'] krad\pack=['ノ'] idx=十
   partial  ja.kanji.ue 上 pack=['一', '丨'] krad=['一', '卜'] pack\krad=['丨'] krad\pack=['卜'] idx=一
   partial  ja.kanji.hidari 左 pack=['ナ', '工'] krad=['ノ', '一', '工'] pack\krad=['ナ'] krad\pack=['ノ', '一'] idx=工
   partial  ja.kanji.migi 右 pack=['ナ', '口'] krad=['ノ', '一', '口'] pack\krad=['ナ'] krad\pack=['ノ', '一'] idx=口
   partial  ja.kanji.toshi 年 pack=['丿', '干'] krad=['ノ', '一', '乞', '干'] pack\krad=['丿'] krad\pack=['ノ', '一', '乞'] idx=干
   partial  ja.kanji.ji 時 pack=['寺', '日'] krad=['土', '寸', '日'] pack\krad=['寺'] krad\pack=['土', '寸'] idx=日
   partial  ja.kanji.go-n 午 pack=['丿', '十'] krad=['ノ', '乞', '十', '干'] pack\krad=['丿'] krad\pack=['ノ', '乞', '干'] idx=十
   partial  ja.kanji.kuni 国 pack=['囗', '玉'] krad=['丶', '囗', '王'] pack\krad=['玉'] krad\pack=['丶', '王'] idx=囗
   partial  ja.kanji.yomu 読 pack=['売', '言'] krad=['儿', '冖', '士', '言'] pack\krad=['売'] krad\pack=['儿', '冖', '士'] idx=言
   partial  ja.kanji.iku 行 pack=['亍', '彳'] krad=['彳', '行'] pack\krad=['亍'] krad\pack=['行'] idx=行
   partial  ja.kanji.weather.un 雲 pack=['云', '雨'] krad=['一', '二', '厶', '雨'] pack\krad=['云'] krad\pack=['一', '二', '厶'] idx=雨
   partial  ja.kanji.place.ka 花 pack=['化', '艹'] krad=['匕', '化', '艾'] pack\krad=['艹'] krad\pack=['匕', '艾'] idx=艸
   partial  ja.kanji.place.chou 町 pack=['丁', '田'] krad=['一', '亅', '田'] pack\krad=['丁'] krad\pack=['一', '亅'] idx=田
   partial  ja.kanji.place.sha 者 pack=['土', '日'] krad=['日', '老'] pack\krad=['土'] krad\pack=['老'] idx=老
   partial  ja.kanji.admin.ki 期 pack=['其', '月'] krad=['ハ', '月', '甘'] pack\krad=['其'] krad\pack=['ハ', '甘'] idx=月
   partial  ja.kanji.film.ei 映 pack=['央', '日'] krad=['ノ', '冖', '大', '日'] pack\krad=['央'] krad\pack=['ノ', '冖', '大'] idx=日
   partial  ja.kanji.film.e 絵 pack=['会', '糸'] krad=['个', '二', '厶', '小', '幺', '糸'] pack\krad=['会'] krad\pack=['个', '二', '厶', '小', '幺'] idx=糸
   partial  ja.kanji.city.kai 届 pack=['刀', '尸', '田'] krad=['|', '尸', '日', '田'] pack\krad=['刀'] krad\pack=['|', '日'] idx=尸
   disjoint ja.kanji.ni 二 pack=['一'] krad=['二'] pack\krad=['一'] krad\pack=['二'] idx=二
   disjoint ja.kanji.yon 四 pack=['口'] krad=['儿', '囗'] pack\krad=['口'] krad\pack=['儿', '囗'] idx=囗
   disjoint ja.kanji.go 五 pack=['二'] krad=['五'] pack\krad=['二'] krad\pack=['五'] idx=二
   disjoint ja.kanji.roku 六 pack=['八'] krad=['ハ', '亠'] pack\krad=['八'] krad\pack=['ハ', '亠'] idx=八
   disjoint ja.kanji.hachi 八 pack=['八'] krad=['ハ'] pack\krad=['八'] krad\pack=['ハ'] idx=八
   disjoint ja.kanji.kyuu 九 pack=['乙'] krad=['九'] pack\krad=['乙'] krad\pack=['九'] idx=乙
   disjoint ja.kanji.man 万 pack=['艹'] krad=['|', 'ノ', '一'] pack\krad=['艹'] krad\pack=['|', 'ノ', '一'] idx=一
   disjoint ja.kanji.naka 中 pack=['中'] krad=['|', '口'] pack\krad=['中'] krad\pack=['|', '口'] idx=丨
   disjoint ja.kanji.ima 今 pack=['丶', '今'] krad=['一', '个'] pack\krad=['丶', '今'] krad\pack=['一', '个'] idx=人
   disjoint ja.kanji.nani 何 pack=['亻', '可'] krad=['一', '亅', '化', '口'] pack\krad=['亻', '可'] krad\pack=['一', '亅', '化', '口'] idx=人
   disjoint ja.kanji.kaku 書 pack=['書'] krad=['日', '聿'] pack\krad=['書'] krad\pack=['日', '聿'] idx=曰
   disjoint ja.kanji.taberu 食 pack=['人', '良'] krad=['食'] pack\krad=['人', '良'] krad\pack=['食'] idx=食
   disjoint ja.kanji.kuru 来 pack=['来'] krad=['|', '二', '亠', '木', '米'] pack\krad=['来'] krad\pack=['|', '二', '亠', '木', '米'] idx=木
   disjoint ja.kanji.kaeru 帰 pack=['中', '止'] krad=['ヨ', '冖', '刈', '巾'] pack\krad=['中', '止'] krad\pack=['ヨ', '冖', '刈', '巾'] idx=巾
   disjoint ja.kanji.hairu 入 pack=['丶', '人'] krad=['入'] pack\krad=['丶', '人'] krad\pack=['入'] idx=入
   disjoint ja.kanji.nana 七 pack=['一'] krad=['ノ', '乙', '匕'] pack\krad=['一'] krad\pack=['ノ', '乙', '匕'] idx=一
   disjoint ja.kanji.body.tai 体 pack=['亻', '本'] krad=['一', '化', '木'] pack\krad=['亻', '本'] krad\pack=['一', '化', '木'] idx=人
   disjoint ja.kanji.admin.kai 会 pack=['人', '日'] krad=['个', '二', '厶'] pack\krad=['人', '日'] krad\pack=['个', '二', '厶'] idx=人
   disjoint ja.kanji.admin.hen 変 pack=['亦', '頁'] krad=['亠', '夂'] pack\krad=['亦', '頁'] krad\pack=['亠', '夂'] idx=夂
   disjoint ja.kanji.rel.yuu 友 pack=['友'] krad=['ノ', '一', '又'] pack\krad=['友'] krad\pack=['ノ', '一', '又'] idx=又
   disjoint ja.kanji.city.shi 使 pack=['亻', '吏'] krad=['ノ', '一', '化', '口'] pack\krad=['亻', '吏'] krad\pack=['ノ', '一', '化', '口'] idx=人

-- indexing radical (kanjidic2 classical, Kangxi-glyph form) --
pack radicals contain the indexing radical: 60
   ids: ja.kanji.ichi, ja.kanji.san, ja.kanji.go, ja.kanji.roku, ja.kanji.hachi, ja.kanji.kyuu, ja.kanji.juu, ja.kanji.hyaku, ja.kanji.sen, ja.kanji.hito
   ids: ja.kanji.oo, ja.kanji.chii, ja.kanji.ue, ja.kanji.shita, ja.kanji.hidari, ja.kanji.migi, ja.kanji.kuchi, ja.kanji.me, ja.kanji.mimi, ja.kanji.te
   ids: ja.kanji.ki, ja.kanji.hi, ja.kanji.tsuki, ja.kanji.toshi, ja.kanji.ji, ja.kanji.aka, ja.kanji.ato, ja.kanji.go-n, ja.kanji.na, ja.kanji.hon
   ids: ja.kanji.kuni, ja.kanji.yama, ja.kanji.ta, ja.kanji.onna, ja.kanji.otoko, ja.kanji.yomu, ja.kanji.kiku, ja.kanji.nana, ja.kanji.nomu, ja.kanji.weather.ten
   ids: ja.kanji.weather.ki, ja.kanji.weather.un, ja.kanji.weather.ame, ja.kanji.weather.yuki, ja.kanji.weather.sei, ja.kanji.place.shin, ja.kanji.place.chou, ja.kanji.place.ka2, ja.kanji.body.shin, ja.kanji.body.tou
   ids: ja.kanji.body.gan, ja.kanji.admin.ki, ja.kanji.admin.kai, ja.kanji.film.ei, ja.kanji.film.e, ja.kanji.sport.kyou, ja.kanji.sport.sha, ja.kanji.rel.ai, ja.kanji.rel.wa, ja.kanji.city.kai
pack radicals lack it: 24
   ids: ja.kanji.ni, ja.kanji.yon, ja.kanji.man, ja.kanji.naka, ja.kanji.ashi, ja.kanji.ima, ja.kanji.mae, ja.kanji.nani, ja.kanji.kawa, ja.kanji.mi
   ids: ja.kanji.kaku, ja.kanji.taberu, ja.kanji.iku, ja.kanji.kuru, ja.kanji.kaeru, ja.kanji.deru, ja.kanji.hairu, ja.kanji.weather.fuu, ja.kanji.place.ka, ja.kanji.place.sha
   ids: ja.kanji.body.tai, ja.kanji.admin.hen, ja.kanji.rel.yuu, ja.kanji.city.shi
krad element list contains the indexing radical: 69
```
