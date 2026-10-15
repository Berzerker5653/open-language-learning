# CANDO-PROGRESS-001 — implementation evidence (2026-10-15)

Executed on GamingPC (`lab-main`). Status: **review** — implemented and
automatically proven; the wording's acceptability to a real learner is the
owner's judgement (O-06), and the pack text these lines quote is still `draft`.

Roadmap definition: `tasks/ROADMAP.yaml:1984` (milestone M10, P2,
`required_for_desktop_1_0: false`, dependencies UX-002 and K-34 both `done`).

## Files that carry the feature

- `apps/desktop/src/home.tsx:411-483` — `CanDoSummary` (`aria-label="What you
  can do now"`, owns the route `<h1>`; `CAN_DO_STATES = ["independent",
  "supported"]` at 420).
- `apps/desktop/src/home.tsx:485-534` — `ProgressView` demoted to
  `<h2>Recorded detail</h2>` with the line "The numbers behind those answers:
  internal ids, confidence, and mastery labels. Each skill grows independently —
  reading does not imply speaking."
- `apps/desktop/src/home.tsx:619` — `GoalMap` demoted to `<h2>Capabilities you
  are building</h2>`.
- `apps/desktop/src/App.tsx:3124-3126` — route order: `CanDoSummary` →
  `GoalMap` → `ProgressView`.
- `apps/desktop/src/journeys/harness.tsx:686` and `:701` — new headless
  handlers for `progress_summary` and `goal_map` so the route is exercisable
  without a Tauri host; payloads mirror `ProgressRow` and
  `GoalMapView`/`GoalDimensionView`/`GoalPrereqView` (`lib.rs:3104-3140`).

## Acceptance, walked

Single acceptance bullet: *"Progress answers what the learner can now do, what
changed, and what to do next before showing activity counts; internal IDs,
confidence, and mastery labels remain available as detail."*

**What the learner can now do.** Each line is the pack's own goal text plus the
modalities the engine already marks as usable: `Talk about family` followed by
`used in practice: Recall` — the modality is named as the action, not as
internal vocabulary. A goal enters the list only
when some dimension has `best_state ∈ {independent, supported}`
(`home.tsx:427-434`) — an unseen or forgotten skill cannot appear. When nothing
qualifies the panel abstains instead of flattering: "Nothing has been used well
enough yet for this app to say you can do it. That claim comes from practice,
not from time spent here." Pinned by `home.test.tsx:637` ("makes no can-do claim
the evidence does not support") and `:644` ("does not claim a goal is usable
while its evidence is only unseen").

**What changed.** Derived from the scheduler's own `needs_refresh` flag, not
from an activity log: "1 skill is getting old — the scheduler wants them
reviewed before they fade." / "Nothing you have learned is close to being
forgotten." The panel states its own scope beneath it: "This is what the
recorded evidence says today; the app keeps capability state, not an activity
diary." There is no streak, day-count or minutes figure anywhere — deliberately,
because those are maximisable without learning (`AGENTS.md` product-quality bar).
`home.test.tsx:605` ("names the can-do claim and the fading skills, and the next
step") drives the due-review row with `needs_refresh: true`.

**What to do next.** `Next up: <goal description> — the plan names the
activities that lead there.` When the installed pack declares no path, it says
so and points at Settings → Language packs rather than inventing a step.

**"before showing activity counts … IDs, confidence, and mastery labels remain
available as detail."** The can-do section precedes both other sections, and the
journey pins the reading order structurally rather than by snapshot text:
`journeys/progress.journey.tsx:48,51` use `compareDocumentPosition` to require
the answers to come before `[aria-label="Progress"]` and `[aria-label="Goal
map"]`. The internal id `ja.lex.demo.obaasan` is asserted **inside** Recorded
detail (`progress.journey.tsx:47`), and `home.test.tsx:634` pins the other half:
no internal id may become the headline (`not.toContain("<h1>org.openlanguage")`).

**Accessibility side condition, fixed rather than relaxed.** The route audit in
`a11y.test.tsx` requires exactly one `<h1>` per route; adding a new heading
would have broken it. `CanDoSummary` takes the `h1`, `GoalMap` and
`ProgressView` became `h2`, and the audit's `progress` fixture
(`a11y.test.tsx:165-…`) was rebuilt to render the real route composition
(`<CanDoSummary/>` + `<ProgressView/>`) instead of loosening the invariant.

## Measured

- `npx vitest run` (apps/desktop): **26 files / 239 tests passed** (was
  24/222); `npx tsc --noEmit` clean; `npx eslint src` clean.
- New: `journeys/progress.journey.tsx` (journey f, 1 test over the whole
  mounted route) and 3 `home.test.tsx` cases (`:605`, `:637`, `:644`).
- `python3 tools/audit_learner_copy.py` → 33 source files scanned, 0 findings:
  no ticket or gate ids leaked into learner copy.
- Not exercised: a screen reader reading the new section (O-03), and a human
  reading these sentences.

## What stays human

- Owner acceptance of the wording (O-06).
- The can-do sentences quote **pack goal descriptions**, which for the journey
  content are still `status: draft` with no qualified-human records
  (`languages/{ja-JP,ru-RU}/review/WORKLIST-2026-10-14.md`). The app quotes the
  pack; it does not upgrade the pack's posture. REVIEW-001 remains the only path
  that promotes that text, and no CEFR or exam claim is made anywhere here.
