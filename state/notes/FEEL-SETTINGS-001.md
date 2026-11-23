# FEEL-SETTINGS-001 — settings screen consistency (select, disclosures, contents jump row)

## Contract (frozen at card open)

Feel-audit section 6 cluster on the Settings screen. Oracle: the TARGET
mockup attached to the board card (`settings.png`; the FEEL-TARGETS family
posture). The audit's three holes: (1) the DESKTOP page has no select
styling at all — the only `select` rule in the sheet sits inside the
phone media query, so on the desktop UA-default selects sit inside the
designed cards, the biggest visual-consistency hole on the screen;
(2) details/summary prose notes pop open with a hard cut — no expand
motion, no rotation; (3) the screen is a long single-column scroll with
no way to hop between domains. Tokens and calm-but-warm posture per
FEEL-GLOBAL-001 / ADR-0002 — motion is motion, no reward mechanics, and
the motion-contract seconds scan must stay green WITHOUT edits (no new
duration literals; every declaration rides var tokens).

1. **Desktop select styling** — a new top-level (column-0, NOT inside any
   `@media`) `select {` rule in `packages/ui/src/styles.css`:
   `appearance: none` (+ `-webkit-appearance: none`), `background-color:
   var(--surface)`, `color: var(--ink)`, `border: 1px solid
   var(--line-strong)`, `border-radius: var(--radius-sm)`, comfortable
   `padding` with room for the drawn chevron on the right,
   `background-image` = inline data-URI SVG chevron (`no-repeat right
   center` positioning, sized), and a `transition` on
   `border-color`/`box-shadow` over `var(--dur-fast)`. A
   `select:focus-visible` rule puts `border-color: var(--accent)` +
   `box-shadow: 0 0 0 3px var(--accent-soft)` — the mock's focus frame.
   The existing phone-width `select` rule (column-fit, 44px floor) stays
   exactly as it is; it only adds width/size at phone width.

2. **Disclosure expand motion** — `details.prose-note` keeps the native
   details/summary widget (semantics unchanged, no JS). CSS: the native
   marker is hidden (`list-style: none` +
   `summary::-webkit-details-marker { display: none }`), `summary::before`
   draws a small chevron (inline data-URI SVG) that rotates 180° when the
   details is `[open]`, transitioned over `var(--dur)` `var(--ease-out)`;
   the body reveal rides `details.prose-note[open] > p { animation:
   disclosure-reveal var(--dur) var(--ease-out) }` with a
   `@keyframes disclosure-reveal` (opacity + small rise) — the subtree is
   not rendered while closed, so the animation fires exactly when the
   disclosure opens. The phone-width summary touch-target rule stays.

3. **Per-domain contents jump row** — `settings.tsx` renders, directly
   under the `<h2>Settings</h2>`, a `<nav aria-label="Settings sections"
   className="settings-contents">` with one `<button type="button"
   className="contents-chip">` per VISIBLE card (Romaji / Kana keyboard
   chips appear exactly when their card renders; Local network chip only
   in serve mode via `inLtsServeMode()`). Every card div gains
   `id="settings-*"` (mic / romaji / kana / profile / speech / runtimes /
   lan / build); the chip click looks the anchor up by id and calls
   `scrollIntoView({ behavior, block: "start" })` with `behavior: "auto"`
   under prefers-reduced-motion. Buttons, NEVER `<a href="#…">` — the
   screen router reads `location.hash` (mobile-screens.tsx) and a hash
   anchor would try to route. CSS: `.settings-contents` chip row (wrap,
   gap, quiet-chip look riding tokens) and
   `[data-settings-anchor] { scroll-margin-top: … }` so jumps land below
   the sticky header.

4. **Gates** — new vitest contract `apps/desktop/src/settings-feel.test.tsx`
   pins the CSS rule bodies (same ruleBody pattern as
   motion-contract.test.ts; desktop select pinned at column 0) and the
   rendered markup (nav + chips per visible domain, matching anchor ids,
   no in-page hash anchors, native `<details>` untouched). Real-engine
   capture `scripts/feel-settings-capture.mjs` (same plumbing as
   feel-progress-capture.mjs: lts-serve + headless Chrome + raw CDP,
   390x844 AND a desktop-width pass because the select hole is desktop)
   measures computed styles live: appearance none + chevron background on
   the select, the focus halo after a real focus, the computed chevron
   rotate on an opened summary, the body animation name, and a chip
   click actually moving the scroll to the target card. RED at base /
   GREEN after diffs `result.json`. motion-contract, loading-feel,
   settings, a11y, mobile-audit, button-affordance, rtl-direction stay
   green unedited.

## NOT doing

- No custom switch/toggle rebuild — the toggle + save-tick micro-feedback
  already shipped in FEEL-LOADING-001; the mockup's pill is aspirational
  chrome, the card's audit hole is the select.
- No sticky/floating TOC and no hash-anchor routing.
- No `::details-content` (not portable across WebKitGTK / the shipped
  webview set).

## Resume recipe (if this run dies)

1. `git status --short` + `git log --oneline -8` — cards are commit-labeled
   `FEEL-SETTINGS-001`; committed stages are NEVER re-verified (NO-REVERIFY).
2. Remaining stages in order: (a) vitest contract if not committed,
   (b) styles.css + settings.tsx code, (c) capture harness
   `scripts/feel-settings-capture.mjs`, (d) build serve+dist, green run,
   (e) stash lane files → rebuild → red-at-base run → pop (capture-red
   recipe in lts-desktop-operations), (f) evidence + ledger close +
   validate_handoff + push, (g) board complete with shas.
3. Gate battery (lane tier): `cargo fmt --all --check`; `npx tsc --noEmit`
   + `npx vitest run` in apps/desktop (settings-feel + the stay-green set);
   no Rust touched — cargo tests scoped: none needed unless serve wiring
   changes (it doesn't).
