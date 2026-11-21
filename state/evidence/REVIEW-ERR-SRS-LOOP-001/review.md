# REVIEW-ERR-SRS-LOOP-001 — two-axis review of the error memory loop lane

Review target: commit `9a25202` (code), ledger close `fa08faf`. Reviewed 2026-11-21 on
main `f3c9f0c` (lane untouched since; sibling lanes moved lib.rs line numbers by ~+150 —
both anchors given). Review card is REVIEW-ONLY: no production code changed here.

## Verdicts

- **Axis (a) SPEC — changes-requested.** Every specified element is present and honestly
  partitioned, but one acceptance mechanic is broken (D1: multi-error dictation sentences
  record only their first mismatch) and one acceptance promise stops at the IPC boundary
  (D3: no learner-facing offer surface exists in the frontend).
- **Axis (b) STANDARDS — approved-with-notes.** Repo conventions and ledger hygiene are
  exemplary (see below). Two honesty-rule notes rise to defects: D2 (a named linguistic
  class claimed where the evidence only supports "different case") and D5 (empty
  submissions pollute the ledger). No gate was weakened; the one test-assertion change is
  card-mandated and its purpose preserved.

**Overall: changes-requested.** 3 substantive defects (D1, D2, D3), 2 minor (D4, D5).

## Axis (a) SPEC — element by element

| Card element | Where | Verdict |
|---|---|---|
| Classification vs pymorphy lemmas sidecar (case/aspect/stress/agreement/wrong-word, honest `other`) | `crates/activity/src/form_errors.rs` (whole file) | present; priority stress→wrong-word→case→aspect→agreement→other; `None` when expected form has no sidecar row (no claim). Fixture tags follow real pymorphy3 shape |
| Per-profile `error_ledger` append, migration v7 | `crates/storage/src/migrations.rs:230` (v7 block), `crates/storage/src/error_ledger.rs` `record_error` | present; append-only by design (recurrence is the point); per-profile FK + cascade; v7 artifact + upgrade path tested |
| Explicit offer, card ONLY on accept | `FormErrorOffer` in `DictationResult.error_offers` and `WritingGrade.offer`; creation only via `error_review_accept` command | present at engine/storage/IPC level; NEVER silent holds everywhere in the diff — no path schedules anything without the accept call |
| FSRS scheduling under `+error` partition | `crates/scheduler/src/fsrs.rs` `ERROR_REVIEW_SCHEDULER` (`fsrs-spike-0.1.0+error`); accept/queue/grade all filter/join on it | present; R02 partition discipline honored (own tag, ordinary FsrsSpike, no mastery evidence written by error drills) |
| Recurrence → `personalize_progression` INPUT ONLY, cap 3, tie-break, no-calibration rule | `apps/desktop/src-tauri/src/lib.rs` `RECURRENCE_CAP`/`personalize_progression` | present; comparator caps at 3 and only `then_with` inside an equal dimension-key group; test `error_recurrence_breaks_dimension_ties_capped` proves cap flattening AND never outvoting the confidence ordering; docs/18 prose untouched |
| Ledger local-only, export bundle v4, survives migrations, no new network calls | `export.rs` v4 bump + import re-issue (card ids follow fresh ledger ids; `+error` scheduler rows rewritten under the same R05 discipline) | present; independent grep of the diff found zero http/reqwest/ureq additions; v1–3 import compat kept (card-mandated assertion update, purpose preserved) |

