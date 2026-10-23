# Resume check — 2026-10-24 (audio campaign on Omarchy)

Campaign compute runs entirely on Omarchy under `nohup` (survives this
chat being shut down). GamingPC hosts only the git repo + manifests;
nothing heavy runs there.

## Check on 2026-10-24

```
ssh omarchy 'tail -3 ~/LTS/bestof-ru.log;      wc -l ~/LTS/bestof-ru.jsonl'
ssh omarchy 'tail -1 ~/LTS/asr5b-ja-JP.log;    wc -l ~/LTS/asr5b-ja-JP.jsonl 2>/dev/null'
```

- `bestof-ru.log` final line reads `bestof: N/417 solved, M exhausted
  at K=8` when done.
- `asr5b-ja-JP.jsonl` is written only at audit completion (4,902-row
  pack, this run covers the 3,275 never-audited clips).

## Then (in order)

1. Harvest `bestof-ru.jsonl` + summary into
   `state/evidence/PACK-AUDIO-VERIFICATION-001/`; rsync the ru media
   winners BACK Omarchy→GamingPC, then byte-resync drifted manifest rows
   on GamingPC (sha-scan snippet in commit `6d22be4` message context) —
   manifests are only ever edited on GamingPC (1,627-row race lesson).
2. ja: fold `asr5b` MISMATCH + `bestof-ids-ja.txt` (632) +
   `segflag-ids-ja.txt` (147) → dedup → run `scripts/bake-bestof.py`
   on Omarchy (`--pack languages/ja-JP --k 4-6 --language japanese
   --lang ja --asr-model ~/models/ggml-large-v3-turbo.bin --whisper
   ~/whisper.cpp/build/bin/whisper-cli --jobs 4`, PATH=$HOME/.local/bin
   for espeak-ng). Harvest winners + manifest rows back after it fully
   exits.
3. Exhausted ids → RU-RUNDOWN section D (id, text, K attempts, per-take
   heard) for owner disposition.
4. `langpack test` both packs 0/0 → rebuild 0.4.3 lpks → re-stage
   `~/staging/0.4.3/{ru-RU,ja-JP}/media/` + store → packet §3 table →
   AUDIT doc → kanban row 15 → commit all + push.
5. Owner listening session; §5 republish only on explicit owner go.
