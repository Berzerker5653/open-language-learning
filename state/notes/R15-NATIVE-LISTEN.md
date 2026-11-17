# R15 quick native listen page — 25 clips (~3 min)
Owner's wife (native RU) back; GamingPC requested free — this page is a trivial
static+verdict server, no compute. Server on GamingPC :8792, UI in Russian.

## Set
- 17 word clips (the R13 mismatch class: щель лесть весь пыль есть цепь день боль тень × voices)
  — Q: слово произнесено правильно? (Kokoro/Silero labeled per clip)
- 8 sentence clips: p18 p21 p39 (ASR heard garbling despite ratio pass), p37 (held piper clip,
  ASR heard gibberish — decide: keep or cut), p20 (duration-suspect), u712 пестицид,
  u737 эпилог, u336 данные. Q: фраза звучит чисто и естественно?
- Excluded b2.u459 род→"рот": correct pronunciation (devoicing), ASR artifact only.

## Verdicts
POST /v -> `verdicts-r15.jsonl` {id, verdict: good|bad, ts}. bad word clips -> R14 engine-swap
re-bake queue; bad sentence clips -> re-bake/cut decision.

## Outcome (dictated by owner, 2026-11-17 ~16:10 — page button worked but she judged by ear, verdicts oral)
- "The first few clips cut the L at the end again" — final soft Л truncated/clipped in early clips.
- "The first slow one said the word correctly but then it lost the soft sign in later ones" —
  SLOW speech preserves ь-palatalization; normal speed loses it. => R16 rebake recipe:
  slow takes (atempo 0.85) + phrase context («тень дома», «весь день», «добрый день»…) for all
  9 soft-sign words, best-of via whisper `contains` gate, then one-pager-per-word native re-audition.
- Sentence-clip verdicts: not collected (she stopped at the word block). R15 sentence round
  (p18/p21/p39/p37/p20/u712/u737/u336) still pending — fold into a later native pass.
- R16 run: omarchy `~/lts-qa/r16-bake.py` (k=3 bare + k=2 phrase + slow copies;
  r16-gate.json + r16-finalists.json).
