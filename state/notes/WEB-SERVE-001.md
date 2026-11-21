# WEB-SERVE-001 — HTTP server mode (browser/phone access, tailnet-only)

Pull-forward slice of ROADMAP `WEB-001` (M11). Makes the existing desktop
app usable from a browser on a trusted network by adding a serve mode that
reuses the desktop's exact command wiring — no command logic is duplicated.

## Design (as shipped)

- **Shared command wiring** (`apps/desktop/src-tauri/src/lib.rs`): the
  desktop `run()` installs its commands through `wire_commands(builder)`;
  serve mode installs the same list through `wire_serve_commands(builder)`
  (feature `serve`) plus the generated mirror table
  `SERVE_COMMAND_NAMES`. The five commands whose wrappers take a concrete
  `tauri::AppHandle` (install_pack, install_catalog_pack, import_pack,
  install_model, smoke_ack) cannot instantiate on Tauri's mock runtime;
  `serve.rs` routes the four install/model ones to the SAME underlying
  `*_report`/`*_at` core functions with a no-op progress reporter (results
  identical, no progress events — the capabilities endpoint says so), and
  refuses `smoke_ack` (harness-only).
  When adding a command: if it doesn't take `AppHandle`, add it to
  `wire_serve_commands` AND `SERVE_COMMAND_NAMES` —
  `serve::tests::every_serve_command_name_resolves_through_the_wiring`
  walks the table and fails otherwise.
- **IPC bridge** (`src/serve.rs`): one owner thread owns a
  `tauri::test::mock_builder()` app built with the serve wiring; every
  `POST /api/<cmd>` runs the production IPC handler via
  `tauri::test::get_ipc_response` against one mock webview. That reuses
  the real argument (de)serialization, camelCase conversion, async
  command dispatch and error rejection — the HTTP path and the webview
  path are the same code.
  **Tauri-API pitfall (measured on 2.12.1):** the webview's ACL check
  fires unless the invoke URL presents as LOCAL
  (`tauri::is_local_url`). The bridge therefore uses the exact origin pair
  tauri's own IPC doctest uses: `tauri://localhost` on desktop
  Linux/macOS, `http://tauri.localhost` on Windows/Android. Any other
  URL (e.g. plain `http://tauri.localhost` on Linux) reads as a REMOTE
  origin and every command is rejected with `not allowed. Plugin not
  found`. No capability/allow-list surgery is needed once the origin is
  local: unregistered commands are rejected by the invoke handler itself.
- **Frontend adapter** (`apps/desktop/src/ipc.ts`, single module):
  `lts-serve` injects `window.__LTS_SERVE = true` into the served
  `index.html`; `detectInvoke()` in App.tsx routes invokes through
  `fetch('/api/<cmd>')` only when that marker is present and Tauri is
  absent. Vitest DOMs and plain static hosting keep the null-bridge
  behavior. Rejections rebuild the desktop rejection message verbatim.
- **Statics + media**: the built `apps/desktop/dist` is served (SPA
  fallback for extension-less routes); `/media/packs/<id>/<version>/…`
  serves baked clips/images from the data dir (audio extensions only,
  traversal-blocked). Baked clips also already ride base64 through the
  IPC bridge (`story_audio` etc.), so audio works without the media
  route; the route exists for plain `<audio src>` use. Browser autoplay
  policy: sound only after a user gesture — the app's tap-to-hear
  posture already complies.
- **Honesty (scope 4)**: `GET /api/capabilities` reports mode, no
  install-progress streaming, mic-availability rule, privacy-mode
  posture. App.tsx renders that report verbatim in a `role=status`
  notice in serve mode; nothing in serve mode rewrites stored mic or
  privacy settings. Over a plain-HTTP tailnet URL the browser blocks
  `getUserMedia` (non-secure context), so mic-dependent features are
  labeled unavailable there rather than silently degraded.

## Runbook

Build (once per change):

    cd apps/desktop && pnpm install && pnpm build        # frontend dist
    cargo build -p lts-desktop --features serve --bin lts-serve

Launch on GamingPC (data dir = same `$LTS_DATA_DIR` the desktop uses):

    apps/desktop/src-tauri/target/debug/lts-serve 100.77.9.119:17625
    # or: LTS_SERVE_BIND=100.77.9.119:17625 lts-serve
    # dist override: LTS_SERVE_DIST=/path/to/apps/desktop/dist

Phone/browser URL shape (tailnet, trusted network only):

    http://100.77.9.119:17625/          # GamingPC's Tailscale address

Default bind is `127.0.0.1:17625` (loopback). `parse_bind` REFUSES
`0.0.0.0`, unspecified, and any non-loopback/non-RFC1918/non-CGNAT
address at startup — the server cannot be started publicly exposed by
accident. Allowed: loopback, RFC1918 (10/192.168/172.16), and the
Tailscale CGNAT range 100.64.0.0/10.

## Network posture / SEC note (scope 5)

There is NO auth: the server assumes a trusted tailnet/LAN, and that
assumption is what this card ships. A real WEB-001 security sign-off
(SEC review of binding, origin policy, and any future non-tailnet
exposure) stays an explicit later WEB-001 concern and was NOT performed
here. Do not port-forward 17625 beyond the tailnet.

## Verification (this card, 2026-11-21)

- Red-first tests: `src/ipc.test.ts` (adapter, 5 tests) and
  `src/serve.rs` tests (bind policy, traversal, capabilities endpoint,
  IPC round-trip, rejection mapping, unknown command, name-table walk,
  AppHandle direct routes, media guard).
- LANE gates (graft worktree at HEAD+lane, shared CARGO_TARGET_DIR):
  `cargo fmt --all --check` 0; `cargo test -p lts-desktop --features
  serve --lib` — failure SET identical to a no-serve HEAD baseline
  except zero serve-lane failures (38 pre-existing failures are the
  gitignored pack `.wav` assets absent in a scratch worktree; they pass
  in the main tree / CI restore); `cargo clippy -p lts-desktop
  --all-targets -- -D warnings` 0, and the same with `--features serve`
  0. Frontend: `tsc --noEmit` 0, full desktop vitest green, prettier
  clean. Logs: `state/evidence/WEB-SERVE-001/`.
- Headless playtest at request level from a fresh `LTS_DATA_DIR`:
  onboarding → profile create → resume → complete_onboarding → pack
  list over `/api/*` against the real `lts-serve` binary. Log:
  `state/evidence/WEB-SERVE-001/smoke.log`.

## History

Board runs 105 (died 80/80 with the lane complete-but-uncommitted; graft
worktree `lts-serve-work` preserved the lib.rs refactor) and 106
(controller takeover: fixed the mock-runtime origin-URL bug, removed a
pub(crate) allow-list hack, added the name-table walk test, shipped).

## Not in this slice (stay WEB-001)

Owner phone dogfooding comes after MOBILE-UX-001; SEC sign-off; any
non-tailnet exposure; install-progress event streaming to browsers.
