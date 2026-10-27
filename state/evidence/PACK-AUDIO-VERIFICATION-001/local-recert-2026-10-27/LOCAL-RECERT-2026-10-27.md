# Local gate re-certification sample — GamingPC, 2026-10-27

Purpose: the round-2 best-of-K campaign runs its own gate on this box, so
before spending ~16 h of baking here we checked that this machine's toolchain
reproduces the campaign box's PASS verdicts on harvested winners. Transfer
integrity was already hash-proven independently (1,101/1,101 remote hashes
before transfer, then the full local tree: ja 4,902 and ru 4,856 rows, 0
mismatch / 0 missing, commit 23871bf) — this sample is about **gate
equivalence**, not about the bytes.

## Inputs

* 60 harvested ja winners (`sample-ja-60.txt`) + 60 harvested ru winners
  (`sample-ru-60.txt`) — the head of the harvest lists, not a curated subset.
* `scripts/qa-asr.py` (round-trip gate) + `scripts/qa-segments.py` (structure
  gate), `--workers 4`, whisper pinned to CPU via `../whisper-gate.sh`.

## Model identity

`ggml-large-v3-turbo.bin` is byte-identical on both boxes:
`1fc70f774d38eb169993ac391eea357ef47c88757ef72ee5943879b7e8e2bc69`
(GamingPC `~/.cache/lts-bench/` == Omarchy `~/models/`).

## Verdicts

| gate | ja 60 | ru 60 |
|---|---|---|
| asr round-trip | 60 ok / 0 MISMATCH | 59 ok / 1 MISMATCH |
| segments | 0 FLAG | 0 FLAG |

**119/120 agreement.** The single disagreement is
`ru.lex.comparisons.iz-za`: the box certified it `pass@6`, the local round-trip
ran the same model bytes, so the difference is the **recognizer build**: this
box runs whisper.cpp `60c0be6` (binary `79b96a71…`) and the campaign box runs
`7e26d3b` (binary `d9919437…`). The sensitivity is measured, not assumed: on
this one clip the gate decode (`-np -nt`) yields `Иосифа.` while the
timestamped decode yields `Хи-о-зу-за!` - each deterministic run-to-run, and
identical at 1/4/8/16 threads, so thread count and `-ng` change nothing while
the decode path and build do (`../gate-identity-2026-10-27.txt`).
A preposition pair is exactly where whisper confabulates, so this is NOT
evidence the clip is bad — but it is also not evidence it is fine, so it goes
on the owner listening list rather than being waved through by either machine.

## Rate on this box (for planning)

60 clips in 6m11s (ja) and 7m03s (ru) at `--workers 4` ≈ **510-580 clips/h**
CPU. One bake tree (TTS worker + whisper gate) peaks at 7.9 GB RSS. With the
inference server stopped the full-corpus re-audit of both packs (9,758 clips)
is ~17 h CPU here, or far less on the GPU once it is free.

## Follow-up this measurement obliges

119/120 across two different builds is a **build-skew estimate**, not a defect
rate: ~0.8% predicts roughly 9 of the 1,101 harvested round-1 winners that
would not pass the local gate. Close-out: re-gate exactly those 1,101 ids with
the GamingPC binary (~2 h CPU at the rate above) after the round-2 bake, so
every shipped cert traces to one named recognizer build.

## Related tooling change

`scripts/qa-asr.py` now appends + fsyncs each verdict as its asset settles and
resumes from an existing `--out` (settled ids are carried, not re-transcribed),
so an interrupted audit no longer loses hours of whisper. Pinned by
`scripts/test_qa_asr.py`.
