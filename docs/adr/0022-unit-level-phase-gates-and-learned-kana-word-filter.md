# ADR 0022: Unit-level phase gates and the learned-kana word filter

Status: Accepted (policy ordered by the owner via kanban K-70, 2026-10-09; owner
acceptance is the owner's word per the card; engine implementation rides the
next verified build)
Date: 2026-10-09

## Context

A fresh ja-JP profile's day-1 Home Today taught hiragana あ・い・う, then the
same three sounds in katakana, then パン — three policy violations in one
screen. Three independent causes (kanban W-02 / K-70): the day-1 plan was a
flat pack-order walk with no unit-level phase gate; the word-selection layer
took any pack word regardless of whether the learner had been shown any of its
letters; and the kana-comparison path (`learned_kana`) ignored the pack's
declared reading. K-72 independently made kana cards first-class NEW items,
which is what lets a word filter be keyed on the same unit-scoped states the
cards themselves accumulate.

Constraints: no hard-coded scripts in the engine (`docs/00_MASTER_SPEC.md`
non-negotiable, 17/18/23); the language boundary — "which letters exist and
what form carries them" stays pack-declared — while "you may not meet letters
you were never introduced to" is the universal engine invariant; the pack
validator's posture for unsatisfiable unlock rules is Error in every mode
(ADR-0018); packs remain the only source of language specifics (ADR-0021).

## Decision

Two mechanisms, both engine-side, both parameterized entirely by pack data.

**1. `requires_unit` — the unit-level phase gate.** A unit may declare a
non-empty array `requires_unit: [{unit: <unit id>, state: <masteryState>}]`
(unit.schema.json v0.2). Its meaning: this unit's content is NEW material only
when, for EVERY gate, every content item that the named unit references has
derived state ≥ the required state (max over dimensions, matching `docs/03`'s
"advanced content requires prior units' items at Introduced or better").
ja-JP declares gates on `ja.unit.kana-katakana` against all five hiragana
chart units at `introduced`, so katakana becomes NEW material only after the
whole hiragana chart (vowels, s/t/n, h/m/y/r/w, dakuten, yōon) has been
introduced; the first hiragana unit has no prerequisites and nothing else is
gated, so day-1 content is unchanged elsewhere. The filter applies to the NEW
pool only — due reviews and already-introduced items keep scheduling normally
(a lesson you can cancel is not a gate). Because the reference pack's own
on-ramp goal-order rule makes goal-level unit gating redundant for kana, the
unit gate, not a goal rewrite, is the enforcement point (the katakana goal's
prerequisites stay at `helpful` strength; goals.yaml is untouched).

Validator posture, mirroring ADR-0018: a gate that can never pass —
self-reference (`unit_gate_self_reference`), a target id that is not a declared
unit (`unit_gate_not_a_unit`), or a unit participating in a gate cycle
(`unit_gate_cycle`, reported per participant) — is an Error in every mode; a
gate on an undeclared id travels the existing `unresolved_reference` path
(scaffold Warning, install Error). The states are the closed v0.2
`masteryState` enum (schema-validated).

