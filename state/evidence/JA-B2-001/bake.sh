#!/bin/bash
# JA-B2-001 bake lane: 12 new B2 register sentences, pack-standard narrator.
export PATH="$HOME/.cargo/bin:$HOME/.local/bin:/usr/local/bin:/usr/sbin:/usr/bin:/bin"
export OMP=1
cd /home/hunter/game-dev/LTS
exec >> state/evidence/JA-B2-001/bake.log 2>&1
echo "BAKE-START $(date -Is)"
python3 scripts/generate-pack-audio.py --pack languages/ja-JP --force --language japanese \
  --speaker ono_anna --jobs 1 \
  --only ja.sent.b2reg-houhou-ni-yotte \
  --only ja.sent.b2reg-jouhou-dake-dewa \
  --only ja.sent.b2reg-shinjitsu-toiu-mono \
  --only ja.sent.b2reg-soncho-okaeshi \
  --only ja.sent.b2reg-ashita-itsudemo-gozaimasu \
  --only ja.sent.b2reg-anou-mouichido-onegai \
  --only ja.sent.b2reg-suiyoubi-ikaga \
  --only ja.sent.b2reg-soncho-irassharimasu \
  --only ja.sent.b2reg-mono-da-shijou \
  --only ja.sent.b2reg-mono-ka-seigi \
  --only ja.sent.b2reg-wake-da-saiban \
  --only ja.sent.b2reg-ba-nyuujou
echo "BAKE-DONE exit=$? $(date -Is)"
