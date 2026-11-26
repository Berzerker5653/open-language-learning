# ACCUMULATION-METERS-001 — accumulation meters in the Today header strip (U11)

Source: docs/ui-review-2026-11-23.md — recommendation #6 (U11): "Accumulation meters in the Today header strip (My Words count, worlds unlocked)".

Scope (desktop UI):
- Today header strip gains two honest counters shown once the pack/learner record settles:
  - My Words: "N forms confirmed" (same definition the My Words surface uses — never a superset).
  - Worlds: "X of Y unlocked" (worlds = the pack's curriculum sections / goal groups — define the exact denominator from the pack, e.g. unlocked goal groups; do NOT invent a parallel tree).
- Hidden/pending-safe: the counter never renders from stale pre-settle state (the HOME-FLASH-001 + FIX-HOME-POSTURE-PENDING-001 flicker pattern — only render on `activePack && !packsPending`).
- Keep the strip compact on 390px; must not wrap into a second line or clip the greeting.

Acceptance:
- Vitest pin tests (render-on-settle, hidden while pending, honest labels); 390px capture lands under state/evidence/ACCUMULATION-METERS-001/.
- Desktop suite green; tsc clean.

Not in scope: the progress screen stats (PROGRESS-STATS-001 shipped), layout of other Today sections, any pack re-publish.
