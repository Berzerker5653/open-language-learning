# ARCH-HOTSPOT-2026-11-22 — lib.rs command-table single-sourcing

## Step 1 — 14-day churn (measured, `git log --name-only --since='14 days'`)

Top code-file rows (ledger/pack rows excluded from the hotspot choice):

```
32  apps/desktop/src-tauri/src/lib.rs
23  apps/desktop/src/App.tsx
11  packages/ui/src/styles.css
11  apps/desktop/src/journeys/harness.tsx
 8  apps/desktop/src/reading.tsx
 8  apps/desktop/src/reading.test.tsx
 8  apps/desktop/src/home.tsx
 6  apps/desktop/src-tauri/src/serve.rs
```

(lib.rs sits 4th raw behind the three ledger files `state/task-state.json` 101,
`tasks/ROADMAP.yaml` 43, `tasks/KANBAN.md` 43 — ledgers are bookkeeping, not
entanglement. lib.rs is the hottest *code* file and confirms the suspicion
flagged in `state/notes/WEB-SERVE-001.md`.)

## Chosen hotspot — the command table existed THREE times in lib.rs

At base `f03e33b`:

- `wire_commands` (lib.rs:10841) — `tauri::generate_handler![…]` with **98** command names.
- `wire_serve_commands` (lib.rs:10947, `cfg(feature = "serve")`) — a second
  `generate_handler![…]` with **92** names, hand-maintained as a near-copy.
- `SERVE_COMMAND_NAMES` (lib.rs:11054) — a third copy of the same 92 as
  **strings**.

Measured set diff: the two wiring lists differed by exactly 6 names — the five
AppHandle-coupled commands (`smoke_ack`, `install_pack`, `install_model`,
`install_catalog_pack`, `import_pack`) plus **`ime_candidates`**, which is NOT
AppHandle-coupled (`async fn ime_candidates(kana: String, profile_id: String)`,
lib.rs:8441). Every non-AppHandle command had to be written in 3 places; the
documented rule (lib.rs:10838-10840: "does it take AppHandle? If not, add it to
`wire_serve_commands` too") had already been broken once by the IN-APP-IME-001
lane — proof the manual-sync design fails under lane churn, which is exactly
what makes lib.rs the collision hotspot (every desktop lane grafts hunks into
the same three lists).

### Live defect found: `ime_candidates` is dead in serve mode

`apps/desktop/src/App.tsx:2125` invokes `ime_candidates` through the shared
`inv()` adapter with no serve-mode gate, so in serve mode the in-app IME
conversion hits the unknown-command rejection. `tasks/KANBAN.md` web-serve row
carried a parenthetical ("ime_candidates belongs to wire_commands, NOT the
serve table") from the 2026-11-21 graft — that contradicts the rule in the
lib.rs doc comment and left the shipped gap in place. Decision this lane:
the RULE wins (single-source makes the exclusion structural only for the five
AppHandle commands); `ime_candidates` now reaches serve wiring + the name
table by construction. No new exposure class: it reads the active pack's
lexicon the same way 92 already-exposed commands read profile data.

## Fix (shipped, small diff)

Net **−146 lines**, one file. Three hand-synced lists → one list inside a
single-source macro triple:

```rust
macro_rules! lts_command_table {
    ($emit:ident; $($desktop_only:ident),* $(,)?) => {
        $emit!(
            $($desktop_only,)*
            app_mode,
            …93 shared names, written exactly once…
        )
    };
}
```

`emit_generate_handler` feeds `tauri::generate_handler!` for both
`wire_commands` (5 desktop-only args) and `wire_serve_commands`;
`emit_serve_command_names` generates `SERVE_COMMAND_NAMES` from the same list
(`stringify!`), so a new shared command lands in every table at once and
`serve::tests::every_serve_command_name_resolves_through_the_wiring` walks the
generated names. Doc comment rewritten with the new maintenance rule.

## Deliberately NOT done (too big for this lane — planner promotes)

lib.rs is now **21,243 lines**; the ARCH-HOTSPOT-2026-11-20 scan (state/notes/
ARCH-HOTSPOT-2026-11-20.md) already proposed the monolith split into domain
submodules (`reader.rs` first, then audio/clip commands, error ledger) as a
multi-card effort. This lane only removes the command-table triplication, the
highest-churn graft zone inside that file. hotspot: `apps/desktop/src-tauri/src/lib.rs`
— still the repo's #1 merge-collision generator by line count; the split proposal
stands and gets hotter with every lane.

## Gates

See `gates.log` in this directory (fmt, clippy default + `--features serve`,
serve-build lib suite incl. the table-walk test). Suite: **240 passed / 1
failed** — the sole failure
(`tests::placement_coverage_names_why_a_rubric_has_no_question`) reproduces
byte-identically on pure HEAD `f03e33b` in a clean worktree: pre-existing main
rot from today's content campaigns, not this lane. Flagged to the planner for
a FIX card.
