# Why the ru audio "failed" — root-cause analysis (2026-11-05)

## TL;DR
Of 213 audit-8 MISMATCH clips, **~49% were false failures caused by the checker itself**, and ~51% were genuinely garbled TTS takes. A single normalization bug in `qa-asr.py` made correct audio un-fixable by re-rendering.

## Gate bug (fixed 2026-11-05 ~12:06, qa-asr.py norm())
- Pack text carries lexical stress marks (U+0301), e.g. `кио́ск`.
- `norm()` stripped them as punctuation, leaving a **space** inside the word before the `ru_phon` phonemic fold.
- `ru_phon` is space-sensitive: `кио ск` -> `kʲiʌɛskɑ`, but whisper's stress-free `киоск` -> `kʲiosk`. Asymmetric fold -> guaranteed MISMATCH for many stressed words.
- Counts on audit8 data: **104/213 false MISMATCH** (perfect audio, would pass with fold fixed).
- The same bug caused **false PASSes** too: >=14 previously-ok clips (e.g. `апре́ль` vs heard `А-при-га-не-ть.` passed at ratio>=0.75 only because the buggy fold inflated it).
- Fix: strip U+0301/U+0300 **before** any other normalization. Verified: 0 real regressions; kiosk/povorot/pozhaluysta now 1.0; `бо́льше` vs `Боёлься!` still fails.

## Genuine TTS failure profile (the ~109 real ones)
- Category: 211/213 are single-word `lex` clips; sentence clips almost never fail.
- Failure mode: Qwen3-TTS CustomVoice mangles stressed multi-syllable words:
  `район`->"Драй гой!", `tramвай`->"Турамага!", `метро`->*laughter*, `бу́ква`->"Бу-йокуа."
- Whisper on isolated single words adds noise, but most recorded takes are audibly wrong.
- Fix strategy: re-render with fresh random seed per attempt (sampling diversity) until the fold-fixed gate passes; repair loop handles this.

## Consequences / follow-ups
1. The pre-fix full-pack pass (4,615 "ok") over-counted correctness by at least the 14-pattern class -> **full 4,856 re-audit with fixed gate required** before shipping the pack.
2. Round-1 repair audit (finished 11:09) ran on the OLD gate -> 218/241 "failures" overstated; round-2 audit will use the fixed gate and pass counts should jump.
3. For ja pack: same audit script — verify accent/fold symmetry lessons apply (kana fold is space-insensitive, so ja unaffected; keep in mind for any diacritic-bearing pack).

## Evidence
- audit8 (old gate): `asr8-final.jsonl`
- repair round1 (old gate): `asr-r1.jsonl` (218 mismatches, inflated)
- gate fix: `scripts/qa-asr.py` norm() stress-strip, 2026-11-05
