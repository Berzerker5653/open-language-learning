# Resume check — audio campaign on GamingPC (2026-10-27)

**Status 2026-10-28 08:15: the round-2 queue is FINISHED** (all 16 batches
settled and committed at 23:03 on 2026-10-27; `local-chain done`). Final
tallies and the close-out evidence: `ROUND2-CLOSE-2026-10-28.md`. The rest of
this file is the round-2 operating note — kept for how the box behaves under
load, not because anything is still running.

The owner moved round 2 off Omarchy ("smaller batches so we don't lose so
much work... run it on this computer if we can as it's faster"). Everything
below runs on GamingPC; the Omarchy note in `NEXT-CHECK-2026-10-24.md` is the
history of round 1 only.

## How it ran, and how to watch a run like it

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

## Status - 2026-10-28 evening (same run, half done)

The handoff worked: the chain came up 10:26 with 8 workers (the clamp saw
114 GB free), ran ja to completion, and moved to ru. The owner restarted
strata around 15:00 for this session, so the ru rows now run alongside
inference - slower than the strata-down window, same rules.

- **ja: 4,902/4,902** (1,232 carried rows re-verified, verdicts preserved).
  287 fail. Of those: 143 are already in the disposition packet; **0** were
  certified by the campaign - the rounds that installed clips are
  self-consistent with the gate that certified them; **144** are new: they
  passed the old (since-deleted) build's pass in the asr6 audit and fail the
  pinned one. They sit in the 0.2-0.7 ratio band: wrong-word clips
  (`chie` heard "Cへ", `hyousou` heard "へよ", `fumin` heard "海") and cases
  where the recognizer answered in kanji the kana-fold can't compare
  (`rest-today` declared きょうは やすみます。, heard 今日は休みます - the
  right sentence). Baking those 144 is cheap insurance: the loop only keeps
  a take that passes, and the rest land in the owner packet.
- **ru: 746/4,856** at ~890 clips/h (the box's CPU ceiling for this build:
  ~32 s of wall per clip at 8 workers x ~3 threads). Remaining ~4,110 ≈
  4.6 h unattended with strata off; longer with it on.
- `round4-chain.sh` waits for the re-audit, then bakes exactly the failures no
  campaign record explains, 25-id batches with one commit each, ja (K=6) then
  ru (K=8), and re-runs the close-out at the end.

Open follow-up for the gate itself (NOT mid-audit): the kana fold leaves
kanji transcripts uncomparable - 33 of the 144. A heard-side G2P (the same
JMDict resource the declared side already uses) would judge those properly
instead of sending them to a bake. Deferred until this audit's tallies are
committed.

## PAUSED 2026-10-28 15:20 at the owner's request

Nothing campaign-related runs on this box now, and nothing will start itself:
`lts-local-chain.service` was **disabled** (it was `enabled`, i.e.
boot-resumable) and the round-2 unit is `inactive`. Killed: the re-audit driver
and its whisper workers, `round4-chain.sh`, `handoff.sh` (one-shot, already
done). `omp-strata.service` was left alone - that's your inference service, not
campaign work. MemAvailable after the stop: 32 GB.

Committed in `de70068`: **6,090 of 9,758 rows** of verdicts.

| pack | audited | state |
|---|---|---|
| ja-JP | 4,902/4,902 | complete; 287 fail (143 already in the packet, 0 certified by the campaign, 144 unexplained) |
| ru-RU | 1,188/4,856 | 428 carried verdicts + 760 fresh; **3,668 left** ≈ 4.6 h at 890/h strata-off, ~5 h alongside inference |

### To resume (the one trap: pin the date)

`qa-asr.py` resumes by skipping ids already in the output file - but the
output path is derived from `DATE`, so a plain restart tomorrow opens
`full-audit-2026-10-29/` and re-listens to all 9,758 clips.

    cd state/evidence/PACK-AUDIO-VERIFICATION-001
    DATE=2026-10-28 sh reaudit-asr.sh        # appends, skips finished ids
    setsid nohup sh round4-chain.sh > round4.log 2>&1 < /dev/null &   # waits for the audit, then bakes

Optionally re-arm the boot-resume unit first:
`systemctl --user enable --now lts-local-chain.service` (round-2 batches are all
complete, so it verifies and exits; it is not what drives the re-audit).

### Not started yet (all of it resumes from committed files)

- round-4 bakes for the 144 unexplained ja rows (and ru's equivalents);
- ru fail tallies: `audit-fails.jsonl` is only written when the driver reaches
  its reconciliation step, which it didn't - but the per-row verdicts are in
  `full-audit-2026-10-28/asr-ru-RU.jsonl`, so the 144-style breakdown can be
  computed from those rows without re-listening to anything;
- `close-round2.sh` re-run to regenerate the owner packet (238 clips now, plus
  whatever round 4 exhausts).

## The constraint this box actually has

GamingPC also serves inference: strata holds ~85-88 GB resident. Measured
2026-10-27 with the chain at `jobs=2`: MemAvailable 14-29 GB, load ~33,
millions of swapped pages, `allocstall_movable` 73k, and **72 s per TTS take**
— the campaign and the model are fighting over memory, not over cores (both
boxes have 32 cores, so "this computer is faster" is only true with the
inference server stopped). The chain therefore clamps workers by MemAvailable
at every bake start (`(avail-6)/8`) and caps each worker's OMP/MKL/BLAS pool at
`nproc/jobs`; stop strata and restart the chain and it ramps to `jobs=8`.
(The 72 s/take figure was the oversubscribed `jobs=2`, 16-threads-per-worker
config. After capping each worker's pool at `nproc/jobs`, the measured steady
rate is 128 takes in 53 min = **145 takes/h** at `jobs=3`.)
`WATCH.sh` prints a WARNING line when MemAvailable drops under 8 GB.

Take-rate and ETA come from the dashboard's rolling 15-minute measurement, not
from file timestamps (the bake log has none).

## Measured round-2 yield (the driver header's prediction was wrong)

Batch `ja-b00` (25 ids, K=6, 128 takes, 53 min): **8 solved / 17 exhausted**.
The plan claimed ~75% of the residue would clear. That was bad arithmetic:
takes are i.i.d., ids are not exchangeable, and having already failed 6 fresh
takes is evidence about the id, so conditioning on it lowers the estimate.
Budget ~1 in 3 of the remaining 357 residue ids certifying (~120 new certs) and
the rest turning into owner disposition; at 145 takes/h the remaining queue is
~12 h of background CPU alongside inference. The re-failed ids now carry
2K=12 failed takes under identical gates, which is a materially stronger
basis for "remove or re-author" than one bad listening impression.

## Certified before spending any bake time

* Transfer integrity: 1,101/1,101 remote hashes before transfer, then the whole
  local tree (ja 4,902 + ru 4,856 manifest rows, 0 mismatch, 0 missing).
* Gate equivalence: 120 harvested winners re-run through both certifying gates
  here — **119/120 agree** (`local-recert-2026-10-27/LOCAL-RECERT-2026-10-27.md`).
  The model file is byte-identical on both boxes; the one disagreement
  (`ru.lex.comparisons.iz-za`) is **recognizer-build skew** - GamingPC runs
  whisper.cpp `60c0be6` (`79b96a71…`), the campaign box `7e26d3b`
  (`d9919437…`). Measured on that clip: gate decode `-np -nt` -> `Иосифа.`,
  timestamped decode -> `Хи-о-зу-за!`, both deterministic, identical at
  1/4/8/16 threads. Identity pins and the probe: `gate-identity-2026-10-27.txt`.
* ASR gate cost here: ~510-580 clips/h at `--workers 4`, one bake tree peaks at
  7.9 GB RSS. `qa-asr.py` now checkpoints every verdict as it settles
  (`scripts/test_qa_asr.py` pins it), so an interrupted audit resumes.
* Accepted follow-up, scripted as `regate-harvest.sh` (CPU-only, ~2 h at the
  measured clip rate, refuses to start while a bake is alive): re-gate the
  1,101 harvested round-1 winners with this box's binary and emit
  `deltas.jsonl` + `REGATE-<date>.md` — clips this box's shipping gate will not
  pass, which go to the same disposition path as a round-2 exhaustion. ~0.8%
  skew predicts ~9 deltas; disposition them rather than trusting a cert made by
  another build.
  Publish-time provenance has to name the recognizer build + model sha, or
  "certified" is not repeatable.

## For the owner (does not need the chain to finish)

Round-1 residue: 382 exhausted clips (ru 118, ja 264) with cause tags, packet
`EXHAUSTED-2026-10-27.md`, answer sheet `disposition-2026-10-27.csv` (batch
numbering identical to `EXHAUSTED-PLAY.sh`: `bash EXHAUSTED-PLAY.sh ru 3`).
Round 2 will shrink that list — regenerate both from the round-2 checkpoints
(`python3 rundown-exhausted.py --date <date> --sheet disposition-<date>.csv`)
before the listening session rather than disposing from this file.

Rows you can actually disposition today: `round2=exhausted` (17 so far) - those
carry 12 failed takes under identical gates. `round2=pending` rows are clips
the campaign has not re-run yet; leave them.

## When the queue finishes

    sh close-round2.sh

One command proves the campaign instead of asserting it: regenerates the packet
+ answer sheet from the round-2 checkpoints, re-hashes all 9,758 manifest rows
against the bytes on disk, runs `lts-langpack-cli validate/lint/test` on both
packs (the CI invocations), and prints the per-language tallies. It refuses
while a bake is running (`--force` validates it against a mid-campaign
snapshot) and never stages or publishes - the archive re-stage stays a
separate, owner-authorized step. Queue integrity is already proven: the 382
queued ids are exactly the 382 round-1 exhausted ids, 0 duplicates, 0 missing,
0 extras.

## Loose end worth knowing

`scripts/pack-audit.py` (the review-state/overdue auditor used for the 2026-10-05
screening) is gone from disk: it was never committed (no path in `git log`, not
ignored), so it cannot be recovered from history, and nothing in CI references
it. Do not go hunting for it. The round-2 campaign does not depend on it:
exhausted ids come from the checkpoints via `rundown-exhausted.py`, and if a
review-overdue auditor is needed again it has to be re-landed as a tracked file.
