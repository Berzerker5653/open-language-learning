# REVIEW-SESSION-SEQUENCE-001 — Axis (b) STANDARDS verdict: PASS (observations, no defects)

Checklist per AGENTS.md + CODING_STANDARDS.md §B. Machine gates not re-litigated (rule J8);
their logs were read and their contents verified to match the commit-message claims.

## Judgement-call checklist

- **Tests assert behavior, not implementation trivia** — PASS. Both lane tests drive the real
  `build_plan` / `add_new_item_candidates` with a real installed RU reference pack across six
  executed-and-graded sessions; assertions are learner-visible (no locked-band content ever in a
  plan; plans never empty; poisoned rows withheld but present on disk).
- **Deterministic core; no language-specific data in the engine** — PASS. `unit_goal_locked`,
  `goal_locked_new_content`, `pack_goals`, and the unclaimed-lexicon rule operate purely on
  declarative pack data (goal map, hard prerequisites, content_refs). RU/JA ids appear only in
  tests.
- **Persisted-data / schema / ADR** — PASS, no triggers. No pack schema, no persisted learner-data
  format changed (rows are withheld from the plan, never rewritten/deleted); the planner-gating
  decision is bounded to bug-fix scope and its contract is fully written in
  `state/notes/SESSION-SEQUENCE-001.md`; ADR-0022 phase-gate semantics deliberately preserved
  (empty-goal_id escape hatch kept, content-targeted edges deliberately unchanged so the ja pack
  stays byte-identical).
- **Confidence ≠ correctness; no fabricated verdicts** — PASS. The takeover REFUTED its own
  inherited premise (undeclared goal_id) by measurement before acting (takeover-findings.md).
- **Privacy / offline / accessibility / untrusted packs** — PASS, no new surface: engine-side plan
  scoping only; goal files stay declarative YAML read through the existing cached readers.
- **Review-record honesty** — n/a (no review promotion in the lane).
- **Commit hygiene: task-scoped, claims match evidence** — PASS.
  - Separate code commits (2c6f328, a731028) vs ledger commit (c431333).
  - Every verification asserted in the commit messages is present in
    `state/evidence/SESSION-SEQUENCE-001/takeover-gates.log` (fmt exit 0; targeted 6/6 with lane
    test NAMES verified; clippy `-p lts-desktop --all-targets -D warnings` exit 0; full lib
    218/1 with the single red triaged as the vendor-gated dictation ASR load flake, filtered
    re-run 7/7 logged; `tsc/vitest not run — frontend untouched` stated).
  - Honest negative disclosure: the gate log states `clippy -p lts-engine NOT RUN — no lts-engine
    crate exists in this workspace` (measured via cargo metadata) instead of faking the card's
    gate line.
  - The controller's in-lane test correction (the new test's `eto seeds day-one` assertion was a
    FALSE PREMISE; every eto-referencing unit sits behind a hard goal edge) is documented with the
    measurement and the compensating positive-path coverage (K-70 konnichiwa line). This is a
    corrected wrong expectation, not a weakened gate — the engine rule itself was not touched.
- **Gate integrity (J8)** — PASS. No test or gate script weakened: the only pre-existing test edit
  is the K-70 fixture swap, whose rationale (old word is orphan content the new rule correctly
  withholds) is cited inline and in evidence; the パン/learned-kana assertions stay intact.
- **Ledger hygiene** — PASS. All 7 task-state `evidence` paths exist on disk (verified by listing);
  c431333 diff is minimal (status done, attempts 2, evidence += takeover files, summary,
  active_task → null); `python3 tools/validate_handoff.py --require-explicit-ledger-records`
  re-run by this review on current main: PASSED, exit 0.
- **No history rewrites; immutable evidence untouched** — PASS (lane adds commits only;
  notes append-only across runs).
- **Docs claims measured, not copied** — PASS. takeover-findings.md counts (178/4057 RU orphans,
  818 units all declared goals, 0 empty goal_id) are stated as greps against the installed 0.4.6
  pack, and the id-conflation error (soc.kontrargumentaciya vs argue.kontrargument) is called out
  by name — good forensic honesty.

## Findings (observations — NOT defects, no FIX card warranted)

1. **Absence-only new test.** `lexicon_words_outside_the_goal_ladder_are_not_seeded`
   (main lib.rs:20297) asserts only negative membership; it would pass vacuously if the lexicon
   stream seeded nothing. Mitigated in practice: the six-session test asserts
   `!plan.items.is_empty()` every session and the K-70 test asserts a positive lexicon seed
   (`ja.lex.greeting.konnichiwa`, main lib.rs:16432), and the controller comment in the test names
   this coverage explicitly. If a FIX-card cycle ever revisits this file, add a positive-candidate
   assertion here.
2. **Asymmetric fail-open on the progression route.** `unit_goal_locked` now fails CLOSED for
   undeclared goal_ids (main lib.rs:2219/2229) while the older `goal_is_locked` used by
   `progression_items` still fails open. Bounded risk: measured zero undeclared goal_ids in both
   reference packs (takeover-findings.md), and progression items are enumerated from the goal map
   itself. Candidate hardening for a future standards card, not a live hole.
3. **Test-level RED for the takeover extension not archived.** The takeover's measured RED is the
   live owner-profile read (`acceptance-home_state.json`: 2 weak-skill argue rows + kontrargument
   progression row); the extended unit test's RED against the pre-takeover code was declared
   optional in the run-121 recipe and skipped in favor of the live RED, which the gates log states
   openly. Acceptable per the card's own recipe; noted for completeness.
4. **Card-open convention.** 2c6f328 grafted the ROADMAP entry into the code commit (no separate
   `ledger(...): open card` commit before implementation, unlike the recent RU-CLAIM lanes).
   Dogfood-incident cards have historically been opened mid-lane this way, the validator passes,
   and the ledger close (c431333) is properly separate. Convention drift worth a one-line
   planner note only.
5. **Evidence rode the code commit.** a731028 includes its evidence/notes in the same commit; the
   ledger (task-state/KANBAN) is separate (c431333), which is the separation that matters for
   replay/blame. No action.
