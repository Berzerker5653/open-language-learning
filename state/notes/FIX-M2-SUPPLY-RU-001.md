# FIX-M2-SUPPLY-RU-001 — RUN 3 (takeover) NOTES: partial. Code shipped, acceptance NOT met.

## RUN 4 (takeover-2 t_12a2dc67, 2026-11-28): BRANCH (b) — engine-capped, STOP.
Decision-tree result in full: state/evidence/FIX-M2-SUPPLY-RU-001/run4-findings.md
(+ derived-edge-dump-8a8b34c6.tsv, derived-rows-day60-8a8b34c6.tsv, m2probe.rs).
Headline: the cyrillic/orthography gate now PASSES (8a8b34c6 works), but every ru.lex
RecallMeaning derived row is capped at Supported even after 30+ drills — the runner
stamps one prompt family per (content, dimension), policy Independent needs 2 distinct
prompts. No required_concepts selection can satisfy a recall-meaning edge. Do NOT retry
the pack-data branch until the prompt-family engine fix (ACTIVITY-MODEL-001 shape; a
sibling lane was mid-fix on lib.rs lex_drill_family at capture time) lands; then re-run
m2probe (10 s, no walk) before any re-walk.

State at close (2026-11-28): code commit 8a8b34c6 on main (ladder gradeability guard in
lts-langpack + ru/ja goals.yaml ladder data fix + fixtures + goal_ladder_gradeable tests;
ru 0.5.2 / ja 0.4.5). All lane gates green (see state/evidence/FIX-M2-SUPPLY-RU-001/gates.log).
The month-2 sim walk re-run at this commit shows the starvation UNCHANGED: per-day 31-60
new items [3,2,0x28], unlocked units 813->803->803 identical to the broken pack's M2 walk.

## Falsified / refined RCA (measured this run)
The RCA's causal story (grammar-only required_concepts + no-runner dimensions pin the ladder)
is necessary but NOT sufficient. Empirically after the fix:
- all 38 shared required_concepts get served practice evidence on the right dimensions
  (all 170 hard goal->goal edges pass concept-coverage from served (cid,#modality) pairs);
- unlock STILL never fires => the binding constraint is the mastery-STATE threshold:
  prereq_satisfied (apps/desktop/src-tauri/src/lib.rs:2181) requires
  goal_derived_state(target_goal, edge_dim) >= required_state, where derived_state is the
  MIN over ALL required_concepts of their derive_mastery_in_pack state. Evidence exists;
  the state never crosses supported/independent inside the walk (paced promotion + MIN over
  4 concepts), or a second gate path bypasses these edges.

## Numbered resume recipe for the next run (do NOT reopen this card's code; extend)
1. Instrument: in a scratch worktree dump goal_derived_state for every hard edge's target
   goal at walk day 30 and day 60, plus per-concept derived rows (content_id, dimension,
   state) for the 38 shared concepts. Decision tree:
   a) concepts present but stuck below required_state -> PACK-DATA fix in-scope:
      (i) drop required_concepts per goal to the 1-2 most-drilled shared words (MIN of 4 is
      the throttle); (ii) and/or ladder edges required_state 'supported' (check ADR-0031
      semantics first - do not lower a state that encodes pedagogy; block for owner if
      unclear); re-walk (~8 min, recipe in gates.log 'Repro').
   b) concepts absent from derived rows entirely -> engine bug in derive_mastery_in_pack
      filtering (crates/learner-model/src/derive.rs) vs the item ids actually graded;
      engine lane, needs ADR care.
   c) states good, still locked -> unit_goal_locked reads something else; trace it.
2. On green re-walk: update before-after-table.json + gates.log (evidence commit), flip
   task-state FIX-M2-SUPPLY-RU-001 to done with those paths + KANBAN.md row, validate_handoff
   --require-explicit-ledger-records, ONE ledger commit, then board closes: this card +
   parent t_57092fec both administratively (planner).
3. Keep the goal_ladder_gradeable guard: it is real value already shipped (a scaffold pack
   with dead ladder edges now FAILS validate) even if supply acceptance is still open.
PITFALLS hit this run (already in gates.log): worktree media nesting (cp -al into an
existing tracked media dir), faketime in /usr/sbin, leaked serves from dead runs (killed
2: m2-target + repo-target), tauri frontendDist symlink in fresh worktrees.
