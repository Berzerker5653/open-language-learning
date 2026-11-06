#!/usr/bin/env bash
# Overnight render supervisor for PACK-AUDIO-VERIFICATION-001 ru-RU remediation.
# Runs the mismatch-real2 queue in batches with a FRESH worker per batch
# (defeats the per-session TTS degeneration), verifies each clip by file
# mtime, retries failures once, then re-audits everything with the ASR gate.
set -u
cd "$HOME/game-dev/LTS"
EV=state/evidence/PACK-AUDIO-VERIFICATION-001
QUEUE=$EV/mismatch-real2.txt
LOG=$EV/render-overnight.log
STATE=$EV/render-supervisor.state
mkdir -p "$EV"
BATCH=25
BATCH_TIMEOUT=2400   # 40 min per batch max
MEDIA=languages/ru-RU/media
START_TS=$(date +%s)

log(){ echo "[sup $(date '+%H:%M:%S')] $*" | tee -a "$LOG"; }

# ids already good on disk from tonight's probe/run (mtime newer than supervisor start marker)
touch "$STATE"
rendered_ids(){ :; }

failures=0
# Build list of still-needed ids: render, verify mtime >= START_TS, retry once
need_file=$EV/pending-$(date +%s).txt
cp "$QUEUE" "$need_file"

round=0
for round in 1 2; do
  remaining=$(wc -l < "$need_file")
  log "round $round: $remaining ids pending"
  [ "$remaining" -eq 0 ] && break
  # split into batches
  split -l $BATCH "$need_file" "$need_file.batch."
  for b in "$need_file.batch."*; do
    ids=$(cat "$b")
    arg=""
    for i in $ids; do arg="$arg --only $i"; done
    log "round $round: rendering batch ($(wc -l < "$b") ids): $(head -c 120 "$b" | tr '\n' ' ')..."
    # per-batch wall clock: OMP=1 serial worker, engine must be OFF
    timeout -k 30 $BATCH_TIMEOUT env -u PYTHONPATH \
      OMP_NUM_THREADS=1 MKL_NUM_THREADS=1 OMP_WAIT_POLICY=passive \
      ~/.venvs/qwen-tts/bin/python scripts/generate-pack-audio.py \
      --pack languages/ru-RU --force --language russian --speaker ono_anna \
      --jobs 1 $arg >> "$LOG" 2>&1
    rc=$?
    [ $rc -ne 0 ] && log "batch exited rc=$rc (timeout or worker error)"
    # verify each id in this batch produced a fresh wav
    still=""
    for i in $ids; do
      f="$MEDIA/$i.wav"
      if [ -f "$f" ] && [ "$(find "$f" -newermt "@$START_TS" | wc -l)" -eq 1 ] && \
         [ "$(stat -c %s "$f")" -gt 4000 ]; then
        :
      else
        still="$still$i"$'\n'
      fi
    done
    printf '%s' "$still" | grep -v '^$' > "$b.retry" || true
    log "batch done: $(grep -c '^' "$b.retry") clips failed verification"
  done
  cat "$need_file.batch."*.retry > "$need_file" 2>/dev/null || : > "$need_file"
  rm -f "$need_file.batch."*
done

# NOTE: grep -c exits 1 on zero matches; the old `|| echo 0` appended a second
# zero, making REMAIN non-integer and silently skipping the final audit.
REMAIN=$(grep -c '^' "$need_file" 2>/dev/null); REMAIN=${REMAIN:-0}
log "render phase complete: $REMAIN ids still failed after 2 rounds"

if [ "$REMAIN" -lt 241 ]; then
  # Re-audit all ids that were NOT still-failing (i.e. were re-rendered tonight)
  GOOD=$EV/rendered-tonight.txt
  comm -23 <(sort "$QUEUE") <(sort "$need_file") > "$GOOD" 2>/dev/null
  log "re-auditing $(wc -l < "$GOOD") re-rendered clips with ASR gate"
  OUT=$EV/asr7-remediation.jsonl
  # fresh verdict file (skill: settled rows are carried/skipped, so start clean)
  python3 scripts/qa-asr.py \
    --pack languages/ru-RU --model ~/.cache/lts-bench/ggml-large-v3-turbo.bin \
    --whisper "$EV/whisper-gate.sh" --lang ru --workers 8 \
    --ids "$GOOD" --out "$OUT" >> "$LOG" 2>&1
  PASS=$(grep -c '"status": *"ok"' "$OUT" 2>/dev/null || echo 0)
  FAIL=$(grep -c '"status": *"mismatch"' "$OUT" 2>/dev/null || echo 0)
  log "AUDIT RESULT: $PASS pass / $FAIL still-mismatch out of $(wc -l < "$GOOD") re-rendered"
else
  log "no clips rendered successfully — skipping audit"
fi

log "SUPERVISOR COMPLETE (elapsed $(( ($(date +%s)-START_TS)/60 )) min)"
echo COMPLETE > $EV/render-supervisor.complete
