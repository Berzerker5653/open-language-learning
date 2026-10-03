# BOOT-003 — Quality, lint, CI, and ADR conventions

## Delivered

- **Lint**: ESLint 10 flat config (`eslint.config.js`) + typescript-eslint 8.71 (works with TS 7);
  `pnpm lint` / `pnpm lint:fix`; enforced in `scripts/ci.sh` and the web CI job. Rust lint =
  `cargo clippy --workspace --all-targets -- -D warnings` (already enforced).
- **Commands documented**: `CONTRIBUTING.md` lists fmt/lint/typecheck/test/ci for both toolchains.
- **Conventions documented**: `tests/README.md` (test layers, fixture determinism/provenance/
  naming/security rules) and `docs/adr/README.md` + `docs/adr/template.md` (numbering, status
  lifecycle, no silent edits).
- **Secret scanning**: gitleaks v8.30.1 job in CI (full history) — local baseline: no leaks.
- **Dependency audit baseline**: CI `security` job runs `pnpm audit --audit-level=high` (clean) and
  `cargo audit` (exit 0; 2 allowed warnings, incl. RUSTSEC-2024-0429 in `glib` — upstream gtk-rs
  advisory with no safe upgrade path yet; tracked here, not silenced by config).

## Acceptance mapping

1. Formatting/lint/type/test commands documented (CONTRIBUTING) and CI-enforced (all four in
   ci.sh + workflows).
2. Test fixture and ADR conventions documented (tests/README.md, docs/adr/).
3. Secret scanning and dependency audit baselines enabled (security job; local evidence green).

## Evidence

- `state/evidence/BOOT-003/security-baseline-2026-10-02.txt` (gitleaks clean, pnpm audit clean,
  cargo audit exit 0)
- `state/evidence/BOOT-003/ci-2026-10-02.txt` (full CI incl. lint, exit 0)

## Next

PERF-001 (hardware/perf test contract) — needs docs/05, 07, 17.
