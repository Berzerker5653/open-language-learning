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
//! `0.0.0.0` and public interfaces are refused at startup, and public
//! addresses stay refused in every mode. LAN-TOGGLE-PIN-001 adds the
//! owner-approved zero-install fallback: while the persisted Settings
//! toggle 'Allow devices on my home network' is ON, an explicit LAN bind
//! or `0.0.0.0` is allowed, and every non-loopback peer must pair with
//! the expiring 6-digit PIN before any `/api`/`/media` data flows
//! (loopback stays the operator path and always sees the PIN). The
//! trusted-LAN assumption for the tailnet path is documented in
//! `state/notes/WEB-SERVE-001.md`; tailscale-serve forwards land on
//! loopback, so the recommended HTTPS path needs no pairing.
//!
//! Browser-mode honesty (scope 4): `/api/capabilities` reports what the
//! serve mode can and cannot do; the frontend labels unavailable
//! native-only features (install-progress events, microphone capture over
//! an insecure context) instead of silently changing any stored privacy
//! mode.

use axum::body::Bytes;
use axum::extract::Path as AxPath;
use axum::http::HeaderMap;
use axum::http::StatusCode;
use axum::http::header::CONTENT_TYPE;
use axum::http::header::ORIGIN;
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
    parse_bind_with_lan(bind, false)
}

/// LAN-TOGGLE-PIN-001 bind policy: the scope-5 trusted set, plus — ONLY
/// while the persisted LAN-access toggle is on — the unspecified address
/// (`0.0.0.0`) and IPv6 unique-local ranges. Public addresses are refused
/// in every mode: the toggle widens the LAN posture, never the public one.
pub fn parse_bind_with_lan(bind: &str, lan_enabled: bool) -> Result<std::net::SocketAddr, String> {
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
                || (lan_enabled && v4.is_unspecified())
        }
        std::net::IpAddr::V6(v6) => {
            v6.is_loopback()
                || v6.is_unspecified() && lan_enabled
                || v6.is_unique_local() && lan_enabled
        }
    };
    if !trusted {
        return Err(format!(
            "refusing to bind {addr}: lts-serve only binds loopback, RFC1918, or tailnet \
             (100.64.0.0/10) addresses — no public exposure (WEB-SERVE-001 scope 5)"
        ));
    }
    Ok(addr)
}

