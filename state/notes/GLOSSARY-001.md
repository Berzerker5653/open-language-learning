# GLOSSARY-001 — LTS domain language file

## Status 2026-11-20 (worker run t_f5595847): shipped except one protected-file hunk

- `GLOSSARY.md` authored at repo root: 20 terms, one per line, 31 lines total,
  every definition ≤25 words, all wording grounded in existing docs/,
  tasks/KANBAN.md, tasks/ROADMAP.yaml and state/notes/ usage (verified — see
  `state/evidence/GLOSSARY-001/gates.log`).
- **frontier** deliberately NOT defined: the term appears nowhere in `docs/`,
  `tasks/` or `state/notes/` vocabulary (repo-wide grep hit only
  `aux/lexicon/ru.jsonl` data rows); it belongs to the agent model-routing
  policy outside this repo. Recorded as "Not defined here" in GLOSSARY.md.

## Remaining step — owner approval required (why the card is blocked)

The card requires linking GLOSSARY.md from AGENTS.md. `AGENTS.md` is a
**protected agent-instruction file**: the patch was hard-blocked
("approval prompt timed out without a user response") in this headless
kanban worker — no human could answer the approval. The guard forbids
retrying via terminal or any other path, and it was not retried.

Exact hunk to apply in `AGENTS.md`, inserted immediately before the
`## Scope and source trust` heading (then the card closes):

```markdown
## Domain language

Use the project's defined vocabulary in docs, task cards, notes and handoffs: see [GLOSSARY.md](GLOSSARY.md) for the domain terms (band, pack, card, lane, ledger, sidecar, bake, certified clean, owner gate, …) as they are actually used in this repo.
```

## Resume recipe

1. Do NOT rewrite or re-derive GLOSSARY.md — it is committed at main (search
   `git log --oneline -- GLOSSARY.md`).
2. Apply the hunk above to AGENTS.md (owner approval, or owner applies it
   directly), commit as `docs(agents): link GLOSSARY.md under Domain language (GLOSSARY-001)`.
3. Flip task-state GLOSSARY-001 `blocked` → `done` (remove `last_error`/`blocker`,
   keep evidence), move the KANBAN.md `owner` row to a done row, ledger commit.
