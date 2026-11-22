# WEB-PROGRESS-001 — browser-mode pack installs stream real progress

## Contract (from the board card)

`capabilities()` used to report `install_progress_events: false`: in browser
(serve) mode a pack install — the flagship RU pack is 294 MB+ — showed the
learner nothing until the call landed. The desktop already streams every
stage (`progress::Progress` → `engine-progress` event). This card bridges the
SAME stage events to the browser and renders them with the existing progress
UI. No second progress vocabulary (K-62 rule: stages are phases the engine
actually enters; `percent` only when a real fraction exists).

## Design

- **Serve side** (`apps/desktop/src-tauri/src/serve.rs`):
  - `progress_tx()` — one process-wide `tokio::sync::broadcast` of
    `Progress` (cap 256; a stage is a few hundred bytes).
  - `serve_progress_reporter(&Progress)` — replaces the old `noop_progress`
    at all four AppHandle-coupled install routes (bundled, catalog, import,
    model) plus `install_catalog_pack_served`'s `|_| {}`. Same stages, same
    values, broadcast to every open subscriber; a send error only means
    nobody is listening — progress never becomes an install error.
  - `GET /api/progress/events` — SSE. Each connection spawns a pump task
    (broadcast → mpsc(64)) and streams `data:` frames carrying the exact
    `Progress` JSON the desktop event carries (same serde impl, so the
    renderer reads identical field names either way). Keep-alive comments
    every 15 s. A slow browser skips missed stages (`Lagged`) instead of a
    torn stream; a hung-up tab drops the mpsc receiver, the pump's send
    fails, and the task exits — no leak.
  - `capabilities()` now reports `install_progress_events: true` and names
    the endpoint. The frontend reads that report rather than assuming.
- **Frontend side**:
  - `src/ipc.ts` `subscribeServeProgress(onStage)` — the browser twin of the
    desktop `listen("engine-progress")`: opens an `EventSource` on
    `/api/progress/events`, parses frames, ignores malformed ones exactly
    like a failed desktop delivery, returns the close fn. Guarded when
    `EventSource` is absent (node/test DOMs).
  - `App.tsx` — the engine-progress effect gains a serve branch: in serve
    mode stages arrive over the bridge and feed the SAME `engineProgress`
    state + `progressStages` witness the desktop listener feeds, so the
    existing install-progress UI renders unchanged. The serve notice's
    progress sentence now comes from the capability report (an older serve
    build still tells the truth).
- **Deps**: `futures-core` (optional, `serve` feature) for the `Stream`
  impl; tokio `sync`/`time` features added to the serve feature;
  `http-body-util` as a dev-dep so tests can read streaming response bodies.

## Acceptance evidence

- Unit test on the bridge: `the_bridge_delivers_desktop_stage_values_to_subscribers`
  (same values + field names the renderer reads).
- Request-level over HTTP: `a_reported_stage_reaches_an_sse_subscriber_as_a_data_frame`
  (in-process router) and `scripts/smoke-serve-progress.sh` — the full
  version: opens the SSE subscription BEFORE installing the small
  `tests/fixtures/packs/ja-demo` fixture via `POST /api/import_pack` on an
  isolated `LTS_DATA_DIR`, then asserts the install/record stages arrived
  attributed to the fixture pack while the call was still in flight.
  Log: `state/evidence/WEB-PROGRESS-001/smoke.log`.
- LANE gates: `state/evidence/WEB-PROGRESS-001/gates.log`.

## Pitfalls learned (for the next serve-mode card)

- `tokio::sync::broadcast::Receiver` has NO `poll_recv` (only mpsc does).
  A manual `Stream` over a broadcast needs a per-connection pump into an
  mpsc; the pump self-terminates when the connection drops.
- In tests, `body.frame()` is `http_body_util::BodyExt::frame` — its Output
  is `Option<Result<Frame, Error>>` (timeout → expect unwraps the OUTER
  Result first; two `.expect`s then land on the Option by accident and the
  type error looks like an API mismatch).
- `capabilities` assertions in serve.rs, ipc.test.ts and App.tsx are now
  load-bearing for the "report what the bridge can do" contract — flip them
  together if the capability ever changes again.
