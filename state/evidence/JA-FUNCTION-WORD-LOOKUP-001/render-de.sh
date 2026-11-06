#!/usr/bin/env bash
cd /home/hunter/game-dev/LTS
for try in 1 2 3; do
  env -u PYTHONPATH OMP_NUM_THREADS=1 MKL_NUM_THREADS=1 OMP_WAIT_POLICY=passive \
    python3 scripts/generate-pack-audio.py --pack languages/ja-JP --language japanese \
    --speaker ono_anna --jobs 1 --force --worker-python ~/.venvs/qwen-tts/bin/python \
    --only ja.lex.functionword.de \
    >> state/evidence/JA-FUNCTION-WORD-LOOKUP-001/render-de.log 2>&1
  ec=$?
  echo "DE_TRY=$try EXIT=$ec" >> state/evidence/JA-FUNCTION-WORD-LOOKUP-001/render-de.log
  [ $ec -eq 0 ] && break
done