**2. The learned-kana word filter.** A word item (a lexicon entry entering the
NEW pool, by any route) is eligible only when every kana character of its
declared kana form is *learned kana*: the symbol of a pack-declared
orthography entry that belongs to a unit whose phase gates hold, whose derived
state is ≥ Introduced in any dimension. The kana form is the entry's primary
form text when it contains kana, otherwise its declared `reading` (the pack's
orthography layer, never transliteration). The rule is universal ("words are
made only of letters you have been taught"); the letter inventory is
entirely pack-declared: a non-kana pack (ru-RU) constrains nothing because its
scripts have no kana inventory. A word whose declared forms contain no kana at
all (e.g. a romanized entry) is not a kana word and is not filtered — "fail
closed" means no kana is ever invented, not that kana-less words are excluded;
excluding them would invent an engine-side notion of the writing system.

Normalization for matching a word's character to a learned symbol
(implemented dependency-free in the engine; to be specified in `docs/08 §3`
with the v0.3 pack-side declaration slot):

- Dakuten/handakuten fold to their base: が→か, ぱ→は, ガ→カ — learning は
  counts for ぱ and パ.
- Small kana fold to their full-size base: ゃ→や, ャ→ヤ→や, ッ→つ.
- Katakana folds to hiragana by kanainic identity (Unicode block offset):
  コ→こ, so a katakana word rides on learned hiragana; a hiragana-only word
  is likewise covered by a learned katakana symbol.
- ん/ン deliberately do NOT fold: the moraic nasal is a distinct letter
  (パン is gated on it explicitly). ー likewise must be declared and learned
  as itself; the current ja-JP pack declares no ー, so ー-words (コーヒー)
  stay out of the NEW pool until the pack declares the mark — fail closed,
  faithful to the pack data. ・ and other punctuation are never checked;
  half-width forms are out of scope for the current packs.
- Multi-character orthography symbols ( Pack: きゃ) contribute every
  character to the learned set.

The learned set is unit-scoped exactly like the phase gate: a symbol counts
once its declaring unit's gates hold and the symbol's entry is ≥ Introduced —
so the same unit progression that unlocks the katakana cards unlocks
katakana-riding words in the next planner pass.

## Consequences

- Day-1 ja-JP Today contains no katakana and no kana words at all: the only
  words that exist in ja-JP are written in kana, and with zero learned kana
  the filter seeds none. First words arrive as their letters' units progress
  (the vowels unit introduces its cards immediately). This is the policy as
  written; if it feels austere the tuning knob is pack data (word choice per
  unit), not the engine.
- Words now reach the NEW pool through both the lexicon walk and the goal
  progression stream; the filter is applied to both, so a `required_concept`
  word cannot smuggle unlearned kana in (the exact leak `こんにちは` showed
  during development).
- Review and due items are deliberately unfiltered: a learner who once knew
  パン keeps seeing it even though a redesign of the pack later gates it.
- The validator now needs pack-level unit knowledge (`unit_ids`) and a gate
  cycle check; cost is ~90 lines in `pack.rs` plus one shared reference path.
- Verification: validator tests (`crates/langpack/tests/unit_gates.rs`, 7
  tests: clean gate, self-gate, non-unit target, two-unit cycle, dangling
  target across modes, schema-enumerated state, and the ja-JP katakana
  declaration itself); planner regression tests in the desktop engine pin
  day-1 (no katakana, no kana words, including goal-path words), unlock
  (after all hiragana content is introduced, katakana cards and katakana-riding
  words appear; パン appears with ん, さかな is gated on the h/m/y/r/w unit),
  the normalization table, and the declared-form resolution. Full suite
  `cargo test --workspace` plus all pack conformance gates green.
- Follow-up: a `requires_kana` field on lexicon.schema.json v0.3 so a pack can
  declare a word's kana dependencies directly instead of relying on the
  derived kana-form rule; `docs/08 §3` normalization spec; day-1 pacing
  calibration after W-01 ships.

## Alternatives considered

- **Engine-side hard-coded kana ordering** — rejected: violates the
  language-in-the-pack boundary (`docs/00_MASTER_SPEC.md` 17/18).
- **Goal-graph prerequisites instead of unit gates** — the goal layer can
  express it (prereq strength `required`), but the reference pack's on-ramp
  rule already sequences goals, and the W-02 fix is about unit-level phase
  ("when is this chart introduced"), which is what K-70 orders; a goal rewrite
  would move pedagogy out of the unit files the cards pair content to.
- **Per-content `requires_kana` now** — most precise, but the derived rule
  (learned kana of the entry's declared form) yields the same day-1 behavior
  for the reference pack with zero new authoring burden; deferred to v0.3
  where packs can state it explicitly.
- **Fold ん/ン together, or ー onto nothing** — would let パン ride on a
  learned ん-less vocabulary or a declared ー that no pack declares; keeping
  them distinct letters is the fail-closed choice and matches how the packs
  declare them (hiragana ん and katakana ン are separate entries).
- **Filtering due/review items too** — turns a phase gate into a mastery
  reset and would hide existing curriculum cards; the invariant is about NEW
  material, so that is what it bounds.
