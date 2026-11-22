# REVIEW-PRACTICE-GATE-001 — verdict

Lane reviewed: 867654e (entangled PRACTICE-GATE-001 + ORTHO-LETTER-UNITS-001
takeover tree; ledger 80cba43). One review card satisfies the pairing for
both cards. Review only — no production code changed.

- Axis (a) SPEC: **PASS** — both cards' acceptance clauses demonstrated
  with tests, greps and capture evidence; nothing out of scope; every
  deferred item was contract-permitted. Details: spec-verdict.md.
- Axis (b) STANDARDS: **approved-with-notes** — one-eligibility-layer and
  shared-command-table rules hold; ledger hygiene verified (validate_handoff
  re-run at HEAD: PASSED); test quality strong (fixtures tightened, not
  weakened). Two defects warrant FIX cards; five non-blocking observations.
  Details: standards-verdict.md.

Overall: **approved-with-notes.**

## Defects for the planner to spawn as FIX cards

1. FIX-1 (HIGH) — the orthography id rename ships with NO migration path
   for persisted learner evidence: existing learners (owner profile live
   case, pack 0.4.8 already published with merged ids) lose Cyrillic
   letter mastery and can have band locks reopen.
   fix-1-orthography-evidence-id-migration.md
2. FIX-2 (MEDIUM) — the engine's honest refusal string is swallowed by
   `fetchDictation`'s catch; learners see a silently-empty input instead
   of the unlock message, despite the status line existing.
   fix-2-honest-refusal-empty-state.md

No FIX card is required for the entanglement itself: the split would have
committed a red lane, and the justification was independently confirmed
(the day-one queue test asserts the merged `ru.orth.cyrillic.a` id).
