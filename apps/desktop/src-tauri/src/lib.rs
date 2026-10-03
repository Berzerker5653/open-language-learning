//! Native shell for the desktop app. The web UI is outside the native trust
//! boundary: every command argument is validated here, capabilities are
//! least-privilege, and no arbitrary paths come from rendered content
//! (docs/07 "Native privilege and provider isolation").
//!
//! UX-001 onboarding surface: local profile creation (no account),
//! bundled Japanese pack install (allowlisted ids only — the UI never
//! supplies paths), and an honest privacy notice (docs/08).

use serde::Serialize;
use std::path::Path;
use std::path::PathBuf;

/// App mode reported to the UI. `smoke` is set only when the launcher
/// provides a smoke marker path (automated launch/home-route test).
#[derive(Serialize)]
struct AppMode {
    smoke: bool,
}

#[tauri::command]
fn app_mode() -> AppMode {
    AppMode {
        smoke: std::env::var("LTS_SMOKE_FILE").is_ok(),
    }
}

/// Called by the home route after first paint in smoke mode. Writes the
/// marker and exits 0; ignored entirely outside smoke mode.
#[tauri::command]
fn smoke_ack(app: tauri::AppHandle, note: String) {
    if let Ok(path) = std::env::var("LTS_SMOKE_FILE") {
        let _ = std::fs::write(path, format!("smoke-ok {note}"));
    }
    app.exit(0);
}

// ---------------------------------------------------------------------------
// UX-001: privacy-first onboarding
// ---------------------------------------------------------------------------

#[derive(Serialize)]
struct PrivacyNotice {
    title: String,
    points: Vec<String>,
}

/// The privacy behavior the app actually implements today (docs/08);
/// never overstates.
#[tauri::command]
fn privacy_notice() -> PrivacyNotice {
    PrivacyNotice {
        title: "Your data stays on this device".into(),
        points: vec![
            "No account, no sign-up, no network required. Profiles are local.".into(),
            "Learning evidence (answers, support use, timing) is stored only in a local database."
                .into(),
            "The microphone is optional. You can skip it now and enable it later; skipping never blocks progress."
                .into(),
            "If the microphone is enabled, audio is processed locally by default. Any provider that uploads audio requires your explicit enablement plus an on-screen notice first."
                .into(),
            "You can export or delete your local profile data at any time."
                .into(),
        ],
    }
}

#[derive(Serialize, Clone)]
struct PackCandidate {
    pack_id: String,
    display_name: String,
    locale: String,
    maturity: String,
}

/// Bundled pack candidates. The UI selects by id; paths never cross the
/// IPC boundary (docs/07).
fn bundled_packs() -> Vec<(PackCandidate, PathBuf)> {
    let root =
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../../tests/fixtures/packs/ja-demo");
    vec![(
        PackCandidate {
            pack_id: "org.openlanguage.ja-demo".into(),
            display_name: "Japanese — demo lexicon (EDRDG-derived)".into(),
            locale: "ja-JP".into(),
            maturity: "community".into(),
        },
        root,
    )]
}

#[tauri::command]
fn available_packs() -> Vec<PackCandidate> {
    bundled_packs().into_iter().map(|(c, _)| c).collect()
}

fn data_dir() -> PathBuf {
    match std::env::var("LTS_DATA_DIR") {
        Ok(d) => PathBuf::from(d),
        Err(_) => {
            let home = std::env::var("HOME")
                .map(PathBuf::from)
                .unwrap_or_else(|_| PathBuf::from("."));
            home.join(".local/share/openlang")
        }
    }
}

/// Build + install a bundled pack into the local pack store and record
/// the installation. Allowlisted ids only.
fn install_bundled_pack(data: &Path, pack_id: &str) -> Result<PackCandidate, String> {
    let (candidate, dir) = bundled_packs()
        .into_iter()
        .find(|(c, _)| c.pack_id == pack_id)
        .ok_or_else(|| "unknown pack id".to_string())?;
    let (bytes, _sha) = lts_langpack::archive::build(&dir).map_err(|e| e.to_string())?;
    let outcome =
        lts_langpack::archive::install(&bytes, &data.join("packs")).map_err(|e| e.to_string())?;
    let store = lts_storage::Store::open(data.join("profiles.db")).map_err(|e| e.to_string())?;
    store
        .record_installation(&lts_storage::PackInstallation {
            pack_id: outcome.pack_id.clone(),
            version: outcome.version.clone(),
            installed_at: rfc3339_utc(now_secs()),
            trust_state: "community".into(),
        })
        .map_err(|e| e.to_string())?;
    Ok(candidate)
}

