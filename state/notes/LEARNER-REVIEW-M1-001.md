# LEARNER-REVIEW-M1-001 — audit the real Month-1 learner experience (RU + JA)

Source: 2026-11-26 owner directive after shipping 0.5.0-alpha.1. Owner intent: use the app
every single day; wants the full first-month learning experience reviewed and the content
"110% correct and accurate" before/while that happens. Gated on SPEAK-PRACTICE-001 and
WRITE-PRACTICE-001 landing so the review covers the finished six-mode practice set.

## What "Month 1" means here (measured, not assumed)

The audited scope is **the exact content a from-zero learner meets on days 1–30 of daily
use**, enumerated by running the journey harness (`JOURNEY-SUITE-001` machinery) as a
simulated daily learner in each language — not by guessing the schedule. The simulation log
(days advanced, items served per day, modes exercised) becomes the audit worklist and part of
the evidence. Expect roughly the first ~30 path nodes + their pools, the early graded stories
and quizzes they unlock, listening audio, and every prompt/option/distractor in all six modes.

## Review passes (all required)

1. **Mechanical 100% pass** on every enumerated text item: dictionary/lexicon membership,
   ru stress marks, ja kana/kanji validity + reading consistency, distractor plausibility
   checks, quiz answer-key re-derivation, audio↔transcript ASR re-verification
   (`lts-pack-audio-qa` pipeline). Zero-defect gates already exist — re-run them on exactly
   the Month-1 subset and archive the logs.
2. **Fresh-context linguistic review**: independent agent lanes (author ≠ reviewer, SB rule)
   each receive the Month-1 generated prose — story sentences, scenario lines, quiz prompts,
   mode copy — in chunks with no memory of authoring, and must flag grammar/naturalness/
   level-appropriateness defects. ja and ru reviewed separately; reviewer verdicts + reasoning
   saved per chunk.
3. **Experience review** (the "process" part): step through the simulated month as a learner
   UI-side and record pacing complaints — mode unlock timing vs. difficulty, story levels vs.
   pool coverage, quiz repetition, streak/missed-day behavior, daily-plan next-action quality.
   Findings become fix cards; the review itself writes no product code.

## Defect ledger + honesty contract

- All findings land in `state/evidence/LEARNER-REVIEW-M1-001/defects.md` as a ledger:
  `id | surface | day_reached | severity (blocker/fix/known-limit) | evidence | disposition`.
- Every blocker fixed in this card or a named follow-up card; fix commits reference ledger ids.
- **Residual-uncertainty manifest required**: anything mechanical checks can't settle
  (naturalness calls, register, narrator timbre) stays labeled unverified in release/known
  notes — the owner cannot confirm language accuracy personally (owner statement 2026-11-26),
  so the app must never claim more confidence than the evidence supports.

## Continuation (self-perpetuating, do not skip)

On completion, immediately scope `LEARNER-REVIEW-M2-001` (+M3…) with the same contract for
the next month of path content, informed by M1's defect distribution. Record creation in the
M1 summary and task-state notes so no lane drops the chain. Owner explicitly asked for
per-month checks to continue.

## Acceptance

- Journey-sim logs for both packs days 1–30; mechanical pass logs at 100% coverage of the
  enumerated set; per-chunk reviewer verdicts; defects ledger with dispositions; residual
  manifest; follow-up cards (if any) created and `ready`; gates.log under the evidence dir;
  M2 card created.

## RUN 2 HANDOFF (2026-11-27, board t_a427ed60 attempt 2)

