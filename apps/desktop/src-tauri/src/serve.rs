//! WEB-SERVE-001: HTTP serve mode (browser/phone access, trusted network only).
//!
//! Serves the built frontend and bridges `fetch('/api/<command>')` to the
//! SAME command wiring the desktop shell installs (`wire_commands` in
//! lib.rs), driving it through Tauri's own IPC handler on a mock runtime.
//! No command logic is duplicated here: every HTTP request travels the
//! identical argument-validation, command-invocation, and error-rejection
//! path a webview invoke takes. The five commands whose signatures carry a
//! concrete `tauri::AppHandle` (the install/model commands plus the smoke
//! witness) are routed to the same underlying `*_report`/`*_at` functions
//! with a no-op progress reporter — the progress EVENTS have no browser
//! listener; the result itself is identical, and the capabilities endpoint
//! says so.
//!
//! Network posture (scope 5): the bind address must be an explicit
//! loopback, RFC1918, or Tailscale CGNAT (100.64.0.0/10) address —
//! `0.0.0.0` and public interfaces are refused at startup. There is no
//! auth: the trusted-LAN assumption is documented in
//! `state/notes/WEB-SERVE-001.md`, and the SEC sign-off stays an explicit
//! later WEB-001 concern.
//!
//! Browser-mode honesty (scope 4): `/api/capabilities` reports what the
//! serve mode can and cannot do; the frontend labels unavailable
//! native-only features (install-progress events, microphone capture over
//! an insecure context) instead of silently changing any stored privacy
//! mode.

use axum::body::Bytes;
use axum::extract::Path as AxPath;
use axum::http::StatusCode;
use axum::http::header::CONTENT_TYPE;
use axum::response::sse::{Event, KeepAlive, Sse};
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post};
use axum::{Json, Router};
use futures_core::stream::Stream;
use std::convert::Infallible;
use std::path::{Component, Path, PathBuf};
use std::pin::Pin;
use std::sync::OnceLock;
use std::sync::mpsc::SyncSender;
use std::task::{Context, Poll};
use tokio::sync::broadcast;

/// What `lts-serve` was asked to serve. Paths are resolved at startup.
#[derive(Clone)]
pub struct ServeConfig {
    pub dist: PathBuf,
}

/// The marker the server injects into the served `index.html`; the
/// frontend adapter (`src/ipc.ts`) keys HTTP-IPC mode off exactly this,
/// so vitest/`file://` runs never accidentally enter serve mode.
pub const SERVE_MARKER: &str = "<script>window.__LTS_SERVE=true;</script>";

/// Scope 5: refuse anything but an explicit loopback / RFC1918 / Tailscale
/// CGNAT bind. `0.0.0.0` (unspecified) and public addresses fail here, so
/// the server can never be started in a publicly exposed posture by accident.
pub fn parse_bind(bind: &str) -> Result<std::net::SocketAddr, String> {
    let addr: std::net::SocketAddr = bind
        .parse()
        .map_err(|_| format!("bind must be an explicit host:port (got {bind:?})"))?;
    let ip = addr.ip();
    let trusted = match ip {
        std::net::IpAddr::V4(v4) => {
            v4.is_loopback()
                || v4.is_private()
                // Tailscale tailnet CGNAT range 100.64.0.0/10.
                || (v4.octets()[0] == 100 && (v4.octets()[1] & 0b1100_0000) == 0b0100_0000)
        }
        std::net::IpAddr::V6(v6) => v6.is_loopback(),
    };
    if !trusted {
        return Err(format!(
            "refusing to bind {addr}: lts-serve only binds loopback, RFC1918, or tailnet \
             (100.64.0.0/10) addresses — no public exposure (WEB-SERVE-001 scope 5)"
        ));
    }
    Ok(addr)
}

// -- IPC bridge ------------------------------------------------------------
//
// One mock-runtime App with the SAME wire_commands wiring as the desktop
// shell, plus one hidden mock webview standing in for the desktop webview:
// `tauri::test::get_ipc_response` runs the production IPC handler against
// it. A tauri App is not shareable across threads, so exactly one owner
// thread holds it; every request serializes through it. That also keeps
// app-managed session state (`scenarios::SessionStore`) living exactly
// once per process, as it does in the desktop shell.

