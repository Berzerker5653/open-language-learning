# Resume check — audio campaign on GamingPC (2026-10-27)

The owner moved round 2 off Omarchy ("smaller batches so we don't lose so
much work... run it on this computer if we can as it's faster"). Everything
below runs on GamingPC; the Omarchy note in `NEXT-CHECK-2026-10-24.md` is the
history of round 1 only.

## What is running, and how to watch it

    sh state/evidence/PACK-AUDIO-VERIFICATION-001/local-chain.sh      # detached start
    sh state/evidence/PACK-AUDIO-VERIFICATION-001/WATCH.sh 20         # live dashboard
    tail -F state/evidence/PACK-AUDIO-VERIFICATION-001/local-chain.log

`local-chain.sh` holds `local-chain.lock` (flock), so a second start refuses.
16 batches of 25 ids (`retry-batches/{ja,ru}-bNN.txt`), each with its own
`bestof-<lang>-r2-<batch>.jsonl` checkpoint, started `--skip-done`, and
committed (manifest rows + checkpoint + bake log) the moment it settles — the
"smaller batches" the owner asked for: a stop costs one batch, never the run.
Stop with `pkill -f local-chain.sh` then `pkill -f bake-bestof.py`; restart
resumes inside the current batch and re-reads memory at that point.

## The constraint this box actually has

GamingPC also serves inference: strata holds ~85-88 GB resident. Measured
2026-10-27 with the chain at `jobs=2`: MemAvailable 14-29 GB, load ~33,
millions of swapped pages, `allocstall_movable` 73k, and **72 s per TTS take**
— the campaign and the model are fighting over memory, not over cores (both
boxes have 32 cores, so "this computer is faster" is only true with the
inference server stopped). The chain therefore clamps workers by MemAvailable
at every bake start (`(avail-6)/8`) and caps each worker's OMP/MKL/BLAS pool at
`nproc/jobs`; stop strata and restart the chain and it ramps to `jobs=8`.
`WATCH.sh` prints a WARNING line when MemAvailable drops under 8 GB.

Take-rate and ETA come from the dashboard's rolling 15-minute measurement, not
from file timestamps (the bake log has none).

## Certified before spending any bake time

* Transfer integrity: 1,101/1,101 remote hashes before transfer, then the whole
  local tree (ja 4,902 + ru 4,856 manifest rows, 0 mismatch, 0 missing).
* Gate equivalence: 120 harvested winners re-run through both certifying gates
  here — **119/120 agree** (`local-recert-2026-10-27/LOCAL-RECERT-2026-10-27.md`).
  The model file is byte-identical on both boxes. The one disagreement
  (`ru.lex.comparisons.iz-za`) is whisper.cpp transcript reproducibility across
  machines, not audio that changed hands; it is on the owner listening list.
* ASR gate cost here: ~510-580 clips/h at `--workers 4`, one bake tree peaks at
  7.9 GB RSS. `qa-asr.py` now checkpoints every verdict as it settles
  (`scripts/test_qa_asr.py` pins it), so an interrupted audit resumes.

## For the owner (does not need the chain to finish)

Round-1 residue: 382 exhausted clips (ru 118, ja 264) with cause tags, packet
`EXHAUSTED-2026-10-27.md`, answer sheet `disposition-2026-10-27.csv` (batch
numbering identical to `EXHAUSTED-PLAY.sh`: `bash EXHAUSTED-PLAY.sh ru 3`).
Round 2 will shrink that list — regenerate both from the round-2 checkpoints
(`python3 rundown-exhausted.py --date <date> --sheet disposition-<date>.csv`)
before the listening session rather than disposing from this file.

## Loose end worth knowing

`scripts/pack-audit.py` (the review-state/overdue auditor used for the 2026-10-05
screening) is gone from disk: it was never committed (no path in `git log`, not
ignored), so it cannot be recovered from history, and nothing in CI references
it. Do not go hunting for it. The round-2 campaign does not depend on it:
exhausted ids come from the checkpoints via `rundown-exhausted.py`, and if a
review-overdue auditor is needed again it has to be re-landed as a tracked file.
