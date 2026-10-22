# qa-pron.py — phoneme-level record layer (not a gate)

Part of the pack-audio verification pipeline (PACK-AUDIO-VERIFICATION-001).
Status after calibration (2026-10-21): **record-only**. The layer writes
per-clip measurements for human review and future re-calibration; it does
not auto-FLAG, because both candidate scoring rules failed to separate
known-bad from certified-good clips on these packs.

## Invocation

```
~/.venvs/qwen-tts/bin/python scripts/qa-pron.py --pack languages/ru-RU \
    [--ids ID ...] [--ids-file F] --out qa-pron.jsonl
```

Model: `facebook/wav2vec2-xlsr-53-espeak-cv-ft` (wav2vec2-XLSR-53 CTC over
espeak-IPA phones; 1.2 GB, cached under `~/.cache/huggingface`; weights
upstream **CC-BY-NC** — development-time verification use only, never
shipped in the app or a pack; run offline with `HF_HUB_OFFLINE=1`).
CPU-only, ~0.3–0.5 s per clip.

## Expected phones

`scripts/qa_pron_g2p.py`: espeak-ng `--ipa` when available (the symbol
space the recognizer was trained on — convention noise cancels), falling
back to the module's own ja/ru tables; unmapped language → explicit
ABSTAIN row. A new language adds one mapping function there.

## Calibration experiments (the honest result)

Fixtures: the three owner-flagged defective takes (see
`state/evidence/PACK-AUDIO-VERIFICATION-001/fixtures/README.md`).
Good set: 240 randomly sampled certified-good clips (120 ru / 120 ja,
short texts).

**Experiment 1 — edit distance on CTC-greedy phones** (normalized
distance vs expected, per-language threshold + vowel-insertion rule):

| set | dist_ratio |
| --- | --- |
| ru good-120 | median 0.538, p90 0.833, max 1.111 |
| ja good-120 | median 0.667, p90 1.000, max 1.429 |
| `perchatki.old` (defective) | 0.5 — *below the good median* |
| `brat-1.old` (defective) | 0.4 — the epenthetic vowel is not in the recognizer's transcript at all |

Vowel-insertion ops appeared on 12/120 ru and 11/120 ja *good* clips
(recognizer artifacts: `+ː`, `+5`, `+a ː`). No threshold flags the
fixtures without flagging most of the good set.

**Experiment 2 — CTC forced-alignment posterior** (best-path log-prob of
the expected phone sequence per frame):

| set | align_score |
| --- | --- |
| ru good-120 | mean −0.435, range −1.44…−0.02 |
| ja good-120 | mean −0.459, range −1.36…−0.02 |
| `perchatki.old` | −0.55 (inside the good range) |
| `brat-1.old` | −0.30 (better than the repaired replacement's −0.27…−0.32 band) |

Scores track word length/reduction complexity, not correctness: an
XLSR-53 espeak-IPA recognizer simply is not precise enough on reduced
Russian and Japanese to certify or refute individual pronunciations.

## Consequences (adopted design)

* `qa-pron` default verdict: PASS/ABSTAIN; metrics recorded per clip
  (`expected`, `recognized`, diff ops, `dist_ratio`, `align_score`,
  `ins_vowels`). `--flag-ratio N` exists only for experiments.
* What CERTS content stays: `qa-asr.py` (word round-trip — caught both
  botched re-bakes outright) and `qa-segments.py` (structure), plus the
  owner's listening pass; the residual class — epenthetic vowels and
  inserted segments that whisper absorbs and the envelope cannot see —
  is certified by human ears only, which is why the audit keeps an
  owner-review sample and why re-listens of flagged clips are mandatory.
* Re-calibration path: a stronger forced aligner (e.g. MFA with
  language-specific acoustic models) or finetuned recognizer; the
  JSONLs from every full audit are the substrate. If a calibrated
  threshold is ever found on fixtures + good sets, this flips back to a
  gate by adding the rule here — nothing else changes.

## Limits (never certify)

Accent/naturalness; anything the recognizer itself mishears (it does,
constantly, on reduced syllables); language unknown → ABSTAIN (recorded,
not passed).
