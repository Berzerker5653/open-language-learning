# FEEL-GLOBAL-001 — motion foundation for the whole app

## Contract (frozen at card open)

Root cause per docs/design/PROGRESSION-UX-AUDIT-2026-11-22.md: the app outside the
journey (PATH-FEEL-MOTION-001 territory) still has no motion language — the audit
found 0 @keyframes + 0 transitions repo-wide, and `packages/ui/src/styles.css` is
the only sheet. This card builds the GLOBAL layer everything else can ride on:

1. **Tokens in `:root`** — `--dur-fast: 120ms`, `--dur: 250ms`, `--dur-slow: 300ms`
   (the FEEL-TARGETS motion-legend family), `--ease-out`, `--ease-in-out`,
   `--ease-spring` (matching the path spring cubic-bezier(0.34, 1.56, 0.64, 1)),
   a spacing scale `--space-1..6`, and a z-index scale `--z-header: 10`,
   `--z-skip: 20`, `--z-bubble: 40`, `--z-word-card: 45`. The existing literal
   z-indices (10/20/40/45) are replaced by the tokens; a local `z-index: 1`
   inside the path section is relative stacking, not a global layer, and stays.
2. **Keyframe library** — `fade-up` (notices/verdict/bridge entering),
   `slide-up` (mobile word-card bottom sheet), `pop` (choice ring arrival),
   `pulse-soft` (gentle attention on the jump-to-pin arrow while visible).
3. **`:active` pressed states** on `.btn` (translateY(2px)), `.btn--primary`
   (press to `--accent-ink` + brightness darkening — one accent, per the
   global-states target mock), `.tab`, `.seg-btn`, `.card`, `.profile-card`.
4. **Transitions on the shared classes** — `.btn`, `.tab`, `.seg-btn`, `.card`,
   `.profile-card`, `.word` — plus entry keyframes on `.notice`, `.alert`,
   `.verdict`, `.session-bridge`, `.choice--correct`, and the mobile
   `.word-card` sheet.
5. **Tab underline glides** — the per-tab `border-bottom` becomes a single
   sliding indicator: `.routes::after` positioned via `--tab-x`/`--tab-w` set by
   a measure effect on the routes nav in App.tsx (ResizeObserver + per-route
   re-measure). While the indicator is live the nav wears `.routes--glides`,
   which makes the active tab's own border transparent — at rest ONE underline,
   during a route change it GLIDES 250ms ease-out (no snap, per the mock).
   SSR/first paint keeps the static border (progressive enhancement).
6. **Smooth scroll** — the route-change reset at App.tsx `window.scrollTo(0, 0)`
   becomes `window.scrollTo({ top: 0, behavior: "smooth" })`. Spec behavior:
   browsers force `auto` when prefers-reduced-motion is set, no extra opt-out.
7. **Reduced motion** — the pre-existing global kill-switch
   (styles.css `@media (prefers-reduced-motion: reduce)`) flattens everything
   this card adds; the capture proves the collapse instead of trusting it.

## Guardrails (must stay green unedited)

- `apps/desktop/src/button-affordance.test.ts` — rule-BODY pins on `.btn`,
  `.btn:hover:not(:disabled)`, `.btn:disabled`, `.btn--primary:hover:not(:disabled)`
  (adding a `transition:` line to the `.btn` base body is fine; the pins are
  toContain checks — do NOT remove or rename the pinned substrings, and put
  `:active` rules AFTER the hover rules so source order wins the tie).
- `apps/desktop/src/a11y.test.tsx` — contrast map scans only `--name: #hex`
  pairs, so numeric tokens are safe, but add NO new color tokens: one accent,
  `--accent-ink` already exists for the press shade.
- ADR-0002 banned-token scans (home/session-chrome/path-view tests) — motion is
  motion; no reward mechanics anywhere.
- Global motion budget: every transition/animation duration this card adds is
  in the 120–300ms ease-out family; only named `*pulse*` loops run longer.

## Verification

- New static contract test `apps/desktop/src/motion-contract.test.ts`
  (red-at-base commit first).
- New real-engine capture `scripts/feel-global-capture.mjs` (clone of the
  path-motion-capture plumbing: lts-serve + headless Chrome + raw CDP):
  press transform measured via CDP mouse events, the underline caught
  MID-SLIDE between tabs, computed animation names on the shared classes,
  and the full collapse under emulated prefers-reduced-motion. Red at HEAD,
  green after, screenshots in `state/evidence/FEEL-GLOBAL-001/`.
- Lane gates: `npx tsc --noEmit` + full vitest in apps/desktop (no Rust touched).

## Oracle

Target mockup: `state/evidence/FEEL-TARGETS-2026-11-22/global-states.png`
(= the card's kanban attachment): tab underline 250ms ease-out glides,
press = translateY(2px) + `--accent-ink` darkening at 120ms, toast/notice
rises 12px + fades 250ms, bottom sheet slides up 300ms ease-out.
