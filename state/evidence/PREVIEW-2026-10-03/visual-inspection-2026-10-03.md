# Visual/interaction inspection of the preview UI (2026-10-03)

Method: the built frontend bundle was served locally and driven in real
Chromium (browser device) with a mock of the Tauri IPC using the exact
backend response shapes (the active model has no image input, so
inspection used accessibility snapshots + rendered text + geometry
rather than pixel viewing; the native window was separately confirmed
running via xdotool window title/geometry).

## Journey verified step by step

1. Welcome: name field + disabled "Create local profile" until name.
2. Language step: both packs listed with radios + Install, each labeled
   unreviewed; note about later switching + interface language.
3. Install -> "Installed"; Continue enabled; microphone step with
   Enable/Skip, skip never blocks.
4. Home: greeting, budget presets, plan list with learning reasons,
   "Places you can go" with open/locked + capability wording.
5. Languages: installed list with active marker, "Learn this" switch
   (marker swaps on click), empty-catalog "coming soon" + import,
   community/unreviewed labeling everywhere.
6. No horizontal overflow at 1100x720; nav: Practice/Progress/
   Pronunciation/Languages.

## Bug found and fixed (this is why visual inspection mattered)

`createProfile` never called `setProfileId(p.id)` on the native path,
so `profileId` stayed null and `finishOnboarding` silently skipped
`home_state`/`world_state`: the real app showed an EMPTY plan and no
environments after onboarding. Automated tests missed it (backend tests
call the command helpers directly; the smoke handshake exits before
onboarding; vitest has no interaction harness by convention).
Fixed in App.tsx (`setProfileId(p.id)`), rebuilt the native binary, and
re-verified the full journey renders plan + environments + switching.
The user's desktop window was restarted on the fixed build.

## Residual gap (recorded honestly)

No permanent automated interaction test exists for this UI wiring class
(no testing-library by convention; smoke exits pre-onboarding).
Candidate follow-up: extend the smoke handshake to drive onboarding in
the native app.
