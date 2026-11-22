# PATH-VIEW-001 — Today tab becomes the unit-node path (phase 1)

Design authority: state/notes/PROGRESS-PATH-DESIGN-001.md (owner-approved 2026-11-22;
merged with Today, locked-ahead visible-dim, friendly section names + CEFR subtitle).
Board card t_c6917020 (blocked: two 80/80 iteration-cap deaths).

## Shipped on main (controller takeover commit, 2026-11-22)

Engine (apps/desktop/src-tauri/src/lib.rs):
- `unit_path_at` / `unit_path` IPC (shared command table → serve mode gets it too): one node
  per content-scheduling unit in the pack's own numbered curriculum order. Node state derives
  ONLY from existing machinery: SESSION-SEQUENCE-001 gating predicates -> locked (with
  `unlock_hint` in the pack's own words), evidence mastery at the `introduced` floor -> done
  (NEVER attendance — pinned by the red test `unit_path_done_never_reads_attendance_only`),
  today's plan -> current pin, scheduler_state due rows keyed by CONTENT id (attempt-2 product
  fix) -> review_due + due_count.
Frontend:
- `PathView` + `UnitPathNode` + `pathSections`/`pathNodeState` in apps/desktop/src/home.tsx;
  Today renders it when `pathNodes` is non-empty. Sections collapse to friendly headers
  (done-count) except the pinned band; nodes >=44px; markers • ○ ◉ ✓ ⟳.
- App.tsx loads `unit_path` on every home refresh; journeys/harness.tsx mirrors it for the
  fake world; styles in packages/ui/src/styles.css; vitest contract tests in
  apps/desktop/src/path-view.test.tsx (5 green); capture harness scripts/path-view-capture.mjs.

Gate battery: state/evidence/PATH-VIEW-001/gates.log (controller re-ran everything; the dead
runs' own gate unit never executed — systemd 203/EXEC).

## REMAINING RECIPE (acceptance close)

1. Build the serve binary FROM CURRENT MAIN (the old scratch binary predates the due-map fix).
   Serve-mode capture rules in skill lts-concurrent-lane-commits (SERVE_DIST is the dist DIR;
   serve's own install_pack; Page.enable after attach).
2. Run `SERVE_BIN=... SERVE_DIST=... node scripts/path-view-capture.mjs` — mobile 390px shots
   for the fresh owner profile into state/evidence/PATH-VIEW-001/: on-ramp done/current nodes,
   next unit ready, higher bands visible-dim with unlock hints, scroll-up history shot.
   Vision-check 2 representative shots.
3. Flip task-state PATH-VIEW-001 -> done (evidence paths already exist), then close board card
   t_c6917020 administratively (`hermes kanban unblock` + `complete --result "code <sha>, gates
   state/evidence/PATH-VIEW-001/gates.log, screenshots <shas>"`) — interactive/planner session.
4. Stray c1.png/c4.png at repo root are Nov-21 junk from another lane — do NOT commit.

## Hotspot

home.tsx and lib.rs are collision hotspots (PATH-VIEW + ENCOUNTER + PATH-WHATSNEXT all touch
them). PATH-WHATSNEXT-001 builds ON these node components — do not fork node states.
