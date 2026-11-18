# WORD-CARD-AUDIO-001 — how word cards present inflected forms + audio (research, 2026-11-18)

Owner question: stories show inflected forms ("кошке") but the pack has one clip per
dictionary word ("кошка"). What do the best apps do, and do we need to bake a clip for
every word FORM?

## Verdict (recommended default)
1. TEXT side — the owner's intuition is exactly the winning pattern: the card answers
   "printed form → dictionary form + meaning + WHY it changed". Yomitan (the reference
   tool for inflected-language reading) does precisely this: it deinflects to the lemma
   and "shows you the base word plus how it got inflected." Our GRAMMAR-LABELS-001 card
   already supplies the same grammar annotation inline (case+number under nouns,
   aspect+tense under verbs). Word card = printed form · stress · lemma · meaning ·
   grammar line ("dative singular of кошка").
2. AUDIO side — three mechanisms exist in the wild; NO mainstream tool bakes clips per
   inflected form:
   - Dictionary-form clip (Yomitan's JP audio sources): heard word ≠ printed word.
     Acceptable fallback, not the primary.
   - Runtime TTS of the surface form (LingQ "play the word's TTS audio", Readlang):
     hears the exact form, but requires TTS in the app — BANNED here by the owner's own
     TTS-004 decision (packs are the only audio source; offline-first).
   - Exact-form recordings from Forvo (the "largest online pronunciation database",
     addable as a custom audio source): covers declined Russian forms, but is a heavy
     external DB with per-file licensing — not worth importing now.
   The offline-clean fourth path, which our repo ALREADY ships (WORD-TIMING-001/002 done
   for ru): slice the exact printed form out of the sentence's existing clip via the
     word-timing sidecar (`media/words.jsonl`). Zero new clips, exact form, zero runtime
     TTS. This is READER-FLOW-001's current contract.
3. Per-form baking is the WRONG play at scale: Russian inflects ~10 forms per noun
   (6 singular + plural cases) and ~6+ per verb; 4,015 lemmas would mean a ~40k-clip
   corpus vs 4,015 lemma clips (4015/4015 verified covered today) — 10x audio for a
   marginal gain over slicing. Keep lemma clips (they exist) as the fallback when
   timing is absent for a sentence; card labels then show the dictionary form.

## Card spec to build (supersedes nothing; feeds READER-FLOW-001 + VOCAB-BUILDER-001)
- Tap word → card: printed form with stress, lemma, gloss, grammar labels
  (case/number or aspect/tense), + PLAY.
- PLAY resolves: (a) exact form sliced from the sentence clip via word timings;
  (b) else the existing ru.lex.* lemma clip (card visibly names the dictionary form);
  (c) off-pack word → offline aux-lexicon card, clearly labeled (kaikki.org plan),
  no audio promised.
- Lookup logging (VOCAB-BUILDER-001) is unchanged by audio choice.

## NOT doing
- No per-inflected-form baked clips.
- No runtime TTS (TTS-004 stands).
- No Forvo/external audio DB import (licensing weight, network calls violate
  offline-first).

## Evidence
- Yomitan: shift-hover lookup, automatic deinflection to dictionary form with the
  inflection path shown, native audio from configurable sources (JapanesePod101/Jisho,
  Forvo addable). tooltivity.com/extensions/compare/yomitan-vs-migaku; yomitan.wiki;
  j-compass.com yomitan-setup.
- LingQ: word popup hints + "play the word's text-to-speech audio" shortcut; sentence
  view = sentence translation + sentence audio + vocab list (forum.lingq.com,
  lingq.com iOS support).
- Readlang: click-to-translate + TTS word/phrase playback (tooltivity comparison).
- Migaku: immersion suite, word lookups + flashcards with audio; leans on prebuilt JP
  audio DB / TTS elsewhere.
- Repo facts: ru pack 4,015 lexicon entries with 4,015 matching clips + 849 sentence
  clips + words.jsonl sidecar (verified 2026-11-18); TTS-004 owner decision
  (no runtime TTS); WORD-TIMING-001 ru shipped, 002 converged (ja 55.6% floor,
  WORD-TIMING-003 owner-gated).
