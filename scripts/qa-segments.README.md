# qa-segments.py — ML-free acoustic-structure gate

Part of the pack-audio verification pipeline (PACK-AUDIO-VERIFICATION-001):
word content is certified by `scripts/qa-asr.py`, phones by
`scripts/qa-pron.py`, and *structure* by this tool. Pure stdlib; runs
anywhere Python runs; CPU-only; ~5 ms per clip (240 clips ≈ 1.2 s).

## Invocation

```
.venv/bin/python scripts/qa-segments.py --pack languages/ru-RU \
    [--ids ID ...] [--ids-file F] [--out qa-segments.jsonl] \
    [--max-gap 0.8] [--sil-db -45]
```

Per clip: PASS/FLAG JSONL with measured numbers; exit 1 if any FLAG.

## Checks and calibration (2026-10-21)

Fixtures (bad, from owner-flagged takes): `drink-coffee.old` (80–240 ms
onset burst + two ~1 s internal gaps), `brat-1.old`, `perchatki.old` —
copies under `~/staging/qa-fixtures-2026-10-21/`. Good set: 240 randomly
sampled known-good clips (120 ru / 120 ja, short texts), plus the clips
the owner marked ☑ in the 2026-10-20 session packet.

| check | rule (default) | fixture result | good-set behaviour |
| --- | --- | --- | --- |
| `gap` | silence run > 0.8 s between first/last sustained speech → FLAG | drink-coffee.old FLAG (gaps 1.06/1.12 s) | 13/240 flagged (0.84–2.06 s). These are **not treated as false positives**: a ~1 s silence inside one word ("уно́й", "ке́йки") is an artifact — they go to the repair loop; the margin to natural pauses (all unflagged clips < 0.8 s) is thin, so flagged clips may be owner-blessed instead. |
| `burst` | speech blip < 0.15 s before main utterance, separated by ≥ 0.15 s silence → FLAG | drink-coffee.old onset burst (also caught by `gap`) | 2/240. Calibration: natural plosive/fricative onsets dip < 0.10 s (a looser 0.06 s rule false-flagged 13 clips). |
| `clip` | ≥ 2 consecutive samples at full scale → FLAG | none of the fixtures clip | 0/240 observed ever. |
| `trail` | above-threshold energy within 160 ms after last sustained speech → FLAG | n/a | 0/240 observed so far. |
| `nuclei` | **metric only — never flags** | recorded per clip | see below |

## The nuclei experiment (documented failure)

The original plan counted syllable nuclei from the 20 ms energy envelope
and compared to expected counts (ru vowel letters, ja morae — the
mora table is in `expected_nuclei_ja`). Two implementations were
calibrated on the good set and both failed:

* threshold-run counting: 159/240 good clips off by ≥ 2 (e.g. 4-vowel
  words collapse to 1 run — syllables do not dip below any absolute
  threshold between nuclei);
* smoothed-envelope prominence peaks: worse (0–2 observed on 4–6-syllable
  words).

So `nuclei`/`expected_nuclei` stay in the JSONL as a cheap cross-check
and human-review lead, and **no syllable-count certification is claimed
from the envelope**. What covers that class instead: `qa-pron`
(inserted-vowel signal) and, for the residual (the `brat-1.old`
epenthesis slipped past BOTH machine layers — see qa-pron README), the
owner's ears plus the ASR-gated repair loop.

## What this gate cannot hear (limits)

* pronunciation content: substitutions, wrong words, accents — qa-asr / qa-pron territory;
* sub-100 ms vowel insertions inside connected speech (the `brat-1.old` fixture passes structurally);
* naturalness/roboticness — deliberately out of scope; only the human verdict certifies that;
* energy-envelope gap/burst margins are thin (0.8 s): clips near the boundary should be auditioned, not auto-discarded.
