#!/usr/bin/env bash
# WORD-TIMING-002 chain2: after the in-flight retry settles the old abstains,
# run the full v3 primary pass over unsettled rows, then a fresh retry over
# any new abstains. Sequential so only one whisper model is resident at a time.
cd /home/hunter/game-dev/LTS
VENV=/home/hunter/.venvs/wordtiming-ja/bin/python
GEN=scripts/generate-word-timings.py
ARGS="--pack languages/ja-JP --lang ja --out languages/ja-JP/media/words.jsonl --evidence-dir state/evidence/WORD-TIMING-002"
while systemctl --user is-active --quiet lts-ja-timings-retry; do sleep 60; done
journalctl --user -u lts-ja-timings-retry --no-pager -n 4 -o cat | grep -E "self-check|settled" | tail -2
systemd-run --user --unit=lts-ja-primary2 --property=WorkingDirectory=/home/hunter/game-dev/LTS \
  env -u PYTHONPATH "$VENV" "$GEN" $ARGS \
  --exclude-ids state/evidence/WORD-TIMING-001/ja-pilot.jsonl \
  --exclude-ids state/evidence/WORD-TIMING-002/ja-pilot.jsonl \
  --exclude-ids state/evidence/WORD-TIMING-002/ja-pilot2.jsonl
while systemctl --user is-active --quiet lts-ja-primary2; do sleep 300; done
journalctl --user -u lts-ja-primary2 --no-pager -n 4 -o cat | grep -E "self-check|settled" | tail -2
systemd-run --user --unit=lts-ja-retry2 --property=WorkingDirectory=/home/hunter/game-dev/LTS \
  env -u PYTHONPATH "$VENV" "$GEN" $ARGS --pass retry
while systemctl --user is-active --quiet lts-ja-retry2; do sleep 300; done
echo JA_ALL_DONE2
wc -l languages/ja-JP/media/words.jsonl state/evidence/WORD-TIMING-002/abstains-ja.jsonl
