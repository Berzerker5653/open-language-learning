# REVIEW-FIX-READER-FLOW-001b-1 — two-axis review

Reviewer: hermes-default (ai-assisted). Date: 2026-11-21.
Targets: `c9e332e` (fix: aux index parsed once, not per tap), `12202f3` (chore: rot fix + fmt sweep), ledger close `7ba4df0`.
Contract: FIX-READER-FLOW-001b-1 card body (close of defect S1 from REVIEW-READER-FLOW-001b).

## Verdict

**approved-with-notes.** The code change does exactly the contract — nothing more, nothing less — and the
gate log is honest. The defects are in the LEDGER close and the commit-message provenance, not in the diff.

## Axis (a) — SPEC: PASS

Contract element → evidence (all at `c9e332e:apps/desktop/src-tauri/src/lib.rs`):

1. **Cached OnceLock/Arc index** — `AUX_INDEX_CACHE: OnceLock<Mutex<HashMap<PathBuf, AuxCacheEntry>>>`;
   `AuxCacheEntry { len, modified, Arc<AuxIndex> }`; single parse site `aux_parse_index` (read + line-parse +
   `by_key` build) — nothing else touches the file. `word_card_at` takes the `Arc` clone only.
2. **Index keyed surface|form** — `by_key` inserts `row.word` AND every `row.forms` entry → slot map;
   lookup goes surface → lemma → by_key (verified in `word_card_at`).
3. **Second word_card call must not re-read the 72 MB file** — targeted test
   `word_card_parses_the_aux_slice_once_not_per_tap` present and STRONG: two taps with different keys
   assert `aux_index_build_count(&slice) == 1` via a `#[cfg(test)] AUX_INDEX_BUILDS` counter incremented only
   in `aux_parse_index`; additionally proves cache invalidation (in-place slice replacement changes length
   → re-read, new row served). This is exactly the "nothing less" check the card asked for.
4. **Honest no-slice degradation** — `aux_slice_path` returns `None` → aux fields stay `None`; pre-existing
   degradation test `word_card_aux_lookup_goes_through_the_lemma_and_degrades_without_a_slice` still green.
5. **Candidate order data-dir → repo-tree → bundle** — `aux_slice_path`: `data/aux/lexicon` →
   `CARGO_MANIFEST_DIR/../../../aux/lexicon` → `BUNDLED_PACKS.parent()/aux/lexicon`. Unchanged from d4b3fe5.
6. **WordCardView wire shape UNCHANGED** — no field added/removed/renamed in the struct or in
   `views/reading.tsx`; aux fields travel separately as before (`aux_gloss`/`aux_word` etc. pre-existed).
7. **Pack-primary rule unchanged** — off-pack tokens still only get the aux card
   (`word_card_off_pack_token_gets_the_labeled_aux_card`, `word_card_reports_off_pack_words_as_not_in_pack`
   both green in gates.log).

Nothing-more check: `c9e332e` touches exactly one file (+280/−35 lib.rs: cache, lookup refactor, tests).
No drive-by changes.

**Rot chore `12202f3` stays rot-only: PASS.** Diff = Ok-wrapped match arms (E0308), mine re-mine partial-move
fix (E0382), one `Debug` derive, plus `cargo fmt` sweep over storage crates. No behavior semantics altered;
the fmt hunks are whitespace. The card explicitly allows the fmt sweep; nothing larger found.

## Axis (b) — STANDARDS: defects (none in the code)

**Gates.log honesty: PASS.** `state/evidence/FIX-READER-FLOW-001b-1/gates.log` discloses the
full-suite result honestly (`167 passed; 37 failed; 2 ignored`), the commit message repeats the
37-pre-existing-failures disclosure, and NOTES.md tracks them for follow-up cards. The 7 targeted
word_card tests are listed by name. Evidence paths (`gates.log`, `unit-journal.log`, `NOTES.md`) exist.

**B1 (P2, ledger hygiene) — the close recorded nothing.** `7ba4df0` ("ledger(FIX-READER-FLOW-001b-1): close")
adds the three evidence files but its `state/task-state.json` diff (102 lines) is a **pure `\uXXXX`
escape-noise rewrite that is semantically identical** (json-compared before/after: `identical: True`) —
zero real edits. There is **no task-state record for FIX-READER-FLOW-001b-1** and **no KANBAN.md row**
(`grep -c FIX-READER-FLOW tasks/KANBAN.md` = 0). The sibling same-day card FIX-ERR-SRS-LOOP-001-1 shows
the expected shape (close `dc9d4d4` edits task-state + KANBAN.md, record `done`). This violates the
controller-close rule ("point task-state at the evidence path, flip to done, commit") and the
escape-noise rule ("never commit as-is — apply only semantic field changes"). Same gap on the
sibling close `cc3d6c7` (FIX-READER-FLOW-001b-3 — also no task-state/KANBAN record; flagged for the
planner, outside this card's target).

**B2 (P3, message provenance) — `c9e332e` message describes code that never existed.** It says
"aux_index (lru 4/lang) handed &'static AuxIndex to aux_hit… AuxCacheEntry now owns aux_hit's owned
(surface,lemma,rows) triple" — the pre-fix baseline (`12202f3` tree) had **no aux_index, no LRU, no
OnceLock** (grep = 0): the actual baseline was `aux_rows()` read+parse per call, which is exactly defect
S1. The message was evidently written against a rejected intermediate attempt. It also claims "Adds
word_card_aux_lookup_goes_through_the_lemma_and_degrades_without_a_slice" — that test **predates the fix**
(present in `d4b3fe5:` and `c9e332e^:` trees; c9e332e adds only the once-per-tap test). Misleads bisect.

**B3 (P3, message provenance) — `12202f3` cites a phantom commit.** "HEAD (27e9d7c lineage)" —
`git cat-file -t 27e9d7c` fails; the object exists nowhere in the repo (`--all` sweep). The actual E0308
pairing (Ok-wrapped arms + raw view tail) was introduced by `28e9e30` — the mislabeled `docs(agents)`
sweep that dragged desktop code onto main (known 2026-11-21 incident). The chore correctly names
`9a25202` for the E0382.

## Defect list for FIX cards (planner spawns; reviewer does not)

- **F1 (P2, ledger):** Add the missing FIX-READER-FLOW-001b-1 close records: task-state entry
  (status done, evidence → `state/evidence/FIX-READER-FLOW-001b-1/gates.log` + `NOTES.md`) and a
  KANBAN.md done row; same for FIX-READER-FLOW-001b-3 (commit cc3d6c7, evidence under
  `state/evidence/FIX-READER-FLOW-001b-3/`). Re-run
  `python3 tools/validate_handoff.py --require-explicit-ledger-records` green. Do NOT rewrite 7ba4df0;
  the repair is additive.
- **F2 (P3, provenance):** Drop a one-line correction note at
  `state/evidence/FIX-READER-FLOW-001b-1/message-provenance.md` recording that c9e332e's baseline
  description and "Adds …degrades_without_a_slice" claim are wrong (baseline was per-call aux_rows;
  that test came from d4b3fe5), and that 12202f3's "27e9d7c" is a phantom whose real referent is 28e9e30.
  Never amend/rebase the shared-main commits themselves.

## Non-defect notes

- Cache invalidation is (len, mtime) metadata — an in-place edit preserving both would serve stale rows;
  acceptable trade, worth one doc comment at most (not a defect).
- The 37 pre-existing lts-desktop failures are correctly NOT this lane's problem; NOTES.md tracks them
  for planner cards.
