# Scenarios section review — findings register (2026-10-21)

Trigger: owner sweep item 5 — "This entire section needs to be reviewed and
evaluated as it currently stands" (SCENARIOS-SECTION-REVIEW-001). Paired
symptom from 5a: Shadowing buttons all work but render disabled-looking
(S-4 below = S-06 here).

Method: read the engine (`crates/activity/src/scenario.rs`,
`apps/desktop/src-tauri/src/scenarios.rs`), the frontend
(`apps/desktop/src/scenario.tsx`, `shadowing.tsx`, `App.tsx` wiring), the
stylesheet (`packages/ui/src/styles.css`), and every shipped scenario YAML
(ja 18, ru 3) with a content inventory. Two delegated scout audits stalled at
their runtime cap (transcripts `history://ScenarioEngineAudit`,
`history://ScenarioShadowUxAudit`); the walk below was done directly and
every claim is a file:line quote or machine count.

---

## S-01 — BLOCKING (pedagogical core): scenarios are click-through, and the buttons ARE the answers

- `crates/activity/src/scenario.rs:103-111` — `active_prompt()` returns the
  node's `expected_actions` as the *accepted* intents.
- `apps/desktop/src-tauri/src/scenarios.rs:546-556` — the view maps those
  intents 1:1 to the rendered buttons; `label` is the pack's own
  `action_labels` wording (e.g. `answer-phone: "Pick up the phone"` in
  `languages/ja-JP/activities/scenarios/a2-comm-answer-phone.yaml:13-16`).
- `crates/activity/src/scenario.rs:180-218` — any accepted intent marks the
  whole node satisfied, records it, and advances along `node.next.first()`.
  A node declaring **two** expected actions is completed by **one** click;
  the second button vanishes unused.

Impact: a learner can complete every shipped scenario by clicking labelled
descriptions of the right answer. Machine count: **0 of 21 scenarios contain
any Japanese in a prompt** (only `first-meeting.greeting.open` and
`office.notice-call` embed any target-language text) — the entire
conversational surface is English buttons over English prompts. This is
exactly the anti-pattern AGENTS.md names: engagement maximizable without
learning. This is the honest core of the owner's verdict.

Fix direction: decisions must demand retrieval — present a candidate set that
includes plausible wrong moves (see S-02), require the node's declared action
*set* to be satisfied, and put target-language content in the prompts/choices
(pack work, media-first per ADR-0024: prompts should be the pack's own
sentences/audio).

## S-02 — BLOCKING: failure is unreachable, so every recovery branch is dead content

`Scenario.tsx` renders exactly the accepted intents (`scenario.tsx:217-231`);
`attempt()` returns `NotSatisfied` only for an unaccepted intent
(`scenario.rs:192-196`). Since unrendered intents can't be clicked,
`not-satisfied`, the verdict line "That did not fit the moment"
(`scenario.tsx:192-196`) and the Recovery moves group (`:232-245`) can never
appear. Machine count: **21 recovery branches across the 21 shipped
scenarios are unreachable**; `empty expected_actions` nodes: 0/21 (an empty
set accepts everything, still never fails).

Fix direction: render a decision set wider than the answer (adjacent-intent
distractors), which makes S-01 real and revives recovery as designed content.

## S-03 — MAJOR (learner-model honesty): guided clicks stamp independent evidence

`finish_at` (`scenarios.rs:792-847`) records one scored interaction event per
completed node with the session's support level; with no ladder pressed the
level is 0 = independent (`scenario.rs:129-136`). A fully-guided click-through
(S-01: the answer was on the button) is recorded as an **independent** success
per node and feeds mastery/scheduling. Evidence inflation across the product,
not just this section.

Fix direction: scenario evidence must be gated on the interaction being a
real retrieval (distractor set present, correct-understanding conditions), or
down-stamped (e.g. never better than `supported`) until S-01/S-02 land.

## S-04 — MAJOR: transfer variants complete on one click with no payload

