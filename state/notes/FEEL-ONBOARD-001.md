# FEEL-ONBOARD-001 — profile/onboarding flow feel (stepper, install bar, cards, avatars, warm empty)

## Contract (frozen at card open)

Feel-audit section 7 cluster on the profile/onboarding flow. Oracle: the TARGET
mockup `state/evidence/FEEL-TARGETS-2026-11-22/onboard.html|png` (also the
board card attachment `onboard.png`). Motion legend (all as one mid-frame):
the ✓ check draws along its stroke over 300ms; the connector fills left→right
over 250ms; the active dot wears a soft accent ring (0 0 0 4px --accent-soft)
that fades in over 150ms; the install bar eases to each downloaded chunk.
Tokens and calm-but-warm posture per FEEL-GLOBAL-001 / ADR-0002 — no
confetti, no celebration layer, no reward mechanics.

1. **Stepper gains completed-step state + step-change motion** —
   `onboarding.tsx` computes the visible step sequence (`welcome → packs →
   microphone [→ speech-setup when micChosen] → done`) and marks steps
   BEFORE the current one with class `stepper-done`; a done step renders an
   inline `<svg class="step-check">` (aria-hidden, one stroked path). CSS:
   the done circle fills `--ok` with `--ok-ink` border (counter number
   suppressed), the check draws via `@keyframes check-draw`
   (stroke-dashoffset) over `var(--dur-slow)` = 300 ms exactly, and each
   done step's connector `li::after` turns `--ok` and fills left→right via
   `@keyframes link-fill` (scaleX) over `var(--dur)` = 250 ms. The active
   dot gains `box-shadow: 0 0 0 4px var(--accent-soft)` arriving via
   `@keyframes ring-in` over `var(--dur-fast)` = 150 ms. Labels stay plain
   text nodes inside the `li` (the `>Speech<` SSR pin survives);
   `aria-current="step"` semantics unchanged; the resume step still renders
   NO stepper.
2. **Step cards glide instead of hard-cutting** — every onboarding step card
   carries `card--step`: `@keyframes step-in` (opacity + 0.5rem rise) on
   `var(--dur)`. React unmounts/mounts each step branch, so the animation
   fires exactly on step changes (measured live in the capture).
3. **Pack install renders a real progress bar** — the text-only
   `progressLine` notice (onboarding.tsx:213-220) keeps its honest line AND
   gains a bar: `.install-bar` track (8px, `--surface-sunk`, hairline,
   999px radius) + `.install-bar-fill` on `--accent` with
   `transition: width var(--dur) var(--ease-out)` so the bar eases to each
   reported chunk. `role="progressbar"` with
   min/max/`aria-valuenow` + `aria-valuetext` ONLY when the engine sent a
   percent; with `percent === null` the fill runs the indeterminate
   `pulse-sweep` loop (1.6s, pulse-named per the motion-budget scan) and NO
   value is claimed. Mock deviation (recorded): the mock's "132 MB of 293
   MB" byte label is NOT implemented — the engine's stage events carry
   `percent: number | null`, never bytes (K-62 honesty contract), and
   inventing MB numbers would fabricate progress.
4. **Profile card press/hover + transition into the app on Continue** —
   `.profile-card:hover` lifts 1px with `--line-strong` border and a deeper
   shadow (declared BEFORE the pinned `:active` press so press still wins);
   `AppShell` gains an optional `contentClassName` (packages/ui), the
   finished-onboarding/app branch passes `app-enter`, and
   `@keyframes app-in` (fade + rise, `var(--dur-slow)`) fires once when the
   class appears on the reused `.page` node — the app arrives instead of
   snapping in.
5. **Initials avatars get deterministic color variation** —
   `avatarVariant(id)` hashes the profile id (FNV-1a mod 4); the span gains
   `profile-avatar--v1..v3`. Palettes reuse EXISTING token pairs only:
   v0 = `--accent-soft`/`--accent-ink` (base), v1 = `--ok-soft`/`--ok-ink`,
   v2 = `--warn-soft`/`--warn`, v3 = `--surface-sunk`/`--ink-soft`. No new
   color tokens (a11y contrast pairs already pinned). Stable per id across
   renders and restarts.
6. **First-run empty state gets visual warmth** — the resume chooser's bare
   `No profiles on this device yet.` becomes a `empty empty--warm` block
   (role="status") with a calm dashed-circle line-art glyph (aria-hidden
   SVG) and the SAME sentence; `.empty--warm` (re-declared after `.empty`)
   centers, breathes to `--accent` hairline, and enters via `fade-up` on
   `--dur`. No confetti, no mascot, no invented copy.

## Guardrails (must stay green unedited)

- `motion-contract.test.ts` (all new durations ride the token vars; the
  only >300ms loop is pulse-named), `onboarding.test.tsx` (every existing
  SSR pin incl. `>Speech<`, `aria-label="Progress"`, no-stepper-on-resume,
  the exact empty sentence), `button-affordance.test.ts`, `a11y.test`
  (no new color tokens), `loading-feel.test.tsx`, session-chrome,
  rtl-direction, ADR-0002 scans.
- No Rust/engine changes: `EngineProgress`, the SSE `progress/events`
  stream, `list_profiles`, and the install commands stay exactly as they
  are; every change is presentation-layer (apps/desktop/src +
  packages/ui).

## Verification

- Red-at-base contract test `apps/desktop/src/onboard-feel.test.tsx`:
  CSS rule-body pins (check-draw/link-fill/ring-in/step-in/install-bar/
  pulse-sweep/app-in/avatar variants/empty--warm/profile-card hover) plus
  SSR markup contracts (stepper-done + svg.step-check, progressbar aria +
  fill width percent, unknown-state has no valuenow, avatar variant
  determinism, warm empty sentence kept).
- Real-engine capture `scripts/feel-onboard-capture.mjs` (same plumbing as
  feel-progress-capture: lts-serve + headless Chrome + raw CDP; a truly
  fresh data dir, real `create_profile`, real profile cards). ONLY the SSE
  progress leg is replayed from canned `install-pack.*` stage frames (that
  leg's semantics are Rust-pinned). Measures: step-in animation-name on the
  fresh card after a real step click, stepper-done class + check-draw
  computed animation on the completed dot, the install bar's
  aria-valuenow + eased width + pulse-sweep under percent null, resume
  chooser hover lift via real CDP mouse, deterministic avatar variant
  classes on two real profiles, warm empty after hiding the profile, and
  app-in on `.page` after Continue. Red at base, green after; screenshots
  in `state/evidence/FEEL-ONBOARD-001/`.
- Lane gates: `npx tsc --noEmit` + full vitest in apps/desktop, prettier on
  touched files (no Rust touched).