type IpcReply = Result<tauri::ipc::InvokeResponseBody, serde_json::Value>;

struct IpcJob {
    cmd: String,
    payload: serde_json::Value,
    reply: SyncSender<IpcReply>,
}

static IPC_TX: OnceLock<std::sync::mpsc::SyncSender<IpcJob>> = OnceLock::new();

fn ipc_tx() -> &'static std::sync::mpsc::SyncSender<IpcJob> {
    IPC_TX.get_or_init(|| {
        let (tx, rx) = std::sync::mpsc::sync_channel::<IpcJob>(32);
        std::thread::Builder::new()
            .name("lts-serve-ipc".into())
            .spawn(move || {
                let app = crate::wire_serve_commands(tauri::test::mock_builder())
                    .build(tauri::test::mock_context(tauri::test::noop_assets()))
                    .expect("lts-serve: command wiring failed to build");
                // ACL posture (measured against tauri 2.12.1, webview/mod.rs): the
                // command ACL check runs only when the command is a plugin command,
                // the app carries an ACL manifest in its context, or the invoke
                // origin is remote. The mock context bakes no capability manifest
                // and every request here presents the local origin
                // `http://tauri.localhost`, so the invoke handler itself decides:
                // exactly the commands `wire_serve_commands` registers resolve,
                // and anything else (including core-internal commands) is
                // rejected as unknown — no allow-list surgery, no private APIs.

                let webview = tauri::WebviewWindowBuilder::new(&app, "main", Default::default())
                    .build()
                    .expect("lts-serve: mock webview endpoint failed");
                for job in rx.iter() {
                    let answer = tauri::test::get_ipc_response(
                        &webview,
                        tauri::webview::InvokeRequest {
                            cmd: job.cmd,
                            callback: tauri::ipc::CallbackFn(0),
                            error: tauri::ipc::CallbackFn(1),
                            // Origin MUST present as local (webview
                            // is_local_url): the tauri:// protocol URL on
                            // desktop Linux/macOS, the localhost scheme URL on
                            // Windows/Android — exactly the pair tauri's own
                            // IPC doctest uses. Any other origin reads as
                            // REMOTE and the ACL branch rejects every command.
                            url: if cfg!(any(windows, target_os = "android")) {
                                "http://tauri.localhost"
                            } else {
                                "tauri://localhost"
                            }
                            .parse()
                            .expect("static local origin url"),
                            body: tauri::ipc::InvokeBody::Json(job.payload),
                            headers: Default::default(),
                            invoke_key: tauri::test::INVOKE_KEY.to_string(),
                        },
                    );
                    // A dropped reply channel only means the client hung up.
                    let _ = job.reply.send(answer);
                }
            })
            .expect("lts-serve: IPC owner thread failed to start");
        tx
    })
}

// -- progress event bridge (WEB-PROGRESS-001) --------------------------------
//
// The desktop streams every install stage as an `engine-progress` event
// (`progress::reporter`). Serve mode previously handed the install commands a
// no-op reporter, so a 294 MB browser install showed nothing until it landed.
// The bridge reproduces the SAME channel: the identical `Progress` values the
// desktop emits are broadcast here, and the SSE endpoint forwards each one as
// a `data:` frame — one progress vocabulary, two transports.

fn progress_tx() -> &'static broadcast::Sender<crate::progress::Progress> {
    static TX: OnceLock<broadcast::Sender<crate::progress::Progress>> = OnceLock::new();
    // A stage is a few hundred bytes; 256 deep means no learner loses stages
    // because their browser tab paused during a burst of progress.
    TX.get_or_init(|| broadcast::channel(256).0)
}

/// The serve-mode reporter passed to the install commands in place of the old
/// no-op: same stages, same field names, broadcast to every open SSE
/// subscriber. A send error only means nobody is listening — progress must
/// never turn into an install error, exactly as on desktop.
fn serve_progress_reporter(p: &crate::progress::Progress) {
    let _ = progress_tx().send(p.clone());
}