/// LAN-TOGGLE-PIN-001: the LAN addresses a running serve process can open
/// for the toggle — every non-loopback interface address in the trusted
/// private/tailnet ranges, stamped with the serve port. Explicit-interface
/// binds (not `0.0.0.0`) let the LAN listener coexist with the loopback
/// listener already holding the same port.
pub fn lan_iface_addrs(port: u16) -> Vec<std::net::SocketAddr> {
    let addrs = if_addrs::get_if_addrs().unwrap_or_default();
    addrs
        .iter()
        .filter(|iface| !iface.is_loopback())
        .map(|iface| iface.ip())
        .filter(|ip| match ip {
            std::net::IpAddr::V4(v4) => {
                v4.is_private()
                    || (v4.octets()[0] == 100 && (v4.octets()[1] & 0b1100_0000) == 0b0100_0000)
            }
            std::net::IpAddr::V6(v6) => v6.is_unique_local(),
        })
        .map(|ip| std::net::SocketAddr::new(ip, port))
        .collect()
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
async fn progress_events(peer: Peer, headers: HeaderMap) -> Response {
    if let Some(reject) = require_paired_or_local(peer, &headers).await {
        return reject;
    }
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
async fn api_dispatch(
    peer: Peer,
    headers: HeaderMap,
    AxPath(cmd): AxPath<String>,
    body: Bytes,
) -> Response {
    // LAN-TOGGLE-PIN-001: no learner data crosses the LAN boundary
    // before pairing.
    if let Some(reject) = require_paired_or_local(peer, &headers).await {
        return reject;
    }
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
async fn capabilities(headers: HeaderMap) -> Json<serde_json::Value> {
    // SETTINGS-SCOPE-001: microphone-name enumeration follows the browser's
    // secure-context rule (https, or localhost/127.0.0.1/IPv6 loopback).
    // The bridge states the rule's outcome for the origin it is answering
    // — the Settings mic control grays from this report, never from a local
    // guess in the page. An origin that is not even local cannot have been
    // served by this bridge at all (the scope-5 guard says so first); the
    // honest report for that shape is "cannot say", not a silent false.
    let origin = headers.get(ORIGIN).and_then(|v| v.to_str().ok());
    let named = match origin {
        Some(o) if o.starts_with("https://") => Some(true),
        Some(o) => {
            let rest = o
                .strip_prefix("http://")
                .or_else(|| o.strip_prefix("ws://"))
                .unwrap_or(o);
            let host = match rest.find("://") {
                Some(i) => &rest[i + 3..],
                None => rest,
            };
            let host = host.split([':', '/']).next().unwrap_or("");
            let host = host
                .strip_prefix('[')
                .and_then(|h| h.split(']').next())
                .unwrap_or(host);
            let host = host.split('/').next().unwrap_or("");
            let local =
                host == "localhost" || host == "127.0.0.1" || host == "[::1]" || host == "::1";
            if local { Some(true) } else { Some(false) }
        }
        None => None,
    };
    Json(serde_json::json!({
        "mode": "browser-serve",
        "commands": "all desktop commands share one wiring (wire_commands); installs run identically and stream their stages over /api/progress/events",
        "install_progress_events": true,
        "install_progress_note": "install stages stream over GET /api/progress/events (SSE) — the same stages the desktop shell receives",
        "microphone_capture": "needs a secure context (https or localhost); over a plain tailnet http URL the browser blocks mic capture, so scoring features are labeled unavailable",
        "microphone_names_available": named,
        "microphone_names_note": "named inputs (EnumerateDevices) exist only in a secure context: https, or localhost/127.0.0.1; over a plain tailnet http URL the Settings 'Detect microphones' control is unavailable, and recording from the system default still works",
        "privacy_modes": "unchanged — serve mode never rewrites stored mic/privacy settings, it only labels what the browser can do",
        "network": "trusted-network assumption; SEC sign-off is a later WEB-001 concern (state/notes/WEB-SERVE-001.md)",
    }))
}

// -- LAN access + pairing PIN (LAN-TOGGLE-PIN-001) -------------------------
//
// The zero-install fallback from the owner remote-access decision
// (state/notes/REMOTE-ACCESS-SURVEY-2026-11.md): the Settings toggle
// 'Allow devices on my home network' opens the running serve process to
// the local network, but no LAN peer reads learner data until it pairs.
// Posture, stated exactly:
// * A loopback peer IS the operator: always allowed, always sees the PIN,
//   and is the only peer that can change LAN settings. Tailscale-serve
//   forwards arrive on loopback, so the recommended HTTPS path is
//   unaffected by pairing.
// * A non-loopback peer needs a valid `lts_session` cookie for every
//   data route (/api/<cmd>, /api/progress/events, /media/*). It may only
//   reach /pair (rate-limited) and the static app shell.
// * The PIN is 6 digits — only 10^6 — so the per-peer attempt limit is
//   load-bearing, not decoration. It is single-use and expires in
//   minutes; a pairing cookie lasts SESSION_TTL and persists across
//   restarts (`<data>/serve-access.json`) so a paired phone reconnects
//   without re-entering anything.
// * Honest label: plain http on the LAN is unencrypted; the UI says so.

/// How long an issued PIN stays valid (the card's 'a few minutes').
pub const PIN_TTL: std::time::Duration = std::time::Duration::from_secs(300);
/// How long a paired device's session cookie lasts (docs/22 promises
/// reconnect-without-re-entering; 30 days, re-pair after that).
pub const SESSION_TTL: std::time::Duration = std::time::Duration::from_secs(30 * 24 * 3600);
/// Wrong-PIN guesses accepted per peer IP before the peer is locked out
/// for the process lifetime (a restart clears it; 10^6 space / 10 tries).
const PAIR_ATTEMPT_LIMIT: u32 = 10;
const SESSION_COOKIE: &str = "lts_session";

#[derive(Debug, Default, PartialEq, Eq, serde::Deserialize, serde::Serialize)]
pub struct PersistedAccess {
    #[serde(default)]
    pub lan_enabled: bool,
    #[serde(default)]
    pub sessions: Vec<PersistedSession>,
}

#[derive(Debug, PartialEq, Eq, serde::Deserialize, serde::Serialize)]
pub struct PersistedSession {
    pub token: String,
    pub expires_epoch: u64,
}

#[derive(Debug)]
struct PinRecord {
    code: String,
    expires: std::time::Instant,
}

#[derive(Debug, Clone)]
pub struct SessionRecord {
    token: String,
    expires_epoch: u64,
}

#[derive(Debug, Default)]
pub struct LanState {
    enabled: bool,
    pin: Option<PinRecord>,
    sessions: Vec<SessionRecord>,
    attempts: std::collections::HashMap<String, u32>,
    listeners: Vec<(String, tokio::task::AbortHandle)>,
}

/// One non-deterministic 64-hex digest (uuid v4 + clock + pid, hashed).
/// No `rand` dependency is pulled into the desktop tree for this; the
/// PIN and tokens only need unpredictability, and sha2 is already a dep.
fn random_hex() -> String {
    use sha2::Digest as _;
    let seed = format!(
        "{}|{}|{}",
        uuid::Uuid::new_v4(),
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_nanos())
            .unwrap_or(0),
        std::process::id()
    );
    let mut h = sha2::Sha256::new();
    h.update(seed.as_bytes());
    h.finalize().iter().map(|b| format!("{b:02x}")).collect()
}

/// Issue (replacing any live PIN) and return the 6-digit code. `ttl` is
/// a parameter so expiry is testable without sleeping.
pub fn issue_pin(state: &mut LanState, ttl: std::time::Duration) -> String {
    let hex = random_hex();
    let n: u32 = u32::from_str_radix(&hex[..6], 16).unwrap_or(0) % 1_000_000;
    let code = format!("{n:06}");
    state.pin = Some(PinRecord {
        code: code.clone(),
        expires: std::time::Instant::now() + ttl,
    });
    code
}

/// On a match: consume the PIN, mint a session, prune expired sessions,
/// and return the record (whose token goes into the cookie). A wrong or
/// expired code changes nothing — a typo must not burn the visible PIN.
pub fn validate_pin(state: &mut LanState, code: &str, now_epoch: u64) -> Option<SessionRecord> {
    let matches = state
        .pin
        .as_ref()
        .is_some_and(|p| p.expires > std::time::Instant::now() && p.code == code);
    if !matches {
        return None;
    }
    state.pin = None;
    let rec = SessionRecord {
        token: random_hex(),
        expires_epoch: now_epoch + SESSION_TTL.as_secs(),
    };
    state.sessions.retain(|s| s.expires_epoch > now_epoch);
    state.sessions.push(rec.clone());
    Some(rec)
}

pub fn session_valid(state: &LanState, token: &str, now_epoch: u64) -> bool {
    state
        .sessions
        .iter()
        .any(|s| s.token == token && s.expires_epoch > now_epoch)
}

/// Count a pairing attempt for `peer`; false once the limit is crossed.
pub fn note_attempt(state: &mut LanState, peer: &str) -> bool {
    let c = state.attempts.entry(peer.to_string()).or_insert(0);
    *c += 1;
    *c <= PAIR_ATTEMPT_LIMIT
}

/// The toggle state rides one JSON file in the data dir, so a LAN
/// pairing survives serve restarts (the phone reconnects by cookie) and
/// the bind posture is known BEFORE startup binds the socket.
fn persist_access_to(path: &Path, state: &LanState) {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let doc = PersistedAccess {
        lan_enabled: state.enabled,
        sessions: state
            .sessions
            .iter()
            .filter(|s| s.expires_epoch > now)
            .map(|s| PersistedSession {
                token: s.token.clone(),
                expires_epoch: s.expires_epoch,
            })
            .collect(),
    };
    if let Ok(text) = serde_json::to_string_pretty(&doc) {
        if let Some(parent) = path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }
        let _ = std::fs::write(path, text);
    }
}

fn load_access_from(path: &Path, state: &mut LanState) {
    let Ok(text) = std::fs::read_to_string(path) else {
        return;
    };
    let Ok(doc) = serde_json::from_str::<PersistedAccess>(&text) else {
        return;
    };
    state.enabled = doc.lan_enabled;
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    state.sessions = doc
        .sessions
        .into_iter()
        .filter(|s| s.expires_epoch > now && !s.token.is_empty())
        .map(|s| SessionRecord {
            token: s.token,
            expires_epoch: s.expires_epoch,
        })
        .collect();
}

fn access_file() -> PathBuf {
    crate::data_dir().join("serve-access.json")
}

/// Process-wide LAN state (the serve process has exactly one), plus the
/// router/port a runtime toggle needs to open extra interface listeners.
static LAN: OnceLock<std::sync::Mutex<LanState>> = OnceLock::new();
static LAN_ROUTER: OnceLock<Router> = OnceLock::new();
static LAN_PORT: OnceLock<u16> = OnceLock::new();

fn lan() -> &'static std::sync::Mutex<LanState> {
    LAN.get_or_init(|| std::sync::Mutex::new(LanState::default()))
}

