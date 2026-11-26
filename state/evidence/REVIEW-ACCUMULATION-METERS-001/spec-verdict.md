# ACCUMULATION-METERS-001 / REVIEW-ACCUMULATION-METERS-001 — SPEC verdict

Axis: (a) SPEC — does the diff do exactly what ACCUMULATION-METERS-001 asked?
Evidence reviewed: code 4e3e5512, ledger 2901afec, today-meters.png + today-meters.audit.json, home.tsx / home.test.tsx / App.tsx diffs, state/notes/ACCUMULATION-METERS-001.md.

## Verdict: FAIL (named defects — do not re-merge as-is; spawn FIX follow-up)

### Defects
- **D1 — My Words meter never primes on the primary entry path (blocking for the feature's promise).**
  - `apps/desktop/src/App.tsx:1882` (`resumeProfile`): `void refreshMine()` is called after `setProfileId(p.id)` but `refreshMine()` (App.tsx:3268, closure over component-scope `profileId`) reads the STALE value — at launch it is `null`, so the mine_list read no-ops and `mineCount` stays null, so the My Words meter never renders on the primary profile-entry path. In a mid-session profile switch it can read the previous profile's list and render the wrong profile's count under the new profile's header.
  - `apps/desktop/src/App.tsx:1816` (fresh-profile completion): sets `environments` directly but never primes `mineCount`, so the meter abstains on the fresh-profile path too.
  - Spec says render on `activePack && !packsPending`, never from stale pre-settle state — the RENDER gate itself is met (meters abstain), but the read never landing means the My Words meter is effectively dead on entry; "hidden while pending" is satisfied by abstention, not by a live count.
  - Named fix direction (not applied here): prime the count with an explicit profileId argument (e.g. `refreshMine(profileId)` reading `mine_list` with `p.id`), and prime it in the fresh-profile path.
- **D2 — grammar in the honest label (minor).** `apps/desktop/src/home.tsx:~372`: "1 forms confirmed" instead of "1 form confirmed"; the pin at home.test.tsx ("1 forms confirmed") pins the bad form. Minor copy defect; pin should be re-pinned to the corrected string.
- **D3 — evidence capture fidelity (non-blocking note).** state/evidence/ACCUMULATION-METERS-001/today-meters.png renders the harness entry (accumulation-screens.tsx mounts `Home` bare, no app shell/padding) — vision check shows content flush to the left edge with no shell margin. The meters themselves render one-line and unclipped in the capture (audit JSON: stripHeight 21, stripScrollW==clientW==390, overflow 390/390), so the evidence is honest about the METERS but does not reproduce the shipped shell's layout. Worth a harness-fidelity note or a shell-wrapped capture next pass.

### In-scope (verified against the card)
- Two counters, honest sources: My Words = `mine_list` length (same definition as the My Words surface); Worlds = the pack's own `world_state` unlocked/total (no invented denominator) — home.tsx:~349-372, App.tsx:5249-5261.
- Settle gate: renders only when `activePack && !packsPending && !noPack && !packsUnknown`; per-meter abstention on its own pending read (`mineCount == null` / `worlds == null`).
- Compact one-line strip, `white-space: nowrap`, `overflow: hidden`, text-overflow ellipsis; vitest pins render-on-settle / hidden-while-pending (packsPending / noPack / packsUnknown / no activePack) / zero-worlds abstain / honest labels — home.test.tsx:984-1041.
- 390px capture + audit JSON under state/evidence/ACCUMULATION-METERS-001/ (files exist, values match the gates.log).
- Dev-only harness (accumulation-capture.html/tsx, vite.accumulation-capture.config.ts, scripts/accumulation-capture.mjs) + .gitignore dist-accumulation entry — in-scope dev tooling, not shipped.

### Out-of-scope additions / omissions
- No out-of-scope additions found beyond the dev-only harness (which the card's evidence requirement implies). No omissions beyond D1/D2 (the counters both exist; only the live-read wiring and the grammar defect prevent a clean pass).
- No gates/tests weakened; no changes to existing tests.

## Verdict: FAIL — D1 blocking (My Words meter never primes on entry; wrong-profile risk in the stale-closure call), D2/D3 minor. Ship-or-fix: spawn a FIX follow-up (D1 + D2 re-pin; D3 note), do not land this as-is.
