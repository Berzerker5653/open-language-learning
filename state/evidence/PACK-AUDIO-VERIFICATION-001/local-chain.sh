#!/bin/sh
# PACK-AUDIO-VERIFICATION-001 — best-of-K ROUND 2, executed on GamingPC.
#
# Round 1 (Omarchy, finished 2026-10-26) left 264 ja + 118 ru ids exhausted
# at K=6 / K=8. The take distribution is i.i.d. (the TTS worker exposes no
# seed), so a fresh round spends more draws on exactly those clips: with the
# measured per-take pass rate the extra draws are expected to clear ~75% of
# the ja and ~70% of the ru residue; whatever still fails is the honest
# stubborn set for owner disposition.
#
# Batches of 25 ids so a crash or a stop costs one batch, never the campaign:
# each batch has its own checkpoint jsonl, is started with --skip-done, and is
# committed (manifest rows + checkpoint + phase log) before the next starts.
# Resumable: a batch whose checkpoint already has every id settled is skipped,
# and `systemctl --user restart lts-local-chain.service` resumes inside the
# current batch - that is also the immediate way to re-ramp worker count when
# the inference server stops or starts. K matches round 1 (ja 6, ru 8) so a
# clip that fails again has now failed K fresh i.i.d. draws: a clean statistic.
#
# Memory: this box also hosts the GPU inference server, whose model holds
# ~85 GB RSS. Measured 2026-10-27 with one live asset (bake-bestof.py +
# qwen3-tts worker + whisper-cli turbo): peak RSS of the whole tree 7.9 GB.
# With the inference server STOPPED (~115 GB available) the chain runs at
# jobs=8; with it running (~31 GB available) the guard below clamps to 3.
# jobs=12 would lean on swap either way, so it is not offered.
# Run:    sh state/evidence/PACK-AUDIO-VERIFICATION-001/local-chain.sh
# Stop:   write proc://<id>/kill, or kill the bake-bestof.py process group.
set -u
REPO="/home/hunter/game-dev/LTS"
HERE="$REPO/state/evidence/PACK-AUDIO-VERIFICATION-001"
cd "$HERE" || exit 1

PY="$HOME/.venvs/qwen-tts/bin/python"
BAKE="$REPO/scripts/bake-bestof.py"
TURBO="$HOME/.cache/lts-bench/ggml-large-v3-turbo.bin"
WHISPER="$HERE/whisper-gate.sh"
LOG="$HERE/local-chain.log"
WANTED_JOBS=${JOBS:-8}
JOBS=$WANTED_JOBS

say() { echo "[$(date -Is)] $*" >> "$LOG"; }

# Hard RAM guard: one live bake tree (qwen3-tts worker + whisper-cli turbo +
# driver) peaks at 7.9 GB. 6 GB is kept as slack for the desktop, and jobs is
# clamped to what MemAvailable can actually carry - so this stays slow-but-safe
# with the inference server up (~31 GB free -> jobs 3) and runs at full width
# once the owner stops it (~115 GB free -> jobs 8).
clamp_jobs() {
  avail_gb=$(awk '/MemAvailable/{print int($2/1048576)}' /proc/meminfo)
  cap=$(( (avail_gb - 6) / 8 )); [ "$cap" -lt 1 ] && cap=1
  if [ "$WANTED_JOBS" -gt "$cap" ]; then
    say "jobs clamped $WANTED_JOBS -> $cap (MemAvailable ${avail_gb} GB)"
    JOBS=$cap
  else
    JOBS=$WANTED_JOBS
  fi
  threads=$(( $(nproc) / JOBS )); [ "$threads" -lt 4 ] && threads=4
}

settled() {
  "$PY" - "$1" <<'PYEOF'
import json, os, sys
p = sys.argv[1]
ids = set()
if os.path.exists(p):
    for line in open(p):
        if line.strip():
            ids.add(json.loads(line)["id"])
print(len(ids))
PYEOF
}

tally() {
  "$PY" - "$1" <<'PYEOF'
import json, sys
p = sys.argv[1]
ok = ex = 0
for line in open(p):
    if not line.strip():
        continue
    r = json.loads(line)
    if r["result"] == "exhausted":
        ex += 1
    else:
        ok += 1
print(f"{ok} solved / {ex} exhausted")
PYEOF
}

# $1 = pack dir | $2 = batch file | $3 = K | $4 = tts language | $5 = whisper lang
#      $6 = checkpoint jsonl | $7 = label
batch() {
  total=$(grep -c . "retry-batches/$2" 2>/dev/null || echo 0)
  if [ "${total:-0}" -eq 0 ]; then
    say "$7: no ids in retry-batches/$2 - refusing to run an empty batch"
    return 1
  fi
  out=$6
  before=$(settled "$out")
  if [ "$before" -ge "$total" ]; then
    say "$7: already complete ($before/$total) - skipping"
    return 0
  fi
  while :; do
    # clamp on every (re)start of the bake: if the owner stops the inference
    # server, or `systemctl --user restart`es this unit, the next bake starts
    # with the workers the machine can actually carry
    clamp_jobs
    say "$7: $before/$total settled, baking (K=$3, jobs=$JOBS, threads/job=$threads)"
    # torch defaults every worker to the physical core count, so N workers
    # oversubscribe badly (measured: 2 workers at 72 s/take). Cap each worker's
    # BLAS/OMP pool so jobs*threads stays near the core count instead.
    env OMP_NUM_THREADS=$threads MKL_NUM_THREADS=$threads OPENBLAS_NUM_THREADS=$threads \
        "$PY" "$BAKE" --pack "$REPO/$1" --ids "$HERE/retry-batches/$2" --k "$3" \
        --language "$4" --lang "$5" --asr-model "$TURBO" --whisper "$WHISPER" \
        --jobs "$JOBS" --out "$out" --skip-done >> "${out%.jsonl}.log" 2>&1
    after=$(settled "$out")
    if [ "$after" -ge "$total" ]; then break; fi
    if [ "$after" -le "$before" ]; then
      say "$7: STALLED at $after/$total - stopping the chain"
      return 1
    fi
    say "$7: progress $before -> $after of $total - resuming at current memory"
    before=$after
  done
  say "$7: settled $after/$total -> $(tally "$out")"
  # bank the batch: manifest rows + checkpoint + phase log, nothing else
  git -C "$REPO" add -- \
      "languages/$(basename "$1")/media/manifest.jsonl" "$out" "${out%.jsonl}.log"
  git -C "$REPO" commit -q -m "fix(PACK-AUDIO-VERIFICATION-001): round-2 best-of-K batch $7 ($(tally "$out"))" \
    && say "$7: committed" || say "$7: COMMIT FAILED (checkpoint still on disk)"
  return 0
}

exec 9>"$HERE/local-chain.lock"
if ! flock -n 9; then
  say "another local-chain instance holds the lock; exiting"
  exit 0
fi

say "local-chain start (jobs=$JOBS)"

for p in retry-batches/ja-b*.txt; do
  [ -f "$p" ] || { say "no ja batch files matched - check retry-batches/"; exit 1; }
  f=${p#retry-batches/}
  batch languages/ja-JP "$f" 6 japanese ja "bestof-ja-r2-${f%.txt}.jsonl" "ja ${f%.txt}" || exit 1
done
for p in retry-batches/ru-b*.txt; do
  [ -f "$p" ] || { say "no ru batch files matched - check retry-batches/"; exit 1; }
  f=${p#retry-batches/}
  batch languages/ru-RU "$f" 8 russian ru "bestof-ru-r2-${f%.txt}.jsonl" "ru ${f%.txt}" || exit 1
done

say "local-chain done"
