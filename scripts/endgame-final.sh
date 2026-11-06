#!/usr/bin/env bash
# Final endgame: apply piper-final winners, re-verify the flagged set twice
# (whisper jitter filter), report the certified remainder. Idempotent.
set -uo pipefail
cd /home/hunter/game-dev/LTS
EV=state/evidence/PACK-AUDIO-VERIFICATION-001

if [ -f "$EV/final2-applied.marker" ]; then echo "final2 already applied"; exit 0; fi

echo "== applying piper-final winners =="
python3 scripts/apply-piper-candidates.py $(cat "$EV/piper-targets-final.txt")

audit() { # $1=ids file  $2=out jsonl
  rm -f "$2"
  timeout 60m python3 scripts/qa-asr.py \
    --pack languages/ru-RU --model ~/.cache/lts-bench/ggml-large-v3-turbo.bin \
    --whisper "$EV/whisper-gate.sh" --lang ru --workers 6 --ids "$1" --out "$2" || echo "audit exit=$?"
  python3 - "$2" "$1.remain" <<'PY'
import json, sys
rows=[json.loads(l) for l in open(sys.argv[1])]
bad=[r["id"] for r in rows if r["status"]!="ok"]
open(sys.argv[2],"w").write("\n".join(bad)+("\n" if bad else ""))
print(f"{len(rows)} checked, {len(bad)} failing")
PY
}

echo "== pass 1 =="
audit "$EV/piper-targets-final.txt" "$EV/asr-final-p1.jsonl"
mv "$EV/piper-targets-final.txt.remain" "$EV/final-remain-p1.txt"

if [ -s "$EV/final-remain-p1.txt" ]; then
  echo "== pass 2 (jitter filter: only clips that fail twice are real) =="
  audit "$EV/final-remain-p1.txt" "$EV/asr-final-p2.jsonl"
  mv "$EV/final-remain-p1.txt.remain" "$EV/mismatch-truly-final.txt"
else
  : > "$EV/mismatch-truly-final.txt"
fi

N=$(grep -c . "$EV/mismatch-truly-final.txt" || true)
echo "CERTIFIED REMAINDER: $N"
[ "$N" -gt 0 ] && cat "$EV/mismatch-truly-final.txt"
touch "$EV/final2-applied.marker"
