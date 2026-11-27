# FIX-M1-PATH-VIS-001 — hide the far-future unit wall from the day-1 path view

Source: LEARNER-REVIEW-M1-001 defect ledger (D-003, D-006). Evidence:
state/evidence/LEARNER-REVIEW-M1-001/experience-review.md + sim/raw
unit_path day-30 payloads (RU 823 units/803 locked; JA 819/777).

## Problem

The Today-tab path payload renders the entire pack catalog from day 1 —
~800 locked future units, many advanced English catalog slugs ("carbon
economics", "thesis defense", "writing petitions"). Violates the IA rule
"open AT the frontier, locked strictly below": the locked mass IS the
screen. Fresh-context reviewer lanes flagged the same block independently.

## Scope

1. Path view: render frontier band + immediately-adjacent units; collapse
   everything further behind band-group headers (count + band name only,
   e.g. "+ 741 later units"). No future unit title visible before its band
   is within reach.
2. D-006 guard: extend tools/audit_learner_copy.py with a wire-surface rule
   so internal enum slugs (reason/kind/label values like `weak-skill`,
   `due-review`, `acc.pl`) can never be interpolated into learner-visible
   strings (harness-level: assert no `String(.*reason)` into JSX text).

## Acceptance

- Mobile-viewport (390x844) capture: first screen opens at the frontier,
  zero locked far-future titles above the fold, band groups collapsed
  (lts-desktop-operations serve+CDP capture recipe; vision-check 2 shots).
- Existing path/home journey tests re-pinned, not weakened.
- audit_learner_copy.py rule added and green; gates.log under
  state/evidence/FIX-M1-PATH-VIS-001/.
