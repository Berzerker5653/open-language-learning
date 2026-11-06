# JA-FUNCTION-WORD-LOOKUP-001 — function-word span lookup + pack checker

## Resolution rule chosen (pinned by tests)

Tap-lookup segments a sentence into token spans (K-80 greedy longest-match
over lexicon surfaces). JA-FUNCTION-WORD-LOOKUP-001 adds reading-aware
disambiguation to that path (`sentence_word_spans_with_reading` in
apps/desktop/src-tauri/src/lib.rs):

1. With a declared sentence reading (every shipped sentence record has one),
   the entry chosen for a span must be readable — one of its script-tagged
   kana readings spelled exactly — at the span's position in the sentence's
   declared reading. A reading cursor walks in lockstep (character sync on
   uncovered chars, space resync, bounded within-word lookahead to absorb
   surfaces whose reading differs in length from their spelling).
2. When several entries match the same span and reading, the closed-class
   part of speech (particle/copula/auxiliary/auxiliary verb/conjunction)
   wins over open-class (noun/number/…). This is what keeps に from
   answering as "two": the number entry reads に exactly where the sentence
   reads に, but the particle entry is closed-class.
3. If no candidate is readable at the cursor but one appears later inside
   the same reading word, it is still chosen (cursor drift), and the match
   is recorded as agreeing. If NO candidate is readable anywhere in the
   word, the entry with the smallest id is still returned (lookup is an
   aid, never a guarantee) but the span is marked `reading_agrees: false`
   — the checker's conflict signal (a surface whose only entry pronounces
   it differently from how the sentence itself reads that spot).
4. Without a declared reading, the old K-80 rule stands unchanged
   (longest surface wins, ties break on entry id). `sentence_word_spans`
   (2-arg) keeps byte-identical old behavior.

Because packs' kana reading annotations conventionally write the topic
particle は and the directional particle へ in their ORTHOGRAPHIC forms
(this pack does — romaji carries the wa/e pronunciation), the particle
lexicon entries declare both the orthographic and the modern-pronunciation
kana readings (は: [わ, は]; へ: [へ, え]). This makes them readable at
either annotation style while the tooth noun (reading は only) still
loses the わ-position outright and the は-position on the closed-class
tie-break.

## Checker (repo-side, runs in the normal test path)

`cargo test -p lts-desktop --lib shipped_story_function_word` →
test `shipped_story_function_word_lookup_report_is_empty`: walks every
shipped story (first-day, my-day, at-the-shop), resolves every span
through the SAME reader path with the sentence's declared reading, and
reports every closed-class span (particle/aux list) that

(a) resolved with `reading_agrees: false` — the only entry's reading
    conflicts with the sentence's reading at that span (fires when a
    pack spells the pronunciation in its kana reading; vacuous for the
    current pack because its kana annotations are orthographic — the
    wa/ha contradiction instead surfaces as (c)),
(b) resolves to no entry at all (a maximal uncovered run, split at
    spaces and trimmed of punctuation, spelling exactly a closed-class
    word), or