fn lan_lock() -> std::sync::MutexGuard<'static, LanState> {
    lan().lock().unwrap_or_else(|p| p.into_inner())
}

/// Open (or close) the explicit-interface LAN listeners to match
/// `enabled`. Loopback never needs its own entry — the primary listener
/// already answers it. Binding per-interface (instead of `0.0.0.0`) is
/// what lets the LAN listener appear on the SAME port while the loopback
/// listener already holds it. Lock discipline: the state mutex is taken
/// and released in phases — no guard is held across an await (the axum
/// handlers that call this must stay Send).
async fn sync_lan_listeners() {
    let (wanted, router) = {
        let mut state = lan_lock();
        let wanted_all: Vec<String> = match (state.enabled, LAN_PORT.get()) {
            (true, Some(port)) => lan_iface_addrs(*port)
                .iter()
                .map(|a| a.to_string())
                .collect(),
            _ => Vec::new(),
        };
        state.listeners.retain(|(addr, handle)| {
            if wanted_all.contains(addr) {
                return true;
            }
            handle.abort();
            eprintln!("lts-serve: LAN access closed on {addr}");
            false
        });
        let wanted: Vec<String> = wanted_all
            .into_iter()
            .filter(|a| !state.listeners.iter().any(|(x, _)| x == a))
            .collect();
        (wanted, LAN_ROUTER.get().cloned())
    };
    let Some(router) = router else {
        return;
    };
    for addr in wanted {
        match tokio::net::TcpListener::bind(&addr).await {
            Ok(listener) => {
                let shown = addr.clone();
                // axum 0.8 injects ConnectInfo (the peer address the gate
                // needs) only through into_make_service_with_connect_info.
                let make = router
                    .clone()
                    .into_make_service_with_connect_info::<std::net::SocketAddr>();
                let ended = shown.clone();
                let task = tokio::spawn(async move {
                    if let Err(e) = axum::serve(listener, make).await {
                        eprintln!("lts-serve: LAN listener {ended} ended: {e}");
                    }
                });
                lan_lock().listeners.push((addr, task.abort_handle()));
                eprintln!(
                    "lts-serve: LAN access open on {shown} — unencrypted http, pairing PIN required"
                );
            }
            Err(e) => eprintln!("lts-serve: could not open LAN address {addr}: {e}"),
        }
    }
}

