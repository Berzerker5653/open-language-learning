# CODING-STANDARDS-001 — reviewer-enforceable coding standard file

Docs-only card, run 2026-11-20 (board worker t_87eb71b3).

## Status 2026-11-20 (worker run t_87eb71b3): shipped except one protected-file hunk

- `CODING_STANDARDS.md` authored at repo root at commit `722b7bc`: 62 lines
  (<=80), 26 checklist items; machine-gate section names only real jobs /
  commands (grounding in `state/evidence/CODING-STANDARDS-001/gates.log`),
  judgement-call section cites AGENTS.md / docs/09 / CONTRIBUTING.md /
  docs/adr conventions.
- Card + roadmap opened at `b34028d` (ROADMAP entry, optional_tasks list,
  task-state record `in_progress`, this notes file).
- The AGENTS.md edit was attempted and hard-blocked by the protected-file
  guard ("approval prompt timed out without a user response") in this
  headless kanban worker — same as GLOSSARY-001. Not retried via any other
  path. That hunk is the remaining step; the card stays blocked on it.

## Contract

- `CODING_STANDARDS.md` at repo root, **<= 80 lines**, checklist shape.
- Two sections only: machine-enforced rules are named by their gate, one line
  each (no rule duplication); judgement calls get a one-line "flag if …" rule.
- Consolidation sources: `AGENTS.md`, `CONTRIBUTING.md`,
  `docs/09_TESTING_AND_ACCEPTANCE.md`, the CI job names in
  `.github/workflows/ci.yml` (`rust-static`, `rust-test`, `rust-conformance`,
  `web`, `desktop-smoke`, `platform-compile`, `security`, `schemas`),
  `scripts/ci.sh` (langpack CLI battery), and `crates/domain/src/ids.rs`
  (pack/content id charset `^[a-z0-9]+(?:[._-][a-z0-9]+)*$`).
- Link from `AGENTS.md` under a `## Coding standard` heading, inserted
  immediately after the `## Domain language` section (before
  `## Scope and source trust`). AGENTS.md is a protected agent-instruction
  file — a headless worker cannot apply this hunk (approval prompt times out;
  the guard forbids rerouting). Same protected-file step as GLOSSARY-001:
  the hunk is preserved below; the owner-present chat session applies it.

## Exact AGENTS.md hunk (worker's edit was blocked; owner-present session applies)

```markdown
## Coding standard

Before reviewing or committing any diff, work the checklist in [CODING_STANDARDS.md](CODING_STANDARDS.md): machine-enforced gates are named there, not re-explained; the reviewer's job is the judgement-call list.
```

Insert immediately after the `## Domain language` section's paragraph, before
the `## Scope and source trust` heading.

## Resume recipe

1. Do NOT rewrite or re-derive CODING_STANDARDS.md — it is committed at main
   (`git log --oneline -1 -- CODING_STANDARDS.md` → `722b7bc`).
2. Apply the hunk above to AGENTS.md (owner approval, or owner applies it
   directly), commit as
   `docs(agents): link CODING_STANDARDS.md under Coding standard (CODING-STANDARDS-001)`.
3. Append the validate_handoff result to `state/evidence/CODING-STANDARDS-001/gates.log`:
   `.venv/bin/python tools/validate_handoff.py --require-explicit-ledger-records`
   (must PASS with the task-state `evidence` paths extended to gates.log).
4. Flip task-state CODING-STANDARDS-001 `in_progress` → `done`
   (`active_task` → null; evidence = notes + gates.log; status note in
   `notes` field), add a done row to `tasks/KANBAN.md`, flip the
   `tasks/KANBAN.md` board row if present, ledger commit, then
   `hermes kanban unblock t_87eb71b3` + complete (controller close path).
