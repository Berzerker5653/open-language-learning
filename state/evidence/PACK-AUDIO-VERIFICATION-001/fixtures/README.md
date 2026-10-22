# Regression fixtures — PACK-AUDIO-VERIFICATION-001

Owner-flagged defective bakes (2026-10-20/21 listening passes), kept forever
as regression fixtures: the gate suite must run against these and report the
documented verdicts. Repaired replacements live in the pack trees.

| file | sha256 | defect | gate behaviour (expected) |
| --- | --- | --- | --- |
| `drink-coffee.old.wav` (ja.sent.drink-coffee, 4.32 s) | `49a0b6df91759ec1…eaf3ae68` | 80–240 ms onset burst + two ~1 s internal gaps | qa-segments FLAG (gap 1.06/1.12 s); qa-asr passed it (word content intact) |
| `ru.contrast.palatalization.brat-1.wav` (брать) | `adbac7e952d8246c…d577bb50` | epenthetic vowel after the palatalized final ("two aa" — owner's ear) | passed qa-asr AND the envelope layers; caught by owner re-listen; see qa-pron README for the phoneme-layer measurement |
| `ru.lex.shopping.perchatki.wav` (перча́тки) | `fad16a30b1c1b2fd…76222c8607` | extra segment mid-word ("an extra sound") | qa-pron FLAG (ratio 0.5, +vowel-ish segment); qa-asr passed it |

Working copies (identical bytes) also live in `~/staging/qa-fixtures-2026-10-21/`.
Original naive re-bakes that failed qa-asr outright (брать→"Абарати",
перча́тки→"Печай, Оке") are documented in the owner-session packet §3 and
demonstrate the ASR gate biting on bad takes.
