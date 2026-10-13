# Lexicon transliteration and script-label repair — 2026-10-13

Scope: `languages/ja-JP/lexicon/*.jsonl` (4,057 rows carrying a
`transliteration_system` reading; 97 shards touched). `languages/ru-RU` has no
transliteration readings, `languages/ja-demo` and
`examples/minimal-language-pack` none either, so nothing was repaired there.

Tool: `scripts/fix-pack-transliterations.py` (stdlib only). Rules and behaviour
are pinned by `scripts/test_fix_pack_transliterations.py` (9 tests, run by
`scripts/ci.sh`). Regenerate everything with:

    .venv/bin/python scripts/fix-pack-transliterations.py --pack languages/ja-JP --check
    .venv/bin/python scripts/fix-pack-transliterations.py --pack languages/ja-JP \
        --write --report state/evidence/PACK-LINT-2026-10-13/transliteration-repair-2026-10-13.csv
    .venv/bin/python scripts/fix-pack-transliterations.py --pack languages/ja-JP \
        --convention-report state/evidence/PACK-LINT-2026-10-13/transliteration-review-2026-10-13.csv

## Engine rules that made this visible

Three `Severity::Error` codes now live in `crates/langpack/src/audit.rs::audit_lexicon`
and are adopted by `Pack::validate()` (`crates/langpack/src/pack.rs`), so they
block both `audit-lexicon` and install:

| code | rejects |
|---|---|
| `reading_transliteration_not_latin` | kana (U+3040–U+30FF) or an ASCII digit inside a `transliteration_system` reading |
| `romaji_contains_kana` | kana inside a sentence `romaji`; digits stay legal there (`3-nen shokumu keiken ga arimasu.`) |
| `form_script_mismatch` | a `script` label of `hiragana`/`katakana` whose text contains no kana of that block |

Tests: `crates/langpack/tests/transliteration.rs` (8 tests, including
validator adoption and the audit-only isolation).

## What was wrong, measured before the repair

| defect | count | example |
|---|---|---|
| transliteration carrying kana or a digit | 510 | `kentoう` (けんとう), `ronso2` (ろんそう), `jiゅnり` (じゅんり), `danbooール` |
| `script` label contradicting its own text | 67 slots in 34 rows | マナー, クレジットカード, ダンボール, マイナンバー labelled `hiragana` |
| kana reading misspelled | 1 | `ja.lex.media.head` form/reading `へッド` → `ヘッド` |
| transliteration was the English word, not romaji | same row | `head` → `heddo` |

The kana readings themselves were spot-checked against the glosses (24 random
rows, all consistent) before regenerating romaji from them, so the kana is
trustworthy input; the Latin field is what bulk authoring corrupted.

## What the repair did

544 report rows = 510 regenerated transliterations + 34 relabelled rows
covering 67 label slots. Provenance:
`state/evidence/PACK-LINT-2026-10-13/transliteration-repair-2026-10-13.csv`
(`id,kind,kana,before,after,labels,generated_conflict`).

Transliteration rules were derived from the pack's own well-formed rows, not
imposed, then verified: long vowels spelled out (`こう` → `kou`, `コーヒー` →
`koohii`); sokuon doubles the next mora's consonant and is `t` before ち/つ
(`いっち` → `itchi`, `まっち` → `matchi`, `みっつ` → `mittsu`); `ん` is always
`n`, never Hepburn's `m` before b/m/p (all 17 well-formed rows say
`hanbai`/`senpai`/`shinpan`); foreign-word small kana re-vowelise the preceding
mora (`ふぉーく` → `fooku`, `ぼらんてぃあ` → `borantia`); no particle exception
(the lexicon has no particle entries — the single `は` reading is the noun
"tooth"). 84 of the 510 repaired rows now disagree with some other row's
spelling of the same kana; those pairs are listed in the `generated_conflict`
column instead of the repair copying a sibling (kana collisions cover different
words, and some existing rows are romanised wrongly: `成立` carried as `risshi`).

Post-repair state: `audit-lexicon languages/ja-JP` → **0 errors, 0 warnings**;
`validate languages/ja-JP` → 0 errors / 0 warnings; re-running `--check` finds
0 rows to repair.

## Audio consequence

`ja.lex.media.head` changed its kana reading, so its asset was re-baked
(`--only ja.lex.media.head --force`): `media/manifest.jsonl` line count stays
4,894, one line replaced (sha256 `bfa19fbf…`, 61,484 bytes, text `ヘッド`).
The reuse guard in `scripts/generate-pack-audio.py` is what forces that
re-bake instead of silently relabelling old bytes.

## Remaining convention split — an owner/reviewer decision, not repaired

Measured over the 4,057 now well-formed rows against the generator:

| class | rows | reading |
|---|---|---|
| agrees | 3,336 | — |
| long-vowel collapsed (`こうか` → `koka`) | 225 | style |
| spacing / hyphenation (`じゃあね` → `jaa ne`) | 154 | style |
| other spelling (`しゅちょう` → `shouchuu` vs `shuchou`) | 201 | style |
| gemination collapsed (`はっけん` → `haken`) | 39 | style |
| particle exception (`こんばんは` → `konbanwa`) | 2 | style, correct |
| kana this converter cannot render (`ウェブサイト`, `そふとうぇあ`) | 2 | see defect class |
| **romaji is the English word** (`びたみん` → `vitamin`, `マナー` → `manner`) | **60** | **defect** |
| **romaji and kana are different words** (`ちんぎん` → `rinkou`, `しびれ` → `inmu`) | **38** | **defect** |

The 621 style rows are two romanisation conventions coexisting in one pack:
the older `lexicon/abst*`/`academic2` pools collapse long vowels and
gemination, newer content spells them out. Picking one across 621 published
rows is linguistic/editorial judgement, not a mechanical repair, so it is left
to a human; a learner sees one convention per pool today.

The 98 defect rows are listed with their kana, current romaji, the generated
romaji and the gloss in
`state/evidence/PACK-LINT-2026-10-13/transliteration-review-2026-10-13.csv` — they are
learner-visible pronunciation scaffold that no longer describes the entry, so
they are the highest-value first task for a community reviewer. Some need a
kana fix, some a romaji fix, and a few (e.g. `ja.lex.economy.rinkou`: kana
`ちんぎん`, romaji `rinkou`, gloss "wages") are wrong in both fields and need a
dictionary check against JMdict-Simplified.

## Not done

* No engine rule for "romaji does not match kana": detecting it needs a
  romaji→kana back-converter and a tolerance policy for macrons, alternate
  systems and phrase spacing. Implemented naively it would fire on the 621
  legitimate style rows and block installs. Left as review-pending work.
* Wrong-but-permanent id slugs (`ja.lex.shopping2.tsuika`,
  `ja.lex.admin2.meinamba`, `ja.lex.health4.ukuu`) were not migrated: ids are
  stable keys referenced by units, activities and the media manifest.
