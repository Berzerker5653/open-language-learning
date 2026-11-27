# LEARNER-REVIEW-M1-001 — experience review (pass 3)

Method: walked the fixed-engine journey-sim logs (days 1-30, both packs) as
learner-side evidence: daily plan composition, offer presence, unit unlock
timeline, mode usage, and roadmap payload size. Metrics computed
programmatically over `sim/raw/*`. CORRECTION (takeover-B): the run-3 metrics
script died with its worker and was never committed (`exp-metrics.py` is not
in the tree); every figure below was recomputed from the raw day logs by
takeover-B — the derivation is in `gates.log` V3.

## What is healthy (verified post-D-001-fix)

- **New material flows every day.** RU serves 94 unique content items across
  30 days (was 6), JA 230 (was 15). New-item inflow: RU ~3/day, JA ~8/day.
- **A next action exists every day**: `current_offer` non-null on 30/30 days
  for both packs.
- **Six-mode practice is exercised from early on**: story views on every
  sampled week, writing tasks on 30/30 days, drills + listening from day 1-2.
- **Workload is stable**: RU 19 items/day avg (6-38 planned; 14 distinct
  content items/day, 6-21), JA 38/day avg (15-40 planned; 29 distinct, 9-37).
  No day is empty and no review-only death spiral (was 100% weak-skill
  reviews of 6 items from day 2 — fixed). CORRECTION (takeover-B): this line
  originally read "RU 16 items/day avg (0-28, day 1 is encounter-only
  onboarding), JA 27/day avg (0-30)" — those figures do not reproduce from
  the logs (no measure yields 16/27 and no day has 0 items).
- **Pace**: RU 16 units complete by day 30, JA 15 — ~0.5 unit/day, gates
  reachable (letter->greeting gate now completable via rotating drill
  families, per FIX-M1-PROGRESSION-001).

## Experience defects found (ride the ledger)

1. **Roadmap wall** — the Today-tab path payload carries the ENTIRE pack
   catalog: 823 RU units (803 locked) / 819 JA (777 locked) rendered as a
   roadmap from day 1. A from-zero learner sees ~800 locked future units,
   many of them advanced English catalog slugs ("writing petitions",
   "carbon economics", "thesis defense" in BOTH packs). Provenance:
   `unit_path` day-30 payload; fresh-context reviewers independently flagged
   the same block (chunks ja-012..042, ru-027..032). Violates the IA rule
   "open AT the frontier, locked strictly below" in spirit — the locked
   mass is the screen. -> D-003 (fix).
2. **RU new-content supply is thin**: ~3 new items/day vs JA ~8. A motivated
   day-30 RU learner has met 94 content items — below what a month of daily
   study should yield (JA reaches 230). Likely unit-pool density, not the
   selector (selector was fixed). -> D-004 (fix, data-side).
3. **Internal reason slugs in plan payloads** ("weak-skill", "due-review")
   and morphology tags (`acc.pl`, `gen.sg`) ride in `plan.items[].reason` /
   `labels[].label` fields. The UI does not render these verbatim today, but
   they sit one careless `String(item.reason)` away from learner eyes, and
   the audit worklist over-counted them (tooling over-inclusion, see
   D-005). -> D-006 (known-limit, guard with a copy-audit rule instead).
4. **Title language mix in RU pack** — unit titles mix English ("Abuse") and
   Russian ("Вчера и в прошлом году") without a visible rule. -> D-007
   (known-limit pending curriculum owner intent; English-first may be
   deliberate for from-zero).

## Non-findings (checked, healthy)

- Streak/missed-day behavior: sim advanced daily; harness has no skip-day
  leg (known tooling limit, D-002 family) — no engine defect observed.
- Quiz repetition: distractor sets rotate on letter drills (verified
  occurrence-level); no stale-choice failures across 30 days.
