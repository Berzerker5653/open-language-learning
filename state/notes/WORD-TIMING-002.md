# WORD-TIMING-002 — ja word-level clip timings (kana contract)

Owner directive 2026-11-08: keep pushing the project forward overnight.

## Spike findings (pilot 30 rows: 14/30 first-pass — NOT shippable yet)
- ja media text is 4904/4911 KANA-only (no kanji in expected text; TTS was
  fed kana). The feared kanji gap is on the ASR side only.
- Failure classes:
  1. Whisper kanji-converts its ja transcription ("ぶんせき" heard as
     "分析") even with kana initial_prompt.
  2. Whisper fragments ja into mora-level word tokens ("ぶん けん"), while
     the expected side is one unspaced token ("ぶんけん") — whitespace
     tokenization (ru) is structurally wrong for ja.
  3. Occasional duplicate-hearing on short clips (heard twice) and っ/ん
     insertion quirks.

## Contract (ja path)
- Normalization: NFKC kana fold already in word_timing_lib.norm (done).
- ASR side: convert every heard token kanji->kana with pykakasi
  (setmode K2H/E2H/J2H; kana-only tokens pass through unchanged).
- Tokenization: pykakasi morpheme segmentation on the EXPECTED kana text
  (gives real ja word boundaries — ぶん/けん, not one blob).
- Alignment: reuse align_tokens() over kana tokens on both sides with the
  existing difflib opcodes + ratio>=0.75 + split/merge absorb >=0.8.
  Heard mora-fragments that concatenate into an expected token are handled
  by the absorb rule; extend absorb to chains up to 3 fragments when the
  concatenated ratio is >=0.9.
- Duplicate-heard blocks are difflib inserts — they must not block coverage
  (already so), timing takes the FIRST matched block.
- Kanji-bearing expected rows (7 total) may abstain; log and move on.
- Interpreter: needs BOTH faster-whisper and pykakasi — create
  ~/.venvs/wordtiming-ja (pip faster-whisper pykakasi; run with
  env -u PYTHONPATH; models share ~/.cache/huggingface).
- Evidence dir: state/evidence/WORD-TIMING-002/.
- Full run: two-pass (--pass primary turbo, --pass retry large-v3), systemd
  unit, coverage floor 90% of 4911 rows.

## Gate
Pilot 30 new rows must reach >=80% first-pass before the full run launches;
python unit tests (tools/test_word_timing.py) must gain kana cases: kanji
heard token folds to match expected kana; mora fragments absorbed; expected
text segmented into multiple ja words.
