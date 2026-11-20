# JA-A2-FIX-001b — word-timing refresh for the 63 re-baked A2 clips (2026-11-20)

## Outcome
Re-timed exactly the 63 ids in `state/evidence/JA-A2-002-FIX-001/retiming-targets.txt`
against the NEW wavs from 90ef665 using the WORD-TIMING-003 forced-alignment infra
(`scripts/align-word-timings.py`, MMS-300m-1130 CTC, min-score floor 0.35 — unchanged).
**58/63 resolved** and appended to `languages/ja-JP/media/words.jsonl` (4,660 -> 4,718 rows);
**5 abstained `low-posterior`** (0.2734–0.3398, inside the WT-3 abstain band) and stay on
plain-playback fallback per the frozen abstention decision — no unaligned guesses emitted.
ja word-timing coverage: 4,718/4,935 = 95.6% (was 4,660 before this lane).

Abstained ids: ja.lex.body.junyou, ja.lex.ent.joju, ja.lex.food.tsukemono,
ja.lex.sports.joutairyoku, ja.sent.explain-grammar (see report.jsonl for scores).

## Run (omarchy, zero GamingPC/TV compute)
Working copy `~/align/wt3` (WT-3 lane dir); scripts md5-identical to repo
(fc1296df / 8461fbc9). Synced current `manifest.jsonl` + `words.jsonl` (md5
6d004fc3 / 889e2889, both sides verified) and the 63 re-baked wavs before the run.
Target isolation without an `--ids` flag: `--settled` = current sidecar **plus**
`fix001b/others.jsonl` (212 pseudo-settled ids = the pre-existing unsettled remainder,
kept untouched by this lane). Unit `lts-wtf001b`, OMP_NUM_THREADS=8, ~0.15 s/clip.

    ~/align/venv/bin/python scripts/align-word-timings.py --pack languages/ja-JP \
      --settled languages/ja-JP/media/words.jsonl --settled fix001b/others.jsonl \
      --out fix001b/words-aligner.jsonl --report fix001b/report.jsonl --min-score 0.35

Banner proved target set: `unsettled=63 missing_wav=0 targets=63`; scores n=63
min 0.2734 / median 0.6612 / max 0.9836. No contrast targets in this id set
(all ja.lex/ja.sent), matrix not applicable.

## Post-merge verification (local, full sidecar)
0 duplicate ids; 0 schema violations (WORD-TIMING-001 check_schema); 0 spans beyond
clip duration + 0.3 s slack; sidecar ids == 4,718 unique; covered targets ==
targets − abstained (exact). Content ids, wavs, and the media manifest untouched.

## Gates (lane tier)
`cargo run -q -p lts-langpack-cli -- validate languages/ja-JP` and `-- test` —
both exit 0, **0 errors 0 warnings** (info rows pre-existing). Full output: gates.log.
No cargo/pnpm code touched — data-only lane, no fmt/clippy/tsc surface.

## Hotspot note
`languages/ja-JP/media/words.jsonl` was clean at lane start (checked per protocol);
staged by explicit path only, never `git add -A`.

## Provenance files in this dir
`report.jsonl` (63 rows: 58 via forced-align + 5 abstains with scores/reasons),
`words-aligner.jsonl` (the 58 contract-v1 lines appended), `align-run.log` (run banner),
`gates.log`.