// -- pairing endpoints ------------------------------------------------------

/// The connecting peer's socket address when the listener provides one.
/// A hand-rolled extractor: axum 0.8 injects `ConnectInfo` only through
/// `into_make_service_with_connect_info`, and `Option<ConnectInfo<..>>`
/// as a handler arg needs an `OptionalFromRequestParts` that
/// `ConnectInfo` does not implement. Missing address means an
/// in-process caller (the router tests): the honest local default.
#[derive(Debug, Clone, Copy)]
struct Peer(Option<std::net::SocketAddr>);

impl<S: Send + Sync> axum::extract::FromRequestParts<S> for Peer {
    type Rejection = std::convert::Infallible;
    async fn from_request_parts(
        parts: &mut axum::http::request::Parts,
        _state: &S,
    ) -> Result<Self, Self::Rejection> {
        Ok(Peer(
            parts
                .extensions
                .get::<axum::extract::ConnectInfo<std::net::SocketAddr>>()
                .map(|c| c.0),
        ))
    }
}

fn peer_is_loopback(peer: &Peer) -> bool {
    peer.0.is_none_or(|a| a.ip().is_loopback())
}

fn peer_ip(peer: &Peer) -> String {
    peer.0
        .map(|a| a.ip().to_string())
        .unwrap_or_else(|| "local".into())
}

fn now_epoch() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

fn cookie_value(headers: &HeaderMap, name: &str) -> Option<String> {
    let raw = headers.get(axum::http::header::COOKIE)?.to_str().ok()?;
    raw.split(';').find_map(|kv| {
        let kv = kv.trim();
        kv.strip_prefix(&format!("{name}="))
            .map(|v| v.trim().to_string())
            .filter(|v| !v.is_empty())
    })
}

fn pairing_required() -> Response {
    (
        StatusCode::UNAUTHORIZED,
        Json(serde_json::json!({
            "error": "pairing required — on the computer running LTS, open Settings \u{2192} \
                      'Local network access' to show the current 6-digit pairing PIN, then \
                      enter it here once; this device reconnects without a PIN afterwards"
        })),
    )
        .into_response()
}

fn forbidden(message: &str) -> Response {
    (
        StatusCode::FORBIDDEN,
        Json(serde_json::json!({"error": message})),
    )
        .into_response()
}

/// The data-route gate: loopback passes; everyone else needs a live
/// session cookie. Checked inside each data handler (not as router
/// middleware) so the static app shell and /pair stay reachable —
/// an unpaired phone must be able to load the page to enter the PIN.
async fn data_route_allowed(peer: &Peer, headers: &HeaderMap) -> bool {
    if peer_is_loopback(peer) {
        return true;
    }
    let Some(token) = cookie_value(headers, SESSION_COOKIE) else {
        return false;
    };
    session_valid(&lan_lock(), &token, now_epoch())
}

fn lan_status_json(state: &LanState) -> serde_json::Value {
    let port = LAN_PORT.get().copied().unwrap_or(0);
    let pin = state
        .pin
        .as_ref()
        .filter(|p| p.expires > std::time::Instant::now());
    serde_json::json!({
        "enabled": state.enabled,
        "pin": pin.map(|p| p.code.clone()),
        "pin_expires_in_secs": pin.map(|p| p.expires.saturating_duration_since(std::time::Instant::now()).as_secs()),
        "addresses": if state.enabled { lan_iface_addrs(port).iter().map(|a| format!("http://{a}/")).collect::<Vec<_>>() } else { Vec::<String>::new() },
        "paired_devices": state.sessions.iter().filter(|s| s.expires_epoch > now_epoch()).count(),
        "traffic_note": "plain http on the local network is unencrypted: anyone on this Wi-Fi can read what paired devices send, and the browser blocks the microphone here. The Tailscale path (https) is the private one (docs/22).",
    })
}

