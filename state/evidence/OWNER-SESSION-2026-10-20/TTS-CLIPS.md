# TTS-003 listening pass — clip integrity + acoustic metrics

Measurement support only — the verdict stays yours.

Run 2026-10-20 on the tracked tree (main @ 770dc6b). These numbers describe what
is on disk; they cannot hear "echoey, metallic, tinny". Play the clips
(`TTS-PLAY.sh`, or in-app) and mark the packet's boxes.

## Integrity check

Source command: `.venv/bin/python` script computing `hashlib.sha256` over each
file under `languages/<pack>/media/` and comparing to the row for that clip id
in the same pack's `media/manifest.jsonl` (sha256 + bytes fields).

Result: **10/10 exist, 10/10 sha256 match, 10/10 bytes match.**
(Manifest sizes for context: ja-JP 4,902 rows, ru-RU 4,856 rows.)

## Acoustic metrics

Source commands (run per clip from repo root; outputs captured 2026-10-20):

```sh
ffmpeg -hide_banner -nostats -i <clip> -af astats=metadata=1:reset=0 -f null -
ffmpeg -hide_banner -nostats -i <clip> -af volumedetect -f null -
```

Values below are the Overall-section fields from those runs (`Peak level dB`,
`RMS level dB`, `Flat factor`, `Crest factor`; `max_volume`/`mean_volume`),
rounded to 2 dp.

| clip | text | integrity ok / hash-match | peak dB (astats) | RMS dB | Flat factor | Crest | max/mean dB (volumedetect) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ja `media/ja.sent.drink-coffee.wav` | コーヒーを のみます | ok / match | -3.71 | -18.56 | 0.00 | 14.85 | -3.7 / -18.6 |
| ja `media/ja.contrast.vowel-length.obasan-0.wav` | おばさん | ok / match | -3.84 | -17.06 | 0.00 | 4.58 | -3.8 / -17.1 |
| ja `media/ja.contrast.vowel-length.obasan-1.wav` | おばあさん | ok / match | -3.10 | -17.72 | 0.00 | 5.38 | -3.1 / -17.7 |
| ja `media/ja.contrast.palatalization.hyaku-0.wav` | ひゃく | ok / match | -3.10 | -20.07 | 0.00 | 7.05 | -3.1 / -20.1 |
| ja `media/ja.lex.numbers.go.wav` | ご | ok / match | -3.10 | -18.19 | 0.00 | 5.68 | -3.1 / -18.2 |
| ja `media/ja.sent.scenario-reasoning.wav` | ようけん を かえて こうこ を かんがえました。 | ok / match | -3.10 | -22.18 | 0.00 | 9.00 | -3.1 / -22.2 |
| ru `media/ru.contrast.palatalization.brat-1.wav` | брать | ok / match | -4.26 | -17.27 | 0.00 | 13.01 | -4.3 / -17.3 |
| ru `media/ru.lex.numbers-time.chetyre.wav` | четы́ре | ok / match | -4.64 | -17.22 | 0.00 | 4.26 | -4.6 / -17.2 |
| ru `media/ru.lex.shopping.perchatki.wav` | перча́тки | ok / match | -3.10 | -20.01 | 0.00 | 16.91 | -3.1 / -20.0 |

All ten clips: full sha256 equal to the manifest row (first 8 for skim):
f56fe9ff…, 07e94742…, 64ac33d7…, 0efc9656…, 82a4806c…, 7b46f098…,
5b473cac…, 1b95e5e7…, 8e0dc59b…, 3d168d27…

## Reading the numbers (not verdicts)

- Peaks cluster at -3.1 dB (the bake's peak ceiling; see
  `scripts/generate-pack-audio.py:132` "loudness normalized, gain … peak
  ceiling") — the shipped files do carry bake-time loudness normalization;
  six of ten sit exactly at the ceiling.
- Active RMS sits between -17.1 and -22.2 dB — the spread tracks clip length
  (pauses in the two long sentences pull RMS down), not a level fault.
- `Flat factor` is 0.0 for every clip (astats reports clipping-style flatness;
  zero means no flat stretches were detected).
- Crest factors 4.2–9.0 are ordinary speech dynamics; nothing here says the
  clips are free of the finding-11 character — that question is for your ears.

## Post-verdict re-bake (2026-10-21)

The owner named ONE defective clip: `ja.sent.drink-coffee` — "a bit of
something in the beginning that sounds off". Machine confirmation of the old
bytes: an 80–240 ms onset burst, then TWO ~1 s silence gaps inside a 4.32 s
file — a fragmented bake the duration cap had let through. Re-baked alone via
`scripts/generate-pack-audio.py --pack languages/ja-JP --only
ja.sent.drink-coffee --force` (same engine/voice/normalization as every
other row), envelope now continuous: コーヒーを (0.1–1.6 s), one 0.6 s
phrase break, のみます (2.4–3.2 s), 3.28 s total. The crest of 14.9 above
the 4.2–9.0 band reflects that phrase pause inside the RMS window. Gate:
`scripts/qa-asr.py --ids` whisper round-trip **passed=1 MISMATCH=0**;
`langpack test languages/ja-JP` **0 errors / 0 warnings**; manifest row
re-hashed to `f56fe9ff…` (157,484 B, 3.28 s).

ru pair (second re-listen): `brat-1` and `perchatki` re-synthesized through
`scripts/bake-repair-loop.sh` (whisper round-trip as the convergence gate;
2 rounds to zero failures — the first naive re-bakes FAILED that gate
audibly: "брать"→"Абарати", "перча́тки"→"Печай, Оке", the owner's
extra-sounds caught red-handed). Final shas `1b95e5e7…` (0.96 s) and
`3d168d27…` (2.64 s — long for a disyllable, listed for the owner's
next ear-check). ru 0.4.3 archive re-staged `d44624f1…` / 318,529,155 B.