/// One browser's SSE subscription: a small mpsc fed by a per-connection pump
/// off the broadcast. A browser that falls behind skips missed stages
/// (progress is a nicety; a stale stage is worse than a skipped one) rather
/// than tearing down the stream, and the pump ends the moment the connection
/// does — its send fails on the dropped receiver, so a hung-up tab leaks
/// nothing.
struct ProgressStream {
    rx: tokio::sync::mpsc::Receiver<crate::progress::Progress>,
}

impl Stream for ProgressStream {
    type Item = Result<Event, Infallible>;

    fn poll_next(mut self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
        loop {
            match self.as_mut().get_mut().rx.poll_recv(cx) {
                Poll::Ready(Some(p)) => {
                    // `json_data` uses Progress's own serde impl — the exact
                    // payload the desktop `engine-progress` event carries, so
                    // the renderer reads identical field names either way.
                    if let Ok(e) = Event::default().json_data(p) {
                        return Poll::Ready(Some(Ok(e)));
                    }
                    // Unreachable for this Serialize; a bad frame must never
                    // kill the stream.
                }
                Poll::Ready(None) => return Poll::Ready(None),
                Poll::Pending => return Poll::Pending,
            }
        }
    }
}

/// GET /api/progress/events: the browser twin of the desktop event stream.
/// Frames are SSE `data:` frames carrying the same JSON the webview receives;
/// the frontend adapter feeds both into the same progress UI.
async fn progress_events() -> Response {
    let mut stages = progress_tx().subscribe();
    let (tx, rx) = tokio::sync::mpsc::channel::<crate::progress::Progress>(64);
    tokio::spawn(async move {
        loop {
            match stages.recv().await {
                Ok(p) => {
                    if tx.send(p).await.is_err() {
                        break; // the browser hung up; this pump is done
                    }
                }
                Err(broadcast::error::RecvError::Lagged(_)) => continue,
                Err(broadcast::error::RecvError::Closed) => break,
            }
        }
    });
    Sse::new(ProgressStream { rx })
        .keep_alive(KeepAlive::default())
        .into_response()
}

// The five commands whose tauri wrappers take a concrete `tauri::AppHandle`
// (Wry-bound, so they cannot ride the mock-runtime handler) are routed here
// to the same underlying functions their wrappers call, with the bridge
// reporter: same work, same result, and the progress stages now reach any
// open browser listener over /api/progress/events. `smoke_ack` stays
// harness-only.

fn app_handle_command(cmd: &str, payload: &serde_json::Value) -> Option<IpcReply> {
    use crate::packs;
    use tauri::ipc::InvokeResponseBody;
    fn ok_json<T: serde::Serialize>(v: T) -> IpcReply {
        // InvokeResponseBody::Json carries JSON TEXT (same as the IPC layer
        // produces for the webview).
        Ok(InvokeResponseBody::Json(
            serde_json::to_string(&v).unwrap_or_else(|_| "null".into()),
        ))
    }
    fn reject(message: String) -> IpcReply {
        Err(serde_json::Value::String(message))
    }
    fn arg(payload: &serde_json::Value, keys: &[&str]) -> Option<String> {
        keys.iter()
            .find_map(|k| payload.get(*k))
            .and_then(|v| v.as_str())
            .map(str::to_string)
    }
    match cmd {
        "install_pack" => {
            let Some(pack_id) = arg(payload, &["pack_id", "packId"]) else {
                return Some(reject("missing or invalid \"packId\" argument".into()));
            };
            Some(
                crate::install_bundled_pack_report(
                    &crate::data_dir(),
                    &pack_id,
                    None,
                    serve_progress_reporter,
                )
                .map_or_else(reject, ok_json),
            )
        }
        "install_catalog_pack" => {
            let Some(pack_id) = arg(payload, &["pack_id", "packId"]) else {
                return Some(reject("missing or invalid \"packId\" argument".into()));
            };
            Some(install_catalog_pack_served(&pack_id).map_or_else(reject, ok_json))
        }
        "import_pack" => {
            let Some(data_b64) = arg(payload, &["data_b64", "dataB64"]) else {
                return Some(reject("missing or invalid \"dataB64\" argument".into()));
            };
            Some(
                packs::import_pack_b64_report(
                    &crate::data_dir(),
                    &data_b64,
                    serve_progress_reporter,
                )
                .map_or_else(reject, ok_json),
            )
        }
        "install_model" => {
            let Some(model_id) = arg(payload, &["model_id", "modelId"]) else {
                return Some(reject("missing or invalid \"modelId\" argument".into()));
            };
            Some(
                crate::install_model_at(&crate::data_dir(), &model_id, serve_progress_reporter)
                    .map_or_else(reject, ok_json),
            )
        }
        "smoke_ack" => Some(reject(
            "smoke_ack is a desktop smoke harness command; unavailable in serve mode".into(),
        )),
        _ => None,
    }
}

