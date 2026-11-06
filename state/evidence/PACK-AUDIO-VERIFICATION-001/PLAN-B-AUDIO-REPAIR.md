# Plan B — different-engine audio repair (validated 2026-11-05)

Trigger (tripwire): if the Qwen repair loop's next audit (round 2, ~13:00)
still leaves >30 failures, OR any round's pass gain is <5 clips, switch
immediately — do not start another round.

## The ladder (each rung replaces circling with per-clip certified outcomes)

**A++ (repo-native): bake-bestof.py** — for each failing clip bake up to K
takes with the Qwen worker, grade every take with the production gate,
keep first pass, certify stubborn at K fails. Replaces round loops.
Command:
  .venv python scripts/bake-bestof.py --pack languages/ru-RU --ids <mismatch-rN.txt> --k 8 --language russian --speaker ono_anna --asr-model ~/.cache/lts-bench/ggml-large-v3-turbo.bin --whisper <EV>/whisper-gate.sh --worker-python ~/.venvs/qwen-tts/bin/python --out bestof-ru.jsonl

**B (tested today): Piper multi-voice best-of** — scripts/piper-bestof.py.
Entirely different engine (espeak-ng + ONNX vits), <1s/clip CPU, obeys
lexical stress marks. Validated on the worst Qwen clips:
- метро (Qwen rendered LAUGHTER) -> ruslan grades 1.00
- район ("Драй гой") -> ruslan 1.00 in one manual run (0.4 on a jittered rerun)
- бу́ква ("Бу-йокуа") -> irina grades 1.00
Voices: ruslan, irina, dmitri, denis (two rounds each — piper onnx jitters,
whisper hallucinates on 1s clips; same-voice reroll is a real retry).
Cost: ~100 clips worst case ~1-2 CPU-hours. Candidates land in
piper-candidates/<id>.wav; bake-style manifest integration happens at
apply time.

**C (voice-consistency variant): XTTS-v2 clone of the pack speaker** —
only if mixed voices are unacceptable; heavy install, ~1.8GB model.

## Known noise sources (do not chase these as TTS bugs)
- whisper.cpp transcribes ~1s clips noisily; same audio can grade 1.00 vs
  0.4 across runs (observed rayon/ruslan). Second audit pass on failures
  before escalating.
- piper ONNX output jitters across processes (same voice/text, different
  wav bytes).

## Open decision for owner
B/C use a different-sounding voice for the handful of stubborn words
(e.g. ruslan male vs pack voice). Alternative is same-voice only (A++ then C).
