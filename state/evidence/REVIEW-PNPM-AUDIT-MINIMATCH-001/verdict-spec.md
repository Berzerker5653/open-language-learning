# PNPM-AUDIT-MINIMATCH-001 / REVIEW-PNPM-AUDIT-MINIMATCH-001 — SPEC verdict

Axis: (a) SPEC — does the diff do exactly what the card (state/notes/PNPM-AUDIT-MINIMATCH-001.md) asked?
Evidence reviewed: feat 5ea58f59 (pnpm-workspace.yaml, pnpm-lock.yaml), ledger f1599ea2, gates.log, task-state entry.

## Verdict: PASS — diff does exactly what the card asked; no out-of-scope additions or omissions.

### In-scope (verified)
- pnpm-workspace.yaml:13 adds `minimatch: ">=11.0.1"` to the existing `overrides:` block (adjacent to the existing happy-dom overrides). That is exactly the requested dev-side transitive pin. No package.json `pnpm.overrides` was added — correct, since modern pnpm ignores it (the feat commit message records this reasoning).
- pnpm-lock.yaml: `overrides:` gains `minimatch: '>=11.0.1'`; `minimatch@10.2.6` replaced by `minimatch@11.0.9` in both the packages and snapshots sections; three consumer snapshots (`@typescript-eslint/visitor-keys`-adjacent eslint contexts + typescript-eslint + minimatch's own predecessor chain) re-pointed at 11.0.9; new `@isaacs/nonrecursive-glob-match@1.1.0` added as minimatch 11's transitive dep. All minimatch consumers in the tree now resolve 11.0.9 (gates.log: `pnpm why minimatch` → `minimatch@11.0.9 (resolved via override >=11.0.1)`).
- Gates/acceptance met per gates.log: `pnpm audit --audit-level=moderate` and `--audit-level=high` both report "No known vulnerabilities found"; `pnpm -r typecheck` green across 6 workspaces; `pnpm -r test` green (apps/desktop 667/667, packages/shared 2/2, packages/ui 10/10); lockfile re-synced (git status clean).
- Scope discipline: no production dependencies changed; no app code; no other overrides added. `git show --stat 5ea58f59` = only the two files, +15/−7.

### Out-of-scope additions / omissions
- None. No omissions: the card asked for the override, lockfile re-sync, and green tsc+vitest+audit — all present and evidenced.

### Notes (non-blocking, informational)
- minimatch 11 engines: `node: 20 || >=22`; repo root engines: `node >=26` — compatible, no action needed.
- The override is a range `>=11.0.1` (as specified by the card), not an exact pin; gates.log shows resolution at 11.0.9 today. That is exactly what the card asked for.
