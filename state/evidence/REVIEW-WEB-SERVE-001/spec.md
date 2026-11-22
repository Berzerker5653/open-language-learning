# REVIEW-WEB-SERVE-001 — Axis (a) SPEC verdict

Artifact: code 4ba842c + ledger c7a1ee2. Contract: board parent t_59e5fefd body +
state/notes/WEB-SERVE-001.md. Reviewer read the FULL diff (1676 lines) and
cross-checked every bullet against the tree at 4ba842c and against current HEAD.

VERDICT: CHANGES-REQUESTED

## Bullet-by-bullet (verified)

- Opt-in `serve` feature + `lts-serve` binary: PASS. `apps/desktop/src-tauri/Cargo.toml`
  `serve = ["dep:axum","dep:tokio","tauri/test"]`, `[[bin]] lts-serve`
  `required-features=["serve"]` — the HTTP stack never compiles into the desktop shell.
- fetch('/api/<cmd>') bridged to the SAME command wiring: PARTIAL — see D2. Every
  registered name resolves through the production IPC handler
  (`tauri::test::get_ipc_response`, serve.rs:96-152), verified by the name-table walk
  test, but the wiring itself is a hand-duplicated list, not the shared one.
- AppHandle-coupled commands routed to the same cores: PASS. Verified wrapper-by-wrapper
  at 4ba842c: `install_pack` (lib.rs:449) and serve route both call
  `install_bundled_pack_report`; `install_catalog_pack` (lib.rs:522) vs
  `install_catalog_pack_served` (serve.rs:229) both drive
  `packs::install_from_catalog_report` with the identical cancel-registry insert/remove
  lifecycle; `import_pack` (lib.rs:549) → `packs::import_pack_b64_report`;
  `install_model` (lib.rs:10165) → `install_model_at`.
- `smoke_ack` refused: PASS (serve.rs:219, plus unknown-command rejection is the real
  Tauri handler, proven in smoke.log).
- `/api/capabilities` + rendered notice: PASS with nit D4. Endpoint exists
  (serve.rs capabilities()), App.tsx renders a `role=status` notice (accessibility
  semantics land with the component).
- Binds ONLY loopback/RFC1918/tailnet; public refused: PASS. `parse_bind` (serve.rs:53)
  accepts loopback, `is_private()` (10/172.16/192.168), CGNAT 100.64.0.0/10, refuses
  `0.0.0.0` and public; tests + smoke prove refusal of 141.101.1.1.
- Media traversal blocked raw + percent-encoded: PASS. `safe_relpath` (serve.rs:336)
  rejects any non-Normal component; smoke re-probed raw and `%2e%2e%2f` with
  `--path-as-is` → both 404 (and the gates.log honestly corrects run-106's client-side
  curl collapse).
- Stored mic/privacy settings never rewritten: PASS. Nothing in serve startup touches
  `set_*` state; the capabilities report is descriptive only.
- Single frontend adapter gated by `__LTS_SERVE`: PASS. `src/ipc.ts` is the only
  bridge module; `detectInvoke()` checks Tauri first, then the marker; vitest/static
  hosts keep the null bridge (ipc.test.ts proves marker-keyed behavior).

At 4ba842c the lists were exactly consistent: wire_commands 96, wire_serve_commands 91,
SERVE_COMMAND_NAMES 91, delta == the five documented AppHandle commands (measured, not
taken on faith).

## Findings

- **D1 (defect, medium) — direct AppHandle route blocks the async executor.**
  `api_dispatch` (serve.rs:250) calls `app_handle_command` (serve.rs:160) synchronously
  inside the async handler (serve.rs:262); a real `install_pack`/`install_catalog_pack`
  runs for minutes on a tokio worker thread. The desktop wrappers deliberately use
  `spawn_blocking` (lib.rs:449 comment: sync heavy commands "freeze the webview AND
  block engine-progress delivery") and `api_dispatch` even says "heavy installs run on
  blocking pools" — but only the non-direct path takes that hop. A browser-initiated
  install can starve the serve runtime (worker-thread exhaustion on small hosts) in
  exactly the way the lane's own comments forbid. FIX: wrap the direct route in
  `tokio::task::spawn_blocking` like the bridge path.
- **D2 (defect, medium) — "same wiring" is triplicated and the drift guard only covers
  one direction; drift already happened.** The 91-command registration exists three
  times (`wire_commands`, `wire_serve_commands`, `SERVE_COMMAND_NAMES`). The walk test
  (`every_serve_command_name_resolves_through_the_wiring`) guards table→serve-wiring
  only: a command added to `wire_commands` but forgotten in serve mode fails no test.
  At HEAD this is no longer hypothetical: `ime_candidates` (lib.rs:10462, landed 98839e2)
  is desktop-only. The omission was decided on the board ("belongs to wire_commands
  only", RUN 106 handoff), but the repo carries no explicit exclusion record, so
  intentional drift and accidental drift are indistinguishable — and a browser learner
  with the kana keyboard gets a raw 422 "Command ime_candidates not found" for the
  in-app candidate lookup. FIX: one source of truth (macro or const name-list feeding
  both `generate_handler!` sites) or a parity test asserting
  `wire_commands names − serve names == an explicit annotated exclusion list`.
- **D3 (minor) — lockfile churn beyond the lane.** 4ba842c's Cargo.lock also bumps
  transitive `syn 2.0.119→3.0.6` and six `windows-sys 0.52/0.59→0.61.2` rows unrelated
  to axum/tokio. Re-resolution is cargo's doing, but it changes the desktop build graph
  under a serve-mode card. Not a revert request — flag for `cargo audit`/CI attention at
  push (see ledger.md note: the lane is 4 commits unpushed, CI has not seen it).
- **D4 (nit) — notice not fully server-driven.** state/notes claims App.tsx "renders
  that report verbatim"; the install-progress sentence is hardcoded in App.tsx:1170
  while `caps.install_progress_note` (fetched, typed in ipc.ts:55) is never used. Either
  render the server string or fix the notes wording.
- **D5 (nit) — notes vs code.** notes say the media route is "audio extensions only";
  serve.rs also allows png/jpg/jpeg/svg. Harmless (packs ship images), but make the
  prose match.

Out-of-scope ADDITIONS: none beyond D3's lockfile rows — the diff sticks to the
card's five scopes; no gate or test-weakening edits anywhere (gate integrity clean).
