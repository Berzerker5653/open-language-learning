# 06 — Japanese Reference Language Pack

## Purpose

`ja-JP` is both the first real course and the conformance example proving that the engine can handle a language structurally unlike English.

## Reference variety

Start with broadly taught standard Japanese with a Tokyo-oriented pronunciation reference where necessary, while documenting regional/social variation and avoiding the claim that one natural variety is the only valid Japanese.

Use the declared `standard-japanese` variant ID consistently in identity, phonology, speech profiles and calibration records. The Tokyo orientation describes a teaching reference; it does not turn every natural regional realization into a learner error. Accepted variants require reviewed context and evidence, rather than an empty list being treated as a prohibition on all variation.

## Curriculum framing

Use Japan Foundation JF Standard Can-do concepts as the main Japanese functional framework. The JF Standard uses CEFR-aligned A1–C2 levels and practical Japanese Can-dos, with JF-specific activity descriptors available particularly through A1–B2.

Do not copy restricted course content wholesale. Build original activities and examples backed by sources and review.

## Zero/on-ramp design

A learner with no Japanese should be able to begin immediately without first completing weeks of kana drills.

Early content combines:

- listening and meaning;
- first interaction routines;
- basic pronunciation awareness;
- hiragana introduction;
- temporary romanization where useful;
- simple word order/particles in context;
- culturally appropriate interaction basics.

Romanization must fade rather than become permanent dependency.

## Orthography

Support:

- hiragana;
- katakana;
- kanji;
- Arabic numerals and common Latin-script use;
- furigana/ruby annotations;
- mixed-script Japanese text.

Track character recognition, reading in words, and production separately.

Do not treat isolated character memorization as equivalent to reading comprehension.

## Hiragana/katakana

Teach symbol-sound mapping in parallel with useful language. Include:

- base kana;
- dakuten/handakuten;
- contracted sounds;
- small っ;
- long-vowel conventions;
- katakana conventions for loanwords;
- common orthographic exceptions/realizations.

## Kanji

Introduce kanji by communicative/readability value and frequency/context, not solely by an arbitrary list order. Track:

- recognition of the character in known vocabulary;
- readings in context;
- semantic associations;
- writing ability if enabled.

The project may use appropriately licensed dictionary data such as JMdict/KANJIDIC under their applicable EDRDG CC BY-SA terms, with attribution and share-alike implications documented for derived dictionary data.

## Phonology/prosody

The Japanese pack must model at least:

- vowels;
- consonants relevant to learner feedback;
- moraic nasal;
- geminate consonant/small っ;
- long vowels;
- devoicing behavior as an advanced/reference topic where appropriate;
- mora timing/rhythm;
- pitch accent as a teachable/assessable feature only to the extent reliable data and models support it;
- phrase/sentence intonation.

Word accent information and phrase-level F0 targets are different data. Record the utterance/context and relevant following material for pitch contrasts; do not score natural phrase contours against an isolated-word dictionary pattern. Devoiced vowels and other unvoiced regions have unavailable F0, not a low-pitch target. Timing instruction should explain contrasts and rhythm without claiming every mora is acoustically equal in duration.

## Grammar/content dimensions

The curriculum graph should eventually cover, at appropriate levels:

- basic predicate types;
- copular constructions;
- particles and their discourse roles;
- question formation;
- demonstratives;
- possession/nominal modification;
- adjective behavior;
- verb classes/conjugation;
- tense/aspect/polarity;
- counters/quantification;
- requests/permissions/obligations;
- て-form families;
- comparisons;
- conditionals;
- relative clauses;
- giving/receiving;
- modality;
- transitivity pairs;
- passive/causative as level-appropriate;
- reported speech;
- nominalization;
- connective/discourse structures;
- politeness/honorific/humble systems;
- colloquial contractions/register variation;
- ellipsis/context-dependent omission;
- interactional particles and discourse markers;
- advanced written/spoken style differences.

This is a coverage checklist, not the teaching order.

## Pragmatics

Teach contextually:

- self-introduction conventions;
- turn-taking/backchanneling;
- directness/indirectness;
- requests and refusals;
- service encounters;
- forms of address;
- politeness/register choices;
- clarification/repair;
- common spoken vs written differences.

Avoid reducing Japanese communication to stereotypes. Mark variation by relationship, setting, age/generation, region, and individual style where relevant.

## Listening progression

Progress through:

- careful reference speech;
- natural but constrained speech;
- different speakers;
- varied phrasing;
- realistic reductions/connected speech;
- background context/noise only after core comprehension is established;
- longer discourse and authentic materials at advanced stages.

Offer pitch-preserving playback-speed control and replays where supported. Record slower playback, captions and other assistance as support; independently comprehending natural-speed speech is a separate evidence condition. Reference/TTS audio must be checked in its actual lesson context before use as a pronunciation target.

## Speaking progression

Progress through:

- imitation;
- slot substitution;
- prompted recall;
- intent-based production;
- dialogue turns;
- scenario completion;
- spontaneous repair/clarification;
- extended connected speech.

## Reading progression

- supported kana/known words;
- short messages/signs/menus;
- graded dialogue/narrative;
- practical documents;
- progressively authentic texts;
- advanced genre/style coverage.

Use furigana adaptively: visible when needed, hideable at higher mastery, and available on demand.

## Writing progression

Separate:

- selecting/typing via IME;
- recalling kana/kanji forms;
- handwriting where the device supports it;
- composing messages/sentences/discourse.

Handwriting should not gate speaking proficiency.

## Sources

Candidate foundational sources are listed in `docs/SOURCES.md`. Each imported dataset must pass the license audit before use. Reference-only sources may inform human/AI research but cannot be copied into distributed content unless rights allow it.

## Content review

Japanese `reference` status requires review by qualified/native or near-native reviewers according to a documented sampling/coverage plan. Automated tests can find structural errors but cannot certify nuanced naturalness alone.

Review also requires relevant linguistic/pedagogical expertise for the task; native-speaker status alone is not a review protocol. Apply `docs/16_CONTENT_AUTHORING_AND_REVIEW.md` to content and `docs/17_SPEECH_BENCHMARK_PLAN.md` to automatic feedback. Current seed items, missing assessments and pronunciation data are explicitly draft. No review qualification, course completeness or speech calibration has been established by this handoff.
