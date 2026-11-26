# PNPM-AUDIT-MINIMATCH-001 — resolve the 1 moderate pnpm audit finding (minimatch)

Source: 2026-11-25 repo hygiene audit. `pnpm audit` reports 1 moderate vuln: minimatch >=7.0.0 <11.0.1 via eslint (dev-only transitive; 33 paths, all dev). CI audits at --audit-level=high so nothing fails today; this is hardening + dev-side hygiene.

Scope:
- Add a pnpm override for minimatch >=11.0.1 (dev-only transitive dep; confirm the override resolves through the nested paths).
- No change to the production dependency tree (the app bundles none of this — it is build/dev tooling only).

Acceptance:
- pnpm audit clean at --audit-level=high AND at moderate (0 findings).
- Lockfile re-synced cleanly; install + full desktop suite (tsc, vitest) green; evidence: state/evidence/PNPM-AUDIT-MINIMATCH-001/gates.log.

Not in scope: any other dependencies, production dependency pins, release dates.
