# CAPSTONE-WIRING-TEST-001 — journey test for the App-to-Home capstone wiring

## Contract (board card t_e58940b6)
UNIT-CAPSTONE-001 shipped the capstone review UI but App.tsx never passed
`onStartCapstone`/`capstoneResult` to Home — dead on main until chore
6db2c26b wired it, and nothing caught the gap because unit tests mount Home
with hand-supplied props. This card pins the wiring with a journey that
mounts the shipped `<App/>`.

## Shipped shape
- `apps/desktop/src/journeys/harness.tsx` — capstone fixture added to the
  shared fake engine, mirroring lib.rs:
  - scenario opt-in `capstone: { doneGoals }` (every non-opt-in profile is
    byte-identical to before — existing journeys' node counts never shift);
  - `unit_path` mirror emits ONE synthesized checkpoint node per band
    section AFTER the section's units, reserved id `capstone.<pack>.<band
    key>`, `kind: "capstone"`, locked until all section units done, done
    only on a PASSED recorded attempt, in-progress after an unpassed one,
    no node when the pool is empty;
  - `capstone_plan` mirror (`capstone_plan_at`): mixed `recall-meaning`
    plan over the section pool (lib.rs `capstone_pool`: lexicon words only
    in fixture packs), engine's own CAPSTONE_ITEM_CAP=16 / 30s, honest
    refusals;
  - `capstone_complete` mirror (`capstone_complete_at`): recounts the
    attempt-grouped Correct evidence rows `<sessionId>:<contentId>` that
    the `practice_submit` mirror writes (`recordGraded`), pass rule
    `capstone_passes` (pool>=4 needs 80%, smaller pool a clean sweep),
    records pass OR fail honestly;
  - `Profile` gained `unitsDone/capstoneWorld/capstoneAttempts/
    gradedGroups/correctContent` — all empty/default for other journeys.
- `apps/desktop/src/journeys/capstone-wiring.journey.tsx` — two journeys:
  1. PASSED walk: node's own Start button exists only because App passes
     `onStartCapstone`; asserts `capstone_plan` args, runner (not lesson)
     opens, all submits share one session id, `capstone_complete` receives
     that id (engine-side recount, never a UI tally), finish card on Home
     ("4 of 4 recalled") renders only from `capstoneResult`, node flips to
     the recorded caption.
  2. FAILED walk: one miss under the 80% bar -> honest fact line
     ("Section review recorded — 3 of 4 recalled", "Not passed yet", no
     consolation copy), action returns renamed "Run the section review
     again".

## Regression guarantee
Home declares both props OPTIONAL (home.tsx 267-268), so removing them from
App keeps tsc green — only this journey sees the break. Mutation proof at
a4d56cce worktree: stripping the two props fails both tests at the Start
click. See `state/evidence/CAPSTONE-WIRING-TEST-001/`.

## Run history
- Run 214: wrote journey red-first then green (2/2), implemented the
  harness fixture, hit the 80/80 cap mid full-suite gates. Lane left
  uncommitted in the main tree.
- Run 215 (this close): verified WIP, re-ran the full battery (tsc 0,
  full vitest 626/626, journey 2/2, eslint/prettier clean, learner-copy
  audit 0), ran the mutation red proof, committed code + evidence +
  ledger. `gates.log` has the full battery.

## Pitfalls banked
- vitest 5.0.3: no `--reporter=basic` (run dies at reporter load).
- JSx mutation comment trick fails under oxc (`{/* … — … */}` parse error);
  just delete the lines for mutation proofs.
