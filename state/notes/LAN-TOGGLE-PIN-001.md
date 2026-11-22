# LAN-TOGGLE-PIN-001 — worker notes

## Gate-run status — CLEARED (attempt 3, 2026-11-21 ~23:25)
- All five battery logs (unit `lts-lan-gates1`) are fresh and green
  (`*-EXIT:0`); summary in `state/evidence/LAN-TOGGLE-PIN-001/gates.log`.
- Smoke + ledger + commits handled by attempt 3; see gates.log.
- The old `test-serve.log` from attempt 1 was STALE (compile errors it
  shows are already fixed in the tree: `shown.clone` graft is present).

## What is on disk (uncommitted lane WIP, all LAN-TOGGLE-PIN-001)
- `apps/desktop/src-tauri/src/serve.rs` — full backend: `parse_bind_with_lan`
  (bind stays localhost unless toggle on; LAN addrs = non-loopback private +
  100.64/10 tailnet via `lan_iface_addrs`), `LanState` (6-digit PIN,
  PIN_TTL 300 s, single-use, per-peer PAIR_ATTEMPT_LIMIT 10, SESSION_TTL 30 d),
  persistence to `<data>/serve-access.json` (toggle + sessions survive
  restart), `Peer` ConnectInfo extractor, `data_route_allowed` gate
  (loopback always OK; LAN peer needs session cookie), `/lan/status`,
  `/lan/enable`, `/lan/rotate`, `/pair`, runtime LAN listeners via
  `sync_lan_listeners` + `LAN_ROUTER`/`LAN_PORT` OnceLocks.
  Unit tests: bind policy, PIN issue/validate/expiry, attempt limit,
  restart persistence, router-level unpaired-401/paired-200 tests.
- `apps/desktop/src/settings.tsx` — `LanAccessCard` (serve-mode only via
  `inLtsServeMode()`), toggle + PIN display/rotate + pair box + honest
  unencrypted-traffic notice. `settings.test.tsx` +43 lines of tests.
- `scripts/smoke-lan-pair.sh` — second-device smoke: isolated LTS_DATA_DIR,
  enable via loopback, real LAN socket, unpaired 401, pair w/ cookie jar,
  paired 200, single-use PIN 403, restart persistence, toggle-off closes
  listener.
- `Cargo.toml`/`Cargo.lock` — dep add for the cookie/rand used above.

## NOT this lane (do not stage): sibling WIP in the same tree
lib.rs, App.tsx, lesson.*, harness.tsx, no-speech-model.journey.tsx,
crates/langpack/*, languages/ru-RU/*, schemas/, scripts/new-pack.py,
scripts/ortho-capture.mjs, practice-gate-capture.mjs, tools/audit_learner_copy.py,
state/notes/PRACTICE-GATE-001.md, state/evidence/ORTHO-LETTER-UNITS-001/,
c1.png, c4.png, lib.rs.orig. Stage ONLY the file list in the section above.

## Resume recipe (numbered)
1. `git status --short`; confirm the lane files above are still uncommitted.
2. Read `state/evidence/LAN-TOGGLE-PIN-001/*.log`; all five must end with
   EXIT:0. If any gate is red: fix IN-TREE (my files only) and re-run just
   that gate (`systemd-run --user --unit=lts-lan-gates2 …` if long).
3. Smoke: run `scripts/smoke-lan-pair.sh` (fresh unit if >60 s), tee output
   to `state/evidence/LAN-TOGGLE-PIN-001/smoke.log`. It needs a private or
   tailnet iface — GamingPC has enp5s0 192.168.x + tailscale0, fine.
4. Ledger (validate_handoff-safe):
   a. ROADMAP.yaml: add card LAN-TOGGLE-PIN-001 (surgical patch; mirror an
      existing card shape; acceptance bullets plain scalars; read_first =
      FILE paths only: apps/desktop/src-tauri/src/serve.rs,
      docs/22_REMOTE_ACCESS.md, scripts/smoke-lan-pair.sh).
      `required_for_desktop_1_0: false` → ALSO add id to
      execution_scope.optional_tasks in task-state.
   b. task-state.json: entry status done, `updated` = today's DATE,
      evidence = existing file paths (write
      state/evidence/LAN-TOGGLE-PIN-001/gates.log FIRST — controller-style
      summary of gate results + smoke + unit name), never prose.
   c. Exactly one in_progress and it must equal active_task
      (SESSION-SEQUENCE-001 keeps the slot — do not steal it).
5. Commit code only: `git add` the lane file list, `git commit -F <msgfile>`
   (write msg to scratch first; NO heredoc inside bash -lc).
   `feat(serve): LAN access toggle + pairing PIN with session cookies (LAN-TOGGLE-PIN-001)`
6. Commit ledger + evidence as separate commit
   `ledger(LAN-TOGGLE-PIN-001): ...`.
7. `python3 tools/validate_handoff.py --require-explicit-ledger-records`
   must exit 0 before you complete the card.
8. kanban_complete with summary + shas + gate log paths in metadata.

## Contract source
state/notes/REMOTE-ACCESS-SURVEY-2026-11.md (owner decision 2026-11-21).
docs/22_REMOTE_ACCESS.md already frames serve+tailnet; the LAN toggle is
the zero-install fallback with the unencrypted-traffic honest label.
