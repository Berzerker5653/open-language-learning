# HOME-FLASH-001 — "No language is set" flickers ~1s on profile open with a pinned pack

Live defect (owner phone, `state/notes/UI-VERIFY-2026-11-23.md` defect 7,
HEAD 22a04a1c): opening a profile — Home flips to the settled view while the
pack read runs, and until the read lands `activeIds` is `[]` with
`packsUnknown=false`, so Home renders the "No language is set for this
profile yet" warning for ~1s. The store says the pack is pinned (0.4.9).

Root cause (measured, not guessed):
`resumeProfile` / `finishOnboarding` flip `setStep("done")` (and the fill-in
awaits) synchronously, then call `void refreshLanguages(profileId)`. `activeIds`
is `[]` and `packsUnknown` is `false` for that whole window, so Home computes
`noPack=true` and paints the pack-absent warning + the withheld plan prompt.
The same void-call pattern is what makes the ~1s flicker visible at HEAD
(red: 5 poll hits between t=201ms and t=1009ms).

Fix (neutral while in flight, never a layout jump):
- `App.tsx`: new `packsPending` state. `setPacksPending(true)` in
  `resumeProfile` (before `setStep("done")`) and `finishOnboarding` (before the
  void `refreshLanguages`), and `refreshLanguages` wraps its `Promise.all` in a
  try/finally that sets `packsPending(false)`.
- `noPack` prop now excludes the in-flight window:
  `activeIds.length === 0 && !packsUnknown && !packsPending`.
- `Home` (`home.tsx`): new optional `packsPending` prop. While pending it renders
  NO pack-posture line, NO pack-absent notice, NO pack-unread notice — the
  neutral scaffold (greeting, prompt, budget, plan) keeps its exact HEAD
  DOM so the first settle is the only content change. Settled states are
  byte-identical to before: active pack → posture badge; `packsUnknown` →
  failure notice (Sweep finding 19); `noPack` → missing-language notice.
- No serve-banner rule, TODAY-FIRSTSCREEN-001 pill placement, or SERVE-BANNER-001
  behavior touched.

Evidence gates (see gates.log):
- red-at-HEAD capture (scripts/home-flash-capture.mjs, 390x844, mobile:true, live serve): 5 occurrences (t=201/403/605/807/1009ms).
- green capture after fix: 0 occurrences (the first 5s window) + healthy home capture + 1 path-pin.
- vitest: home.test.tsx 36/36 (new pin: packsPending renders neutral); full suite 664/664; `npx tsc --noEmit` clean; eslint + prettier clean.
- No Rust/pack changes: the live-serve capture uses the existing `target/debug/lts-serve` binary; `vite build` only.
