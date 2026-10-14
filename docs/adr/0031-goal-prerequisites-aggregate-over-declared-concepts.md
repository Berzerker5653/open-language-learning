# ADR 0031: Goal prerequisites aggregate over declared concepts

Status: Proposed — agent-authored; acceptance is an owner decision.
Date: 2026-10-14

## Context

Review finding R08 traced a Russian beginner who cannot reach the greetings and
early-scenario path no matter how much alphabet practice they do. The pack's
on-ramp goals declare, for example:

```yaml
prerequisites:
- target: ru.goal.on-ramp.cyrillic
  dimension: orthography-recognition
  required_state: independent
  strength: hard
```

while `apps/desktop/src-tauri/src/lib.rs` evaluated every prerequisite as

```rust
derived.iter().any(|d| d.content_id == p.target && d.dimension == dim && d.state >= req)
```

`derived` rows are per **content id** — mastery is re-derived from the targets
of evidence rows, and learners practise letters, words and sentences. Nothing
in the system ever records an observation whose target is a goal id, so a
prerequisite naming a goal could never be satisfied. Measured in the shipped
packs: 54 such edges in `languages/ja-JP/curriculum/goals.yaml`, 170 in
`languages/ru-RU/curriculum/goals.yaml`. Everything behind them is locked, and
because `locked_new_content` consults the same rule, those units' material is
also withheld from the new-item stream. The same edges were the reason the
goal map's `locked` flag and the plan's "not yet available" copy disagreed with
what a learner had actually earned.

The ru pack had a second half to the gap: `ru.goal.on-ramp.cyrillic` declared
`required_concepts: []`, so even a correct aggregation would have had no
evidence to aggregate, and no ru unit declared the `script-introduction`
capability that ADR-0021 made the app's only cue for "teach this writing
system first" — a fresh Russian profile got no first instruction at all.

Options: rewrite the packs so every prerequisite names content ids; aggregate
with "best concept wins"; treat a goal with no declared concepts as satisfied;
manufacture evidence rows whose target is a goal id.

## Decision

**A goal-level prerequisite is settled by that goal's declared evidence.**

- `goal_derived_state(goal, dimension, derived)` returns the goal's state in a
  dimension as the **minimum** over its `required_concepts` (a missing row
  counts as `unseen`). A can-do claim is only as strong as its weakest declared
  part. A goal that declares no concepts has nothing to rest on and never
  holds — the pack must say what the goal means.
- `prereq_satisfied(edge, goals, derived)` dispatches on the target: a target
  naming another goal uses `goal_derived_state`; a target naming content keeps
  the old derived-row lookup (ja-JP's kana edges, `target: ja.orth.hira.a`,
  stay content-level). An unparseable `dimension` or `required_state` never
  satisfies, so a malformed edge fails closed.
- `goal_is_locked(goal, goals, derived)` is now the single gate used by all
  three call sites that previously re-implemented the lookup inline: the
  new-material candidates (`progression_items`), the introduction ordering
  (`goal_rank_map`), and the user-facing goal map (`goal_map_at`, whose
  per-prerequisite `satisfied` flag is computed by the same function).
- Pack data makes the declaration meaningful: `ru.goal.on-ramp.cyrillic`
  declares all 67 entries of `orthography/cyrillic.jsonl` (33 letter pairs plus
  the teaching stress mark — exactly the goal's description) as
  `required_concepts`, and `curriculum/units/010-cyrillic-a-o-m-t.yaml` declares
  `capabilities: [script-introduction]`, so first-run guidance leads a new
  Russian profile with `ru.orth.cyrillic.a-upper` in the pack's own
  `teaching_order`.
- The declaration is pinned in both directions:
  `crates/langpack/tests/validate.rs::russian_declares_exactly_one_script_introduction_unit`
  (mirroring the existing ja-JP pin) and
  `apps/desktop/src-tauri/src/lib.rs::russian_cyrillic_practice_unlocks_the_greetings_gate`,
  which walks the acceptance from the pack's own data: a fresh profile is
  pointed at the declared first unit and can practise its letters on day one;
  no evidence, wrong-dimension evidence, and complete-but-one-letter-missing
  evidence all keep the greetings gate shut; complete
  orthography-recognition evidence across the declared alphabet opens it and
  releases the gated content.

## Consequences

- Goal gates are now reachable and falsifiable instead of permanently locked,
  and one rule explains the plan, the ordering and the goal map.
- The bar is explicit and large by construction: the greetings gate needs every
  declared letter at `independent` in `orthography-recognition` (two clean
  successes from distinct prompts each). That is what "Recognize and copy all
  printed Cyrillic letter case forms" claims. If the owner wants a smaller
  first step, the fix is a smaller declared concept set or an intermediate
  goal — not a weaker aggregation rule.
- Reachability through the UI still depends on ADR-0030's consequence: today's
  desktop tasks emit a single prompt per `(content, dimension)`, so
  `independent` is not yet earnable by clicking through a lesson.
  `ACTIVITY-MODEL-001` and `RU-GOAL-PREREQ-001` own that; this ADR only makes
  the gate mean what the pack says.
- Partial-goal display is still the max-across-concepts exemplar view
  (`GoalDimensionView.exemplar`); review finding R09 requires the qualifier to
  be shown, and it can now read `goal_derived_state` instead of inventing its
  own rule.
- All seven ru pack gates pass with the new declarations (`validate`, `lint`,
  `audit-curriculum`, `audit-lexicon`, `audit-licenses`, `audit-sources`,
  `test`).

## Alternatives considered

- **Rewrite the 224 edges as content-level prerequisites.** Preserves the old
  engine rule but buries the can-do semantics in 224 unreadable lines, and
  loses the "whole goal" meaning the pack intends.
- **Aggregate with max / any-of.** Lets one practised letter open a gate that
  claims the whole alphabet — the exact "one exemplar proves the goal" failure
  R09 reports for the display path.
- **Treat a goal with no `required_concepts` as satisfied.** Fail-open; it is
  the current hole in disguise and lets a missing declaration silently unlock a
  world.
- **Write synthetic evidence rows whose target is a goal id.** Puts
  aggregated, derived state into the append-only evidence log, breaking the
  docs/03 rule that mastery is re-derived from observations.
