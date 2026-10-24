#!/bin/sh
# PACK-AUDIO-VERIFICATION-001 campaign chain on Omarchy.
#
# One entry point that continues the campaign from wherever it stands:
# ru best-of-K (417 ids, K=8) -> exhausted-id list -> ja best-of-K
# (1,066 ids, K=6). Idempotent and resumable: progress lives in the
# checkpoint jsonls (one line per settled asset), and every bake is
# started with --skip-done, so ids that already have a pass@ record keep
# their media + manifest row and are not re-baked.
#
# Started by the `lts-campaign` systemd user unit (boots with the box,
# Linger=yes is set). Manual: sh ~/LTS/campaign-chain.sh
# Stop: systemctl --user disable --now lts-campaign.service
#
# bake-bestof.py exits 1 whenever any id ends exhausted, which is the
# expected outcome, not a crash - so progress (settled distinct ids) is
# what drives the retry loop, never the exit code.
set -u
cd "$HOME/LTS" || exit 1
export PATH="$HOME/.local/bin:$PATH"   # espeak-ng for the gate's G2P fold

PY="$HOME/.venvs/qwen-tts/bin/python"
BAKE="$HOME/LTS/scripts/bake-bestof.py"
TURBO="$HOME/models/ggml-large-v3-turbo.bin"
WHISPER="$HOME/whisper.cpp/build/bin/whisper-cli"
LOG="$HOME/LTS/campaign-chain.log"

say() { echo "[$(date -Is)] $*" >> "$LOG"; }

# distinct settled ids in a checkpoint file (0 if absent); exhausted ids
# are counted too, so a completed phase never re-runs
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

# $1=pack dir  $2=id list  $3=K  $4=tts language  $5=whisper lang  $6=out  $7=phase label
phase() {
  total=$(grep -c . "$2")
  out=$6
  while :; do
    before=$(settled "$out")
    if [ "$before" -ge "$total" ]; then
      say "$7: complete ($before/$total settled)"
      return 0
    fi
    say "$7: $before/$total settled, starting bake (K=$3, jobs=4)"
    "$PY" "$BAKE" --pack "$1" --ids "$2" --k "$3" --language "$4" --lang "$5" \
        --asr-model "$TURBO" --whisper "$WHISPER" --jobs 4 \
        --out "$out" --skip-done >> "${out%.jsonl}.log" 2>&1
    after=$(settled "$out")
    if [ "$after" -le "$before" ]; then
      say "$7: STALLED at $after/$total (no progress this attempt) - giving up the phase"
      return 1
    fi
    say "$7: progress $before -> $after of $total"
  done
}

exec 9>"$HOME/LTS/campaign.lock"
if ! flock -n 9; then
  say "another campaign-chain instance holds the lock; exiting"
  exit 0
fi

say "campaign-chain start"

phase languages/ru-RU bestof-ids-ru2.txt 8 russian ru bestof-ru.jsonl "ru"

# exhausted ru ids -> owner disposition (RU-RUNDOWN section D input)
"$PY" - bestof-ru.jsonl > bestof-ru-exhausted.txt <<'PYEOF'
import json, sys
for line in open(sys.argv[1]):
    if line.strip():
        r = json.loads(line)
        if r["result"] == "exhausted":
            print(r["id"])
PYEOF
say "ru exhausted ids: $(wc -l < bestof-ru-exhausted.txt) -> bestof-ru-exhausted.txt"

phase languages/ja-JP bestof-ids-ja2.txt 6 japanese ja bestof-ja.jsonl "ja"

say "campaign-chain done: ru $(settled bestof-ru.jsonl)/417, ja $(settled bestof-ja.jsonl)/$(grep -c . bestof-ids-ja2.txt)"
