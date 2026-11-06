#!/usr/bin/env bash
# Endgame: apply piper winners for r2 remainders, micro-audit them, then
# launch the full-pack re-audit with the fixed gate. Idempotent.
set -uo pipefail
cd /home/hunter/game-dev/LTS
EV=state/evidence/PACK-AUDIO-VERIFICATION-001

if [ -f "$EV/endgame-applied.marker" ]; then
  echo "endgame already applied"; exit 0
fi

# ids still failing after round 2 that have a graded piper candidate
mapfile -t APPLY < <(python3 - "$EV" <<'PY'
import json, os, sys
E = sys.argv[1]
rem = [l.strip() for l in open(f"{E}/mismatch-r2.txt") if l.strip()]
winners = set()
for rep in ("piper-bestof-r1.jsonl", "piper-bestof-r2.jsonl"):
    p = f"{E}/{rep}"
    if os.path.exists(p):
        for line in open(p):
            r = json.loads(line)
            if r.get("result"):
                winners.add(r["id"])
for i in rem:
    if i in winners and os.path.exists(f"{E}/piper-candidates/{i}.wav"):
        print(i)
PY
)
echo "applying ${#APPLY[@]} piper winners"
python3 scripts/apply-piper-candidates.py "${APPLY[@]}"

# micro-audit the r2 set against the now-updated media
rm -f "$EV/asr-micro.jsonl"
timeout 45m python3 scripts/qa-asr.py \
  --pack languages/ru-RU --model ~/.cache/lts-bench/ggml-large-v3-turbo.bin \
  --whisper "$EV/whisper-gate.sh" --lang ru --workers 6 \
  --ids "$EV/mismatch-r2.txt" --out "$EV/asr-micro.jsonl" || echo "micro audit exit=$?"
python3 - "$EV/asr-micro.jsonl" "$EV/mismatch-final.txt" <<'PY'
import json, sys
rows = [json.loads(l) for l in open(sys.argv[1])]
bad = [r["id"] for r in rows if r["status"] != "ok"]
open(sys.argv[2], "w").write("\n".join(bad) + ("\n" if bad else ""))
print(f"micro-audit: {len(rows)} checked, {len(bad)} still failing")
PY

touch "$EV/endgame-applied.marker"

# full-pack re-audit with fixed gate, unless already running
if ! systemctl --user is-active --quiet lts-final-audit.service; then
  if [ ! -s "$EV/asr9-full.jsonl" ]; then
    systemd-run --user --unit=lts-final-audit --property=MemoryMax=infinity \
      --property=TasksMax=infinity --collect 'bash' '-c' \
      "cd /home/hunter/game-dev/LTS && timeout 8h python3 scripts/qa-asr.py --pack languages/ru-RU --model ~/.cache/lts-bench/ggml-large-v3-turbo.bin --whisper /home/hunter/game-dev/LTS/$EV/whisper-gate.sh --lang ru --workers 6 --out /home/hunter/game-dev/LTS/$EV/asr9-full.jsonl"
    echo "full-pack re-audit launched (asr9-full.jsonl)"
  else
    echo "asr9-full.jsonl already has rows; not relaunching"
  fi
fi
