# FEEL-MYWORDS-001 — My Words: card rows, friendly due pills, undo, add pulse

## Contract (frozen at card open)

Audit (docs/design/PROGRESSION-UX-AUDIT-2026-11-22.md) named My Words the
weakest hierarchy: the list is a bare `<ul>` of plain rows, the due date is a
raw ISO slice (`m.due_at.slice(0, 10)`), Remove is a one-click silent delete,
and adding a word lands without any acknowledgement. Oracles: the TARGET
mockup `state/evidence/FEEL-TARGETS-2026-11-22/my-words.html|png` (the card's
kanban attachment) plus the market sheet attached to the board card. Match the
market's feel; keep our tokens and the calm-but-warm posture (ADR-0002).

1. **Word rows become cards** — the `<ul><li>` list is replaced by a
   `.mine-list` of `.mine-card` rows carrying the mock's treatment: surface
   background, hairline `var(--line)` border, `var(--radius)` rounding,
   `var(--shadow)`, `0.8rem 1rem` padding, `0.6rem` gaps, no dividers, no
   streak counters. Inside: headword `.w` (display font, 1.25rem, 600) +
   reading/gloss `.g` (ink-soft), then the sub-line (citation small + quiet
   actions). NOTE: the class is `.mine-card`, NOT the mock's `.word-card` —
   `.word-card` is already the mobile story bottom sheet in styles.css
   (fixed-position, z-token 45) and App.tsx focuses it by that name; reusing
   it would collide. Same visual contract, our naming.
2. **Friendly relative due pill** — exported pure helper
   `relativeDueLabel(iso, now?)` in words.tsx replaces the raw ISO slice:
   past → `yesterday` (−1 day) / `N days overdue` (< −1); `today`; `tomorrow`;
   `in N days` (2..60); `in ~N months` (≤ ~2 years); `in ~N years` beyond.
   Rendered as the mock's `.due` pill: accent-soft fill, accent-ink text,
   999px radius, and a `::before` clock glyph (◷) so meaning never rides
   color alone. Unscheduled words get a quiet `.due--new` pill ("new").
   Day math is calendar-day, local timezone.
3. **Remove gets undo** — clicking Remove no longer deletes silently: the row
   leaves at once, a `.undo-chip` (↺ UNDO + the word) fades in exactly where
   the row stood, and the engine delete (`onRemove`) fires only after the
   chip's 4 s life. Tapping UNDO cancels the pending delete; a new Remove
   commits the previous pending one first (exactly one chip, never two
   racing timers); unmounting the panel flushes any pending delete so
   navigating away never resurrects a removed word. Desktop deviation from
   the mock: the reveal panel arrives by button + chip, not a swipe gesture
   (pointer-first surface); the recovery story — always one tap from back —
   is the contract, and it holds.
4. **Add-word success pulse** — `addMine` captures the engine's returned id
   and passes it as the `flashId` prop; that row renders
   `.mine-card--flash` with a one-shot arrival: `fade-up` + a new
   `mine-arrive` keyframe (teal-tint wash fading from accent-soft back to
   the card surface, `--dur-slow` ease-out). Repeating an existing mine
   flashes the kept entry too (was_new=false still returns its id).
5. **Reveal + grade transitions ride FEEL-GLOBAL** — the review card enters
   with `card-in` (`.review-card`), the revealed answer block rises with
   `fade-up` (`.review-reveal`); the grade buttons keep the shared `.btn`
   transitions FEEL-GLOBAL-001 landed. Motion budget: every new duration is
   one of `--dur-fast/--dur/--dur-slow` (120–300 ms family); the global
   prefers-reduced-motion block flattens all of it.

## Guardrails (must stay green unedited)

- `apps/desktop/src/session-chrome.test.tsx`, `rtl-direction.test.tsx`,
  `loading-feel.test.tsx` — MyWordsPanel pins (grade previews, pack `dir`
  through the review card + add inputs + row surfaces via PackText, the
  FEEL-LOADING skeleton rows). Keep `PackText` on surface/reading in rows.
- `apps/desktop/src/motion-contract.test.ts` — motion budget: nothing over
  300 ms except `*pulse*`-named loops; do not add color tokens (a11y.test
  contrast scan reads `--name: #hex` pairs only).
- `button-affordance.test.ts` rule-body pins on `.btn` family — new buttons
  ride existing classes; if a state class must outrank `.btn:disabled`,
  re-declare it AFTER that rule as `.btn.undo-chip` (FEEL-DRILL cascade fix
  shape), never edit the pinned selectors.
- No Rust/engine changes: the undo window is a panel-side deferred delete;
  `mine_remove` semantics stay exactly as the Rust tests pin them.

## Verification

- Red-at-base contract test `apps/desktop/src/mywords-feel.test.tsx` first:
  `relativeDueLabel` unit cases, card/pill CSS rule-body pins, the
  remove→chip→deferred-delete→undo timer walk (fake timers), the flash class
  with `flashId`, and the reveal classes.
- Real-engine capture `scripts/feel-mywords-capture.mjs` (lts-serve +
  headless Chrome + raw CDP, same plumbing as feel-loading-capture): the
  serve bridge has no mine_* commands, so the harness fakes ONLY the mine_*
  legs inside the page's own fetch layer (a tiny canned store; every other
  command rides the real engine). Measures: card computed radius/border on
  rows, pill text + `::before` glyph, remove → chip present + ZERO
  `/api/mine_remove` calls until the 4 s life elapses (then exactly one),
  UNDO cancels, add → flashed row carries `mine-arrive`, review reveal
  animates `card-in`/`fade-up`. Red at HEAD, green after, screenshots in
  `state/evidence/FEEL-MYWORDS-001/`.
- Lane gates: `npx tsc --noEmit` + full vitest in apps/desktop, prettier on
  touched files (no Rust touched).
