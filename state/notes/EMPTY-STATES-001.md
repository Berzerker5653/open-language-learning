# EMPTY-STATES-001 — designed empty states everywhere (U10)

Source: docs/ui-review-2026-11-23.md — "Where we still trail the market" #5 (U10): empty states are honest-but-bare; no line-art/warm glyphs of the serif identity.

Scope (desktop UI):
- Every empty-state surface: Practice hub (no pack installed / no due items), My Words (nothing mined yet), Progress (no session history), Today (fresh/no plan), path view (no units yet) — one designed contract per surface: a light line-art glyph + one honest one-line copy + one action-appropriate affordance.
- Design tokens for the glyph/copy (serif identity — no emoji, no stock icons; a light line SVG in the app's existing line-art style).
- Empty states must stay honest: never imply a capability that doesn't exist; never contradict the pack's visible state.

Acceptance:
- Vitest pin tests per surface (glyph + honest copy render); tokens used, no inline hex.
- 390px captures of every surface land under state/evidence/EMPTY-STATES-001/ with a learner-inspection note.
- Desktop suite green; tsc clean.

Not in scope: the non-empty layouts of those surfaces, any pack changes.
