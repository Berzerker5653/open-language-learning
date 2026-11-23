# SPEC axis — FEEL-ONBOARD-001 lane

**Verdict: approved**

Contract: `state/notes/FEEL-ONBOARD-001.md` (frozen at card open, `dea880b0`);
board body: six asks (stepper done-state + drawn check, step-card glide,
honest install progress bar, profile card hover + app entry glide,
deterministic avatar colors, warm first-run empty).

Item-by-item against `dc4aac50` + `9af92091`:

1. **Stepper done-state + step-change motion** — met exactly.
   `onboarding.tsx` derives the visible sequence (`STEP_ORDER`, minus
   `speech-setup` until `micChosen`) and marks earlier steps
   `stepper-done` with an inline aria-hidden stroked `<svg class="step-check">`;
   CSS fills the circle `--ok`/`--ok-ink` with `color: transparent`
   (number suppressed), check draws via `check-draw var(--dur-slow)`
   (stroke-dashoffset 16px), connector turns `--ok` and fills via
   `link-fill var(--dur)` `transform-origin: left`, active dot ring
   `0 0 0 4px var(--accent-soft)` via `ring-in var(--dur-fast)`. Labels
   stay plain text nodes (`>Welcome<`/`>Speech<` SSR pins survive),
   `aria-current="step"` unchanged, resume still renders no stepper
   (pinned in the contract test and re-run green by the reviewer).
2. **Step cards glide** — met. All five step branches carry
   `card card--step`; `step-in` (opacity + 0.5rem rise) on `var(--dur)`;
   measured live on the freshly mounted card after a real profile-create
   click.
3. **Honest install progress bar** — met, and honestly. `progressLine`
   stays; the bar is `role="progressbar"` with min/max/now/valuetext ONLY
   when `percent` is a number (clamped 0–100); `percent === null` renders
   `install-bar--unknown` with the pulse-named `pulse-sweep` loop and NO
   aria value. The pre-recorded deviation stands (engine carries percent,
   never bytes — no invented MB counts), honored, not a spec miss.
4. **Profile card hover + app entry** — met. `.profile-card:hover`
   (translateY(-1px), `--line-strong`, deeper shadow) declared BEFORE the
   pinned `:active`; `AppShell` gains the contract-scheduled optional
   `contentClassName`; the finished-onboarding app branch (App.tsx:4431/
   :4436 — the separate post-onboarding `AppShell` return) passes
   `app-enter`; `app-in` fires once on the `.page` node. Verified in
   `App.tsx` that the onboarding branch's AppShell does NOT carry the
   class.
5. **Deterministic avatar colors** — met. `avatarVariant(id)` is FNV-1a
   mod 4 (also re-implemented independently in the capture and compared
   against engine-real uuids); v1–v3 palettes reuse the four pinned token
   pairs only; no new color tokens. The uuid-clustering observation in
   `gates.log` (some sets collapse toward fewer variants) is disclosed
   and matches the contract's per-id-stability framing — not a defect.
6. **Warm first-run empty** — met. `empty empty--warm` block
   (`role="status"`) with dashed-ring line-art glyph (aria-hidden),
   `fade-up var(--dur)`, `.empty--warm` re-declared after `.empty`
   (cascade order confirmed in styles.css at HEAD: `.empty` L723 →
   `.empty--warm` L736), the exact sentence unchanged, no confetti/mascot/
   new copy.

**9af92091 is an in-scope bugfix response, explicitly.** The stepper
column-layout rework (dot-over-caption, absolute dot-center-to-dot-center
connectors) was the lane's own capture vision QA catching stranded
connector segments at 390px; the contract names the mock column shape as
the target, so this is bugfix correction inside the card's scope, not
scope creep.

**Out-of-scope additions: none.** The `data-testid` attributes on the
install-progress block are test scaffolding for the card's own harness;
`AppShell.contentClassName` was pre-authorized by contract item 4.

**Omissions: none.** Every contract verification artifact exists and was
re-run by the reviewer: red 0/11 at base vs green 11/11 (both logs are
real captures, not banners — measured null/negative values at base,
computed-style + width-ratio values at green); reviewer re-ran
onboard-feel + motion-contract + onboarding: 60/60 green at HEAD.

Reviewer learner-reading of the four after-shots (independent of the
lane's own vision QA): stepper at 390px is 4 columns, done dot green with
white check, active ring visible, connectors intact with no stranded
tail segment (an initial full-page vision pass reported a dangling
segment after dot 4; a zoomed re-read confirmed it was the scrollbar
strip — no defect); install bar fill ≈45% matching the honest line;
avatars vary across the set (adjacent OF/AT both hashed v3 — disclosed);
warm empty shows the dashed ring glyph and the unchanged sentence.
