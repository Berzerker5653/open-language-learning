# REVIEW-FIX-BUTTON-AFFORDANCE-PINS-001 — SPEC verdict

**Verdict: PASS**

The diff (432a70db, commit message "fix(tests): re-pin the button-affordance pin to the shipped disabled-button contract") does exactly what the card asked and nothing else:

- **Superseded assertion re-pinned, not weakened** — `apps/desktop/src/button-affordance.test.ts:45` (in the disabled test): the old `expect(disabled).toMatch(/opacity:\s*0?\.\d+/)` (any washed-out opacity) is replaced by the literal `expect(disabled).toContain("opacity: 1")`; `color: var(--ink-soft)` → `color: var(--ink-faint)`; `border-color: var(--line)` → `border-color: var(--line-strong)`. The new pin is STRICTER than the old one (exact literal match vs. a loose regex) and pins exactly the contract shipped in 07600536 (SECONDARY-SURFACES-001, 2026-11-23): opacity 1, ink-faint, line-strong, sunk fill + not-allowed cursor.
- Verified against the shipped CSS (`packages/ui/src/styles.css:412-418`): `.btn:disabled { opacity: 1; color: var(--ink-faint); border-color: var(--line-strong); background: var(--surface-sunk); cursor: not-allowed; }` — the new pins match byte-for-byte; the comment documents the superseded 2026-10-23 contract (opacity 0.45 / ink-soft / line) faithfully.
- **Nothing more**: `git show --stat 432a70db` touches only `apps/desktop/src/button-affordance.test.ts` and the new gates.log — no source, no other tests, no unrelated additions. The inventory pin (bare-btn call sites), hover pin and background-difference pins are unchanged (diff shows only the three disabled-state assertions + the comment block).
- Scope is test-only; no design change to the shipped contract (styles.css untouched).

Verified: `npx vitest run src/button-affordance.test.ts` — 5/5 pass on the committed tree this session (2026-11-24); the accompanying gates.log records 665/665 full-suite green (was 664/665 with 1 red pre-existing failure). Gates.log matches the commit message claim.

No defects. No FIX follow-up card.