Out-of-scope additions: none material (`ErrorSink` is a lint-forced arg bundle, disclosed
in task-state notes; `pack_sentence_text` serves the card's context-replay requirement).
Omissions: D3 below.

## Defects (precise, for FIX cards)

**D1 — SUBSTANTIVE: duplicate ledger_id silently drops every mismatch after the first in a
dictation sentence.** `apps/desktop/src-tauri/src/lib.rs` — `record_form_error`, id at
9a25202:6979 (HEAD:7057): `ledger_id = format!("err-{}-{}", sink.now.as_secs(),
sink.now.subsec_nanos())`. The `now` lives in the shared `ErrorSink`, captured ONCE in
`dictation_check_at`; `dictation_form_offers` calls `record_form_error` once per mismatched
pair with that same sink. Every pair in one dictation therefore gets the identical ledger
id; `error_ledger.id` is PRIMARY KEY and the INSERT has no ON CONFLICT, so the 2nd..Nth
pair fails with SQLITE_CONSTRAINT, and `.ok()?` swallows it into `None` — no ledger row, no
offer, no recurrence count, silently. Breaks acceptance bullet 1 (every mismatch appended)
and under-counts the recurrence signal for exactly the learners who make several mistakes in
one sentence. Fix: per-call unique id (pair index, uuid, or derive inside record).

**D2 — SUBSTANTIVE (honesty rule): case-only differences are recorded as `stress`.**
`crates/activity/src/form_errors.rs:118` (HEAD): `if en == pn && expected != produced` →
`Stress`, but `norm_form` lowercases. Neither producer lowercases before the call:
dictation `clean` = `normalize_for_match` → `alignment::normalize_chars` (strips
punctuation/whitespace only, NO case fold) and writing `normalize_typed` (strips whitespace
only). So target "Спасибо" vs ASR-heard "спасибо", or writing "Чашка" vs typed "чашка",
lands a named **stress** claim in the ledger and an offer — a linguistic verdict the data
does not support (AGENTS.md: no fabricated linguistic verdict; CODING_STANDARDS §B). The
code comment even claims the branch covers "ё" — `norm_form` does not fold ё→е, so that
case actually falls through to the sidecar diff. Fix: fold case in the equality check, or
route case-only differences to `Other`/no-offer; correct the comment.

**D3 — SUBSTANTIVE (scope gap): no learner-facing offer surface.** The frontend contains
ZERO references to `error_offers`, `offer`, `error_review_accept`, `error_review_queue`, or
`error_review_grade` (grep over `apps/desktop/src/**/*.{ts,tsx}` at HEAD: empty). The three
commands are registered in `run()` but nothing calls them; `DictationResult.error_offers`
and `WritingGrade.offer` are never rendered. Acceptance bullet 2 says "the learner is
explicitly offered a per-form review card" — as shipped, the offer exists only in IPC
payloads and the entire accept→queue→grade loop is unreachable by a learner. The lane was
correctly backend-only (no tsc/vitest needed), but the UI wiring is a required acceptance
element that no card currently owns → planner must spawn a UI card (surface offers on
dictation/writing results + accept affordance + review-queue drill view).

**D4 — MINOR: `pack_sentence_text` comment promises lexicon resolution it does not
implement.** `lib.rs` at 9a25202:7912 (HEAD:8128): doc says "a lexicon-context id (writing
miss) resolves through the lexicon" but the body only scans the `sentences` jsonl dir
(HEAD:8133). Writing misses carry the writing item id as context (HEAD:5557:
`context_sentence_id: &item_id`) — typically a `ru.lex.*` id — so composition-originated
cards get `context_text = None` and drill bare, partially weakening "replay the exact form
IN its context sentence" for the composition path. Fix: resolve lexicon ids (or amend the
comment and defer resolution to a card).

**D5 — MINOR: empty composition submissions append a wrong-word ledger row.**
`crates/activity/src/writing.rs:136` `grade_writing` returns `correct:false` for an empty
submission, and `writing_submit` (HEAD:5560) then calls `record_form_error(expected, "")`:
the produced form is absent from the sidecar → WrongWord ledger row + offer for a skipped
item. Ledger should not record non-attempts. Fix: skip recording when produced is empty.

## Axis (b) STANDARDS — notes

- Commit/ledger hygiene: exemplary. Code `9a25202` / ledger `fa08faf` split; every
  task-state evidence path verified to exist; `gates.log` is a model honesty record
  (self-discloses the attempt-2 missing-file problem, documents the byte-identical
  baseline-diff method for the ja-pack env noise); `validate_handoff.py
  --require-explicit-ledger-records` PASSes at review time (one pre-existing unrelated
  WARN: PROGRESS-STATS-001 lacks an explicit ledger record — not this lane).
- Tests assert behavior; no gate/script/test weakened. The `export_import.rs` v3→v4 and
  `store.rs` v7 assertion updates are card-mandated contract bumps; the v1-import purpose
  of the touched test is preserved (simulated old doc strips exactly the new fields).
- Privacy/offline: local-only, no new collection or network; classifier abstains without
  sidecar data; error drills write no mastery evidence; recurrence cap keeps docs/18
  no-calibration posture. Migration + export versioning shipped per standard.
- Note (not a defect): classify does a linear `norm_form`-per-row scan per lookup and
  rebuilds the index Vec per `record_form_error` call — fine at pack sizes, worth an index
  only if sidecars grow large.

## Independent verification (reviewer's own runs, not the takeover's)

- `python3 tools/validate_handoff.py --require-explicit-ledger-records` → PASSED.
- Clean worktree at HEAD (sibling WIP pollutes the main tree): `cargo test -p lts-activity
  --lib form_errors` → 8 passed / 0 failed; `cargo test -p lts-storage --test error_ledger`
  → 6 passed / 0 failed. Logs: `review-test-activity.log`, `review-test-storage.log`.
- Diff grep: 0 new network-call tokens. Evidence paths + fa08faf + KANBAN.md row verified.
- Per no-reverify, the takeover's desktop/clippy battery was NOT re-run (gates.log stands).