DONE + committed: full 60-day journey-sim (raw logs + raw-*.tar.gz archives +
answer-keys), worklist (RU 991 / JA 968), mechanical pass
scripts/month1_mech_pass.py (0 failures / 100% coverage both packs; RU 53
warnings -> mech-pass/mech-ru.md), defects.md ledger (D-001 blocker, D-002
harness known-limit), RCA (rca-progression-starvation.md), gates.log,
FIX-M1-PROGRESSION-001 board card (t_ead922d2, this card's board PARENT), sim
harness now leak-free + resumable (day logs skipped when present).

REMAINING RECIPE (run only after FIX-M1-PROGRESSION-001 lands - board
auto-resumes this card then):

1. Re-run sim fresh: `rm -rf .sim-data state/evidence/LEARNER-REVIEW-M1-001/sim/raw`
   then `python3 scripts/sim_month1.py --pack ru --days 30` and `--pack ja`
   (each ~2-5 min; chain them; do NOT delete the tar.gz archives).
   Rebuild worklist (`--build-worklist`), re-run
   `.venv/bin/python scripts/month1_mech_pass.py`.
2. ASR subset: ids = union of practice item content_ids + story/scenario ids
   from the worklist; run the ASR leg of `scripts/qa-audit.sh` or
   `scripts/qa-asr.py --ids` with ASR_MODEL/WHISPER (model paths pinned in
   PACK-AUDIO-VERIFICATION-001 evidence).
3. Fresh-context review (pass 2): chunk worklist-{ru,ja}.md items into ~40-60
   prose chunks each; delegate_task children (fresh context; the content
   authors were prior cards, so any fresh lane is an independent reviewer) -
   per chunk: grammar / naturalness / level-appropriateness verdicts; ja and
   ru in SEPARATE children. Save per-chunk verdicts under review/ in this
   evidence dir; merge findings into defects.md.
4. Experience review (pass 3): step the fixed sim's per-day logs as a learner
   - pacing, mode unlock timing vs difficulty, story levels vs pool coverage,
   quiz repetition, streak/missed-day behavior, next-action quality; findings
   -> defects.md + FIX cards.
5. Residual-uncertainty manifest -> known-limits copy (locate via
   tools/audit_learner_copy.py), re-run that audit after. Create
   LEARNER-REVIEW-M2-001 with THIS contract (copy the M1 ROADMAP block shape,
   days 31-60, scoped by M1's defect distribution). Then flip ledger done +
   kanban_complete.

PITFALLS hit in run 2: (a) `pkill -f <pat>` self-kills the worker when any
later word of the same command line contains <pat> - enumerate PIDs with
`pgrep -f 'lts[-]serve'` in one call, kill by PID in the next; (b)
kanban_create needs workspace_path passed explicitly for dir workspaces;
(c) a dead run's leaked serves escape `pkill -f faketime` (faketime execs -
cmdline becomes lts-serve); kill by the `lts[-]serve` pattern.

## RUN 3 VERIFY HANDOFF (2026-11-27, board t_479581f0 = TAKEOVER-B) — DONE

Steps 3-5 of the RUN 2 HANDOFF are VERIFIED and CLOSED by takeover-B. Full
verification record: `state/evidence/LEARNER-REVIEW-M1-001/gates.log`
§"RUN 3 VERIFICATION + CLOSE" (V1-V5). Ledger `LEARNER-REVIEW-M1-001` is
**done**; the corrections takeover-B made to the unverified drafts (ledger
flag aggregates, the lost `exp-metrics.py` provenance claim, the workload
figures, D-009/D-010 precision) are recorded there, not silently.

REMAINING — CONTROLLER ONLY (board mutations are refused inside a
delegate_task child: "cannot mutate Kanban tasks via the CLI"). ROADMAP blocks
for all four cards already exist; contracts are the notes files. Skip any
create whose idempotency key already returns a card (`--idempotency-key`
dedupes; check with `hermes kanban --board lts list --json | grep lts-<CARD>`):

```
cd /home/hunter/game-dev/LTS
# 1) grab the standard worker-protocol block once (from this card's body)
hermes kanban --board lts show t_479581f0 > /tmp/lts-tb.txt
sed -n '/^== Worker protocol/,/^== Card ==/p' /tmp/lts-tb.txt | sed '$d' > /tmp/lts-protocol.txt
# 2) per card: body = contract + protocol, idempotency key guards duplicates
for C in "FIX-M1-CONTENT-RU-001:4" "FIX-M1-CONTENT-JA-001:4" "FIX-M1-PATH-VIS-001:2" "LEARNER-REVIEW-M2-001:2"; do
  ID=${C%%:*}; PR=${C##*:}
  hermes kanban --board lts list --json | grep -q "lts-$ID" && { echo "$ID already on board - skip"; continue; }
  { cat "state/notes/$ID.md"; echo; cat /tmp/lts-protocol.txt; } > "/tmp/lts-body-$ID.md"
  hermes kanban --board lts create --idempotency-key "lts-$ID" \
    --workspace dir:/home/hunter/game-dev/LTS --priority "$PR" \
    --body-file "/tmp/lts-body-$ID.md" "$ID (see contract in body)"
done
hermes kanban --board lts list   # confirm the four are ready, then reassign <id> default to dispatch
```
Priorities are BOLTED-DOWN (highest integer dispatches first): the two P1
content cards go on 4, FIX-M1-PATH-VIS-001 and LEARNER-REVIEW-M2-001 on 2.
Practical shape that has worked before: write each body to a scratch file
(contract + the standard worker-protocol block from any live card), then
`--body-file <scratch>`; assign with `hermes kanban --board lts reassign <id> default`.

Then close THIS card and the parent:
```
hermes kanban --board lts complete t_479581f0 --result "LEARNER-REVIEW-M1-001-TAKEOVER-B: verified + closed RUN 2 HANDOFF steps 3-5; gates: month1_mech_pass re-run at HEAD byte-identical (ru 0 failures/72 warnings, ja 0/9, 100% coverage both), learner-copy audit 0 findings, pass-2 verdicts 108/108 gap-free + tallies corrected (ru fix 7/kl 57, ja fix 64/kl 561), pass-3 metrics recomputed (94/230 items, offers 30/30, path 823/803 + 819/777 locked), D-010 REPRODUCED (lexicon/greetings.jsonl slots), known-limits copy in docs/18; ledger D-001..D-013; commits <evidence sha> + <ledger sha>"
```
`FIX-M1-CONTENT-JA-001` is dispatchable now (its D-010 reproduce-or-close
precondition is satisfied). If the planner already closed the parent
administratively, only record the ledger and comment the shas on the cards.
