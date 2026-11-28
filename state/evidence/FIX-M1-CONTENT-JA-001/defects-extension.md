# FIX-M1-CONTENT-JA-001 — verb-table sweep findings + dispositions (D-009 extension)

The card pinned three corrupted verb cards (D-009). Sweeping the whole ja-JP
verb table with the new invariant (kana display == reading; `-masu` id slug
derives the taught reading) found the same corruption class in **14 further
rows** (15 corrected in total incl. the two found inside `verbs.jsonl`
itself). Root cause for all of them: the 2026-10-05 ai-screening
`fix_reading` pass (`docs/review/ai-screening-2026-10-05/applied.jsonl`) —
polite `-masu` readings are not JMdict headwords, and the screener
"recovered" a real-but-wrong word within 1-2 kana edits (`かえる→かえりざく`,
`あるく→あるきだす`, `ねる→ねかす` are recorded there verbatim).

## Corrected rows (text + kanji form + reading + audio re-bake)

All replacements verified against the jmdict-simplified 3.6.2 cache
(`tmp/jmdict/jmdict-eng-3.6.2.json`), form + gloss match.

| id | was | now | gloss |
|----|-----|-----|-------|
| ja.lex.verbs.kaerimasu | かえりざく/返り咲く | かえります/帰ります | to go back; to come back |
| ja.lex.verbs.arukimasu | あるきだす | あるきます/歩きます | to walk |
| ja.lex.verbs.nemasu | ねかす/寝かす | ねます/寝ます | to sleep; to go to bed |
| ja.lex.city.haraimasu | はらいだす | はらいます/払います | to pay |
| ja.lex.city.tasukemasu | たすけだす | たすけます/助けます | to help |
| ja.lex.health.kuukimasu | すいこむ | すいます/吸います | to breathe |
| ja.lex.health.hashirimasu | はしりだす | はしります/走ります | to run |
| ja.lex.home.fukimasu | ふきけす | ふきます/拭きます | to wipe |
| ja.lex.leisure.miimasu | みす (not a word) | みます/見ます | to watch; to look at |
| ja.lex.leisure.odorimasu | おどりだす | おどります/踊ります | to dance |
| ja.lex.narrative.mitsukemasu | みつけだす | みつけます/見つけます | to find |
| ja.lex.narrative.watarimasu | わたりあう | わたります/渡ります | to cross |
| ja.lex.transport.hairimasu | はいりなおす | はいります/入ります | to enter; to go in |
| ja.lex.work.oshiemasu | おしえま (not a word) | おしえます/教えます | to teach |
| ja.lex.work.naraimasu | ならわす | ならいます/習います | to learn |
| ja.lex.verbs.mimasu | みす (not a word) | みます/見ます | to see; to watch |
| ja.lex.verbs.shigoto-shimasu | しごとをすます/仕事を済ます | しごとをします/仕事をします | to work |

(`kuukimasu` glosses "to breathe" → the 吸う family; the slug itself matches
no breathe-verb reading — see allow-list.)

## Allow-listed anomalies (NOT the corruption class; kept + ratcheted)

`scripts/check_ja_lexicon.py` ALLOW entries, each with reason:

- `ja.lex.leisure.miimasu`, `ja.lex.city.todokedemasu`,
  `ja.lex.health.kuukimasu` — **malformed id slugs** (`miimasu`,
  `todokedemasu`, `kuukimasu` match no real masu-form reading). The ids are
  stable learner anchors referenced by curriculum units; display+gloss are
  now self-consistent. Renaming ids is a separate decision.
- `ja.lex.transport.norimasu` — display のりこむ is a compound whose own
  meaning matches its gloss ("to get on; to board"): NOT a learner-facing
  error. Kept; flagged here for a future curriculum pass.

## D-010 (greetings.jsonl slots) — disposition

- slot 1 label `the rest wish` → `the good-night wish` (convention: other
  greetings use `the thanks` / `the congratulation` / `the time of day`).
- slot 2 (`なさい`, `the polite ending`): junk alternative `ませ` removed
  (not a substitute for なさい); alternatives now `["なさい"]`.
- **Bound form なさい stays in a learner slot**: the phrase-slot surface is
  display-only (grading never reads slots), the label is now truthful, and
  contrasting おやすみ + polite なさい is teachable. No engine change.

## Loanword orthography

- `ja.lex.ent.konsaato`: こんさーと (hiragana) → コンサート (katakana),
  readings + audio aligned; consumer `ja.sent.concert-fun` text/reading/
  `cloze_targets` + the `ja.grammar.adjectives.i-inflection` example that
  reuses that sentence, all swept (json round-trip over every shard; the
  only remaining こんさーと occurrences are the correction notes themselves).
- Convention pinned in `languages/ja-JP/README.md` (authoring rule) and made
  mechanically visible via the report-only line in
  `scripts/check_ja_lexicon.py`. **Backlog measured: 186 legacy row-fields**
  carry the ー long-vowel mark in non-katakana script (めーる,
  ぷらっとほーむ, せみなー, …) — out of this card's scope; needs its own
  content card + re-bake list.

## Word-timing sidecar

`media/words.jsonl` rows for all re-baked ids were dropped (timings belong
to the old audio; unaligned clips fall back to plain playback by contract).
Re-timing them is the standard aligner lane, not required here.
