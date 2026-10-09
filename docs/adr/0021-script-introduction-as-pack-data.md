# ADR-0021: Script instruction is offered only where a pack declares it

## Status

**Accepted 2026-10-08 by the owner** (recorded on the owner's word when K-66
started; never self-certified by an agent — `AGENTS.md`). It changes the public
0.2 pack schema (docs/04) and learner-visible feature eligibility. Sibling of
ADR-0020, which carries the app-side instruction stage (`K-66`/`K-67`); this ADR
records the narrow pack-side data contract `K-67` implements.

## Date

2026-10-08

## Context

The desktop first run never explained hiragana/katakana (O-06 #11, kanban
`K-67`), even though the data ships in the pack:
`languages/ja-JP/orthography/hiragana.jsonl` carries per-symbol `symbol`,
`reading`, `mnemonic`, `teaching_order`, and `sources`, and
`languages/ja-JP/manifest.yaml` declares `ja.orth.hiragana`. The app instead
resolved the question with a language-specific literal — looking for a
reading/form whose `script` equals `"hiragana"`
(`apps/desktop/src-tauri/src/lib.rs`) — which pins one language's names into
app code and gives every other pack (a `ru-RU` Cyrillic introduction, say)
nothing to hook into. What was missing is not a better algorithm but a
declaration: "this pack teaches a writing system, and this unit is the set to
introduce first."

## Decision

1. The 0.2 unit schema gains an optional `capabilities` array
   (`schemas/v0.2/unit.schema.json`) with `uniqueItems`, its items restricted
   to a closed enum of feature names — currently only `script-introduction`.
   The list names *features*, never scripts, so no language-specific rule
   enters Rust. A capability is a claim the app MAY surface, not an
   instruction to run: the engine executes nothing because a name appears.
2. Validator rules, deterministic like the rest of `validate`:
   - a unit that declares capabilities must reference at least one content
     item, else the Error `unit_capability_items_missing` names the unit and
     the capability;
   - an unknown capability string is a `schema` Error through the existing
     enum-violation path, so a typo cannot silently disable the feature.
3. The ja-JP pack declares `capabilities: ["script-introduction"]` on
   `ja.unit.kana-hiragana-vowels-ko`, the unit whose items are the start of
   the hiragana `teaching_order` sequence; a pack test pins that ja-JP
   declares exactly one such unit.
4. The app MAY NOT hardcode script names to find teachable content; the
   pack's declaration is the only cue. Removing the existing `"hiragana"`
   literal is the desktop half of `K-67` and out of scope here.
5. Absence is a supported state: a pack declaring no `capabilities` keeps its
   current behavior; the app simply offers no script instruction for it, and
   nothing crashes.

## Consequences

- The pack-side contract is implemented now: schema field, one validator
  error code, the ja-JP declaration, and tests. Both source packs
  (`languages/ja-JP`, `languages/ru-RU`) validate with 0 errors / 0 warnings
  in scaffold (source) mode.
- Extending the feature set means widening the closed enum plus its matching
  validator rule — packs cannot invent capability strings.
- The app must render the abstain path (no declaration → no instruction
  stage), so the feature fails to silence rather than to breakage.
- Nothing here authorizes the app-side instruction stage; ADR-0020 carries
  that decision.

## Alternatives considered

- **Keep the `"hiragana"` literal in the app and add one per language.**
  Rejected: language rules in engine code, forbidden by the
  content-agnostic non-negotiable (`docs/00_MASTER_SPEC.md`).
- **Derive the introduction set from orthography `teaching_order` with no
  declaration.** Rejected: the engine would guess which of a pack's several
  scripts and units is *the* first set — implicit behavior a pack cannot
  override, with no honest-abstain path.
- **A manifest-level `script_introduction_unit: <unit id>` key.** Rejected:
  it duplicates unit identity in a second place and puts a unit-level claim
  at pack level; the additive unit field keeps one source of truth.
- **Free-form capability strings.** Rejected: typos would silently disable
  the feature, which validation exists to prevent.
