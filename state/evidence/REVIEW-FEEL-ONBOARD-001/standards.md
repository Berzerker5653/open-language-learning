# STANDARDS axis — FEEL-ONBOARD-001 lane

**Verdict: approved** (two informational notes, no FIX card warranted)

## Commit hygiene — red-contract-first ordering: correct

Actual lane sequence on main (`git log dea880b0~1..2aa55670`):

1. `dea880b0` docs(roadmap) — card open with frozen contract in
   `state/notes/FEEL-ONBOARD-001.md` (task-card-first convention).
2. `cdc3fec3` test(feel-onboard) — RED at base: `onboard-feel.test.tsx`
   (254 lines, rule-body pins + SSR contracts).
3. `dc4aac50` feat(ui) — the implementation.
4. `d399d6c5` + `b421e6aa` test(feel-onboard) — capture harness + its
   honesty iteration (added stepper frame; app-entry settled by poll
   instead of a fixed 150ms sleep — disclosed in gates.log).
5. `9af92091` fix(ui) — stepper column layout (bugfix response to the
   lane's own capture vision QA; in-scope, see spec.md).
6. `b5039f47` evidence — 17 files: green + red logs, red/green
   result.json, 12 screenshots, gates.log.
7. `2aa55670` ledger — close.

A foreign `evidence(dogfood)` commit (`b4558219`, another card) is
interleaved between 2 and 3 — normal multi-agent main, not a lane issue.

**Note (planner hygiene, not a lane defect):** the REVIEW card body cites
`60d29515` as this lane's red-at-base commit; that sha is FEEL-SETTINGS-001's
red test (`test(feel-settings)`, not an ancestor of `dc4aac50`). The lane's
real red contract commit is `cdc3fec3`, which is what this review examined.
The planner should fix the body template/sha reference; no product action.

`dc4aac50` also touches its own red test file with two prettier
normalizations (regex char-class dedup in `ruleBody`, quote style).
Verified equivalent — same escape set, same asserted string. No gate
weakened (J8 clean).

## Ledger hygiene: clean

`state/task-state.json` FEEL-ONBOARD-001 entry (via `2aa55670`) lists 9
evidence paths; all exist on disk by the exact names (verified with
`ls`). `status: done`, `active_task: null` after close (validator-legal),
`updated` an ISO date, attempts 1. Reviewer re-ran
`python3 tools/validate_handoff.py --require-explicit-ledger-records` at
HEAD: PASSED (pre-existing WARNs only).

## Capture-harness honesty: claim verified

Read `scripts/feel-onboard-capture.mjs` end-to-end. The claim "wizard
walked by real clicks, only the SSE progress leg replayed" is **true**:

- The ONLY stubbed browser API is `window.EventSource`
  (`FakeEventSource`), armed only when the URL carries
  `?progress=known|unknown`; the canned frames are `install-pack` stage
  frames whose semantics are Rust-pinned. Declared in the header and in
  gates.log.
- Profile name typed via real `Input.dispatchKeyEvent` per character;
  hover measured via real `Input.dispatchMouseEvent` mouseMoved with the
  computed transform asserted (`matrix(1, 0, 0, 1, 0, -1)`).
- Pack really installed through the engine (`POST /api/install_pack`);
  first profile created through the real UI; three extra profiles via
  real engine `create_profile` so avatar hashing runs on engine-real uuids
  (the harness independently re-computes FNV-1a and compares — good
  cross-check, not a tautology).
- Interpretation note: step advances use DOM `el.click()` on real buttons
  (repo harness convention; fires the real React handlers), not synthetic
  pointer events — consistent with the repo's prior capture harnesses.
  Not a fidelity gap worth a FIX card.
- Red-at-base measurements are genuine negatives (`animationName: "none"`,
  `glide: null`, avatar rows `null`) — none of the telltale shape of the
  known symlink-farm trap where a "red" capture silently measures HEAD's
  CSS. gates.log records the build method (lane files at `cdc3fec3`, dist
  rebuilt, identical final harness back-to-back).

## Conventions / judgement-call checklist (CODING_STANDARDS §B)

- Tests assert behavior + pinned rule bodies per repo contract-test style;
  guard suites (motion-contract, onboarding, a11y, button-affordance,
  loading-feel) untouched since the red commit (`git log cdc3fec3..HEAD`
  shows only `dc4aac50`'s normalizations). Reviewer re-ran
  onboard-feel + motion-contract + onboarding: 60/60 green at HEAD.
- Motion budget legal: every duration rides `var(--dur|dur-fast|dur-slow)`;
  the only >300 ms loop is pulse-named. ADR-0002 posture held: no
  confetti/celebration, empty state is line art + existing copy.
- Honesty contracts held: no invented byte counts, no aria value under
  percent-null (K-62), no new color tokens (a11y pins), no engine/Rust
  changes.
- Commit messages assert only verifications that ran; gates.log discloses
  the harness iteration history, the avatar-clustering observation, and
  the pre-existing page-load focus outline visible in both red and green
  shots.

**Nit (no action):** contract item 5 says spans gain `profile-avatar--v1..v3`;
the code emits `profile-avatar--v0` unconditionally too (v0 carries no rule
— behavior identical, base styling applies). Cosmetic, not worth a FIX card.
