#!/usr/bin/env bash
cd /home/hunter/game-dev/LTS
env -u PYTHONPATH OMP_NUM_THREADS=1 MKL_NUM_THREADS=1 OMP_WAIT_POLICY=passive \
  python3 scripts/generate-pack-audio.py --pack languages/ja-JP --language japanese \
  --speaker ono_anna --jobs 1 --worker-python ~/.venvs/qwen-tts/bin/python \
  --only ja.lex.functionword.ha-topic --only ja.lex.functionword.ni --only ja.lex.functionword.no \
  --only ja.lex.functionword.wo --only ja.lex.functionword.he --only ja.lex.functionword.ga \
  --only ja.lex.functionword.ka --only ja.lex.functionword.mo --only ja.lex.functionword.de \
  >> state/evidence/JA-FUNCTION-WORD-LOOKUP-001/render.log 2>&1
echo "RENDER_EXIT=$?" >> state/evidence/JA-FUNCTION-WORD-LOOKUP-001/render.log