/// GET /lan/status — loopback only (it shows the PIN). While enabled, a
/// dead/expired PIN is rotated automatically so the panel always shows
/// one that works.
async fn lan_status(peer: Peer) -> Response {
    if !peer_is_loopback(&peer) {
        return forbidden("the pairing PIN is only shown to the computer running LTS");
    }
    let (json, enabled) = {
        let mut state = lan_lock();
        if state.enabled
            && state
                .pin
                .as_ref()
                .is_none_or(|p| p.expires <= std::time::Instant::now())
        {
            issue_pin(&mut state, PIN_TTL);
        }
        (lan_status_json(&state), state.enabled)
    };
    if enabled {
        sync_lan_listeners().await;
    }
    Json(json).into_response()
}

/// POST /lan/enable {"enabled": bool} — loopback only (changing the
/// network posture from the network would defeat the gate).
async fn lan_enable(peer: Peer, body: Bytes) -> Response {
    if !peer_is_loopback(&peer) {
        return forbidden("local-network access is only switched from the computer running LTS");
    }
    let wanted: bool = match serde_json::from_slice::<serde_json::Value>(&body) {
        Ok(v) => v.get("enabled").and_then(|b| b.as_bool()).unwrap_or(false),
        Err(_) => false,
    };
    let json = {
        let mut state = lan_lock();
        state.enabled = wanted;
        if wanted
            && state
                .pin
                .as_ref()
                .is_none_or(|p| p.expires <= std::time::Instant::now())
        {
            issue_pin(&mut state, PIN_TTL);
        }
        persist_access_to(&access_file(), &state);
        lan_status_json(&state)
    };
    sync_lan_listeners().await;
    Json(json).into_response()
}

/// POST /lan/rotate — loopback only; immediately replaces the shown PIN
/// (e.g. after a shoulder-surfacing worry).
async fn lan_rotate(peer: Peer) -> Response {
    if !peer_is_loopback(&peer) {
        return forbidden("the pairing PIN is only rotated from the computer running LTS");
    }
    let mut state = lan_lock();
    let code = issue_pin(&mut state, PIN_TTL);
    Json(serde_json::json!({"pin": code, "expires_in_secs": PIN_TTL.as_secs()})).into_response()
}

/// POST /pair {"pin": "123456"} — the LAN device's one pairing call.
/// Success sets the HttpOnly session cookie and persists the session.
async fn pair(peer: Peer, body: Bytes) -> Response {
    let peer_addr = peer_ip(&peer);
    let code = serde_json::from_slice::<serde_json::Value>(&body)
        .ok()
        .and_then(|v| v.get("pin").and_then(|p| p.as_str()).map(str::to_string))
        .unwrap_or_default();
    let mut state = lan_lock();
    if !note_attempt(&mut state, &peer_addr) {
        return (
            StatusCode::TOO_MANY_REQUESTS,
            Json(serde_json::json!({
                "error": "too many pairing attempts from this device — restart lts-serve or pair from the main computer"
            })),
        )
            .into_response();
    }
    let Some(session) = validate_pin(&mut state, code.trim(), now_epoch()) else {
        return forbidden(
            "that pairing PIN did not work — a PIN is only valid for a few minutes; check \
             Settings \u{2192} 'Local network access' on the main computer for the current one",
        );
    };
    persist_access_to(&access_file(), &state);
    let cookie = format!(
        "{SESSION_COOKIE}={}; HttpOnly; SameSite=Lax; Max-Age={}; Path=/",
        session.token,
        SESSION_TTL.as_secs()
    );
    (
        StatusCode::OK,
        [(axum::http::header::SET_COOKIE, cookie)],
        Json(serde_json::json!({
            "paired": true,
            "expires_in_secs": session.expires_epoch.saturating_sub(now_epoch()),
        })),
    )
        .into_response()
}

