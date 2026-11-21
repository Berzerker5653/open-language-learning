# JA-B1-003-FIX-001 — lexicon + grammar correction lane (2026-11-20)

Executed on board card t_7698dc5b. Inputs: `state/evidence/JA-B1-003/findings-2026-11-20.md`,
`lexicon-defects-candidate-list.jsonl` (238 adjudicated rows), per-row verdicts
`rev-2026-11-20-b1leg-*` in `languages/ja-JP/reviews.jsonl`.

## What was applied

- 238 lexicon rows adjudicated, 237 corrected in place + 1 verified no-op:
  - ~150 word replacements (garbled/nonexistent forms -> real words, kanji added,
    romaji regenerated with the pack's modified-hepburn convention via
    `scripts/fix-pack-transliterations.py::romaji`);
  - ~60 gloss-only corrections; 2 gloss trims; 4 kanji-form fixes (incl. 安和 spurious
    form dropped from あんな; 馬具 dropped from ばぐ); 1 romaji-reading scaffold fix
    (ja.lex.culture.youraku: youraku -> youyaku; kana reading unchanged).
  - `ja.lex.env2.mizu-bubun`: no content change — the reviewer flagged the id slug as
    stale, but content ids are immutable per card rule and docs/16.
- Ids untouched on every row; `status: draft` unchanged everywhere; generation blocks
  untouched.
- 12 grammar concepts in `grammar/concepts.jsonl`: defective example clauses rewritten
  (dake-bakari-shika, kanoukei-expansion, kedo-keredo, keigo-soncho-intro, nai-u-de,
  onaji-chigai, shieki-ukemi, shitsumon-ni-kotae, sou-da, to-itara-domo (concept
  re-specified to といい vs ても/としても per reviewer), to-toki, ukemi-indirect).
  Names/ids/status untouched.

## Drop-class rows (deviation, reviewer-sanctioned alternative)

Card rule said: unfixable rows -> drop ref + delete row (A1-FIX-003 precedent). In this
pack that is structurally impossible: reviews.jsonl is append-only and the validator
flags any review `target_id` pointing at deleted content (pack.rs `unresolved_reference`,
Error in the `test` gate) unless declared in `manifest.unresolved_references`, which
itself blocks install mode. All three rows had a reviewer-offered concrete replacement,
so the lane used it instead of deletion:
- `ja.lex.edu.kachou` -> かいちょう/快調 'feeling fine' (reviewer alt; no pack duplicate)
- `ja.lex.health2.seka` -> せかい/世界 'world' (reviewer offered prefix form; bare prefix
  would be fed to TTS as-is, and 世界 already recurs in the pack - overlap accepted)
- `ja.lex.society.yimu` -> せきにん/責任 'responsibility' (reviewer alt; 責任 overlap
  accepted - the pack already carries six 責任 rows)

## Audio impact (deviation, A1/A2 precedent)

Every legacy B1 lexicon id carries a model-output word clip in `media/manifest.jsonl`,
and the K-65 gate (`media_text_not_declared_reading`, Error) ties clip text to a declared
reading while `media_asset_missing` (Error) forbids dropping the rows. Reading-changing
fixes therefore require re-baked audio inside this lane, exactly as JA-A2-002-FIX-001
("80 defects + re-baked 63 reading-paired clips") and JA-A1-003 (11 re-bakes) did.
156 clips (153 reading changes + the 3 replacement rows) were re-baked with
`scripts/generate-pack-audio.py --pack languages/ja-JP --force --only ...` on the pack's
qwen3-tts/ono_anna engine; stale clips for superseded readings quarantined to
`tmp/quarantine-b1legfix1/` (gitignored) until the bake completed; 143 stale
word-timing rows in `media/words.jsonl` removed (re-alignment is an open follow-up).

## Honesty limits

- Corrections are ai-assisted (same reviewer seat as the band review); a native
  human pass remains the standing open item. No promotion: all items stay `draft`.
