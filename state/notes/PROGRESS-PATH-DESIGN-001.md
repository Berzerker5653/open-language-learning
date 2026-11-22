# PROGRESS-PATH-DESIGN-001 — how progress is presented, research + proposal

Date: 2026-11-22. Trigger: owner dogfood, verbatim: "I just did the 5-minute session. And now I'm confused as to how to continue proceeding forward... I know a lot of them use some sort of linear bubble tree... this would also make it easier for our Learners to go back to information that they have studied before... gives them a better physical representation of where they are. Research this and come back to me, we can bounce ideas off each other."
Status: RESEARCH + PROPOSAL. No implementation cards until owner signs off on shape.

## What the market does (evidence)

1. **Duolingo replaced its branching skill-tree with ONE linear path (2022)** — explicitly because "learners were not always sure how to navigate the tree" (Duolingo Research Report DRR-24-04). Each circle = one lesson; lessons grouped into units; new AND review lessons interleaved by the scheduler; practice built INTO the path (they removed "cracked skills" you had to go fix). Duolingo Handbook: the switch cost DAU/monetization initially and was still "the right decision... prioritized real mastery over speedrunning" and gave "clearer insights into learner progress." Their research (DRR-24-04) later validated proficiency outcomes through A2.
2. **The backlash names the exact feature we should steal:** experienced users' #1 complaint (r/duolingo) is that the path "doesn't make the repetition intuitive" — going back for review is invisible; they wished the path itself showed when the next step points BACK at something due. Also: review scheduling by lesson-count rather than time is criticized.
3. **Spark Chamber (indie electronics curriculum) — the node-state model:** every topic node is LOCKED ("you can see it and where the subject leads"), READY (prerequisites lit), LIT (proven, not attended), or REVIEW-DUE (lit topics return at 1/3/7/14/30 days; a miss restarts the schedule; two misses = "shaky"). "Every line between two topics marks a real prerequisite, so you always know WHY a topic is locked and what it leads to."
4. **Codemm (tiny language-of-code course):** path where the CURRENT node is whatever the scheduler offers — "a due review, otherwise the current topic"; mastered nodes re-open for reread/practice; each node shows "review in N days". This is the smallest elegant implementation of review-visibility.
5. **Kana Daily:** lesson grid with lock gates (quiz 60%+ unlocks next day), a "Review Due (X)" button on the dashboard, and a full character grid colored by learned status — cheap, physical "where am I" map.
6. **Busuu (negative example, G2 reviews):** progress that "pushes you forward" while review feels hollow → learners distrust the map. Lesson: the node state must reflect PROVEN mastery (evidence), not attendance. Our mastery_snapshots/evidence_events already do this.

## What we already have (no new plumbing needed for the data)

- **Curriculum order**: languages/<loc>/curriculum/units/*.yaml are numbered (on-ramp 010, 011... then 1xx+) with goal_id + prerequisites — a ready-made path sequence.
- **Gating engine** (from SESSION-SEQUENCE-001 / PRACTICE-GATE-001): knows exactly which units are unlocked for this learner right now — that IS the locked/ready computation.
- **mastery_snapshots** (per content, per dimension, with confidence): proven-ness per unit.
- **scheduler_state.due_at**: per-item review-due times — "REVIEW-DUE" node state = any due item in that unit.
- **Sessions/plan_json**: what the learner is doing right now.

## Proposal (phased; owner to shape)

**Phase 1 — The Path screen (view only).** A scrolling vertical journey of UNIT nodes in curriculum order (grouped into sections: On-ramp, A1, A2...; unit count per section ~10-20 so the screen never shows 818 dots). Node states, Spark-Chamber style:
- 🔒 locked (dim, shows name + what it unlocks — never a mystery),
- ○ ready (the next units you may start),
- ◉ current (today's plan lives here — the app's "you are here" pin),
- ✓ done (attendance + evidence),
- ⟳ review due (a DONE node that glows again when scheduler items in it are due — this is Duolingo's missing piece and the fix for "how do I continue": the path itself keeps lighting up).
Tapping any node you've started = its unit detail (activities, stories, "strengthen" drills). Scroll up = visible history of everything learned (the journey feeling CNET praised).

**Phase 2 — The path IS the plan.** After finishing a session, the after-session screen says what's next ("Next: unit 011 — two new letters · or review 4 due items") and pins the path to the next lit node. The current-offer rule (Codemm): offered step = due review if any, else next ready unit. Today tab = the top of this path.

**Phase 3 — Revisit mechanics.** Tap a ✓ node → "Reopen": generates a review session from that unit's weakest/due items (PRACTICE-GATE-001's eligible-item engine already builds exactly this queue). "Review Due (N)" chip at the top of the path (Kana Daily pattern).

## NOT doing (and why)
- Branching multi-path tree (Duolingo's evidence: confusion; our spec: single goal ladder).
- XP/league gamification chrome (out of scope, master spec; the map itself is the motivation object).
- Making node "done" from attendance alone (Busuu distrust trap; mastery_snapshots govern).

## Open questions for the owner (bounce)
1. Path as the Today tab itself, or a 6th nav item ("Path")? (Recommend: Today becomes the path top — fewer tabs, one source of truth.)
2. Section naming: keep CEFR-ish (On-ramp, A1, A2) or friendly unit titles only? (Recommend: friendly titles, CEFR as small subtitle.)
3. Locked units visible ahead (Spark Chamber: see where it leads) or hidden until unlocked? (Recommend: visible, dim, with prerequisites named — matches "preview what's ahead" already on the board.)
