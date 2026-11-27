# REVIEW-APP-SPLIT-003C — SPEC verdict

Target: APP-SPLIT-003C (code 96a3cc1c, ledger cd82a606). Reviewer: default. Date: 2026-11-27.

## Verdict: PASS

The diff does exactly the pack/session/claims refresh wiring slice move the
card asked for, nothing more and nothing less. The pure-move claim is TRUE at
the token level — stronger than 003B (which had one deviation): all six moved
bodies are verbatim after the documented normalization. No FIX card needed.

## What the card required vs. what shipped

| Requirement | Result |
| --- | --- |
| Pure move of the pack/session/claims refresh wiring slice into `apps/desktop/src/app/pack-wiring.ts` | YES — reviewer ran an independent per-body brace-matched extraction + normalization (strip indent, drop blanks, strip `deps.` prefixes, drop the `const { inv } = deps;` preamble, map intra-module calls `runRefreshInstalled(deps)`/`runRefreshLanguages(deps)` back to the old names) of all six bodies against `5738ccf4:apps/desktop/src/App.tsx` (the 003B ledger base, which is exactly 96a3cc1c's parent): refreshLanguages, refreshInstalled, updateFromCatalog, installCatalogPack, cancelInstall, importPack — **ALL SIX IDENTICAL** (37/12/25/28/6/16 normalized body lines). All comment prose (Sweep finding 19, D7, K-63, PACK-UPDATE-UX-001, sweep-ts-dup-install, cancel-install rationale) traveled with the code. |
| App.tsx keeps every hook | YES — hook-call counts byte-equal across the cut: useState 51/51, useEffect 16/16, useRef 4/4, useMemo 3/3, useServeProbe 1/1 (useCallback 0/0). pack-wiring.ts imports zero React hooks — type imports + `loadSessionPack`/`Invoke` from `./primitives` only; it is plain async functions + one interface. |
| App keeps all pack state, the thin wrappers, `switchLearning`, all JSX | YES — the six wrappers survive in App.tsx as one-line delegations; the diff touches no `switchLearning` line, no onboarding `install()` line, and no JSX (import block, five delegation bodies, one deps-bundle insert, one import). |
| Deps-bundle timing (TDZ pitfall — the earliest-in-scope placement, not the 003B late pattern) | YES — `packWiringDeps` is declared at App.tsx:801, immediately after the `useServeProbe` destructure (the earliest point all 17 referenced bindings are in scope). The boot effect (useEffect at line 708) is the only mount-time caller of `refreshInstalled()`; effect callbacks run after the render body completes, and the early placement additionally makes that moot. The shipped placement matches the lesson the repo banked from this exact slice ("place such bundles at the EARLIEST point where every referenced binding is in scope"). |
| One green checkpoint, never stacked | YES — single slice commit for the module; `git log 96a3cc1c..HEAD -- apps/desktop/src/app/pack-wiring.ts` is empty: the file has zero later commits, so the checkpoint was never stacked. |
| App.tsx LOC reduced by the slice | YES — reviewer-measured from git: 4509 at 5738ccf4, 4448 at 96a3cc1c, exactly as the ledger claims. |
| tsc clean; vitest green | YES — lane gates.log recorded tsc exit 0 + 77 files/694 tests at the checkpoint; reviewer re-ran at current HEAD independently: `npx tsc --noEmit` exit 0 and `npx vitest run` 83 files / 725 tests passed (count grew from 694 only via later practice-lane test additions; zero failures). |
| Nothing more (no out-of-scope additions) | YES — new module exports exactly the six `run*` functions + `PackWiringDeps`; App.tsx's import block adds exactly those eight names; zero test files touched (diff stat: exactly 2 product files); the App.tsx `packWiringDeps` mentions total 8 = 1 declaration + 6 delegation call sites + 1 comment, matching the commit message. |
| Nothing less (no omitted acceptance items) | YES — every ROADMAP acceptance bullet has evidence in gates.log + the above measurements. |

## Notes

- **N1 — gates.log LOC prose off by two**: `pack-wiring.ts: 187 lines`
  (state/evidence/APP-SPLIT-003C/gates.log:35) vs. actual 185 lines
  (git-wc at 96a3cc1c and the lane's own diffstat both say 185). Immaterial
  prose miscount in an immutable evidence log — recorded here, log left
  untouched per evidence-immutability rule. No FIX card.
