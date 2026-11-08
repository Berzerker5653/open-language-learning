#!/usr/bin/env bash
# WORD-TIMING-001 chained runner: wait for the primary pass, then run the
# memory-safe retry pass (large-v3 over abstained clips only). Logs both.
set -u
cd /home/hunter/game-dev/LTS
GEN_PID="${1:?usage: word-timing-chain.sh <primary-pass-pid>}"
while kill -0 "$GEN_PID" 2>/dev/null; do sleep 120; done
echo "primary pass done $(date -Iseconds)" >> state/evidence/WORD-TIMING-001/chain.log
env -u PYTHONPATH python3 scripts/generate-word-timings.py --pack languages/ru-RU --pass retry >> state/evidence/WORD-TIMING-001/generate-ru-retry.log 2>&1
echo "retry pass done exit=$? $(date -Iseconds)" >> state/evidence/WORD-TIMING-001/chain.log
