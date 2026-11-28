# FIX-WRITE-PRACTICE-FORMS-001 — lane notes (decision record)

## Defect (review S-D1, MAJOR, board t_a2709e84)
`state/evidence/REVIEW-WRITE-PRACTICE-001/spec-verdict.md` S-D1: the free-writing
usage-chip matcher (`used_targets`, lib.rs) and the typing/writing accepted-form
list (`build_writing_tasks` -> `task.accepted`) are forms-LIST-driven — a token
credits a target only if it normalizes to a surface in the entry's `forms[]`.
Measured at HEAD 80fb8720/c8ab7e14: 0 of 4,071 RU lexicon entries carried >1
form. So «Я читаю книгу дома утром» against targets книга/дом/утро lit ZERO
chips and flagged the real inflections книгу/дома «not in dictionary».

## Decision: fix shape (a) — pre-generate `forms[]` offline. (b) not needed.
- (a) `scripts/derive-ru-forms.py` appends each entry's dictionary-attested
  inflection paradigm (pymorphy3 2.0.6 + pymorphy3-dicts-ru 2.4.417150.4580142,
  the pinned authorities `scripts/build-morphology-table.py` already trusts) to
  `languages/ru-RU/lexicon/*.jsonl`. The whole `lexeme` paradigm is kept from the
  top parse; predictive (non-DictionaryAnalyzer) parses are refused, exactly the
  sidecar's gate. Deterministic: added surfaces sorted, deduped by the app's
  normalization (lowercase + U+0301-stripped), only touched JSONL lines are
  re-serialized, `--check` proves idempotence.
- (b) copy softening: NOT applied. The learner-visible free-writing copy never
  promised inflection ("The app checks what a dictionary can check…"; unknown
  tokens stay "not in dictionary", never "wrong") — with (a) landed the copy is
  honest as-is, and `audit_learner_copy` stays at 0 findings. The promise lives
  in the frontend code comment + `WritingCheckResult` doc — (a) makes them true.
- Provenance: every touched entry appends a dated derivation sentence to its
  `notes` (tool + pinned dict versions + posture "dictionary-attested lexeme
  paradigm only, human review pending"); entries keep `status: draft`. Pack
  version bumped 0.5.0 -> 0.5.1 in `languages/ru-RU/manifest.yaml`.
- Generation result: 3,832 / 4,071 entries touched, 61,807 forms added;
  skips: 206 no-new-forms (indeclinable e.g. кофе), 23 phrase/multiword keys
  (a multi-word surface can never match the token-splitting matcher anyway),
  10 predictive-only parses refused.

## Mandatory red-first pin
`tests::writing_check_ru_inflected_forms_light_usage_chips` (lib.rs, next to the
existing RU classification test): submits «Я читаю книгу дома утром» against
ru.lex.everyday.kniga / ru.lex.everyday.dom / ru.lex.routines.utro; asserts the
three inflected tokens are "known" and all three usage chips light.
RED at HEAD+test-only (книгу -> "unknown", red-at-head.log), GREEN with the
regenerated lexicon. Under shape (a) the card allows keeping the functional pin
(the copy assertion is the (b)-only shape).

## Collision note (concurrent lanes)
At lane start the tree carried another lane's uncommitted WIP (goals.yaml,
crates/langpack/src/graph.rs, both pack manifests bumped to 0.5.1,
tests/fixtures additions). Nothing was touched or staged from it. Coincidence:
the ru manifest's only sibling hunk was exactly the version line this lane also
needed (0.5.0->0.5.1), so staging that file carries no sibling content. If the
sibling lane still needs a version bump for its own pack changes it must move
to 0.5.2 (or higher than whatever is on main when it lands).

## Deferred / follow-ups (recorded, not done here)
- `build-morphology-table.py --check` fails at CLEAN HEAD (lemmas.jsonl drifted
  vs sentence regeneration) — pre-existing, not gated in scripts/ci.sh, and not
  caused by this lane (this lane never touches `sentences/`). Needs its own
  chore card to regenerate + decide whether CI should gate it.
- Wiring `derive-ru-forms.py --check` into scripts/ci.sh (determinism guard) is
  deliberately left out of this lane's scope.
- Human review posture unchanged: derived surfaces ride draft entries; the
  qualified-review promotion path (docs/18) is untouched.
