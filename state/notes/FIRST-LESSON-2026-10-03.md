# First lessons: new-item stream + runnable plan (UX-003)

Date: 2026-10-03. Triggered by the owner's first-session report: after
onboarding, the practice window showed "Nothing is due right now" with
nothing to do.

## Root cause

`build_plan` fed the planner three streams: due reviews (empty for a new
profile), weak skills (empty), and goal progression. ja-demo's only goal
(`ja.goal.demo.greet`) has a hard prerequisite (`ja.lex.demo.konnichiwa`
recall-meaning → independent), which a new user cannot satisfy — and
nothing in the engine ever introduced unseen lexicon items. Every
stream was empty, so the session was empty. Additionally, plan items
were display-only: raw `content_id` strings with no start action, so
even a non-empty plan answered no "what do I do / what am I learning".

## Changes

- Engine (`apps/desktop/src-tauri/src/lib.rs`):
  - New-item stream: every selected pack's unseen lexicon entries are
    progression candidates (`recall-meaning`), deduped against goal
    progression and due reviews. Any pack with a lexicon now yields
    sessions for a brand-new profile.
  - `PlanView`/`PlanItemView`: plan items carry `surface`/`gloss` from
    the pack lexicon (scheduler crate stays pure).
  - `practice_task` / `practice_submit`: deterministic four-choice
    recall-meaning runner. Correct answer never crosses IPC (task is
    rebuilt natively at submit; only the chosen index is sent). Scored
    evidence (`ja.activity.demo.mc-recall`) plus FSRS scheduler upsert
    (`rating_from_evidence` → `save_scheduler_state`), so practiced
    items later surface as due reviews / weak skills.
- Planner bug fix (`crates/scheduler/src/planner.rs`): the phase-2 fill
  loop could spin forever when leftover budget could not fit the next
  item but candidates remained (position-based break condition never
  became true). The new-item stream made this reachable — it hung
  `fresh_user_onramp_flow_persists_and_resumes` in-suite. Termination
  now compares progress made per pass. Regression test:
  `fill_phase_terminates_when_nothing_fits_anymore`.
- UI (`home.tsx`, `practice.tsx`, `App.tsx`, `styles.css`): plan items
  show the actual word + gloss; recall-meaning items are buttons that
  open the runner; after grading, "Back to plan" refreshes the session.

## Evidence

- Unit/integration: `cargo test --workspace` 53 suites ok / 0 failures
  (incl. new `new_profile_gets_first_lessons_and_runner_records_evidence`
  and the planner termination regression); vitest 25+3 passed;
  `pnpm typecheck` clean.
- Live GUI (debug binary, fresh profile "FirstCheck", real X11):
  - Home immediately showed "3 activities · about 3 minutes", items
    labeled "New material" with こんにちは/hello, 私/"I (neutral polite
    first person)", はじめまして/"how do you do (first meeting)".
  - Clicking こんにちは opened the runner: surface + 4 choices
    (hello / I (…) / how do you do (…) / grandmother).
  - Answering "hello" → "Correct" verdict; DB gained
    `evidence_events` row (`recall-meaning | scored |
    ["ja.lex.demo.konnichiwa"] | support 0`) and `scheduler_state` row
    `ja.lex.demo.konnichiwa#recall-meaning | fsrs-spike-0.1.0 |
    due 2026-10-06T22:31:38Z`.
  - "Back to plan" refreshed the session: konnichiwa rotated to
    "Strengthen a weak spot" (~40s); the other two unseen items remain
    new material. The full loop (introduce → practice → schedule →
    re-surface) works end-to-end.

## Known limits (not hidden)

- The runner covers `recall-meaning` only; other modalities show an
  honest "no practice runner yet" message.
- Goal progression items (e.g. `ja.grammar.demo.greetings`) have no
  lexicon entry, so they display by id and are not runnable yet.
- App restart still re-runs onboarding (no profile picker); tracked
  separately from this fix.