/// The same cancel-flag lifecycle the desktop `install_catalog_pack`
/// wrapper runs (the registry is process-global, so a browser-initiated
/// install is cancellable through the ordinary `cancel_pack_install`
/// command exactly like a desktop one).
fn install_catalog_pack_served(pack_id: &str) -> Result<crate::packs::InstallResult, String> {
    use std::sync::Arc;
    use std::sync::atomic::AtomicBool;
    let flag = Arc::new(AtomicBool::new(false));
    let registered = pack_id.to_string();
    if let Ok(mut m) = crate::install_cancel_registry().lock() {
        m.insert(registered.clone(), flag.clone());
    }
    let joined = crate::packs::install_from_catalog_report(
        &crate::data_dir(),
        pack_id,
        serve_progress_reporter,
        &flag,
    );
    // Deregister on every path: a stale flag would silently cancel the
    // learner's next install of the same pack.
    if let Ok(mut m) = crate::install_cancel_registry().lock() {
        m.remove(&registered);
    }
    joined
}

/// POST /api/<command>: body is the same JSON args object a webview
/// `invoke(cmd, args)` would carry (camelCase keys — the exact conversion
/// Tauri's IPC layer performs is reused here, not reimplemented).
async fn api_dispatch(AxPath(cmd): AxPath<String>, body: Bytes) -> Response {
    let payload: serde_json::Value = if body.is_empty() {
        serde_json::Value::Object(serde_json::Map::new())
    } else if let Ok(v) = serde_json::from_slice(&body) {
        v
    } else {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": "request body must be a JSON object"})),
        )
            .into_response();
    };
    if let Some(direct) = app_handle_command(&cmd, &payload) {
        return match direct {
            Ok(response_body) => response_body_response(response_body),
            Err(error_value) => error_response(error_value),
        };
    }
    // Commands block (heavy installs run on blocking pools); hop to a
    // blocking thread so the async runtime stays free. The IPC owner thread
    // serializes the actual command execution.
    let joined = tokio::task::spawn_blocking(move || {
        let (reply_tx, reply_rx) = std::sync::mpsc::sync_channel(1);
        let sent = ipc_tx().send(IpcJob {
            cmd,
            payload,
            reply: reply_tx,
        });
        if sent.is_err() {
            return Err(serde_json::Value::String(
                "serve IPC owner thread is gone".into(),
            ));
        }
        reply_rx
            .recv()
            .map_err(|_| serde_json::Value::String("serve IPC owner thread died".into()))
    })
    .await;
    match joined {
        Err(e) => error_response(format!("serve dispatch failed: {e}").into()),
        Ok(Ok(Ok(response_body))) => response_body_response(response_body),
        Ok(Ok(Err(error_value))) => error_response(error_value),
        Ok(Err(channel_error)) => error_response(channel_error),
    }
}

fn response_body_response(response_body: tauri::ipc::InvokeResponseBody) -> Response {
    use tauri::ipc::InvokeResponseBody;
    match response_body {
        InvokeResponseBody::Json(json_text) => (
            StatusCode::OK,
            [(CONTENT_TYPE, "application/json")],
            json_text,
        )
            .into_response(),
        InvokeResponseBody::Raw(bytes) => (StatusCode::OK, bytes).into_response(),
    }
}

