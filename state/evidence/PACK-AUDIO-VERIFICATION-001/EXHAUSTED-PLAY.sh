#!/usr/bin/env bash
# Owner listening rundown for the best-of-K EXHAUSTED clips
# (PACK-AUDIO-VERIFICATION-001). Small batches on purpose: the residue is
# 382 clips, and disposition decisions are made by listening, not by skimming.
#
#   bash EXHAUSTED-PLAY.sh --list                 batch rosters, no audio
#   bash EXHAUSTED-PLAY.sh ru 1                   ru-RU batch 1 (default 25 clips)
#   bash EXHAUSTED-PLAY.sh ja 3 10                ja-JP batch 3, 10 per batch
#   bash EXHAUSTED-PLAY.sh ja 3 --dry             print the roster without playing
#
# Ctrl-C between clips to stop; rerun the same batch number to resume it.
# Ids + declared text + cause tags come from exhausted-<date>.jsonl, written by
# rundown-exhausted.py; regenerate that file after each bake round.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="/home/hunter/game-dev/LTS"
DATE="${DATE:-2026-10-27}"
ROWS="$HERE/exhausted-$DATE.jsonl"
PY=python3

[ -f "$ROWS" ] || { echo "missing $ROWS - run: python3 $HERE/rundown-exhausted.py --date $DATE" >&2; exit 2; }
command -v "$PY" >/dev/null || { echo "python3 not found" >&2; exit 2; }

if command -v paplay >/dev/null; then PLAY=(paplay)
elif command -v ffplay >/dev/null; then PLAY=(ffplay -nodisp -autoexit -loglevel error)
else PLAY=(); fi

mode=${1:-}
[ -n "$mode" ] || { echo "usage: $0 --list | <ja|ru> <batch> [size] [--dry]" >&2; exit 1; }

if [ "$mode" = "--list" ]; then
  "$PY" - "$ROWS" <<'PYEOF'
import collections, json, sys
counts = collections.Counter(json.loads(l)["pack"] for l in open(sys.argv[1]) if l.strip())
for pack, n in sorted(counts.items()):
    print(f"{pack}: {n} clips -> batches of 25: {(n + 24) // 25}")
PYEOF
  exit 0
fi

pack_arg=$mode
batch=${2:-1}
size=25
dry=""
for a in "${@:3}"; do
  case "$a" in
    --dry) dry=1 ;;
    ''|*[!0-9]*) echo "ignoring unparseable argument: $a" >&2 ;;
    *) size=$a ;;
  esac
done
case "$pack_arg" in
  ja) pack=ja-JP ;;
  ru) pack=ru-RU ;;
  *) echo "pack must be ja or ru" >&2; exit 1 ;;
esac

mapfile -t lines < <("$PY" - "$ROWS" "$pack" "$batch" "$size" <<'PYEOF'
import json, sys
rows, pack, batch, size = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
sel = [json.loads(l) for l in open(rows) if l.strip() and json.loads(l)["pack"] == pack]
start, end = (batch - 1) * size, batch * size
total = (len(sel) + size - 1) // size
print(f"# {pack}: {len(sel)} exhausted clips, {total} batches of {size}; showing batch {batch}")
for r in sel[start:end]:
    print("\t".join([r["id"], r["text"], r["cause"], str(r["attempts"])]))
PYEOF
)

header=${lines[0]}; echo "${header#/ }"
n=0; total=$(( ${#lines[@]} - 1 )); played=0; missing=0
for entry in "${lines[@]:1}"; do
  n=$((n + 1))
  IFS=$'\t' read -r id text cause attempts <<<"$entry"
  wav="$REPO/languages/$pack/media/$id.wav"
  echo "[$n/$total] $id  —  $text   ($cause, ${attempts} takes failed)"
  if [ -n "$dry" ]; then continue; fi
  if [ ! -f "$wav" ]; then echo "    MISSING: $wav"; missing=$((missing + 1)); continue; fi
  if [ ${#PLAY[@]} -eq 0 ]; then echo "    (no paplay/ffplay on this box - use --dry or install one)"; break; fi
  "${PLAY[@]}" "$wav"; played=$((played + 1)); sleep 1
done
echo "batch $pack/$batch: $total clips listed, $played played, $missing missing"
