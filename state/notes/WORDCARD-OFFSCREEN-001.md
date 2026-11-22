# WORDCARD-OFFSCREEN-001 — phone word-card bottom sheet

## Problem (owner dogfood, DOGFOOD-2026-11-21 complaint 08)
During a graded-reading session on a phone (390x844), tapping a `button.word`
fired the whole card pipeline (`/api/word_card` + `/api/story_word_audio`
succeed, card fully populated) but the `.word-card` is an inline-flow element
appended after the whole reading paragraph: measured `y=1486, position:static`
on an 844px viewport. The tap looks dead. Desktop widths accidentally land the
card on-screen, so every desktop check passed.

## Contract (not prescriptive beyond the rule)
- Phone widths (same `@media` breakpoint as the existing mobile block): the
  card becomes a fixed bottom sheet — `position:fixed; bottom:0; z-index:45`,
  `max-height:70svh`, scrolls inside itself, and the Close row is
  `position:sticky; bottom:0` so it never hides behind long card content.
- Wide viewports keep the inline in-flow card unchanged (no rule added there).
- Focus management rides the APPLIED STYLE, not the viewport width: the App
  effect focuses the card on open only when `getComputedStyle(card).position
  === "fixed"` (a rotation can never yank a desktop inline card), and Close /
  Escape return focus to the tapped word button.
- Only an EXPLICIT close (Close button or Escape) arms return-focus;
  navigation supersedes (tab switch, story change, `closeStoryWordCard(false)`)
  drop the card without stealing focus.

## Implementation seams
- `apps/desktop/src/reading.tsx` — `onWordAnchor?(el)` hands the tapped
  button element to the caller before the tap fires; the card region gets
  `tabIndex={-1}` + Escape handling through the same `onWordClose` handler.
- `apps/desktop/src/App.tsx` — `storyWordAnchorRef` (mutable ref, not state)
  remembers the anchor + a `closing` flag; one `useEffect([storyWord])` does
  open-focus (computed-style gated) and close-return-focus.
- `packages/ui/src/styles.css` — the bottom-sheet block inside the existing
  phone-width media query.

## Machine gate (RED-FIRST)
`node scripts/wordcard-capture.mjs <out-dir>` — headless Chrome over raw CDP
at 390x844 against the built journeys harness
(`npx vite build --config vite.mobile-harness.config.ts` → `dist-mobile`,
served by the script itself). It walks the reader screen via the mobile
journeys (`#reader`), taps the first `button.word`, and asserts: card FULLY
inside the viewport (full containment, not mere intersection — an inline card
at 629..904 on an 844 viewport "intersects" but its Close row is clipped: the
same dead-tap bug in a shorter story), focus inside the card, Close row on
screen, no horizontal overflow, Close removes the card AND returns focus to
the tapped word. `--desktop` re-runs at 1280x900 asserting the card keeps
`position:static` inline rendering. The harness's own navigation error rides
into `result.json` (MOBILE-UX-001 lesson: a stalled journey must never
masquerade as a passing measurement).

RED at HEAD 321f242: card at 629..904, position static, focus stayed on h1,
Close bottom 869 > 844 — 4/6 checks FAIL (`result-phone-HEAD-red.json`).
GREEN after fix + LANE gates: see `state/evidence/WORDCARD-OFFSCREEN-001/gates.log`.

## Sibling-offender audit
Repo-wide grep for tap-opened inline popovers in reading/session flows: the
only `.word-card`-style pattern is this one; the kanji drill is a full route
(not an inline popover) and lands in-viewport by construction. No other
inline-rendered tap popover found in reading/session flows.
