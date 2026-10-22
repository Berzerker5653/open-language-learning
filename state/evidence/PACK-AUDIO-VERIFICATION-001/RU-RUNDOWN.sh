#!/usr/bin/env bash
# Russian listening rundown (PACK-AUDIO-VERIFICATION-001) - same style as
# OWNER-SESSION-2026-10-20/TTS-PLAY.sh but sectioned and manifest-aware.
#
#   bash RU-RUNDOWN.sh A        repaired/must-re-listen clips (start here)
#   bash RU-RUNDOWN.sh B [N]    audit-flagged clips, worst gap first (default: all)
#   bash RU-RUNDOWN.sh C        stratified random sample of PASSED clips (26)
#   bash RU-RUNDOWN.sh --list   print section sizes, no audio
#
# Ctrl-C between clips to stop. B needs at least one audit JSONL
# (scripts/qa-audit.sh); A and C work standalone.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="/home/hunter/game-dev/LTS"
RU="$REPO/languages/ru-RU/media"
FLAGFILES="$HERE/segments-ru-RU.jsonl $HERE/asr-ru-RU.jsonl"
SAMPLE="$HERE/ru-sample-26.txt"
PY="$REPO/.venv/bin/python"

if command -v paplay >/dev/null 2>&1; then PLAY=(paplay)
elif command -v ffplay >/dev/null 2>&1; then PLAY=(ffplay -nodisp -autoexit -loglevel error)
else echo "neither paplay nor ffplay found" >&2; exit 1; fi

section_A=(
  ru.contrast.palatalization.brat-1   # re-baked 2026-10-21 (owner: "two aa")
  ru.lex.shopping.perchatki           # re-baked 2026-10-21 ("extra sound"); LONG, 2.64 s - judge it
  ru.contrast.palatalization.brat-0   # control pair
  ru.lex.numbers-time.chetyre         # control pair
)

mode=${1:-A}
count=${2:-0}
ids=()
case "$mode" in
  A)
    ids=("${section_A[@]}")
    ;;
  B)
    have=0
    for f in $FLAGFILES; do [ -f "$f" ] && have=1; done
    [ "$have" = 1 ] || { echo "no audit JSONLs yet - run scripts/qa-audit.sh first" >&2; exit 2; }
    mapfile -t ids < <(cat $FLAGFILES 2>/dev/null | "$PY" "$HERE/rundown-flags.py" \
      | head -n "$([ "$count" -gt 0 ] && echo "$count" || echo 9999)")
    ;;
  C)
    mapfile -t ids < "$SAMPLE"
    ;;
  --list)
    echo "A=${#section_A[@]} B=$(cat $FLAGFILES 2>/dev/null | grep -cE '"verdict": "FLAG"|"status": "MISMATCH"' | cat) C=$(wc -l < "$SAMPLE")"
    exit 0
    ;;
  *)
    echo "usage: $0 A|B [N]|C|--list" >&2
    exit 1
    ;;
esac

total=${#ids[@]}
n=0
for id in "${ids[@]}"; do
  n=$((n + 1))
  f="$RU/$id.wav"
  if [ ! -f "$f" ]; then
    echo "MISSING: $f"
    continue
  fi
  text=$(grep -m1 "\"id\": \"$id\"" "$RU/manifest.jsonl" | "$PY" -c 'import json,sys;print(json.loads(sys.stdin.read())["text"])' 2>/dev/null || echo "?")
  why=$(cat $FLAGFILES 2>/dev/null | grep -E '"verdict": "FLAG"|"status": "MISMATCH"|"status": "wav-missing"' | grep -m1 "\"id\": \"$id\"" || true)
  flag=""
  [ -n "$why" ] && flag=" (FLAGGED: $(printf '%s' "$why" | grep -o '"flags": {[^}]*}' | head -c 90))"
  echo "[$n/$total] $id  —  $text$flag"
  "${PLAY[@]}" "$f"
  sleep 1
done
echo "done — $n clips (section $mode)"
