#!/bin/bash
# Convergence loop for ASR-QA-gated bake repair: re-synthesize (force) every
# asset that failed the round-trip check, re-check, repeat until clean or the
# round budget runs out. Used by K-91 (ru-RU) and the ja-JP re-bake repair.
# A generate step that dies mid-run is fatal: the loop aborts unless the
# round's generator printed its summary line (an 8-round ru loop once
# "converged" zero because a malformed command failed every round silently).
# Expects (relative to the repo root it runs from): scripts/qa-asr.py (or
# scripts/qa_asr.py), scripts/generate-pack-audio.py, and the ASR model at
# $ASR_MODEL. Whisper binary: $WHISPER (defaults to ~/.cache/lts-bench on
# GamingPC, ~/whisper.cpp/build/bin on Omarchy).
set -u
PACK=$1; LANG=$2; IDS=$3; MAXR=${4:-8}
VENV=${VENV:-$HOME/.venvs/qwen-tts/bin/python}
ASR_MODEL=${ASR_MODEL:-$HOME/models/ggml-large-v3-turbo.bin}
WHISPER=${WHISPER:-}
QA=scripts/qa-asr.py; [ -f "$QA" ] || QA=scripts/qa_asr.py
ROUND=0
WORKDIR=$(mktemp -d)
while [ -s "$IDS" ] && [ "$ROUND" -lt "$MAXR" ]; do
  ROUND=$((ROUND+1))
  echo "== round $ROUND: $(wc -l < "$IDS") assets"
  ARGS=$(sed 's/^/--only /' "$IDS" | tr '\n' ' ')
  $VENV scripts/generate-pack-audio.py --pack "$PACK" --language "$LANG" \
    --force --jobs 4 $ARGS --note "bake repair round $ROUND after ASR round-trip QA" > "repair-r$ROUND.log" 2>&1
  # Non-zero exit is normal when some assets trip the duration guard; what
  # must NEVER happen is a missing summary line (= the run died early).
  grep -q ^pack= "repair-r$ROUND.log" \
    || { echo "LOOP-ABORT: generator died round $ROUND (see repair-r$ROUND.log)"; exit 2; }
  WFLAG=""; [ -n "$WHISPER" ] && WFLAG="--whisper $WHISPER"
  WCODE=${WHISPER_LANG:-$LANG}
  $VENV "$QA" --pack "$PACK" --model "$ASR_MODEL" --lang "$WCODE" \
    --workers 6 --ids "$IDS" --out "qa-r$ROUND.jsonl" $WFLAG > "qa-r$ROUND.log" 2>&1
  grep ^FAIL "qa-r$ROUND.log" | sed -E 's/^FAIL ([^ ]+).*/\1/' | sort > "$WORKDIR/next"
  cp "$WORKDIR/next" "$IDS"
  echo "round $ROUND result: $(grep ^checked= qa-r$ROUND.log)"
done
echo "LOOP-END rounds=$ROUND remaining=$(wc -l < "$IDS")"
[ ! -s "$IDS" ]
