# SCENARIO-LOCK-COPY-001 — human lock copy for scenario lists

## Task (verbatim acceptance)

1. Locked rows show human-readable capability names derived from pack data
   (never hardcoded per language) and name where each prerequisite is
   practiced; a fresh profile's scenario list contains no raw content ids in
   learner-facing copy.

## What was leaking (confirmed against shipped packs, fresh profile)

`apps/desktop/src-tauri/src/scenarios.rs` `prereq_name`/`unlock_hint` produced:

- capability gates: `practice ja.lex.demonstratives.koko to supported (recall-meaning)`
  — raw content id, and no place to practice it (ja: koko/gohan/ikura gates);
- stage gates: `reach goal ja.goal.a2.relationships first` — raw goal id
  (all 14 later ja scenario rows; all 3 ru rows gate on
  `ru.goal.on-ramp.cyrillic`).

## Design

- All pack display fields already exist in pack data — no schema/pack-data
  change needed:
  - `lexicon/*.jsonl` → `glosses.en-US` (e.g. `ja.lex.demonstratives.koko` =
    "here"); also covers `ja.expr.*` ids living in lexicon files;
  - `grammar/concepts.jsonl` → `name` ("The polite linking word です");
  - `orthography/*.jsonl` → `script`/`symbol`/`reading` ('hiragana あ (a)');
  - `curriculum/units/*.yaml` → unit `title` hosting the practice: a content
    id is practiced where unit activities' `content_refs` (or
    `generation_contract.allowed_vocab/allowed_grammar`) reference it; a goal
    is worked on in the first unit whose `goal_id` names it;
  - goal display label = first clause of the goal map's own `description`
    ("Handle daily administration" from "Handle daily administration: ...").
- `PackCopyIndex` (scenarios.rs) reads those files from the installed pack
  root — same raw-file-read precedent as `situation_label`/goals.yaml, so no
  crate/API boundary changes. Process-wide cache keyed by immutable pack root
  (same correctness argument as packcache K-63).
- Fallback when no name resolves: "a skill you have not started yet"
  (goals: "a later goal of this curriculum"), never a raw id.
- Undefined-goal rows no longer interpolate the goal id.
- Copy shape (playable/near/later structure untouched):
  - `not open yet — practice first: "here" (recall-meaning → supported)`
  - `practice "here" to supported (recall-meaning) — practiced in "Asking where things are"`
  - `reach "Retell simple past events and stories" first — practiced in "…"`

## Verification

- `cargo test -p lts-desktop --lib scenarios::` — includes:
  (a) fresh-profile walk of the real ja-JP + ru-RU packs: every locked row's
  `locked_reason` + `unlocks` contain no pack-id-shaped token and no goal-map
  prereq target as substring;
  (b) fixture pack rename: changing the lexicon gloss / unit title in a temp
  pack changes the generated copy (names come from pack data);
  (c) fallback phrase path asserts the generic wording and no raw id.
- `python3 tools/audit_learner_copy.py` stays at 0 findings.

## Notes

- `situation` copy was already resolved from pack data (`pragmatics.yaml`);
  every shipped scenario situation has a name, and the shipped-pack test now
  also asserts the rendered situation strings carry no id.
- First `PackCopyIndex` load parses ~7.5 MB of pack YAML/JSONL once per
  process (cached); same one-time cost class as the pack runtime parse.
