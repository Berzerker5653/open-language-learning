# R16 soft-sign rebake (fix for R15 native feedback)

Recipe per owner ruling: slow preserves final ь. Qwen3 ono_anna, k=3 bare + k=2 phrase
context + atempo-0.85 slow copy; whisper `contains` gate (correct flags: -m ggml-small.bin
-np -nt, stdout — NOT -otxt/-of which silently no-op'd in first pass).

Gate results: all 9 words have passing takes. Bare passes now on пыль, есть, цепь, день,
боль, тень (previously all fail class); щель/лесть/весь pass only in phrase context.
Slow copies regressed on лесть/тень (atempo smears ь -> 'Теянь') — phrase/bare preferred.

Native audition page: 127.0.0.1:8793, 26 clips (word / фраза / медленно per word),
verdicts -> verdicts-r16.jsonl. omarchy artifacts: ~/lts-qa/r16/ (r16-gate.json,
r16-finalists.json, 52 wavs).
