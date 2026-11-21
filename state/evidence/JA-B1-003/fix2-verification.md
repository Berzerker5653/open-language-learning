# JA-B1-003-FIX-002 — rewrite 51 defective legacy B1 sentences + re-bake audio (2026-11-21)

Executed on board card t_dac65d20 (run 74), parent FIX-001 (t_7698dc5b).

## Scope applied

All 51 sentence ids carrying `changes-requested` verdicts `rev-2026-11-20-b1leg-*`
in `languages/ja-JP/reviews.jsonl` (32 P1 + 19 P2, per
`state/evidence/JA-B1-003/findings-2026-11-20.md`). Rewrites reuse the corrected
lexicon forms landed by FIX-001 (e.g. しゃざい 謝罪, けつまつ 結末, しょうこ 証拠,
はいしゅつ 排出, せいさく 政策). Ids, `status: draft` and sources untouched;
`generation.notes` on every rewritten row records the repair.

Per-row text (defect → repair) is recorded one line per id in the 51 appended
fix-verification records `rev-2026-11-21-b1legfix2-001..051`
(`outcome: approved`, `reviewer_category: ai-assisted` — promote nothing).

## Audio impact split (per-sentence rule from the band review)

- 50/51 rows changed reading → re-baked.
- 1/51 (`ja.sent.guest-host`) was gloss-only (座敷 = tatami room, not 'seat'):
  text/reading unchanged, old clip + word-timing row stay valid, NOT re-baked.

## Bake

- Unit `lts-b1fix2-bake` (systemd-run, GamingPC): `scripts/generate-pack-audio.py
  --pack languages/ja-JP --force --only <50 ids>`, defaults
  qwen3-tts / ono_anna / japanese (matches pack provenance).
- Result: 50/50 first-request `ok=True`, zero `ok=False` (log copy:
  `fix2-bake.log`). Post-bake verification (python): 50/50 manifest rows present,
  sha256(row)==sha256(disk wav), bytes match, row `text` == new declared reading,
  synthesizer block unchanged (qwen3-tts/ono_anna). Clip seconds 2.00–7.68 s.

## ASR content-check (gate-integrity note)

`scripts/qa-asr.py` v5 duration cap counts syllables with a CRYLILIC-only vowel
class; for kana text it scores n_syll=0 → a flat 1.30 s cap, which flags every
ja sentence clip structurally (same bug class as the documented `ё` char-class
pitfall; the cap's owner-audition rationale is word takes). The gate script was
NOT modified. Runner `fix2_asr_runner.py` (copy kept: `fix2-asr-runner.py`)
imports the PRODUCTION `verdict()` live from qa-asr.py and applies the identical
cap formula with an equivalent mora-aware count (kana morae incl. ん/ー).
Result: **50/50 `ok`**, zero MISMATCH (`fix2-asr.jsonl`).

## Word-timing re-alignment (WORD-TIMING-003 contract)

- omarchy align lane (`~/align/fix002`, fresh copy; manifest md5 52d62b82…
  verified equal on both sides): CTC forced aligner
  (`scripts/align-word-timings.py`, py3.12 venv, MMS-300m-1130).
- Targets selected by settled-file arithmetic (words.jsonl minus the 50 ids →
  banner `targets=50`); run: **50/50 ok, 0 abstain**, scores min 0.4057 ≥ floor
  0.35, median 0.7285 (`fix2-word-timings-report.jsonl`).
- Merge (A2 JA-A2-002-FIX-001b pattern): 50 stale rows deleted, 50 contract rows
  appended; monotonicity + span sanity asserted in-merge. words.jsonl 4,575 rows
  before and after (50 replaced); guest-host row retained untouched.

## Gates (LANE tier)

7/7 langpack-cli commands exit 0 with 0 errors / 0 warnings
(`fix2-gates.log`): validate, lint, audit-curriculum, audit-lexicon,
audit-licenses, audit-sources, test on `languages/ja-JP`.

## Limits (honesty)

- All records are `ai-assisted`; no human/native pass (standing ja policy,
  owner 2026-11-06). Sentence authoring was agent-decided content-quality work
  (owner decision 2026-11-19 delegation); machine gates cover form/reading/romaji
  consistency, cloze containment, and audio↔text agreement — naturalness of the
  51 new sentences remains open to a future qualified review, same posture as
  the rest of the draft band.
- No status flips in pack content (everything stays `draft`); nothing published.
