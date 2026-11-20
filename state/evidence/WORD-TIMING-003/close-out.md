# WORD-TIMING-003 — forced aligner close-out (2026-11-20)

## Outcome
MMS-300m-1130 CTC forced alignment (ungated mirror `MahmoudAshraf/mms-300m-1130-forced-aligner`,
via ctc-forced-aligner @ git HEAD 7c66b95, py3.12 venv on omarchy, CPU-only) ran over the
**2,210 unsettled ja clips**: **1,997 resolved = 90.36% additional coverage** (acceptance floor 85%).
All 213 abstains are `low-posterior` (conf 0.067–0.349 < floor 0.35) — zero structural failures
in the final run. ja word-timing coverage after merge: **4,722/4,935 = 95.7%** of clips.

The card text said "2,182 unsettled" — stale at authoring time: the JA-B1/B2 lanes added content,
manifest is now 4,935 rows, media/words.jsonl had 2,725 timed rows at start.

## Why this works where WORD-TIMING-002's ASR route could not
No transcription step exists: the KNOWN pack text is aligned directly as CTC letter targets
(kana -> mora table -> ASCII romaji; gemination っ doubles the next onset, long vowel ー extends
the previous vowel — the exact contrasts whisper mis-heard). The alignment proof is the
phoneme-posterior floor, not a token ratio, per the acceptance clause.

## Score definitions (the proof, calibrated on probe6)
- `score` (acceptance floor 0.35): exp(mean log-prob) over path frames labelled with real
  phonemes. Probe accepted min 0.424; the one structural reject sat at 0.232 -> clean gap.
- `fit`: exp(mean log-prob) over ALL path frames incl. blanks — used only for the contrast
  cross-score matrix (penalizes a mismatched-length text absorbing audio as blanks).

## Contrast matrix caveat (honesty, shipped as evidence not gate)
probe6 matrix (5 unsettled pairs): 1/5 `correct` under fit (gemination.matta), others WRONG.
Analysis: (a) asymmetry — a shorter text loses little posterior (unmatched audio -> blank
frames), so own>cross fails when the twin is longer; (b) moraic-nasal pairs collapse in ASCII
romaji (ん->n: きん=kin vs き=ki differ only by the final n the TTS clip barely audibilizes);
(c) some TTS clips may not carry the contrast acoustically at all. The matrix does not gate
acceptance — the posterior floor + schema + monotonic in-clip span checks do, and every
emitted span was machine-verified in-clip (0 violations across all 4,722 merged rows).

## Bug history (lane iteration evidence, kept in this dir)
- probe5 (full1 run, report `full-report.jsonl`): attempt 3's `fold_text` folded katakana with
  **+0x20 instead of -0x60** (U+30A1->U+3041 direction), corrupting every katakana word into
  Bopomofo garbage that abstained as unmapped-mora (115 rows) — coverage stopped at 85.5%.
  No bad romanization ever reached the aligner (all corrupted rows abstained).
- Fixes committed with the lane: katakana fold -0x60; punctuation skip (。、「 carry no mora);
  ASCII romaji pass-through for latin mixed into pack text (rajio etc.); `--prior` vs
  `--settled` split (attempt 3 usage passed the ASR abstain file as settled, which would have
  excluded 2,171 of the 2,210 actual targets); dual score conf/fit; span access through
  get_spans' per-token segment LISTS; forced_align per-frame score flattening; `--skip-done`.
- full2 (final): `full2-report.jsonl`, 90.36%, 0 structural abstains.
- Corpus romanizer check post-fix: 4,935/4,935 texts romanize except 8 kanji rows pykakasi
  cannot fold (expected-kanji abstains; none were in the unsettled target set).

## Merge + integrity
`words-aligner2.jsonl` (1,997 contract-v1 lines {id,words:[{w,s,e}]}) appended to
languages/ja-JP/media/words.jsonl (2,725 -> 4,722 lines). Verified post-merge: 0 duplicate ids,
0 schema violations (WORD-TIMING-001 check_schema), 0 spans beyond clip duration + 0.3 s slack,
span duration distribution sane (median 0.58 s). No media manifest churn. ru untouched.
words-aligner2.jsonl stays here as provenance.

## Compute hygiene
Everything ran on omarchy (ssh, systemd user units `lts-wt3-probe4/5/6`, `lts-wt3-full1/2`,
OMP_NUM_THREADS=8, ~0.14 s/clip CPU). Zero compute on GamingPC GPU or the TV computer.
