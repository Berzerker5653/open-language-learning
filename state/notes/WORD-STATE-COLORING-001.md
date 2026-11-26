# WORD-STATE-COLORING-001 — reader in-text word-state coloring (U4)

Source: docs/ui-review-2026-11-23.md — "Where we still trail the market" #2 (U4, pairs with READABILITY-GATE-001).
The reader shows fresh form-printed text (e.g. a story passage) but no visual distinction between words the learner has seen, is learning, and has confirmed. LingQ/LangLeap/NuanceDeck-style in-text state coloring is the market standard; the word-card/tap layer shipped (READER-FLOW-001) but the in-text coloring never did.

Scope (desktop UI):
- Reader surfaces that render learner-facing text at all: reading.tsx (story reading view), plus any surface that renders passage text in-flow.
- State colors (design tokens, not raw hex): unseen = plain text; learning = teal; confirmed = muted.
- Honest: only learned state is shown; never render a confirmation the learner did not earn. Do not fake per-word state from the pack.
- Use the pack/learner record for state exactly like the My Words surface does (confirmed forms, learning items) — do not invent a parallel store.

Not in scope: the word-card tap/overlay layer (READER-FLOW-001 shipped), the speech/dictation state areas, any pack re-publish, any layout redesign beyond the state coloring.

Acceptance:
- Vitest pins per state (unseen plain / learning teal / confirmed muted) for the reader surface(s); tsc clean; desktop suite green.
- Mobile (390px) capture lands under state/evidence/WORD-STATE-COLORING-001/ with a learner-inspection note.
- State colors route through design tokens so the palette owner controls them.
