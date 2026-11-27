// ---------------------------------------------------------------------------
// G4-EXPLAIN-001 (AI-001 first slice): the opt-in instant explanation
// provider. Owner-locked posture (2026-11-23 scope decision): an explain is
// INFORMATION ONLY — never a grade, never mastery or scheduler evidence.
//
// Shape of the contract:
//   * Off by default. `ai-enabled` (bool, default false), `ai-base-url`
//     (string, default empty — the user pastes their own endpoint; no lab
//     port or cloud vendor is baked in), `ai-model` (string), and
//     `ai-consent` (bool, default false) are stored as ordinary per-profile
//     settings, revocable from Settings.
//   * `explain_card` is the only path to a provider: it refuses (with an
//     honest reason) unless the feature is on, a base URL exists, and the
//     learner has granted consent. The request goes to the OpenAI-compatible
//     `POST {base_url}/chat/completions` endpoint ONLY.
//   * Hard invariant: this module performs ZERO writes to any store. It
//     reads settings, speaks HTTP, and returns text. Nothing it sees lands
//     in the scheduler, mastery, practice, error-ledger, mined, or lookup
//     tables — pinned by `explain_path_performs_zero_store_writes` below.
// ---------------------------------------------------------------------------

use lts_storage::Store;
use serde::Serialize;
use std::path::Path;

/// Settings keys. Written only by the settings/consent commands below —
/// `explain_card` itself never writes, not even these.
const KEY_ENABLED: &str = "ai-enabled";
const KEY_BASE_URL: &str = "ai-base-url";
const KEY_MODEL: &str = "ai-model";
const KEY_CONSENT: &str = "ai-consent";

#[derive(Serialize)]
pub(crate) struct ExplainSettings {
    pub ai_enabled: bool,
    pub ai_base_url: String,
    pub ai_model: String,
    pub consent_granted: bool,
}

fn read_settings(store: &Store, profile_id: &str) -> ExplainSettings {
    let get = |key: &str| store.get_setting(profile_id, key).ok().flatten();
    ExplainSettings {
        // Off-by-default is the whole privacy posture: an unset or corrupt
        // value reads as OFF, never on.
        ai_enabled: get(KEY_ENABLED).and_then(|v| v.as_bool()).unwrap_or(false),
        ai_base_url: get(KEY_BASE_URL)
            .and_then(|v| v.as_str().map(String::from))
            .unwrap_or_default(),
        ai_model: get(KEY_MODEL)
            .and_then(|v| v.as_str().map(String::from))
            .unwrap_or_default(),
        consent_granted: get(KEY_CONSENT).and_then(|v| v.as_bool()).unwrap_or(false),
    }
}

fn explain_settings_at(data: &Path, profile_id: &str) -> Result<ExplainSettings, String> {
    let store = Store::open(data.join("profiles.db")).map_err(|e| e.to_string())?;
    Ok(read_settings(&store, profile_id))
}

#[tauri::command]
pub(crate) fn explain_settings(profile_id: String) -> Result<ExplainSettings, String> {
    explain_settings_at(&crate::data_dir(), &profile_id)
}

/// Store-side implementation shared by the Tauri command and the tests, so
/// normalization (trim + no trailing slash) is pinned once, not forked.
fn set_explain_settings_at(
    store: &Store,
    profile_id: &str,
    ai_enabled: Option<bool>,
    ai_base_url: Option<String>,
    ai_model: Option<String>,
) -> Result<ExplainSettings, String> {
    if let Some(url) = &ai_base_url {
        let trimmed = url.trim();
        if !(trimmed.starts_with("http://") || trimmed.starts_with("https://")) {
            return Err("the AI base URL must start with http:// or https://".to_string());
        }
    }
    if let Some(on) = ai_enabled {
        store
            .set_setting(profile_id, KEY_ENABLED, &serde_json::json!(on))
            .map_err(|e| e.to_string())?;
    }
    if let Some(url) = &ai_base_url {
        // Normalize once on store: no trailing slash, so every reader builds
        // `{base}/chat/completions` the same way.
        let stored = url.trim().trim_end_matches('/');
        store
            .set_setting(profile_id, KEY_BASE_URL, &serde_json::json!(stored))
            .map_err(|e| e.to_string())?;
    }
    if let Some(model) = &ai_model {
        store
            .set_setting(profile_id, KEY_MODEL, &serde_json::json!(model.trim()))
            .map_err(|e| e.to_string())?;
    }
    Ok(read_settings(store, profile_id))
}

