# CODING-STANDARDS-001 — reviewer-enforceable coding standard file

Docs-only card, run 2026-11-20 (board worker t_87eb71b3).

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

## Exact AGENTS.md hunk (if the worker's edit was blocked)

```markdown
## Coding standard

Before reviewing or committing any diff, work the checklist in [CODING_STANDARDS.md](CODING_STANDARDS.md): machine-enforced gates are named, not re-explained; the reviewer's job is the judgement-call list.
```

## Resume recipe

1. Do NOT re-derive CODING_STANDARDS.md if it is already at main
   (`git log --oneline -1 -- CODING_STANDARDS.md`).
2. Apply the hunk above to AGENTS.md with owner present, commit as
   `docs(agents): link CODING_STANDARDS.md under Coding standard (CODING-STANDARDS-001)`.
3. Flip task-state CODING-STANDARDS-001 to done (keep evidence paths), move
   the KANBAN.md row to a done row, ledger commit, then board-complete.