`transfer_at` (`scenarios.rs:764-788`) → `complete_transfer`
(`scenario.rs:221-233`) just marks a declared id done; the YAML variants carry
only `description`/`changed_variable` (e.g. `a2-comm-answer-phone.yaml:74-79`).
UI: one click adds the ✓ (`scenario.tsx:269-279`). `transfer_variants_required: 2`
is satisfied by two checkbox clicks with zero practice content.

Fix direction: transfers need real payloads (a variant mini-node walk or at
minimum a recall step), or the requirement must be removed from packs that
cannot honor it — never a decorative gate.

## S-05 — MAJOR (UI state bug): completed transfers visually reset

`view_of` always builds `transfers: done: false` (`scenarios.rs:575-583`).
Only `transfer_at` re-stamps `done` from the session (`:784-786`);
`attempt_at`/`support_at`/`recovery_at` return fresh views that do NOT
(`:682, :735, :759`), and `App.tsx:2715` replaces the whole active view.
Sequence in the real app: ✓ transfer → click any action or support rung →
the checkmark and the `2/2` counter drop back to `0/2`, then reappear if the
transfer button is pressed again. Looks like lost progress.

Fix direction: stamp `transfer_done` in every command that returns a view
(one helper), plus a test pinning checkmark survival across a step.

## S-06 — MAJOR (affordance class; owner finding S-4): bare `.btn` has no styling, so working buttons look disabled

`packages/ui/src/styles.css:245-259` — `.btn` sets size/weight only; **no
background, border is `1px solid transparent`, no color**. Colour comes only
from `--primary`/`--quiet` variants (`:261-280`). Shadowing's
Play model audio / Record / Stop use bare `btn` (`shadowing.tsx:101, 105,
109`); bare `btn` appears in 7 component files (`App, settings, words,
lesson, hub, onboarding, shadowing`). Meanwhile the genuinely disabled
Previous/Next are `btn--quiet` (`shadowing.tsx:120-138`) with a visible box at
opacity 0.55 (`:282-285`). Net effect, exactly as the owner reported: the
enabled controls read as grey dead text and the one disabled control looks
more alive than its enabled siblings.

Fix direction: no bare `.btn` in markup — every control picks a variant
(Record/Play/Stop are primary-ish actions); or give plain `.btn` a defined
rest/hover/disabled treatment in the stylesheet, plus an a11y test that
enabled/disabled affordances are visually distinct.

## S-07 — MINOR: the "No supports" ladder rung is a permanently dead button

The shipped ladder always declares level 0 "No supports"
(`a2-comm-answer-phone.yaml:66-72`), but no node carries a level-0 payload,
so `delivered=false` renders it disabled with the note "no help content at
this level in this pack" (`scenario.tsx:258-260`) — a dead control with an
apology, on every node. Either render level 0 as an info line (it means
"answer unaided", not a request) or omit undelivered rungs.

## S-08 — MINOR: lock walls speak developer

`prereq_name`/`unlock_hint` (`scenarios.rs:312-329`) emit raw ids:
"practice ja.lex.demonstratives.koko to supported (speaking)". A fresh-profile
learner sees 1 playable + ~20 rows of locked ids and tokens. The structure
(playable/near/later, one recommendation) is good; the copy needs the
capability's human name and a link to where it is practiced.

## S-09 — OBSERVATION: the section is thin

All 21 scenarios have exactly 3 nodes; ja A2 = 12 of them; ru ships 3 with
zero transfer requirement. Whatever the interaction model becomes, content
depth is a pack-authoring follow-up (REVIEW-001 queue discipline applies).

---

## Remediation cards registered

| finding | card | priority |
| --- | --- | --- |
| S-01 + S-02 + S-03 | `SCENARIO-INTERACTION-001` | P1 |
| S-04 | `SCENARIO-TRANSFER-001` | P2 |
| S-05 + S-07 | `SCENARIO-VIEW-CONSISTENCY-001` | P2 |
| S-06 | `BUTTON-AFFORDANCE-001` | P1 |
| S-08 | `SCENARIO-LOCK-COPY-001` | P2 |

Whether any of these ride `REL-001` is the owner's scope call; the review
card itself completes when this register is accepted and every finding is
registered or dropped. The section's acceptance remains the owner's.
