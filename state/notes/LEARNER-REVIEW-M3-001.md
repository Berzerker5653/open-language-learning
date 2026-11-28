# LEARNER-REVIEW-M3-001 — audit the Month-3 learner experience (days 61-90, RU + JA)

Same frozen contract as LEARNER-REVIEW-M1-001 / M2-001 (read
state/notes/LEARNER-REVIEW-M1-001.md first; it is the contract).

## M2-informed focus (defect distribution carried forward, 2026-11-27)

- **BLOCKER class that M2 surfaced: RU content supply.** RU received 5 new
  items in days 31-60 (per-day [3,2,0,0,...]) against JA's 117. Verify
  FIX-M2-SUPPLY-RU-001 actually restored non-review inflow before auditing
  content quality — a starved month cannot show pool defects it never served.
- **Never-shipped fix cards re-verify first**: FIX-M1-PATH-VIS-001 (far-future
  wall still 823 RU/803 locked at day 60) and FIX-M1-CONTENT-JA-001 (D-009
  verb cards かえりざく/あるきだす/ねかす + こんさーと still served through
  month 2). If they are still `ready`, ledger the carry honestly — do not
  count their absence as fixed.
- JA mixed-script surface policy (M2 D-005: つくえの 上に vs うえ) — sweep
  whether month 3 widens the pattern.
- D-013 (marked/unmarked RU pairs) persists on practice surfaces; needs the
  owner-intent decision, then a gate.
- ASR posture unchanged (large-v3-turbo judge; ALWAYS `export
  CUDA_VISIBLE_DEVICES=''` when the local engine holds the GPU).

## Method

Sim days 61-90 from the month-2 state (`scripts/sim_month1.py` resume shape,
raw logs chain; worklist days 61-90 exactly; days 1-60 are seed). Mechanical
pass before reviewer lanes. Fresh-eyeball per-chunk verdicts, ja and ru
separate. Experience review from per_day metrics (novelty must be computed
across the whole 90-day chain, not per window — the M2 window-local first-seen
counting flattered RU's 31-60 numbers; the chained count is the honest one).

## Acceptance

Same six bullets as M1/M2 (sim logs 61-90 both packs; mech pass 100%;
per-chunk fresh-context verdicts; defect ledger with dispositions; residual
manifest + M4 card created; gates.log under
state/evidence/LEARNER-REVIEW-M3-001/).
