# REVIEW-APP-SPLIT-003D — SPEC axis

**Verdict: PASS** — the diff (code ba713af4) does exactly what the card asked: a pure-move
extract of the home header/Today wiring slice out of `App()` into
`apps/desktop/src/app/home-wiring.ts`, App.tsx keeping every hook. Nothing more, nothing less.

Reviewed 2026-11-27 at HEAD 469922c3 (nothing after 003D touched the slice; see reviewer-gates.log).

## Contract (card body + RUN-2 recipe in state/notes/APP-SPLIT-001.md)

- One budgeted slice, pure move, zero behavior change — MET.
- App.tsx keeps every hook — VERIFIED: `git show ba713af4` removes zero
  `use*(` hook lines (grep of the diff; only function bodies left App()).
- App.tsx LOC reduced by the slice — VERIFIED: 4448 -> 4259 (measured from the blobs),
  home-wiring.ts 304 lines. Matches the notes LEDGER table and the gates.log claim.
- Test/gate/pin files untouched — VERIFIED: the commit touches exactly 2 files
  (App.tsx, home-wiring.ts).
- Call sites unchanged (thin wrappers) — VERIFIED: `advanceSession`/`closeSession`/
  `pauseSession`/`resumeSession` wrappers keep the history-wiring and refresh call sites;
  the Home JSX props call `runStartSession`/`runResumeSession`/`runCloseSession`/
  `runStartCapstoneSession` directly.

## Pure-move claim — independently verified (not trusted from the gates.log)

Extracted the base region (ba713af4^ App.tsx, `isSessionRunnable` .. before the K-15
placement comment) and the module body, normalized whitespace + deps-prefix + run-names.
Residual diff is scaffolding only, zero logic tokens:

1. `deps: HomeWiringDeps` added to every exported function signature;
2. `profileId` -> `profileId: profileId` (object-shorthand impossible once the binding
   became `deps.profileId`);
3. one prettier re-wrap of the `setPathNodes((await inv("unit_path", ...)))` call.

This matches the gates.log's "4-line diff, all one prettier re-wrap" claim (modulo the
normalization choices). Comments/doc blocks rode along verbatim.

## Deps-bundle placement (the 003C TDZ pitfall)

`sessionWiringDeps` is declared at App.tsx L1911, AFTER every referenced binding is in
scope (refs L365-388, showSessionBridge L427, openPractice L1717) and before any call
site; no boot effect reads it (all consumers are click handlers and the refresh
callback). The module header and the in-file comment both state the constraint. Correct
placement per the RUN-2 recipe — pitfall avoided.

## Nothing out of scope

No extra features, no renames beyond the run-prefix convention used by the sibling
slices (003A-C), no behavior edits. One style-only nit (no defect): the Home JSX
`onResumeSession` prop changed from `() => void resumeSession()` to
`() => runResumeSession(...)` — returns a promise into a `() => void` prop,
behaviorally identical; other props kept the explicit `void`.

No FIX card required.
