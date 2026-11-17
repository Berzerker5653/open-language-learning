# R13 word-drill ASR gate results (2026-11-17)

800 unique candidate drill clips (deduped from 840 lines; `~/.hermes/cache/scratch/r13-gate.jsonl`):
**783 OK / 17 MISMATCH (97.9% pass)**. Verdict: pipeline is healthy; all 17 failures
concentrate in ONE phonetic class plus a known ASR artifact.

## Failure classes
1. **Final soft-sign nouns** (all 17 words: щель, лесть, весь, пыль, есть, цепь, день, боль, тень) —
   final devoiced/soft consonant + ь. Genuine TTS errors in most:
   - `боль` → "Бул" on ALL THREE kokoro voices ( systematic kokoro failure, not random)
   - `цепь` → "Сип/Сып/Сит" (4 clips), `тень` → "Чинь" (2), `щель` → "Шил/Шиль",
     `лесть` → "ЛЕЗЬ" (voicing slip), `пыль` → "Пую", `день` → "Зинь"
2. **Whisper short-clip hallucinations** (false-fail candidates): `есть` heard
   "Есть. Редактор субтитров…", `весь` heard "Весь мир.", `sil-baya-тень` heard
   "Субтитры создавал DimaTorzok" — the target word was actually pronounced; extra
   hallucinated subtitle credits broke the ratio. 3 clips likely pass on re-gate.

## Fix strategy for R14 (14 clips, driver lane)
- Retry with the OTHER engine per voice: where kokoro fails (-ль/-ть/-пь words), try
  silero variants and vice versa; gate again.
- For stubborn `боль/цепь/тень`: bake in a 2-word phrase context (e.g. «большая боль»
  no — use «сильная боль», «цепь и замок», «тень дома») since co-articulation in a
  phrase stabilizes the final cluster; clip the phrase as the drill audio (owner rule:
  word-snippet audio need not be a bare word).
- Re-gate the 3 hallucination suspects with the phrase-context rule too (longer clips
  don't trigger credit hallucinations).
- Voice consistency NOT required for word drills (owner ruling 2026-11-17,
  READER-FLOW word lookup) — mixing engines per word is allowed.

## Gate correctness lesson (already in lts-pack-audio-qa skill)
Before treating a MISMATCH as a TTS failure, check `heard` for subtitle-credit
strings ("Редактор субтитров", "Субтитры создавал", "Корректор") — signature of
whisper hallucination on ≤1s clips, not mispronunciation.
