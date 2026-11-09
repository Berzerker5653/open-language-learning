#!/usr/bin/env bash
# WORD-TIMING-002 controller chain: wait for the primary ja pass to finish,
# then launch the heavy-model retry pass over ja abstains, then report.
cd /home/hunter/game-dev/LTS
while systemctl --user is-active --quiet lts-ja-timings; do sleep 300; done
journalctl --user -u lts-ja-timings --no-pager -n 4 | grep -E "self-check|settled" | tail -2
systemd-run --user --unit=lts-ja-timings-retry --property=WorkingDirectory=/home/hunter/game-dev/LTS \
  env -u PYTHONPATH /home/hunter/.venvs/wordtiming-ja/bin/python \
  scripts/generate-word-timings.py --pack languages/ja-JP --lang ja --pass retry \
  --out languages/ja-JP/media/words.jsonl --evidence-dir state/evidence/WORD-TIMING-002
while systemctl --user is-active --quiet lts-ja-timings-retry; do sleep 300; done
echo JA_ALL_DONE
wc -l languages/ja-JP/media/words.jsonl state/evidence/WORD-TIMING-002/abstains-ja.jsonl 2>/dev/null
