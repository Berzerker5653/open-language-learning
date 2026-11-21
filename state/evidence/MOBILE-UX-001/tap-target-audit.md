MOBILE-UX-001 — tap-target + layout audit checklist (as measured)

Method: apps/desktop/src/mobile-screens.tsx mounts the shipped <App/> on
the journeys' fake engine, navigates each screen by real clicks, and
measures every button / a[href] / input / select / summary box at the
viewport; scripts/mobile-capture.mjs drives it headless at 390x844 and
412x915 and saves screenshot + audit JSON into after/ and before/.
The machine gate is apps/desktop/src/mobile-audit.test.ts (vitest).

Screen          390  412   notes
onboarding      pass pass  inputs/buttons 44px; stepper wraps cleanly
today           pass pass  16 controls >=44px; segmented time control
                            and start CTA comfortable; nav wraps to a
                            second row at 390 (visible, never clipped)
drill (RU       pass pass  9 controls >=44px (answer options, Continue,
writing)                   pause/exit chrome)
reader          pass pass  18 controls; non-inline all >=44px; inline
                            word buttons are 32px by design (word-level
                            accuracy; word card is the fallback surface)
settings        pass pass  selects width:100% (HEAD's 479px select
                            caused document h-scroll 512>390); delete-
                            confirm checkbox raised 13x13 -> 44x44

Rules enforced by the audit:
- document scrollWidth <= clientWidth at both viewports (no horizontal
  scroll anywhere in the page shell),
- every non-inline interactive element >= 44x44 (WCAG 2.2 AA target
  size), radios measured as their whole row label,
- navigation errors fail the audit (error field + red banner) — a
  stalled capture can never masquerade as a pass.

Typography tier shipped (max-width 44rem): base 1rem kept, h1 1.5rem,
h2 1.1875rem, reader paragraphs 1.1875rem/2.1 leading, compact nav bar
(44px tabs), stacked session chrome, lists ride --content-max — the
LETTER-DRILL-TEXT-001 measure token, shared not duplicated.
