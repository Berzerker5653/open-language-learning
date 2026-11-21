# STANDARDS verdict — REVIEW-LETTER-UNIT-MODEL-001 (t_68ac28b8)

**CHANGES-REQUESTED** for lane code commit `294d649` + evidence `dcec7cc`
(LETTER-UNIT-MODEL-001 + LETTER-DRILL-TEXT-001 entangled lane, review base `683d918`).
One convention violation (STD-1); everything else approved.

## Findings

### STD-1 — missing ledger records for both cards (controller cleanup, not a code FIX card)
The two shipped cards have no durable ledger trace, while every sibling board card from the
same window does:
- `state/task-state.json` → `'LETTER' in json → False` (latest records: SESSION-TIMER-001,
  PROGRESS-STATS-001, FIX-ERR-SRS-LOOP-001-1/2 …).
- `tasks/KANBAN.md` → `grep -c LETTER` = 0, while `PROGRESS-STATS-001|SESSION-TIMER-001|WIN-RESERVED`
  = 5 hits (close rows exist for siblings).
Convention (docs/15 + AGENTS.md): a done card gets a task-state done record and a KANBAN.md
close row. The controller should land the two ledger-close commits; no FIX-<CARD>-N code card.

### STD-2 (note) — sibling evidence dir has no `gates.log` with Deferred list
`state/evidence/LETTER-DRILL-TEXT-001/` holds `audit-red.log`, `audit-green.log`,
`gate-clippy-desktop.log`, `gate-fmt.log`, `gate-test-desktop-lib.log` but no `gates.log`;
the Deferred list for the whole entangled lane lives only in
`state/evidence/LETTER-UNIT-MODEL-001/gates.log` ("Deferred: post-fix first-run screenshot
… c1.png/c4.png at repo root = dead-run scratch"). Acceptable for a one-commit entangled
lane, but a `gates.log` in the sibling dir (or a pointer) would keep the convention uniform.
The untracked `c1.png`/`c4.png` scratch is honestly declared in the Deferred text — still
worth removing/gitignoring at the next controller sweep.

## Approved (verified at review base)

- **Typed/versioned schemas:** `name`/`sound`/`confusable_with` letter fields in
  `schemas/v0.2/orthography-unit.schema.json:23-33` (optional, engine-side defaults documented
  at `lib.rs:1140-1144`); `case` as `enum ["bicameral","unicameral"]` in
  `schemas/v0.2/orthography.schema.json:24`; declared in every script of both packs
  (`languages/ru-RU/language/orthography.yaml:7`, `languages/ja-JP/language/orthography.yaml:13-36`).
- **Deterministic core:** choice placement via `fnv1a(item_id) % (len+1)` (`lib.rs:6471-6472`);
  stagger is a stable greedy re-pick, never drops a letter (`lib.rs:3382-3399`).
- **No engine-side language data:** Cyrillic appears in the engine only in doc comments
  (`lib.rs:1287,3339-3360`) and test fixtures; all confusability data lives in the pack
  (`languages/ru-RU/orthography/cyrillic.jsonl`, 10 `confusable_with` entries).
- **Audit ratchet honesty:** red-before-green is test-proven on the exact DOGFOOD-2026-11-21
  strings (`state/evidence/LETTER-DRILL-TEXT-001/audit-red.log` + `audit-green.log`, 0 findings
  tree-wide; `tools/test_audit_learner_copy.py` 13/13 re-run green at review time).
- **Commit hygiene:** single labeled commit naming both cards per the entangled-takeover rule,
  with full gate battery in the message; gate logs exist on disk
  (`gates.log`, `gates-rust.log`, `gate-fmt.log`, `gate-clippy-desktop.log`,
  `gate-test-desktop-lib.log`) — evidence paths verified present.
- **Independent re-verification at HEAD `683d918`:**
  `cargo test -p lts-desktop --lib letter_model` → 1 passed; `--lib stagger` → 2 passed;
  `python3 tools/test_audit_learner_copy.py` → OK. No gates or tests were edited by the reviewer.
