# REVIEW-FIX-M1-PROGRESSION-001 — axis (a) SPEC

Target: `87786961` (code) + `25757ff3` (ledger). Contract source: board card
`t_ead922d2` body + `tasks/ROADMAP.yaml:4121` (`FIX-M1-PROGRESSION-001`).

Note on the review card's own pointer: `state/notes/FIX-M1-PROGRESSION-001.md`
does not exist. The binding acceptance text is the board card body and the
ROADMAP acceptance list (5 items); both were used. The absence of the notes
file is itself a minor ledger-convention miss (the worker-protocol card shape
expects a notes contract; the card body carried it instead).

## Contract item by item

1. Per-activity NEW selection inside UNLOCKED units, including the current
   unit's own unscheduled refs (missing-letter case).
   MET. `progression_items()` now walks unlocked units' activity
   `content_refs`, deduped, and emits each on the dimension the pack tables
   resolve, skipping ids no runner builds. `т` is explicitly pinned by
   `missing_letter_of_an_unlocked_unit_stays_new_eligible`, whose setup
   reproduces the exact incident shape (evidence on a/o/m, goal already
   touched). Reviewer note: the pin seeds two prompt families per letter so
   the pool is measured on a letter at `independent`, which is the load-bearing
   detail — at sup 0 the old funnel would also have kept offering it.

2. K-70 phase gate + goal band edges + learned-kana filter intact.
   MET, and stronger than asked. The new stream evaluates unlock through
   `unit_goal_locked` + `unit_gate_holds` — the same predicates
   `practice_met_content` uses, one gating engine. `add_new_item_candidates`
   additionally `retain`s the already-built progression vector through
   `locked_new_content` + `goal_locked_new_content` + the learned-kana word
   filter (apps/desktop/src-tauri/src/lib.rs, the block opening the function),
   so a lock now covers every route into the NEW pool, including this new
   stream. `gated_unit_content_never_enters_the_new_selection` pins the
   negative and keeps it load-bearing by asserting the on-ramp letters DO
   seed.

3. Reviews of already-introduced items untouched.
   MET. Evidence on a dimension removes only that dimension from NEW; the
   review path (`due_reviews`, weak skills) is unchanged in the diff apart
   from planner fill ordering.

## Out-of-scope additions (flagging, per card instruction)

The card authorised the design ("design decision is yours") but scoped the
root cause to the untouched-goals funnel. The diff ships two further
mechanisms that the frozen RCA did not identify:

- **Planner starvation fix** (`crates/scheduler/src/planner.rs`). Phase 1
  compared each objective's reserved cap against TOTAL elapsed seconds, and
  phase 2 drained reviews → weak → progression sequentially, so a beginner's
  weak-skill backlog consumed the reserved new-material floor. `mechanism.md`
  measures the actual pool at 43 candidates for a zero-evidence RU profile
  and shows the RCA's "pool provably empty from day 2" claim did not survive
  measurement. This is a second, independent starvation mechanism, and the
  RCA's own text concedes it is "not binding".
- **Letter-drill prompt-family rotation.** Direction was a content hash, so
  one letter had exactly one family forever and the `independent` rung
  (policy R04/R11, two distinct families) was unreachable for the whole
  alphabet — the RU letter→greetings gate could never close. Without this,
  acceptance 2 was unreachable regardless of the pool fix.

Both are beyond the RCA's stated mechanism but inside the card's acceptance
contract, each red-first pinned, each documented with measured evidence.
Judged in-scope, not scope creep.

## Acceptance: met by recorded evidence, or only claimed?

The numbers were claimed (RU 144 / 803 / day 1; JA 256 / 50 / day 1) and they
reproduce from the archived logs — but the metric definition is the problem.

Reviewer recompute, independently, straight from
`state/evidence/FIX-M1-PROGRESSION-001/sim/raw-{ru,ja}.tar.gz`:

| metric | lane claim | reviewer recompute |
|--------|-----------|--------------------|
| RU days | 60-day | **30 day logs** (30 files, `days: 30`) |
| JA days | 60-day | **30 day logs** |
| RU unique practice content_ids | 144 | **94** (144 = distinct `item_id` strings from `home_state.plan` — same content under 2 modalities) |
| JA unique practice content_ids | 256 | **237** (256 = same `item_id` basis) |
| RU non-letter units refs_done>0 | 803 | **803** (of 813 non-letter units; the committed PRE-fix tarball `LEARNER-REVIEW-M1-001/sim/raw-ru.tar.gz` gives 1 for the same metric — so it does discriminate pre/post) |
| JA non-letter units refs_done>0 | 50 | **49/50** |
| offer first day RU / JA | 1 / 1 | 1 / 1 |

Two findings from this table:

- **`nonletter_units_refs_done` is reproducible but coarse.** It does
  discriminate (RU 1 pre-fix -> 803 post-fix), so the card's ">=3" floor is
  genuinely crossed. But 803 of 813 non-letter units having refs_done>0 after
  30 days is only meaningful as "the learner has touched at least one shared
  ref", not as "the ladder is advancing". The card's actual concern — RU
  stuck at `cyrillic-a-o-m-t` 3/4 with `greetings-01` locked — is answered in
  the raw `unit_path` day logs (`greetings-01` reaches refs_done 5/6, `т`
  gets served, the RU plan on day 30 contains `ru.lex.greetings.*` and
  `ru.sent.on-ramp.*` material), but no committed acceptance metric measures
  gate-unit completion, which is the thing D-001 was about.
- **The "60-day" label is wrong.** Both tarballs hold 30 day files, the
  digest says `"days": 30`, and `gates.log` says `runs: ... 30 days` under a
  header that says "60-day". The ROADMAP acceptance bullet says "30-day".
  The ROADMAP bullet is correct; the commit message, ledger commit message,
  task-state notes, and the board summary all say 60. Cosmetic, but it is a
  false figure in the durable record and in `state/task-state.json`.

Verdict on the evidence claim itself: the worktree-suite figure
(259 passed / 0 failed / 2 ignored) is real — the reviewer reproduced it at
`87786961` in a clean detached worktree with hardlinked media
(`gates.log`, same section). The sim acceptance numbers reproduce modulo the
`item_id` vs `content_id` basis, and both packs clear the card's thresholds
on either basis (94 >= 60, 237 >= 40). So: **acceptance met, by recorded
evidence that is reproducible but partly mislabeled**, with one acceptance
bullet (units advancing) carried by a metric that does not discriminate.

## SPEC verdict

**PASS WITH NOTES.** The diff does what the card asked, including the
K-70/learned-kana preservation, plus two measured extensions that are inside
the card's own acceptance contract and each red-first pinned. Nothing was
omitted from the card's scope. Notes, not blockers:

- S1: the "units advancing" acceptance bullet is evidenced by a
  non-discriminating metric (803 pre-fix == 803 post-fix). Needs a metric
  that measures gate units completing, or the bullet needs rewriting.
- S2: "60-day" is wrong in the commit message, ledger message,
  `state/task-state.json` notes, and the board summary; the runs are 30 days.
- S3: `unique_items` counts `item_id` (content x modality) while the card
  wording is "unique practice item_ids" — defensible on the card's own
  wording, but the digest should say which basis it uses.
- S4: `state/notes/FIX-M1-PROGRESSION-001.md` (the card's own contract file)
  was never committed, so the review card's first instruction could not be
  executed.
