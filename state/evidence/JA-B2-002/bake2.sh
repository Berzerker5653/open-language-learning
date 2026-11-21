#!/bin/bash
# JA-B2-002 fix lane take-2: pacing rejects (0.477 and 0.143 s/mora vs corpus 0.206/0.151-0.304).
export PATH="$HOME/.cargo/bin:$HOME/.local/bin:/usr/local/bin:/usr/sbin:/usr/bin:/bin"
export OMP=1
cd /home/hunter/game-dev/LTS
exec >> state/evidence/JA-B2-002/bake.log 2>&1
echo "BAKE2-START $(date -Is)"
python3 scripts/generate-pack-audio.py --pack languages/ja-JP --force --language japanese \
  --speaker ono_anna --jobs 1 \
  --only ja.sent.b2reg-soncho-okaeshi \
  --only ja.sent.b2reg-wake-da-saiban
echo "BAKE2-DONE exit=$? $(date -Is)"
