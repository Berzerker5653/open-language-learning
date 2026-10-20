#!/usr/bin/env bash
# TTS-003 listening pass — plays the ten SESSION-PACKET.md §3 clips in packet
# order with a 1 s gap. Uses paplay if present, else ffplay.
# Verified present on this machine 2026-10-20: /usr/bin/paplay (used), /usr/bin/ffplay.
set -u

REPO="/home/hunter/game-dev/LTS"
JA="$REPO/languages/ja-JP/media"
RU="$REPO/languages/ru-RU/media"

CLIPS=(
  "$JA/ja.sent.drink-coffee.wav"
  "$JA/ja.contrast.vowel-length.obasan-0.wav"
  "$JA/ja.contrast.vowel-length.obasan-1.wav"
  "$JA/ja.contrast.palatalization.hyaku-0.wav"
  "$JA/ja.lex.numbers.go.wav"
  "$JA/ja.sent.scenario-reasoning.wav"
  "$RU/ru.contrast.palatalization.brat-0.wav"
  "$RU/ru.contrast.palatalization.brat-1.wav"
  "$RU/ru.lex.numbers-time.chetyre.wav"
  "$RU/ru.lex.shopping.perchatki.wav"
)

if command -v paplay >/dev/null 2>&1; then
  PLAY=(paplay)
elif command -v ffplay >/dev/null 2>&1; then
  PLAY=(ffplay -nodisp -autoexit -loglevel error)
else
  echo "neither paplay nor ffplay found" >&2
  exit 1
fi

i=1
for f in "${CLIPS[@]}"; do
  if [ ! -f "$f" ]; then
    echo "MISSING: $f" >&2
    continue
  fi
  echo "[$i/10] $(basename "$f")"
  "${PLAY[@]}" "$f"
  sleep 1
  i=$((i + 1))
done
echo "done — 10 clips, 1 s gap"
