# READER-FLOW-001 — Kindle-style reader: contract (frozen before lanes)

Research background: state/notes/READING-STORY-UX-001.md (read/listen split,
owner clarification 2026-11-17). This note freezes the FILE + WIRE interfaces
so the engine lane and the app lane run on strictly disjoint file sets.

## Scope for this card (and what is deliberately deferred)
- Lane E (engine + desktop backend): build-time RU lemmatizer table committed
  into the pack; `word_card` and `story_word_audio` commands.
- Lane F (desktop frontend): continuous paragraph rendering, word-tap card,
  sentence-tap audio in `reading.tsx` + `App.tsx`.
- DEFERRED to a later slice of this card (stays in_progress until closed):
  the off-pack auxiliary lexicon card from kaikki.org (license check + data
  build is its own work order; a tap on an off-pack word renders an honest
  "not in your pack yet" card meanwhile, with Mine still offered for pack
  words). Logging lookups to storage is VOCAB-BUILDER-001, a separate card.
- Dependency note: READER-FLOW-001 lists STORY-AUTHOR-001 as dependency; the
  A1 batch (4 real stories, 24 story-owned sentences, audio baked) landed in
  `54651a8`, which is the substrate the reader builds on. OWNER DECISION
  2026-11-18: the A1 audition gate is cleared (batch accepted without
  audition, reversible; STORY-AUTHOR-001 back in_progress authoring
  A2/B1/B2). The reader UI does not depend on story *quality*, so it
  proceeds on the A1 substrate. The word-card audio behaviour is locked by
  `state/notes/WORD-CARD-AUDIO-001.md` (slice exact form from the sentence
  clip via word timings; lemma clip fallback; NO per-form baked clips).

## File interface: `media/lemmas.jsonl` (new optional pack sidecar)
Follows the `media/words.jsonl` precedent exactly: declared data under
`media/`, not an audio asset, needs no manifest row (extend the same
whitelist in `crates/langpack/src/audit.rs` ~line 1093 and the layout
docstring in `crates/langpack/src/layout.rs`).

One JSON line per unique surface form, deterministic (sorted by surface,
byte order over the normalized key):

```json
{"surface": "хлеба", "lemma": "хлеб", "tag": "NOUN,inan,masc,sing,gent"}
```

- `surface` = the KEY: token with every combining acute (U+0301) removed,
  lowercased, leading/trailing non-letter characters stripped, NFC.
- `lemma` = pymorphy3 `normal_form` (no stress marks; pack convention).
- `tag` = pymorphy3 grammeme string (`str(Tag)`).
- Generator: `scripts/build-morphology-table.py --write` / `--check`
  (same check/write discipline as `scripts/derive-kanji-radicals.py`).
  Inputs: every `languages/ru-RU/sentences/*.jsonl` entry's `text`
  (story sentences live in those shards). Pins recorded in the script
  header: `pymorphy3==2.0.6`, `pymorphy3-dicts-ru==2.4.417150.4580142`
  (both pip-declare MIT; the underlying OpenCorpora/Zaliznyak data's
  license posture is marked for human review — provenance note in the
  script header, never asserted as settled).
- Table is git-tracked (only `*.wav` is gitignored under `media/`), so CI
  checkouts see it without any archive republish. Published packs are NOT
  touched this lane.

## Wire interface (new src-tauri commands)
Normalization shared by both sides (call it norm-token): remove U+0301,
lowercase, strip leading/trailing characters that are not Unicode letters,
NFC.

1. `word_card(profile_id: String, sentence_id: String, token: String) -> WordCardView`
   ```text
   WordCardView {
     query:  String          // the norm-token sent
     lemma:  Option<String>  // from lemmas.jsonl; None if no row and no lexicon hit
     surface: Option<String> // pack entry surface as authored (stress intact)
     reading: Option<String> // pack entry reading if any
     gloss:  Option<String>  // pack entry gloss
     status: Option<String>  // pack entry status (draft/etc.)
     in_pack: bool           // lexicon entry found for token or lemma
   }
   ```
   Resolution: norm-token → lemmas.jsonl lookup → lemma; lexicon match is
   norm(entry.surface) == norm(token) OR norm(entry.surface) == norm(lemma).
   No pack word => `in_pack: false`, everything else None. The frontend
   renders an honest "not in your pack yet" card (deferred kaikki slice).

2. `story_word_audio(profile_id: String, sentence_id: String, token: String) -> SpeechAudio`
   (same `SpeechAudio { wav_b64, source }` shape as `story_audio`).
   Resolves the sentence clip exactly like `dictation_audio_at`
   (media-first), finds the `media/words.jsonl` span for the clip whose
   norm(`w`) == norm(token), and returns the PCM slice from
   `s − 0.05 s` to `e + 0.05 s` (clamped to the clip), as a valid 16-bit
   mono WAV reusing the clip's sample rate. No span => Err naming the
   word; the frontend then renders no play button rather than guessing.