/// The command rejected: the webview would reject the invoke promise with
/// this value, and the frontend adapter rebuilds exactly that.
fn error_response(error_value: serde_json::Value) -> Response {
    (
        StatusCode::UNPROCESSABLE_ENTITY,
        Json(serde_json::json!({"error": error_value})),
    )
        .into_response()
}

/// Scope 4: what this serve mode can and cannot do, reported honestly.
/// Nothing here changes stored settings — the UI only labels consequences.
async fn capabilities() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "mode": "browser-serve",
        "commands": "all desktop commands share one wiring (wire_commands); installs run identically and stream their stages over /api/progress/events",
        "install_progress_events": true,
        "install_progress_note": "install stages stream over GET /api/progress/events (SSE) — the same stages the desktop shell receives",
        "microphone_capture": "needs a secure context (https or localhost); over a plain tailnet http URL the browser blocks mic capture, so scoring features are labeled unavailable",
        "privacy_modes": "unchanged — serve mode never rewrites stored mic/privacy settings, it only labels what the browser can do",
        "network": "trusted-network assumption; SEC sign-off is a later WEB-001 concern (state/notes/WEB-SERVE-001.md)",
    }))
}

// -- static files ----------------------------------------------------------

/// Reject traversal: every component must be a plain normal component.
fn safe_relpath(rel: &str) -> Option<PathBuf> {
    let p = Path::new(rel);
    if p.components().all(|c| matches!(c, Component::Normal(_))) && !p.as_os_str().is_empty() {
        Some(p.to_path_buf())
    } else {
        None
    }
}

fn content_type(path: &Path) -> &'static str {
    match path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or_default()
    {
        "html" => "text/html; charset=utf-8",
        "js" => "text/javascript; charset=utf-8",
        "css" => "text/css; charset=utf-8",
        "json" => "application/json",
        "svg" => "image/svg+xml",
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "ico" => "image/x-icon",
        "woff" => "font/woff",
        "woff2" => "font/woff2",
        "wasm" => "application/wasm",
        "wav" => "audio/wav",
        "mp3" => "audio/mpeg",
        "ogg" => "audio/ogg",
        "m4a" => "audio/mp4",
        _ => "application/octet-stream",
    }
}

/// GET /media/packs/<id>/<version>/…: baked pack media (clips already play
/// via `story_audio` base64 through the IPC bridge; this route exists so
/// clip URLs are available to plain <audio src> uses too). Only paths under
/// the installed-packs store, only audio/image extensions.
async fn media_handler(AxPath(rel): AxPath<String>) -> Response {
    let Some(inner) = safe_relpath(&rel) else {
        return (StatusCode::NOT_FOUND, "not found").into_response();
    };
    if !inner.starts_with("packs") {
        return (StatusCode::NOT_FOUND, "not found").into_response();
    }
    let ext = inner
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or_default();
    if !matches!(
        ext,
        "wav" | "mp3" | "ogg" | "m4a" | "png" | "jpg" | "jpeg" | "svg"
    ) {
        return (StatusCode::NOT_FOUND, "not found").into_response();
    }
    let full = crate::data_dir().join(&inner);
    match std::fs::read(&full) {
        Ok(bytes) => (StatusCode::OK, [(CONTENT_TYPE, content_type(&full))], bytes).into_response(),
        Err(_) => (StatusCode::NOT_FOUND, "not found").into_response(),
    }
}

/// The served `index.html` carries the mode marker; bundles pass through.
fn serve_index(dist: &Path) -> Response {
    match std::fs::read(dist.join("index.html")) {
        Ok(bytes) => {
            let mut text = String::from_utf8_lossy(&bytes).into_owned();
            if let Some(at) = text.find("</head>") {
                text.insert_str(at, SERVE_MARKER);
            } else {
                text.push_str(SERVE_MARKER);
            }
            (
                StatusCode::OK,
                [(CONTENT_TYPE, "text/html; charset=utf-8")],
                text,
            )
                .into_response()
        }
        Err(_) => (
            StatusCode::SERVICE_UNAVAILABLE,
            "lts-serve: no built frontend — run `pnpm build` in apps/desktop first",
        )
            .into_response(),
    }
}

