# WORD-TIMING-001 — word-level clip timings (karaoke + click-to-hear-word)

Owner scoped this post-1.0 feature on 2026-11-07 ("get that planned out and implemented").

## Spike verdict (experiments/word-timing/spike.py, spike-ru.jsonl)
- faster-whisper `large-v3-turbo` (CT2, cached on GamingPC) CPU int8, `word_timestamps=True`,
  `initial_prompt=<expected text>`, beam 5, temperature 0: **17/20 ru clips** pass a
  constrained fuzzy token match (difflib, ratio ≥0.75) with monotonic in-clip timings.
- `small` model only 13/20 — mishears fast TTS; use turbo as the workhorse.
- Pitfall fixed: Russian stress marks are combining (му́ка); strip combining marks
  BEFORE tokenizing the expected text, otherwise words fragment.
- Failure modes: whisper hallucinations on short fast clips ("Продолжение следует…"),
  and near-miss token splits (до-ёброе). Production needs a retry ladder
  (turbo → large-v3 → relaxed split/merge) and graceful abstain for the rest.

## Data contract (v1)
Sidecar `languages/<lang>/media/words.jsonl`, one line per clip:
`{"id": "<clip id>", "words": [{"w": "<exact pack-text token, stress preserved>", "s": <start s>, "e": <end s>}]}`
- Additive: `media/manifest.jsonl` untouched; packs without the sidecar must load unchanged.
- v1 generation scope: ru-RU pack. ja deferred (whisper emits kana, pack text is kanji —
  needs grapheme→reading normalization; future card).

## Lanes
- A (data): `scripts/generate-word-timings.py` — resumable batch, retry ladder, abstain
  report; run for the full ru pack; acceptance ≥90% coverage, 100% schema-valid.
- B (app): langpack reads optional sidecar (+ no-sidecar test), exposes timings to the
  desktop; shadowing/listening screens: current-word highlight during playback,
  click word → play that span; no-timing clips render exactly as before.
