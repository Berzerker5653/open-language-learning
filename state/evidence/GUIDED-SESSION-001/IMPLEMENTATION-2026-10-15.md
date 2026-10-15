# GUIDED-SESSION-001 — implementation evidence (2026-10-15)

Executed on GamingPC (`lab-main`). Status: **review** — the build and its
automated proof are complete; the UX acceptance judgement belongs to the owner's
hands-on pass (O-06) and cannot be self-certified here.

Roadmap definition: `tasks/ROADMAP.yaml:1968` (milestone M10, P2,
`required_for_desktop_1_0: false`, dependencies UX-001 and POLISH-001 both
`done`).

## Files that carry the feature

- `apps/desktop/src/home.tsx` — session types (`SessionStatus`, `SessionView`,
  `SessionOutcomeView`, ~lines 60-80), the single begin action
  (`data-session-begin`), the in-progress/paused panel
  (`aria-label="Today's session"`), the outcome summary
  (`aria-label="Session summary"`, `.session-summary`), and the demotion note
  `.plan-secondary` ("Or do one activity on its own:", ~line 302).
- `apps/desktop/src/App.tsx` — `session` / `sessionOutcome` state and
  `sessionQueueRef` (~364-377); `isSessionRunnable`, `publishSession`,
  `startSession`, `advanceSession`, `closeSession`, `pauseSession`,
  `resumeSession` (1765-1857); in-runner session controls
  (`[data-session-pause]`, `[data-session-stop]`) rendered outside the
  `[aria-label="Practice"]` section; `finishPractice` ends with
  `if (sessionQueueRef.current) void advanceSession(1);`.
- `apps/desktop/src/practice.tsx` — new optional prop `nextLabel` (default
  "Back to plan"), so the runner's own button says "Continue to next activity"
  or "Finish session" while inside a session.
- `apps/desktop/src/journeys/harness.tsx` — journey handlers now answer
  `practice_plan` with two runnable rows plus one non-runnable `saved-review`
  row, so the session legs are exercisable headlessly.

## Acceptance walked bullet by bullet

**"One primary begin action starts a session with a clear scope and exit
state."**

One button, `[data-session-begin]`, labelled from the engine's own plan numbers:
`Start today's plan — 2 activities, about 1 minutes`. Directly under it, the
exit copy: "You can stop at any point: what you finish is saved, and the rest
stays on your plan." The session is built from a snapshot taken at begin
(`sessionQueueRef.items`), because `practice_plan` re-plans after every
activity — without the snapshot "3 of 5" would be a moving number. Proven in
`apps/desktop/src/journeys/session.journey.tsx:50` ("begins, walks the plan,
pauses, resumes, and finishes honestly") and in `apps/desktop/src/home.test.tsx:507`
("offers one begin action that names the scope and the exit").

**"one next task is visible and its prerequisite or blocker is explained".**

This is the bullet that was already partly answered elsewhere, and the boundary
is stated rather than papered over:

- Today names exactly one next action (the session button) and one next
  capability (`Next up: <goal description>` plus its band gloss,
  `home.tsx:363-376`). The engine only ever returns a *ready* next goal
  (`NextGoalView` at `home.tsx:40-45` carries no blocker field), so the next
  goal itself has no unmet prerequisite to explain.
- Where a capability is not yet reachable, the explanation is on the Goal map
  route: `GoalPrereqView` (`lib.rs:3104-3140`) carries the prerequisite and its
  `ready_now` state, rendered by `GoalMap`.
- Where a plan row cannot be practised in this build, the row says so inline:
  "— no practice runner for this yet" (`home.tsx:345-353`), and the session
  summary repeats it ("The rest is still on your plan.").
- Not built here: a per-row blocker sentence on Today. The engine's plan never
  proposes a blocked item, so there is no blocked row to annotate.

**"pause/resume and an honest finish are defined."**

Pause → "Session paused — N left to do." with "Resume session"; stop →
"Session stopped after 0 of 2 activities." followed by "What you finished is
saved. The rest is still on your plan." Finish → "Session finished — 2 of 2
activities." with the same non-punitive sentence and the count of
not-runnable items. Both outcomes are measured, not claimed: the journey
asserts 2 `practice_submit` engine calls after a full session and **0** after
stopping at the first activity (`session.journey.tsx`, second test).
`closeSession("stopped")` records nothing extra, and there is no streak,
streak-restore or "you lost your streak" copy anywhere in the session path —
`python3 tools/audit_learner_copy.py` reports 0 findings over 33 source files.

Honest limitation, recorded in `docs/07_TECHNICAL_ARCHITECTURE.md`: the session
queue is **in-run only** — closing the app mid-session returns you to the plan,
which re-plans; no partial-session state is persisted, and no persisted-session
claim is made.

**"The full queue remains available but is no longer the primary structure."**

The per-activity rows are demoted, never removed: they sit under
`.plan-secondary` ("Or do one activity on its own:") and the journey asserts
both `.plan-item`s still exist after begin. The existing snapshots keep their
meaning: `journeys/first-run.journey.tsx` still finds its buttons,
`export-restore.journey.tsx`'s `.plan-item` / `.next-goal` snapshot lines and
`home.test.tsx`'s `class="plan-item"` assertions all pass unchanged.

## Measured

- `npx vitest run` (apps/desktop): **26 files / 239 tests passed** (was
  24/222); `npx tsc --noEmit` clean; `npx eslint src` clean.
- New tests: `journeys/session.journey.tsx` (2 journeys, full run + stopped
  run), plus 6 session cases in `home.test.tsx`.
- `a11y.test.tsx`'s `home` fixture gained `onStartSession` so the audit covers
  the new region; the learner-copy audit reports 0 findings.
- Not exercised here: a real screen reader reading the session region, and a
  human judging whether the copy lands. Both stay with the owner (O-06, O-03).

## What stays human

- Owner UX acceptance (the card is optional for desktop 1.0, but the "bounded
  session feels bounded" judgement is O-06's, not mine).
- Qualified review of any learner-visible claim: the session promises only that
  finished work is saved and unfinished work stays on the plan, which the
  engine tests already pin; no pedagogical effectiveness is asserted.
