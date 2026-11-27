# REVIEW-APP-SPLIT-003B — SPEC verdict

Target: APP-SPLIT-003B (code bc0307cb, ledger 5738ccf4). Reviewer: default. Date: 2026-11-26.

## Verdict: PASS-WITH-NOTES

The diff does exactly the settings/import wiring slice move the card asked for —
pure move, App.tsx keeps every hook, zero out-of-scope additions (the 003A
stray-formatting-hunk shape is NOT repeated here). Notes are one non-verbatim
line (a redundant non-null assertion) and two prose-count nits; none is a
product-code defect, no FIX card needed.

## What the card required vs. what shipped

| Requirement | Result |
| --- | --- |
| Pure move of the settings/import wiring slice into `apps/desktop/src/app/settings-wiring.tsx` | YES with one token-level deviation (N1). Reviewer ran an independent per-body brace-matched extraction + normalization (strip indent, strip `deps.` prefixes, drop the `const {…} = deps` preamble, drop blanks) of all six moved bodies against `0e66c227:App.tsx`: exportProfileData, previewRestore, confirmRestore, confirmProfileDelete, switchProfile — **IDENTICAL** (7/14/13/30/32 normalized lines). primeSettingsReads differs on exactly ONE line (N1). All comment prose (Sweep finding 20/15, R06, K-77/K-90, D7, O-06) traveled with the code. |
| App.tsx keeps every hook | YES — hook-call counts byte-equal across the cut in the same script: useState 51/51, useEffect 16/16, useRef 4/4, useMemo 3/3, useServeProbe 1/1 (useCallback 0). Nothing in settings-wiring.tsx imports React hooks; the module is plain async functions + types. |
| App keeps all Settings state, openSettings, the whole Settings-route JSX | YES — openSettings still defined in App and called only from its two onClick sites; settingsError/settingsLoading/settingsDeleteArmed/settingsSwitchArmed/restorePath/restoreChecked state all remain; the Settings-route JSX block is untouched except the five handler props (`onExport={() => void exportProfileData()}` → `onExport={() => void runProfileExport(settingsWiringDeps)}` etc.). |
| Deps bundle timing ("after everything is in scope") | YES — `settingsWiringDeps` is declared at App.tsx:3646, immediately before the return, after every referenced binding; `primeSettingsReads` is reached only via openSettings (event handlers, not a mount-time async IIFE — the 003C TDZ trap pattern does not apply here). Per-render construction reproduces the old closure capture timing exactly. |
| Call sites as stated | YES — 8 in-file mentions = 1 declaration + 1 prime call + 5 JSX handler props + 1 explanatory comment. Matches the commit message's "five Settings call sites and inside primeSettingsReads". |
| tsc + vitest green (one checkpoint) | Accepted per the slice's own gates.log (77 files / 694 tests) + the card's "do not re-execute batteries" instruction. Corroboration without re-run: both commits touch ZERO test files (diff stat: exactly 2 code files), so the count cannot move from the 694 baseline the reviewer independently re-verified in REVIEW-APP-SPLIT-003A; descendant lanes' committed gates.log (003C, 003D) also report 77/694 at trees built on this one. |
| Old symbols fully removed | YES — `exportProfileData(`, `previewRestore(`, `confirmRestore(`, `confirmProfileDelete(`, `switchProfile(` have zero remaining references in App.tsx at bc0307cb. |

## Notes

- **N1 — one line is not literally verbatim** (also the STANDARDS evidence note D1):
  `await soft("language packs", () => refreshLanguages())` shipped as
  `await soft("language packs", () => deps.refreshLanguages!())` — a **redundant
  non-null assertion** (`refreshLanguages` is a non-nullable async function
  declaration in App and a non-optional member of SettingsPrimeDeps, so `!` is a
  compile-time no-op; tsc green confirms zero type impact). Type-level trivia,
  not a behavior change; the `!` survives in current main. No FIX card: a
  one-character cosmetic removal is not a defect — fold it into the next lane
  that touches the file (see standards-verdict.md).
- **N2 — "six engine-backed prime reads" is prose inherited from FEEL-LOADING-001**
  (App.tsx comment predates this lane); the actual body performs five `inv()`
  reads plus the speech/packs/aligner/mic/output refreshes (which the commit
  message lists correctly and exhaustively). No read was dropped or added by the
  move — the body is otherwise verbatim. Prose nit only.
- **N3 — intentional type tightening in the dep interface** (observation, not a
  deviation to fix): `setStep: (v: "welcome" | "resume") => void` and
  `setRoute: (v: "practice") => void` narrow the real setter types to exactly
  what the slice uses. Structurally compatible (the real setters accept a
  superset); it documents the slice's actual reach.
