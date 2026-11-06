#!/usr/bin/bash
# GPU-path re-audit for PACK-AUDIO-VERIFICATION-001, gated by an in-harness
# CPU<->GPU identity check first. Repo rule: false PASS never acceptable;
# any fail->ok flip on the sample rejects the GPU path outright.
# usage: gpu-relaunch.sh sample   (identity gate, ~5 min)
#        gpu-relaunch.sh full     (remaining rows; requires ACCEPT verdict)
set -u
EV=/home/hunter/game-dev/LTS/state/evidence/PACK-AUDIO-VERIFICATION-001
REPO=/home/hunter/game-dev/LTS
PY=$HOME/.venvs/qwen-tts/bin/python; [ -x "$PY" ] || PY=python3
TURBO=$HOME/.cache/lts-bench/ggml-large-v3-turbo.bin
DATE=2026-10-28
OUT=$EV/full-audit-$DATE
SAMPLE=$EV/gpu-identity-sample-ids.txt
PHASE=${1:?sample|full}
VERDICT_FILE=$EV/GPU-IDENTITY-VERDICT.txt

restore_strata() {
  systemctl --user start omp-strata.service
  for i in $(seq 1 40); do
    code=$(curl -s -o /dev/null -w '%{http_code}' -m 5 http://127.0.0.1:11438/v1/models -H "Authorization: Bearer $(cat ~/.config/llm-lab/keys/main)")
    [ "$code" = "200" ] && break; sleep 5
  done
  echo "STRATA_RESTORED=$code"
}

if [ "$PHASE" = "sample" ]; then
  "$PY" - "$OUT/asr-ru-RU.jsonl" "$SAMPLE" <<'PYEOF'
import json, random, sys
rows=[json.loads(l) for l in open(sys.argv[1]) if l.strip()]
ok_hi=[r for r in rows if r['status']=='ok' and r.get('ratio',0)>=0.85]
ok_lo=[r for r in rows if r['status']=='ok' and 0.5<=r.get('ratio',0)<0.85]
fail=[r for r in rows if r['status']!='ok']
random.seed(20261104)
s=[r['id'] for r in random.sample(ok_hi,100)]+[r['id'] for r in random.sample(ok_lo,min(60,len(ok_lo)))]+[r['id'] for r in random.sample(fail,min(80,len(fail)))]
open(sys.argv[2],'w').write('\n'.join(s)+'\n'); print('sample',len(s))
PYEOF
  systemctl --user stop omp-strata.service; sleep 5
  nvidia-smi --query-gpu=memory.used --format=csv,noheader
  mkdir -p "$EV/full-audit-$DATE-gpusample"
  timeout 1500 "$PY" "$REPO/scripts/qa-asr.py" --pack "$REPO/languages/ru-RU" --model "$TURBO" \
    --whisper "$EV/whisper-gate-gpu.sh" --lang russian --workers 8 --ids "$SAMPLE" \
    --out "$EV/full-audit-$DATE-gpusample/asr-ru-RU.jsonl" > "$EV/full-audit-$DATE-gpusample/sample.log" 2>&1
  "$PY" - "$OUT/asr-ru-RU.jsonl" "$EV/full-audit-$DATE-gpusample/asr-ru-RU.jsonl" "$VERDICT_FILE" <<'PYEOF'
import json, sys
cpu={};gpu={}
for l in open(sys.argv[1]):
    if l.strip(): r=json.loads(l); cpu[r['id']]=r
for l in open(sys.argv[2]):
    if l.strip(): r=json.loads(l); gpu[r['id']]=r
loose=[];strict=0
for i,g in gpu.items():
    c=cpu.get(i)
    if not c: continue
    if c['status']!='ok' and g['status']=='ok': loose.append(i)
    if c['status']=='ok' and g['status']!='ok': strict+=1
v='ACCEPT' if not loose and len(gpu)>=150 else 'REJECT'
print(f"compared={len(gpu)} stricter_on_gpu={strict} FALSE_PASS_FLIPS={len(loose)} verdict={v}")
if loose: print('flip ids:', loose[:10])
open(sys.argv[3],'w').write(v+'\n')
PYEOF
  restore_strata
  echo "SAMPLE_PHASE_DONE verdict=$(cat $VERDICT_FILE)"
elif [ "$PHASE" = "full" ]; then
  grep -q ACCEPT "$VERDICT_FILE" || { echo "NOT_ACCEPTED"; exit 1; }
  "$PY" - "$REPO/languages/ru-RU" "$OUT/asr-ru-RU.jsonl" "$EV/gpu-remaining-ids.txt" <<'PYEOF'
import json, sys
from pathlib import Path
pack=Path(sys.argv[1]); done=set()
for l in open(sys.argv[2]):
    if l.strip(): done.add(json.loads(l)['id'])
ids=[p.stem for p in (pack/'media').glob('*.wav') if p.stem not in done]
open(sys.argv[3],'w').write('\n'.join(ids)+'\n'); print('remaining',len(ids))
PYEOF
  systemctl --user stop omp-strata.service; sleep 5
  timeout 9000 "$PY" "$REPO/scripts/qa-asr.py" --pack "$REPO/languages/ru-RU" --model "$TURBO" \
    --whisper "$EV/whisper-gate-gpu.sh" --lang russian --workers 8 --ids "$EV/gpu-remaining-ids.txt" \
    --out "$OUT/asr-ru-RU.jsonl" >> "$OUT/reaudit-gpu.log" 2>&1
  echo "GPU_REAUDIT_DONE rows=$(grep -c '' $OUT/asr-ru-RU.jsonl)"
  restore_strata
  echo "FULL_PHASE_DONE"
fi
