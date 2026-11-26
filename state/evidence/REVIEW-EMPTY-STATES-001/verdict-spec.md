# EMPTY-STATES-001 / REVIEW-EMPTY-STATES-001 — SPEC verdict

Axis: (a) SPEC — does the diff do exactly what the card asked?
Evidence reviewed: state/notes/EMPTY-STATES-001.md, gates.log, b0802ebb, 336a9c73, state/task-state.json EMPTY-STATES-001 entry, KANBAN.md row, audit jsons + learner-inspection.md, empty-state.tsx, empty-states-screens.tsx, home.tsx, hub.tsx, memory-stats.tsx, words.tsx, styles.css, journeys.

## Verdict: PASS-WITH-NOTES (no blocking defect; 3 notes)

### Findings
- **D1 (note) — Progress-zero affordance route vs copy.** memory-stats.tsx:196-205 routes "Start your first session" via `setRoute("practice")` (App.tsx:4730), which renders the Home/Today screen (App.tsx:5061, practice route default). The copy still says "your first session is on **Today**" — consistent in outcome, not in naming (button targets the practice route, not a "Today" route). No functional defect; the affordance does land on the Today surface. Not a blocker.
- **D2 (note) — Deep-link refusal pin removed from pack-install journey.** b0802ebb rewrites journeys/pack-install.journey.tsx:33-48: the old pin that clicking Writing with no pack still renders the writing screen's honest refusal + scoped writing_task call is dropped (replaced with the hub-empty pins). The inline comment (:43) claims the honest refusal "still exists" but no test pins it now. Coverage regression, not a contract violation (the card only required hub-empty). Not a blocker; recommend a follow-up pin.
- **D3 (note) — Audit harness copy field null on progress-zero.** empty-states-screens.tsx selector `.empty-state-copy` misses progress-zero's copy (memory-stats.tsx:204-206 renders it as `<p className="meta">`, not `.empty-state-copy`), so progress-zero.audit.json reports `copy: null`. The title/action/glyph all check out; a tooling artifact, not a contract failure. learner-inspection.md confirms the visual contract.

### Contract coverage (verified)
- All five surfaces present: hub (hub.tsx:119-134 hub-empty), My Words (words.tsx:332-339 mywords-empty), Progress zero (memory-stats.tsx:171-207 progress-zero), Today empty plan (home.tsx:535-543 no-due-empty), path view (home.tsx:653-661 path-empty).
- Glyph + honest one-line copy + one affordance per surface; all on existing tokens (--font-display, --ink, --ink-faint, --accent, --surface, --line); no emoji/stock icons; currentColor 1.5px line-art over 32px viewBox; 44px tap targets confirmed (audit jsons all show tapTarget: 44).
- No out-of-scope changes: .gitignore (dist-empty-states — dev-only), capture harness + audit pngs, journey re-pins (not weakened — hub-empty assertions added). No source-lane files outside the empty-state scope. App.tsx changes are scoped wiring (noPack flag, onStart, onExplore).
- Tests: 10 vitest pins, red-first per commit message; 690/690 full suite; tsc clean; capture harness is dev-only via a separate vite config (vite.empty-states-capture.config.ts).

### No 'approve' on defects — verdict is PASS-WITH-NOTES, not approve.