/// GET /**: the built frontend. `index.html` carries the serve marker;
/// extension-less paths fall back to it (the app is a single-page client).
fn static_handler(dist: &Path, uri_path: &str) -> Response {
    let rel = uri_path.trim_start_matches('/').to_string();
    let inner = match rel.as_str() {
        "" => PathBuf::from("index.html"),
        _ => match safe_relpath(&rel) {
            Some(p) => p,
            None => return (StatusCode::NOT_FOUND, "not found").into_response(),
        },
    };
    if inner == Path::new("index.html") {
        return serve_index(dist);
    }
    let full = dist.join(&inner);
    if let Ok(bytes) = std::fs::read(&full) {
        return (StatusCode::OK, [(CONTENT_TYPE, content_type(&full))], bytes).into_response();
    }
    // SPA fallback for extension-less routes only (unknown asset paths 404).
    if inner.extension().is_none() {
        return serve_index(dist);
    }
    (StatusCode::NOT_FOUND, "not found").into_response()
}

/// Assemble the router (also what the tests drive in-process).
pub fn router(cfg: ServeConfig) -> Router {
    let dist_for_fallback = cfg.dist.clone();
    Router::new()
        .route("/api/capabilities", get(capabilities))
        .route("/api/progress/events", get(progress_events))
        .route("/api/{cmd}", post(api_dispatch))
        .route("/media/{*rest}", get(media_handler))
        .fallback(move |req: axum::extract::Request| {
            let dist = dist_for_fallback.clone();
            async move { static_handler(&dist, req.uri().path()) }
        })
}

