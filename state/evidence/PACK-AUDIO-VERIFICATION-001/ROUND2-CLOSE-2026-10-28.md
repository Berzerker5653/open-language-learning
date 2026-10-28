# Round-2 close-out — pack audio verification campaign (2026-10-28)

Card `PACK-AUDIO-VERIFICATION-001`: every baked voice line of every shipping
pack must pass the two certifying gates (word-level ASR round-trip + ML-free
acoustic-structure gate), failures repaired through the ASR-gated bake loop,
residue dispositioned by the owner. Round 2 moved the repair queue from Omarchy
to GamingPC at the owner's request ("smaller batches… run it on this computer if
we can as it's faster") and finished unattended at 23:03 on 2026-10-27: all 16
batches settled and committed, `local-chain done`.

## Final tallies

| pack | media rows | entered best-of-K | round-1 certified (Omarchy) | round-2 certified (GamingPC) | still exhausted |
|---|---|---|---|---|---|
| ja-JP | 4,902 | 1,066 (K=6) | 802 | 119 | 145 |
| ru-RU | 4,856 | 417 (K=8) | 299 | 26 | 92 |
| total | 9,758 | 1,483 | 1,101 | 145 | 237 |

The accounting closes: per pack, rows that never entered best-of-K (clean on
their original take, or already repaired by the earlier ASR-gated repair
rounds), plus round-1 certs, plus round-2 certs, plus this packet equals the
manifest row count (ja 3,836 + 802 + 119 + 145 = 4,902; ru 4,439 + 299 + 26 +
92 = 4,856).

Round-2 yield was **38% of the residue**, not the ~75% the round-2 plan claimed.
That expectation was bad arithmetic (takes are i.i.d., ids are not exchangeable:
having already failed K draws is evidence about the id). The recorded number is
in `NEXT-CHECK-2026-10-27.md`; the packet regenerates it from checkpoints.

## What round 2 changed on disk

145 clips replaced their wav and manifest row (`sha256`, `bytes`,
`sample_rate`, `channels`, `seconds`, `generated`, and a
`best-of-K: take n of up to K passed full gate` note). For the 237 exhausted
ids nothing was installed: `bake-bestof.py` discards losing takes and keeps the
old wav until a winner replaces it, so the bytes at `media/<id>.wav` are still
the original bake - which is what the owner hears in `EXHAUSTED-PLAY.sh`.

## Integrity proved at close-out (`close-round2.sh`, 2026-10-28)

* Manifest vs bytes on disk, every row of both packs: **ja 4,902 + ru 4,856
  rows, 0 hash/size mismatches, 0 missing files.**
* `lts-langpack-cli validate` / `lint` / `test` on both packs: **0 errors, 0
  warnings.**
* Queue integrity (2026-10-27): the 382 queued retry ids are exactly the 382
  round-1 exhausted ids - 0 duplicates, 0 missing, 0 extras.

## Structure gate re-run against today's bytes

`full-audit-2026-10-28/segments-{ja-JP,ru-RU}.jsonl` - all 9,758 clips in 91 s:
**15 FLAG in ja-JP, 2 in ru-RU.** All 17 are already inside the 237-row packet;
**none** sit outside it, and **no round-2 certified winner fails the current
structure gate.** The 327/252 flags recorded by the 2026-10-21 audit therefore
no longer describe the audio on disk and must not be quoted as open defects.

## Cost actually paid

Round 2: 2,066 candidate takes over 382 ids in 13.4 h wall. The binding
constraint on this box is memory, not cores: with strata resident the chain
clamps to `jobs=3` (145 takes/h); with the inference server stopped it runs at
`jobs=8` and ru batches settled 25 ids in 50-68 min.

## Recognizer identity

Both certifying gates here run `whisper-gate.sh` -> GamingPC whisper.cpp
`60c0be6`, model sha `79b96a71d8483b42`. Round 1 used Omarchy `7e26d3b` /
`d99194379aa747b8`. A 120-clip recert measured 119/120 agreement, the one delta
being build skew, not a bad clip (`gate-identity-2026-10-27.txt`). Publish-time
provenance has to name the build + model sha or "certified" is not repeatable.

## In flight at the time of writing

* `regate-harvest.sh` re-certifying the 1,101 round-1 winners (audio harvested
  from Omarchy) with this box's build -> `local-regate-2026-10-28/`
  (`reconcile.jsonl`, `deltas.jsonl`, `REGATE-2026-10-28.md`). Predicted ~9
  deltas at the measured skew.
* `reaudit-asr.sh` re-running the ASR gate over **every** manifest row under
  this build, seeded from the re-gate checkpoint so nothing is decoded twice,
  reconciled against the campaign sets so any failure no campaign record
  explains is listed by id (`full-audit-2026-10-28/audit-fails.jsonl`).
  ~5 h per pack at the measured clip rate.

Both write evidence only.

## What is not done

1. **237 dispositions** (keep / remove / re-author) - `EXHAUSTED-2026-10-28.md`,
   answer sheet `disposition-2026-10-28.csv`, 10 listening batches via
   `bash EXHAUSTED-PLAY.sh <ja|ru> <N>`. Cause tags: gap 160, wrong-syllables
   60, vocalization 8, burst 6, near-miss 3. This is a human call and cannot be
   self-certified by an agent.
2. **Re-staging the 0.4.3 pack archives.** `~/staging/` predates the rounds, so
   the staged archives are stale by 145 assets; `bash
   scripts/stage-pack-bundle.sh` after the audits, and publish itself needs
   explicit owner authorization (`docs/15`).
3. The card stays open until the dispositions land and the ASR re-audit closes.