#[tauri::command]
pub(crate) fn set_explain_settings(
    profile_id: String,
    ai_enabled: Option<bool>,
    ai_base_url: Option<String>,
    ai_model: Option<String>,
) -> Result<ExplainSettings, String> {
    let store = Store::open(crate::data_dir().join("profiles.db")).map_err(|e| e.to_string())?;
    set_explain_settings_at(&store, &profile_id, ai_enabled, ai_base_url, ai_model)
}

#[tauri::command]
pub(crate) fn set_explain_consent(
    profile_id: String,
    granted: bool,
) -> Result<ExplainSettings, String> {
    let store = Store::open(crate::data_dir().join("profiles.db")).map_err(|e| e.to_string())?;
    store
        .set_setting(&profile_id, KEY_CONSENT, &serde_json::json!(granted))
        .map_err(|e| e.to_string())?;
    Ok(read_settings(&store, &profile_id))
}

/// Build the wire body for the OpenAI-compatible chat-completions call.
/// Kept pure so tests can pin the payload without any network.
fn chat_body(model: &str, card_text: &str, l1: &str, l2: &str) -> serde_json::Value {
    // An empty model string is sent as `default`: some local servers accept
    // any string, none of them get a vendor name invented for them here.
    let model = if model.trim().is_empty() {
        "default"
    } else {
        model.trim()
    };
    serde_json::json!({
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": format!(
                    "You are the explain button in a language-learning app. The learner is a \
                     {l1} speaker learning {l2}. Explain the item below for the learner in {l1}: \
                     what it means and the one or two grammar points that matter most. Be brief. \
                     This is an information panel only: never grade the learner, never say \
                     correct or incorrect, and never encourage or discourage."
                ),
            },
            {
                "role": "user",
                "content": format!(
                    "Learning direction: {l1} → {l2}.\nItem to explain:\n{card_text}"
                ),
            },
        ],
        // A creative temperature is the opposite of what an explanation wants.
        "temperature": 0.0,
        "stream": false,
    })
}

/// The zero-write provider call. Every gate is checked BEFORE any socket is
/// opened, so a disabled/consentless app never touches the network at all.
fn explain_card_at(
    data: &Path,
    profile_id: &str,
    card_text: &str,
    l1: &str,
    l2: &str,
) -> Result<String, String> {
    let settings = explain_settings_at(data, profile_id)?;
    if !settings.ai_enabled {
        return Err(
            "AI explanations are off. Turn them on in Settings if you want them.".to_string(),
        );
    }
    if settings.ai_base_url.is_empty() {
        return Err(
            "No explanation endpoint is configured. Add your model's base URL in Settings."
                .to_string(),
        );
    }
    if !settings.consent_granted {
        // The UI asks first; this is the backstop so no caller can skip it.
        return Err("AI explanation consent has not been granted.".to_string());
    }
    let card_text = card_text.trim();
    if card_text.is_empty() {
        return Err("there is nothing on this card to explain".to_string());
    }
    let base = settings.ai_base_url.trim_end_matches('/');
    if !(base.starts_with("http://") || base.starts_with("https://")) {
        return Err("the configured AI base URL is not an http(s) endpoint".to_string());
    }
    let url = format!("{base}/chat/completions");
    let body = chat_body(&settings.ai_model, card_text, l1, l2);
    let response = ureq::AgentBuilder::new()
        // A stuck local server must never hang the exercise card.
        .timeout_connect(std::time::Duration::from_secs(10))
        .timeout_read(std::time::Duration::from_secs(60))
        .build()
        .post(&url)
        // ureq resolves without its `json` feature in this workspace (see
        // Cargo.lock), so the body rides as a plain JSON string.
        .set("content-type", "application/json")
        .send_string(&serde_json::to_string(&body).unwrap());
    let text = match response {
        Ok(resp) => resp.into_string().map_err(|_| {
            "the explanation endpoint replied with something unreadable".to_string()
        })?,
        Err(ureq::Error::Status(code, _)) => {
            return Err(format!(
                "the explanation endpoint answered HTTP {code} — nothing was stored"
            ));
        }
        Err(_) => {
            return Err(
                "the explanation endpoint could not be reached — nothing was stored".to_string(),
            );
        }
    };
    let value: serde_json::Value = serde_json::from_str(&text)
        .map_err(|_| "the explanation endpoint replied with something unreadable".to_string())?;
    let content = value
        .get("choices")
        .and_then(|c| c.get(0))
        .and_then(|c| c.get("message"))
        .and_then(|m| m.get("content"))
        .and_then(|c| c.as_str())
        .map(str::trim)
        .filter(|c| !c.is_empty());
    content
        .map(String::from)
        .ok_or_else(|| "the explanation endpoint returned an empty explanation".to_string())
}