/// Entry point for the `lts-serve` binary: bind (validated), warm the
/// command app, serve until the process is stopped.
pub async fn serve(bind: &str, dist: PathBuf) -> Result<(), String> {
    let addr = parse_bind(bind)?;
    if !dist.join("index.html").is_file() {
        return Err(format!(
            "no built frontend at {} — run `pnpm build` in apps/desktop first",
            dist.display()
        ));
    }
    // Warm the IPC owner thread so the first request is not paying for it.
    ipc_tx();
    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .map_err(|e| format!("bind {addr} failed: {e}"))?;
    eprintln!("lts-serve listening on http://{addr} (trusted network only)");
    axum::serve(listener, router(ServeConfig { dist }))
        .await
        .map_err(|e| format!("serve loop ended: {e}"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::Body;
    use axum::http::Request;
    use http_body_util::BodyExt;
    use tower::util::ServiceExt;

    fn test_dist() -> PathBuf {
        // apps/desktop/dist, resolved from the crate manifest (same shape
        // as available_packs' repo-root resolution).
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("..")
            .join("dist")
    }

    fn test_router() -> Router {
        router(ServeConfig { dist: test_dist() })
    }

    async fn post_json(app: &Router, path: &str, body: &str) -> (StatusCode, serde_json::Value) {
        let resp = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri(path)
                    .header(CONTENT_TYPE, "application/json")
                    .body(Body::from(body.to_string()))
                    .unwrap(),
            )
            .await
            .unwrap();
        let status = resp.status();
        let bytes = axum::body::to_bytes(resp.into_body(), usize::MAX)
            .await
            .unwrap();
        let json = serde_json::from_slice(&bytes).unwrap_or(serde_json::Value::Null);
        (status, json)
    }

    #[test]
    fn parse_bind_refuses_public_and_wildcard() {
        assert!(parse_bind("0.0.0.0:17625").is_err());
        assert!(parse_bind("141.101.1.1:17625").is_err());
        assert!(parse_bind("nonsense").is_err());
    }

    #[test]
    fn parse_bind_allows_loopback_rfc1918_and_tailnet() {
        assert!(parse_bind("127.0.0.1:17625").is_ok());
        assert!(parse_bind("192.168.1.10:17625").is_ok());
        assert!(parse_bind("10.0.0.5:8080").is_ok());
        assert!(parse_bind("100.101.179.46:17625").is_ok());
        assert!(parse_bind("[::1]:17625").is_ok());
    }

    #[test]
    fn safe_relpath_blocks_traversal() {
        assert!(safe_relpath("packs/a/b.wav").is_some());
        assert!(safe_relpath("../etc/passwd").is_none());
        assert!(safe_relpath("packs/../x").is_none());
        assert!(safe_relpath("/abs").is_none());
        assert!(safe_relpath("").is_none());
    }

    #[tokio::test]
    async fn capabilities_endpoint_reports_honest_mode() {
        let resp = test_router()
            .oneshot(
                Request::builder()
                    .uri("/api/capabilities")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(resp.status(), StatusCode::OK);
        let bytes = axum::body::to_bytes(resp.into_body(), usize::MAX)
            .await
            .unwrap();
        let v: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
        assert_eq!(v["mode"], "browser-serve");
        // WEB-PROGRESS-001: progress is no longer a desktop-only nicety.
        assert_eq!(v["install_progress_events"], true);
        assert!(
            v["install_progress_note"]
                .as_str()
                .unwrap()
                .contains("/api/progress/events"),
            "capabilities must name the stream it now offers: {v}"
        );
        assert!(v["privacy_modes"].as_str().unwrap().contains("unchanged"));
    }

    #[tokio::test]
    async fn ipc_bridge_round_trips_a_command() {
        // app_mode is side-effect-free: absent smoke envs must read false,
        // proving the request ran through the real command, not a stub.
        let (status, json) = post_json(&test_router(), "/api/app_mode", "{}").await;
        assert_eq!(
            status,
            StatusCode::OK,
            "app_mode over serve bridge got: {json}"
        );
        assert_eq!(json["smoke"], false);
        assert_eq!(json["smoke_perf"], false);
    }

    #[tokio::test]
    async fn ipc_bridge_maps_command_rejection_to_error_body() {
        // resume_profile for a profile that does not exist is a
        // command-level Err; the adapter must be able to rebuild the
        // rejection message from it. (active_pack is NOT a rejection
        // fixture: it honestly answers Ok([]) for an unknown profile.)
        let (status, json) = post_json(
            &test_router(),
            "/api/resume_profile",
            r#"{"profileId": "no-such-profile"}"#,
        )
        .await;
        assert_eq!(status, StatusCode::UNPROCESSABLE_ENTITY, "body: {json}");
        assert!(json.get("error").is_some());
    }

    #[tokio::test]
    async fn unknown_command_reaches_the_real_ipc_layer() {
        // Tauri's invoke handler itself rejects unknown commands; the bridge
        // surfaces that as an error, never a silent 200.
        let (status, json) = post_json(&test_router(), "/api/definitely_not_a_command", "{}").await;
        assert_eq!(status, StatusCode::UNPROCESSABLE_ENTITY);
        assert!(json.get("error").is_some());
    }

    /// WEB-SERVE-001: the generated name table (`SERVE_COMMAND_NAMES`) must
    /// match what the serve wiring actually resolves. Every listed name
    /// reaches a real command over an empty body — the command may still
    /// reject for argument reasons, but never with the exact unknown-command
    /// rejection an unregistered name gets. This is what keeps the desktop
    /// list and the serve list from silently drifting.
    #[tokio::test]
    async fn every_serve_command_name_resolves_through_the_wiring() {
        let app = test_router();
        let (_status, unknown) = post_json(&app, "/api/definitely_not_a_command", "{}").await;
        let unknown_msg = unknown["error"].as_str().unwrap_or_default().to_string();
        assert!(
            unknown_msg.contains("not found") || unknown_msg.contains("not allowed"),
            "expected an unknown-command rejection shape, got {unknown_msg:?}"
        );
        for name in crate::SERVE_COMMAND_NAMES {
            let (_status, json) = post_json(&app, &format!("/api/{name}"), "{}").await;
            let msg = json["error"].as_str().unwrap_or_default();
            // An ACL rejection (what a remote origin or a missing capability
            // produces) means the name is NOT wired for serve mode.
            assert!(
                !msg.contains("not allowed"),
                "{name} was ACL-rejected over the serve bridge: {msg}"
            );
            assert_ne!(
                msg, unknown_msg,
                "{name} did not resolve through serve wiring"
            );
        }
    }

    #[tokio::test]
    async fn app_handle_install_commands_route_to_the_same_core() {
        // install_model with an unknown id must produce the same core
        // rejection over HTTP that the desktop command would raise — proving
        // the direct route reaches the real install machinery.
        let (status, json) = post_json(
            &test_router(),
            "/api/install_model",
            r#"{"modelId": "no.such.model"}"#,
        )
        .await;
        assert_eq!(status, StatusCode::UNPROCESSABLE_ENTITY);
        let message = json["error"].as_str().unwrap_or_default();
        assert!(!message.is_empty());
    }

    // -- WEB-PROGRESS-001: the event bridge ---------------------------------

    /// Unit test on the bridge itself: what a desktop reporter would emit is
    /// what an SSE subscriber's broadcast receiver gets — same values, and
    /// serialized with the field names the renderer reads by name.
    #[tokio::test]
    async fn the_bridge_delivers_desktop_stage_values_to_subscribers() {
        let mut rx = progress_tx().subscribe();
        serve_progress_reporter(&crate::progress::Progress::with_percent(
            "install-pack",
            "org.openlanguage.ja-demo",
            "install",
            40,
        ));
        let got = rx.recv().await.unwrap();
        let json = serde_json::to_value(&got).unwrap();
        assert_eq!(json["operation"], "install-pack");
        assert_eq!(json["subject"], "org.openlanguage.ja-demo");
        assert_eq!(json["stage"], "install");
        assert_eq!(json["percent"], 40);
    }

    /// Request-level: an open SSE subscription over the real router receives
    /// a stage reported while a request is in flight — the browser sees the
    /// install moving, not a frozen button until the call lands. (The full
    /// install-a-fixture-pack version of this smoke runs as
    /// scripts/smoke-serve-progress.sh; its log rides in the card evidence.)
    #[tokio::test]
    async fn a_reported_stage_reaches_an_sse_subscriber_as_a_data_frame() {
        let resp = test_router()
            .oneshot(
                Request::builder()
                    .uri("/api/progress/events")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(resp.status(), StatusCode::OK);
        let ctype = resp
            .headers()
            .get(CONTENT_TYPE)
            .and_then(|v| v.to_str().ok())
            .unwrap_or_default()
            .to_string();
        assert!(
            ctype.starts_with("text/event-stream"),
            "progress endpoint must be SSE, got {ctype:?}"
        );
        // The subscription exists by the time the response is returned; report
        // a stage exactly as an install mid-flight would.
        serve_progress_reporter(&crate::progress::Progress::stage(
            "install-pack",
            "org.openlanguage.ja-demo",
            "prepare",
        ));
        let mut body = resp.into_body();
        let mut seen = String::new();
        let deadline = tokio::time::Instant::now() + std::time::Duration::from_secs(5);
        while !seen.contains("install-pack") {
            let polled = tokio::time::timeout_at(deadline, body.frame())
                .await
                .expect("no SSE frame within 5s");
            let frame = match polled {
                Some(Ok(frame)) => frame,
                Some(Err(e)) => panic!("body error: {e}"),
                None => break,
            };
            if let Ok(bytes) = frame.into_data() {
                seen.push_str(&String::from_utf8_lossy(&bytes));
            }
        }
        let at = seen
            .find("data: ")
            .unwrap_or_else(|| panic!("an SSE data frame in: {seen}"));
        let line = seen[at + "data: ".len()..].lines().next().unwrap();
        let v: serde_json::Value = serde_json::from_str(line).expect("data frame is JSON");
        assert_eq!(v["operation"], "install-pack");
        assert_eq!(v["subject"], "org.openlanguage.ja-demo");
        assert_eq!(v["stage"], "prepare");
        assert_eq!(v["percent"], serde_json::Value::Null);
    }

    #[tokio::test]
    async fn media_route_blocks_outside_pack_store() {
        let app = test_router();
        let resp = app
            .clone()
            .oneshot(
                Request::builder()
                    .uri("/media/../etc/passwd")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(resp.status(), StatusCode::NOT_FOUND);
        let resp = app
            .oneshot(
                Request::builder()
                    .uri("/media/packs/x/y/shadow")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(resp.status(), StatusCode::NOT_FOUND);
    }
}
