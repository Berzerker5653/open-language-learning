#!/bin/bash
# JA-B2-002 fix lane: re-bake 3 corrected B2 register sentences, pack-standard narrator.
export PATH="$HOME/.cargo/bin:$HOME/.local/bin:/usr/local/bin:/usr/sbin:/usr/bin:/bin"
export OMP=1
cd /home/hunter/game-dev/LTS
exec >> state/evidence/JA-B2-002/bake.log 2>&1
echo "BAKE-START $(date -Is)"
python3 scripts/generate-pack-audio.py --pack languages/ja-JP --force --language japanese \
  --speaker ono_anna --jobs 1 \
  --only ja.sent.b2reg-soncho-okaeshi \
  --only ja.sent.b2reg-wake-da-saiban \
  --only ja.sent.b2reg-ashita-itsudemo-gozaimasu
echo "BAKE-DONE exit=$? $(date -Is)"
