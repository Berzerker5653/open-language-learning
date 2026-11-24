# FIX-HOME-POSTURE-PENDING-001 — stale activePack posture claim while the pack read is in flight

Owner/agent: default lane. 2026-11-24.

## Defect (from REVIEW-HOME-FLASH-001 spec verdict, committed under state/evidence/REVIEW-HOME-FLASH-001/)

`home.tsx` rendered the pack-posture badge (`p.activePack`, App.tsx call site
5200-5204) whenever `activePack` was non-null — including while `packsPending`
was true. Across the profile-open flow the resume (App.tsx:1995-2012) sets
`setPacksPending(true)` without clearing `installed` / `activeClaims` /
`activeIds`, so `activePack` carries the previous profile's state and Home
renders the stale posture badge ("Previous Profile Pack · AI-GENERATED CONTENT…")
while the new read is in flight — the exact flicker class HOME-FLASH-001 killed.
The pin at home.test.tsx:188-206 passed no `activePack` at all, so the gap was
invisible to the suite.

## Fix

Stage 1 (code): gate the posture branch on the settle state —
`{p.activePack && !p.packsPending ? (…)}` — renders the badge only once the
read has settled. No change to the warning/notice branches (packsUnknown,
noPack-with-settle, scaffold) which were already correct.

Stage 2 (pin): extend the HOME-FLASH-001 pin to pass a stale activePack with
`packsPending` and assert the badge and the stale name/posture do NOT render
while the scaffold stays.

## Why this fix and not the alternative (clear stale state at profile-open)

Clearing installed/activeClaims at profile-open is a larger behavioural
change (other surfaces read those states) and does not by itself address the
case where activePack is stale for any other reason. Gating the render on
`packsPending` is minimal, in scope of the spec ("no posture claim" while
pending), and covers every stale-activePack case globally.

## Verification

- `npx vitest run` — 665/665 green (includes the new stale-activePack pin)
- `npx tsc --noEmit` — exit 0
- No test deleted, no assertion weakened (the affordance pin re-pin below is
  a separate card).
