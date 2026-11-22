# PRACTICE-GATE-001 — practice queue generated from encounter state

Owner phone dogfood 2026-11-21, complaint 07: a level-0 learner was served the
full-sentence speaking drill «Я учу русский язык.» before knowing Cyrillic.
Design call: practice tools are dynamic to what the learner has MET, never a
pack buffet.

## Contract (shipped)

- Eligibility is ONE engine with the plan (SESSION-SEQUENCE-001 interface —
  `locked_new_content` ∪ `goal_locked_new_content`, same unit predicates,
  `requires_unit` phase gates + goal band edges + K-70 learned-kana gate).
- PRACTICE asks the stricter half: `practice_met_content` = content ids
  referenced by units whose goal AND requires_unit gates currently hold.
  eligible(id) = `met.contains(id) && !locked.contains(id)`
  (`practice_eligible` — one place spells it).
- Why the MET half is necessary: content no unit references is in neither
  lock set (the scheduler's honest contract), so a lock-only filter still
  served `ru.sent.cp.p01` («Я учу русский язык.» — referenced by no unit)
  to day-0 learners. Run 127 shipped exactly that gap; run 128 found it via
  the red-first test and closed it. No encounter path ⇒ never met ⇒ never
  practiced.
- Wired at all four streams: `dictation_target_at` (new `profile_id` arg;
  empty pool → honest refusal "no sentence practice is unlocked yet — finish
  more lessons to unlock it"), `shadowing_items_at`, `writing_task`, and the
  new `practice_queue` IPC (`PracticeQueueEntry {content_id, kind}`, served
  via SERVE_COMMAND_NAMES). `practice_build` (plan-driven) stays unguarded —
  placement/plan flows untouched. Learner free-typed sentences stay ungated.
- Frontend: `fetchDictation` names the profile (one call-site change); the
  no-speech-model journey fixture asserts the new wire shape.
- 'Preview what's ahead' affordance: NOT built (card marks it optional) —
  deferred honestly, see gates.log.

## Takeover history

- Run 127 (80/80 cap): engine + tests written uncommitted; handoff comment 66.
- Run 128 (this): fixed `Debug` derives (tests unwrap_err/{:?}), replaced the
  hardcoded `ru.orth.cyrillic.a` test guard (HEAD rows are `-upper`/`-lower`
  ids; the ORTHO-LETTER-UNITS-001 rename is uncommitted), updated the journey
  fixture. Its claim of an MET allow-list was NOTES-ONLY: the code never
  landed (no `practice_met_content`/`practice_eligible` existed in the tree;
  the day-0 queue leaked unclaimed B2 lexicon + `ru.sent.cp.*`).
- Takeover run 145 (2026-11-22, controller): audited WIP vs red-first tests,
  found the leak empirically (debug probe: goal_locked=4697 yet day-0 queue
  full — unclaimed ids sit in NEITHER lock set), implemented the MET half
  (`practice_met_content` = refs of units whose goal AND phase gates hold;
  `practice_eligible` = met && !locked, wired into all four streams), and
  rewrote two pre-gating shadowing fixtures to the NEW contract (seed kana
  evidence; assert refusal on day one). Full battery at this exact tree in
  state/evidence/PRACTICE-GATE-001/gates.log.
- Sibling hygiene: the dirty main-tree `lib.rs` also carries
  ORTHO-LETTER-UNITS-001 hunks (OrthEntry.forms, LessonContent.forms,
  evidence_count 268) — never staged; after this commit the residue stays in
  the working tree for the ORTHO takeover to own.

## Deferred

- 'Preview what's ahead' name-only unit listing (optional per card).
- Frontend rendering of `practice_queue` itself (the IPC is live; the tab's
  visible change comes from the gated dictation/shadowing/writing streams +
  plan-driven letter drills).
