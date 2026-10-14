# Contributing

Start with `README.md` and the relevant design document. For code changes, follow `AGENTS.md`. For language content, follow `docs/04_LANGUAGE_PACK_SPEC.md`, `docs/10_LICENSING_AND_PROVENANCE.md`, and `docs/16_CONTENT_AUTHORING_AND_REVIEW.md`.

If you are fixing one thing in a language pack, start with the bounded five-item packet at `docs/20_CONTRIBUTOR_REVIEW_PACKET.md`: the exact check to run, how to read its findings, what you may change directly, and what counts as evidence.

## Development commands (Linux reference environment)

Prerequisites: Node.js >= 26, pnpm 12.8.1 (`packageManager` field; e.g. `npm i -g pnpm@12.8.1`),
Rust 1.97.1 via rustup (`rust-toolchain.toml` selects it), Python 3.10+.

```sh
pnpm install            # JS/TS workspace
cargo build             # Rust workspace
cargo test              # Rust unit tests
pnpm test               # TS unit tests (vitest)
pnpm typecheck          # tsc across packages
pnpm lint               # eslint (flat config, typescript-eslint)
pnpm fmt:check          # prettier check (pnpm fmt to fix)
./scripts/ci.sh         # full local CI mirror (rust fmt/clippy/test, web checks, schema checks)
```

Pack audio is generated, never committed (ADR-0016), so a fresh clone has
`media/manifest.jsonl` without the `.wav` bytes, and the engine refuses to build
an audio-less archive (ADR-0024). Restore the published archives before anything
that installs a reference pack (`cargo test --workspace`, `./scripts/smoke-desktop.sh`,
`langpack test`):

```sh
./scripts/fetch-pack-audio.sh --pack-dir languages/ja-JP
./scripts/fetch-pack-audio.sh --pack-dir languages/ru-RU
./scripts/fetch-pack-audio.sh --pack-dir languages/ja-JP --verify-only  # offline manifest audit only
```

Each run verifies the archive against the `sha256`/`size_bytes` pins in
`catalog/packs.json` and then verifies every restored file against its manifest
row. Use `--work-dir tmp/pack-audio` to keep the download for reuse.

CI (`.github/workflows/ci.yml`) enforces the same gates plus a `desktop-smoke` job (launches the
built app under Xvfb) and a `security` job (gitleaks secret scan, `pnpm audit --audit-level=high`,
`cargo audit`). Test fixture conventions: `tests/README.md`. ADR conventions: `docs/adr/README.md`.
On the Linux reference machine without system `webkit2gtk-4.1`, run
`scripts/setup-tauri-sysroot.sh` once and `source scripts/tauri-env.sh` before native builds.

Do not submit copyrighted textbook/course content without compatible rights. Do not include private learner recordings. Language corrections should include source/review evidence when possible.

Major architecture changes require an ADR. Public language-pack schema changes require versioning/migration consideration.

The `langpack` CLI is in the tree: `cargo run -q -p lts-langpack-cli -- {validate, lint, test, audit-curriculum, audit-lexicon, audit-licenses, build, inspect, install, catalog, rollback}`. Run at least `validate`, `lint` and `test` on any pack change before opening a PR. Report draft unresolved references explicitly and keep them out of build/promotion eligibility. Reviewer/participant contact, private audio distribution, and final license decisions require owner authorization.

## Reviewing language-pack content

All language content is AI-generated and unreviewed: 5,132 ja-JP rows sit at `draft`, 153 at `review-needed`, 5,073 ru-RU rows at `draft`, and nothing is at `validated` or `verified`. Closing that gap needs human reviewers; one honest pass over a handful of items is a real contribution.

A review in 15 minutes:

1. Open `languages/ja-JP/review/REVIEWER_KIT.md` and `languages/ja-JP/review/WORKLIST-2026-10-12.md` (the same pair lives in `languages/ru-RU/review/`).
2. Check each item against the kit's severity scale. If something is wrong, record `changes-requested` or `rejected` with notes instead of flipping the status.
3. For each approved item, change exactly two things in one PR: the item's `status` field (`draft` → `validated`) in the file that holds it — a YAML document for curriculum files under `curriculum/units/`, one JSONL row for shard files such as `lexicon/entries.jsonl` — and one line appended to `languages/ja-JP/reviews.jsonl` at the pack root, which you create if it is still absent (no review has been recorded in this pack yet). Each record is validated against `schemas/v0.2/review-record.schema.json` and the shape `languages/ja-JP/review/REVIEW_POLICY.yaml` describes; in the file it is one line, shown expanded here:

```json
{
  "id": "rev-2026-10-05-ana-1",
  "target_id": "ja.lex.food-drink.sushi",
  "reviewer": "yuki-p",
  "reviewer_category": "community-reviewer",
  "scope": "gloss, form, register",
  "date": "2026-10-05",
  "outcome": "approved",
  "notes": "natural as written"
}
```

`community-reviewer` — any honest, engaged volunteer, credited under the pseudonym you choose — can promote items to `validated`. `verified` stays out of reach unless you genuinely meet the `qualified-human-expert` or `qualified-human-native-speaker` definitions in the pack's `review/REVIEW_POLICY.yaml`. The gate is machine-enforced: `crates/langpack/src/pack.rs` refuses any `validated`/`verified` status flip without a qualifying approved record in `reviews.jsonl` (`review_promotion_unsupported`), so a PR that flips status without one fails CI and cannot merge.

Content problems you cannot fix yourself land in `.github/ISSUE_TEMPLATE/content-review.yml`; app-behaviour problems in `.github/ISSUE_TEMPLATE/platform-runtime-report.yml`.