#[tauri::command]
pub(crate) fn explain_card(
    profile_id: String,
    card_text: String,
    l1: String,
    l2: String,
) -> Result<String, String> {
    explain_card_at(&crate::data_dir(), &profile_id, &card_text, &l1, &l2)
}

// ---------------------------------------------------------------------------
// Tests. Every provider call is answered by a local mock server on
// 127.0.0.1 (ephemeral port) — the suite never touches an external network,
// and the gate log says exactly that.
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::{Read, Write};
    use std::net::{TcpListener, TcpStream};
    use std::sync::Arc;
    use std::sync::atomic::{AtomicUsize, Ordering};

    /// A one-shot local HTTP server: answers `status` with `body_json` and
    /// records how many requests arrived plus the last request body.
    struct MockEndpoint {
        base_url: String,
        hits: Arc<AtomicUsize>,
        last_body: Arc<std::sync::Mutex<String>>,
        joiner: Option<std::thread::JoinHandle<()>>,
    }

    impl MockEndpoint {
        fn start(status: u16, body_json: &'static str) -> MockEndpoint {
            let listener = TcpListener::bind("127.0.0.1:0").unwrap();
            let port = listener.local_addr().unwrap().port();
            let hits = Arc::new(AtomicUsize::new(0));
            let last_body = Arc::new(std::sync::Mutex::new(String::new()));
            let (hits_t, body_t) = (hits.clone(), last_body.clone());
            let joiner = std::thread::spawn(move || {
                // Keep serving so a test that fires twice is still measured.
                for stream in listener.incoming() {
                    let Ok(mut stream) = stream else { break };
                    let body = read_request(&mut stream);
                    hits_t.fetch_add(1, Ordering::SeqCst);
                    *body_t.lock().unwrap() = body;
                    let head = if status == 200 {
                        "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n"
                    } else {
                        "HTTP/1.1 500 Internal Server Error\r\nContent-Type: application/json\r\n"
                    };
                    let _ = stream.write_all(
                        format!(
                            "{head}Content-Length: {}\r\n\r\n{body_json}",
                            body_json.len()
                        )
                        .as_bytes(),
                    );
                    let _ = stream.flush();
                }
            });
            MockEndpoint {
                base_url: format!("http://127.0.0.1:{port}"),
                hits,
                last_body,
                joiner: Some(joiner),
            }
        }

        fn hits(&self) -> usize {
            self.hits.load(Ordering::SeqCst)
        }

        fn body(&self) -> String {
            self.last_body.lock().unwrap().clone()
        }
    }

    impl Drop for MockEndpoint {
        fn drop(&mut self) {
            if let Some(j) = self.joiner.take() {
                drop(j);
            }
        }
    }

    fn read_request(stream: &mut TcpStream) -> String {
        let mut buf = [0u8; 1];
        let mut head_bytes: Vec<u8> = Vec::new();
        // Headers end at the blank line.
        while !head_bytes.ends_with(b"\r\n\r\n") {
            if stream.read(&mut buf).unwrap_or(0) == 0 {
                break;
            }
            head_bytes.push(buf[0]);
        }
        let head = String::from_utf8_lossy(&head_bytes);
        let len = head
            .lines()
            .find_map(|l| {
                let l = l.to_ascii_lowercase();
                l.strip_prefix("content-length:")
                    .and_then(|v| v.trim().parse::<usize>().ok())
            })
            .unwrap_or(0);
        let mut body_bytes: Vec<u8> = Vec::new();
        while body_bytes.len() < len {
            if stream.read(&mut buf).unwrap_or(0) == 0 {
                break;
            }
            body_bytes.push(buf[0]);
        }
        // The body is UTF-8 JSON (the card text may be Cyrillic or kana):
        // decoding byte-as-char would latin-1-mojibake it and break the pins.
        String::from_utf8_lossy(&body_bytes).into_owned()
    }

    fn seed(data: &Path) -> String {
        let p = crate::create_local_profile(data, "ExplainTester").unwrap();
        p.id
    }

    fn ok_json() -> &'static str {
        r#"{"choices":[{"message":{"role":"assistant","content":"  It means \"hello\".  "}}]}"#
    }

    #[test]
    fn defaults_are_off_and_consentless() {
        let tmp = tempfile::tempdir().unwrap();
        let id = seed(tmp.path());
        let s = explain_settings_at(tmp.path(), &id).unwrap();
        assert!(!s.ai_enabled);
        assert_eq!(s.ai_base_url, "");
        assert!(!s.consent_granted);
    }

    #[test]
    fn settings_roundtrip_stores_user_typed_values() {
        let tmp = tempfile::tempdir().unwrap();
        let id = seed(tmp.path());
        let store = Store::open(tmp.path().join("profiles.db")).unwrap();
        let stored = {
            set_explain_settings_at(
                &store,
                &id,
                Some(true),
                Some("http://127.0.0.1:9/v1/".to_string()),
                Some(" my-model ".to_string()),
            )
            .unwrap()
        };
        assert!(stored.ai_enabled);
        assert_eq!(stored.ai_base_url, "http://127.0.0.1:9/v1");
        assert_eq!(stored.ai_model, "my-model");
        let again = explain_settings_at(tmp.path(), &id).unwrap();
        assert_eq!(again.ai_base_url, "http://127.0.0.1:9/v1");
    }

    // (Tests call the shared set_explain_settings_at from super — the same
    // code path the Tauri command runs, so pins exercise production logic.)

    fn arm(data: &Path, id: &str, url: &str, consent: bool) {
        let store = Store::open(data.join("profiles.db")).unwrap();
        set_explain_settings_at(
            &store,
            id,
            Some(true),
            Some(url.to_string()),
            Some("m".into()),
        )
        .unwrap();
        store
            .set_setting(id, KEY_CONSENT, &serde_json::json!(consent))
            .unwrap();
    }

    #[test]
    fn disabled_offers_no_network_and_is_honest() {
        let mock = MockEndpoint::start(200, ok_json());
        let tmp = tempfile::tempdir().unwrap();
        let id = seed(tmp.path());
        let e = explain_card_at(tmp.path(), &id, "привет", "en", "ru").unwrap_err();
        assert!(e.contains("off"), "{e}");
        assert_eq!(
            mock.hits(),
            0,
            "a disabled provider must never open a socket"
        );
    }

    #[test]
    fn empty_base_url_is_unavailable_without_network() {
        let mock = MockEndpoint::start(200, ok_json());
        let tmp = tempfile::tempdir().unwrap();
        let id = seed(tmp.path());
        let store = Store::open(tmp.path().join("profiles.db")).unwrap();
        set_explain_settings_at(&store, &id, Some(true), None, None).unwrap();
        let e = explain_card_at(tmp.path(), &id, "привет", "en", "ru").unwrap_err();
        assert!(e.contains("base URL"), "{e}");
        assert_eq!(mock.hits(), 0);
    }

    #[test]
    fn first_explain_requires_consent_and_sends_nothing() {
        let mock = MockEndpoint::start(200, ok_json());
        let tmp = tempfile::tempdir().unwrap();
        let id = seed(tmp.path());
        arm(tmp.path(), &id, &mock.base_url, false);
        let e = explain_card_at(tmp.path(), &id, "привет", "en", "ru").unwrap_err();
        assert!(e.to_lowercase().contains("consent"), "{e}");
        assert_eq!(mock.hits(), 0, "no consent means nothing may leave the app");
    }

    #[test]
    fn consented_explain_round_trips_and_names_direction() {
        let mock = MockEndpoint::start(200, ok_json());
        let tmp = tempfile::tempdir().unwrap();
        let id = seed(tmp.path());
        arm(tmp.path(), &id, &mock.base_url, true);
        let out = explain_card_at(tmp.path(), &id, "привет", "en", "ru").unwrap();
        assert_eq!(out, "It means \"hello\".", "content is trimmed");
        assert_eq!(mock.hits(), 1);
        let body = mock.body();
        assert!(
            body.contains("привет"),
            "the card text is what is sent: {body}"
        );
        assert!(body.contains("en → ru"), "the direction is named: {body}");
        assert!(
            !body.to_lowercase().contains("grade the learner as"),
            "{body}"
        );
    }

    #[test]
    fn unreachable_endpoint_is_an_honest_failure() {
        // A bound-then-closed port: a guaranteed connection failure offline.
        let port = {
            let l = TcpListener::bind("127.0.0.1:0").unwrap();
            l.local_addr().unwrap().port()
        };
        let tmp = tempfile::tempdir().unwrap();
        let id = seed(tmp.path());
        arm(tmp.path(), &id, &format!("http://127.0.0.1:{port}"), true);
        let e = explain_card_at(tmp.path(), &id, "привет", "en", "ru").unwrap_err();
        assert!(e.contains("could not be reached"), "{e}");
        assert!(e.contains("nothing was stored"), "{e}");
    }

    #[test]
    fn server_error_is_an_honest_failure() {
        let mock = MockEndpoint::start(500, r#"{"error":"boom"}"#);
        let tmp = tempfile::tempdir().unwrap();
        let id = seed(tmp.path());
        arm(tmp.path(), &id, &mock.base_url, true);
        let e = explain_card_at(tmp.path(), &id, "привет", "en", "ru").unwrap_err();
        assert!(e.contains("HTTP 500"), "{e}");
        assert!(e.contains("nothing was stored"), "{e}");
    }

    #[test]
    fn empty_explanation_content_is_a_failure_not_blank_ui() {
        let mock = MockEndpoint::start(200, r#"{"choices":[{"message":{"content":"   "}}]}"#);
        let tmp = tempfile::tempdir().unwrap();
        let id = seed(tmp.path());
        arm(tmp.path(), &id, &mock.base_url, true);
        let e = explain_card_at(tmp.path(), &id, "привет", "en", "ru").unwrap_err();
        assert!(e.contains("empty explanation"), "{e}");
    }

    /// G4-EXPLAIN-001 acceptance, the hard invariant: the explain path
    /// performs ZERO writes to the scheduler, mastery, practice, error-ledger,
    /// mined, or lookup stores. Snapshots are taken AFTER consent is armed
    /// (a legitimate settings write) so only the explain call itself is
    /// measured.
    #[test]
    fn explain_path_performs_zero_store_writes() {
        let mock = MockEndpoint::start(200, ok_json());
        let tmp = tempfile::tempdir().unwrap();
        let id = seed(tmp.path());
        arm(tmp.path(), &id, &mock.base_url, true);
        {
            let store = Store::open(tmp.path().join("profiles.db")).unwrap();
            // Give the stores non-empty contents so a write would show.
            store
                .save_scheduler_state(
                    &id,
                    &lts_storage::SchedulerRecord {
                        item_id: "g4-explain-probe".into(),
                        scheduler: "fsrs".into(),
                        params_json: "{}".into(),
                        due_at: "2026-11-26T00:00:00Z".into(),
                    },
                )
                .unwrap();
            store
                .record_word_lookup(
                    &id,
                    lts_storage::NewWordLookup {
                        id: "g4-explain-probe",
                        surface: "привет",
                        lemma: None,
                        story_id: "probe",
                        sentence_id: "probe",
                        created_at: "2026-11-26T00:00:00Z",
                    },
                )
                .unwrap();
            let before_sched = store.scheduler_state(&id).unwrap();
            let before_mastery = store.latest_mastery(&id).unwrap();
            let before_errors = store.error_ledger(&id).unwrap();
            let before_mined = store.mined_items(&id).unwrap();
            let before_lookups = store.word_lookups(&id).unwrap();
            explain_card_at(tmp.path(), &id, "привет", "en", "ru").unwrap();
            assert_eq!(store.scheduler_state(&id).unwrap(), before_sched);
            assert_eq!(store.latest_mastery(&id).unwrap(), before_mastery);
            assert_eq!(store.error_ledger(&id).unwrap(), before_errors);
            assert_eq!(store.mined_items(&id).unwrap(), before_mined);
            assert_eq!(store.word_lookups(&id).unwrap(), before_lookups);
        }
    }
}
