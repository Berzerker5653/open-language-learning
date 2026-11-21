# LETTER-TEACHING-DESIGN-001 — how the app teaches a writing system

Decision date: 2026-11-21 (owner dogfood session, complaints 1–4). Owner call: "we're learning the letter A, not two versions of A." Verified by research; this file is the authority for letter/kana drill generation.

## Verdict

**The teaching unit is the LETTER = one grapheme + one sound.** Its written forms (uppercase/lowercase where a script has them) are ATTRIBUTES of that one letter, shown together ("А а"), never drilled as a discrimination skill. Case exists in only a handful of scripts (Latin, Cyrillic, Greek, Armenian); most scripts — kana, hangul, Bopomofo, Hanzi — are unicameral and have no case dimension at all. A generator that emits case drills treats a Latin-specific accident as universal. It is wrong for Russian and nonsense for Japanese.

## Evidence

- Systematic phonics guidance (improvingliteracy.org, NCIL): letter-sound correspondence is the core unit; forms are introduced together per letter; visually similar or auditorily confusing letters must be **separated and staggered** in the sequence.
- Grapheme-phoneme consensus (fivefromfive.com.au, citing Kilpatrick 2016 / Nation 2017): decoding is the core of alphabet literacy; practice targets letter↔sound automaticity, not letter-property metadata.
- Adult Cyrillic acquisition (Kiskin 2018, U. Colorado, summarized at fluentea.com): adults learn a new alphabet in ~a day via letters OR whole familiar words; the hard part is **false-friend homoglyphs** (В=v, Н=n, Р=r, С=s, У=u) — letters that look Latin but map differently. Case discrimination of homoglyph pairs is not a measured skill.
- Japanese writing system (japanese.stackexchange.com q87458, Kuwashii, Columbia AFE): kana are mora units (syllabary), no case; small kana (ィ in ティ) behave like diacritics — sound modifications of the previous mora, not case; hiragana vs katakana are parallel sets, not upper/lower (explicitly rejected as a case analogy).

## Design rules (binding for drill/item generators)

1. `letter` entity = { grapheme(s), name, sound }; forms carry a `case` attribute from the SCRIPT model (`bicameral` | `unicameral`), never hardcoded Latin assumptions.
2. Drill dimensions allowed: letter→sound, sound→letter, form-in-word recognition, and confusable-pair discrimination. BANNED as drills: case matching, "appearance" of a letter, any item whose copy is letter-property metadata.
3. For bicameral scripts, present "А а" jointly as one unit; recognition practice uses real printed words from the level's vocabulary.
4. Sequence confusable/false-friend letters apart (stagger visually similar pairs), per phonics practice.
5. `unicameral` scripts (ja kana included) generate zero case/upper/lower concepts anywhere in UI or scheduler; small kana model as `variant` with its own sound mapping, not case.
6. Any generated learner-visible string that fails to interpolate (stray ":", property words like 'uppercase'/'appearance', debug strings like 'h: find guide') must hard-fail `tools/audit_learner_copy.py` — ratchet, not vibe.

## Affected

- Board cards: LETTER-DRILL-TEXT-001 (t_ec7f6a92) fixes the current broken screens; LETTER-UNIT-MODEL-001 implements this model.
- Evidence: state/evidence/DOGFOOD-2026-11-21/ (owner screenshots, complaints 1–4).
