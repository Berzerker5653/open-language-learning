# REVIEW-APP-SPLIT-003E — SPEC axis

**Verdict: PASS** — the diff (code faa66d00) does exactly what the card asked: a
pure-move extract of the practice wiring slice out of `App()` into
`apps/desktop/src/app/practice-wiring.ts`, App.tsx keeping every hook. Nothing more,
nothing less.

Reviewed 2026-11-27 at HEAD 52c4b04d (nothing after faa66d00 touches the slice; see
reviewer-gates.log).

## Contract (ROADMAP.yaml `id: APP-SPLIT-003E` + RUN-2 recipe in state/notes/APP-SPLIT-001.md)

- Practice handlers (openPractice incl. saved-word branch + choose/check/finishPractice)
  moved to `app/practice-wiring.ts` as a pure move, App.tsx keeping every hook — MET.
- tsc clean; full desktop vitest green; App.tsx LOC reduced by the slice — VERIFIED:
  4314 -> 4210 (measured from the blobs, matches the -104 claim), practice-wiring.ts
  234 lines. Reviewer re-ran tsc + vitest at HEAD (83 files / 725 tests, green).
- The "practice state" in the KANBAN.md row stays in App() and is passed via the deps
  bundle — per the RUN-2 recipe ("pass the slice's state + setters as a props object;
  keep App.tsx owning the hooks"), exactly as siblings 003A-D shipped it.
- Test/gate/pin files untouched — VERIFIED: the code commit touches exactly 2 files.
- Call sites unchanged — VERIFIED: the four thin wrappers keep every JSX call site
  (`onChoose/onNext/onCheck/onStart`) and home-wiring receives the unchanged
  `openPractice` callback through sessionWiringDeps.

## Pure-move claim — independently verified (not trusted from the gates.log)

Deleted App() bodies reconstructed from the diff and diffed against the module bodies
after normalization (deps-prefix strip, destructure-drop, run-rename). Residual diff is
scaffolding only, zero logic tokens:

1. the `UX-003: first lessons…` doc comment relocated from inside App() to the module
   function's doc block;
2. one prettier re-wrap of the `if (sessionQueueRef.current) void runAdvanceSession(…)`
   line (grew past print width with the deps prefix);
3. the expected rewiring itself: `const { inv, profileId } = deps;` destructurings
   replacing captured closure vars, and `sessionQueueRef` reached via
   `deps.sessionWiringDeps` (the ref object is the same instance).

All 156 logic/comment lines otherwise token-identical.

## Deps-bundle placement (the 003C TDZ pitfall)

`practiceWiringDeps` is declared at App.tsx L1866, AFTER `sessionWiringDeps` (L1841,
which finishPractice's session advance needs) and after every other referenced binding;
it is read only inside the hoisted wrappers, which fire from click handlers and
home-wiring session code — no mount/boot-path reader. Pitfall avoided; the module header
and the in-file comment both state the constraint.

## Nothing out of scope

No extra features, no renames beyond the run-prefix convention used by siblings 003A-D,
no behavior edits, no test touched. The two imports the move orphaned (`drillStageId`,
`isMediaMissing`) were removed in the same commit — required hygiene, not scope creep.

No FIX card required.
