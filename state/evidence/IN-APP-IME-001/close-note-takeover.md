# IN-APP-IME-001 — takeover close-note (board card t_4970113d, 2026-11-21)

The parent board card (t_251302d9) died twice at the 80/80 iteration budget
with the phase-2 **Rust half finished but uncommitted** in the working tree.
This takeover verified and committed that tree; no scope was re-derived and
the parent was not touched.

## What was verified at handoff

- `git status --short` showed exactly the lane's Rust half dirty:
  `apps/desktop/src-tauri/src/lib.rs` (+230) and
  `apps/desktop/src-tauri/src/packs.rs` (+137). Untracked `c1.png`/`c4.png`
  at repo root are owner dogfood junk — left untracked, never committed.
- `git diff` line-by-line == frozen contract scope (parent card body
  scopes 1-3): `ime_candidates` command in the `wire_commands` table (NOT
  `SERVE_COMMAND_NAMES`), `ImeCandidateView` provenance fields,
  `LexEntry.alt_forms`, `ime_candidates_at` core + two tests, manifest
  `capabilities.input_methods` bool-safe loader + tri-state declared flag.
  No foreign hunks.
- TS half confirmed already on main at `257ab85` (its
  `invoke('ime_candidates', { kana, profileId })` matches this commit's
  Rust signature); `crates/langpack/tests/input_methods.rs` + manifest
  schema ride that same commit.

## Gate battery (LANE tier, full outputs in takeover-gates.log)

Run as systemd unit `lts-ime-takeover-gates1` at HEAD `c7a1ee2` with the
dirty tree, 18:04-18:09 MST:

| gate | result |
|---|---|
| cargo fmt --all --check | exit 0 |
| cargo test -p lts-desktop --lib | exit 0 — 213 passed / 0 failed / 2 ignored, incl. `ime_candidates_come_from_the_pack_lexicon_with_provenance` and `ime_candidates_aux_fallback_stays_labeled_and_secondary` |
| cargo clippy -p lts-desktop --all-targets -- -D warnings | exit 0 |
| cargo test -p lts-langpack | exit 0 (all suites, incl. input_methods.rs) |
| lts-langpack-cli validate + lint ja-JP | exit 0 / exit 0 |
| lts-langpack-cli validate + lint ru-RU | exit 0 / exit 0 |
| pnpm -r typecheck (tsc --noEmit per package) | exit 0 |
| pnpm -r test (vitest run per package) | exit 0 — apps/desktop 456/456 |

Zero `FAILED` lines across the whole battery.

## Commits

- Code: `98839e2` — `fix(ime): commit phase-2 Rust half — pack-declared
  input methods + lexicon-backed ime_candidates (IN-APP-IME-001)`
  (lib.rs + packs.rs only).
- This note + `takeover-gates.log`: the following `ledger(IN-APP-IME-001)`
  commit.

Task-state stays `done` (recorded at `b7586e6`); no second record opened.
Phase 3 (WebKitInputMethodContext/Orca real-AT integration) remains open
in the ledger as before — out of scope here.