/// The gate wrapper for the data routes (see `data_route_allowed`).
async fn require_paired_or_local(peer: Peer, headers: &HeaderMap) -> Option<Response> {
    if data_route_allowed(&peer, headers).await {
        None
    } else {
        Some(pairing_required())
    }
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
async fn media_handler(peer: Peer, headers: HeaderMap, AxPath(rel): AxPath<String>) -> Response {
    if let Some(reject) = require_paired_or_local(peer, &headers).await {
        return reject;
    }
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
        .route("/lan/status", get(lan_status))
        .route("/lan/enable", post(lan_enable))
        .route("/lan/rotate", post(lan_rotate))
        .route("/pair", post(pair))
        .fallback(move |req: axum::extract::Request| {
            let dist = dist_for_fallback.clone();
            async move { static_handler(&dist, req.uri().path()) }
        })
}

/// Entry point for the `lts-serve` binary: bind (validated), warm the
/// command app, serve until the process is stopped.
pub async fn serve(bind: &str, dist: PathBuf) -> Result<(), String> {
    // LAN-TOGGLE-PIN-001: the persisted toggle is read BEFORE binding,
    // so a restart keeps both the widened bind posture and the paired
    // devices' sessions without any learner-side re-pairing.
    {
        let mut state = lan_lock();
        load_access_from(&access_file(), &mut state);
    }
    let enabled = lan_lock().enabled;
    let addr = parse_bind_with_lan(bind, enabled)?;
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
    let app = router(ServeConfig { dist });
    // The runtime toggle needs the router and port to open extra LAN
    // interface listeners on the same port (LAN-TOGGLE-PIN-001).
    let _ = LAN_ROUTER.set(app.clone());
    let _ = LAN_PORT.set(
        listener
            .local_addr()
            .map(|a| a.port())
            .unwrap_or(addr.port()),
    );
    if enabled {
        sync_lan_listeners().await;
    }
    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<std::net::SocketAddr>(),
    )
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
    async fn capabilities_report_names_mic_availability_per_origin() {
        // SETTINGS-SCOPE-001: the same report that feeds the browser-mode
        // banner also decides whether the Settings "Detect microphones"
        // button can do anything — the truth is computed once, here.
        // An async fn, not a closure returning `async move`: a closure
        // whose future borrows the argument fails lifetime inference on
        // the pinned toolchain (mainline rot caught by the LAN lane).
        async fn ask(origin: Option<&str>) -> serde_json::Value {
            let app = test_router();
            let mut builder = Request::builder().uri("/api/capabilities");
            if let Some(o) = origin {
                builder = builder.header("origin", o);
            }
            let resp = app
                .oneshot(builder.body(Body::empty()).unwrap())
                .await
                .unwrap();
            let bytes = axum::body::to_bytes(resp.into_body(), usize::MAX)
                .await
                .unwrap();
            serde_json::from_slice::<serde_json::Value>(&bytes).unwrap()
        }
        // Plain tailnet-style http origin: names cannot be revealed.
        let v = ask(Some("http://100.101.179.46:8000")).await;
        assert_eq!(
            v["microphone_names_available"], false,
            "insecure origin must say so: {v}"
        );
        assert!(
            v["microphone_names_note"]
                .as_str()
                .unwrap()
                .contains("secure context")
        );
        // Loopback http and any https are secure contexts.
        for origin in [
            "http://localhost:8000",
            "http://127.0.0.1:8000",
            "https://example.invalid",
        ] {
            let v = ask(Some(origin)).await;
            assert_eq!(
                v["microphone_names_available"], true,
                "{origin} is secure: {v}"
            );
        }
        // No Origin header at all (typed-in top-level navigation): the
        // honest answer is "cannot say", never a silent false.
        let v = ask(None).await;
        assert!(v["microphone_names_available"].is_null());
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

    // -- LAN-TOGGLE-PIN-001: bind policy, PIN lifecycle, pairing gate ------

    #[test]
    fn bind_policy_opens_the_wildcard_only_while_lan_access_is_on() {
        // The toggle widens the LAN posture, never the public one.
        assert!(parse_bind_with_lan("0.0.0.0:17625", false).is_err());
        assert!(parse_bind_with_lan("0.0.0.0:17625", true).is_ok());
        assert!(parse_bind_with_lan("141.101.1.1:17625", true).is_err());
        assert!(parse_bind_with_lan("192.168.1.10:17625", true).is_ok());
        assert!(parse_bind_with_lan("127.0.0.1:17625", false).is_ok());
        assert!(parse_bind_with_lan("[::]:17625", true).is_ok());
        assert!(parse_bind_with_lan("[fd00::1]:17625", true).is_ok());
        assert!(parse_bind_with_lan("[2001:db8::1]:17625", true).is_err());
    }

    #[test]
    fn pin_is_issued_six_digit_single_use_and_expiring() {
        let mut st = LanState::default();
        let code = issue_pin(&mut st, std::time::Duration::from_secs(300));
        assert_eq!(code.len(), 6, "PIN must be exactly 6 digits: {code}");
        assert!(code.bytes().all(|b| b.is_ascii_digit()));

        // A wrong guess must not burn the visible PIN.
        let wrong = if code == "000000" { "000001" } else { "000000" };
        assert!(validate_pin(&mut st, wrong, now_epoch()).is_none());
        assert!(st.pin.is_some(), "a typo must not consume the live PIN");

        // The right code pairs exactly once (single use).
        let s1 = validate_pin(&mut st, &code, now_epoch()).expect("correct PIN pairs");
        assert!(session_valid(&st, &s1.token, now_epoch()));
        assert!(
            validate_pin(&mut st, &code, now_epoch()).is_none(),
            "PIN must be single-use"
        );

        // An expired PIN is refused, and an expired session stops working.
        let stale = issue_pin(&mut st, std::time::Duration::ZERO);
        assert!(validate_pin(&mut st, &stale, now_epoch()).is_none());
        let expired_now = s1.expires_epoch + 1;
        assert!(!session_valid(&st, &s1.token, expired_now));
    }

    #[test]
    fn pairing_attempts_are_limited_per_peer() {
        let mut st = LanState::default();
        for _ in 0..PAIR_ATTEMPT_LIMIT {
            assert!(note_attempt(&mut st, "192.168.5.5"));
        }
        assert!(
            !note_attempt(&mut st, "192.168.5.5"),
            "11th guess must be locked out"
        );
        // A different peer keeps its own budget.
        assert!(note_attempt(&mut st, "192.168.5.6"));
    }

    #[test]
    fn access_and_sessions_survive_a_restart() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("serve-access.json");
        let mut st = LanState {
            enabled: true,
            ..Default::default()
        };
        st.sessions.push(SessionRecord {
            token: "live-token".into(),
            expires_epoch: now_epoch() + 3600,
        });
        st.sessions.push(SessionRecord {
            token: "dead-token".into(),
            expires_epoch: now_epoch() - 1,
        });
        persist_access_to(&path, &st);

        let mut reloaded = LanState::default();
        load_access_from(&path, &mut reloaded);
        assert!(reloaded.enabled, "the toggle survives a restart");
        assert!(session_valid(&reloaded, "live-token", now_epoch()));
        assert!(
            !session_valid(&reloaded, "dead-token", now_epoch()),
            "expired sessions drop out"
        );
    }

    /// Request-shape helper: same as `post_json` but lets a test present
    /// as a specific peer (ConnectInfo) and carry a cookie.
    async fn request_as(
        app: &Router,
        method: &str,
        path: &str,
        body: &str,
        peer: std::net::SocketAddr,
        cookie: Option<&str>,
    ) -> (StatusCode, serde_json::Value, Option<String>) {
        let mut builder = Request::builder().method(method).uri(path);
        if !body.is_empty() {
            builder = builder.header(CONTENT_TYPE, "application/json");
        }
        if let Some(c) = cookie {
            builder = builder.header(axum::http::header::COOKIE, c);
        }
        let mut req = builder.body(Body::from(body.to_string())).unwrap();
        req.extensions_mut()
            .insert(axum::extract::ConnectInfo(peer));
        let resp = app.clone().oneshot(req).await.unwrap();
        let status = resp.status();
        let set_cookie = resp
            .headers()
            .get(axum::http::header::SET_COOKIE)
            .and_then(|v| v.to_str().ok())
            .map(str::to_string);
        let bytes = axum::body::to_bytes(resp.into_body(), usize::MAX)
            .await
            .unwrap();
        let json = serde_json::from_slice(&bytes).unwrap_or(serde_json::Value::Null);
        (status, json, set_cookie)
    }

    const LOOPBACK: &str = "127.0.0.1:51234";
    const LAN_PEER: &str = "192.168.5.5:55555";

    #[tokio::test]
    async fn lan_peer_must_pair_before_any_data_route() {
        // The flow test drives the process-global LAN state and pairing
        // writes the access file, so point the data dir at a tempdir.
        let dir = tempfile::tempdir().unwrap();
        unsafe { std::env::set_var("LTS_DATA_DIR", dir.path()) };
        *lan_lock() = LanState::default();
        let app = test_router();
        let local: std::net::SocketAddr = LOOPBACK.parse().unwrap();
        let peer: std::net::SocketAddr = LAN_PEER.parse().unwrap();

        // LAN access is switched from the operator (loopback) only.
        let (status, json, _) = request_as(
            &app,
            "POST",
            "/lan/enable",
            r#"{"enabled":true}"#,
            peer,
            None,
        )
        .await;
        assert_eq!(
            status,
            StatusCode::FORBIDDEN,
            "LAN peer must not toggle: {json}"
        );

        let (status, json, _) = request_as(
            &app,
            "POST",
            "/lan/enable",
            r#"{"enabled":true}"#,
            local,
            None,
        )
        .await;
        assert_eq!(status, StatusCode::OK, "loopback toggles: {json}");
        let pin = json["pin"].as_str().unwrap_or_default().to_string();
        assert_eq!(
            pin.len(),
            6,
            "the toggle hands the operator a 6-digit PIN: {json}"
        );
        assert!(
            json["traffic_note"]
                .as_str()
                .unwrap()
                .contains("unencrypted")
        );

        // The unpaired LAN peer is refused on every data route...
        let (status, json, _) = request_as(&app, "POST", "/api/app_mode", "{}", peer, None).await;
        assert_eq!(
            status,
            StatusCode::UNAUTHORIZED,
            "unpaired peer must get 401: {json}"
        );
        assert!(json["error"].as_str().unwrap().contains("pairing required"));
        let (status, _, _) = request_as(&app, "GET", "/api/progress/events", "", peer, None).await;
        assert_eq!(status, StatusCode::UNAUTHORIZED);
        let (status, _, _) =
            request_as(&app, "GET", "/media/packs/a/b/c.wav", "", peer, None).await;
        assert_eq!(status, StatusCode::UNAUTHORIZED);
        // ...but loopback keeps working untouched.
        let (status, _, _) = request_as(&app, "POST", "/api/app_mode", "{}", local, None).await;
        assert_eq!(status, StatusCode::OK);

        // A wrong PIN is refused (and counted); the right one sets a
        // session cookie.
        let (status, _, _) =
            request_as(&app, "POST", "/pair", r#"{"pin":"000000"}"#, peer, None).await;
        if pin != "000000" {
            assert_eq!(status, StatusCode::FORBIDDEN);
        }
        let (status, json, set_cookie) = request_as(
            &app,
            "POST",
            "/pair",
            &format!(r#"{{"pin":"{pin}"}}"#),
            peer,
            None,
        )
        .await;
        assert_eq!(status, StatusCode::OK, "correct PIN pairs: {json}");
        assert_eq!(json["paired"], true);
        let cookie = set_cookie.expect("pairing sets a session cookie");
        assert!(cookie.contains(SESSION_COOKIE) && cookie.contains("HttpOnly"));
        let cookie = cookie.split(';').next().unwrap().to_string();

        // The paired peer now reaches data routes; the PIN is spent and
        // a re-pair without a fresh PIN fails.
        let (status, json, _) =
            request_as(&app, "POST", "/api/app_mode", "{}", peer, Some(&cookie)).await;
        assert_eq!(status, StatusCode::OK, "paired peer reads: {json}");
        let (status, _, _) =
            request_as(&app, "POST", "/pair", r#"{"pin":"000000"}"#, peer, None).await;
        assert_eq!(status, StatusCode::FORBIDDEN, "the PIN was single-use");

        // A paired peer still cannot read or change LAN settings.
        let (status, _, _) = request_as(&app, "GET", "/lan/status", "", peer, Some(&cookie)).await;
        assert_eq!(status, StatusCode::FORBIDDEN);
        let (status, _, _) = request_as(
            &app,
            "POST",
            "/lan/enable",
            r#"{"enabled":false}"#,
            peer,
            Some(&cookie),
        )
        .await;
        assert_eq!(status, StatusCode::FORBIDDEN);
        // The operator sees the PIN on loopback.
        let (status, json, _) = request_as(&app, "GET", "/lan/status", "", local, None).await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(json["enabled"], true);
        assert!(json["pin"].is_string(), "loopback sees a live PIN: {json}");
        // And the pairing persisted to the access file for a restart.
        let text = std::fs::read_to_string(dir.path().join("serve-access.json")).unwrap();
        let doc: PersistedAccess = serde_json::from_str(&text).unwrap();
        assert!(doc.lan_enabled);
        assert_eq!(doc.sessions.len(), 1);

        // A rotate replaces the shown PIN for the operator (and no peer
        // may rotate it).
        let (status, json, _) = request_as(&app, "POST", "/lan/rotate", "{}", local, None).await;
        assert_eq!(status, StatusCode::OK, "operator rotates: {json}");
        let fresh = json["pin"].as_str().unwrap_or_default().to_string();
        assert_eq!(fresh.len(), 6, "rotated PIN is 6 digits: {json}");
        let (status, _, _) =
            request_as(&app, "POST", "/lan/rotate", "{}", peer, Some(&cookie)).await;
        assert_eq!(
            status,
            StatusCode::FORBIDDEN,
            "a paired peer cannot rotate the PIN"
        );
        // The fresh PIN pairs again (a second device).
        let (status, _, set_cookie2) = request_as(
            &app,
            "POST",
            "/pair",
            &format!(r#"{{"pin":"{fresh}"}}"#),
            peer,
            None,
        )
        .await;
        assert_eq!(status, StatusCode::OK, "the rotated PIN pairs");
        assert!(set_cookie2.is_some());

        // Leave global state clean for other tests.
        *lan_lock() = LanState::default();
        unsafe { std::env::remove_var("LTS_DATA_DIR") };
    }
}