- Re-baked word clips were not individually ASR/ear-verified (owner policy 2026-11-06:
  ja audio accepted on machine gates, no ja ASR remediation loop); the pack build and
  manifest-hash validation gates cover them.

## Takeover verification (second worker, 2026-11-20 16:56)

Independent re-check of the applied lane against
`lexicon-defects-candidate-list.jsonl`:
- 238/238 candidate ids present in the lexicon; 237 rows differ from HEAD, 1 row verified
  identical by design (`ja.lex.env2.mizu-bubun` — reviewer requested only an id-slug
  rename, which the immutable-content-id rule forbids; forms/glosses were already correct).
- No anomaly found across all 237 changed rows: `generation` blocks byte-identical,
  `status` unchanged on every row, gloss-only proposals did not touch forms, form
  proposals did change forms/readings.
- `grammar/concepts.jsonl`: exactly the 12 flagged concepts differ from HEAD; no id,
  name, or status changes.
- Bake coverage reconciled: 156 manifest rows removed = 154 ids in the running
  `lts-b1fix-bake` unit + 2 replacement clips already baked and re-rowed
  (`ja.lex.advice.ato` -> あとで, `ja.lex.edu2.kenji` -> しょうこ).
- The lane remains uncommitted pending bake completion; gate battery + review-record
  append + ledger close follow the numbered recipe in `state/notes/JA-B1-003-FIX-001.md`.

## Takeover close-out (third worker, 2026-11-21, board run 73)

- Lane content landed on main WITHOUT this card's label: sibling commit `28e9e30`
  ("docs(agents): link coding standard checklist") swept the whole working tree
  (`git add -A` pattern) and carried: all 25 corrected lexicon files, the 12 rewritten
  grammar rows, the manifest rewrite (156 stale rows out, 151 re-bake rows in) and the
  143 `words.jsonl` deletions. Independent re-verification at takeover: diff
  `28e9e30^..28e9e30` over the lexicon shows EXACTLY the 237 candidate rows changed
  (plus the documented `ja.lex.env2.mizu-bubun` no-op), `id`/`status: draft`/
  `generation` invariants intact on every row, and exactly the 12 flagged grammar rows
  changed. No re-apply was needed; the earlier "lane WIP vanished from the tree"
  alarm was this commit, not data loss.
- Manifest/disk drift found at takeover: 10 candidate wavs (`ja.lex.advice.ato`,
  `ja.lex.advice.hatsu`, `ja.lex.advice.shouko`, `ja.lex.advice.koudan`,
  `ja.lex.advice.ketai`, `ja.lex.advice2.suusei`, `ja.lex.advice2.youchuu`,
  `ja.lex.advice2.kokuhan`, `ja.lex.advice2.inoko2`, `ja.lex.edu2.kenji`) had on-disk
  bytes != their committed manifest rows (byte-size mismatch vs the bake-recorded
  rows; cause not pinpointed — first wave of the bake1 unit, wavs untouched since
  2026-11-20 17:06). Plus 3 ids with no manifest row and runaway garbage wavs on disk
  (`ja.lex.emotion.shoujin`, `ja.lex.health3.kyoubu`, `ja.lex.work2.keiri` — the real
  bake1 `FAILED` ids; the earlier wake note misnamed them). Remediation: all 13
  re-baked fresh via unit `lts-b1fix-bake3`
  (`generate-pack-audio.py --pack languages/ja-JP --force --only x13`, log
  `~/.hermes/cache/scratch/bake-b1legfix1c.log`), then sha256-vs-disk + text==declared
  reading re-verified for all 238 candidate ids (see `gates.log`).
- Review-record deviation (documented): fix-verification records use
  `rev-2026-11-21-b1legfix1-001..250` with `outcome: approved` (schema-valid; these
  verify corrections already applied and re-checked — `changes-requested` would assert
  an outstanding objection). Attribution honesty unchanged: ai-assisted, no promotion,
  all items stay `draft`.