## Frontend interaction budget (acceptance: three interactions)
- Story body renders as one flowing paragraph: sentence spans inline
  (whitespace-joined), NOT a button column. Clicking a sentence span
  anywhere that is not a word => `onPlaySentence(sentence_id)` (one click).
- Each word token is a button => `onWordTap(sentence_id, rawToken)` opens a
  card (gloss, pack status, lemma line when resolved) with a play button
  => `onWordPlay(sentence_id, rawToken)` (word audio).
- Per-sentence CONTENT-CONFIRM-001 controls stay reachable as a quiet
  control at the sentence tail (never the primary affordance); per-word
  Mine stays inside the word card (manual Mine still works per roadmap).
- ja path unchanged in layout: furigana `Ruby` still renders inside the
  sentence spans; the card mechanism is language-agnostic (ja tokens
  resolve via direct lexicon surface match; no lemmas.jsonl needed).

## Gates per lane
- E: `cargo fmt --all --check`; `cargo clippy --workspace --all-targets -D warnings`;
  `cargo test -p lts-langpack` (word_timings-style lemma sidecar tests) and
  `cargo test -p lts-desktop --lib` (word_card / story_word_audio tests incl.
  хле́ба → хлеб); `python3 -m unittest` for the table script;
  `lts-langpack-cli validate`+`test` on ru (after audio restore, --verify-only).
- F: `npx tsc --noEmit`; `npx vitest run` (reading tests + journeys
  repinned to the paragraph structure); `tools/audit_learner_copy.py` 0.
- Controller: `python3 tools/validate_handoff.py --require-explicit-ledger-records`
  before push; `tools/measure_language_coverage.py` untouched.

## Evidence
Controller writes `state/evidence/READER-FLOW-001/gates.log` (own re-runs +
race notes); task-state points at that path only.

## OFF-PACK SLICE (landed 2026-11-20) — kaikki.org aux lexicon
License check (done, not assumed): kaikki.org publishes its Wiktionary
extraction "under the same licenses as Wiktionary — both CC-BY-SA and
GFDL" (https://kaikki.org/dictionary/, "Copyright and license", accessed
2026-11-20). Redistribution with attribution is allowed; ShareAlike keeps
the derived slice CC-BY-SA/GFDL, which is why it stays a SEPARATE file
from the MIT pack lexicon ("separate and trusted" holds). Attribution
text: "Definitions from Wiktionary via kaikki.org (CC BY-SA / GFDL)" —
displayed on every aux card, recorded in the slice provenance +
`aux/lexicon/README.md`.

- Builder: `scripts/build-aux-lexicon.py --write --input <kaikki.jsonl>`
  / `--check`. Input: kaikki.org Russian dictionary (enwiktionary
  extraction, English glosses), 948,499,874 B, sha256
  9078947aa21ed33ccfe9ada814fa70605c282a26bc0b7d60e388865da17984b7
  (pinned in `aux/lexicon/ru.provenance.json`; raw input not committed —
  `--check` proves the committed slice matches the pin and is
  internally valid; wired into `scripts/ci.sh`).
- Slice: `aux/lexicon/ru.jsonl`, 405,825 headword rows (72 MB
  git-tracked; trim candidates if size ever matters: frequency-ranked
  selection would be its own card). Rules in provenance.slicer:
  ru-only, no redirects/proper names/archaic/dialectal entries, no
  hard-sign forms, ≤3 sense glosses truncated at 200 chars, ≤12
  inflected lookup forms, byte-order deterministic.
- Wire: `WordCardView` gains `aux_word/aux_gloss/aux_pos/aux_source`,
  set only when the pack lexicon missed AND the slice answered. Pack
  fields never carry aux answers; the frontend renders the aux branch
  under its own label with the attribution inline; Mine stays offered.
- Contract extension: a sidecar-resolved lemma now stays on the
  off-pack card (pack's own lemmatizer truth) where the old text said
  "everything else None" — the pack-lexicon-vouched fields (surface,
  reading, gloss, status) still stay None. Existing rust test updated
  to assert the new contract.
- Lookup: `word_card_at` → pack lexicon miss → target_locale subtag
  names `aux/lexicon/<lang>.jsonl`; candidates: `<data>/aux/lexicon/`,
  repo tree (dev), bundle resource `aux/lexicon` (stage-pack-bundle.sh
  overlay now maps it). Headword/inflected surface of the query first,
  then the sidecar lemma. No file → honest bare card (ja today: no ja
  slice). Never network.
- Tests: 14 python (synthetic entries + write/check roundtrip), 3 rust
  (labeled aux card, lemma-routed hit, no-slice degradation), 1 vitest
  (labeled render + attribution + Mine).
