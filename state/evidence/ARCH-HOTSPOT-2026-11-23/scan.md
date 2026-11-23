# ARCH-HOTSPOT 2026-11-23 - packages/ui/src/styles.css duplication scan

Hotspot confirmed: 29 touches in the last 14 days (git log --since='14 days'
--oneline -- packages/ui/src/styles.css), 2948 lines at scan start.

## Method
Programmatic scan: parsed all 367 rule bodies (comment-stripped, line-numbered)
and ranked (a) selectors declared >1x, (b) identical bodies under different
selectors, (c) top repeated prop:value pairs. Manual read of every candidate
plus a grep of all vitest `ruleBody("...")` pins (8 test files) to build the
pinned-selector safe set before choosing the fix.

## Chosen fix (small diff, zero visual change)
Merged the two verbatim-duplicate "stack list" primitive rule pairs:

- `.plan-list` (was line 1110) ≡ `.pack-list` (was line 1375) -> one rule
  `.plan-list,\n.pack-list { ... }`
- `.place-list` (was line 1162) ≡ `.feedback` (was line 1236) -> one rule
  `.place-list,\n.feedback { ... }`

Safety checks:
- None of the four selectors is pinned by any test (grep of all
  `ruleBody(`/`for (const sel of` literals across apps/desktop/src tests).
- Cascade-safe: no other rule matches `.pack-list`/`.feedback` themselves
  between the merge points (only `> li` descendants, untouched); later
  `@media` blocks ride single-class specificity unchanged.
- Semantic equivalence proven by re-parsing HEAD vs worktree: every selector's
  declaration map is byte-equal for all 8 rules in the touched families; no
  selectors lost or gained.

Before/after grep counts (packages/ui/src/styles.css):
- `list-style: none;` rule occurrences: 11 -> 9 (two duplicate bodies removed)
- `^  gap: 0.5rem;` occurrences: 8 -> 6
- file size: 2948 -> 2940 lines

## Watch list (top 3 entanglements NOT fixed this pass - for a future card)
1. `.session-summary` (1715) ≡ `.session-panel` (1729) identical bodies, but
   drill-feel.test.ts:77 pins BOTH selectors via line-anchored ruleBody() -
   a comma-merge would strand one pin. Fix requires the card to name the gate
   change or re-pin the test loop to a shared class first.
2. `.plan-list > li` ≡ `.place-list > li` identical bodies 50 lines apart
   (surface-row primitive). Safe merge candidates exist but the two families
   each carry diverging `[data-*]` overrides; a shared row class is the
   right fix, not a selector merge.
3. `.word:focus-visible` (1656) re-declares the global `:focus-visible`
   (195) body verbatim - redundant today; it only becomes load-bearing if a
   component later resets outline on word buttons. Delete or add a comment
   explaining intent on next touch.

Also observed (not entanglement): the 1427-1679 selector-repeat cluster is all
inside `@media (max-width: 44rem/24rem)` - legitimate responsive overrides.
The FEEL-DRILL-001 cascade class (`.btn:disabled` outranking `.choice--*`) is
already fixed in-file (state props re-declared as `.btn.choice--X` after the
disabled rule) - no recurrence found.
