# JA-B2-002 — in-lane fix verification (D-01/D-02/D-03)

Date: 2026-11-21. All three defective sentences were rewritten in this lane and
re-baked on the pack-standard narrator (qwen3-tts / ono_anna), then passed the
content half of the ja ASR gate. No gate script was edited.

## Edits applied (code, same commit as review records)

| defect | id | before | after |
|---|---|---|---|
| D-01 register | ja.sent.b2reg-soncho-okaeshi | ぶちょう が **おかえし**に なりました (cloze おかえし) | ぶちょう が **おかえり**に なりました (cloze おかえり) |
| D-02 gloss fidelity | ja.sent.b2reg-wake-da-saiban | **はんけつ** が ふくすう あれば… (gloss said 'interpreters') | **つうやく** が ふくすう あれば… (gloss faithful; cloze わけ unchanged) |
| D-03 register | ja.sent.b2reg-ashita-itsudemo-gozaimasu | あした なら、いつでも だいじょうぶ ございます | あした なら、いつでも だいじょうぶ **で** ございます (cloze ございます still verbatim) |

Prose consumers corrected in the same edit: unit 830 summary +
`expected_interpretations` (おかえしになる -> おかえりになる); scenario
`ja.scenario.b2.register.client-call` availability-node model text
(だいじょうぶ で ございます).

## Re-bake + certification

- `bake.sh` run as systemd user unit `lts-jab2r-bake` (2026-11-21 08:41-08:48 MST),
  3/3 `ok=True` (`bake.log`); manifest rows rewritten by the pipeline
  (new sha256/bytes/seconds recorded — `test` gate verifies wav-vs-manifest
  hashes at install mode, PASS).
- **Pacing triage (ja corpus mean ~0.206 s/mora; B2-001 band 0.151-0.304):**
  take-1 rejects — `wake-da-saiban` 11.44 s/24 mora = 0.477 (stretched
  delivery), `soncho-okaeshi` 2.0 s/14 = 0.143 (below floor). Take-2
  (`bake2.sh`, unit `lts-jab2r-bake2`): `soncho-okaeshi` 2.64 s = 0.189,
  `wake-da-saiban` 4.88 s = 0.203, `ashita` (take-1 kept, was in band)
  4.0 s = 0.200. All inside normal delivery pacing.
- Content half of the ja ASR gate (`content-check.py`, whisper
  large-v3-turbo + kana-fold compare — same method as JA-B2-001) on the FINAL
  wavs: 3/3 `rc=0` exact-fold (`asr-content.jsonl`):
  - heard 部長がお帰りになりました
  - heard 通訳が複数あれば裁判が長いわけです
  - heard 明日なら、いつでも大丈夫でございます。
- Word-timing sidecar: stale rows for the 3 ids removed from
  `media/words.jsonl` (they timed the old audio); regeneration deferred to the
  next word-timing pass — sidecar rows are optional (clips render plain-text).

## Gates on the reviewed tree (pack-scoped LANE tier)

`gates.log`: validate / lint / test / audit-curriculum / audit-lexicon /
audit-licenses / audit-sources on `languages/ja-JP` — all exit 0, 0 errors
0 warnings (the `test` gate is the install-mode conformance pass, i.e. the
re-baked audio is hash-certified against the manifest).