#[tauri::command]
fn install_pack(pack_id: String) -> Result<PackCandidate, String> {
    install_bundled_pack(&data_dir(), &pack_id)
}

#[derive(Serialize)]
struct ProfileInfo {
    id: String,
    display_name: String,
}

/// Create the local profile (no account).
fn create_local_profile(data: &Path, display_name: &str) -> Result<ProfileInfo, String> {
    let store = lts_storage::Store::open(data.join("profiles.db")).map_err(|e| e.to_string())?;
    let profile = store
        .create_profile(display_name, &rfc3339_utc(now_secs()))
        .map_err(|e| e.to_string())?;
    Ok(ProfileInfo {
        id: profile.id,
        display_name: profile.display_name,
    })
}

#[tauri::command]
fn create_profile(display_name: String) -> Result<ProfileInfo, String> {
    create_local_profile(&data_dir(), &display_name)
}

/// Record which pack the profile studies plus the microphone decision
/// (skippable; never gates progress).
fn finish_onboarding(
    data: &Path,
    profile_id: &str,
    pack_id: &str,
    mic_enabled: bool,
) -> Result<(), String> {
    let store = lts_storage::Store::open(data.join("profiles.db")).map_err(|e| e.to_string())?;
    let version = lts_langpack::archive::current_version(pack_id, &data.join("packs"))
        .ok_or_else(|| "pack not installed".to_string())?;
    store
        .select_pack(profile_id, pack_id, &version)
        .map_err(|e| e.to_string())?;
    store
        .set_setting(
            profile_id,
            "microphone-enabled",
            &serde_json::json!(mic_enabled),
        )
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn complete_onboarding(
    profile_id: String,
    pack_id: String,
    mic_enabled: bool,
) -> Result<(), String> {
    finish_onboarding(&data_dir(), &profile_id, &pack_id, mic_enabled)
}

fn now_secs() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

/// RFC 3339 UTC without extra crates: days-to-civil (Howard Hinnant's
/// algorithm).
fn rfc3339_utc(secs: u64) -> String {
    let days = (secs / 86_400) as i64;
    let rem = secs % 86_400;
    let z = days + 719_468;
    let era = (if z >= 0 { z } else { z - 146_096 }) / 146_097;
    let doe = (z - era * 146_097) as u64;
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let y = yoe as i64 + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = if m <= 2 { y + 1 } else { y };
    format!(
        "{y:04}-{:02}-{:02}T{:02}:{:02}:{:02}Z",
        m,
        d,
        rem / 3600,
        (rem % 3600) / 60,
        rem % 60
    )
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            app_mode,
            smoke_ack,
            privacy_notice,
            available_packs,
            install_pack,
            create_profile,
            complete_onboarding
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rfc3339_conversion_is_correct() {
        assert_eq!(rfc3339_utc(0), "1970-01-01T00:00:00Z");
        assert_eq!(rfc3339_utc(1_762_128_000), "2025-11-03T00:00:00Z");
    }

    #[test]
    fn bundled_japanese_pack_installs_and_records() {
        let tmp = tempfile::tempdir().unwrap();
        let data = tmp.path();
        let candidate = install_bundled_pack(data, "org.openlanguage.ja-demo").unwrap();
        assert_eq!(candidate.locale, "ja-JP");
        let store = lts_storage::Store::open(data.join("profiles.db")).unwrap();
        let insts = store.installations().unwrap();
        assert!(
            insts
                .iter()
                .any(|i| i.pack_id == "org.openlanguage.ja-demo")
        );

        // Unknown ids are rejected (allowlist; no path from UI).
        assert!(install_bundled_pack(data, "org.evil.any").is_err());

        // Profile + selection + skippable mic setting round-trip.
        let p = create_local_profile(data, "Hunter").unwrap();
        finish_onboarding(data, &p.id, "org.openlanguage.ja-demo", false).unwrap();
        let selected = store.selected_packs(&p.id).unwrap();
        assert_eq!(selected[0].0, "org.openlanguage.ja-demo");
        assert_eq!(
            store.get_setting(&p.id, "microphone-enabled").unwrap(),
            Some(serde_json::json!(false))
        );
    }
}
