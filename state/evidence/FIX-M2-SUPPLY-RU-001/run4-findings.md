# FIX-M2-SUPPLY-RU-001 — TAKEOVER 2 (t_12a2dc67), RUN 4 instrumentation findings (2026-11-28)

VERDICT: branch (b) of the bounded decision tree — the recall-meaning unlock path is
engine-capped, NOT pack-data-throttled. The card's sanctioned pack-data fix
(required_concepts reduction) is provably incapable of moving acceptance; no pack edit
was made. Findings below are measured, deterministic, and re-runnable.

## Method (offline ladder replay — zero engine edits, ~10 s, no serve/browser needed)
`m2probe.rs` (this dir) replays the EXACT engine path over the shipped 60-day walk's
evidence DB: `lts_storage::Store::evidence_for_profile` + `lts_learner_model::derive::
derive_mastery_in_pack` under the frozen `docs/assessment/MASTERY_POLICY.yaml`, bucketed
per (content, dimension) exactly like serve's `derive_pairs`, then a verbatim port of
`goal_derived_state`/`prereq_satisfied` for the `unit_goal_locked` rule.
Input DB: the RUN 3 walk at code commit 8a8b34c6
(`~/.hermes/cache/scratch/m2supplysim/.sim-data/ru/profiles.db`, 1502 evidence events,
fake-clock 2026-01-05..2026-03-05). Cutoffs: day 30 = 2026-02-03T15:31:20Z,
day 60 = 2026-03-05T15:30:05Z.
Rebuild: standalone crate outside the repo — `lts-domain`/`lts-learner-model`/`lts-storage`
path deps; run with args `<profiles.db> <goals.yaml> <policy.yaml> <profile_id> <t30> <t60>`
and `M2DUMP_ALL=<path>` to dump every derived row at t60.

## Measurements
`derived-edge-dump-8a8b34c6.tsv` = full edge table. `derived-rows-day60-8a8b34c6.tsv` =
every derived (content, dimension, state) row at day 60.

1. 52 distinct hard goal→goal edges: 51 `recall-meaning/independent`, 1
   `orthography-recognition/independent` (ru.goal.on-ramp.cyrillic).
2. The CYRILLIC gate now PASSES (Independent by day 30, Retained by day 60 — the shipped
   8a8b34c6 ladder fix works). satisfied@t30 = 1, satisfied@t60 = 1 of 52.
3. All 51 recall-meaning edges are throttled by the SAME 4 required_concepts
   (ru.lex.everyday.eto/dom/mama + ru.lex.personal.ya): goal_derived_state = Supported
   at BOTH day 30 and day 60, required Independent.
4. ROOT CAP — not pacing, not MIN-of-4: EVERY ru.lex content in the entire walk is
   `Supported` on RecallMeaning at day 60 (all 50 words with evidence, including words
   drilled 30+ times). NO lexicon word ever reaches Independent recall-meaning, so NO
   required_concepts selection can ever satisfy a recall-meaning edge — MIN-of-N, N=1,
   any subset, any most-drilled pick: capped at Supported.
5. Mechanism (engine): the recall-meaning practice runner stamps every event for a word
   with ONE prompt family = the item id (`apps/desktop/src-tauri/src/lib.rs` ~:7661;
   measured: ru.lex.classroom.bukva = 32 events, 31 clean-correct, all
   prompt_family_id = `ru.lex.classroom.bukva`). The policy's Independent rule needs
   `min_distinct_prompts: 2` (MASTERY_POLICY.yaml transitions.independent), so
   distinct_prompts = 1 forever. The same site's own comment generalizes the pattern
   ("repeated attempts at it are one prompt family, not several") — it is deliberate
   single-prompt behavior, and ADR-0031's Consequences section ALREADY names this exact
   reachability hole and assigns it to ACTIVITY-MODEL-001 / RU-GOAL-PREREQ-001
   ("today's desktop tasks emit a single prompt per (content, dimension), so
   `independent` is not yet earnable by clicking through a lesson").
6. A live sibling lane is already mid-fix on exactly this file (dirty `lib.rs` at capture
   time adds `lex_drill_family`/`lex_drill_reverse` + test
   `word_drills_span_two_prompt_families_and_reach_independent`). NOT touched per the
   shared-tree rule.

## Why the pack-data branch was not executed
Card branch (a) assumed concepts "stuck below required_state" due to MIN-of-4 pacing.
Measurement refutes the pack remedy: the per-concept CEILING is Supported for every
candidate word, so reducing required_concepts cannot satisfy any edge. Making the edit
would have shipped a fake fix (acceptance cannot move) and a wasted ~30-minute walk+build
cycle. required_state values were NOT touched (ADR-0031 pins the pedagogy; card forbids
weakening it without owner clarity).

## Engine-lane follow-up (what to do, in order)
1. Land the sibling prompt-family fix so recall-meaning drills emit >=2 distinct prompt
   families per (content, dimension) with clean support <=1 (ACTIVITY-MODEL-001 shape).
   No pack change required for that.
2. Re-run m2probe after the engine fix: acceptance predicate = recall-meaning derived
   rows reach Independent and hard-edge satisfied count rises from 1 toward 52 — no walk
   needed for this predicate.
3. THEN (and only then) the pack-data question reopens and is cheap: per-goal
   required_concepts can drop to the 1-2 most-drilled words per goal (the MIN-of-4 pacing
   throttle may still slow ladder days 31-60 even once Independent is earnable).
4. If accepted, re-walk 60 days (RUN 3 recipe in gates.log 'Repro') and update
   before-after-table.json.

## Gate integrity
No repo file was modified except this evidence dir + the notes append. No test/gate/sim
script touched. No pack edit. The dirty `lib.rs` sibling WIP and untracked
`state/evidence/RC-0.5.2-2026-11-28/` were left untouched.
