# Contributing

Start with `README.md` and the relevant design document. For code changes, follow `AGENTS.md`. For language content, follow `docs/04_LANGUAGE_PACK_SPEC.md`, `docs/10_LICENSING_AND_PROVENANCE.md`, and `docs/16_CONTENT_AUTHORING_AND_REVIEW.md`.

## Development commands (Linux reference environment)

Prerequisites: Node.js >= 26, pnpm 12.8.1 (`packageManager` field; e.g. `npm i -g pnpm@12.8.1`),
Rust 1.97.1 via rustup (`rust-toolchain.toml` selects it), Python 3.10+.

```sh
pnpm install            # JS/TS workspace
cargo build             # Rust workspace
cargo test              # Rust unit tests
pnpm test               # TS unit tests (vitest)
pnpm typecheck          # tsc across packages
pnpm fmt:check          # prettier check (pnpm fmt to fix)
./scripts/ci.sh         # full local CI mirror (rust fmt/clippy/test, web checks, schema checks)
```

CI runs the same gates on GitHub Actions (`.github/workflows/ci.yml`). The Tauri native shell
(BOOT-002) additionally needs system packages such as `webkit2gtk-4.1` on Linux.

Do not submit copyrighted textbook/course content without compatible rights. Do not include private learner recordings. Language corrections should include source/review evidence when possible.

Major architecture changes require an ADR. Public language-pack schema changes require versioning/migration consideration.

Validate this scaffold with the setup and commands in `README.md`. The future `langpack` CLI is a roadmap deliverable, not included in this archive. Report draft unresolved references explicitly and keep them out of build/promotion eligibility. Reviewer/participant contact, private audio distribution, and final license decisions require owner authorization.
