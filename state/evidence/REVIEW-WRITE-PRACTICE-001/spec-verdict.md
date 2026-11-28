# SPEC verdict — REVIEW-WRITE-PRACTICE-001 (board t_630db88c)

Lane: WRITE-PRACTICE-001 — code `e858ca0d`, ledger `efceed45` (both verified
ancestors of main `80fb8720`). Frozen contract: `state/notes/WRITE-PRACTICE-001.md`.
Reviewer ran at the frozen commit (detached worktree) plus a HEAD re-run;
raw log: `reviewer-gates.log` in this directory.

## Verdict: PASS WITH DEFECTS — 1 MAJOR (S-D1), 2 minor. No scope creep. Ship stands.

## Contract point-by-point (verified in code, not prose)

| Requirement | Where | Verdict |
|---|---|---|
| Encounter-gated "use today's words" prompt | `writing_prompt_at` uses `practice_pools_at` + `practice_eligible` (same PRACTICE-GATE-001 gate as dictation) | PASS |
| N = 6–10 session-scoped targets from current lesson pool | window `WRITING_TARGETS_PER_PROMPT = 10`, `min(10, pool)`; deterministic rotation by offset | PASS upper bound; see S-MINOR-1 (lower bound <6) |
| Honest day-one refusal for fresh RU profiles | pool-empty refusal "no word practice is unlocked yet"; pinned by `writing_prompt_gives_targets_and_a_cue_and_rotates` (day-one error branch asserted) | PASS |
| One L1 situational cue | `WRITING_CUES` (8, L1=English per shipped packs), rotates with offset; pinned | PASS |
| Mechanical OFFLINE feedback on submit; zero AI | `writing_check_at` — pure dictionary/script code, no provider calls | PASS |
| Per-word script/dictionary validity, ru | Cyrillic-range script check + lexicon `forms[]` membership; test pins known/unknown/invalid-script (`кофе`/`Зюзя`/`Hello`) | PASS |
| ja kana/kanji validity + lexicon | `ja_writing_char` ranges + lexicon; test pins `美味しい` known / `すっぽん` unknown / `coffee` invalid-script | PASS |
| Unknown tokens flagged "not in dictionary", NEVER "wrong" | status `unknown` + panel copy; vitest asserts no `\bwrong\b|\binvalid\b` in coaching copy | PASS |
| Target-word usage chips accepting inflected forms via the typing-mode accepted-form matcher | `used_targets` matches attempt tokens against `lex.by_item` forms (same forms-list semantics as `grade_writing`'s `task.accepted`) | CODE MATCHES THE CITED MATCHER — but the promise fails in production data: see **S-D1** |
| Attempt word count | `word_count` + frontend mirror `countWritingWords` (same tokenizer, pinned) | PASS |
| Private per-profile journal, schema v12, newest-first, cascade-deleted | migration 12 (`writing_journal` + `writing_journal_words`, both `ON DELETE CASCADE`); `ORDER BY occurred_at DESC`; v12 migration-history artifact + v4-rewind reset updated; journal + cascade pinned in storage and desktop tests | PASS |
| Settle-gated accumulation meters (attempts/week + unique dictionary words) | `WritingMetersStrip` returns null on pending read (never invents a zero); rolling 7-day window `shift_days_back_7` (date-math pinned); token table `ON CONFLICT DO NOTHING` = never-regressing | PASS |
| **INVARIANT: usage count is a completion signal ONLY — zero mastery/scheduler writes** | `writing_check_performs_zero_mastery_or_scheduler_writes` snapshots scheduler_state, latest_mastery, error_ledger, mined_items, word_lookups before/after; journal grows by exactly 1. Journey: write-command denylist (14 verbs) asserted empty on both legs. `writing_check_at`'s only store call is `record_writing_attempt`. | PASS — pinned twice, as the card demanded |
| v1 copy promises NO grammar/correction feedback | panel copy disclaims explicitly; `audit_learner_copy.py` re-run by reviewer at `e858ca0d`: **0 findings** (v1.6.0, 56 source + 1852 pack files); vitest asserts "never corrects your grammar" | PASS |
| AI feedback OUT OF SCOPE — flag creeping AI wiring | grep of full diff: zero provider/AI wiring; only comments pointing forward to WRITE-PRACTICE-002. No `explain_card`/provider imports touched. | PASS — no creep |
| Red-first vitest pins per acceptance | 7 panel pins + 2 journey legs | PASS, one shape deviation: see S-MINOR-2 |

## Out-of-scope additions

None material. The 4000-char attempt cap and per-version lexicon cache are
safety/perf hygiene inside the card's own path. Serve-mode exposure comes for
free via the shared command table (`SERVE_COMMAND_NAMES` derived from the same
list) — same pattern every prior practice card uses.

## Defects

### S-D1 (MAJOR, product defect, content+test) — "inflected forms accepted" is false for Russian in production data
The matcher is forms-LIST-driven (by design — it mirrors `grade_writing`, which
also only accepts listed `task.accepted` surfaces). Measured on the shipped RU
pack: **0 of 4,071 ru lexicon entries carry more than one form** (ja entries
are the 2,374 multi-form ones). Consequence: a learner writing
«Я читаю книгу дома утром» against targets книга/дом/утро gets ZERO usage
chips — accusative «книгу» and dative «доме» match no entry (they are not
tokens in the lexicon at all, so they are also flagged "not in dictionary").
Instrumental «утром» only matches because it happens to exist as unrelated
separate entries (ru.lex.pastevents.utrom). Every existing pin uses dictionary
forms (journey leg: `кофе и утро`), so the suite cannot see the failure mode.
This is the card's explicit acceptance ("usage chips count inflected forms",
"reuse the typing mode's form matcher") shipping as a learner-visible broken
promise. Reviewer probe evidence: `reviewer-gates.log` PROBE 1 — attempt 2's
independent JSONL walk at a CLEAN HEAD 80fb8720 measured ru 4,071 entries /
0 multi-form (matches the frozen-commit figure exactly) and ja 4,066 / 2,384
(vs 2,374 at frozen e858ca0d; the delta is the FIX-PACK-K65-001 JA adoption,
defect unchanged).
Spawned FIX card per protocol: **FIX-WRITE-PRACTICE-FORMS-001 (board
t_a2709e84, ready)** —
pre-generate ru lexicon `forms[]` variants offline (morphology machinery
already exists — the sidecar `pymorphy` table) and/or soften the chip copy to
what forms[] actually accepts; plus a Rust pin that submits an INFLECTED
sentence and asserts the chip lights.

### S-MINOR-1 — N lower bound
Contract says N = 6–10; implementation serves 1–5 targets whenever the
encounter-gated pool has < 6 words, rather than refusing or deferring. The
code comment declares this posture deliberately ("never pad targets"). Not a
contract violation of the refusal test (which fires only at pool == 0), but
the card never sanctioned the short-set band. Low stakes; decide in the notes
whether pool ∈ [1,5] should refuse like day one.

### S-MINOR-2 — pin placement
Acceptance asked the "journal persists across profile switch" pin among the
red-first vitest pins; it lives in the journey layer instead (`free-writing
.journey.tsx` leg 2, which is the stronger venue — real store simulation).
Accepted deviation, recorded here.

## Evidence reconciliation
gates.log numbers reconcile with reviewer re-runs (see reviewer-gates.log
cross-check section): fmt 0, clippy 0, storage suite green, desktop lib 256/0
at frozen commit (reviewer hit an era-mismatch environment, see standards
verdict S-S2 for the re-run method), audit_learner_copy 0 re-measured
independently, validate_handoff PASSED re-measured at frozen commit (2 WARN,
pre-existing).
