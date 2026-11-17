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

## Outcome (fill in)
pending
