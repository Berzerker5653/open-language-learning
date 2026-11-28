# LEARNER-REVIEW-M2-001 — experience review (pass 3, days 31-60)

Measured from the raw per-day logs via `tools/m2_helpers.py metrics`
(→ `sim/exp-metrics.json`), first-seen novelty chained across the full
60-day walk (seed days 1-30 chained from `sim/raw-seed/` — the honest
definition; a window-local first-seen count inflates RU's month-2 figures,
see gates.log).

## Headline numbers

| metric | RU | JA |
|---|---|---|
| new items days 1-30 (seed) | 1152 | 1418 |
| new items days 31-60 | **5** | 117 |
| new items/day avg days 31-60 | **0.17** | 3.9 |
| per-day new items 31-60 | `[3,2,0,0,...,0]` | `[17,16,6,4,3,3,3,4,3,2,3,3,3,7,10,0,10,0,0,10,0,0,0,0,10,0,0,0,0,0]` |
| offer days (of 30) | 30/30 | 30/30 |
| practice opens | 631 | 1061 |
| modality union | all 6 | 5 (no phonological-discrimination in month 2) |
| path payload last day | 823 units / **803 locked** | 819 / 776 |
| path payload first audited day | 823 / 803 | 819 / 777 |

## Findings

1. **RU Month-2 content exhaustion (blocker).** Day 31 served 3 new items,
   day 32 two, then **28 consecutive days with zero**. The frontier advanced
   16→17 units across the month; three on-ramp units sat at 5/6 refs done
   from ~day 33 onward (greetings-01, self-introduction-01, everyday-01 —
   the 6th ref never unlocked because the pool had no further content). The
   daily plan kept producing offers every day (30/30) — they were 100%
   review. A learner would feel this as: the app stopped teaching in
   month 2. Ledger: defect-ledger.md M2-D-001. FIX-M2-SUPPLY-RU-001
   (board t_57092fec) carries the fix; this review only ledgers it.
2. **FIX-M1-CONTENT-RU-001 verified for its own window**: days 1-30 served
   1152 new text items for RU (M1's post-fix audit measured 94 unique
   *content ids*; these are text-item counts on the same chained method —
   inflow is alive at seed and dead at 31+, i.e. the pool depth is ~one
   month, matching the fix card's scope).
3. **JA pacing healthy but front-loaded**: 33 of 117 month-2 new items land
   in days 31-32, then ~3/day, with 5 zero-days (34, 46, 48, 49, 51-54, 56-58,
   60 pattern visible in the per-day vector) — not starvation (10-item
   bursts recur on 35, 37, 40, 44), just band-boundary lumpiness.
4. **Far-future wall unchanged (D-003 carryover)**: day-31 and day-60
   `unit_path` payloads are byte-comparable in size: 823 RU units / 803
   locked (97.6% locked), 819 JA / 776-777. The learner's first screen of
   "the month ahead" is still dominated by locked advanced titles —
   FIX-M1-PATH-VIS-001 status ready/never-shipped, NOT verifiable as fixed.
5. **Mode coverage**: all six practice modalities reachable (RU union
   includes phonological-discrimination from the d59-60 contrast lessons);
   JA month 2 served no phonological-discrimination items — worth watching
   at M3, not a defect (no unlock complaint possible from sim alone).
6. **Answer-quality plumbing healthy**: 631/1061 practice opens all graded
   server-side with exactly one correct choice per occurrence (mech pass
   occurrence checks), 0 answer-key drift within window except the 4
   cross-window letter-drill artifacts (M2-D-004).
