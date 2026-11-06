#!/bin/bash
# Three-lane ru-RU ASR re-audit: GamingPC (CPU x8) + omarchy (CPU x6) + worker (CPU x2).
# Remote lanes run ONLY after a stratified 80-clip identity sample matches GamingPC
# verdicts (zero fail->ok flips, <=2% total mismatch). Every lane uses the pinned
# whisper-gate.sh semantics: same binary sha256, same model sha256, -ng forced CPU.
set -u
REPO=/home/hunter/game-dev/LTS
EV=$REPO/state/evidence/PACK-AUDIO-VERIFICATION-001
BASE=$EV/full-audit-2026-10-28
LANES=$EV/lanes
BENCH=$HOME/.cache/lts-bench
RH=/home/hunter/.cache/lts-reaudit
mkdir -p "$LANES"

python3 "$EV/prep_shards.py" || { echo "PREP_FAIL"; exit 1; }

setup_host() {
  local h=$1
  ssh -o ConnectTimeout=8 "$h" "bash -lc 'mkdir -p $RH/whisper.cpp $RH/scripts $RH/lane'" || return 1
  rsync -a "$BENCH/whisper.cpp/build" "$h:$RH/whisper.cpp/" || return 1
  rsync -a "$BENCH/ggml-large-v3-turbo.bin" "$h:$RH/" || return 1
  rsync -a "$REPO/scripts/qa-asr.py" "$h:$RH/scripts/" || return 1
  rsync -a --delete "$REPO/languages/ru-RU" "$h:$RH/" || return 1
  rsync -a "$LANES/sample-ids.txt" "$h:$RH/lane/" || return 1
  ssh "$h" "bash -lc 'printf \"#!/bin/bash\nexec $RH/whisper.cpp/build/bin/whisper-cli -ng \\\"\\\$@\\\"\n\" > $RH/whisper-gate.sh; chmod +x $RH/whisper-gate.sh'" || return 1
  local L R M RM
  L=$(sha256sum "$BENCH/whisper.cpp/build/bin/whisper-cli" | cut -d' ' -f1)
  R=$(ssh "$h" "bash -lc 'sha256sum $RH/whisper.cpp/build/bin/whisper-cli'" | awk '{print $1}')
  M=$(sha256sum "$BENCH/ggml-large-v3-turbo.bin" | cut -d' ' -f1)
  RM=$(ssh "$h" "bash -lc 'sha256sum $RH/ggml-large-v3-turbo.bin'" | awk '{print $1}')
  if [ "$L" != "$R" ] || [ "$M" != "$RM" ]; then echo "LANE_${h}_SHA_FAIL"; return 1; fi
  echo "SHA_VERIFIED $h"
}

start_remote() {  # host workers idsfile outname
  local h=$1 W=$2 IDS=$3 OUT=$4
  rsync -a "$LANES/$IDS" "$h:$RH/lane/" || return 1
  ssh "$h" "bash -lc 'cd $RH && nohup setsid python3 scripts/qa-asr.py --pack $RH/ru-RU --model $RH/ggml-large-v3-turbo.bin --whisper $RH/whisper-gate.sh --lang russian --workers $W --ids $RH/lane/$IDS --out $RH/lane/$OUT > $RH/lane/$OUT.log 2>&1; touch $RH/lane/$OUT.done' >/dev/null 2>&1 </dev/null &"
  echo "STARTED $h $IDS -> $OUT"
}

remote_done() { ssh -o ConnectTimeout=8 "$1" "bash -lc 'test -f $RH/lane/$2 && echo yes'" | grep -q yes; }

judge_and_launch() {  # host sample_out shard_ids full_out workers
  local h=$1 SOUT=$2 IDS=$3 FOUT=$4 W=$5
  rsync -a "$h:$RH/lane/$SOUT" "$LANES/remote-$h-$SOUT" 2>/dev/null
  if python3 "$EV/compare_lane.py" "$BASE/asr-ru-RU.jsonl" "$LANES/remote-$h-$SOUT" "$h"; then
    start_remote "$h" "$W" "$IDS" "$FOUT"
  else
    echo "LANE_${h}_REJECT identity sample failed - shard falls back to local resume"
  fi
}

OM_OK=0; WK_OK=0
if setup_host omarchy && start_remote omarchy 6 sample-ids.txt sample-omarchy.jsonl; then OM_OK=1; fi
if setup_host hermes-worker-lan && start_remote hermes-worker-lan 2 sample-ids.txt sample-worker.jsonl; then WK_OK=1; fi

# local lane starts immediately on the full pack (qa-asr resumes: done ids skipped)
cd "$EV" && nohup setsid python3 "$REPO/scripts/qa-asr.py" --pack "$REPO/languages/ru-RU" \
  --model "$BENCH/ggml-large-v3-turbo.bin" --whisper "$EV/whisper-gate.sh" --lang russian \
  --workers 8 --out "$BASE/asr-ru-RU.jsonl" > "$BASE/asr-ru-RU.log" 2>&1 &
