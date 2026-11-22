# STANDARDS verdict — 867654e (PRACTICE-GATE-001 + ORTHO-LETTER-UNITS-001)

Checked against AGENTS.md and CODING_STANDARDS.md (section B judgement list),
plus the repo's structural rules (one eligibility layer, shared command
table, ledger hygiene, test quality).

**Verdict: approved-with-notes — 2 defects warrant FIX cards (FIX-1, FIX-2),
5 non-blocking observations. Section B is otherwise clean.**

## Clean

- **One eligibility layer (the forked-gate rule):** the practice streams do
  NOT fork a gate. `practice_met_content` (lib.rs:2313+) reuses the
  SESSION-SEQUENCE-001 predicates verbatim — `unit_goal_locked`,
  `unit_gate_holds`, `locked_new_content`, `goal_locked_new_content` — and
  `practice_eligible` (met && !locked) is spelled in exactly one place and
  called by all four streams (dictation, shadowing, writing, queue). The
  MET half was empirically necessary (unclaimed ids sit in neither lock
  set; gates.log documents the debug probe proving the day-0 leak).
- **Shared command table:** `practice_queue` added to all three tables —
  `wire_commands` (lib.rs:10839+), `wire_serve_commands` (10945+),
  `SERVE_COMMAND_NAMES` (11047+) — and the WEB-SERVE-001 consistency test
  (serve.rs:1362-1377) machine-enforces table agreement, so the
  ARCH-HOTSPOT-2026-11-22 drift class cannot silently return.
- **Ledger hygiene:** code/ledger split honored (867654e code-only, 80cba43
  ledger-only); every task-state `evidence` entry is an existing file
  (reviewer ls-verified before/after result.json, pngs, logs);
  `python3 tools/validate_handoff.py --require-explicit-ledger-records`
  re-run by the reviewer at HEAD → PASSED (only pre-existing optional-task
  WARNs). Commit message asserts only what gates.log records as run; the
  two deferred items ride in the gates.log DEFERRED list as required.
- **Test quality (behavior not trivia):** queue test measures the complaint
  class (pack ships sentences; queue shows none); lesson.test.tsx counts
  rows and glyphs, not internals; the `evidence_count == 268` literal in
  the on-ramp walk became a counted assertion with a reason comment —
  drift-proofing, not weakening. The two pre-gating JA shadowing fixtures
  were TIGHTENED to the new contract (day-one pool asserted EMPTY; seed
  helper documents the honest precondition), not loosened.
- **Determinism / engine purity:** no language literals added — queue
  `kind` resolved from the pack's own tables; kana gate via existing
  K-70 helper. Privacy untouched (no new collection); dictation status line
  carries `role="status"` (a11y hook exists — see FIX-2 for it being
  unused on the refusal path).
- **Docs-with-schema rule (AGENTS.md):** docs/04 LANGUAGE_PACK_SPEC gained
  the orthography-entity contract in the same commit.

## Defects → FIX cards (do not fix on this card)

- **FIX-1 — no migration path for the content-id rename (learner-data
  regression).** See fix-1-orthography-evidence-id-migration.md.
- **FIX-2 — the engine's honest refusal never reaches the learner UI.**
  See fix-2-honest-refusal-empty-state.md.

## Non-blocking observations

1. apps/desktop/src/lesson.tsx:29 uses Rust `///` doc-comment style inside
   a TS interface — legal but off-convention (`//` or JSDoc).
2. tools/audit_learner_copy.py VERSION stayed "1.5.0" while this commit
   ADDED the `pack-case-split` rule (base c431333 already reported 1.5.0).
   The commit message/ROADMAP/docs/04 phrase the rule as "v1.5.0 enforces
   it" — true of the tool as of this tree, but the version string cannot
   distinguish the two rule sets. Bump the version with the next rule
   change so audit reports stay diffable.
3. tools/audit_learner_copy.py file mode 644→755 — incidental bit flip,
   harmless; mention so blame doesn't chase it.
4. "machine-gated result.json" was satisfied as capture-time gating
   (harness exits nonzero on FAIL); no CI test asserts the committed audit
   JSONs the way MOBILE-UX-001 gated its audits under vitest. Optional
   hardening if these screens churn again.
5. Red-first evidence is prose-attested (notes + gates.log verification
   that the merged-id test is red against the pre-rename pack) rather than
   re-derivable from the squashed entangled commit — accepted under the
   sanctioned entangled-takeover rule, recorded for the audit trail.
