# READING-STORY-UX-001 — why "story reading" doesn't make sense, and what to build instead

Status: RESEARCH ONLY (owner 2026-11-17: "this needs more research done before we fix it").
No code changed for this note. Origin: owner's live UX report after clicking the
CONTENT-CONFIRM-001 buttons on all three RU stories.

## What the owner reported
1. There is no "true story" — no paragraph to read through.
2. The mental model they want: read a paragraph → stop at an unknown word →
   click THAT word → dictionary card (Kindle's lookup + Vocabulary Builder).
3. It takes ~4 clicks to get one sentence's audio.
4. Sentences within one story are read by different people ("four different
   people") — incoherent for reading practice.

## Audit — all four complaints are real, with numbers
1. **No stories.** `languages/ru-RU/stories/*.yaml` are lists of reused
   content-parity sentence ids ("ai-drafted content-parity story ...
   sentences reuse the content-parity sentence shard"). e.g. "На рынке" is
   six sentences only loosely on-theme; other reuse is looser. The "story"
   is a re-bundle, not a written narrative.
2. **No word tap.** The reader shows a column of whole-sentence buttons;
   tapping plays audio and opens a bulk list of *pack* lexicon entries that
   match the sentence. There is no click-target on the specific word that
   stopped the learner, and words outside the pack cannot be looked up at
   all. `media/words.jsonl` ALREADY has word-level alignment timestamps per
   sentence — the substrate for word-level tap+play exists.
3. **Click count.** Story list → open story → sentence row (plays + opens
   lookup) → per-word buttons inside the opened panel. ≥3-4 interactions
   for one word's audio.
4. **Mixed narrators (quantified).** Sentence audio in the RU pack:
   785 × qwen3-tts `ono_anna`, 39 × Piper `ru_RU-ruslan-medium` (male),
   1 × Piper `ru_RU-irina-medium`. All three stories interleave
   `ono_anna` with `ruslan` (e.g. morning-of-anna: anna, anna, ruslan,
   anna, anna). The piper rows are from the 2026-10-12/10-21 generation
   batches, never re-baked when the pack standardized on ono_anna. Voice
   consistency was never a bake gate — add it.

## How Kindle actually works (research, Nov 2026 sources)
Two separate features, often confused:
- **Dictionary lookup**: press-and-hold any word → definition card in place,
  no navigation, reading continues with one tap away.
- **Vocabulary Builder**: every looked-up word is logged AUTOMATICALLY —
  `vocab.db` (SQLite) with WORDS (surface, dictionary base form, language,
  mastered flag) and LOOKUPS (the exact sentence it sat in, book, time).
  Flashcards show the word WITH ITS ORIGINAL CONTEXT SENTENCE; "Learning"
  vs "Mastered" state. No definitions stored — the sentence context is the
  durable artifact ("what you actually want back is the paragraph where it
  stopped you" — getsapiens analysis of vocab.db).
Key transferable insight: **the lookup IS the learning signal.** Kindle
needs no "mine this word" ceremony; the log of what stopped you becomes
the syllabus, with context preserved for review.

## Design proposal (for owner decision, then a task)
Phase A — content truth:
- Write real continuous stories per level (paragraph-level units, one
  narrative arc, ~5-10 sentences, new sentence ids, not shard reuse).
  Keep the story yaml shape; sentences become story-owned.
- Re-bake the 40 mismatched narrator sentences to the story's voice
  (ono_anna for RU), and add a bake gate: one story = one voice,
  reject manifest rows whose voice differs from the pack's standard.
Phase B — Kindle-style reader (desktop):
- Render the story as flowing paragraphs (PackText), not a button column.
- Sentence tap = play that sentence (one click).
- Word tap = dictionary card at the word: gloss + pack entry status +
  word-level audio slice (from words.jsonl alignment). For RU this needs
  lemmatization of inflected forms (pack surfaces are nominative lemmas;
  today's greedy span matcher misses хле́ба→хлеб). Rust-side options:
  an open lemmatizer table from pymorphy3/zalmanov generated at pack
  build time (build-time = no runtime dep, deterministic, testable).
- Out-of-pack word: card says "not in your pack yet" + Mine button.
  Open-source fallback glossary candidate: kaikki.org (machine-readable
  Wiktionary JSONL, open license) shipped into the pack as an auxiliary
  lexicon — separate from pack-trust lexicon, clearly labeled.
Phase C — Vocabulary Builder analogue (fits existing machinery):
- Every word tap auto-logs a lookup (surface, lemma, story, sentence) —
  same storage pattern as the CONTENT-CONFIRM-001 confirm ledger.
- Looked-up words auto-enter the existing review pipeline (they are
  exactly "my words" minus the manual mining step); drills replay the
  CONTEXT SENTENCE, like Kindle flashcards.
- Keep manual "Mine" until Phase C lands; then Mine becomes optional.

## Owner clarification (2026-11-17, same day as feedback)
Reading and listening are DIFFERENT modes with different audio rules:
- Reading exercise = the learner reads; they highlight/select a word they
  don't know -> definition appears -> optional play button hears THAT word.
  A different-sounding voice for word snippets does not matter.
- Continuous story narration = LISTENING, not reading, and there the whole
  story must be one voice.
Design consequence: the reader's primary interaction is word selection +
definition + word audio (word-level timestamps already exist in
`media/words.jsonl`). Sentence/story narration is a separate, later
"listen mode" whose only hard requirement is one narrator per story.
The 40-clip re-bake (VOICE-CONSISTENCY-001) serves listen mode and stays
worth doing, but is NOT on the critical path for the reading exercise.

## Explicitly NOT doing
- No implementation yet (owner: research first).
- Not deleting the sentence-shard stories until replacement narratives
  pass the same content gates; they're draft-status either way.
- No online dictionary calls from the app — offline tables only.

## Open questions for the owner (non-blocking, defaults chosen)
1. Replace the three fake stories with written ones, or fix audio+reader
   first and accept the weak stories meanwhile? (default: fix audio first —
   it's 40 clips, same bake tooling)
2. One narrator per pack (ono_anna) or per story with a named narrator per
   story shown in UI? (default: one per pack now, per-story later)
3. Auto-log lookups (Kindle) vs keep manual Mine? (default: auto-log,
   matches how the owner actually reads)

## Related
- CONTENT-CONFIRM-001 (confirm ledger = storage pattern to reuse)
- PACK-AUDIO-VERIFICATION-001 (bake pipeline; add voice-consistency gate)
- K-80 / JA-FUNCTION-WORD-LOOKUP-001 (span matcher to extend for RU)
