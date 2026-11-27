# Erratum: FIX-M1-PROGRESSION-001 sim acceptance was 30 days, not 60

Recorded 2026-11-27 by FIX-REVIEW-PROG-LEDGER-001 (board t_dc39e07b), per
REVIEW-FIX-M1-PROGRESSION-001 (state/evidence/REVIEW-FIX-M1-PROGRESSION-001/spec-verdict.md).

## What the durable records wrongly claim

Four durable records say the post-fix acceptance sim ran **60 days**; none of the artifacts do:

1. Commit message `87786961` (code commit) — "60-day sim acceptance PASS".
2. Ledger commit message `25757ff3` — same claim.
3. `state/task-state.json` → `tasks.FIX-M1-PROGRESSION-001.notes` — "60-day sim acceptance PASS" (corrected by this card's errata commit).
4. Board card `t_ead922d2` completion summary.
5. The header line of the acceptance section itself,
   `state/evidence/FIX-M1-PROGRESSION-001/gates.log:48` — "=== 60-day sim acceptance (post-fix ...) ==="
   (directly contradicted two lines later by the same file).

## What the artifacts actually show (30 days)

Measured 2026-11-27 on the committed tree (commands re-run, not quoted from memory):

- `tar tzf state/evidence/FIX-M1-PROGRESSION-001/sim/raw-ru.tar.gz` → 30 `ru-dayNNN.json` files (day001–day030). Same for `raw-ja.tar.gz`.
- `tar tzf state/evidence/LEARNER-REVIEW-M1-001/sim/raw-{ru,ja}-run3-2026-11-27.tar.gz` → 30 day files each (the RUN-3 re-verification also ran 30 days).
- `state/evidence/FIX-M1-PROGRESSION-001/sim/acceptance-digest.json` → `"days": 30` (both packs).
- `state/evidence/FIX-M1-PROGRESSION-001/gates.log:50` — "runs: RU org.openlanguage.ru-ru.reference **30 days**; JA org.openlanguage.ja-jp.reference **30 days**".
- The ROADMAP acceptance bullet (tasks/ROADMAP.yaml, FIX-M1-PROGRESSION-001) contracts **30-day** — the true run length matches the contract.

## Does the correction change the verdict?

No. Acceptance PASSES at the contracted 30 days. The reviewer independently recomputed the metrics
from the raw logs (spec-verdict.md): unique practice content_ids RU 94 ≥ 60, JA 237 ≥ 40 (the
144/256 figures were a distinct-`item_id` basis, not unique content_ids), non-letter units with
refs_done>0 RU 803 / JA 49-of-50 ≥ 3, first offer day 1 ≤ 5 for both packs. Thresholds met on
either counting basis at 30 days.

The shipped commits 87786961 / 25757ff3 are NOT rewritten (history immutability); this file is the
durable correction. Related erratum detail (metric basis): the 144/256 figures are item_id-basis
counts; unique content_ids are 94/237 as recomputed by the reviewer — both clear the thresholds.