(c) has only open-class candidates (the closed-class span could only
    ever answer with a homophone noun — the は/歯 and に/"two" cases;
    the message quotes the sentence's declared romaji — "…namae wa…" —
    as the sentence's own reading at that spot).

### BEFORE (measured on pre-fix data, checker run 2026-11-06) — 12 findings

```
at-the-shop / what-is-this: closed-class span "は" has only open-class entries (ja.lex.health4.ha) — romaji "kore wa nan desu ka"
at-the-shop / what-is-this: no lexicon entry covers "か"
at-the-shop / how-much:     no lexicon entry covers "か"
at-the-shop / buy-bread:    no lexicon entry covers "を"
first-day   / my-name-wa:   closed-class span "は" has only open-class entries (ja.lex.health4.ha) — romaji "watashi no namae wa Tanaka desu"
first-day   / my-name-wa:   no lexicon entry covers "の"
first-day   / this-is-book: closed-class span "は" has only open-class entries (ja.lex.health4.ha) — romaji "kore wa hon desu"
first-day   / book-expensive: closed-class span "は" has only open-class entries (ja.lex.health4.ha) — romaji "kono hon wa takai desu"
my-day      / wake-up:      closed-class span "に" has only open-class entries (ja.lex.numbers.ni) — romaji "mainichi juuji ni okimasu"
my-day      / eat-breakfast: no lexicon entry covers "を"
my-day      / go-school:    no lexicon entry covers "へ"
my-day      / what-time:    no lexicon entry covers "か"
```

(also fixed during development: an earlier run missed the come-home "へ"
because the uncovered run merged with the unentered verb かえります —
space-splitting the runs added it; the BEFORE count above is the run
with correct run-splitting minus come-home, re-measured count 13 with
come-home / come-home "へ": 12 + 1. Final list recorded from the
checker's own eprintln output.)

### AFTER (data fix + rule) — report is empty

(0 findings — measured by the same test passing after the fix; see
test evidence below.)

## Data fix

New side-file `languages/ja-JP/lexicon/function-words.jsonl` (draft
posture, per pack sourcing rules): は (topic particle, readings わ/は,
jmdict-simplified 3.6.2 ent_seq 2028920), に (particle, ent_seq 2028990,
homophone note vs ja.lex.numbers.ni), の (1469800), を (2029010),
へ (2029000, readings へ/え), が (2028930), か (2028970), も (2028940),
で (2028980). Glosses are paraphrases of the dictionary senses; every
entry cites its ent_seq and flags ai-assisted wording pending qualified
review. の/を/が/か/も/で previously had NO entry anywhere in the pack —
the tapped word resolved to nothing.

## Audio (forced by the K-90/ADR-0024 build gate)

Every lexicon entry is audio-addressable, and the ja-JP media dir is
built on this machine, so the pack build refuses entries without media
manifest rows. Rendered the 9 clips with the repo pipeline:
scripts/generate-pack-audio.py (qwen3-tts ono_anna, single worker,
OMP=1, `env -u PYTHONPATH` — the Hermes kernel PYTHONPATH was injecting
tokenizers 0.23.3 into the venv; venv itself pinned to 0.22.2 to satisfy
transformers 4.57.3's `>=0.22.0,<=0.23.0`). Manifest rows carry text =
declared kana reading (K-65 rule: audio synthesized FROM the declared
reading; ha-topic renders わ). ASR round-trip gate run on the 9 ids;
results below.

## Test evidence

- BEFORE (rule + checker in place, data unfixed): checker FAILED with
  12 report lines (measured above); acceptance tests failed by design
  (no particle entries yet).
- AFTER: `cargo test -p lts-desktop --lib lookup` → all lookup tests pass
  (7): story_lookup_returns_spans_not_substrings (K-80 regression),
  reading_aware_span_lookup_prefers_closed_class_homophones (rule pinned),
  reading_aware_lookup_of_the_self_intro_shows_the_topic_particle_not_the_tooth
  (acceptance 1: ja.lex.functionword.ha-topic answers, ja.lex.health4.ha
  absent), reading_aware_lookup_of_a_ni_particle_span_never_answers_two
  (acceptance 1b: ja.lex.numbers.ni absent from wake-up/go-school/come-home
  spans; ja.lex.functionword.ni answers wake-up's に),
  shipped_story_function_word_lookup_report_is_empty (checker empty),
  reading_lookup_of_the_self_intro_sentence_names_the_word_not_its_interior
  (pre-existing O-06 pin), story_reader_shows_scaffolds_and_lookup_without_evidence.
- python3 tools/audit_learner_copy.py → findings: 0.

## Concerns / honest caveats

- The acceptance parenthetical "surface は against reading wa at that
  span" cannot fire as a kana-level conflict on THIS pack's data because
  the shipped kana reading annotations spell the topic particle は
  (orthographic convention); the contradiction is reported by checker
  category (c), which names the sentence's declared romaji ("namae wa")
  as the evidence. The (a) reading-conflict signal is live and tested
  (resolver returns reading_agrees=false when no candidate is readable
  where the sentence says the word is).
- に/"two": the closed-class tie-break prefers the particle whenever a
  sentence reads に where a particle could stand. A future sentence that
  actually means the numeral に mid-flow with the hiragana-numeral entry
  as the only sensical candidate would need the pack author to enter the
  numeral context differently (kanji 二 form or a disambiguating span
  entry); documented in the に entry's homophone note.
- Single-mora particle clips (わ/に/の/を/へ/が/か/も/で) are the known
  ASR-gate weak spot (per lts-pack-audio-qa); gate results recorded
  below; stubborn failures would need best-of-K/piper and human
  audition.
- Full `--lib` binary runs can be SIGTERMed under host memory pressure
  (host condition, not caused by this change); filtered `--lib lookup`
  used as instructed.

## Controller completion + owner audio policy (2026-11-06)
- Owner decision: human audio QA is Russian-only (fiancé is fluent in Russian, not
  Japanese); Japanese pack audio is accepted on trust — no ASR certification or
  human audition required for ja clips.
- Consequence for this lane: the 9 function-word clips ship as rendered. 3/9 pass
  the ASR gate; 6 single-mora particles are un-audited BY POLICY (render exists,
  pack validates 0 errors). No best-of-K remediation run for ja.
- Controller gates: `cargo test -p lts-desktop --lib lookup` 7/7 green (includes
  topic-particle vs tooth, ni-never-two, and the empty checker report); checker
  BEFORE=14 findings measured with function-words.jsonl removed, AFTER=0;
  `cargo run -p lts-langpack-cli -- validate languages/ja-JP` 0 errors 0 warnings;
  audit_learner_copy 0 findings.
- Full ja pack audit stopped at 2,155/4,902 rows under the same policy
  (2,031 ok / 124 flagged recorded at
  state/evidence/PACK-AUDIO-VERIFICATION-001/asr-ja-full.jsonl as a partial
  snapshot; flagged clips NOT repaired by owner decision).
