#!/usr/bin/env bash
# Multi-round repair loop for ASR-gate failures in the ru-RU pack.
# Each round: fresh worker processes render the pending ids (sampling TTS,
# fresh seed per request => genuinely different audio every attempt), then
# the CPU whisper gate re-audits every pending id. Survivors feed the next
# round. Stops on zero survivors, round cap, or a wall-clock deadline.
# Designed to survive crashes: fully resumable, idempotent, no long-lived
# TTS process. Launch under systemd-run so the whisper audit is not killed
# by the Hermes worker memory cgroup.
set -uo pipefail
cd "$(dirname "$0")/.."
EV=state/evidence/PACK-AUDIO-VERIFICATION-001
MAX_ROUNDS=${MAX_ROUNDS:-5}
DEADLINE=${DEADLINE_EPOCH:-$(( $(date +%s) + 5*3600 )) }
LOG="$EV/repair-loop.log"
exec >> "$LOG" 2>&1
say() { echo "[repair $(date '+%F %H:%M:%S')] $*"; }

ROUND=0
PENDING="$EV/pending-round.txt"
cp "$EV/mismatch-real2.txt" "$PENDING"
say "REPAIR START pending=$(wc -l < "$PENDING") max_rounds=$MAX_ROUNDS deadline=$(date -d "@$DEADLINE" '+%F %H:%M')"

while :; do
  ROUND=$((ROUND+1))
  N=$(grep -c . "$PENDING")
  say "round $ROUND: rendering $N clips"
  rm -f "$EV"/round-chunk-* 2>/dev/null || true
  split -l 25 "$PENDING" "$EV/round-chunk-"
  for CHUNK in "$EV"/round-chunk-*; do
    mapfile -t IDS < "$CHUNK"
    ARGS=()
    for id in "${IDS[@]}"; do ARGS+=(--only "$id"); done
    timeout 40m env -u PYTHONPATH python3 scripts/generate-pack-audio.py \
      --pack languages/ru-RU --force --tts qwen3 --language russian \
      --speaker ono_anna --jobs 1 \
      --note 'neutral informative educational tone, clean diction, no background noise, no music' \
      "${ARGS[@]}" 2>&1 | grep -E 'generation complete|ok=False' | tail -3
  done
  rm -f "$EV"/round-chunk-*
  say "round $ROUND render done; auditing"
  OUT="$EV/asr-r$ROUND.jsonl"
  timeout 45m python3 scripts/qa-asr.py \
    --pack languages/ru-RU --model ~/.cache/lts-bench/ggml-large-v3-turbo.bin \
    --whisper "$EV/whisper-gate.sh" --lang ru --workers 6 \
    --ids "$PENDING" --out "$OUT" || say "round $ROUND audit exit=$?"
  REMAIN="$EV/mismatch-r$ROUND.txt"
  python3 - "$OUT" "$REMAIN" <<'PY'
import json, sys
rows = [json.loads(l) for l in open(sys.argv[1])]
bad = [r['id'] for r in rows if r.get('status') != 'ok']
open(sys.argv[2], 'w').write('\n'.join(bad) + ('\n' if bad else ''))
print(f"[repair] round audit: {len(rows)} checked, {len(bad)} still failing")
PY
  if [ ! -s "$REMAIN" ]; then
    say "REPAIR COMPLETE zero-mismatch at round $ROUND"
    break
  fi
  if [ "$ROUND" -ge "$MAX_ROUNDS" ]; then
    say "REPAIR ENDED round-cap; $(wc -l < "$REMAIN") clips remain for native-sus review"
    break
  fi
  if [ "$(date +%s)" -ge "$DEADLINE" ]; then
    say "REPAIR ENDED deadline; $(wc -l < "$REMAIN") clips remain"
    break
  fi
  mv "$REMAIN" "$PENDING"
done
say "REPAIR LOOP EXITED round=$ROUND"
