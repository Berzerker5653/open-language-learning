# SCENARIO-INTERACTION-001 — lane notes (2026-11-08)

Files changed (this lane only; settings*/styles.css/docs belong to the
concurrent settings agent):

- crates/activity/src/scenario.rs — engine: full-set satisfaction
  (`PartialAccepted`), `distractor_actions`/`decision_set`
  (strict-superset rendering source, pack-declared only, cap 4),
  `GUIDED_SCENARIO_SUPPORT_FLOOR = 2` stamp floor on node records
  and evidence events.
- crates/activity/src/lib.rs — exports the two new constants.
- crates/activity/tests/scenario.rs — integration tests updated to the
  new semantics (they pinned the old single-click/level-0 behavior).
- apps/desktop/src-tauri/src/scenarios.rs — `view_of` renders the
  decision set with scenario-wide label fallback; `attempt_at` maps
  `partial-accepted`; two new tests.
- apps/desktop/src-tauri/src/lib.rs — the two mainline scenario tests
  that pinned old semantics (position-of-answer, level-0 evidence).
- apps/desktop/src/scenario.tsx — result union + one verdict line for
  `partial-accepted` (minimal; distractors/recovery render with zero
  TS change since they ride the existing view fields).

## Acceptance → tests

1. Rendered set = strict superset incl. distractors; wrong click →
   not-satisfied + recovery renders; node satisfied only by FULL set:
   - engine: `the_rendered_set_is_a_strict_superset_of_the_answer_at_every_node`,
     `a_wrong_click_on_a_rendered_distractor_yields_recovery_that_renders`,
     `a_node_is_satisfied_only_by_its_full_declared_action_set`,
     `full_set_completion_advances_and_terminal_completes`,
     `a_pack_without_extra_intents_renders_no_invented_distractors`
   - app + REAL shipped ja-JP/ru-RU packs:
     `every_shipped_scenario_offers_wrong_moves_and_records_honest_evidence`
     (per node: superset, labels≠tokens, distractor click →
     not-satisfied with the pack's recovery ids rendering in the view,
     recovery resolves, partial-then-advance full set)
   - wire: `the_step_result_serde_tags_include_partial_accepted`
2. Guided click-through never records independent evidence:
   down-stamp floor 2 (`supported` band); MASTERY_POLICY 0.2.0 caps
   independent-stage credit at support ≤ 1, so scenario events can no
   longer feed independent/flexible. Pinned by:
   `a_guided_click_through_never_stamps_independent_evidence` (engine,
   no ladder pressed), `declared_support_above_the_floor_is_preserved`
   (floor never over-states: real level-3 support survives), the
   shipped-pack walk test above (app path feeding finish_at),
   integration `evidence_events_record_support_per_node` (ask-name
   event now floors at 2), lib.rs
   `scenario_locks_until_prereqs_then_records_interaction_evidence`
   and `scenario_rungs_without_payloads_are_refused_without_voiding_the_node`.

## Gates (logs in this dir)

- fmt: `cargo fmt --all -- --check` → clean (fmt.log, 0 lines).
- clippy: `cargo clippy --workspace --all-targets -- -D warnings` →
  exit 0, 0 warnings/errors (clippy-final.log).
- tests: `cargo test --workspace --no-fail-fast` (test-workspace-nofail.log):
  every crate green EXCEPT lts-desktop unit: 154 passed / 30 failed.
  All 30 failures are the known environment race —
  `invalid archive: decompression bomb: "media/words.jsonl" expanded
  to 73847 bytes, declared 73846` — the background WORD-TIMING-002
  writer rewriting languages/ja-JP/media/words.jsonl while tests build
  the ja-JP bundle (that file is untracked/mid-rewrite in git). Re-run
  once (test-targeted2/3 logs): identical 30, none scenario-related.
  One run also had `dictation_check_*` flaking
  (`aligner-unavailable`/`engine-error`) while the whisper units run.
  Not touched per lane rules.
- targeted scenario counts: activity unit 11/11, activity integration
  5/5 (scenario.rs binary), src-tauri scenarios 20/20 (binary totals
  above).
- TS: `vitest run src/scenario.test.tsx` 16/16; `tsc --noEmit` clean.