echo "STARTED local resume lane"

# any lane rejected at identity: its shard ids get appended to a local fallback file
FALLBACK="$LANES/local-fallback-ids.txt"; : > "$FALLBACK"

if [ $OM_OK -eq 1 ]; then
  while ! remote_done omarchy sample-omarchy.jsonl.done; do sleep 30; done
  judge_and_launch omarchy sample-omarchy.jsonl om-ids.txt asr-omarchy.jsonl 6
fi
if [ $WK_OK -eq 1 ]; then
  while ! remote_done hermes-worker-lan sample-worker.jsonl.done; do sleep 30; done
  judge_and_launch hermes-worker-lan sample-worker.jsonl wk-ids.txt asr-worker.jsonl 2
fi

# fallback: if a remote lane was rejected, local picks up its shard (resume-skips overlap)
if [ $OM_OK -eq 1 ] && ! grep -q ACCEPT "$LANES/LANE-omarchy-VERDICT.txt" 2>/dev/null; then cat "$LANES/om-ids.txt" >> "$FALLBACK"; fi
if [ $WK_OK -eq 1 ] && ! grep -q ACCEPT "$LANES/LANE-worker-VERDICT.txt" 2>/dev/null; then cat "$LANES/wk-ids.txt" >> "$FALLBACK"; fi
if [ -s "$FALLBACK" ]; then
  echo "LOCAL_FALLBACK_STARTED for rejected shards"
  while pgrep -f '[q]a-asr.py' >/dev/null; do sleep 60; done
  python3 "$REPO/scripts/qa-asr.py" --pack "$REPO/languages/ru-RU" --model "$BENCH/ggml-large-v3-turbo.bin" \
    --whisper "$EV/whisper-gate.sh" --lang russian --workers 8 --ids "$FALLBACK" \
    --out "$BASE/asr-ru-RU.jsonl" >> "$BASE/asr-ru-RU.log" 2>&1
fi

# wait for accepted remote lanes
while true; do
  ok=1
  grep -q ACCEPT "$LANES/LANE-omarchy-VERDICT.txt" 2>/dev/null && ! remote_done omarchy asr-omarchy.jsonl.done && ok=0
  grep -q ACCEPT "$LANES/LANE-worker-VERDICT.txt" 2>/dev/null && ! remote_done hermes-worker-lan asr-worker.jsonl.done && ok=0
  [ $ok -eq 1 ] && break
  sleep 60
done
echo "ALL_LANES_DONE $(date)"

# collect remote results, merge into the pinned jsonl, then reconcile + fails list
scp -q omarchy:$RH/lane/asr-omarchy.jsonl "$LANES/" 2>/dev/null
scp -q hermes-worker-lan:$RH/lane/asr-worker.jsonl "$LANES/" 2>/dev/null
python3 - "$BASE/asr-ru-RU.jsonl" "$LANES" <<'PYEOF'
import json, sys, pathlib
base_f, lanes = sys.argv[1], pathlib.Path(sys.argv[2])
rows, order = {}, []
for l in pathlib.Path(base_f).read_text().splitlines():
    if l.strip():
        r = json.loads(l); rows[r['id']] = l; order.append(r['id'])
conf, added = [], 0
for f in ['asr-omarchy.jsonl', 'asr-worker.jsonl']:
    p = lanes / f
    if not p.exists(): continue
    for l in p.read_text().splitlines():
        if not l.strip(): continue
        r = json.loads(l)
        if r['id'] in rows:
            if json.loads(rows[r['id']])['status'] != r['status']:
                conf.append((f, r['id'], json.loads(rows[r['id']])['status'], r['status']))
        else:
            rows[r['id']] = l; order.append(r['id']); added += 1
tmp = base_f + '.tmp'
with open(tmp, 'w', encoding='utf-8') as fh:
    for i in order: fh.write(rows[i] + '\n')
pathlib.Path(tmp).replace(base_f)
pathlib.Path(lanes, 'LANES-CONFLICTS.txt').write_text(
    '\n'.join(f'{f} {i} local={a} lane={b}' for f, i, a, b in conf) + '\n')
print(f'merged: +{added} lane rows, {len(conf)} status conflicts, total rows {len(order)}')
PYEOF
PACKS=ru-RU WORKERS=1 DATE=2026-10-28 sh "$EV/reaudit-asr.sh" > "$BASE/reconcile-final.log" 2>&1
tail -4 "$BASE/reconcile-final.log"
echo LANES_ALL_DONE $(wc -l < "$BASE/asr-ru-RU.jsonl")
