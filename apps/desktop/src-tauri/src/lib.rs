//! Native shell for the desktop app. The web UI is outside the native trust
//! boundary: every command argument is validated here, capabilities are
//! least-privilege, and no arbitrary paths come from rendered content
//! (docs/07 "Native privilege and provider isolation").
//!
//! UX-001 onboarding surface: local profile creation (no account),
//! bundled Japanese pack install (allowlisted ids only — the UI never
//! supplies paths), and an honest privacy notice (docs/08).

mod models;
mod packcache;
mod packs;
mod progress;
mod scenarios;
use lts_speech_api::{
    AcousticFeatureProvider, AlignmentProvider, PronunciationInterpreter, ProsodyProvider,
    SpeechSynthesisProvider,
};
use serde::{Deserialize, Serialize};
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

/// Called by the UI in smoke mode. Each ack appends one line to the
/// marker (launch handshake, then one per route in the POLISH-001
/// full-route walkthrough). The shell exits 0 only on the terminal
/// `routes-complete` / `walkthrough-error` note so the launcher can
/// assert the full route list. Ignored entirely outside smoke mode.
#[tauri::command]
fn smoke_ack(app: tauri::AppHandle, note: String) {
    if let Ok(path) = std::env::var("LTS_SMOKE_FILE") {
        use std::io::Write;
        if let Ok(mut f) = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(path)
        {
            let _ = writeln!(f, "smoke-ok {note}");
            if note.starts_with("goal-map:") {
                let count = note.split(':').nth(1).unwrap_or("?");
                let _ = writeln!(f, "goal-map-assert {count}");
            }
        }
        if note.starts_with("routes-complete") || note.starts_with("walkthrough-error") {
            app.exit(0);
        }
    }
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

/// Pack display names come from the pack manifest's own `display_name`
/// field — any posture suffix travels with the pack metadata, never a
/// hardcoded app-side string (K-47). Falls back to the pack id when no
/// manifest is present.
fn manifest_display_name(pack_path: &Path, pack_id: &str) -> String {
    std::fs::read_to_string(pack_path.join("manifest.yaml"))
        .ok()
        .and_then(|s| serde_yaml::from_str::<serde_yaml::Value>(&s).ok())
        .and_then(|v| {
            v.get("display_name")
                .and_then(|d| d.as_str())
                .map(String::from)
        })
        .unwrap_or_else(|| pack_id.to_string())
}
/// K-59 (ADR-0019 variant pattern): where a pack-bundled build's staged
/// pack sources live (`<resource_dir>/packs`). Set once at startup from
/// the resource dir, exactly like `BUNDLED_TTS`/`BUNDLED_SIDECAR`; unset
/// for bare/dev builds, which resolve from the repo tree as always.
static BUNDLED_PACKS: std::sync::OnceLock<PathBuf> = std::sync::OnceLock::new();

/// The dev-tree candidate table, named for reuse: production
/// `bundled_packs()` and the K-59 dev-precedence test read the same
/// table — one source of truth for the dev candidates.
const DEV_PACK_CANDIDATES: [(&str, &str, &str, &str); 2] = [
    (
        "org.openlanguage.ja-jp.reference",
        "ja-JP",
        "experimental",
        "languages/ja-JP",
    ),
    (
        "org.openlanguage.eo-demo",
        "eo",
        "community",
        "tests/fixtures/packs/eo-demo",
    ),
];

/// The pack-bundled variant's per-root sidecar, written by
/// `scripts/stage-pack-bundle.sh stage`. Fail-closed like the aligner
/// payload manifest: wrong schema version, unparsable shape, or an entry
/// whose pack directory is absent is an error that empties the candidate
/// list; a bundle never installs a pack it cannot name honestly.
#[derive(serde::Deserialize)]
struct BundledPacksSidecar {
    schema_version: u32,
    packs: Vec<BundledPackEntry>,
}

#[derive(serde::Deserialize)]
struct BundledPackEntry {
    pack_id: String,
    locale: String,
    maturity: String,
}

fn bundled_packs_at(
    repo_root: &Path,
    resource_root: Option<&Path>,
) -> Vec<(PackCandidate, PathBuf)> {
    // Dev first, exactly as before K-59: a repo tree is the fastest and
    // most current answer, and a shipped machine has none.
    if DEV_PACK_CANDIDATES
        .iter()
        .any(|(_, _, _, rel)| repo_root.join(rel).is_dir())
    {
        return DEV_PACK_CANDIDATES
            .iter()
            .map(|(pack_id, locale, maturity, rel)| {
                let path = repo_root.join(rel);
                (
                    PackCandidate {
                        pack_id: (*pack_id).into(),
                        display_name: manifest_display_name(&path, pack_id),
                        locale: (*locale).into(),
                        maturity: (*maturity).into(),
                    },
                    path,
                )
            })
            .collect();
    }
    let Some(root) = resource_root.filter(|r| r.is_dir()) else {
        return Vec::new();
    };
    let sidecar = match std::fs::read_to_string(root.join("BUNDLED.yaml")) {
        Ok(text) => match serde_yaml::from_str::<BundledPacksSidecar>(&text) {
            Ok(s) => s,
            Err(e) => {
                eprintln!("bundled packs: BUNDLED.yaml unreadable ({e}); abstaining");
                return Vec::new();
            }
        },
        Err(_) => {
            eprintln!(
                "bundled packs: no BUNDLED.yaml under {}; abstaining",
                root.display()
            );
            return Vec::new();
        }
    };
    if sidecar.schema_version != 1 {
        eprintln!(
            "bundled packs: unsupported BUNDLED.yaml schema_version {}; abstaining",
            sidecar.schema_version
        );
        return Vec::new();
    }
    sidecar
        .packs
        .iter()
        .filter_map(|entry| {
            let path = root.join(&entry.pack_id);
            if path.join("manifest.yaml").is_file() {
                Some((
                    PackCandidate {
                        pack_id: entry.pack_id.clone(),
                        display_name: manifest_display_name(&path, &entry.pack_id),
                        locale: entry.locale.clone(),
                        maturity: entry.maturity.clone(),
                    },
                    path,
                ))
            } else {
                eprintln!(
                    "bundled packs: {} named in BUNDLED.yaml but no manifest at {}; skipping",
                    entry.pack_id,
                    path.display()
                );
                None
            }
        })
        .collect()
}

/// Bundled pack candidates. The UI selects by id; paths never cross the
/// IPC boundary (docs/07).
fn bundled_packs() -> Vec<(PackCandidate, PathBuf)> {
    let repo_root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../..");
    bundled_packs_at(&repo_root, BUNDLED_PACKS.get().map(PathBuf::as_path))
}

#[tauri::command]
fn available_packs() -> Vec<PackCandidate> {
    bundled_packs().into_iter().map(|(c, _)| c).collect()
}

fn data_dir() -> PathBuf {
    let dir = match std::env::var("LTS_DATA_DIR") {
        Ok(d) => PathBuf::from(d),
        Err(_) => {
            let home = std::env::var("HOME")
                .map(PathBuf::from)
                .unwrap_or_else(|_| PathBuf::from("."));
            home.join(".local/share/openlang")
        }
    };
    // rusqlite will not create missing parent directories; without this a
    // first run fails to open profiles.db and onboarding silently stalls.
    let _ = std::fs::create_dir_all(&dir);
    dir
}

/// The same install, reporting every stage as it is entered (K-62). Building
/// the archive from the pack source is the slow part for a pack this size, so
/// the learner hears about it before it starts, not after.
fn install_bundled_pack_report(
    data: &Path,
    pack_id: &str,
    pack_source_root: Option<&Path>,
    mut report: impl FnMut(&packs::Progress),
) -> Result<PackCandidate, String> {
    // K-59: production passes None — resolution then goes through
    // `BUNDLED_PACKS`, which only a pack-bundled build sets, with the dev
    // repo tree preferred whenever it exists. An explicitly supplied
    // staged root (tests; no production caller) skips the dev preference
    // instead of sharing process state a parallel test could race.
    let repo_root = pack_source_root.map_or_else(
        || PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../.."),
        |_| PathBuf::from("/no-dev-tree"),
    );
    let (candidate, dir) = bundled_packs_at(
        &repo_root,
        pack_source_root.or(BUNDLED_PACKS.get().map(PathBuf::as_path)),
    )
    .into_iter()
    .find(|(c, _)| c.pack_id == pack_id)
    .ok_or_else(|| "unknown pack id".to_string())?;
    report(&progress::Progress::stage(
        "install-pack",
        pack_id,
        "prepare",
    ));
    let (bytes, _sha) = lts_langpack::archive::build(&dir).map_err(|e| e.to_string())?;
    report(&progress::Progress::stage(
        "install-pack",
        pack_id,
        "install",
    ));
    let outcome =
        lts_langpack::archive::install(&bytes, &data.join("packs")).map_err(|e| e.to_string())?;
    report(&progress::Progress::stage(
        "install-pack",
        pack_id,
        "record",
    ));
    let store = lts_storage::Store::open(data.join("profiles.db")).map_err(|e| e.to_string())?;
    store
        .record_installation(&lts_storage::PackInstallation {
            pack_id: outcome.pack_id.clone(),
            version: outcome.version.clone(),
            installed_at: rfc3339_utc(now_secs()),
            trust_state: "community".into(),
        })
        .map_err(|e| e.to_string())?;
    // K-63-follow: the install is already a wait the learner is told about, so
    // parse the pack here instead of making their first click pay for it.
    warm_pack(data, &outcome.pack_id, &outcome.version);
    Ok(candidate)
}

/// K-63-follow: warm every content cache for one installed pack version — the
/// parsed pack, its activity runtime, its lexicon, its claim tallies, and the
/// units and assessments a placement plan needs.
/// Best-effort by design: a pack that will not load stays uncached so the
/// command that actually needs it reports the real error rather than a priming
/// failure. Nothing here changes what any command returns.
fn warm_pack(data: &Path, pack_id: &str, version: &str) {
    let root = data.join("packs").join(pack_id).join(version);
    packcache::warm(&root);
    let _ = lexicon_index(data, pack_id, version);
    claims_for(&root);
    let _ = pack_assessments(&root);
    let _ = writing_tasks(data, pack_id, version);
    pack_units(&root);
    let _ = media_ids(&root);
}

/// Warm every pack this installation already has, off the main thread, while
/// the window is coming up. Measured rather than assumed: the Languages tab
/// cost 460 ms on a cold process and 81 ms on the same process with the
/// commands warm — the whole difference was one parse of content that cannot
/// change under a running app.
fn warm_installed(data: &Path) {
    for i in packs::installed_packs(data) {
        warm_pack(data, &i.pack_id, &i.version);
    }
}
#[tauri::command]
async fn install_pack(pack_id: String, app: tauri::AppHandle) -> Result<PackCandidate, String> {
    // K-73: sync commands run on the main thread in Tauri 2, which freezes
    // the webview AND blocks `engine-progress` delivery. Every heavy command
    // runs on the blocking pool so events flow while work runs.
    tauri::async_runtime::spawn_blocking(move || {
        install_bundled_pack_report(&data_dir(), &pack_id, None, progress::reporter(&app))
    })
    .await
    .map_err(|e| format!("install-pack failed: {e}"))?
}

// ---------------------------------------------------------------------------
// Community language packs: GitHub-release catalog + local import
// ---------------------------------------------------------------------------

#[derive(Serialize)]
struct CatalogResponse {
    entries: Vec<packs::CatalogView>,
    status: String,
}

/// Browse the maintained community catalog (GitHub release assets).
/// Falls back to the last good cached copy when offline.
#[tauri::command]
async fn catalog_packs() -> CatalogResponse {
    match tauri::async_runtime::spawn_blocking(|| packs::catalog_view(&data_dir())).await {
        Ok((entries, status)) => CatalogResponse { entries, status },
        Err(e) => {
            eprintln!("catalog_packs failed: {e}");
            CatalogResponse {
                entries: Vec::new(),
                status: "failed".to_string(),
            }
        }
    }
}

#[tauri::command]
async fn install_catalog_pack(
    pack_id: String,
    app: tauri::AppHandle,
) -> Result<packs::InstalledPack, String> {
    tauri::async_runtime::spawn_blocking(move || {
        packs::install_from_catalog_report(&data_dir(), &pack_id, progress::reporter(&app))
    })
    .await
    .map_err(|e| format!("install-catalog-pack failed: {e}"))?
}

/// Import a locally supplied .lpk archive (contents cross IPC as base64;
/// filesystem paths never do).
#[tauri::command]
async fn import_pack(data_b64: String, app: tauri::AppHandle) -> Result<packs::InstalledPack, String> {
    tauri::async_runtime::spawn_blocking(move || {
        packs::import_pack_b64_report(&data_dir(), &data_b64, progress::reporter(&app))
    })
    .await
    .map_err(|e| format!("import-pack failed: {e}"))?
}

#[tauri::command]
fn installed_packs() -> Vec<packs::InstalledPack> {
    packs::installed_packs(&data_dir())
}

#[tauri::command]
fn active_pack(profile_id: String) -> Result<Vec<String>, String> {
    packs::active_pack(&data_dir(), &profile_id)
}

/// Switch the language being learned. The app's own display language is
/// a separate concern and is unaffected.
#[tauri::command]
fn switch_pack(profile_id: String, pack_id: String) -> Result<(), String> {
    packs::switch_pack(&data_dir(), &profile_id, &pack_id)
}

#[derive(Debug, Serialize)]
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

/// K-05: profiles already on this device, for the resume-at-launch
/// picker. Restart must never re-run onboarding for an existing user.
fn list_profiles_at(data: &Path) -> Result<Vec<ProfileInfo>, String> {
    let store = lts_storage::Store::open(data.join("profiles.db")).map_err(|e| e.to_string())?;
    Ok(store
        .list_profiles()
        .map_err(|e| e.to_string())?
        .into_iter()
        .map(|p| ProfileInfo {
            id: p.id,
            display_name: p.display_name,
        })
        .collect())
}

/// Validate a resume target before the UI commits to it.
fn resume_profile_at(data: &Path, profile_id: &str) -> Result<ProfileInfo, String> {
    let store = lts_storage::Store::open(data.join("profiles.db")).map_err(|e| e.to_string())?;
    let profile = store
        .list_profiles()
        .map_err(|e| e.to_string())?
        .into_iter()
        .find(|p| p.id == profile_id)
        .ok_or("unknown profile")?;
    Ok(ProfileInfo {
        id: profile.id,
        display_name: profile.display_name,
    })
}

#[tauri::command]
fn list_profiles() -> Result<Vec<ProfileInfo>, String> {
    list_profiles_at(&data_dir())
}

#[tauri::command]
fn resume_profile(profile_id: String) -> Result<ProfileInfo, String> {
    resume_profile_at(&data_dir(), &profile_id)
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
        .set_active_pack(profile_id, pack_id, &version)
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

// ---------------------------------------------------------------------------
// UX-002: home, time-budget practice, capability progress
// ---------------------------------------------------------------------------

/// The versioned mastery policy is compiled in: the app behaves
/// identically offline and the policy version is pinned per release
/// (docs/03); persisted evidence re-derives deterministically.
const POLICY_YAML: &str = include_str!("../../../../docs/assessment/MASTERY_POLICY.yaml");

/// Confidence below which a seen item counts as a weak skill for
/// practice selection (docs/01 §Session design).
const WEAK_CONFIDENCE: f32 = 0.5;

fn dimension_kebab(d: lts_domain::ActivityModality) -> &'static str {
    match d {
        lts_domain::ActivityModality::ComprehensionListening => "comprehension-listening",
        lts_domain::ActivityModality::ComprehensionReading => "comprehension-reading",
        lts_domain::ActivityModality::RecallMeaning => "recall-meaning",
        lts_domain::ActivityModality::OrthographyRecognition => "orthography-recognition",
        lts_domain::ActivityModality::PhonologicalDiscrimination => "phonological-discrimination",
        lts_domain::ActivityModality::OrthographicEncoding => "orthographic-encoding",
        lts_domain::ActivityModality::ProductionSpeaking => "production-speaking",
        lts_domain::ActivityModality::ProductionWriting => "production-writing",
        lts_domain::ActivityModality::PronunciationSegmental => "pronunciation-segmental",
        lts_domain::ActivityModality::PronunciationProsody => "pronunciation-prosody",
        lts_domain::ActivityModality::GrammarControlled => "grammar-controlled",
        lts_domain::ActivityModality::GrammarSpontaneous => "grammar-spontaneous",
        lts_domain::ActivityModality::PragmaticUse => "pragmatic-use",
        lts_domain::ActivityModality::Interaction => "interaction",
        lts_domain::ActivityModality::Retention => "retention",
    }
}

fn parse_dimension(s: &str) -> Option<lts_domain::ActivityModality> {
    use lts_domain::ActivityModality as M;
    Some(match s {
        "comprehension-listening" => M::ComprehensionListening,
        "comprehension-reading" => M::ComprehensionReading,
        "recall-meaning" => M::RecallMeaning,
        "orthographic-encoding" => M::OrthographicEncoding,
        "phonological-discrimination" => M::PhonologicalDiscrimination,
        "orthography-recognition" => M::OrthographyRecognition,
        "production-speaking" => M::ProductionSpeaking,
        "production-writing" => M::ProductionWriting,
        "pronunciation-segmental" => M::PronunciationSegmental,
        "pronunciation-prosody" => M::PronunciationProsody,
        "grammar-controlled" => M::GrammarControlled,
        "grammar-spontaneous" => M::GrammarSpontaneous,
        "pragmatic-use" => M::PragmaticUse,
        "interaction" => M::Interaction,
        "retention" => M::Retention,
        _ => return None,
    })
}

/// Goal modality labels (pack schema) map onto exercised dimensions.
fn parse_goal_modality(s: &str) -> Option<lts_domain::ActivityModality> {
    use lts_domain::ActivityModality as M;
    Some(match s {
        "listening" => M::ComprehensionListening,
        "reading" => M::ComprehensionReading,
        "speaking" => M::ProductionSpeaking,
        "writing" => M::ProductionWriting,
        "interaction" => M::Interaction,
        _ => return None,
    })
}

fn parse_state(s: &str) -> Option<lts_domain::MasteryState> {
    use lts_domain::MasteryState as S;
    Some(match s {
        "unseen" => S::Unseen,
        "introduced" => S::Introduced,
        "supported" => S::Supported,
        "independent" => S::Independent,
        "flexible" => S::Flexible,
        "retained" => S::Retained,
        _ => return None,
    })
}

/// Scheduler row item-id convention: "<content-id>#<dimension-kebab>".
fn split_item_id(id: &str) -> Option<(String, lts_domain::ActivityModality)> {
    let (content, dim) = id.split_once('#')?;
    Some((content.to_string(), parse_dimension(dim)?))
}

/// A lexicon entry reduced to what the UI and the practice runner need.
#[derive(serde::Serialize, Clone)]
struct LexEntry {
    id: String,
    surface: String,
    reading: Option<String>,
    romaji: Option<String>,
    gloss: String,
    /// K-42: review posture from the pack record (`status`), shown
    /// wherever content is presented; never affects grading/scheduling.
    status: String,
    /// K-44: first-class phrase records (`kind: "phrase"`) carry slot
    /// info: the fixed frame plus the variable parts a learner can
    /// swap. Data-driven — packs declare slots; the engine never
    /// parses the language itself.
    kind: String,
    slots: Vec<PhraseSlot>,
}

impl LexEntry {
    /// What this entry should be *spoken* as. The declared reading comes
    /// first: it is the form the pack says the word sounds like, and the only
    /// form the pinned engine reliably reads — measured, bare kanji is
    /// out-of-vocabulary (`Ignore OOV`, 0.44 s of noise for `今日は`) while the
    /// kana reading round-trips through ASR as `こんにちは` (K-56, K-65). The
    /// written form is the last resort; a romanization is never used, because
    /// the engine spells it out letter by letter.
    fn speakable(&self) -> &str {
        self.reading.as_deref().unwrap_or(&self.surface)
    }
}

/// K-44: one variable part of a phrase, as declared by the pack.
#[derive(serde::Serialize, Clone)]
struct PhraseSlot {
    /// Exact substring of the surface form this slot occupies.
    text: String,
    /// What may replace it (pack-declared alternatives; may be empty
    /// when the pack only marks the slot).
    alternatives: Vec<String>,
    /// Optional human label ("the verb", "the time of day").
    label: Option<String>,
}

/// Read every `lexicon/*.jsonl` of an installed pack, sorted for
/// determinism. The pack format allows multiple lexicon files
/// (`langpack` layout accepts any `lexicon/*.jsonl`); reading only
/// `entries.jsonl` would hide entries the scheduler still plans.
fn lexicon_texts(data: &Path, pack_id: &str, version: &str) -> Result<Vec<String>, String> {
    jsonl_dir_texts(data, pack_id, version, "lexicon")
}

/// Read every `*.jsonl` under an installed pack directory, in
/// file-name order. The pack format allows any directory to shard
/// across multiple files (docs/PACK_AUTHORING_CONTRACT chunking);
/// readers must see them all, not just `entries.jsonl`.
fn jsonl_dir_texts(
    data: &Path,
    pack_id: &str,
    version: &str,
    dir: &str,
) -> Result<Vec<String>, String> {
    let dir = data.join("packs").join(pack_id).join(version).join(dir);
    let label = dir.display().to_string();
    let mut files: Vec<PathBuf> = std::fs::read_dir(&dir)
        .map_err(|_| format!("pack {label} not found"))?
        .filter_map(|e| e.ok().map(|e| e.path()))
        .filter(|p| p.extension().and_then(|x| x.to_str()) == Some("jsonl"))
        .collect();
    files.sort();
    if files.is_empty() {
        return Err(format!("pack {label} not found"));
    }
    files
        .iter()
        .map(|p| std::fs::read_to_string(p).map_err(|_| format!("pack {label} not found")))
        .collect()
}

/// Pack-declared readings, ranked for the two jobs the app has: showing a
/// pronunciation hint, and choosing the string to hand the speech engine.
///
/// A reading carrying `transliteration_system` is a romanization, not a
/// pronunciation, so it is never returned. Otherwise the reading written in
/// a *different* script from the primary form is the one that explains a
/// logographic surface — and it is also the only form the pinned engine can
/// read (see `LexEntry::speakable`).
///
/// Which scripts exist is the pack's business: nothing here names a script
/// (the reading-selection `"hiragana"` literal this replaced was itself a
/// language rule living in the engine — K-67 moves that kind of choice into
/// pack data).
fn pick_reading(
    readings: Option<&Vec<serde_json::Value>>,
    primary_script: Option<&str>,
) -> Option<String> {
    let usable: Vec<&serde_json::Value> = readings?
        .iter()
        .filter(|r| r.get("transliteration_system").is_none())
        .collect();
    let chosen = usable
        .iter()
        .find(|r| {
            primary_script.is_some_and(|s| r.get("script").and_then(|v| v.as_str()) != Some(s))
        })
        .or(usable.first())?;
    chosen
        .get("text")
        .and_then(|v| v.as_str())
        .filter(|t| !t.is_empty())
        .map(String::from)
}

/// K-63-follow: the lexicon of an installed pack lives in an immutable version
/// directory, so parsing it is shared for the life of the process — the same
/// invariant `packcache` uses. Measured on the reference machine: reading and
/// parsing the 3,920 reference rows costs ~250 ms, and `home_state` was paying
/// it on every Home visit purely to attach display names that cannot change
/// under a running app.
static LEXICON_CACHE: std::sync::LazyLock<
    std::sync::Mutex<std::collections::HashMap<PathBuf, std::sync::Arc<Vec<LexEntry>>>>,
> = std::sync::LazyLock::new(|| std::sync::Mutex::new(Default::default()));

/// Parse an installed pack's lexicon into display/practice entries.
/// Malformed lines are skipped; ids are validated as content ids so
/// they can never become path components.
fn lexicon_entries(data: &Path, pack_id: &str, version: &str) -> Result<Vec<LexEntry>, String> {
    Ok(lexicon_index(data, pack_id, version)?.as_ref().clone())
}

/// The shared parse for one pack version, keyed by its version root. Load
/// failures are never cached: a half-installed pack is something a later call
/// can still see repaired, and a cached empty answer would hide that.
fn lexicon_index(
    data: &Path,
    pack_id: &str,
    version: &str,
) -> Result<std::sync::Arc<Vec<LexEntry>>, String> {
    let root = data.join("packs").join(pack_id).join(version);
    // Poison tolerance as in `packcache`: a panic in one parse must not take
    // every later lexicon read down with it.
    let mut cache = LEXICON_CACHE.lock().unwrap_or_else(|e| e.into_inner());
    if let Some(hit) = cache.get(&root) {
        return Ok(std::sync::Arc::clone(hit));
    }
    let entries = std::sync::Arc::new(parse_lexicon_entries(data, pack_id, version)?);
    cache.insert(root, std::sync::Arc::clone(&entries));
    Ok(entries)
}

/// One read of `lexicon/*.jsonl`, in file-name order.
fn parse_lexicon_entries(
    data: &Path,
    pack_id: &str,
    version: &str,
) -> Result<Vec<LexEntry>, String> {
    let text = lexicon_texts(data, pack_id, version)?.join("\n");
    let mut out = Vec::new();
    for line in text.lines() {
        let Ok(entry) = serde_json::from_str::<serde_json::Value>(line) else {
            continue;
        };
        let Some(id) = entry.get("id").and_then(|v| v.as_str()) else {
            continue;
        };
        if lts_domain::ContentId::parse(id).is_err() {
            continue;
        }
        let Some(forms) = entry.get("forms").and_then(|v| v.as_array()) else {
            continue;
        };
        let primary = forms
            .iter()
            .find(|f| {
                f.get("is_primary")
                    .and_then(|b| b.as_bool())
                    .unwrap_or(false)
            })
            .or(forms.first());
        let Some(surface) = primary
            .and_then(|f| f.get("text").and_then(|t| t.as_str()))
            .filter(|t| !t.is_empty())
        else {
            continue;
        };
        let reading = pick_reading(
            entry.get("readings").and_then(|v| v.as_array()),
            primary
                .and_then(|f| f.get("script"))
                .and_then(|s| s.as_str()),
        );
        let Some(gloss) = entry
            .get("glosses")
            .and_then(|g| g.as_object())
            .and_then(|o| o.values().next())
            .and_then(|v| v.as_array())
            .and_then(|a| a.first())
            .and_then(|v| v.as_str())
            .filter(|t| !t.is_empty())
        else {
            continue;
        };
        let romaji = entry
            .get("readings")
            .and_then(|v| v.as_array())
            .and_then(|a| {
                a.iter()
                    .find(|r| r.get("transliteration_system").is_some())
                    .and_then(|r| r.get("text").and_then(|t| t.as_str()))
                    .map(String::from)
            });
        // K-44: phrase records declare slots — variable parts of the
        // surface form. A slot's `text` must occur verbatim in the
        // surface (same verbatim rule as sentence cloze targets);
        // malformed slots are skipped, never guessed at.
        let kind = entry
            .get("kind")
            .and_then(|v| v.as_str())
            .unwrap_or("word")
            .to_string();
        let slots: Vec<PhraseSlot> = entry
            .get("slots")
            .and_then(|v| v.as_array())
            .map(|a| {
                a.iter()
                    .filter_map(|s| {
                        let text = s.get("text").and_then(|t| t.as_str())?;
                        if text.is_empty() || !surface.contains(text) {
                            return None;
                        }
                        Some(PhraseSlot {
                            text: text.to_string(),
                            alternatives: s
                                .get("alternatives")
                                .and_then(|v| v.as_array())
                                .map(|alts| {
                                    alts.iter()
                                        .filter_map(|x| x.as_str().map(String::from))
                                        .collect()
                                })
                                .unwrap_or_default(),
                            label: s.get("label").and_then(|l| l.as_str()).map(String::from),
                        })
                    })
                    .collect()
            })
            .unwrap_or_default();
        out.push(LexEntry {
            id: id.to_string(),
            surface: surface.to_string(),
            reading,
            romaji,
            gloss: gloss.to_string(),
            status: entry
                .get("status")
                .and_then(|v| v.as_str())
                .unwrap_or("draft")
                .to_string(),
            kind,
            slots,
        });
    }
    Ok(out)
}

/// An orthography unit reduced to what the script-instruction runner
/// needs. Packs for any writing system can supply these; the engine
/// never interprets `script` beyond Unicode-script detection for the
/// kana-literacy roll-up (language neutrality, docs/00).
#[derive(Clone)]
struct OrthEntry {
    id: String,
    symbol: String,
    reading: String,
    status: String,
    /// K-66: the pack's own instruction sequence for this symbol
    /// (`orthography/*.jsonl` `teaching_order`). None when the pack
    /// does not sequence it; the pack's order, never an app-side one.
    teaching_order: Option<i64>,
}

/// Parse an installed pack's `orthography/*.jsonl` units. A pack
/// without orthography instruction is not an error: empty list.
fn orth_entries(data: &Path, pack_id: &str, version: &str) -> Result<Vec<OrthEntry>, String> {
    let dir = data
        .join("packs")
        .join(pack_id)
        .join(version)
        .join("orthography");
    let mut out = Vec::new();
    let Ok(rd) = std::fs::read_dir(&dir) else {
        return Ok(out);
    };
    let mut files: Vec<_> = rd
        .filter_map(|e| e.ok())
        .map(|e| e.path())
        .filter(|p| p.extension().and_then(|x| x.to_str()) == Some("jsonl"))
        .collect();
    files.sort();
    for path in files {
        let Ok(text) = std::fs::read_to_string(&path) else {
            continue;
        };
        for line in text.lines() {
            let Ok(entry) = serde_json::from_str::<serde_json::Value>(line) else {
                continue;
            };
            let Some(id) = entry.get("id").and_then(|v| v.as_str()) else {
                continue;
            };
            if lts_domain::ContentId::parse(id).is_err() {
                continue;
            }
            let (Some(symbol), Some(reading)) = (
                entry.get("symbol").and_then(|v| v.as_str()),
                entry.get("reading").and_then(|v| v.as_str()),
            ) else {
                continue;
            };
            if symbol.is_empty() || reading.is_empty() {
                continue;
            }
            out.push(OrthEntry {
                id: id.to_string(),
                symbol: symbol.to_string(),
                reading: reading.to_string(),
                status: entry
                    .get("status")
                    .and_then(|v| v.as_str())
                    .unwrap_or("draft")
                    .to_string(),
                teaching_order: entry.get("teaching_order").and_then(|v| v.as_i64()),
            });
        }
    }
    Ok(out)
}

/// K-16: a character-instruction item reduced to what the kanji drill
/// needs (Heisig/WaniKani-style). Packs declare the decomposition and
/// prompts; the engine drills meaning/reading recognition and never
/// interprets the language itself (language neutrality, docs/00).
struct KanjiEntry {
    id: String,
    character: String,
    meanings: Vec<String>,
    readings: Vec<String>,
    radicals: Vec<String>,
    mnemonic: Option<String>,
    status: String,
}

/// Parse an installed pack's `kanji/entries.jsonl`. A pack without
/// character instruction is not an error: empty list.
fn kanji_entries(data: &Path, pack_id: &str, version: &str) -> Result<Vec<KanjiEntry>, String> {
    let text = match jsonl_dir_texts(data, pack_id, version, "kanji") {
        Ok(texts) => texts.join("\n"),
        // A pack without character instruction is not an error.
        Err(_) => return Ok(Vec::new()),
    };
    let mut out = Vec::new();
    for line in text.lines() {
        let Ok(entry) = serde_json::from_str::<serde_json::Value>(line) else {
            continue;
        };
        let Some(id) = entry.get("id").and_then(|v| v.as_str()) else {
            continue;
        };
        if lts_domain::ContentId::parse(id).is_err() {
            continue;
        }
        let str_array = |key: &str| -> Vec<String> {
            entry
                .get(key)
                .and_then(|v| v.as_array())
                .map(|a| {
                    a.iter()
                        .filter_map(|s| s.as_str())
                        .filter(|s| !s.is_empty())
                        .map(String::from)
                        .collect()
                })
                .unwrap_or_default()
        };
        let (Some(character), Some(status)) = (
            entry.get("character").and_then(|v| v.as_str()),
            entry.get("status").and_then(|v| v.as_str()),
        ) else {
            continue;
        };
        let (meanings, readings, radicals) = (
            str_array("meanings"),
            str_array("readings"),
            str_array("radicals"),
        );
        if character.is_empty() || meanings.is_empty() || readings.is_empty() {
            continue;
        }
        out.push(KanjiEntry {
            id: id.to_string(),
            character: character.to_string(),
            meanings,
            readings,
            radicals,
            mnemonic: entry
                .get("mnemonic")
                .and_then(|v| v.as_str())
                .filter(|s| !s.is_empty())
                .map(String::from),
            status: status.to_string(),
        });
    }
    Ok(out)
}

/// A phonological contrast reduced to what the discrimination runner
/// needs (K-10). Packs declare the contrast set; the engine plays one
/// member and offers all members as choices. It never interprets the
/// phonology itself (language neutrality, docs/00).
struct ContrastEntry {
    id: String,
    description: String,
    items: Vec<ContrastItem>,
    /// Optional production-scoring target declared by the pack (language-
    /// neutral number; the engine never infers phonology).
    production: Option<ContrastProduction>,
    status: String,
}

struct ContrastItem {
    text: String,
}

struct ContrastProduction {
    measure: String,
    expected_ratio: f64,
    tolerance_low: f64,
    tolerance_high: f64,
}

/// Parse an installed pack's `phonology/contrasts.jsonl`. A pack
/// without perceptual training is not an error: empty list.
fn contrast_entries(
    data: &Path,
    pack_id: &str,
    version: &str,
) -> Result<Vec<ContrastEntry>, String> {
    let text = match jsonl_dir_texts(data, pack_id, version, "phonology") {
        Ok(texts) => texts.join("\n"),
        // A pack without perceptual training is not an error.
        Err(_) => return Ok(Vec::new()),
    };
    let mut out = Vec::new();
    for line in text.lines() {
        let Ok(entry) = serde_json::from_str::<serde_json::Value>(line) else {
            continue;
        };
        let Some(id) = entry.get("id").and_then(|v| v.as_str()) else {
            continue;
        };
        if lts_domain::ContentId::parse(id).is_err() {
            continue;
        }
        let Some(items) = entry.get("items").and_then(|v| v.as_array()) else {
            continue;
        };
        let items: Vec<ContrastItem> = items
            .iter()
            .filter_map(|i| i.get("text").and_then(|t| t.as_str()))
            .filter(|t| !t.is_empty())
            .map(|t| ContrastItem {
                text: t.to_string(),
            })
            .collect();
        if items.len() < 2 {
            continue;
        }
        let production = entry.get("production").and_then(|p| {
            let measure = p.get("measure").and_then(|m| m.as_str())?.to_string();
            let expected_ratio = p.get("expected_ratio").and_then(|v| v.as_f64())?;
            Some(ContrastProduction {
                measure,
                expected_ratio,
                tolerance_low: p
                    .get("tolerance_low")
                    .and_then(|v| v.as_f64())
                    .unwrap_or(0.85),
                tolerance_high: p
                    .get("tolerance_high")
                    .and_then(|v| v.as_f64())
                    .unwrap_or(1.25),
            })
        });
        out.push(ContrastEntry {
            id: id.to_string(),
            description: entry
                .get("description")
                .and_then(|v| v.as_str())
                .unwrap_or("phonological contrast")
                .to_string(),
            items,
            production,
            status: entry
                .get("status")
                .and_then(|v| v.as_str())
                .unwrap_or("draft")
                .to_string(),
        });
    }
    Ok(out)
}

/// K-41: true when any reading in the pack carries a U+0301 combining
/// stress mark. Data-driven: no language literals — any pack whose
/// readings use combining stress gets stress-aware rendering.
fn pack_has_stress_marks(data: &Path, pack_id: &str, version: &str) -> bool {
    lexicon_texts(data, pack_id, version)
        .map(|texts| texts.iter().any(|t| t.contains('\u{0301}')))
        .unwrap_or(false)
}

/// K-41: per-profile display settings. `stress-mode`: "auto" (default,
/// highlight when the pack's data carries stress marks) | "on" | "off".
/// Display-only; never touches grading or scheduling.
#[derive(Serialize)]
struct DisplaySettings {
    stress_mode: String,
    pack_has_stress: bool,
}

#[tauri::command]
fn display_settings(profile_id: String) -> Result<DisplaySettings, String> {
    display_settings_at(&data_dir(), &profile_id)
}

fn display_settings_at(data: &Path, profile_id: &str) -> Result<DisplaySettings, String> {
    let store = lts_storage::Store::open(data.join("profiles.db")).map_err(|e| e.to_string())?;
    let stress_mode = store
        .get_setting(profile_id, "stress-mode")
        .ok()
        .flatten()
        .and_then(|v| v.as_str().map(String::from))
        .filter(|s| s == "on" || s == "off")
        .unwrap_or_else(|| "auto".to_string());
    let active = packs::active_pack(data, profile_id)?;
    let packs_root = data.join("packs");
    let pack_has_stress = active
        .first()
        .and_then(|p| lts_langpack::archive::current_version(p, &packs_root).map(|v| (p, v)))
        .map(|(p, v)| pack_has_stress_marks(data, p, &v))
        .unwrap_or(false);
    Ok(DisplaySettings {
        stress_mode,
        pack_has_stress,
    })
}

#[tauri::command]
fn set_display_settings(
    profile_id: String,
    stress_mode: String,
) -> Result<DisplaySettings, String> {
    let mode = match stress_mode.as_str() {
        "on" | "off" | "auto" => stress_mode,
        _ => return Err("stress-mode must be auto, on, or off".to_string()),
    };
    let data = data_dir();
    let store = lts_storage::Store::open(data.join("profiles.db")).map_err(|e| e.to_string())?;
    store
        .set_setting(&profile_id, "stress-mode", &serde_json::json!(mode))
        .map_err(|e| e.to_string())?;
    display_settings_at(&data, &profile_id)
}

// ---------------------------------------------------------------------------
// SETTINGS-001: the Settings surface — microphone decision, romanisation
// display, and the profile-data promises the privacy notice makes
// (export/delete). Every command follows the `*_at(&data_dir(), …)`
// testability pattern: the UI supplies only a profile id, validated
// against the store; paths never cross the IPC boundary (docs/07).
// ---------------------------------------------------------------------------

/// The profile's microphone decision. Unset (profile created but
/// onboarding not completed) reads as off: the microphone is opt-in and
/// the UI must not request `getUserMedia` when this is false.
fn microphone_enabled_at(data: &Path, profile_id: &str) -> Result<bool, String> {
    resume_profile_at(data, profile_id)?;
    let store = lts_storage::Store::open(data.join("profiles.db")).map_err(|e| e.to_string())?;
    Ok(store
        .get_setting(profile_id, "microphone-enabled")
        .ok()
        .flatten()
        .and_then(|v| v.as_bool())
        .unwrap_or(false))
}

fn set_microphone_enabled_at(data: &Path, profile_id: &str, enabled: bool) -> Result<bool, String> {
    resume_profile_at(data, profile_id)?;
    let store = lts_storage::Store::open(data.join("profiles.db")).map_err(|e| e.to_string())?;
    store
        .set_setting(
            profile_id,
            "microphone-enabled",
            &serde_json::json!(enabled),
        )
        .map_err(|e| e.to_string())?;
    microphone_enabled_at(data, profile_id)
}

#[tauri::command]
fn get_microphone_enabled(profile_id: String) -> Result<bool, String> {
    microphone_enabled_at(&data_dir(), &profile_id)
}

#[tauri::command]
fn set_microphone_enabled(profile_id: String, enabled: bool) -> Result<bool, String> {
    set_microphone_enabled_at(&data_dir(), &profile_id, enabled)
}

/// K-64: the capture device this profile chose. `None` means "system
/// default" — the honest absence, not a guess. The id is only meaningful to
/// the webview that enumerated it, so the engine remembers it and validates
/// nothing beyond the profile existing; whether the device is still plugged
/// in is answered at capture time, in the learner's own language.
fn microphone_device_at(data: &Path, profile_id: &str) -> Result<Option<String>, String> {
    resume_profile_at(data, profile_id)?;
    let store = lts_storage::Store::open(data.join("profiles.db")).map_err(|e| e.to_string())?;
    Ok(store
        .get_setting(profile_id, "microphone-device")
        .ok()
        .flatten()
        .and_then(|v| v.as_str().map(String::from)))
}

fn set_microphone_device_at(
    data: &Path,
    profile_id: &str,
    device_id: Option<String>,
) -> Result<Option<String>, String> {
    resume_profile_at(data, profile_id)?;
    let store = lts_storage::Store::open(data.join("profiles.db")).map_err(|e| e.to_string())?;
    // Clearing stores an explicit null rather than deleting the row: "use the
    // system default" is a decision the learner made, and it must survive a
    // restart the same way choosing a device does.
    let value = match device_id {
        Some(id) if !id.trim().is_empty() => serde_json::json!(id.trim()),
        _ => serde_json::Value::Null,
    };
    store
        .set_setting(profile_id, "microphone-device", &value)
        .map_err(|e| e.to_string())?;
    microphone_device_at(data, profile_id)
}

#[tauri::command]
fn get_microphone_device(profile_id: String) -> Result<Option<String>, String> {
    microphone_device_at(&data_dir(), &profile_id)
}

#[tauri::command]
fn set_microphone_device(
    profile_id: String,
    device_id: Option<String>,
) -> Result<Option<String>, String> {
    set_microphone_device_at(&data_dir(), &profile_id, device_id)
}

/// Romaji display preference. The values are exactly what the READ-001
/// reader (`reader_display`) consumes — "always" and "off" are
/// special-cased there and anything else falls back to auto — matching
/// `user_modes: [auto, always, off]` in the JA orthography policy.
fn romaji_mode_at(data: &Path, profile_id: &str) -> Result<String, String> {
    resume_profile_at(data, profile_id)?;
    let store = lts_storage::Store::open(data.join("profiles.db")).map_err(|e| e.to_string())?;
    Ok(store
        .get_setting(profile_id, "romaji-mode")
        .ok()
        .flatten()
        .and_then(|v| v.as_str().map(String::from))
        .filter(|s| s == "always" || s == "off")
        .unwrap_or_else(|| "auto".to_string()))
}

fn set_romaji_mode_at(data: &Path, profile_id: &str, mode: &str) -> Result<String, String> {
    let mode = match mode {
        "auto" | "always" | "off" => mode,
        _ => return Err("romaji-mode must be auto, always, or off".to_string()),
    };
    resume_profile_at(data, profile_id)?;
    let store = lts_storage::Store::open(data.join("profiles.db")).map_err(|e| e.to_string())?;
    store
        .set_setting(profile_id, "romaji-mode", &serde_json::json!(mode))
        .map_err(|e| e.to_string())?;
    romaji_mode_at(data, profile_id)
}

#[tauri::command]
fn get_romaji_mode(profile_id: String) -> Result<String, String> {
    romaji_mode_at(&data_dir(), &profile_id)
}

#[tauri::command]
fn set_romaji_mode(profile_id: String, mode: String) -> Result<String, String> {
    set_romaji_mode_at(&data_dir(), &profile_id, &mode)
}

/// The privacy notice promises "You can export … your local profile data
/// at any time": write the versioned `ExportBundle` JSON under
/// `<data>/exports/` and return the path. Recording *metadata* is
/// excluded by default (`ExportOptions::default`), and recording files
/// are never part of a bundle (crates/storage/src/export.rs).
fn profile_export_at(data: &Path, profile_id: &str) -> Result<String, String> {
    resume_profile_at(data, profile_id)?;
    let store = lts_storage::Store::open(data.join("profiles.db")).map_err(|e| e.to_string())?;
    let bundle = store
        .export_profile(
            profile_id,
            &rfc3339_utc(now_secs()),
            &lts_storage::ExportOptions::default(),
        )
        .map_err(|e| e.to_string())?;
    let dir = data.join("exports");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    // The id comes from the store, but keep the filename to safe chars.
    let safe: String = profile_id
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '-' || c == '_' {
                c
            } else {
                '_'
            }
        })
        .collect();
    let stamp = rfc3339_utc(now_secs()).replace(':', "");
    let path = dir.join(format!("{safe}-{stamp}.json"));
    let json = serde_json::to_string_pretty(&bundle).map_err(|e| e.to_string())?;
    std::fs::write(&path, json).map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().into_owned())
}

#[tauri::command]
fn profile_export(profile_id: String) -> Result<String, String> {
    profile_export_at(&data_dir(), &profile_id)
}

/// The other half of that promise. `Store::delete_profile` is idempotent
/// at the SQL level, so the profile is validated first: deleting an
/// already-deleted or unknown profile errors instead of silently
/// succeeding. Recording files are caller-owned; this build never
/// persists captured audio (attempts live in memory only).
fn profile_delete_at(data: &Path, profile_id: &str) -> Result<(), String> {
    resume_profile_at(data, profile_id)?;
    let store = lts_storage::Store::open(data.join("profiles.db")).map_err(|e| e.to_string())?;
    store.delete_profile(profile_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn profile_delete(profile_id: String) -> Result<(), String> {
    profile_delete_at(&data_dir(), &profile_id)
}

/// True when every character of `s` is Hiragana or Katakana. Script
/// detection is Unicode-based, never locale-based (engine neutrality).
fn is_kana_script(s: &str) -> bool {
    !s.is_empty()
        && s.chars().all(|c| {
            matches!(
                lts_activity::script_of(c),
                lts_activity::ScriptKind::Hiragana | lts_activity::ScriptKind::Katakana
            )
        })
}

/// Deterministic non-cryptographic hash (FNV-1a): choice placement must
/// be stable across runs without pulling in an RNG (planner invariant).
fn fnv1a(s: &str) -> u64 {
    let mut h: u64 = 0xcbf2_9ce4_8422_2325;
    for b in s.bytes() {
        h ^= b as u64;
        h = h.wrapping_mul(0x0000_0100_0000_01b3);
    }
    h
}

#[derive(serde::Deserialize)]
struct PackGoals {
    goals: Vec<PackGoal>,
}

#[derive(serde::Deserialize)]
struct PackGoal {
    description: String,
    #[serde(default)]
    band: Option<String>,
    #[serde(default)]
    review_status: Option<String>,
    id: String,
    modalities: Vec<String>,
    #[serde(default)]
    prerequisites: Vec<PackPrereq>,
    #[serde(default)]
    required_concepts: Vec<String>,
    #[serde(default)]
    assessment_ids: Vec<String>,
}

#[derive(serde::Deserialize)]
struct PackPrereq {
    target: String,
    dimension: String,
    required_state: String,
    strength: String,
}

/// Re-derive mastery for every (content, dimension) pair the evidence
/// log mentions. Derivation is from the append-only log, so progress
/// is reproducible and never trusts a stale snapshot (docs/03).
fn derive_pairs(
    store: &lts_storage::Store,
    profile_id: &str,
    now_rfc: &str,
) -> Result<Vec<lts_learner_model::DerivedMastery>, String> {
    let policy = lts_learner_model::policy::Policy::load(POLICY_YAML)?;
    let events = store
        .evidence_for_profile(profile_id)
        .map_err(|e| e.to_string())?;
    let mut pairs: Vec<(String, lts_domain::ActivityModality)> = Vec::new();
    for ev in &events {
        for t in &ev.targets {
            pairs.push((t.as_str().to_string(), ev.modality));
        }
    }
    pairs.sort_by(|a, b| (&a.0, dimension_kebab(a.1)).cmp(&(&b.0, dimension_kebab(b.1))));
    pairs.dedup_by(|a, b| a.0 == b.0 && a.1 == b.1);
    pairs
        .into_iter()
        .map(|(content, dim)| {
            lts_learner_model::derive::derive_mastery(&policy, &content, dim, &events, &[], now_rfc)
                .map_err(|e| format!("derive {content}/{}: {e}", dimension_kebab(dim)))
        })
        .collect()
}

/// New-material candidates: goals whose hard prerequisites are met and
/// which have no evidence yet on any required concept.
fn progression_items(
    data: &Path,
    store: &lts_storage::Store,
    profile_id: &str,
    derived: &[lts_learner_model::DerivedMastery],
) -> Result<Vec<lts_scheduler::ProgressionItem>, String> {
    let mut items = Vec::new();
    for (pack_id, _version) in store
        .selected_packs(profile_id)
        .map_err(|e| e.to_string())?
    {
        let packs_root = data.join("packs");
        let version = lts_langpack::archive::current_version(&pack_id, &packs_root)
            .ok_or_else(|| format!("pack {pack_id} not installed"))?;
        let goals_path = packs_root
            .join(&pack_id)
            .join(version)
            .join("curriculum/goals.yaml");
        let Ok(text) = std::fs::read_to_string(&goals_path) else {
            continue;
        };
        let goals: PackGoals = serde_yaml::from_str(&text).map_err(|e| e.to_string())?;
        for goal in goals.goals {
            let satisfied = goal.prerequisites.iter().all(|p| {
                if p.strength != "hard" {
                    return true;
                }
                match (
                    parse_dimension(&p.dimension),
                    parse_state(&p.required_state),
                ) {
                    (Some(dim), Some(req)) => derived
                        .iter()
                        .any(|d| d.content_id == p.target && d.dimension == dim && d.state >= req),
                    _ => false,
                }
            });
            let untouched = !goal
                .required_concepts
                .iter()
                .any(|c| derived.iter().any(|d| &d.content_id == c));
            if satisfied && untouched {
                if let (Some(concept), Some(modality)) = (
                    goal.required_concepts.first(),
                    goal.modalities.first().and_then(|m| parse_goal_modality(m)),
                ) {
                    items.push(lts_scheduler::ProgressionItem {
                        content_id: concept.clone(),
                        modality,
                    });
                }
            }
        }
    }
    Ok(items)
}

/// New-item stream: every selected pack's unseen lexicon, script,
/// contrast, sentence, and character items are introduction
/// candidates. The goal graph alone can gate an entire pack behind
/// prerequisites, which leaves a brand-new profile with an empty
/// session (docs/01: sessions must always offer learning).
fn add_new_item_candidates(
    data: &Path,
    store: &lts_storage::Store,
    profile_id: &str,
    derived: &[lts_learner_model::DerivedMastery],
    progression: &mut Vec<lts_scheduler::ProgressionItem>,
    due_reviews: &[lts_scheduler::DueReviewItem],
) -> Result<(), String> {
    {
        let mut planned: std::collections::HashSet<String> = progression
            .iter()
            .map(|p| format!("{}#{}", p.content_id, dimension_kebab(p.modality)))
            .chain(
                due_reviews
                    .iter()
                    .map(|r| format!("{}#{}", r.content_id, dimension_kebab(r.modality))),
            )
            .collect();
        for (pack_id, _v) in store
            .selected_packs(profile_id)
            .map_err(|e| e.to_string())?
        {
            let version = lts_langpack::archive::current_version(&pack_id, &data.join("packs"))
                .ok_or_else(|| format!("pack {pack_id} not installed"))?;
            for entry in lexicon_entries(data, &pack_id, &version)? {
                // Introduce unseen words for typed recall. Not for
                // comprehension-listening: a lexicon entry has no declared
                // audio (ADR-0016 puts every asset the pack ships in
                // media/manifest.jsonl, and for ja-JP that is sentences and
                // contrast items, never words), so scheduling a word as
                // listening practice guaranteed a TTS dependency and an
                // abstain on an offline install. Sentences carry the audio
                // and are scheduled below.
                for m in [lts_domain::ActivityModality::RecallMeaning] {
                    if derived
                        .iter()
                        .any(|d| d.content_id == entry.id && d.dimension == m)
                    {
                        continue;
                    }
                    let key = format!("{}#{}", entry.id, dimension_kebab(m));
                    if planned.contains(&key) {
                        continue;
                    }
                    planned.insert(key);
                    progression.push(lts_scheduler::ProgressionItem {
                        content_id: entry.id.clone(),
                        modality: m,
                    });
                }
            }
            // K-04: script-instruction units join the new-item stream
            // so a brand-new profile can start learning the alphabet
            // immediately (the zero-knowledge on-ramp).
            for entry in orth_entries(data, &pack_id, &version)? {
                let m = lts_domain::ActivityModality::OrthographyRecognition;
                if derived
                    .iter()
                    .any(|d| d.content_id == entry.id && d.dimension == m)
                {
                    continue;
                }
                let key = format!("{}#{}", entry.id, dimension_kebab(m));
                if planned.contains(&key) {
                    continue;
                }
                planned.insert(key);
                progression.push(lts_scheduler::ProgressionItem {
                    content_id: entry.id.clone(),
                    modality: m,
                });
            }
            // K-10: perceptual contrasts join the new-item stream so
            // pronunciation-adjacent listening practice is available
            // from day one wherever a pack declares contrasts.
            for entry in contrast_entries(data, &pack_id, &version)? {
                let m = lts_domain::ActivityModality::PhonologicalDiscrimination;
                if derived
                    .iter()
                    .any(|d| d.content_id == entry.id && d.dimension == m)
                {
                    continue;
                }
                let key = format!("{}#{}", entry.id, dimension_kebab(m));
                if planned.contains(&key) {
                    continue;
                }
                planned.insert(key);
                progression.push(lts_scheduler::ProgressionItem {
                    content_id: entry.id.clone(),
                    modality: m,
                });
            }
            // K-12: sentences join the new-item stream for both typed
            // recall modes — cloze (production-writing) and dictation
            // (orthographic-encoding) — wherever a pack declares them.
            // Listening joins the same stream, but only for sentences the
            // pack actually ships audio for, so the media the pack funds is
            // what the learner is asked to hear.
            let audio_ids = media_ids(&data.join("packs").join(&pack_id).join(&version));
            for entry in sentence_entries(data, &pack_id, &version)? {
                let modes = [
                    lts_domain::ActivityModality::ProductionWriting,
                    lts_domain::ActivityModality::OrthographicEncoding,
                    lts_domain::ActivityModality::ComprehensionListening,
                ];
                let modes: Vec<_> = modes
                    .into_iter()
                    .filter(|m| {
                        *m != lts_domain::ActivityModality::ComprehensionListening
                            || audio_ids.contains(&entry.id)
                    })
                    .collect();
                for m in modes {
                    if m == lts_domain::ActivityModality::ProductionWriting
                        && entry.cloze_targets.is_empty()
                    {
                        continue;
                    }
                    if derived
                        .iter()
                        .any(|d| d.content_id == entry.id && d.dimension == m)
                    {
                        continue;
                    }
                    let key = format!("{}#{}", entry.id, dimension_kebab(m));
                    if planned.contains(&key) {
                        continue;
                    }
                    planned.insert(key);
                    progression.push(lts_scheduler::ProgressionItem {
                        content_id: entry.id.clone(),
                        modality: m,
                    });
                }
            }
            // K-16: character instruction joins the new-item stream
            // for both drills (meaning = recall-meaning, reading =
            // orthography-recognition); SRS due reviews then resurface
            // drilled characters through the existing scheduler path.
            for entry in kanji_entries(data, &pack_id, &version)? {
                let modes = [
                    lts_domain::ActivityModality::RecallMeaning,
                    lts_domain::ActivityModality::OrthographyRecognition,
                ];
                for m in modes {
                    if derived
                        .iter()
                        .any(|d| d.content_id == entry.id && d.dimension == m)
                    {
                        continue;
                    }
                    let key = format!("{}#{}", entry.id, dimension_kebab(m));
                    if planned.contains(&key) {
                        continue;
                    }
                    planned.insert(key);
                    progression.push(lts_scheduler::ProgressionItem {
                        content_id: entry.id.clone(),
                        modality: m,
                    });
                }
            }
        }
    }
    Ok(())
}

/// Compose a time-budgeted session from scheduler values: due reviews
/// (retrievability), weak skills (derived confidence), and curriculum
/// progression. Never a trivial "next card" queue (docs/01).
fn build_plan(
    data: &Path,
    profile_id: &str,
    minutes: u32,
    now_secs: u64,
) -> Result<lts_scheduler::SessionPlan, String> {
    let store = lts_storage::Store::open(data.join("profiles.db")).map_err(|e| e.to_string())?;
    let now_rfc = rfc3339_utc(now_secs);
    let spike = lts_scheduler::FsrsSpike {
        w: lts_scheduler::fsrs::DEFAULT_W,
        request_ret: lts_scheduler::fsrs::DEFAULT_REQUEST_RET,
    };
    let mut due_reviews = Vec::new();
    for rec in store
        .due_items(profile_id, lts_scheduler::SPIKE_VERSION, &now_rfc)
        .map_err(|e| e.to_string())?
    {
        let state: lts_scheduler::ItemState =
            serde_json::from_str(&rec.params_json).map_err(|e| e.to_string())?;
        let (content_id, modality) =
            split_item_id(&rec.item_id).ok_or_else(|| format!("bad item id {}", rec.item_id))?;
        due_reviews.push(lts_scheduler::DueReviewItem {
            item_id: rec.item_id,
            content_id,
            modality,
            retrievability: lts_scheduler::Scheduler::retrievability(
                &spike,
                &state,
                now_secs as i64,
            ),
        });
    }
    let derived = derive_pairs(&store, profile_id, &now_rfc)?;
    let weak_skills: Vec<lts_scheduler::WeakSkillItem> = derived
        .iter()
        .filter(|d| d.state != lts_domain::MasteryState::Unseen && d.confidence < WEAK_CONFIDENCE)
        .map(|d| lts_scheduler::WeakSkillItem {
            content_id: d.content_id.clone(),
            dimension: d.dimension,
            confidence: d.confidence as f64,
        })
        .collect();
    let mut progression = progression_items(data, &store, profile_id, &derived)?;
    add_new_item_candidates(
        data,
        &store,
        profile_id,
        &derived,
        &mut progression,
        &due_reviews,
    )?;
    // n=1 personalization: bias the fixed new-item budget toward dimensions
    // the learner is still developing and away from ones they have mastered,
    // using their OWN recorded attempts. Personal tuning, never a mastery or
    // population claim (docs/18).
    personalize_progression(&mut progression, &derived);
    // K-66 (ADR-0020 §1): the pack's own goal map orders the introduction
    // half of the plan — band ladder, then unit order, then content
    // order. Personalization stays authoritative for the tail the pack
    // does not rank. Reordering only: the due-driven half above is
    // untouched, and no candidate is added or dropped here.
    for (pack_id, _v) in store
        .selected_packs(profile_id)
        .map_err(|e| e.to_string())?
    {
        if let Some(version) = lts_langpack::archive::current_version(&pack_id, &data.join("packs"))
        {
            let ranks = goal_rank_map(&data.join("packs").join(&pack_id).join(&version), &derived);
            order_progression_by_goal_map(&mut progression, &ranks);
        }
    }

    let config = lts_scheduler::PlannerConfig {
        budget_minutes: minutes,
        ..Default::default()
    };
    lts_scheduler::plan_session(
        &config,
        &lts_scheduler::PlannerInputs {
            due_reviews,
            weak_skills,
            progression,
        },
    )
    .map_err(|e| format!("{e:?}"))
}

/// n=1 personalization of the new-item (progression) stream. The fixed
/// progression budget is spent on dimensions the learner is still developing
/// and withheld from dimensions they have already mastered, using the mean
/// derived confidence of the learner's OWN recorded attempts per dimension.
/// Dimensions with no seen items keep the neutral `WEAK_CONFIDENCE` so they
/// hold roughly their curriculum position. The sort is stable, so within a
/// dimension curriculum order is preserved. This is personal tuning only — it
/// records nothing and makes no mastery/population claim (docs/18).
fn personalize_progression(
    progression: &mut [lts_scheduler::ProgressionItem],
    derived: &[lts_learner_model::DerivedMastery],
) {
    use std::collections::HashMap;
    let mut agg: HashMap<lts_domain::ActivityModality, (f32, usize)> = HashMap::new();
    for d in derived {
        if d.state != lts_domain::MasteryState::Unseen {
            let e = agg.entry(d.dimension).or_insert((0.0, 0));
            e.0 += d.confidence;
            e.1 += 1;
        }
    }
    let key = |m: lts_domain::ActivityModality| -> f32 {
        match agg.get(&m) {
            Some((s, n)) if *n > 0 => *s / *n as f32,
            _ => WEAK_CONFIDENCE,
        }
    };
    // Lower mean confidence (more developing) -> introduced sooner.
    progression.sort_by(|a, b| {
        key(a.modality)
            .partial_cmp(&key(b.modality))
            .unwrap_or(std::cmp::Ordering::Equal)
    });
}

/// Plan item enriched with the lexicon display info the UI needs to
/// answer "what am I about to learn?" — the scheduler stays pure.
#[derive(Serialize)]
struct PlanItemView {
    item_id: String,
    content_id: String,
    modality: &'static str,
    reason: &'static str,
    /// K-66 (ADR-0020 §1): what kind of promise this item is —
    /// `introduction` is material the learner has never met, `review`
    /// keeps something alive. Derived from the scheduler's own reason,
    /// never guessed by the UI.
    kind: &'static str,
    est_seconds: u32,
    surface: Option<String>,
    gloss: Option<String>,
}

#[derive(Serialize)]
struct PlanView {
    items: Vec<PlanItemView>,
    total_seconds: u32,
    budget_minutes: u32,
    seed: u64,
    planner_version: String,
}

fn reason_kebab(r: lts_scheduler::PlanReason) -> &'static str {
    match r {
        lts_scheduler::PlanReason::DueReview => "due-review",
        lts_scheduler::PlanReason::WeakSkill => "weak-skill",
        lts_scheduler::PlanReason::Progression => "progression",
    }
}

/// K-66: the plan's two halves (ADR-0020 §1). The due-driven half
/// maintains; the progression half introduces. One rule, no third kind.
fn kind_kebab(r: lts_scheduler::PlanReason) -> &'static str {
    match r {
        lts_scheduler::PlanReason::Progression => "introduction",
        _ => "review",
    }
}

/// K-66: where a new item sits in the pack's own learning path —
/// goal rank (band ladder, then goal id), unit file order, activity
/// order, content-ref order. Smaller is sooner.
type GoalRank = (u32, u32, u32, u32);

/// The rank map for one installed pack version: every content id the
/// pack's *unlocked* goals schedule, in the pack's own order. A goal
/// with an unsatisfied hard prerequisite is skipped exactly as the goal
/// map marks it locked — introducing content through a goal the learner
/// has not unlocked would contradict every other gate. Rank keys are
/// content ids, not (content, modality) pairs: ADR-0020 §1 orders the
/// plan by band, unit, then *content*, and the pack's activity modality
/// vocabulary ("reading", "listening") is goal vocabulary, not the
/// plan's runnable dimensions — keying on it would rank nothing.
/// A pack that declares no goal map yields an empty map, and the plan
/// then keeps today's order entirely (ADR-0020 §5).
fn goal_rank_map(
    root: &Path,
    derived: &[lts_learner_model::DerivedMastery],
) -> std::collections::HashMap<String, GoalRank> {
    let mut ranks: std::collections::HashMap<String, GoalRank> = Default::default();
    let mut goals: Vec<PackGoal> = Vec::new();
    for path in pack_goal_files(root) {
        let Ok(text) = std::fs::read_to_string(&path) else {
            continue;
        };
        if let Ok(doc) = serde_yaml::from_str::<PackGoals>(&text) {
            goals.extend(doc.goals);
        }
    }
    if goals.is_empty() {
        return ranks;
    }
    goals.sort_by(|a, b| {
        band_sort_key(a.band.as_deref())
            .cmp(&band_sort_key(b.band.as_deref()))
            .then_with(|| a.id.cmp(&b.id))
    });
    let units = pack_units(root);
    for (goal_rank, goal) in goals.iter().enumerate() {
        let locked = goal.prerequisites.iter().any(|p| {
            p.strength == "hard"
                && !match (
                    parse_dimension(&p.dimension),
                    parse_state(&p.required_state),
                ) {
                    (Some(dim), Some(req)) => derived
                        .iter()
                        .any(|d| d.content_id == p.target && d.dimension == dim && d.state >= req),
                    _ => false,
                }
        });
        if locked {
            continue;
        }
        for (unit_idx, unit) in units.iter().enumerate() {
            if unit.goal_id != goal.id {
                continue;
            }
            for (act_idx, act) in unit.activities.iter().enumerate() {
                for (ref_idx, content) in act.content_refs.iter().enumerate() {
                    ranks.entry(content.clone()).or_insert((
                        goal_rank as u32,
                        unit_idx as u32,
                        act_idx as u32,
                        ref_idx as u32,
                    ));
                }
            }
        }
    }
    ranks
}

/// K-66: order the introduction half of the plan along the pack's goal
/// map — band ladder, then goal id, then unit order, then content order
/// (ADR-0020 §1). Items the map does not rank (packs without goal maps,
/// or content outside any unlocked goal) keep their existing relative
/// order after the ranked ones, so nothing is ever dropped: this
/// reorders the candidate stream, it never filters it. The sort is
/// stable, and personalization (which runs before this) still decides
/// among the unranked tail.
fn order_progression_by_goal_map(
    progression: &mut Vec<lts_scheduler::ProgressionItem>,
    ranks: &std::collections::HashMap<String, GoalRank>,
) {
    if ranks.is_empty() {
        return;
    }
    progression.sort_by(|a, b| {
        let key = |i: &lts_scheduler::ProgressionItem| {
            ranks
                .get(&i.content_id)
                .map(|r| (0u8, *r))
                .unwrap_or((1u8, GoalRank::default()))
        };
        key(a).cmp(&key(b))
    });
}

/// Attach surface/gloss from the selected packs' lexicons to plan
/// items; items with no lexicon entry (e.g. grammar goals) stay null.
fn build_plan_view(
    data: &Path,
    profile_id: &str,
    minutes: u32,
    now_secs: u64,
) -> Result<PlanView, String> {
    let plan = build_plan(data, profile_id, minutes, now_secs)?;
    let store = lts_storage::Store::open(data.join("profiles.db")).map_err(|e| e.to_string())?;
    let mut display: std::collections::HashMap<String, (String, Option<String>, String)> =
        Default::default();
    for (pack_id, _v) in store
        .selected_packs(profile_id)
        .map_err(|e| e.to_string())?
    {
        let Ok(version) = lts_langpack::archive::current_version(&pack_id, &data.join("packs"))
            .ok_or_else(|| format!("pack {pack_id} not installed"))
        else {
            continue;
        };
        if let Ok(entries) = lexicon_entries(data, &pack_id, &version) {
            for e in entries {
                display
                    .entry(e.id)
                    .or_insert((e.surface, e.reading, e.gloss));
            }
        }
        if let Ok(entries) = orth_entries(data, &pack_id, &version) {
            for e in entries {
                display.entry(e.id).or_insert((e.symbol, None, e.reading));
            }
        }
        if let Ok(entries) = contrast_entries(data, &pack_id, &version) {
            for e in entries {
                display
                    .entry(e.id)
                    .or_insert((e.items[0].text.clone(), None, e.description));
            }
        }
        if let Ok(entries) = sentence_entries(data, &pack_id, &version) {
            for e in entries {
                display.entry(e.id).or_insert((
                    e.text.clone(),
                    None,
                    e.gloss.clone().unwrap_or_default(),
                ));
            }
        }
    }
    Ok(PlanView {
        items: plan
            .items
            .into_iter()
            .map(|i| {
                let (surface, gloss) = match display.get(&i.content_id) {
                    Some((s, _, g)) => (Some(s.clone()), Some(g.clone())),
                    None => (None, None),
                };
                PlanItemView {
                    item_id: i.item_id,
                    content_id: i.content_id,
                    modality: dimension_kebab(i.modality),
                    reason: reason_kebab(i.reason),
                    kind: kind_kebab(i.reason),
                    est_seconds: i.est_seconds,
                    surface,
                    gloss,
                }
            })
            .collect(),
        total_seconds: plan.total_seconds,
        budget_minutes: plan.budget_minutes,
        seed: plan.seed,
        planner_version: plan.planner_version,
    })
}

#[derive(Serialize)]
struct HomeState {
    display_name: String,
    plan: PlanView,
    /// K-66 (ADR-0020 §3): the lowest-band goal the pack's own goal map
    /// says is reachable. None when the active pack declares no goal
    /// map — Home then says so plainly; the app never invents a goal.
    next_goal: Option<NextGoalView>,
}

#[derive(Serialize)]
struct NextGoalView {
    pack_id: String,
    goal_id: String,
    description: String,
    band: Option<String>,
}

/// Home: next actions under the default 5-minute budget. No streak,
/// attendance, or day-presence value is exposed anywhere (ADR-0002).
#[tauri::command]
fn home_state(profile_id: String) -> Result<HomeState, String> {
    let data = data_dir();
    let store = lts_storage::Store::open(data.join("profiles.db")).map_err(|e| e.to_string())?;
    let profile = store
        .get_profile(&profile_id)
        .map_err(|e| e.to_string())?
        .ok_or("unknown profile")?;
    let plan = build_plan_view(&data, &profile_id, 5, now_secs())?;
    let next_goal = goal_map_at(&data, &profile_id)?
        .into_iter()
        .find(|g| !g.locked)
        .map(|g| NextGoalView {
            pack_id: g.pack_id,
            goal_id: g.id,
            description: g.description,
            band: g.band,
        });
    Ok(HomeState {
        display_name: profile.display_name,
        plan,
        next_goal,
    })
}

/// The content refs of the pack's `script-introduction` unit, in the
/// pack's own `teaching_order` (unsequenced ones last, refs in declared
/// order before that). The declaration is the ONLY cue (ADR-0021 rule
/// 4): a pack that declares the capability gets an introduction step,
/// a pack that does not gets silence. No unit, no resolvable orthography
/// entries, or a capability string on a unit whose content does not
/// parse as script items — all abstain empty, never guess.
fn script_intro_refs(
    data: &Path,
    pack_id: &str,
    version: &str,
    root: &Path,
) -> Result<Vec<(OrthEntry, String)>, String> {
    let units = pack_units(root);
    let Some(unit) = units
        .iter()
        .find(|u| u.capabilities.iter().any(|c| c == "script-introduction"))
    else {
        return Ok(Vec::new());
    };
    let orth_map = orth_entries(data, pack_id, version)?;
    let orth: std::collections::HashMap<&str, &OrthEntry> =
        orth_map.iter().map(|e| (e.id.as_str(), e)).collect();
    let mut seen: std::collections::HashSet<&str> = Default::default();
    let mut refs: Vec<&OrthEntry> = Vec::new();
    for act in &unit.activities {
        for content in &act.content_refs {
            if !seen.insert(content.as_str()) {
                continue;
            }
            if let Some(e) = orth.get(content.as_str()) {
                refs.push(*e);
            }
        }
    }
    // The pack's teaching_order decides; unit/declared order breaks ties
    // (stable sort over the deduped declared sequence).
    refs.sort_by_key(|e| e.teaching_order.unwrap_or(i64::MAX));
    Ok(refs
        .into_iter()
        .map(|e| (e.clone(), unit.goal_id.clone()))
        .collect())
}

#[derive(Serialize)]
struct FirstRunStep {
    kind: &'static str,
    label: String,
    content_id: Option<String>,
    goal_id: Option<String>,
}

/// K-66 (ADR-0020 §4): first-run guidance is derived, never scripted —
/// the first three steps of the same derivations Home already shows:
/// what the pack declares it teaches first, then the first two unseen
/// items of the goal-ordered plan, then the first review if anything is
/// due. Labels are the pack's own display strings. A pack with nothing
/// to introduce yields an empty list; the UI then renders nothing.
#[tauri::command]
fn first_run_steps(profile_id: String) -> Result<Vec<FirstRunStep>, String> {
    first_run_steps_at(&data_dir(), &profile_id)
}

fn first_run_steps_at(data: &Path, profile_id: &str) -> Result<Vec<FirstRunStep>, String> {
    let active = packs::active_pack(data, profile_id)?;
    let pack_id = active.first().ok_or("no active language pack")?;
    let version = lts_langpack::archive::current_version(pack_id, &data.join("packs"))
        .ok_or("pack not installed")?;
    let root = data.join("packs").join(pack_id).join(&version);
    let view = build_plan_view(data, profile_id, 5, now_secs())?;
    let mut steps: Vec<FirstRunStep> = Vec::new();
    let mut introduced: std::collections::HashSet<String> = Default::default();
    if let Some((entry, goal_id)) = script_intro_refs(data, pack_id, &version, &root)?
        .into_iter()
        .next()
    {
        introduced.insert(entry.id.clone());
        steps.push(FirstRunStep {
            kind: "introduction",
            label: format!("{} ({})", entry.symbol, entry.reading),
            content_id: Some(entry.id),
            goal_id: Some(goal_id),
        });
    }
    for item in view
        .items
        .iter()
        .filter(|i| i.kind == "introduction" && !introduced.contains(&i.content_id))
        .take(2)
    {
        let label = item
            .surface
            .clone()
            .or_else(|| item.gloss.clone())
            .unwrap_or_else(|| item.content_id.clone());
        steps.push(FirstRunStep {
            kind: "introduction",
            label,
            content_id: Some(item.content_id.clone()),
            goal_id: None,
        });
    }
    if let Some(item) = view.items.iter().find(|i| i.kind == "review") {
        let label = item
            .surface
            .clone()
            .or_else(|| item.gloss.clone())
            .unwrap_or_else(|| item.content_id.clone());
        steps.push(FirstRunStep {
            kind: "review",
            label,
            content_id: Some(item.content_id.clone()),
            goal_id: None,
        });
    }
    steps.truncate(3);
    Ok(steps)
}

#[tauri::command]

fn practice_plan(profile_id: String, minutes: u32) -> Result<PlanView, String> {
    build_plan_view(&data_dir(), &profile_id, minutes, now_secs())
}

#[derive(Serialize)]
struct ProgressRow {
    content_id: String,
    dimension: &'static str,
    state: &'static str,
    confidence: f64,
    needs_refresh: bool,
}

fn state_kebab(s: lts_domain::MasteryState) -> &'static str {
    match s {
        lts_domain::MasteryState::Unseen => "unseen",
        lts_domain::MasteryState::Introduced => "introduced",
        lts_domain::MasteryState::Supported => "supported",
        lts_domain::MasteryState::Independent => "independent",
        lts_domain::MasteryState::Flexible => "flexible",
        lts_domain::MasteryState::Retained => "retained",
    }
}

/// Per (content, dimension) capability rows: modality differences are
/// first-class, never collapsed into one score (docs/03 §2).
#[tauri::command]
fn progress_summary(profile_id: String) -> Result<Vec<ProgressRow>, String> {
    let store =
        lts_storage::Store::open(data_dir().join("profiles.db")).map_err(|e| e.to_string())?;
    let now_rfc = rfc3339_utc(now_secs());
    let derived = derive_pairs(&store, &profile_id, &now_rfc)?;
    Ok(derived
        .iter()
        .map(|d| ProgressRow {
            content_id: d.content_id.clone(),
            dimension: dimension_kebab(d.dimension),
            state: state_kebab(d.state),
            confidence: d.confidence as f64,
            needs_refresh: d.needs_refresh,
        })
        .collect())
}

// ---------------------------------------------------------------------------
// K-40: goal-level progress map. The view is built entirely from
// installed pack data (curriculum/goals.yaml + curriculum/goals/*.yaml +
// assessments/definitions.jsonl) and derived mastery / assessment
// evidence only — never activity counts, dates, or streaks (ADR-0002).
// No language-specific hardcoding: goal ids, bands, prereq records and
// dimension names all come from the pack.
// ---------------------------------------------------------------------------

#[derive(Serialize, PartialEq, Debug)]
struct GoalDimensionView {
    modality: String,
    /// Best derived state across the goal's required concepts for this
    /// modality; "unseen" when no evidence exists yet.
    state: &'static str,
    /// The required concept furthest along, for honest labeling.
    exemplar: Option<String>,
}

#[derive(Serialize, PartialEq, Debug)]
struct GoalPrereqView {
    target: String,
    dimension: String,
    required_state: String,
    strength: String,
    satisfied: bool,
}

#[derive(Serialize, PartialEq, Debug)]
struct GoalMapView {
    pack_id: String,
    id: String,
    description: String,
    band: Option<String>,
    review_status: Option<String>,
    modalities: Vec<String>,
    /// True when the goal has at least one assessment definition.
    assessed: bool,
    /// True when any hard prerequisite is unsatisfied.
    locked: bool,
    prerequisites: Vec<GoalPrereqView>,
    dimensions: Vec<GoalDimensionView>,
}

/// Every goal file for an installed pack version (K-23 sharding:
/// `curriculum/goals.yaml` plus `curriculum/goals/*.yaml`).
fn pack_goal_files(root: &Path) -> Vec<PathBuf> {
    let mut files = Vec::new();
    for name in ["curriculum/goals.yaml", "curriculum/goals.yml"] {
        let p = root.join(name);
        if p.is_file() {
            files.push(p);
        }
    }
    let dir = root.join("curriculum/goals");
    if let Ok(rd) = std::fs::read_dir(&dir) {
        let mut entries: Vec<PathBuf> = rd
            .flatten()
            .map(|e| e.path())
            .filter(|p| {
                p.extension()
                    .map(|x| x == "yaml" || x == "yml")
                    .unwrap_or(false)
            })
            .collect();
        entries.sort();
        files.extend(entries);
    }
    files
}

/// Goal ids that have at least one assessment definition in the pack.
fn pack_assessed_goal_ids(root: &Path) -> std::collections::HashSet<String> {
    let mut ids = std::collections::HashSet::new();
    let text = match std::fs::read_to_string(root.join("assessments/definitions.jsonl")) {
        Ok(t) => t,
        Err(_) => return ids,
    };
    for line in text.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        if let Ok(v) = serde_json::from_str::<serde_json::Value>(line) {
            if let Some(g) = v.get("goal_id").and_then(|g| g.as_str()) {
                ids.insert(g.to_string());
            }
        }
    }
    ids
}

// ---------------------------------------------------------------------------
// K-43: per-pack content claims. Everything here is a CLAIM read from the
// installed pack's own files — counts, review-posture distribution, and
// provenance entries. It never upgrades anything: `trust_state` stays
// whatever the install gate recorded, and the UI labels these as the
// pack's own claims. Display-only; grading/scheduling never consult it.

/// Count JSONL records and tally their review posture (`status`, or
/// `review_status` for goals/assessments). Missing files count as zero;
/// malformed lines are skipped like every other reader does.
fn jsonl_claims(root: &Path, rel: &str) -> (usize, std::collections::BTreeMap<String, usize>) {
    let text = match std::fs::read_to_string(root.join(rel)) {
        Ok(t) => t,
        Err(_) => return (0, Default::default()),
    };
    let mut total = 0;
    let mut postures = std::collections::BTreeMap::new();
    for line in text.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        let Ok(v) = serde_json::from_str::<serde_json::Value>(line) else {
            continue;
        };
        if v.get("id").and_then(|i| i.as_str()).is_none() {
            continue;
        }
        total += 1;
        let posture = v
            .get("status")
            .or_else(|| v.get("review_status"))
            .and_then(|s| s.as_str())
            .unwrap_or("unlabeled")
            .to_string();
        *postures.entry(posture).or_insert(0) += 1;
    }
    (total, postures)
}

/// Tally a sharded JSONL directory (every `*.jsonl` under `dir`).
fn jsonl_dir_claims(root: &Path, dir: &str) -> (usize, std::collections::BTreeMap<String, usize>) {
    let mut total = 0;
    let mut postures = std::collections::BTreeMap::new();
    let dirpath = root.join(dir);
    let Ok(rd) = std::fs::read_dir(&dirpath) else {
        return (0, postures);
    };
    let mut files: Vec<PathBuf> = rd
        .flatten()
        .map(|e| e.path())
        .filter(|p| p.extension().and_then(|x| x.to_str()) == Some("jsonl"))
        .collect();
    files.sort();
    for f in files {
        let rel = format!("{}/{}", dir, f.file_name().unwrap().to_string_lossy());
        let (n, p) = jsonl_claims(root, &rel);
        total += n;
        for (k, v) in p {
            *postures.entry(k).or_insert(0) += v;
        }
    }
    (total, postures)
}

/// Count YAML sequence items (goals) and their `review_status`.
fn yaml_goal_claims(root: &Path) -> (usize, std::collections::BTreeMap<String, usize>) {
    let mut total = 0;
    let mut postures = std::collections::BTreeMap::new();
    for path in pack_goal_files(root) {
        let Ok(text) = std::fs::read_to_string(&path) else {
            continue;
        };
        let Ok(doc) = serde_yaml::from_str::<serde_yaml::Value>(&text) else {
            continue;
        };
        let Some(goals) = doc.get("goals").and_then(|g| g.as_sequence()) else {
            continue;
        };
        for goal in goals {
            if goal.get("id").and_then(|i| i.as_str()).is_none() {
                continue;
            }
            total += 1;
            let posture = goal
                .get("review_status")
                .and_then(|s| s.as_str())
                .unwrap_or("unlabeled")
                .to_string();
            *postures.entry(posture).or_insert(0) += 1;
        }
    }
    (total, postures)
}

/// Count YAML mapping documents (`---`-separated units) and their
/// `review_status` when present.
fn yaml_unit_claims(root: &Path) -> (usize, std::collections::BTreeMap<String, usize>) {
    let dir = root.join("curriculum/units");
    let Ok(rd) = std::fs::read_dir(&dir) else {
        return (0, Default::default());
    };
    let mut files: Vec<PathBuf> = rd
        .flatten()
        .map(|e| e.path())
        .filter(|p| {
            p.extension()
                .map(|x| x == "yaml" || x == "yml")
                .unwrap_or(false)
        })
        .collect();
    files.sort();
    let mut total = 0;
    let mut postures = std::collections::BTreeMap::new();
    for path in files {
        let Ok(text) = std::fs::read_to_string(&path) else {
            continue;
        };
        for de in serde_yaml::Deserializer::from_str(&text) {
            let Ok(doc) = serde_yaml::Value::deserialize(de) else {
                continue;
            };
            if doc.get("id").and_then(|i| i.as_str()).is_none() {
                continue;
            }
            total += 1;
            let posture = doc
                .get("review_status")
                .and_then(|s| s.as_str())
                .unwrap_or("unlabeled")
                .to_string();
            *postures.entry(posture).or_insert(0) += 1;
        }
    }
    (total, postures)
}

#[derive(Clone, Serialize)]
struct ClaimCounts {
    units: usize,
    goals: usize,
    assessments: usize,
    lexicon: usize,
    sentences: usize,
    grammar: usize,
    orthography: usize,
    kanji: usize,
    phonological_contrasts: usize,
    stories: usize,
}

#[derive(Clone, Serialize)]
struct PostureRow {
    kind: String,
    posture: String,
    count: usize,
}

#[derive(Clone, Serialize)]
struct ProvenanceClaim {
    id: String,
    title: String,
    url: String,
    license: String,
    access: String,
}

#[derive(Serialize)]
struct PackClaims {
    pack_id: String,
    version: String,
    /// The install gate's posture, passed through untouched. Claims
    /// never promote it.
    trust_state: String,
    counts: ClaimCounts,
    postures: Vec<PostureRow>,
    provenance: Vec<ProvenanceClaim>,
}

/// K-63: installed pack content is content-addressed and immutable, so the
/// content-derived half of the claim report is computed once per pack
/// version instead of on every call. `trust_state` is deliberately NOT in
/// here: it comes from the local store and is re-read every call, so a trust
/// change is never served from a stale entry.
static CLAIM_CACHE: std::sync::LazyLock<
    std::sync::Mutex<
        std::collections::HashMap<PathBuf, (ClaimCounts, Vec<PostureRow>, Vec<ProvenanceClaim>)>,
    >,
> = std::sync::LazyLock::new(|| std::sync::Mutex::new(Default::default()));

/// The memoized form of that computation: one scan per immutable version root,
/// so the install (or the startup prime) pays for it rather than every
/// Languages visit. Store-backed fields stay outside the memo — see above.
fn claims_for(root: &Path) -> (ClaimCounts, Vec<PostureRow>, Vec<ProvenanceClaim>) {
    let mut cache = CLAIM_CACHE.lock().unwrap_or_else(|e| e.into_inner());
    if let Some(hit) = cache.get(root) {
        return hit.clone();
    }
    let claims = content_claims(root);
    cache.insert(root.to_path_buf(), claims.clone());
    claims
}

/// The content-derived half of a pack's claim report: every count, posture
/// tally and provenance entry read from the pack's own files under `root`.
fn content_claims(root: &Path) -> (ClaimCounts, Vec<PostureRow>, Vec<ProvenanceClaim>) {
    // Lexicon may be sharded across any number of lexicon/*.jsonl.
    let mut lex_total = 0;
    let mut lex_postures = std::collections::BTreeMap::new();
    let lexdir = root.join("lexicon");
    if let Ok(rd) = std::fs::read_dir(&lexdir) {
        let mut files: Vec<PathBuf> = rd
            .flatten()
            .map(|e| e.path())
            .filter(|p| p.extension().and_then(|x| x.to_str()) == Some("jsonl"))
            .collect();
        files.sort();
        for f in files {
            let rel = format!("lexicon/{}", f.file_name().unwrap().to_string_lossy());
            let (n, p) = jsonl_claims(&root, &rel);
            lex_total += n;
            for (k, v) in p {
                *lex_postures.entry(k).or_insert(0) += v;
            }
        }
    }

    // Stories are sharded YAML files, each a mapping with `status`.
    let mut story_total = 0;
    let mut story_postures = std::collections::BTreeMap::new();
    let storydir = root.join("stories");
    if let Ok(rd) = std::fs::read_dir(&storydir) {
        let mut files: Vec<PathBuf> = rd
            .flatten()
            .map(|e| e.path())
            .filter(|p| {
                p.extension()
                    .map(|x| x == "yaml" || x == "yml")
                    .unwrap_or(false)
            })
            .collect();
        files.sort();
        for f in files {
            let Ok(text) = std::fs::read_to_string(&f) else {
                continue;
            };
            let Ok(doc) = serde_yaml::from_str::<serde_yaml::Value>(&text) else {
                continue;
            };
            if doc.get("id").and_then(|i| i.as_str()).is_none() {
                continue;
            }
            story_total += 1;
            let posture = doc
                .get("status")
                .and_then(|s| s.as_str())
                .unwrap_or("unlabeled")
                .to_string();
            *story_postures.entry(posture).or_insert(0) += 1;
        }
    }

    let (units, unit_postures) = yaml_unit_claims(&root);
    let (goals, goal_postures) = yaml_goal_claims(&root);
    let (assessments, assessment_postures) = jsonl_claims(&root, "assessments/definitions.jsonl");
    let (sentences, sentence_postures) = jsonl_dir_claims(&root, "sentences");
    let (grammar, grammar_postures) = jsonl_claims(&root, "grammar/concepts.jsonl");
    let (kanji, kanji_postures) = jsonl_dir_claims(&root, "kanji");
    let (contrasts, contrast_postures) = jsonl_dir_claims(&root, "phonology");
    let mut orth_total = 0;
    let mut orth_postures = std::collections::BTreeMap::new();
    let orthdir = root.join("orthography");
    if let Ok(rd) = std::fs::read_dir(&orthdir) {
        let mut files: Vec<PathBuf> = rd
            .flatten()
            .map(|e| e.path())
            .filter(|p| p.extension().and_then(|x| x.to_str()) == Some("jsonl"))
            .collect();
        files.sort();
        for f in files {
            let rel = format!("orthography/{}", f.file_name().unwrap().to_string_lossy());
            let (n, p) = jsonl_claims(&root, &rel);
            orth_total += n;
            for (k, v) in p {
                *orth_postures.entry(k).or_insert(0) += v;
            }
        }
    }

    let mut postures = Vec::new();
    let mut push = |kind: &str, m: std::collections::BTreeMap<String, usize>| {
        for (posture, count) in m {
            postures.push(PostureRow {
                kind: kind.to_string(),
                posture,
                count,
            });
        }
    };
    push("units", unit_postures);
    push("goals", goal_postures);
    push("assessments", assessment_postures);
    push("lexicon", lex_postures);
    push("sentences", sentence_postures);
    push("grammar", grammar_postures);
    push("orthography", orth_postures);
    push("kanji", kanji_postures);
    push("phonological contrasts", contrast_postures);
    push("stories", story_postures);

    // Provenance: sources.jsonl entries are the pack's own claims
    // about where its content came from.
    let mut provenance = Vec::new();
    if let Ok(text) = std::fs::read_to_string(root.join("sources.jsonl")) {
        for line in text.lines() {
            let line = line.trim();
            if line.is_empty() {
                continue;
            }
            let Ok(v) = serde_json::from_str::<serde_json::Value>(line) else {
                continue;
            };
            let g = |k: &str| {
                v.get(k)
                    .and_then(|x| x.as_str())
                    .unwrap_or_default()
                    .to_string()
            };
            if g("id").is_empty() {
                continue;
            }
            provenance.push(ProvenanceClaim {
                id: g("id"),
                title: g("title"),
                url: g("url"),
                license: v
                    .get("license")
                    .and_then(|l| l.get("spdx"))
                    .and_then(|s| s.as_str())
                    .unwrap_or_default()
                    .to_string(),
                access: v
                    .get("access")
                    .and_then(|a| a.get("mode"))
                    .and_then(|m| m.as_str())
                    .unwrap_or_default()
                    .to_string(),
            });
        }
    }

    (
        ClaimCounts {
            units,
            goals,
            assessments,
            lexicon: lex_total,
            sentences,
            grammar,
            orthography: orth_total,
            kanji,
            phonological_contrasts: contrasts,
            stories: story_total,
        },
        postures,
        provenance,
    )
}

fn pack_claims_at(data: &Path) -> Result<Vec<PackClaims>, String> {
    let store = lts_storage::Store::open(data.join("profiles.db")).map_err(|e| e.to_string())?;
    let packs_root = data.join("packs");
    let mut out = Vec::new();
    for inst in store.installations().map_err(|e| e.to_string())? {
        let version = match lts_langpack::archive::current_version(&inst.pack_id, &packs_root) {
            Some(v) => v,
            None => continue,
        };
        let root = packs_root.join(&inst.pack_id).join(&version);

        // K-63: the content half comes from the per-root memo; `pack_id`,
        // `version` and `trust_state` are assembled from the store on every
        // call, so a trust change is never served from a stale entry.
        let (counts, postures, provenance) = claims_for(&root);

        out.push(PackClaims {
            pack_id: inst.pack_id.clone(),
            version,
            trust_state: inst.trust_state.clone(),
            counts,
            postures,
            provenance,
        });
    }
    Ok(out)
}

#[tauri::command]
fn pack_claims() -> Result<Vec<PackClaims>, String> {
    pack_claims_at(&data_dir())
}

/// Ordering key for goal-map bands. Packs author CEFR-style tokens with mixed
/// case (`A1`, `on-ramp`), and a plain string sort files `on-ramp` after
/// `B2`, which reads as if the warm-up band were the advanced one. Known bands
/// follow the proficiency ladder; a band the engine does not know keeps its
/// name and sorts after the ladder; an unlabelled goal sorts last. Labels and
/// glosses are UI copy — the engine only orders.
fn band_sort_key(band: Option<&str>) -> (u8, String) {
    let normalised = band.map(|b| b.trim().to_ascii_lowercase());
    let rank = match normalised.as_deref() {
        None => 255,
        Some("on-ramp") => 0,
        Some("a1") => 1,
        Some("a2") => 2,
        Some("b1") => 3,
        Some("b2") => 4,
        Some("c1") => 5,
        Some("c2") => 6,
        Some(_) => 128,
    };
    (rank, normalised.unwrap_or_default())
}

fn goal_map_at(data: &Path, profile_id: &str) -> Result<Vec<GoalMapView>, String> {
    let store = lts_storage::Store::open(data.join("profiles.db")).map_err(|e| e.to_string())?;
    let derived = derive_pairs(&store, profile_id, &rfc3339_utc(now_secs()))?;
    let packs_root = data.join("packs");
    let mut out = Vec::new();
    for (pack_id, _) in store
        .selected_packs(profile_id)
        .map_err(|e| e.to_string())?
    {
        let version = match lts_langpack::archive::current_version(&pack_id, &packs_root) {
            Some(v) => v,
            None => continue,
        };
        let root = packs_root.join(&pack_id).join(&version);
        let assessed = pack_assessed_goal_ids(&root);
        for path in pack_goal_files(&root) {
            let text = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
            let goals: PackGoals = serde_yaml::from_str(&text).map_err(|e| e.to_string())?;
            for goal in goals.goals {
                let prerequisites: Vec<GoalPrereqView> = goal
                    .prerequisites
                    .iter()
                    .map(|p| {
                        let satisfied = match (
                            parse_dimension(&p.dimension),
                            parse_state(&p.required_state),
                        ) {
                            (Some(dim), Some(req)) => derived.iter().any(|d| {
                                d.content_id == p.target && d.dimension == dim && d.state >= req
                            }),
                            _ => false,
                        };
                        GoalPrereqView {
                            target: p.target.clone(),
                            dimension: p.dimension.clone(),
                            required_state: p.required_state.clone(),
                            strength: p.strength.clone(),
                            satisfied,
                        }
                    })
                    .collect();
                let locked = prerequisites
                    .iter()
                    .any(|p| p.strength == "hard" && !p.satisfied);
                let assessed = !goal.assessment_ids.is_empty() || assessed.contains(&goal.id);
                let dimensions = goal
                    .modalities
                    .iter()
                    .filter_map(|m| {
                        let dim = parse_goal_modality(m)?;
                        let best = goal
                            .required_concepts
                            .iter()
                            .filter_map(|c| {
                                derived
                                    .iter()
                                    .find(|d| &d.content_id == c && d.dimension == dim)
                            })
                            .max_by_key(|d| d.state);
                        Some(GoalDimensionView {
                            modality: m.clone(),
                            state: state_kebab(
                                best.map(|d| d.state)
                                    .unwrap_or(lts_domain::MasteryState::Unseen),
                            ),
                            exemplar: best.map(|d| d.content_id.clone()),
                        })
                    })
                    .collect();
                out.push(GoalMapView {
                    pack_id: pack_id.clone(),
                    id: goal.id,
                    description: goal.description,
                    band: goal.band,
                    review_status: goal.review_status,
                    modalities: goal.modalities,
                    assessed,
                    locked,
                    prerequisites,
                    dimensions,
                });
            }
        }
    }
    out.sort_by(|a, b| {
        band_sort_key(a.band.as_deref())
            .cmp(&band_sort_key(b.band.as_deref()))
            .then_with(|| a.id.cmp(&b.id))
    });
    Ok(out)
}

#[tauri::command]
async fn goal_map(profile_id: String) -> Result<Vec<GoalMapView>, String> {
    tauri::async_runtime::spawn_blocking(move || goal_map_at(&data_dir(), &profile_id))
        .await
        .map_err(|e| format!("goal-map failed: {e}"))?
}

// ---------------------------------------------------------------------------
// GAME-001: capability-driven world layer. Unlocks come from derived
// capabilities only — no activity counts, dates, or streaks feed this
// path (ADR-0002). Pure logic; the UI may render nothing and the
// engine is unaffected.
// ---------------------------------------------------------------------------

/// The world layer for the learner's active pack (ADR-0018). Packs author
/// every environment; the engine ships none. Any resolution failure — no
/// active pack, no collection, unloadable pack — yields an empty world:
/// having no places to go is a normal state, not an error.
fn world_config_at(data: &Path, profile_id: &str) -> lts_world::WorldConfig {
    let empty = || lts_world::WorldConfig {
        environments: vec![],
        version: String::new(),
    };
    let Ok(active) = packs::active_pack(data, profile_id) else {
        return empty();
    };
    let Some(pack_id) = active.first() else {
        return empty();
    };
    let packs_root = data.join("packs");
    let Some(version) = lts_langpack::archive::current_version(pack_id, &packs_root) else {
        return empty();
    };
    // K-63: one parse per installed version; the Home world strip asks for the
    // same pack on every visit and the version directory never changes.
    let Ok(pack) = packcache::pack(&packs_root.join(pack_id).join(&version)) else {
        return empty();
    };
    lts_world::WorldConfig {
        environments: pack
            .environments()
            .into_iter()
            .map(|e| lts_world::Environment {
                id: e.id,
                display_name: e.display_name,
                requires: e
                    .requires
                    .into_iter()
                    .map(|r| lts_world::CapabilityRequirement {
                        content_id: r.content_id,
                        modality: r.modality,
                        min_state: r.min_state,
                    })
                    .collect(),
            })
            .collect(),
        version,
    }
}

#[derive(Serialize, PartialEq, Debug)]
struct WorldEnvironment {
    id: String,
    display_name: String,
    unlocked: bool,
    missing: Vec<String>,
}

#[tauri::command]
fn world_state(profile_id: String) -> Result<Vec<WorldEnvironment>, String> {
    world_state_at(&data_dir(), &profile_id)
}

fn world_state_at(data: &Path, profile_id: &str) -> Result<Vec<WorldEnvironment>, String> {
    let store = lts_storage::Store::open(data.join("profiles.db")).map_err(|e| e.to_string())?;
    let derived = derive_pairs(&store, profile_id, &rfc3339_utc(now_secs()))?;
    let snapshot = lts_world::CapabilitySnapshot {
        states: derived
            .iter()
            .map(|d| ((d.content_id.clone(), d.dimension), d.state))
            .collect(),
    };
    Ok(
        lts_world::evaluate(&world_config_at(data, profile_id), &snapshot)
            .into_iter()
            .map(|e| WorldEnvironment {
                id: e.id,
                display_name: e.display_name,
                unlocked: e.unlocked,
                missing: e
                    .missing
                    .iter()
                    .map(|r| format!("{} ({:?})", r.content_id, r.modality))
                    .collect(),
            })
            .collect(),
    )
}

// ---------------------------------------------------------------------------
// SPEECH-005: guided pronunciation practice (vowel-length contrast).
// The pack's speech profile declares the feature assess-guided with
// calibration null: this path NEVER records mastery. Recordings stay in
// memory (docs/08). ASR/alignment success is not a pronunciation score:
// corrections require reliable duration evidence, every gap abstains
// with a reason (docs/05).
// ---------------------------------------------------------------------------

#[derive(serde::Deserialize, Clone)]
struct PronunciationAttempt {
    pack_id: String,
    /// Content ids (validated; address pack media).
    short_unit: String,
    long_unit: String,
    /// Surface forms used as alignment units (pack-declared text).
    short_text: String,
    long_text: String,
    wav_b64: String,
}

#[derive(Serialize)]
struct PronunciationCorrection {
    feature_id: String,
    band: &'static str,
    feedback_template_id: String,
}

#[derive(Serialize, Clone, Default)]
struct PitchComparison {
    /// Normalized (semitones from speaker median) contours; never Hz.
    reference: Vec<f64>,
    attempt: Vec<f64>,
    reference_shape: String,
    attempt_shape: String,
    unavailable_reason: Option<String>,
}

#[derive(Serialize)]
struct PronunciationResult {
    corrections: Vec<PronunciationCorrection>,
    abstain_reason: Option<String>,
    pitch: PitchComparison,
    /// SPEECH-007: "guided" unless a Qualified calibration record binds the
    /// exact installed combination and the request sits inside its envelope.
    mode: &'static str,
    mode_reason: Option<String>,
}

#[derive(serde::Deserialize, Clone)]
struct DictationAttempt {
    pack_id: String,
    /// The sentence the learner reads aloud; checked against the transcript.
    target_text: String,
    wav_b64: String,
}

#[derive(Serialize)]
struct DictationResult {
    /// Some(true) matched, Some(false) clearly different, None abstained.
    matched: Option<bool>,
    /// What the recognizer heard, shown for honest guided feedback.
    heard: String,
    target: String,
    abstain_reason: Option<String>,
    /// Dictation is a production/recognition check, never a pronunciation
    /// grade or mastery; always guided.
    mode: &'static str,
}

#[derive(Serialize, Clone)]
struct DictationTarget {
    id: String,
    /// Surface form shown to the learner (may contain kanji).
    text: String,
    /// Kana reading used as the recognition comparison target.
    reading: String,
    gloss: String,
}

fn empty_pitch(reason: &str) -> PitchComparison {
    PitchComparison {
        unavailable_reason: Some(reason.into()),
        ..Default::default()
    }
}

fn band_kebab(b: &lts_speech_api::ConfidenceBand) -> &'static str {
    match b {
        lts_speech_api::ConfidenceBand::Confident => "confident",
        lts_speech_api::ConfidenceBand::PossibleIssue => "possible-issue",
        lts_speech_api::ConfidenceBand::UnableToAssess => "unable-to-assess",
    }
}

fn outcome_reason<T>(o: &lts_speech_api::ProviderOutcome<T>) -> String {
    use lts_speech_api::ProviderOutcome as O;
    match o {
        O::QualityRejected { reason } => format!("quality:{}", reason.as_str()),
        O::UtteranceMismatch { reason } => format!("mismatch:{}", reason.as_str()),
        O::Abstained { reason } => format!("abstained:{}", reason.as_str()),
        O::Unsupported { reason } => format!("unsupported:{}", reason.as_str()),
        O::ProviderError { reason } => format!("error:{}", reason.as_str()),
        O::Usable { .. } => "usable".into(),
    }
}

/// Content ids are the only safe path components (no traversal).
fn checked_unit(raw: &str) -> Result<String, String> {
    lts_domain::ContentId::parse(raw)
        .map(|_| raw.to_string())
        .map_err(|_| "invalid unit id".to_string())
}

/// Resolve a media id to a file inside an installed pack. A pack that ships
/// audio declares one `media/manifest.jsonl` row per media id (ADR-0016), and
/// that row's `file` field is authoritative — filenames are pack data, not a
/// convention the engine may assume. Packs with no manifest (the bundled demo
/// pack) keep the older `{id}.wav` layout.
fn media_file(pack_dir: &Path, unit: &str) -> PathBuf {
    let dir = pack_dir.join("media");
    if let Ok(text) = std::fs::read_to_string(dir.join("manifest.jsonl")) {
        for line in text.lines().filter(|l| !l.trim().is_empty()) {
            let Ok(row) = serde_json::from_str::<serde_json::Value>(line) else {
                continue;
            };
            if row["id"].as_str() != Some(unit) {
                continue;
            }
            if let Some(file) = row["file"].as_str() {
                // Rows are pack-root-relative (`media/<name>`, enforced by the
                // media-asset schema). A pack is untrusted data, so re-check
                // that no row can climb out of the pack's media directory.
                let rel = match file.strip_prefix("media/") {
                    Some(rest) if !rest.is_empty() => rest,
                    _ => continue,
                };
                if rel.split('/').any(|seg| seg == ".." || seg.is_empty()) {
                    continue;
                }
                return dir.join(rel);
            }
        }
    }
    dir.join(format!("{unit}.wav"))
}

/// Media ids for a phonology contrast item are `{contrast-id}-{index}`; the
/// demo pair used to spell the same thing `{contrast-id}.short`/`.long`. Both
/// forms map back to the contrast record that declares production targets.
fn contrast_id_for_unit(unit: &str) -> Option<&str> {
    if let Some(cid) = unit
        .strip_suffix(".short")
        .or_else(|| unit.strip_suffix(".long"))
    {
        return Some(cid);
    }
    match unit.rsplit_once('-') {
        Some((head, tail)) if !tail.is_empty() && tail.bytes().all(|b| b.is_ascii_digit()) => {
            Some(head)
        }
        _ => None,
    }
}

/// The media ids an installed pack actually carries. A pack built under
/// ADR-0016 declares each one in `media/manifest.jsonl`, and that manifest is
/// authoritative — presence of files in a *source checkout* proves nothing,
/// because generated audio is gitignored. A pack with no manifest (the
/// pre-ADR-0016 bundled demo pack) is read by the only convention it itself
/// uses: `{id}.wav` inside its installed media directory. Empty when the pack
/// ships no audio, which is what installing an audio-less archive yields.
/// Audio ids the pack actually ships, memoized per immutable version root
/// (the same contract every other pack cache relies on). K-68 pushed the
/// manifest from 694 rows to 4,613, and the plan path asks `media_ids` on
/// every compose — parsing that manifest per click is what moved the
/// walkthrough's `practice_plan` marker from ~60 ms to ~140 ms.
static MEDIA_IDS_CACHE: std::sync::LazyLock<
    std::sync::Mutex<
        std::collections::HashMap<PathBuf, std::sync::Arc<std::collections::HashSet<String>>>,
    >,
> = std::sync::LazyLock::new(|| std::sync::Mutex::new(Default::default()));

fn media_ids(pack_dir: &Path) -> std::sync::Arc<std::collections::HashSet<String>> {
    let mut cache = MEDIA_IDS_CACHE.lock().unwrap_or_else(|e| e.into_inner());
    if let Some(hit) = cache.get(pack_dir) {
        return std::sync::Arc::clone(hit);
    }
    let ids = std::sync::Arc::new(media_ids_uncached(pack_dir));
    cache.insert(pack_dir.to_path_buf(), std::sync::Arc::clone(&ids));
    ids
}

fn media_ids_uncached(pack_dir: &Path) -> std::collections::HashSet<String> {
    let mut out = std::collections::HashSet::new();
    let dir = pack_dir.join("media");
    if let Ok(text) = std::fs::read_to_string(dir.join("manifest.jsonl")) {
        for line in text.lines().filter(|l| !l.trim().is_empty()) {
            if let Ok(row) = serde_json::from_str::<serde_json::Value>(line) {
                if let Some(id) = row["id"].as_str() {
                    out.insert(id.to_string());
                }
            }
        }
        return out;
    }
    if let Ok(entries) = std::fs::read_dir(&dir) {
        for entry in entries.flatten() {
            if entry.path().extension().and_then(|e| e.to_str()) == Some("wav") {
                if let Some(stem) = entry.path().file_stem().and_then(|s| s.to_str()) {
                    out.insert(stem.to_string());
                }
            }
        }
    }
    out
}

/// Pack-driven pronunciation demo pair: the first vowel-length contrast in
/// the installed pack's phonology data (fallback: first contrast). Keeps
/// language content in the pack, not the app (docs/07).
#[derive(Serialize, Clone)]
struct PronunciationDemo {
    short_unit: String,
    long_unit: String,
    short_text: String,
    long_text: String,
}

#[tauri::command]
fn pronunciation_demo(pack_id: String) -> Result<PronunciationDemo, String> {
    pronunciation_demo_at(&data_dir(), &pack_id)
}

fn pronunciation_demo_at(data: &Path, pack_id: &str) -> Result<PronunciationDemo, String> {
    if !packs::valid_pack_id(pack_id) {
        return Err("pack not allowlisted".into());
    }
    let packs_root = data.join("packs");
    let version =
        lts_langpack::archive::current_version(pack_id, &packs_root).ok_or("pack not installed")?;
    let path = packs_root
        .join(pack_id)
        .join(&version)
        .join("phonology")
        .join("contrasts.jsonl")
        .clone();
    let text = std::fs::read_to_string(path)
        .map_err(|_| "pack declares no phonology contrasts".to_string())?;
    let mut fallback: Option<PronunciationDemo> = None;
    for line in text.lines().filter(|l| !l.trim().is_empty()) {
        let v: serde_json::Value =
            serde_json::from_str(line).map_err(|_| "bad contrasts.jsonl".to_string())?;
        let id = v["id"].as_str().ok_or("contrast missing id")?;
        let items = match v["items"].as_array() {
            Some(a) if a.len() >= 2 => a,
            _ => continue,
        };
        let demo = PronunciationDemo {
            // Item media ids are `{contrast-id}-{index}` in this pack's
            // media/manifest.jsonl, the same convention the discrimination
            // runner already uses; `.short`/`.long` named files that never
            // existed, so "Hear reference" could never resolve.
            short_unit: format!("{id}-0"),
            long_unit: format!("{id}-1"),
            short_text: items[0]["text"].as_str().unwrap_or("").to_string(),
            long_text: items[1]["text"].as_str().unwrap_or("").to_string(),
        };
        if v["feature_id"]
            .as_str()
            .is_some_and(|f| f.contains("vowel-length"))
        {
            return Ok(demo);
        }
        if fallback.is_none() {
            fallback = Some(demo);
        }
    }
    fallback.ok_or_else(|| "pack declares no phonology contrasts".into())
}

/// Where a bundled build's aligner payload lives (`<resource_dir>/aligner`).
/// Set once at startup from the resource dir, exactly like `BUNDLED_TTS`
/// (runtime input, so `OnceLock` not `LazyLock`); unset for bare/dev builds,
/// which degrade to the dev vendor tree or to honest abstention
/// (ADR-0019, following the ADR-0009 variant pattern).
static BUNDLED_SIDECAR: std::sync::OnceLock<PathBuf> = std::sync::OnceLock::new();

/// Which aligner a call actually got, so both feedback and status can name the
/// source instead of only reporting that one was missing.
#[derive(Debug, Clone, PartialEq)]
struct AlignerSource {
    source: &'static str,
    binary: PathBuf,
    model: PathBuf,
    runtime_version: Option<String>,
}

/// Why there is no aligner. `Cpu` is deliberately distinct from `Absent`: the
/// payload is on the disk and the host CPU is below its instruction-set floor,
/// which is a different thing to tell a person than "this build has no runtime".
#[derive(Debug, Clone, PartialEq)]
enum AlignerMiss {
    ModelOff,
    Cpu { requires_cpu: String },
    Absent,
}

/// Single probe for every aligner caller, so "is there an aligner, and where
/// from" is answered one way everywhere.
///
/// Priority (ADR-0019, mirroring `resolve_tts`):
/// 1. `bundled` — the release overlay's staged sidecar under
///    `<resource_dir>/aligner/<platform>`, gated by the payload manifest:
///    schema, component, build platform, file sizes, the CPU check, and one deep
///    pass over every declared sha256 the first time this process touches it;
/// 2. `bench` — the development vendor tree (`LTS_BENCH_VENDOR` /
///    `~/.cache/lts-bench`), never shipped, taking the model from the installed
///    catalog entry when the user installed one.
fn aligner_probe(data: &Path) -> Result<AlignerSource, AlignerMiss> {
    let pref = models::load_speech_pref(data);
    if pref.asr_model == "off" {
        return Err(AlignerMiss::ModelOff);
    }
    let bundled = BUNDLED_SIDECAR.get().cloned();
    let vendor = match std::env::var("LTS_BENCH_VENDOR") {
        Ok(v) => Some(PathBuf::from(v)),
        Err(_) => std::env::var("HOME")
            .ok()
            .map(|h| PathBuf::from(h).join(".cache/lts-bench")),
    };
    aligner_probe_with(data, &pref.asr_model, bundled.as_deref(), vendor.as_deref())
}

/// Environment-independent core: `bundled`/`vendor` are passed in so priority,
/// abstention and the CPU gate are testable without touching process state.
fn aligner_probe_with(
    data: &Path,
    asr_model: &str,
    bundled: Option<&Path>,
    vendor: Option<&Path>,
) -> Result<AlignerSource, AlignerMiss> {
    use lts_speech_runtime::sidecar::{Sidecar, SidecarProblem, host_platform};
    let mut cpu_floor: Option<String> = None;
    if let Some(root) = bundled {
        let dir = root.join(host_platform());
        if dir.exists() {
            match Sidecar::load(&dir) {
                Ok(sc) => {
                    if bundled_payload_verified(&dir, &sc) {
                        return Ok(AlignerSource {
                            source: "bundled",
                            binary: sc.binary(),
                            model: sc.model_path(),
                            runtime_version: Some(sc.manifest.runtime.version.clone()),
                        });
                    }
                    // Present at the right sizes but a declared digest disagrees:
                    // a truncated download or disk rot. Executing it would give
                    // confidently wrong word timing, which is worse for a learner
                    // than no feedback at all, so it reads as absent.
                }
                Err(SidecarProblem::CpuUnsupported { requires_cpu }) => {
                    cpu_floor = Some(requires_cpu)
                }
                // A half-staged or malformed payload must never be executed; it
                // reads as absent, and aligner_status says so.
                Err(_) => {}
            }
        }
    }
    let miss = || match cpu_floor.clone() {
        Some(requires_cpu) => AlignerMiss::Cpu { requires_cpu },
        None => AlignerMiss::Absent,
    };
    let vendor = vendor.ok_or_else(miss)?;
    let binary = vendor.join("whisper.cpp/build/bin/whisper-cli");
    if !binary.exists() {
        return Err(miss());
    }
    // The dev path keeps the model from the model manager when installed, and
    // from the vendor tree otherwise (the bench harness layout).
    let entry = models::load_catalog()
        .models
        .into_iter()
        .find(|m| m.id == asr_model);
    let Some(entry) = entry else {
        return Err(miss());
    };
    let Some(file) = entry.files.first() else {
        return Err(miss());
    };
    let installed = models::model_dir(data, &entry).join(&file.path);
    let model = if installed.exists() {
        installed
    } else {
        let v = vendor.join(&file.path);
        if v.exists() {
            v
        } else {
            return Err(miss());
        }
    };
    Ok(AlignerSource {
        source: "bench",
        binary,
        model,
        runtime_version: None,
    })
}

/// One deep digest pass per bundled payload per process.
///
/// `Sidecar::load` checks declared sizes, which cannot see same-size corruption:
/// a weights file with a flipped byte still loads and still returns confident
/// nonsense. The manifest sits next to the files it describes, so this is
/// integrity against damage rather than a security boundary against someone who
/// can already rewrite the payload — package signing carries that. Cost measured
/// on the real 82,016,429 B payload: one pass in 0.05 s warm, so it runs on the
/// first probe and the answer is remembered per payload directory.
fn bundled_payload_verified(dir: &Path, sidecar: &lts_speech_runtime::sidecar::Sidecar) -> bool {
    static VERIFIED: std::sync::OnceLock<
        std::sync::Mutex<std::collections::HashMap<PathBuf, bool>>,
    > = std::sync::OnceLock::new();
    let cache = VERIFIED.get_or_init(|| std::sync::Mutex::new(std::collections::HashMap::new()));
    let mut guard = cache
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner());
    *guard
        .entry(dir.to_path_buf())
        .or_insert_with(|| sidecar.verify_hashes().is_ok())
}

/// The abstention token the frontend maps to honest copy. `aligner-cpu-unsupported`
/// is new with the bundled sidecar: the runtime is present but the host CPU is
/// below the payload's stated floor, so the sentence is different.
fn aligner_miss_reason(miss: &AlignerMiss) -> String {
    match miss {
        AlignerMiss::ModelOff => "speech-model-off".into(),
        AlignerMiss::Cpu { .. } => "aligner-cpu-unsupported".into(),
        AlignerMiss::Absent => "aligner-unavailable".into(),
    }
}

/// What this build can honestly say about the alignment runtime, so a panel can
/// name what is present (and what a CPU requirement means) instead of only
/// reacting to a failed attempt (docs/18).
#[derive(Debug, Clone, serde::Serialize)]
struct AlignerStatus {
    available: bool,
    /// `"bundled"` (release sidecar) | `"bench"` (development vendor tree) | none.
    source: Option<String>,
    runtime_version: Option<String>,
    /// The payload's stated instruction-set floor, when a payload exists.
    requires_cpu: Option<String>,
    /// The abstention token the frontend maps to copy, when unavailable.
    reason: Option<String>,
}

fn aligner_status_at(data: &Path) -> AlignerStatus {
    let floor = bundled_cpu_floor();
    match aligner_probe(data) {
        Ok(src) => AlignerStatus {
            available: true,
            source: Some(src.source.into()),
            runtime_version: src.runtime_version,
            requires_cpu: floor,
            reason: None,
        },
        Err(miss) => AlignerStatus {
            available: false,
            source: None,
            runtime_version: None,
            requires_cpu: match &miss {
                AlignerMiss::Cpu { requires_cpu } => Some(requires_cpu.clone()),
                _ => floor,
            },
            reason: Some(aligner_miss_reason(&miss)),
        },
    }
}

/// Reads only the staged payload's manifest, with no gates, so a panel can state
/// the requirement even when the payload is unusable or incomplete.
fn bundled_cpu_floor() -> Option<String> {
    let root = BUNDLED_SIDECAR.get()?;
    let dir = root.join(lts_speech_runtime::sidecar::host_platform());
    let raw = std::fs::read_to_string(dir.join(lts_speech_runtime::sidecar::MANIFEST_FILE)).ok()?;
    serde_yaml::from_str::<lts_speech_runtime::sidecar::SidecarManifest>(&raw)
        .ok()
        .map(|m| m.runtime.requires_cpu)
        .filter(|s| !s.trim().is_empty())
}

#[tauri::command]
async fn aligner_status() -> AlignerStatus {
    match tauri::async_runtime::spawn_blocking(|| aligner_status_at(&data_dir())).await {
        Ok(s) => s,
        Err(e) => {
            eprintln!("aligner_status failed: {e}");
            AlignerStatus {
                available: false,
                source: None,
                runtime_version: None,
                requires_cpu: None,
                reason: None,
            }
        }
    }
}

#[tauri::command]
fn pronunciation_check(attempt: PronunciationAttempt) -> Result<PronunciationResult, String> {
    pronunciation_check_at(&data_dir(), attempt)
}

fn pronunciation_check_at(
    data: &Path,
    attempt: PronunciationAttempt,
) -> Result<PronunciationResult, String> {
    if !packs::valid_pack_id(&attempt.pack_id) {
        return Err("pack not allowlisted".into());
    }
    let short = checked_unit(&attempt.short_unit)?;
    let long = checked_unit(&attempt.long_unit)?;
    use base64::Engine;
    let wav_bytes = base64::engine::general_purpose::STANDARD
        .decode(&attempt.wav_b64)
        .map_err(|_| "invalid wav payload".to_string())?;
    if wav_bytes.len() > 10 * 1024 * 1024 {
        return Err("attempt too large".into());
    }
    let audio = lts_speech_runtime::from_wav16(&wav_bytes).map_err(|e| e.to_string())?;
    let abstain = |reason: String| PronunciationResult {
        corrections: Vec::new(),
        abstain_reason: Some(reason),
        pitch: empty_pitch("not-aligned"),
        mode: "guided",
        mode_reason: Some("not-scored".into()),
    };
    let packs_root = data.join("packs");
    let version = lts_langpack::archive::current_version(&attempt.pack_id, &packs_root)
        .ok_or("pack not installed")?;
    let pack_dir = packs_root.join(&attempt.pack_id).join(&version);
    let pref = models::load_speech_pref(data);
    let aligner = match aligner_probe(data) {
        Ok(src) => lts_speech_runtime::WhisperConstrainedAligner {
            binary: src.binary,
            model: src.model,
            language: "ja".into(),
            threshold: 0.6,
        },
        Err(miss) => return Ok(abstain(aligner_miss_reason(&miss))),
    };
    let expected = lts_speech_api::ExpectedUtterance {
        content_id: long.clone(),
        units: vec![attempt.short_text.clone(), attempt.long_text.clone()],
    };
    // Verification gate first: alignment abstains on mismatch before any
    // pronunciation evidence is considered (docs/05).
    let alignment = match aligner.align(&audio, &expected) {
        lts_speech_api::ProviderOutcome::Usable { value, .. } => value,
        other => return Ok(abstain(outcome_reason(&other))),
    };
    // Production target: prefer a pack-declared ratio (language-neutral; the
    // engine never infers phonology). Fall back to a reference recording,
    // gated on a genuine contrast. When a target is declared, reference media
    // is optional and used only for the pitch contour.
    // Media ids for contrast items are `{contrast-id}-{index}` (what
    // scripts/generate-pack-audio.py writes into media/manifest.jsonl); the
    // older demo ids spelled them `.short`/`.long`. Both map back to the
    // contrast record that declares the production target.
    let declared = contrast_id_for_unit(&attempt.short_unit)
        .and_then(|cid| {
            contrast_entries(data, &attempt.pack_id, &version)
                .ok()?
                .into_iter()
                .find(|e| e.id == cid)?
                .production
        })
        .filter(|p| p.measure == "voiced-duration-ratio");

    let short_ref = media_file(&pack_dir, &short);
    let long_ref = media_file(&pack_dir, &long);
    let media: Option<(lts_speech_api::AudioBuffer, lts_speech_api::AudioBuffer)> =
        match (std::fs::read(&short_ref), std::fs::read(&long_ref)) {
            (Ok(sb), Ok(lb)) => match (
                lts_speech_runtime::from_wav16(&sb),
                lts_speech_runtime::from_wav16(&lb),
            ) {
                (Ok(sr), Ok(lr)) => Some((sr, lr)),
                _ => None,
            },
            _ => None,
        };

    let reference_ratio = match (&declared, &media) {
        (Some(p), _) => p.expected_ratio,
        (None, Some((sr, lr))) => {
            let rs = lts_speech_runtime::acoustic::voiced_seconds(sr, 320, 0.01);
            let rl = lts_speech_runtime::acoustic::voiced_seconds(lr, 320, 0.01);
            if rs <= 0.0 || rl <= 0.0 {
                return Ok(abstain("reference-media-invalid".into()));
            }
            // A reference pair that barely lengthens (TTS ~1.04) cannot anchor a
            // length judgement; scoring against it misleads (docs/05).
            if rl / rs < 1.4 {
                return Ok(abstain("reference-contrast-weak".into()));
            }
            rl / rs
        }
        (None, None) => return Ok(abstain("reference-media-missing".into())),
    };

    let features =
        match lts_speech_runtime::VoicedDurationFeature::default().extract(&audio, &alignment) {
            lts_speech_api::ProviderOutcome::Usable { value, .. } => value,
            other => return Ok(abstain(outcome_reason(&other))),
        };

    // SPEECH-006: normalized contour comparison (reference-only profile).
    // Needs a long reference recording; unavailable when the pack ships no media.
    let pitch = match &media {
        Some((_, lr)) => {
            let prosody = lts_speech_runtime::prosody::AutocorrelationProsody::default();
            let ref_alignment = lts_speech_api::Alignment {
                spans: vec![lts_speech_api::AlignmentSpan {
                    unit_id: attempt.long_text.clone(),
                    start_sample: 0,
                    end_sample: lr.samples.len(),
                    confidence: Some(1.0),
                }],
                overall_confidence: Some(1.0),
            };
            let att_obs = prosody
                .analyze(&audio, &alignment)
                .value()
                .map(|p| p.observations)
                .unwrap_or_default();
            let ref_obs = prosody
                .analyze(lr, &ref_alignment)
                .value()
                .map(|p| p.observations)
                .unwrap_or_default();
            let att_c = lts_speech_runtime::prosody::normalize_semitones(&att_obs);
            let ref_c = lts_speech_runtime::prosody::normalize_semitones(&ref_obs);
            if att_c.is_empty() || ref_c.is_empty() {
                empty_pitch("insufficient-voiced-material")
            } else {
                PitchComparison {
                    reference: ref_c.clone(),
                    attempt: att_c.clone(),
                    reference_shape: lts_speech_runtime::prosody::contour_shape_text(&ref_c),
                    attempt_shape: lts_speech_runtime::prosody::contour_shape_text(&att_c),
                    unavailable_reason: None,
                }
            }
        }
        None => empty_pitch("no-reference-recording"),
    };

    let evidence = lts_speech_api::PronunciationEvidence {
        alignment,
        features,
        prosody: None,
    };
    let mut interpreter = lts_speech_runtime::VowelLengthInterpreter {
        short_unit_id: attempt.short_text.clone(),
        long_unit_id: attempt.long_text.clone(),
        reference_ratio,
        ..Default::default()
    };
    if let Some(p) = &declared {
        interpreter.tolerance_low = p.tolerance_low;
        interpreter.tolerance_high = p.tolerance_high;
    }
    // SPEECH-007 gate: automatic feedback only when a Qualified calibration
    // record binds this exact installed combination and the request sits
    // inside its declared envelope; otherwise guided (docs/17 §97).
    use lts_speech_api::calibration::{ComponentRef, InstalledCombination, load_records};
    let info = lts_speech_api::PronunciationInterpreter::info(&interpreter);
    let model_entry = models::load_catalog()
        .models
        .into_iter()
        .find(|m| m.id == pref.asr_model);
    let installed = InstalledCombination {
        provider: ComponentRef {
            id: "whisper.cpp".into(),
            // No version introspection from the sidecar binary: an empty
            // version can never match a record, so drift fails closed.
            version: String::new(),
            sha256: None,
        },
        model: ComponentRef {
            id: pref.asr_model.clone(),
            version: model_entry
                .as_ref()
                .map(|m| m.version.clone())
                .unwrap_or_default(),
            sha256: model_entry
                .as_ref()
                .and_then(|m| m.files.iter().map(|f| f.sha256.clone()).max()),
        },
        interpreter: ComponentRef {
            id: info.id,
            version: info.version,
            sha256: None,
        },
        pack: ComponentRef {
            id: attempt.pack_id.clone(),
            version: version.clone(),
            sha256: None,
        },
        variety: "standard-japanese".into(),
        context: "pronunciation-practice".into(),
    };
    let eligibility = match load_records(&pack_dir)
        .into_iter()
        .find(|r| r.feature_id == "ja.phon.long-vowel")
    {
        None => lts_speech_api::calibration::Eligibility::Guided {
            reason: "no-calibration-record".into(),
        },
        Some(rec) => lts_speech_api::calibration::eligibility_for(&rec, &installed),
    };
    let (mode, mode_reason) = match &eligibility {
        lts_speech_api::calibration::Eligibility::Automatic => ("automatic", None),
        lts_speech_api::calibration::Eligibility::Guided { reason } => {
            ("guided", Some(reason.clone()))
        }
    };
    Ok(match interpreter.interpret(&evidence) {
        lts_speech_api::ProviderOutcome::Usable { value, .. } => PronunciationResult {
            corrections: value
                .iter()
                .map(|c| PronunciationCorrection {
                    feature_id: c.feature_id.clone(),
                    band: band_kebab(&c.band),
                    feedback_template_id: c.feedback_template_id.clone(),
                })
                .collect(),
            abstain_reason: None,
            pitch,
            mode,
            mode_reason,
        },
        other => PronunciationResult {
            corrections: Vec::new(),
            abstain_reason: Some(outcome_reason(&other)),
            pitch,
            mode,
            mode_reason,
        },
    })
}

/// Free-ASR dictation check (roadmap feature B). The learner reads a known
/// sentence aloud; whisper.cpp transcribes it freely and we compare against
/// the target. Fail-closed: an input-quality rejection, an empty transcript,
/// or an uncertain match all ABSTAIN rather than emit a wrong verdict
/// (docs/05). This whisper build exposes no ASR confidence in its JSON, so
/// the gate is quality + transcript + a character-match ratio band.
fn dictation_check_at(data: &Path, attempt: DictationAttempt) -> Result<DictationResult, String> {
    if !packs::valid_pack_id(&attempt.pack_id) {
        return Err("pack not allowlisted".into());
    }
    let abstain = |reason: String, heard: String| DictationResult {
        matched: None,
        heard,
        target: attempt.target_text.clone(),
        abstain_reason: Some(reason),
        mode: "guided",
    };
    // Dictation needs the recognizer output rather than the aligner object, so it
    // keeps the resolved paths (ADR-0019: one probe, one priority, one vocabulary
    // of reasons).
    let src = match aligner_probe(data) {
        Ok(src) => src,
        Err(miss) => return Ok(abstain(aligner_miss_reason(&miss), String::new())),
    };
    use base64::Engine;
    let wav_bytes = base64::engine::general_purpose::STANDARD
        .decode(&attempt.wav_b64)
        .map_err(|_| "invalid wav payload".to_string())?;
    if wav_bytes.len() > 10 * 1024 * 1024 {
        return Err("attempt too large".into());
    }
    let audio = lts_speech_runtime::from_wav16(&wav_bytes).map_err(|e| e.to_string())?;
    // Input-quality gate first: silence/noise/clipping is a retry, never a
    // wrong answer (docs/05).
    let q = lts_speech_runtime::quality::EnergyVad::default().quality(&audio);
    if matches!(q, lts_speech_api::ProviderOutcome::QualityRejected { .. }) {
        return Ok(abstain(outcome_reason(&q), String::new()));
    }
    let tokens =
        lts_speech_runtime::alignment::run_whisper_words(&src.binary, &src.model, "ja", &audio)
            .map_err(|e| e.to_string())?;
    let heard: String = tokens
        .iter()
        .map(|t| t.text.trim())
        .collect::<Vec<_>>()
        .join("");
    if heard.trim().is_empty() {
        return Ok(abstain("asr-no-speech".into(), String::new()));
    }
    let target_chars = normalize_for_match(&attempt.target_text);
    let heard_chars = normalize_for_match(&heard);
    let (ratio, _) = lts_speech_runtime::alignment::char_match(&target_chars, &heard_chars);
    let matched = if ratio >= 0.9 {
        Some(true)
    } else if ratio <= 0.4 {
        Some(false)
    } else {
        return Ok(abstain("uncertain".into(), heard));
    };
    Ok(DictationResult {
        matched,
        heard,
        target: attempt.target_text,
        abstain_reason: None,
        mode: "guided",
    })
}

/// Normalize for dictation comparison: drop whitespace/punctuation (reuse the
/// aligner's rule) then fold katakana to hiragana, so the recognizer's kana
/// choice does not cause a false negative on a correct reading.
fn normalize_for_match(s: &str) -> Vec<char> {
    lts_speech_runtime::alignment::normalize_chars(s)
        .into_iter()
        .map(|c| match c {
            // Katakana U+30A1..U+30F9 -> Hiragana U+3041..U+3079.
            '\u{30a1}'..='\u{30f9}' => char::from_u32(c as u32 - 0x60).unwrap_or(c),
            _ => c,
        })
        .collect()
}

/// Pick a sentence from the installed pack to dictate (roadmap feature B: tie
/// dictation to curriculum instead of a free-text box). Prefers kana-only
/// sentences so the free-ASR transcript compares cleanly to the reading;
/// `offset` cycles the candidates for variety.
fn dictation_target_at(data: &Path, pack_id: &str, offset: u32) -> Result<DictationTarget, String> {
    if !packs::valid_pack_id(pack_id) {
        return Err("pack not allowlisted".into());
    }
    let packs_root = data.join("packs");
    let version =
        lts_langpack::archive::current_version(pack_id, &packs_root).ok_or("pack not installed")?;
    let text = match jsonl_dir_texts(data, pack_id, &version, "sentences") {
        Ok(texts) => texts.join("\n"),
        Err(_) => return Err("pack declares no sentences".to_string()),
    };
    let mut kana_only: Vec<DictationTarget> = Vec::new();
    let mut all: Vec<DictationTarget> = Vec::new();
    for line in text.lines().filter(|l| !l.trim().is_empty()) {
        let v: serde_json::Value =
            serde_json::from_str(line).map_err(|_| "bad sentences entries".to_string())?;
        let t = DictationTarget {
            id: v["id"].as_str().unwrap_or("").to_string(),
            text: v["text"].as_str().unwrap_or("").to_string(),
            reading: v["reading"].as_str().unwrap_or("").to_string(),
            gloss: v["gloss"].as_str().unwrap_or("").to_string(),
        };
        if t.text.is_empty() || t.reading.is_empty() {
            continue;
        }
        if normalize_for_match(&t.text) == normalize_for_match(&t.reading) {
            kana_only.push(t.clone());
        }
        all.push(t);
    }
    let pool = if kana_only.is_empty() {
        &all
    } else {
        &kana_only
    };
    if pool.is_empty() {
        return Err("pack declares no usable sentences".into());
    }
    Ok(pool[(offset as usize) % pool.len()].clone())
}

/// Reference audio for immediate comparison; served from the installed
/// pack's media, addressed only by allowlisted pack + validated content id.
#[tauri::command]
fn reference_audio(pack_id: String, unit_id: String) -> Result<String, String> {
    reference_audio_at(&data_dir(), &pack_id, &unit_id)
}

fn reference_audio_at(data: &Path, pack_id: &str, unit_id: &str) -> Result<String, String> {
    if !packs::valid_pack_id(pack_id) {
        return Err("pack not allowlisted".into());
    }
    let unit = checked_unit(unit_id)?;
    let version = lts_langpack::archive::current_version(pack_id, &data.join("packs"))
        .ok_or("pack not installed")?;
    let path = media_file(&data.join("packs").join(pack_id).join(&version), &unit);
    let bytes = std::fs::read(&path).map_err(|_| "reference not found".to_string())?;
    use base64::Engine;
    Ok(base64::engine::general_purpose::STANDARD.encode(&bytes))
}

// ---------------------------------------------------------------------------
// WRITE-001: production-writing practice (typed answers via the platform
// IME; no handwriting surface exists or is required).
// ---------------------------------------------------------------------------

/// Writing targets are derived entirely from the pack, so they are parsed once
/// per immutable version root (K-63-follow). Opening the Writing tab and every
/// answer submit used to re-read *and* re-parse all 3,920 lexicon rows: that
/// measured 99 ms per `writing_task` call and 126 ms for the tab. Caching the
/// raw file text instead measured no win at all, which is why this cache holds
/// the parsed rows and not the bytes.
static WRITING_CACHE: std::sync::LazyLock<
    std::sync::Mutex<
        std::collections::HashMap<PathBuf, std::sync::Arc<Vec<lts_activity::writing::WritingTask>>>,
    >,
> = std::sync::LazyLock::new(|| std::sync::Mutex::new(Default::default()));

/// The shared target list for one version root. A pack that will not parse is
/// never cached, so a later call still reports the real error.
fn writing_tasks(
    data: &Path,
    pack_id: &str,
    version: &str,
) -> Result<std::sync::Arc<Vec<lts_activity::writing::WritingTask>>, String> {
    let root = data.join("packs").join(pack_id).join(version);
    let mut cache = WRITING_CACHE.lock().unwrap_or_else(|e| e.into_inner());
    if let Some(hit) = cache.get(&root) {
        return Ok(std::sync::Arc::clone(hit));
    }
    let tasks = std::sync::Arc::new(build_writing_tasks(data, pack_id, version)?);
    cache.insert(root, std::sync::Arc::clone(&tasks));
    Ok(tasks)
}

/// Resolve the profile's active pack, then take the shared target list for it.
fn writing_tasks_for_profile(
    data: &Path,
    profile_id: &str,
) -> Result<std::sync::Arc<Vec<lts_activity::writing::WritingTask>>, String> {
    let active = packs::active_pack(data, profile_id)?;
    let pack_id = active.first().ok_or("no active language pack")?;
    let version = lts_langpack::archive::current_version(pack_id, &data.join("packs"))
        .ok_or("pack not installed")?;
    writing_tasks(data, pack_id, &version)
}

/// Writing targets come from the active pack's lexicon. Entry ids are
/// validated as content ids; no filesystem path is derived from them.
fn build_writing_tasks(
    data: &Path,
    pack_id: &str,
    version: &str,
) -> Result<Vec<lts_activity::writing::WritingTask>, String> {
    let text = lexicon_texts(data, pack_id, version)?.join("\n");
    fn field<'a>(v: &'a serde_json::Value, key: &str) -> Option<&'a str> {
        v.get(key).and_then(|x| x.as_str())
    }
    let mut tasks = Vec::new();
    for line in text.lines() {
        let Ok(entry) = serde_json::from_str::<serde_json::Value>(line) else {
            continue;
        };
        let Some(id) = field(&entry, "id") else {
            continue;
        };
        if lts_domain::ContentId::parse(id).is_err() {
            continue;
        }
        let Some(forms) = entry.get("forms").and_then(|v| v.as_array()) else {
            continue;
        };
        let primary = forms
            .iter()
            .find(|f| {
                f.get("is_primary")
                    .and_then(|b| b.as_bool())
                    .unwrap_or(false)
            })
            .or(forms.first());
        let Some(answer) = primary
            .and_then(|f| field(f, "text"))
            .filter(|t| !t.is_empty())
        else {
            continue;
        };
        let accepted: Vec<String> = forms
            .iter()
            .filter_map(|f| field(f, "text"))
            .filter(|t| *t != answer)
            .map(String::from)
            .collect();
        let Some(prompt_text) = entry
            .get("glosses")
            .and_then(|g| g.as_object())
            .and_then(|o| o.values().next())
            .and_then(|v| v.as_array())
            .and_then(|a| a.first())
            .and_then(|v| v.as_str())
            .filter(|t| !t.is_empty())
        else {
            continue;
        };
        let readings = entry.get("readings").and_then(|v| v.as_array());
        let answer_reading = pick_reading(
            entry.get("readings").and_then(|v| v.as_array()),
            primary.and_then(|f| field(f, "script")),
        );
        let answer_romaji = readings.as_ref().and_then(|a| {
            a.iter()
                .find(|r| r.get("transliteration_system").is_some())
                .and_then(|r| field(r, "text"))
                .map(String::from)
        });
        tasks.push(lts_activity::writing::WritingTask {
            item_id: id.to_string(),
            answer: answer.to_string(),
            accepted,
            prompt_text: prompt_text.to_string(),
            answer_reading,
            answer_romaji,
        });
    }
    Ok(tasks)
}

/// Next unattempted writing target for the profile (deterministic order;
/// attempted items rotate out so practice advances).
#[tauri::command]
fn writing_task(profile_id: String) -> Result<Option<lts_activity::writing::WritingTask>, String> {
    let data = data_dir();
    let tasks = writing_tasks_for_profile(&data, &profile_id)?;
    let store = lts_storage::Store::open(data.join("profiles.db")).map_err(|e| e.to_string())?;
    let attempted: std::collections::HashSet<String> = store
        .evidence_for_profile(&profile_id)
        .map_err(|e| e.to_string())?
        .iter()
        .filter(|e| e.modality == lts_domain::ActivityModality::ProductionWriting)
        .flat_map(|e| e.targets.iter().map(|c| c.as_str().to_string()))
        .collect();
    Ok(tasks
        .iter()
        .find(|t| !attempted.contains(&t.item_id))
        .cloned())
}

/// Grade a typed answer and record production-writing evidence. Hint use
/// is recorded as support, so a hinted success is never independent.
#[tauri::command]
fn writing_submit(
    profile_id: String,
    item_id: String,
    answer: String,
    used_hint: bool,
) -> Result<lts_activity::writing::WritingGrade, String> {
    let data = data_dir();
    checked_unit(&item_id)?;
    let tasks = writing_tasks_for_profile(&data, &profile_id)?;
    let task = tasks
        .iter()
        .find(|t| t.item_id == item_id)
        .ok_or("unknown writing target")?
        .clone();
    let grade = lts_activity::writing::grade_writing(&answer, &task);
    let active = packs::active_pack(&data, &profile_id)?;
    let pack_id = active.first().ok_or("no active language pack")?;
    let version = lts_langpack::archive::current_version(pack_id, &data.join("packs"))
        .ok_or("pack not installed")?;
    let store = lts_storage::Store::open(data.join("profiles.db")).map_err(|e| e.to_string())?;
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| e.to_string())?;
    let event = lts_learner_model::AttemptDraft::new(
        vec![lts_domain::ContentId::parse(&item_id).map_err(|_| "invalid item id")?],
        lts_domain::ActivityModality::ProductionWriting,
        lts_domain::ContentId::parse(&item_id).map_err(|_| "invalid activity id")?,
        pack_id,
        &version,
    )
    .support(
        lts_domain::SupportLevel::new(if used_hint { 1 } else { 0 }).ok_or("bad support")?,
        if used_hint {
            vec!["writing-hint".to_string()]
        } else {
            vec![]
        },
    )
    .scored(if grade.correct {
        lts_domain::Score::Correct
    } else {
        lts_domain::Score::Incorrect
    })
    .finish(
        lts_domain::EventId::new(format!("write-{}-{}", now.as_secs(), now.subsec_nanos())),
        rfc3339_utc(now.as_secs()),
        lts_domain::ProfileId::new(&profile_id),
    );
    store.append_evidence(&event).map_err(|e| e.to_string())?;
    Ok(grade)
}

// ---------------------------------------------------------------------------
// UX-003: first lessons — the runnable multiple-choice recall-meaning
// runner. The correct answer never crosses IPC: the task is rebuilt
// natively at submit and graded there, and every scored attempt feeds
// the scheduler so the item later surfaces as a due review.
// ---------------------------------------------------------------------------

#[derive(Serialize)]
struct PracticeTask {
    item_id: String,
    /// Hidden for listening tasks: a visible transcript would
    /// disqualify comprehension-listening evidence (MASTERY_POLICY
    /// `disqualifying_for`).
    surface: Option<String>,
    /// Non-Japanese packs: plain reading aid. Japanese packs use the
    /// adaptive reader fields below (READ-001).
    reading: Option<String>,
    furigana: Option<String>,
    romaji: Option<String>,
    faded_by_mastery: bool,
    choices: Vec<String>,
    /// K-12: typed-answer runner (cloze/dictation) instead of choices.
    /// Grading compares the typed string server-side; the answer never
    /// crosses IPC before grading.
    typed: bool,
    /// K-42: review posture of the underlying pack record, shown
    /// wherever content is presented. Display-only: grading, evidence,
    /// and scheduling never consult it (no penalty on unreviewed
    /// content).
    status: String,
    /// K-44: phrase slot info for phrase entries (surface split into
    /// fixed frame + variable parts). Display-only: grading, evidence,
    /// and scheduling never consult it.
    slots: Vec<PhraseSlotView>,
}

#[derive(Serialize, PartialEq, Debug)]
struct PhraseSlotView {
    text: String,
    alternatives: Vec<String>,
    label: Option<String>,
    /// True when this slot is the recall target (deterministic per
    /// item id, same FNV rule as choice placement).
    target: bool,
}
/// K-44: render an entry's declared slots for the UI. The recall
/// target slot is chosen deterministically per item id (same FNV rule
/// as choice placement), so the same phrase always highlights the same
/// slot without RNG. Non-phrase entries render no slots.
fn phrase_slot_views(item_id: &str, entry: &LexEntry) -> Vec<PhraseSlotView> {
    if entry.kind != "phrase" || entry.slots.is_empty() {
        return Vec::new();
    }
    let target = (fnv1a(item_id) % entry.slots.len() as u64) as usize;
    entry
        .slots
        .iter()
        .enumerate()
        .map(|(i, s)| PhraseSlotView {
            text: s.text.clone(),
            alternatives: s.alternatives.clone(),
            label: s.label.clone(),
            target: i == target,
        })
        .collect()
}

#[derive(Serialize)]
struct PracticeGrade {
    correct: bool,
    correct_choice: String,
}

/// READ-001: adaptive kana/furigana/romaji display for Japanese-script
/// items. Returns None for non-Japanese surfaces (the reader's
/// canonical-form rule is Japanese-specific; other scripts keep the
/// plain reading aid). Settings come from profile settings; reveals
/// against the auto-fade rule are recorded as support actions.
fn reader_display(
    data: &Path,
    profile_id: &str,
    entry: &LexEntry,
    reveal: bool,
) -> Option<lts_activity::ReadingDisplay> {
    use lts_activity::{ScriptKind, script_of};
    let is_japanese = entry.surface.chars().any(|c| {
        matches!(
            script_of(c),
            ScriptKind::Hiragana | ScriptKind::Katakana | ScriptKind::Kanji
        )
    });
    if !is_japanese {
        return None;
    }
    let item = lts_activity::ReadingItem {
        item_id: entry.id.clone(),
        text: entry.surface.clone(),
        reading: entry.reading.clone(),
        romaji: entry.romaji.clone(),
    };
    let store = lts_storage::Store::open(data.join("profiles.db")).ok()?;
    let reading_state = derive_pairs(&store, profile_id, &rfc3339_utc(now_secs()))
        .ok()?
        .into_iter()
        .find(|d| {
            d.content_id == entry.id
                && d.dimension == lts_domain::ActivityModality::ComprehensionReading
        })
        .map(|d| d.state);
    let romaji_mode = store
        .get_setting(profile_id, "romaji-mode")
        .ok()
        .flatten()
        .and_then(|v| v.as_str().map(String::from))
        .map(|s| match s.as_str() {
            "always" => lts_activity::RomajiUserMode::Always,
            "off" => lts_activity::RomajiUserMode::Off,
            _ => lts_activity::RomajiUserMode::Auto,
        })
        .unwrap_or_default();
    let kana_literacy = store
        .get_setting(profile_id, "kana-literacy-established")
        .ok()
        .flatten()
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    let settings = lts_activity::ReaderSettings {
        romaji_mode,
        furigana_forced: reveal.then_some(true),
        romaji_forced: reveal.then_some(true),
        kana_literacy_established: kana_literacy,
    };
    Some(lts_activity::render_reading_display(
        &item,
        reading_state,
        &settings,
    ))
}

/// Build a deterministic choice task: the entry's gloss is correct,
/// distractors are other same-pack glosses in file order, and the
/// correct position is a hash of the item id (stable, no RNG).
fn practice_build(
    data: &Path,
    profile_id: &str,
    content_id: &str,
    modality: &str,
    reveal_reading: bool,
) -> Result<(PracticeTask, String, Vec<String>), String> {
    checked_unit(content_id)?;
    let dim = parse_dimension(modality).ok_or("unknown modality")?;
    if !matches!(
        dim,
        lts_domain::ActivityModality::RecallMeaning
            | lts_domain::ActivityModality::ComprehensionListening
            | lts_domain::ActivityModality::OrthographyRecognition
            | lts_domain::ActivityModality::PhonologicalDiscrimination
            | lts_domain::ActivityModality::ProductionWriting
            | lts_domain::ActivityModality::OrthographicEncoding
    ) {
        return Err("no practice runner for this activity yet".to_string());
    }
    let active = packs::active_pack(data, profile_id)?;
    let pack_id = active.first().ok_or("no active language pack")?;
    let version = lts_langpack::archive::current_version(pack_id, &data.join("packs"))
        .ok_or("pack not installed")?;
    // K-12: typed runners. Cloze blanks a pack-declared target in the
    // sentence (production-writing: the target is never visible);
    // dictation hides the text entirely and grades the transcription
    // on orthographic-encoding (dictation-of-target is disqualifying
    // support for production-writing, so it must never land there).
    if dim == lts_domain::ActivityModality::ProductionWriting {
        return cloze_task_build(data, pack_id, &version, content_id);
    }
    if dim == lts_domain::ActivityModality::OrthographicEncoding {
        return dictation_task_build(data, pack_id, &version, content_id);
    }
    // K-16: kanji ids drill meaning/reading recognition; kana chart
    // ids keep the orthography runner. Dispatch is by declared pack
    // data, never by script literals.
    if dim == lts_domain::ActivityModality::OrthographyRecognition
        && kanji_entries(data, pack_id, &version)?
            .iter()
            .any(|e| e.id == content_id)
    {
        return kanji_task_build(data, pack_id, &version, content_id, dim);
    }
    if dim == lts_domain::ActivityModality::RecallMeaning
        && kanji_entries(data, pack_id, &version)?
            .iter()
            .any(|e| e.id == content_id)
    {
        return kanji_task_build(data, pack_id, &version, content_id, dim);
    }
    if dim == lts_domain::ActivityModality::OrthographyRecognition {
        return orth_task_build(data, pack_id, &version, content_id);
    }
    if dim == lts_domain::ActivityModality::PhonologicalDiscrimination {
        return contrast_task_build(data, pack_id, &version, content_id);
    }
    // Sentence ids practise comprehension-listening against the audio the
    // pack declares for them; word ids keep the gloss-choice path below,
    // where synthesis covers the absence of a recording.
    if dim == lts_domain::ActivityModality::ComprehensionListening
        && sentence_entries(data, pack_id, &version)?
            .iter()
            .any(|e| e.id == content_id)
    {
        return listening_sentence_task_build(data, pack_id, &version, content_id);
    }
    let entries = lexicon_entries(data, pack_id, &version)?;
    let entry = entries
        .iter()
        .find(|e| e.id == content_id)
        .ok_or("unknown practice target")?;
    let mut choices: Vec<String> = entries
        .iter()
        .filter(|e| e.id != content_id && e.gloss != entry.gloss)
        .map(|e| e.gloss.clone())
        .take(3)
        .collect();
    if choices.is_empty() {
        return Err("pack lexicon is too small for a choice task".to_string());
    }
    let item_id = format!("{content_id}#{}", dimension_kebab(dim));
    let pos = (fnv1a(&item_id) % (choices.len() as u64 + 1)) as usize;
    choices.insert(pos, entry.gloss.clone());
    // READ-001: Japanese-script items render through the adaptive
    // reader (furigana/romaji fade with per-item reading mastery and
    // user settings); other scripts keep the plain reading aid.
    let display = (dim == lts_domain::ActivityModality::RecallMeaning)
        .then(|| reader_display(data, profile_id, entry, reveal_reading))
        .flatten();
    let reveals = display
        .as_ref()
        .map(|d| {
            d.support_reveals
                .iter()
                .map(|a| a.label().to_string())
                .collect()
        })
        .unwrap_or_default();
    let slots = phrase_slot_views(&item_id, entry);
    let task = PracticeTask {
        item_id,
        surface: (dim == lts_domain::ActivityModality::RecallMeaning)
            .then(|| entry.surface.clone()),
        reading: if display.is_some() {
            None
        } else {
            (dim == lts_domain::ActivityModality::RecallMeaning)
                .then(|| entry.reading.clone())
                .flatten()
        },
        furigana: display.as_ref().and_then(|d| d.furigana.clone()),
        romaji: display.as_ref().and_then(|d| d.romaji.clone()),
        faded_by_mastery: display.as_ref().is_some_and(|d| d.faded_by_mastery),
        choices,
        slots,
        typed: false,
        status: entry.status.clone(),
    };
    let correct = entry.gloss.clone();
    Ok((task, correct, reveals))
}

/// Comprehension-listening over a pack sentence: the learner hears the audio
/// the pack declares for that sentence and chooses its meaning. The transcript
/// never crosses IPC (`surface` stays None — a visible transcript is listed as
/// disqualifying support for this dimension in MASTERY_POLICY). Distractors
/// are other same-pack sentence glosses in file order; the correct position is
/// hashed from the item id, so the task is stable without RNG. Requires
/// declared audio: offering a listening item with nothing to hear would be a
/// dead activity.
fn listening_sentence_task_build(
    data: &Path,
    pack_id: &str,
    version: &str,
    content_id: &str,
) -> Result<(PracticeTask, String, Vec<String>), String> {
    let entries = sentence_entries(data, pack_id, version)?;
    let entry = entries
        .iter()
        .find(|e| e.id == content_id)
        .ok_or("unknown practice target")?;
    let gloss = entry
        .gloss
        .clone()
        .filter(|g| !g.trim().is_empty())
        .ok_or("sentence declares no meaning to test")?;
    if !media_ids(&data.join("packs").join(pack_id).join(version)).contains(content_id) {
        return Err("pack declares no audio for this sentence".to_string());
    }
    let mut seen = std::collections::HashSet::from([gloss.clone()]);
    let mut choices: Vec<String> = entries
        .iter()
        .filter_map(|e| e.gloss.clone())
        .filter(|g| seen.insert(g.clone()))
        .take(3)
        .collect();
    if choices.is_empty() {
        return Err("pack sentences are too few for a listening choice task".to_string());
    }
    let item_id = format!(
        "{content_id}#{}",
        dimension_kebab(lts_domain::ActivityModality::ComprehensionListening)
    );
    let pos = (fnv1a(&item_id) % (choices.len() as u64 + 1)) as usize;
    choices.insert(pos, gloss.clone());
    let task = PracticeTask {
        item_id,
        surface: None,
        reading: None,
        furigana: None,
        romaji: None,
        faded_by_mastery: false,
        choices,
        slots: Vec::new(),
        typed: false,
        status: entry.status.clone(),
    };
    Ok((task, gloss, Vec::new()))
}

/// K-04 script-instruction runner: symbol<->reading choice task from
/// pack-declared orthography units. Direction is deterministic per unit
/// (half the chart practices symbol->reading, half reading->symbol), so
/// tasks are stable across runs without RNG. Distractors are other
/// units' readings/symbols in file order.
fn orth_task_build(
    data: &Path,
    pack_id: &str,
    version: &str,
    content_id: &str,
) -> Result<(PracticeTask, String, Vec<String>), String> {
    let entries = orth_entries(data, pack_id, version)?;
    let entry = entries
        .iter()
        .find(|e| e.id == content_id)
        .ok_or("unknown practice target")?;
    let recognize = fnv1a(content_id) % 2 == 0;
    let (prompt, answer) = if recognize {
        (&entry.symbol, &entry.reading)
    } else {
        (&entry.reading, &entry.symbol)
    };
    let mut seen = std::collections::HashSet::from([answer.clone()]);
    let mut choices: Vec<String> = entries
        .iter()
        .filter(|e| e.id != content_id)
        .map(|e| {
            if recognize {
                e.reading.clone()
            } else {
                e.symbol.clone()
            }
        })
        .filter(|c| seen.insert(c.clone()))
        .take(3)
        .collect();
    if choices.is_empty() {
        return Err("pack orthography set is too small for a choice task".to_string());
    }
    let item_id = format!("{content_id}#orthography-recognition");
    let pos = (fnv1a(&item_id) % (choices.len() as u64 + 1)) as usize;
    choices.insert(pos, answer.clone());
    let task = PracticeTask {
        item_id,
        surface: Some(prompt.clone()),
        reading: None,
        furigana: None,
        romaji: None,
        faded_by_mastery: false,
        choices,
        typed: false,
        status: entry.status.clone(),
        slots: Vec::new(),
    };
    Ok((task, answer.clone(), Vec::new()))
}

/// K-16 character drill: meaning recognition (recall-meaning) or
/// reading recognition (orthography-recognition) from the character.
/// The prompt is always the character; the answer is the entry's first
/// declared meaning/reading, distractors are other entries' first
/// meaning/reading in file order — the same deterministic choice
/// construction as the orthography runner.
fn kanji_task_build(
    data: &Path,
    pack_id: &str,
    version: &str,
    content_id: &str,
    dim: lts_domain::ActivityModality,
) -> Result<(PracticeTask, String, Vec<String>), String> {
    let entries = kanji_entries(data, pack_id, version)?;
    let entry = entries
        .iter()
        .find(|e| e.id == content_id)
        .ok_or("unknown kanji target")?;
    let reading = dim == lts_domain::ActivityModality::OrthographyRecognition;
    let answer = if reading {
        entry.readings[0].clone()
    } else {
        entry.meanings[0].clone()
    };
    let mut seen = std::collections::HashSet::from([answer.clone()]);
    let mut choices: Vec<String> = entries
        .iter()
        .filter(|e| e.id != content_id)
        .map(|e| {
            if reading {
                e.readings[0].clone()
            } else {
                e.meanings[0].clone()
            }
        })
        .filter(|c| seen.insert(c.clone()))
        .take(3)
        .collect();
    if choices.is_empty() {
        return Err("pack kanji set is too small for a choice task".to_string());
    }
    let item_id = format!("{content_id}#{}", dimension_kebab(dim));
    let pos = (fnv1a(&item_id) % (choices.len() as u64 + 1)) as usize;
    choices.insert(pos, answer.clone());
    let task = PracticeTask {
        item_id,
        surface: Some(entry.character.clone()),
        reading: None,
        furigana: None,
        romaji: None,
        faded_by_mastery: false,
        choices,
        typed: false,
        status: entry.status.clone(),
        slots: Vec::new(),
    };
    Ok((task, answer, Vec::new()))
}

/// K-16 UI view: every pack-declared character with its SRS due dates
/// per drill. Undrilled characters show no due date (they enter the
/// plan stream as new items); drilled ones resurface on schedule.
#[derive(Serialize)]
struct KanjiCard {
    id: String,
    character: String,
    radicals: Vec<String>,
    mnemonic: Option<String>,
    status: String,
    meaning_due: Option<String>,
    reading_due: Option<String>,
}

fn kanji_list_at(data: &Path, profile_id: &str) -> Result<Vec<KanjiCard>, String> {
    let active = packs::active_pack(data, profile_id)?;
    let pack_id = active.first().ok_or("no active language pack")?;
    let version = lts_langpack::archive::current_version(pack_id, &data.join("packs"))
        .ok_or("pack not installed")?;
    let entries = kanji_entries(data, pack_id, &version)?;
    let store = lts_storage::Store::open(data.join("profiles.db")).map_err(|e| e.to_string())?;
    let rows = store
        .scheduler_state(profile_id)
        .map_err(|e| e.to_string())?;
    let due = |id: &str, dim: &str| {
        rows.iter()
            .find(|r| r.item_id == format!("{id}#{dim}"))
            .map(|r| r.due_at.clone())
    };
    Ok(entries
        .into_iter()
        .map(|e| KanjiCard {
            meaning_due: due(&e.id, "recall-meaning"),
            reading_due: due(&e.id, "orthography-recognition"),
            id: e.id,
            character: e.character,
            radicals: e.radicals,
            mnemonic: e.mnemonic,
            status: e.status,
        })
        .collect())
}

#[tauri::command]
fn kanji_list(profile_id: String) -> Result<Vec<KanjiCard>, String> {
    kanji_list_at(&data_dir(), &profile_id)
}

/// K-10 perceptual discrimination runner: play one member of a
/// pack-declared phonological contrast (minimal pair / HVPT set) and
/// ask which was heard. The target member is chosen deterministically
/// per contrast (hash of the content id), so tasks are stable without
/// RNG; the choices are the whole contrast set — the written forms ARE
/// the answer space (two-alternative forced choice), but the target is
/// never marked and the correct answer never crosses IPC pre-grading.
/// The surface stays hidden while listening, the same disqualification
/// rule the listening runner enforces (MASTERY_POLICY).
fn contrast_task_build(
    data: &Path,
    pack_id: &str,
    version: &str,
    content_id: &str,
) -> Result<(PracticeTask, String, Vec<String>), String> {
    let entries = contrast_entries(data, pack_id, version)?;
    let entry = entries
        .iter()
        .find(|e| e.id == content_id)
        .ok_or("unknown contrast target")?;
    let target = (fnv1a(content_id) % entry.items.len() as u64) as usize;
    let answer = entry.items[target].text.clone();
    let choices: Vec<String> = entry.items.iter().map(|i| i.text.clone()).collect();
    let item_id = format!("{content_id}#phonological-discrimination");
    let task = PracticeTask {
        item_id,
        surface: None,
        reading: None,
        furigana: None,
        romaji: None,
        faded_by_mastery: false,
        choices,
        typed: false,
        status: entry.status.clone(),
        slots: Vec::new(),
    };
    Ok((task, answer, Vec::new()))
}

/// K-10: audio for the discrimination runner. The played member is
/// resolved natively with the same deterministic target index the
/// grader uses, so the transcript never crosses IPC. Media-first:
/// `media/<contrast-id>-<item-index>.wav` (licensed recordings win),
/// otherwise local synthesis labeled as model output (TTS-001).
#[tauri::command]
fn contrast_audio(profile_id: String, content_id: String) -> Result<SpeechAudio, String> {
    contrast_audio_at(&data_dir(), &profile_id, &content_id)
}

fn contrast_audio_at(
    data: &Path,
    profile_id: &str,
    content_id: &str,
) -> Result<SpeechAudio, String> {
    checked_unit(content_id)?;
    let active = packs::active_pack(data, profile_id)?;
    let pack_id = active.first().ok_or("no active language pack")?;
    let version = lts_langpack::archive::current_version(pack_id, &data.join("packs"))
        .ok_or("pack not installed")?;
    let entries = contrast_entries(data, pack_id, &version)?;
    let entry = entries
        .iter()
        .find(|e| e.id == content_id)
        .ok_or("unknown contrast")?;
    let target = (fnv1a(content_id) % entry.items.len() as u64) as usize;
    let media_id = format!("{content_id}-{target}");
    use base64::Engine;
    let media = data
        .join("packs")
        .join(pack_id)
        .join(&version)
        .join("media")
        .join(format!("{media_id}.wav"));
    if let Ok(bytes) = std::fs::read(&media) {
        let source =
            declared_media_provenance(&data.join("packs").join(pack_id).join(&version), &media_id)
                .unwrap_or("licensed-recording");
        return Ok(SpeechAudio {
            wav_b64: base64::engine::general_purpose::STANDARD.encode(bytes),
            source,
        });
    }
    speech_audio_at(data, pack_id, &media_id, &entry.items[target].text)
}

/// K-11: shadowing (speak-along) targets. FORMATIVE ONLY: this path
/// never records evidence — with no calibrated scorer, shadowing
/// feedback is self-comparison (play model audio, speak, play your
/// recording back). Exposing the pack lexicon keeps the activity
/// pack-data-driven for any language.
#[derive(Serialize)]
struct ShadowItem {
    content_id: String,
    surface: String,
    reading: Option<String>,
    romaji: Option<String>,
}

#[tauri::command]
async fn shadowing_items(profile_id: String) -> Result<Vec<ShadowItem>, String> {
    tauri::async_runtime::spawn_blocking(move || shadowing_items_at(&data_dir(), &profile_id))
        .await
        .map_err(|e| format!("shadowing-items failed: {e}"))?
}

fn shadowing_items_at(data: &Path, profile_id: &str) -> Result<Vec<ShadowItem>, String> {
    let active = packs::active_pack(data, profile_id)?;
    let pack_id = active.first().ok_or("no active language pack")?;
    let version = lts_langpack::archive::current_version(pack_id, &data.join("packs"))
        .ok_or("pack not installed")?;
    Ok(lexicon_entries(data, pack_id, &version)?
        .into_iter()
        .map(|e| ShadowItem {
            content_id: e.id,
            surface: e.surface,
            reading: e.reading,
            romaji: e.romaji,
        })
        .collect())
}

/// K-12: pack-declared sentence content (`sentences/entries.jsonl`).
/// Language-neutral: the engine blanks declared cloze targets or plays
/// the sentence for dictation; it never parses the language.
#[derive(Debug, Clone)]
struct SentenceEntry {
    id: String,
    text: String,
    reading: Option<String>,
    romaji: Option<String>,
    gloss: Option<String>,
    cloze_targets: Vec<String>,
    status: String,
}

fn sentence_entries(
    data: &Path,
    pack_id: &str,
    version: &str,
) -> Result<Vec<SentenceEntry>, String> {
    let text = jsonl_dir_texts(data, pack_id, version, "sentences")?.join("\n");
    let mut out = Vec::new();
    for line in text.lines() {
        let Ok(entry) = serde_json::from_str::<serde_json::Value>(line) else {
            continue;
        };
        let Some(id) = entry.get("id").and_then(|v| v.as_str()) else {
            continue;
        };
        if lts_domain::ContentId::parse(id).is_err() {
            continue;
        }
        let Some(sent) = entry.get("text").and_then(|v| v.as_str()) else {
            continue;
        };
        out.push(SentenceEntry {
            id: id.to_string(),
            text: sent.to_string(),
            reading: entry
                .get("reading")
                .and_then(|v| v.as_str())
                .map(String::from),
            romaji: entry
                .get("romaji")
                .and_then(|v| v.as_str())
                .map(String::from),
            gloss: entry
                .get("gloss")
                .and_then(|v| v.as_str())
                .map(String::from),
            cloze_targets: entry
                .get("cloze_targets")
                .and_then(|v| v.as_array())
                .map(|a| {
                    a.iter()
                        .filter_map(|t| t.as_str().map(String::from))
                        .collect()
                })
                .unwrap_or_default(),
            status: entry
                .get("status")
                .and_then(|v| v.as_str())
                .unwrap_or("draft")
                .to_string(),
        });
    }
    Ok(out)
}

/// K-12 cloze: one declared target is blanked deterministically per
/// sentence (stable across runs, no RNG); the learner types it from
/// context. The target string never appears in the task payload, so
/// production-writing evidence stays valid (no disqualifying support).
fn cloze_task_build(
    data: &Path,
    pack_id: &str,
    version: &str,
    content_id: &str,
) -> Result<(PracticeTask, String, Vec<String>), String> {
    let entry = sentence_entries(data, pack_id, version)?
        .into_iter()
        .find(|e| e.id == content_id)
        .ok_or("unknown sentence target")?;
    let target = entry
        .cloze_targets
        .get((fnv1a(content_id) % entry.cloze_targets.len() as u64) as usize)
        .ok_or("sentence declares no cloze targets")?
        .clone();
    let prompt = entry.text.replacen(&target, "______", 1);
    let item_id = format!("{content_id}#production-writing");
    let task = PracticeTask {
        item_id,
        surface: Some(prompt),
        reading: None,
        furigana: None,
        romaji: None,
        faded_by_mastery: false,
        choices: Vec::new(),
        typed: true,
        status: entry.status.clone(),
        slots: Vec::new(),
    };
    Ok((task, target, Vec::new()))
}

/// K-12 dictation: the written form is fully hidden (a visible target
/// would be disqualifying support); the learner types what they hear.
fn dictation_task_build(
    data: &Path,
    pack_id: &str,
    version: &str,
    content_id: &str,
) -> Result<(PracticeTask, String, Vec<String>), String> {
    let entry = sentence_entries(data, pack_id, version)?
        .into_iter()
        .find(|e| e.id == content_id)
        .ok_or("unknown sentence target")?;
    let item_id = format!("{content_id}#orthographic-encoding");
    let task = PracticeTask {
        item_id,
        surface: None,
        reading: None,
        furigana: None,
        romaji: None,
        faded_by_mastery: false,
        choices: Vec::new(),
        typed: true,
        status: entry.status,
        slots: Vec::new(),
    };
    Ok((task, entry.text, Vec::new()))
}

/// K-12: dictation audio. Media-first (`media/<sentence-id>.wav`), TTS
/// fallback; the transcript is chosen server-side and never crosses IPC.
#[tauri::command]
async fn dictation_audio(profile_id: String, content_id: String) -> Result<SpeechAudio, String> {
    tauri::async_runtime::spawn_blocking(move || {
        dictation_audio_at(&data_dir(), &profile_id, &content_id)
    })
    .await
    .map_err(|e| format!("dictation-audio failed: {e}"))?
}

fn dictation_audio_at(
    data: &Path,
    profile_id: &str,
    content_id: &str,
) -> Result<SpeechAudio, String> {
    checked_unit(content_id)?;
    let active = packs::active_pack(data, profile_id)?;
    let pack_id = active.first().ok_or("no active language pack")?;
    let version = lts_langpack::archive::current_version(pack_id, &data.join("packs"))
        .ok_or("pack not installed")?;
    let entry = sentence_entries(data, pack_id, &version)?
        .into_iter()
        .find(|e| e.id == content_id)
        .ok_or("unknown sentence target")?;
    speech_audio_at(data, pack_id, content_id, &entry.text)
}

/// K-13: graded reading. Stories are pack-declared ordered sentence
/// sequences (`stories/*.yaml`). The mode is FORMATIVE input practice:
/// it records NO evidence — "graded" means ordered by learner-known
/// content and scaffolded by the READ-001 reader, not scored.
#[derive(Debug, Clone)]
struct StoryEntry {
    id: String,
    title: String,
    description: Option<String>,
    sentences: Vec<String>,
    status: String,
}

fn story_entries(data: &Path, pack_id: &str, version: &str) -> Result<Vec<StoryEntry>, String> {
    let dir = data
        .join("packs")
        .join(pack_id)
        .join(version)
        .join("stories");
    let mut out = Vec::new();
    let Ok(rd) = std::fs::read_dir(&dir) else {
        return Ok(out); // packs without stories simply offer none
    };
    let mut files: Vec<_> = rd
        .filter_map(|e| e.ok())
        .map(|e| e.path())
        .filter(|p| {
            p.extension()
                .map(|x| x == "yaml" || x == "yml")
                .unwrap_or(false)
        })
        .collect();
    files.sort();
    for path in files {
        let Ok(text) = std::fs::read_to_string(&path) else {
            continue;
        };
        let Ok(doc) = serde_yaml::from_str::<serde_yaml::Value>(&text) else {
            continue;
        };
        let Some(id) = doc.get("id").and_then(|v| v.as_str()) else {
            continue;
        };
        if lts_domain::ContentId::parse(id).is_err() {
            continue;
        }
        let sentences = doc
            .get("sentences")
            .and_then(|v| v.as_sequence())
            .map(|a| {
                a.iter()
                    .filter_map(|s| s.as_str().map(String::from))
                    .filter(|s| lts_domain::ContentId::parse(s).is_ok())
                    .collect()
            })
            .unwrap_or_default();
        out.push(StoryEntry {
            id: id.to_string(),
            title: doc
                .get("title")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string(),
            description: doc
                .get("description")
                .and_then(|v| v.as_str())
                .map(String::from),
            sentences,
            status: doc
                .get("status")
                .and_then(|v| v.as_str())
                .unwrap_or("draft")
                .to_string(),
        });
    }
    Ok(out)
}

#[derive(Serialize)]
struct StorySummary {
    id: String,
    title: String,
    description: Option<String>,
    status: String,
    sentence_count: usize,
}

#[tauri::command]
async fn story_list(profile_id: String) -> Result<Vec<StorySummary>, String> {
    tauri::async_runtime::spawn_blocking(move || story_list_at(&data_dir(), &profile_id))
        .await
        .map_err(|e| format!("story-list failed: {e}"))?
}

fn story_list_at(data: &Path, profile_id: &str) -> Result<Vec<StorySummary>, String> {
    let active = packs::active_pack(data, profile_id)?;
    let pack_id = active.first().ok_or("no active language pack")?;
    let version = lts_langpack::archive::current_version(pack_id, &data.join("packs"))
        .ok_or("pack not installed")?;
    Ok(story_entries(data, pack_id, &version)?
        .into_iter()
        .map(|s| StorySummary {
            sentence_count: s.sentences.len(),
            id: s.id,
            title: s.title,
            description: s.description,
            status: s.status,
        })
        .collect())
}

#[derive(Serialize)]
struct StorySentenceView {
    content_id: String,
    text: String,
    /// Reader-faded scaffolds (READ-001 rules; Unicode-script based).
    furigana: Option<String>,
    romaji: Option<String>,
    faded_by_mastery: bool,
    gloss: Option<String>,
    /// K-42: review posture of the sentence record.
    status: String,
    /// Lexicon entries whose surface occurs in the sentence — the
    /// tap-to-lookup panel. Substring matching is script-agnostic;
    /// lookup is an aid, never evidence.
    known: Vec<LexEntry>,
}

#[derive(Serialize)]
struct StoryView {
    id: String,
    title: String,
    sentences: Vec<StorySentenceView>,
    status: String,
}

#[tauri::command]
async fn story_view(profile_id: String, story_id: String) -> Result<StoryView, String> {
    tauri::async_runtime::spawn_blocking(move || {
        story_view_at(&data_dir(), &profile_id, &story_id)
    })
    .await
    .map_err(|e| format!("story-view failed: {e}"))?
}

/// K-80: the words "in" a sentence are token SPANS, not substring hits.
/// Greedy left-to-right longest match over the pack's lexicon surfaces:
/// each covered span yields exactly ONE entry — こんにちは yields just
/// こんにちは, never the ち or に that sit inside it — an uncovered gap
/// yields nothing, and the result reads in sentence order. Raw
/// containment fabricated a breakdown for every word that merely
/// contains another surface (the ち/intelligence entry inside
/// こんにちは), and a wrong dictionary lookup is what destroys pack
/// trust. Ties (same start, same length) break on entry id.
fn sentence_word_spans<'a>(text: &str, lex: &'a [LexEntry]) -> Vec<&'a LexEntry> {
    let chars: Vec<char> = text.chars().collect();
    let mut surfaces: Vec<(Vec<char>, &LexEntry)> = lex
        .iter()
        .filter(|e| !e.surface.is_empty())
        .map(|e| (e.surface.chars().collect(), e))
        .collect();
    surfaces.sort_by(|a, b| b.0.len().cmp(&a.0.len()).then_with(|| a.1.id.cmp(&b.1.id)));
    let mut out: Vec<&LexEntry> = Vec::new();
    let mut i = 0usize;
    while i < chars.len() {
        if let Some((span, entry)) = surfaces
            .iter()
            .find(|(s, _)| s.len() <= chars.len() - i && chars[i..i + s.len()] == s[..])
        {
            if !out.iter().any(|e| e.id == entry.id) {
                out.push(entry);
            }
            i += span.len();
        } else {
            i += 1;
        }
    }
    out
}

fn story_view_at(data: &Path, profile_id: &str, story_id: &str) -> Result<StoryView, String> {
    checked_unit(story_id)?;
    let active = packs::active_pack(data, profile_id)?;
    let pack_id = active.first().ok_or("no active language pack")?;
    let version = lts_langpack::archive::current_version(pack_id, &data.join("packs"))
        .ok_or("pack not installed")?;
    let story = story_entries(data, pack_id, &version)?
        .into_iter()
        .find(|s| s.id == story_id)
        .ok_or("unknown story")?;
    let sentences = sentence_entries(data, pack_id, &version)?;
    let lex = lexicon_entries(data, pack_id, &version).unwrap_or_default();
    let mut views = Vec::new();
    for sid in &story.sentences {
        let Some(entry) = sentences.iter().find(|e| e.id == *sid) else {
            continue;
        };
        // Reuse the READ-001 reader for per-sentence scaffold fading:
        // the sentence is rendered as a reading item against its own
        // comprehension-reading mastery.
        let proxy = LexEntry {
            id: entry.id.clone(),
            surface: entry.text.clone(),
            reading: entry.reading.clone(),
            romaji: entry.romaji.clone(),
            gloss: entry.gloss.clone().unwrap_or_default(),
            status: entry.status.clone(),
            kind: "sentence".into(),
            slots: Vec::new(),
        };
        let display = reader_display(data, profile_id, &proxy, false);
        // Tap-to-lookup: one entry per covered token span, in sentence
        // order (K-80) — never every surface that appears as a substring.
        let known: Vec<LexEntry> =
            sentence_word_spans(&entry.text, &lex).into_iter().cloned().collect();
        views.push(StorySentenceView {
            content_id: entry.id.clone(),
            text: entry.text.clone(),
            furigana: display.as_ref().and_then(|d| d.furigana.clone()),
            romaji: display.as_ref().and_then(|d| d.romaji.clone()),
            faded_by_mastery: display.as_ref().is_some_and(|d| d.faded_by_mastery),
            gloss: entry.gloss.clone(),
            known,
            status: entry.status.clone(),
        });
    }
    Ok(StoryView {
        id: story.id,
        title: story.title,
        sentences: views,
        status: story.status,
    })
}

/// K-13: per-sentence audio, media-first with model-output fallback
/// (same path as dictation; the written form is already visible in the
/// reader, so no IPC secrecy constraint applies to the text here).
#[tauri::command]
async fn story_audio(profile_id: String, sentence_id: String) -> Result<SpeechAudio, String> {
    tauri::async_runtime::spawn_blocking(move || {
        dictation_audio_at(&data_dir(), &profile_id, &sentence_id)
    })
    .await
    .map_err(|e| format!("story-audio failed: {e}"))?
}

/// K-14: sentence mining — the learner's own lexicon with source
/// citations. Language-agnostic engine feature (not pack data). Mined
/// items get their own SRS rows (`mine-*` item ids) and NEVER write
/// mastery evidence or touch pack-content scheduler rows.
#[derive(Serialize)]
struct MinedItemView {
    id: String,
    surface: String,
    reading: Option<String>,
    gloss: Option<String>,
    source_citation: String,
    created_at: String,
    due_at: Option<String>,
    /// False when this surface was already in My words: the response
    /// then describes the ORIGINAL stored row, and App.tsx tells the
    /// learner instead of failing on the UNIQUE constraint (K-61).
    was_new: bool,
}

fn is_mined_item(item_id: &str) -> bool {
    item_id.starts_with("mine-")
}

#[tauri::command]
fn mine_add(
    profile_id: String,
    surface: String,
    reading: Option<String>,
    gloss: Option<String>,
    source_citation: String,
) -> Result<MinedItemView, String> {
    mine_add_at(
        &data_dir(),
        &profile_id,
        surface,
        reading,
        gloss,
        source_citation,
    )
}

fn mine_add_at(
    data: &Path,
    profile_id: &str,
    surface: String,
    reading: Option<String>,
    gloss: Option<String>,
    source_citation: String,
) -> Result<MinedItemView, String> {
    let surface = surface.trim().to_string();
    if surface.is_empty() || surface.chars().count() > 100 {
        return Err("surface out of range".into());
    }
    if source_citation.trim().is_empty() {
        return Err("a source citation is required".into());
    }
    let store = lts_storage::Store::open(data.join("profiles.db")).map_err(|e| e.to_string())?;
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| e.to_string())?;
    let created_at = rfc3339_utc(now.as_secs());
    let id = format!("mine-{}-{}", now.as_secs(), now.subsec_nanos());
    let outcome = store
        .add_mined(
            profile_id,
            lts_storage::NewMinedItem {
                id: &id,
                surface: &surface,
                reading: reading.as_deref(),
                gloss: gloss.as_deref(),
                source_citation: source_citation.trim(),
                created_at: &created_at,
            },
        )
        .map_err(|e| e.to_string())?;
    if outcome.was_new {
        return Ok(MinedItemView {
            id: outcome.id,
            surface,
            reading,
            gloss,
            source_citation: source_citation.trim().to_string(),
            created_at,
            due_at: None,
            was_new: true,
        });
    }
    // Repeat mine: report what is actually stored (the add folded the
    // caller's annotations into the existing row) so the UI copy is
    // honest and no raw database text reaches the learner.
    let stored = store
        .mined_items(profile_id)
        .map_err(|e| e.to_string())?
        .into_iter()
        .find(|m| m.id == outcome.id);
    let (reading, gloss, source_citation, row_created_at) = match stored {
        Some(m) => (m.reading, m.gloss, m.source_citation, m.created_at),
        None => (
            reading,
            gloss,
            source_citation.trim().to_string(),
            created_at,
        ),
    };
    let due_at = store
        .scheduler_state(profile_id)
        .map_err(|e| e.to_string())?
        .into_iter()
        .find(|r| r.item_id == outcome.id && r.scheduler == lts_scheduler::SPIKE_VERSION)
        .map(|r| r.due_at);
    Ok(MinedItemView {
        id: outcome.id,
        surface,
        reading,
        gloss,
        source_citation,
        created_at: row_created_at,
        due_at,
        was_new: false,
    })
}

#[tauri::command]
fn mine_list(profile_id: String) -> Result<Vec<MinedItemView>, String> {
    mine_list_at(&data_dir(), &profile_id)
}

fn mine_list_at(data: &Path, profile_id: &str) -> Result<Vec<MinedItemView>, String> {
    let store = lts_storage::Store::open(data.join("profiles.db")).map_err(|e| e.to_string())?;
    let due: std::collections::HashMap<String, String> = store
        .scheduler_state(profile_id)
        .map_err(|e| e.to_string())?
        .into_iter()
        .filter(|r| is_mined_item(&r.item_id) && r.scheduler == lts_scheduler::SPIKE_VERSION)
        .map(|r| (r.item_id, r.due_at))
        .collect();
    Ok(store
        .mined_items(profile_id)
        .map_err(|e| e.to_string())?
        .into_iter()
        .map(|m| MinedItemView {
            due_at: due.get(&m.id).cloned(),
            id: m.id,
            surface: m.surface,
            reading: m.reading,
            gloss: m.gloss,
            source_citation: m.source_citation,
            created_at: m.created_at,
            was_new: true,
        })
        .collect())
}

#[tauri::command]
fn mine_remove(profile_id: String, item_id: String) -> Result<bool, String> {
    if !is_mined_item(&item_id) {
        return Err("not a mined item id".into());
    }
    let data = data_dir();
    let store = lts_storage::Store::open(data.join("profiles.db")).map_err(|e| e.to_string())?;
    store
        .remove_mined(&profile_id, &item_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn mine_due(profile_id: String) -> Result<Vec<MinedItemView>, String> {
    mine_due_at(&data_dir(), &profile_id)
}

/// D8: the app asks the engine which mined words are due instead of
/// comparing `due_at` against its own clock, so "due" means one thing
/// (the schedule the scheduler wrote, read on the machine that wrote it).
/// An item that has never been graded has no schedule and is therefore
/// never due — the UI must not offer an unscheduled word as review.
fn mine_due_at(data: &Path, profile_id: &str) -> Result<Vec<MinedItemView>, String> {
    let all = mine_list_at(data, profile_id)?;
    let now = rfc3339_utc(now_secs());
    Ok(all
        .into_iter()
        .filter(|m| m.due_at.as_deref().is_some_and(|d| d <= now.as_str()))
        .collect())
}

/// Self-graded recall review of a mined word (surface -> recall the
/// meaning). Updates only the mined item's SRS row; no evidence.
#[tauri::command]
fn mine_grade(profile_id: String, item_id: String, again: bool) -> Result<String, String> {
    mine_grade_at(&data_dir(), &profile_id, &item_id, again)
}

fn mine_grade_at(
    data: &Path,
    profile_id: &str,
    item_id: &str,
    again: bool,
) -> Result<String, String> {
    if !is_mined_item(item_id) {
        return Err("not a mined item id".into());
    }
    let store = lts_storage::Store::open(data.join("profiles.db")).map_err(|e| e.to_string())?;
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| e.to_string())?;
    let spike = lts_scheduler::FsrsSpike::default();
    let prior = store
        .scheduler_state(profile_id)
        .map_err(|e| e.to_string())?
        .into_iter()
        .find(|r| r.item_id == item_id && r.scheduler == lts_scheduler::SPIKE_VERSION)
        .map(|r| serde_json::from_str::<lts_scheduler::ItemState>(&r.params_json))
        .transpose()
        .map_err(|e| e.to_string())?;
    let rating = if again {
        lts_scheduler::Rating::Again
    } else {
        lts_scheduler::Rating::Good
    };
    let decision =
        lts_scheduler::Scheduler::review(&spike, prior.as_ref(), rating, now.as_secs() as i64);
    let due_at = rfc3339_utc(decision.due_at.max(0) as u64);
    store
        .save_scheduler_state(
            profile_id,
            &lts_storage::SchedulerRecord {
                item_id: item_id.to_string(),
                scheduler: lts_scheduler::SPIKE_VERSION.to_string(),
                params_json: serde_json::to_string(&decision.state).map_err(|e| e.to_string())?,
                due_at: due_at.clone(),
            },
        )
        .map_err(|e| e.to_string())?;
    Ok(due_at)
}

/// K-04: once every kana-script orthography unit the active pack
/// teaches has reached at least `supported` recognition mastery, mark
/// kana literacy established (JA_ORTHOGRAPHY_POLICY romaji_fade rule:
/// `hide-item-romaji-when: item-script [hiragana, katakana] +
/// kana-literacy established`). Detection is Unicode-script based, so
/// any pack teaching any script gets the same roll-up for its kana-like
/// base alphabet; the setting is monotonic (a later regression fades
/// scaffolds per-item but does not re-teach the alphabet).
fn establish_kana_literacy(
    data: &Path,
    store: &lts_storage::Store,
    profile_id: &str,
    pack_id: &str,
    version: &str,
    now_secs: u64,
) -> Result<(), String> {
    let kana: Vec<String> = orth_entries(data, pack_id, version)?
        .into_iter()
        .filter(|e| is_kana_script(&e.symbol))
        .map(|e| e.id)
        .collect();
    if kana.is_empty() {
        return Ok(());
    }
    if store
        .get_setting(profile_id, "kana-literacy-established")
        .ok()
        .flatten()
        .and_then(|v| v.as_bool())
        == Some(true)
    {
        return Ok(());
    }
    let derived = derive_pairs(store, profile_id, &rfc3339_utc(now_secs))?;
    let all_supported = kana.iter().all(|id| {
        derived.iter().any(|d| {
            d.content_id == *id
                && d.dimension == lts_domain::ActivityModality::OrthographyRecognition
                && d.state >= lts_domain::MasteryState::Supported
        })
    });
    if all_supported {
        store
            .set_setting(
                profile_id,
                "kana-literacy-established",
                &serde_json::json!(true),
            )
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn practice_task_at(
    data: &Path,
    profile_id: &str,
    content_id: &str,
    modality: &str,
    reveal_reading: bool,
) -> Result<PracticeTask, String> {
    practice_build(data, profile_id, content_id, modality, reveal_reading).map(|(t, _, _)| t)
}

#[tauri::command]
fn practice_task(
    profile_id: String,
    content_id: String,
    modality: String,
    reveal_reading: bool,
) -> Result<PracticeTask, String> {
    practice_task_at(
        &data_dir(),
        &profile_id,
        &content_id,
        &modality,
        reveal_reading,
    )
}

/// Grade a choice natively, record recall-meaning evidence, and upsert
/// the scheduler row so the item later appears in due reviews.
#[tauri::command]
fn practice_submit(
    profile_id: String,
    content_id: String,
    modality: String,
    choice_index: usize,
    answer: Option<String>,
    reveal_reading: bool,
) -> Result<PracticeGrade, String> {
    practice_submit_at(
        &data_dir(),
        &profile_id,
        &content_id,
        &modality,
        choice_index,
        answer,
        reveal_reading,
    )
}
fn practice_submit_at(
    data: &Path,
    profile_id: &str,
    content_id: &str,
    modality: &str,
    choice_index: usize,
    answer: Option<String>,
    reveal_reading: bool,
) -> Result<PracticeGrade, String> {
    practice_submit_inner(
        data,
        profile_id,
        content_id,
        modality,
        choice_index,
        SubmitOpts {
            answer,
            reveal_reading,
            diagnostic: None,
        },
    )
}
/// Grading options shared by practice and placement submits.
/// `diagnostic = Some(assessment_id)` tags the evidence Diagnostic and
/// attributes it to the assessment (K-15); otherwise formative practice.
#[derive(Default)]
struct SubmitOpts<'a> {
    answer: Option<String>,
    reveal_reading: bool,
    diagnostic: Option<&'a str>,
}

fn practice_submit_inner(
    data: &Path,
    profile_id: &str,
    content_id: &str,
    modality: &str,
    choice_index: usize,
    opts: SubmitOpts<'_>,
) -> Result<PracticeGrade, String> {
    let (task, correct_choice, reveals) =
        practice_build(data, profile_id, content_id, modality, opts.reveal_reading)?;
    let correct = if task.typed {
        // K-12: typed grading is exact-match on the trimmed string;
        // the expected answer was built server-side and never sent.
        opts.answer
            .map(|a| a.trim() == correct_choice.trim())
            .unwrap_or(false)
    } else {
        let chosen = task
            .choices
            .get(choice_index)
            .ok_or("choice out of range")?;
        *chosen == correct_choice
    };
    let active = packs::active_pack(data, profile_id)?;
    let pack_id = active.first().ok_or("no active language pack")?;
    let version = lts_langpack::archive::current_version(pack_id, &data.join("packs"))
        .ok_or("pack not installed")?;
    let store = lts_storage::Store::open(data.join("profiles.db")).map_err(|e| e.to_string())?;
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| e.to_string())?;
    let dim = parse_dimension(modality).ok_or("unknown modality")?;
    // Engine neutrality (AGENTS.md): the practiced item IS the activity;
    // no language-specific activity id literals in the engine. Every
    // modality attributes evidence to the content record itself, the
    // same pattern the orthography/sentence/contrast paths already used.
    let activity_id = content_id;
    // K-15: a diagnostic attempt is attributed to the pack assessment.
    let activity_id = opts.diagnostic.unwrap_or(activity_id);
    let event = lts_learner_model::AttemptDraft::new(
        vec![lts_domain::ContentId::parse(content_id).map_err(|_| "invalid item id")?],
        dim,
        lts_domain::ContentId::parse(activity_id).map_err(|_| "invalid activity id")?,
        pack_id,
        &version,
    )
    .assessment_kind(if opts.diagnostic.is_some() {
        lts_domain::AssessmentKind::Diagnostic
    } else {
        lts_domain::AssessmentKind::Formative
    })
    .support(
        // A reading revealed against the auto-fade rule is a form cue:
        // support level 3, with the actual reveal actions recorded
        // (docs/03 §5; the success is never independent).
        lts_domain::SupportLevel::new(if reveals.is_empty() { 0 } else { 3 })
            .ok_or("bad support")?,
        reveals,
    )
    .scored(if correct {
        lts_domain::Score::Correct
    } else {
        lts_domain::Score::Incorrect
    })
    .finish(
        lts_domain::EventId::new(format!("practice-{}-{}", now.as_secs(), now.subsec_nanos())),
        rfc3339_utc(now.as_secs()),
        lts_domain::ProfileId::new(profile_id),
    );
    store.append_evidence(&event).map_err(|e| e.to_string())?;
    if dim == lts_domain::ActivityModality::OrthographyRecognition {
        establish_kana_literacy(data, &store, profile_id, pack_id, &version, now.as_secs())?;
    }
    if let Some(rating) = lts_scheduler::rating_from_evidence(&event) {
        let spike = lts_scheduler::FsrsSpike::default();
        let prior = store
            .scheduler_state(profile_id)
            .map_err(|e| e.to_string())?
            .into_iter()
            .find(|r| r.item_id == task.item_id && r.scheduler == lts_scheduler::SPIKE_VERSION)
            .map(|r| serde_json::from_str::<lts_scheduler::ItemState>(&r.params_json))
            .transpose()
            .map_err(|e| e.to_string())?;
        let decision =
            lts_scheduler::Scheduler::review(&spike, prior.as_ref(), rating, now.as_secs() as i64);
        store
            .save_scheduler_state(
                profile_id,
                &lts_storage::SchedulerRecord {
                    item_id: task.item_id.clone(),
                    scheduler: lts_scheduler::SPIKE_VERSION.to_string(),
                    params_json: serde_json::to_string(&decision.state)
                        .map_err(|e| e.to_string())?,
                    due_at: rfc3339_utc(decision.due_at.max(0) as u64),
                },
            )
            .map_err(|e| e.to_string())?;
    }
    Ok(PracticeGrade {
        correct,
        correct_choice,
    })
}

// ---------------------------------------------------------------------------
// K-15: placement / diagnostic assessment (docs/03 §10). Packs declare
// goal-linked assessments; the placement pass runs one low-stakes task
// per assessment against its goal's unit content. Evidence is tagged
// Diagnostic and flows through normal mastery derivation, so correct
// answers raise state and known foundations unlock via the existing
// prerequisite gating. Constructs without a low-stakes auto-runner
// (speaking/writing/interaction) are skipped, never fabricated.
// ---------------------------------------------------------------------------

#[derive(serde::Deserialize)]
struct PackAssessment {
    id: String,
    goal_id: String,
    #[serde(default)]
    modality: String,
}

#[derive(serde::Deserialize)]
struct PackUnit {
    goal_id: String,
    /// K-66/ADR-0021: the features this pack offers, declared by the
    /// pack, never inferred from content. The engine acts on the
    /// declaration alone; it does not know what any of the names mean
    /// beyond "a unit claimed it and the validator proved the unit has
    /// content for it".
    #[serde(default)]
    capabilities: Vec<String>,
    #[serde(default)]
    activities: Vec<PackUnitActivity>,
}

#[derive(serde::Deserialize)]
struct PackUnitActivity {
    modality: String,
    #[serde(default)]
    content_refs: Vec<String>,
}

#[derive(Serialize)]
struct PlacementItem {
    assessment_id: String,
    goal_id: String,
    content_id: String,
    /// Kebab-case practice-runner dimension (recall-meaning /
    /// comprehension-listening): the low-stakes auto-runners.
    modality: String,
}

/// K-63-follow: a placement plan needs every declared unit, and the reference
/// pack declares 774 of them across 774 separate YAML files. Parsing them on
/// each click cost ~420 ms to open the Placement tab — on content that cannot
/// change under a running app — so the parse is shared per immutable version
/// root, exactly like the lexicon (`LEXICON_CACHE`).
static UNIT_CACHE: std::sync::LazyLock<
    std::sync::Mutex<std::collections::HashMap<PathBuf, std::sync::Arc<Vec<PackUnit>>>>,
> = std::sync::LazyLock::new(|| std::sync::Mutex::new(Default::default()));

static ASSESSMENT_CACHE: std::sync::LazyLock<
    std::sync::Mutex<std::collections::HashMap<PathBuf, std::sync::Arc<Vec<PackAssessment>>>>,
> = std::sync::LazyLock::new(|| std::sync::Mutex::new(Default::default()));

/// Every unit the pack declares, in file-name order. A malformed unit is
/// skipped rather than failing the whole plan, as it always was.
fn pack_units(root: &Path) -> std::sync::Arc<Vec<PackUnit>> {
    let mut cache = UNIT_CACHE.lock().unwrap_or_else(|e| e.into_inner());
    if let Some(hit) = cache.get(root) {
        return std::sync::Arc::clone(hit);
    }
    let mut units: Vec<PackUnit> = Vec::new();
    let units_dir = root.join("curriculum/units");
    if let Ok(rd) = std::fs::read_dir(&units_dir) {
        let mut paths: Vec<_> = rd.filter_map(|e| e.ok().map(|e| e.path())).collect();
        paths.sort();
        for p in paths {
            if p.extension().and_then(|e| e.to_str()) != Some("yaml") {
                continue;
            }
            let Ok(t) = std::fs::read_to_string(&p) else {
                continue;
            };
            if let Ok(u) = serde_yaml::from_str::<PackUnit>(&t) {
                units.push(u);
            }
        }
    }
    let units = std::sync::Arc::new(units);
    cache.insert(root.to_path_buf(), std::sync::Arc::clone(&units));
    units
}

/// The pack's declared assessments. A malformed definition is still an error
/// for the caller — and is never cached, so a repaired pack is readable next
/// time.
fn pack_assessments(root: &Path) -> Result<std::sync::Arc<Vec<PackAssessment>>, String> {
    let mut cache = ASSESSMENT_CACHE.lock().unwrap_or_else(|e| e.into_inner());
    if let Some(hit) = cache.get(root) {
        return Ok(std::sync::Arc::clone(hit));
    }
    let text =
        std::fs::read_to_string(root.join("assessments/definitions.jsonl")).unwrap_or_default();
    let mut assessments: Vec<PackAssessment> = Vec::new();
    for line in text.lines() {
        if line.trim().is_empty() {
            continue;
        }
        assessments.push(serde_json::from_str(line).map_err(|e| format!("assessment: {e}"))?);
    }
    let assessments = std::sync::Arc::new(assessments);
    cache.insert(root.to_path_buf(), std::sync::Arc::clone(&assessments));
    Ok(assessments)
}

fn placement_plan_at(data: &Path, profile_id: &str) -> Result<Vec<PlacementItem>, String> {
    let active = packs::active_pack(data, profile_id)?;
    let pack_id = active.first().ok_or("no active language pack")?;
    let version = lts_langpack::archive::current_version(pack_id, &data.join("packs"))
        .ok_or("pack not installed")?;
    let root = data.join("packs").join(pack_id).join(&version);
    let assessments = pack_assessments(&root)?;
    let units = pack_units(&root);
    let mut items = Vec::new();
    for a in assessments.iter() {
        let runner = match a.modality.as_str() {
            "reading" => "recall-meaning",
            "listening" => "comprehension-listening",
            // No low-stakes auto-runner for these constructs yet.
            _ => continue,
        };
        let Some(unit) = units.iter().find(|u| u.goal_id == a.goal_id) else {
            continue;
        };
        let Some(content) = unit
            .activities
            .iter()
            .find(|ac| ac.modality == a.modality && !ac.content_refs.is_empty())
            .or_else(|| {
                unit.activities
                    .iter()
                    .find(|ac| !ac.content_refs.is_empty())
            })
            .and_then(|ac| ac.content_refs.first())
        else {
            continue;
        };
        items.push(PlacementItem {
            assessment_id: a.id.clone(),
            goal_id: a.goal_id.clone(),
            content_id: content.clone(),
            modality: runner.to_string(),
        });
    }
    Ok(items)
}

#[tauri::command]
fn placement_plan(profile_id: String) -> Result<Vec<PlacementItem>, String> {
    placement_plan_at(&data_dir(), &profile_id)
}

#[tauri::command]
fn placement_submit(
    profile_id: String,
    assessment_id: String,
    content_id: String,
    modality: String,
    choice_index: usize,
) -> Result<PracticeGrade, String> {
    practice_submit_inner(
        &data_dir(),
        &profile_id,
        &content_id,
        &modality,
        choice_index,
        SubmitOpts {
            answer: None,
            reveal_reading: false,
            diagnostic: Some(&assessment_id),
        },
    )
}

// ---------------------------------------------------------------------------
// K-01: scenario sessions (SCENARIO-001 runtime → UI). Unlock follows the
// versioned prerequisite contract; finishing records scored interaction
// evidence with the support actually used.
// ---------------------------------------------------------------------------

#[tauri::command]
fn scenario_list(profile_id: String) -> Result<Vec<scenarios::ScenarioSummary>, String> {
    scenarios::list_at(&data_dir(), &profile_id)
}

#[tauri::command]
fn scenario_start(
    profile_id: String,
    scenario_id: String,
    sessions: tauri::State<'_, scenarios::SessionStore>,
) -> Result<scenarios::ScenarioView, String> {
    scenarios::start_at(&data_dir(), &profile_id, &scenario_id, &sessions)
}

#[tauri::command]
fn scenario_attempt(
    profile_id: String,
    scenario_id: String,
    intent: String,
    sessions: tauri::State<'_, scenarios::SessionStore>,
) -> Result<scenarios::StepView, String> {
    scenarios::attempt_at(&data_dir(), &profile_id, &scenario_id, &intent, &sessions)
}

#[tauri::command]
fn scenario_support(
    profile_id: String,
    scenario_id: String,
    level: u8,
    sessions: tauri::State<'_, scenarios::SessionStore>,
) -> Result<scenarios::ScenarioView, String> {
    scenarios::support_at(&data_dir(), &profile_id, &scenario_id, level, &sessions)
}

#[tauri::command]
fn scenario_recovery(
    profile_id: String,
    scenario_id: String,
    recovery_id: String,
    sessions: tauri::State<'_, scenarios::SessionStore>,
) -> Result<scenarios::ScenarioView, String> {
    scenarios::recovery_at(
        &data_dir(),
        &profile_id,
        &scenario_id,
        &recovery_id,
        &sessions,
    )
}

#[tauri::command]
fn scenario_transfer(
    profile_id: String,
    scenario_id: String,
    variant_id: String,
    sessions: tauri::State<'_, scenarios::SessionStore>,
) -> Result<scenarios::ScenarioView, String> {
    scenarios::transfer_at(
        &data_dir(),
        &profile_id,
        &scenario_id,
        &variant_id,
        &sessions,
    )
}

#[tauri::command]
fn scenario_finish(
    profile_id: String,
    scenario_id: String,
    sessions: tauri::State<'_, scenarios::SessionStore>,
) -> Result<scenarios::OutcomeView, String> {
    scenarios::finish_at(&data_dir(), &profile_id, &scenario_id, &sessions)
}

/// TTS-001 acceptance 3: curated licensed recordings (pack media)
/// always override synthesis; otherwise synthesize locally and label
/// the result as model output (docs/10).
#[derive(Debug, Serialize)]
struct SpeechAudio {
    wav_b64: String,
    source: &'static str,
}

/// K-65b: the learner never sends the string the engine will speak. The
/// command takes a content id and resolves the speakable string from the pack
/// record (media first, then the declared reading). Shadowing used to pass the
/// written form down from the frontend, so nothing native ever checked that
/// the string was one the engine can read, and any caller could hand it a
/// romanization.
#[tauri::command]
async fn speech_audio(pack_id: String, content_id: String) -> Result<SpeechAudio, String> {
    // Synthesis spawns a runtime subprocess: seconds of work that must
    // never own the main thread (K-73).
    tauri::async_runtime::spawn_blocking(move || {
        let version =
            lts_langpack::archive::current_version(&pack_id, &data_dir().join("packs"))
                .ok_or("pack not installed")?;
        let text = speakable_text(&data_dir(), &pack_id, &version, &content_id)?;
        speech_audio_at(&data_dir(), &pack_id, &content_id, &text)
    })
    .await
    .map_err(|e| format!("speech-audio failed: {e}"))?
}

/// The pack-declared string to synthesize for one content id: media is
/// preferred upstream (`speech_audio_at` checks the manifest), so this is
/// only the fallback. Words use `LexEntry::speakable`; sentences use their
/// declared text. No record means no audio, never a guess.
fn speakable_text(
    data: &Path,
    pack_id: &str,
    version: &str,
    content_id: &str,
) -> Result<String, String> {
    if let Some(entry) = lexicon_entries(data, pack_id, version)?
        .into_iter()
        .find(|e| e.id == content_id)
    {
        return Ok(entry.speakable().to_string());
    }
    if let Some(entry) = sentence_entries(data, pack_id, version)?
        .into_iter()
        .find(|e| e.id == content_id)
    {
        return Ok(entry.text);
    }
    Err("unknown item".to_string())
}

/// ADR-0016: audio provenance is DECLARED by the pack, never inferred from a
/// file's presence. `media/manifest.jsonl` names each asset's provenance, so
/// synthesized listening content surfaces as `model-output` instead of being
/// silently labeled a licensed recording. No record keeps the pre-manifest
/// convention (a curated recording, as in `ja-demo`).
fn declared_media_provenance(pack_dir: &Path, unit: &str) -> Option<&'static str> {
    let text = std::fs::read_to_string(pack_dir.join("media/manifest.jsonl")).ok()?;
    for line in text.lines() {
        let Ok(value) = serde_json::from_str::<serde_json::Value>(line) else {
            continue;
        };
        if value["id"].as_str() == Some(unit) {
            return match value["provenance"].as_str() {
                Some("model-output") => Some("model-output"),
                Some("licensed-recording") => Some("licensed-recording"),
                _ => None,
            };
        }
    }
    None
}

fn speech_audio_at(
    data: &Path,
    pack_id: &str,
    unit_id: &str,
    text: &str,
) -> Result<SpeechAudio, String> {
    if !packs::valid_pack_id(pack_id) {
        return Err("pack not allowlisted".into());
    }
    let unit = checked_unit(unit_id)?;
    if text.is_empty() || text.chars().count() > 400 {
        return Err("text out of range".into());
    }
    let data_packs = data.join("packs");
    let version =
        lts_langpack::archive::current_version(pack_id, &data_packs).ok_or("pack not installed")?;
    use base64::Engine;
    let media = data_packs
        .join(pack_id)
        .join(&version)
        .join("media")
        .join(format!("{unit}.wav"));
    if let Ok(bytes) = std::fs::read(&media) {
        let source =
            declared_media_provenance(&data_packs.join(pack_id).join(&version), unit.as_str())
                .unwrap_or("licensed-recording");
        return Ok(SpeechAudio {
            wav_b64: base64::engine::general_purpose::STANDARD.encode(bytes),
            source,
        });
    }
    let (_, tts) = resolve_tts(data).ok_or("tts-runtime-unavailable")?;
    let audio = tts.synthesize(
        text,
        &lts_speech_api::VoiceRef {
            model_id: "org.openlanguage.tts.kokoro-multi-lang".into(),
            voice_id: "37".into(),
        },
    );
    match audio {
        lts_speech_api::ProviderOutcome::Usable { value, .. } => Ok(SpeechAudio {
            wav_b64: base64::engine::general_purpose::STANDARD
                .encode(lts_speech_runtime::to_wav16(&value)),
            source: "model-output",
        }),
        other => Err(format!("tts:{}", outcome_reason(&other))),
    }
}

/// Where the TTS-bundled variant's payload lives (`<resource_dir>/tts`).
/// Set once at startup; unset for bare/dev builds (ADR-0009).
static BUNDLED_TTS: std::sync::OnceLock<PathBuf> = std::sync::OnceLock::new();

/// TTS-002 (ADR-0009): resolve the offline TTS runtime + model from,
/// in priority order:
/// 1. `bundled` — the TTS-bundled variant's staged payload
///    (`<resource_dir>/tts/{sherpa,kokoro}`);
/// 2. `model` — model-manager installs (bare variant + optional in-app
///    download of the same payload);
/// 3. `env` — bring-your-own: `LTS_TTS_DIR` containing `sherpa/` (with
///    `bin/sherpa-onnx-offline-tts`) and `kokoro/` (the export);
/// 4. `bench` — development bench vendor (`LTS_BENCH_VENDOR` /
///    `~/.cache/lts-bench`; never shipped, kept for local benchmarking).
///
/// `None` => honest degradation (`tts-runtime-unavailable`); absence of
/// TTS never blocks non-audio practice.
fn resolve_tts(
    data: &Path,
) -> Option<(&'static str, lts_speech_runtime::tts::SherpaSubprocessTts)> {
    let byo = std::env::var("LTS_TTS_DIR").map(PathBuf::from).ok();
    let vendor = match std::env::var("LTS_BENCH_VENDOR") {
        Ok(v) => Some(PathBuf::from(v)),
        Err(_) => std::env::var("HOME")
            .ok()
            .map(|h| PathBuf::from(h).join(".cache/lts-bench")),
    };
    resolve_tts_with(data, byo.as_deref(), vendor.as_deref())
}

/// Env-independent core: `byo`/`vendor` arrive explicitly so priority
/// and abstention are testable without mutating process environment.
fn resolve_tts_with(
    data: &Path,
    byo: Option<&Path>,
    vendor: Option<&Path>,
) -> Option<(&'static str, lts_speech_runtime::tts::SherpaSubprocessTts)> {
    let mut roots: Vec<(&'static str, PathBuf, PathBuf)> = Vec::new();
    if let Some(b) = BUNDLED_TTS.get() {
        roots.push(("bundled", b.join("sherpa"), b.join("kokoro")));
    }
    let payload = |id: &str| -> Option<PathBuf> {
        let entry = models::load_catalog()
            .models
            .into_iter()
            .find(|m| m.id == id)?;
        let p = models::model_dir(data, &entry).join("payload");
        p.exists().then_some(p)
    };
    if let (Some(rt), Some(model)) = (payload(TTS_RUNTIME_ID), payload(TTS_MODEL_ID)) {
        roots.push(("model", rt, model));
    }
    if let Some(dir) = byo {
        roots.push(("env", dir.join("sherpa"), dir.join("kokoro")));
    }
    if let Some(v) = vendor {
        roots.push((
            "bench",
            v.join("sherpa-onnx-v1.13.8-linux-x64-shared"),
            v.join("kokoro-multi-lang-v1_0"),
        ));
    }
    for (source, runtime, model) in roots {
        let tts = lts_speech_runtime::tts::SherpaSubprocessTts {
            binary: runtime.join("bin/sherpa-onnx-offline-tts"),
            model: model.join("model.onnx"),
            voices: model.join("voices.bin"),
            tokens: model.join("tokens.txt"),
            data_dir: model.join("espeak-ng-data"),
            lang: "ja".into(),
        };
        if tts.binary.exists() && tts.model.exists() {
            return Some((source, tts));
        }
    }
    None
}

/// Component attribution the TTS payload requires (ADR-0009): the
/// espeak-ng GPL-3.0 obligations are carried for the payload, and the
/// UI must show them whenever a payload is active.
#[derive(Serialize)]
struct TtsAttribution {
    name: &'static str,
    license: &'static str,
    role: &'static str,
}

fn tts_attribution() -> Vec<TtsAttribution> {
    [
        ("espeak-ng", "GPL-3.0", "pronunciation data for synthesis"),
        ("sherpa-onnx", "Apache-2.0", "speech runtime"),
        ("ONNX Runtime", "MIT", "model inference engine"),
        ("Kokoro", "Apache-2.0", "Japanese voice model"),
    ]
    .into_iter()
    .map(|(name, license, role)| TtsAttribution {
        name,
        license,
        role,
    })
    .collect()
}

/// The two directory catalog entries that make up the downloadable TTS
/// payload (ADR-0009).
const TTS_RUNTIME_ID: &str = "org.openlanguage.speech.sherpa-onnx-runtime";
const TTS_MODEL_ID: &str = "org.openlanguage.speech.kokoro-multi-lang";

/// Which TTS payload is active (if any), the install state of the
/// in-app payload models, and the required attribution.
#[derive(Serialize)]
struct TtsStatus {
    source: &'static str,
    components: Vec<TtsAttribution>,
    models: Vec<models::ModelStatus>,
}

#[tauri::command]
fn tts_status() -> TtsStatus {
    let data = data_dir();
    let source = resolve_tts(&data).map(|(s, _)| s).unwrap_or("none");
    let models = models::model_status(&data)
        .into_iter()
        .filter(|m| m.id == TTS_RUNTIME_ID || m.id == TTS_MODEL_ID)
        .collect();
    TtsStatus {
        components: if source == "none" {
            Vec::new()
        } else {
            tts_attribution()
        },
        models,
        source,
    }
}

/// K-02: audio for the listening runner. The active pack and the item's
/// surface are resolved natively so the transcript never crosses IPC:
/// a visible transcript would disqualify comprehension-listening
/// evidence (MASTERY_POLICY `disqualifying_for`).
#[tauri::command]
fn listening_audio(profile_id: String, content_id: String) -> Result<SpeechAudio, String> {
    listening_audio_at(&data_dir(), &profile_id, &content_id)
}

fn listening_audio_at(
    data: &Path,
    profile_id: &str,
    content_id: &str,
) -> Result<SpeechAudio, String> {
    checked_unit(content_id)?;
    let active = packs::active_pack(data, profile_id)?;
    let pack_id = active.first().ok_or("no active language pack")?;
    let version = lts_langpack::archive::current_version(pack_id, &data.join("packs"))
        .ok_or("pack not installed")?;
    // Both words and sentences are listenable. Media lookup is by content id
    // (manifest first, ADR-0016); the record's text is only the synthesis
    // fallback when the pack ships no recording for it.
    let text = speakable_text(data, pack_id, &version, content_id)?;
    speech_audio_at(data, pack_id, content_id, &text)
}

// ---------------------------------------------------------------------------
// SPEECH-003: model manager (versioned, checksummed, licensed, removable)
// ---------------------------------------------------------------------------

/// Catalog + install status. The base app ships zero models; speech
/// features report `missing` and stay recoverable (docs/05).
#[tauri::command]
async fn available_models() -> Vec<models::ModelStatus> {
    match tauri::async_runtime::spawn_blocking(|| models::model_status(&data_dir())).await {
        Ok(v) => v,
        Err(e) => {
            eprintln!("available_models failed: {e}");
            Vec::new()
        }
    }
}

/// Resolve a catalog id and install it, reporting each stage. Split from the
/// command so the rejection path is testable without a webview.
fn install_model_at(
    data: &Path,
    model_id: &str,
    report: impl FnMut(&progress::Progress),
) -> Result<models::InstalledRecord, String> {
    let entry = models::load_catalog()
        .models
        .into_iter()
        .find(|m| m.id == model_id)
        .ok_or("unknown model id")?;
    models::install_model_files_report(
        data,
        &entry,
        &rfc3339_utc(now_secs()),
        models::stream_download,
        report,
    )
}

#[tauri::command]
async fn install_model(
    model_id: String,
    app: tauri::AppHandle,
) -> Result<models::InstalledRecord, String> {
    tauri::async_runtime::spawn_blocking(move || {
        install_model_at(&data_dir(), &model_id, progress::reporter(&app))
    })
    .await
    .map_err(|e| format!("install-model failed: {e}"))?
}

#[tauri::command]
async fn delete_model(model_id: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let entry = models::load_catalog()
            .models
            .into_iter()
            .find(|m| m.id == model_id)
            .ok_or("unknown model id")?;
        models::delete_model(&data_dir(), &entry)
    })
    .await
    .map_err(|e| format!("delete-model failed: {e}"))?
}

// ---------------------------------------------------------------------------
// K-46: runtime device-tier detection. The recommended speech model is
// chosen from what this device can actually run (PERF-001 tier shape in
// docs/performance/BUDGETS.yaml: low = 4 cores/8 GB, typical = 8 cores/
// 16 GB, high = 16+ cores/32 GB), never a static constant. Detection is
// honest: if the machine's memory can't be read, nothing is recommended
// and the UI says so. The shipped pronunciation feature scores the same
// on every whisper size (ADR-0011), so the recommendation is the largest
// model the tier can comfortably hold in RAM (whisper ggml sizes: tiny
// ~74 MB, base ~141 MB, small ~465 MB; a model needs roughly 2x its
// file size resident plus the app's ~400 MB base).

#[derive(Serialize)]
struct DeviceTier {
    cores: usize,
    total_ram_mb: f64,
    tier: &'static str,
    recommended_model: Option<String>,
}

/// Pure tier classification from measured facts; testable without a
/// real machine. `total_ram_mb` of 0 means detection failed.
fn classify_device_tier(cores: usize, total_ram_mb: f64) -> DeviceTier {
    if cores == 0 || total_ram_mb <= 0.0 {
        return DeviceTier {
            cores,
            total_ram_mb,
            tier: "low",
            recommended_model: None,
        };
    }
    let tier = if cores >= 16 && total_ram_mb >= 32_000.0 {
        "high"
    } else if cores >= 8 && total_ram_mb >= 16_000.0 {
        "typical"
    } else {
        "low"
    };
    // Largest whisper ggml model that fits comfortably. The PERF-001
    // memory budgets (docs/performance/BUDGETS.yaml) are the contract:
    // `total_with_compact_model_mb` caps low at 2000 MB and typical at
    // 1500 MB, so a low device (8 GB) stays on the compact bundle
    // (tiny); typical (16 GB) can hold base; only the high tier's
    // headroom (32 GB+) justifies small.
    let recommended = if tier == "high" {
        "org.openlanguage.speech.whisper-ggml-small"
    } else if tier == "typical" {
        "org.openlanguage.speech.whisper-ggml-base"
    } else {
        "org.openlanguage.speech.whisper-ggml-tiny"
    };
    DeviceTier {
        cores,
        total_ram_mb,
        tier,
        recommended_model: Some(recommended.to_string()),
    }
}

/// Measure this machine: logical cores + total RAM (MB). Linux reads
/// /proc/meminfo; other platforms fall back to detection-failed (0),
/// which the UI renders as an honest "could not detect".
fn measure_device() -> (usize, f64) {
    let cores = std::thread::available_parallelism()
        .map(|n| n.get())
        .unwrap_or(0);
    let ram_mb = match std::fs::read_to_string("/proc/meminfo") {
        Ok(text) => text
            .lines()
            .find(|l| l.starts_with("MemTotal:"))
            .and_then(|l| {
                l.split_whitespace()
                    .nth(1)
                    .and_then(|kb| kb.parse::<f64>().ok())
            })
            .map(|kb| kb / 1024.0)
            .unwrap_or(0.0),
        Err(_) => 0.0,
    };
    (cores, ram_mb)
}

#[tauri::command]
fn recommended_speech_model() -> DeviceTier {
    let (cores, ram_mb) = measure_device();
    classify_device_tier(cores, ram_mb)
}

/// Device-level active speech model: `"off"` or a whisper.cpp catalog id.
#[tauri::command]
fn get_speech_model() -> String {
    models::load_speech_pref(&data_dir()).asr_model
}

#[tauri::command]
fn set_speech_model(model_id: String) -> Result<(), String> {
    models::save_speech_pref(
        &data_dir(),
        &models::SpeechPref {
            asr_model: model_id,
        },
    )
}

/// Free-ASR dictation check (roadmap feature B): read a sentence aloud, get an
/// honest guided "did I say it recognizably" verdict. Never a grade or mastery.
#[tauri::command]
async fn dictation_check(attempt: DictationAttempt) -> Result<DictationResult, String> {
    // Recognition runs a whisper subprocess: multi-second work (K-73).
    tauri::async_runtime::spawn_blocking(move || dictation_check_at(&data_dir(), attempt))
        .await
        .map_err(|e| format!("dictation-check failed: {e}"))?
}

/// Pick a pack sentence to dictate (ties dictation to curriculum).
#[tauri::command]
fn dictation_target(pack_id: String, offset: u32) -> Result<DictationTarget, String> {
    dictation_target_at(&data_dir(), &pack_id, offset)
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

/// The value to force into `WEBKIT_DISABLE_DMABUF_RENDERER`, or `None` to
/// leave the environment alone.
///
/// WebKitGTK 2.44+ paints through a DMABUF/GBM path that fails on the
/// proprietary NVIDIA driver and on software/virtual GPUs (Xvfb): it logs
/// `Failed to create GBM buffer of size WxH: Invalid argument` and then never
/// draws anything, so the window opens blank (observed on X11 + NVIDIA with
/// WebKitGTK 2.52.6, 2026-10-08). An operator-set value is never overwritten:
/// `WEBKIT_DISABLE_DMABUF_RENDERER=0` is WebKitGTK's own switch for asking for
/// the accelerated path back, and any other value is its own opt-out.
fn webkit_dmabuf_fallback(current: Option<&std::ffi::OsStr>) -> Option<&'static str> {
    current.is_none().then_some("1")
}

/// Applied before the builder exists so no other thread is reading the
/// environment yet; the renderer is only consulted when the webview starts.
fn force_webkit_fallback_renderer() {
    const KEY: &str = "WEBKIT_DISABLE_DMABUF_RENDERER";
    if let Some(value) = webkit_dmabuf_fallback(std::env::var_os(KEY).as_deref()) {
        unsafe { std::env::set_var(KEY, value) };
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    force_webkit_fallback_renderer();
    tauri::Builder::default()
        .manage(scenarios::SessionStore::default())
        // The window is built here (not via tauri.conf.json) so the
        // webview permission handler can be attached: the pronunciation
        // feature calls getUserMedia, and WebKitGTK denies permission
        // requests unless the app answers them. Microphone is allowed
        // (the UI gates it behind the explicit mic setting + privacy
        // notice); everything else is denied.
        .setup(|app| {
            use tauri::webview::{PermissionKind, PermissionResponse};
            let _win = tauri::WebviewWindowBuilder::new(app, "main", tauri::WebviewUrl::default())
                .title("Open Language Learning Platform")
                .inner_size(1100.0, 720.0)
                .min_inner_size(800.0, 600.0)
                .center()
                .on_permission_request(|_webview, kind| match kind {
                    PermissionKind::Microphone => PermissionResponse::Allow,
                    _ => PermissionResponse::Deny,
                })
                .build()?;
            // TTS-002 (ADR-0009): the TTS-bundled variant stages its
            // payload under `<resource_dir>/tts`; bare builds have no
            // such directory and degrade honestly.
            use tauri::Manager;
            if let Ok(rd) = app.path().resource_dir() {
                let _ = BUNDLED_TTS.set(rd.join("tts"));
                // ADR-0019: the aligner-bundled variant stages its payload under
                // `<resource_dir>/aligner`; a bare build has no such directory and
                // abstains honestly rather than pretending an ASR exists.
                let _ = BUNDLED_SIDECAR.set(rd.join("aligner"));
                // K-59: the pack-bundled variant stages pack sources under
                // `<resource_dir>/packs` beside the other payloads; a bare
                // build has no such directory and resolves from the repo
                // tree (dev) or abstains, honestly.
                let _ = BUNDLED_PACKS.set(rd.join("packs"));
            }
            // K-63-follow: prime the content caches for already-installed packs
            // so the first thing a learner does after opening the app is not the
            // slowest thing they do.
            let warm_dir = data_dir();
            std::thread::spawn(move || warm_installed(&warm_dir));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            app_mode,
            smoke_ack,
            privacy_notice,
            available_packs,
            install_pack,
            create_profile,
            list_profiles,
            resume_profile,
            complete_onboarding,
            home_state,
            practice_plan,
            first_run_steps,
            progress_summary,
            available_models,
            install_model,
            aligner_status,
            delete_model,
            get_speech_model,
            set_speech_model,
            recommended_speech_model,
            pronunciation_check,
            pronunciation_demo,
            dictation_check,
            dictation_target,
            reference_audio,
            speech_audio,
            tts_status,
            world_state,
            goal_map,
            display_settings,
            set_display_settings,
            get_microphone_enabled,
            set_microphone_enabled,
            get_microphone_device,
            set_microphone_device,
            get_romaji_mode,
            set_romaji_mode,
            profile_export,
            profile_delete,
            pack_claims,
            catalog_packs,
            install_catalog_pack,
            import_pack,
            installed_packs,
            active_pack,
            switch_pack,
            writing_task,
            writing_submit,
            practice_task,
            practice_submit,
            placement_plan,
            placement_submit,
            kanji_list,
            scenario_list,
            scenario_start,
            scenario_attempt,
            scenario_support,
            scenario_recovery,
            scenario_transfer,
            scenario_finish,
            contrast_audio,
            shadowing_items,
            dictation_audio,
            story_list,
            story_view,
            story_audio,
            listening_audio,
            mine_add,
            mine_list,
            mine_remove,
            mine_due,
            mine_grade,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Test shim (K-32 cutover): bundled ids go through the production
    /// install path; the retired ja-demo fixture installs directly from
    /// tests/fixtures/packs so engine tests keep their stable content ids.
    fn install_bundled_pack(data: &Path, pack_id: &str) -> Result<PackCandidate, String> {
        if bundled_packs().iter().any(|(c, _)| c.pack_id == pack_id) {
            return crate::install_bundled_pack_report(data, pack_id, None, |_| {});
        }
        let name = pack_id
            .strip_prefix("org.openlanguage.")
            .filter(|n| !n.is_empty() && *n != "ja-jp.reference")
            .ok_or("unknown pack id")?;
        let dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("../../../tests/fixtures/packs")
            .join(name);
        let (bytes, _sha) = lts_langpack::archive::build(&dir).map_err(|e| e.to_string())?;
        let outcome = lts_langpack::archive::install(&bytes, &data.join("packs"))
            .map_err(|e| e.to_string())?;
        let store =
            lts_storage::Store::open(data.join("profiles.db")).map_err(|e| e.to_string())?;
        store
            .record_installation(&lts_storage::PackInstallation {
                pack_id: outcome.pack_id.clone(),
                version: outcome.version.clone(),
                installed_at: rfc3339_utc(now_secs()),
                trust_state: "community".into(),
            })
            .map_err(|e| e.to_string())?;
        Ok(PackCandidate {
            pack_id: outcome.pack_id,
            display_name: "test fixture".into(),
            locale: "ja-JP".into(),
            maturity: "community".into(),
        })
    }

    /// K-59: the pack-bundled variant resolves candidates from staged
    /// resources plus the `BUNDLED.yaml` sidecar the staging script writes,
    /// and nothing else: fail-closed on every malformed state, and dev's
    /// repo tree still wins when both exist.
    #[test]
    fn a_pack_bundled_build_resolves_candidates_from_staged_resources() {
        let tmp = tempfile::tempdir().unwrap();
        let root = tmp.path().join("packs");
        std::fs::create_dir_all(&root).unwrap();
        let fixture =
            Path::new(env!("CARGO_MANIFEST_DIR")).join("../../../tests/fixtures/packs/ja-demo");
        copy_tree(&fixture, &root.join("org.openlanguage.ja-demo"));
        std::fs::write(
            root.join("BUNDLED.yaml"),
            "schema_version: 1\npacks:\n  - pack_id: org.openlanguage.ja-demo\n    locale: ja-JP\n    maturity: community\n",
        )
        .unwrap();

        let packs = bundled_packs_at(Path::new("/nonexistent-repo"), Some(&root));
        assert_eq!(packs.len(), 1, "the sidecar names exactly one staged pack");
        assert_eq!(packs[0].0.pack_id, "org.openlanguage.ja-demo");
        // Display names travel with the pack (K-47), not with the app.
        assert_ne!(packs[0].0.display_name, "");
        assert_ne!(packs[0].0.display_name, "org.openlanguage.ja-demo");

        // The candidate is installable through the production path — this
        // is what the learner's first Languages click actually runs.
        let data = tmp.path().join("data");
        let mut stages: Vec<&'static str> = Vec::new();
        let candidate =
            install_bundled_pack_report(&data, "org.openlanguage.ja-demo", Some(&root), |p| {
                stages.push(p.stage)
            })
            .expect("a staged, sidecar-named pack installs");
        assert_eq!(candidate.pack_id, "org.openlanguage.ja-demo");
        assert_eq!(stages.first().copied(), Some("prepare"));
    }

    #[test]
    fn a_bundled_packs_sidecar_that_fails_closed_yields_no_candidates() {
        let tmp = tempfile::tempdir().unwrap();
        let fixture =
            Path::new(env!("CARGO_MANIFEST_DIR")).join("../../../tests/fixtures/packs/ja-demo");
        let missing_repo = Path::new("/nonexistent-repo");

        // No packs directory at all (a bare build): abstain, as today.
        assert!(bundled_packs_at(missing_repo, None).is_empty());

        // Directory present but no sidecar: a bundle may not guess.
        let root = tmp.path().join("bare");
        std::fs::create_dir_all(root.join("org.openlanguage.ja-demo")).unwrap();
        assert!(bundled_packs_at(missing_repo, Some(&root)).is_empty());

        // Wrong schema version: refuse, never reinterpret.
        let root = tmp.path().join("wrong-schema");
        std::fs::create_dir_all(&root).unwrap();
        std::fs::write(root.join("BUNDLED.yaml"), "schema_version: 2\npacks: []\n").unwrap();
        assert!(bundled_packs_at(missing_repo, Some(&root)).is_empty());

        // Unparsable shape: refuse.
        let root = tmp.path().join("malformed");
        std::fs::create_dir_all(&root).unwrap();
        std::fs::write(root.join("BUNDLED.yaml"), "schema_version: not-a-number\n").unwrap();
        assert!(bundled_packs_at(missing_repo, Some(&root)).is_empty());

        // A named pack whose directory is absent is skipped, and the
        // honest one still resolves.
        let root = tmp.path().join("dangling");
        std::fs::create_dir_all(root.join("org.openlanguage.ja-demo")).unwrap();
        copy_tree(&fixture, &root.join("org.openlanguage.ja-demo"));
        std::fs::write(
            root.join("BUNDLED.yaml"),
            "schema_version: 1\npacks:\n  - pack_id: org.openlanguage.gone\n    locale: xx-XX\n    maturity: community\n  - pack_id: org.openlanguage.ja-demo\n    locale: ja-JP\n    maturity: community\n",
        )
        .unwrap();
        let packs = bundled_packs_at(missing_repo, Some(&root));
        assert_eq!(packs.len(), 1);
        assert_eq!(packs[0].0.pack_id, "org.openlanguage.ja-demo");
    }

    #[test]
    fn the_dev_repo_tree_beats_staged_resources_when_both_exist() {
        let tmp = tempfile::tempdir().unwrap();
        let repo = tmp.path().join("repo");
        std::fs::create_dir_all(repo.join("languages/ja-JP")).unwrap();
        let root = tmp.path().join("resources/packs");
        std::fs::create_dir_all(&root).unwrap();
        std::fs::write(
            root.join("BUNDLED.yaml"),
            "schema_version: 1\npacks:\n  - pack_id: org.openlanguage.ja-demo\n    locale: ja-JP\n    maturity: community\n",
        )
        .unwrap();

        let packs = bundled_packs_at(&repo, Some(&root));
        assert_eq!(
            packs
                .iter()
                .map(|(c, _)| c.pack_id.as_str())
                .collect::<Vec<_>>(),
            DEV_PACK_CANDIDATES
                .iter()
                .map(|(id, ..)| *id)
                .collect::<Vec<_>>(),
            "a dev checkout keeps today's candidates; the staged root never shadows it"
        );
    }

    #[test]
    fn rfc3339_conversion_is_correct() {
        assert_eq!(rfc3339_utc(0), "1970-01-01T00:00:00Z");
        assert_eq!(rfc3339_utc(1_762_128_000), "2025-11-03T00:00:00Z");
    }

    #[test]
    fn bundled_japanese_pack_installs_and_records() {
        let tmp = tempfile::tempdir().unwrap();
        let data = tmp.path();
        // K-32: the on-ramp reference pack is the bundled Japanese default;
        // it must pass the install-mode license gate (CC BY 4.0, owner
        // decision 2026-10-04).
        let candidate = install_bundled_pack(data, "org.openlanguage.ja-jp.reference").unwrap();
        assert_eq!(candidate.locale, "ja-JP");
        let store = lts_storage::Store::open(data.join("profiles.db")).unwrap();
        let insts = store.installations().unwrap();
        assert!(
            insts
                .iter()
                .any(|i| i.pack_id == "org.openlanguage.ja-jp.reference")
        );

        // Unknown ids are rejected (allowlist; no path from UI).
        assert!(install_bundled_pack(data, "org.evil.any").is_err());

        // Profile + selection + skippable mic setting round-trip.
        let p = create_local_profile(data, "Hunter").unwrap();
        finish_onboarding(data, &p.id, "org.openlanguage.ja-jp.reference", false).unwrap();
        let selected = store.selected_packs(&p.id).unwrap();
        assert_eq!(selected[0].0, "org.openlanguage.ja-jp.reference");
        assert_eq!(
            store.get_setting(&p.id, "microphone-enabled").unwrap(),
            Some(serde_json::json!(false))
        );
    }

    #[test]
    fn pronunciation_demo_comes_from_pack_contrasts() {
        let tmp = tempfile::tempdir().unwrap();
        let data = tmp.path();
        install_bundled_pack(data, "org.openlanguage.ja-jp.reference").unwrap();
        let demo = pronunciation_demo_at(data, "org.openlanguage.ja-jp.reference").unwrap();
        // The pack's first vowel-length contrast is obasan/obaasan.
        assert_eq!(demo.short_text, "おばさん");
        assert_eq!(demo.long_text, "おばあさん");
        // D3: the ids address the pack's per-item media rows, which are
        // `{contrast-id}-{index}` (scripts/generate-pack-audio.py). The old
        // `.short`/`.long` spelling named files no pack ever wrote, so
        // "Hear reference" and the pitch contour could never resolve.
        assert_eq!(demo.short_unit, "ja.contrast.vowel-length.obasan-0");
        assert_eq!(demo.long_unit, "ja.contrast.vowel-length.obasan-1");
        // Packs without phonology data abstain rather than invent content.
        install_bundled_pack(data, "org.openlanguage.eo-demo").unwrap();
        assert!(pronunciation_demo_at(data, "org.openlanguage.eo-demo").is_err());
    }

    #[test]
    fn resolve_tts_prefers_model_manager_installs() {
        // ADR-0009: an in-app model install must win over the dev bench
        // vendor (which may exist on developer machines).
        let tmp = tempfile::tempdir().unwrap();
        let data = tmp.path();
        let rt = data.join("models/org.openlanguage.speech.sherpa-onnx-runtime/1.13.8/payload/bin");
        std::fs::create_dir_all(&rt).unwrap();
        std::fs::write(rt.join("sherpa-onnx-offline-tts"), b"fake").unwrap();
        let model = data.join("models/org.openlanguage.speech.kokoro-multi-lang/1.0.0/payload");
        std::fs::create_dir_all(&model).unwrap();
        std::fs::write(model.join("model.onnx"), b"fake").unwrap();
        let (source, _tts) =
            resolve_tts_with(data, None, None).expect("model payload must resolve");
        assert_eq!(source, "model");
    }

    #[test]
    fn resolve_tts_abstains_when_no_payload_exists() {
        // Honest degradation: with no payload anywhere, the resolver
        // returns None (speech_audio_at maps that to
        // `tts-runtime-unavailable`) rather than half-configuring.
        let tmp = tempfile::tempdir().unwrap();
        assert!(resolve_tts_with(tmp.path(), None, None).is_none());
    }

    #[test]
    fn resolve_tts_accepts_bring_your_own_payload() {
        // ADR-0009: a user-supplied runtime directory resolves without
        // any model-manager install.
        let tmp = tempfile::tempdir().unwrap();
        let data = tmp.path();
        let byo = tmp.path().join("byo");
        let rt = byo.join("sherpa/bin");
        std::fs::create_dir_all(&rt).unwrap();
        std::fs::write(rt.join("sherpa-onnx-offline-tts"), b"fake").unwrap();
        let model = byo.join("kokoro");
        std::fs::create_dir_all(&model).unwrap();
        std::fs::write(model.join("model.onnx"), b"fake").unwrap();
        let (source, _tts) =
            resolve_tts_with(data, Some(&byo), None).expect("byo payload must resolve");
        assert_eq!(source, "env");
    }

    #[test]
    fn unknown_model_id_is_rejected_before_any_download() {
        let tmp = tempfile::tempdir().unwrap();
        assert_eq!(
            install_model_at(tmp.path(), "org.evil.model", |_| {}).unwrap_err(),
            "unknown model id"
        );
    }

    #[test]
    fn plan_generation_stays_fast_on_the_reference_pack() {
        // POLISH-001 latency baseline: plan generation over the full
        // on-ramp pack stays well inside the interactive budget. The
        // bound is a generous regression guard, not a benchmark.
        let tmp = tempfile::tempdir().unwrap();
        let data = tmp.path();
        install_bundled_pack(data, "org.openlanguage.ja-jp.reference").unwrap();
        let p = create_local_profile(data, "Hunter").unwrap();
        packs::switch_pack(data, &p.id, "org.openlanguage.ja-jp.reference").unwrap();
        let start = std::time::Instant::now();
        let view = build_plan_view(data, &p.id, 5, 1_760_000_000).unwrap();
        let elapsed = start.elapsed();
        println!("plan_generation: {elapsed:?} ({} items)", view.items.len());
        assert!(
            elapsed.as_millis() < 1000,
            "plan generation regressed: {elapsed:?}"
        );
    }

    /// K-44: first-class phrase lexicon records carry slot info, and
    /// the practice runner targets the right slot deterministically.
    /// Slot text must occur verbatim in the surface (same rule as
    /// sentence cloze targets); malformed slots are dropped, never
    /// guessed at.
    #[test]
    fn phrase_entries_carry_slots_and_target_the_right_slot() {
        // K-63-follow: the phrase rows are added to the pack *before* it is
        // installed, which is how real pack content arrives. Patching them into
        // an installed version directory was the old shortcut, and it asserted a
        // thing the product cannot do: an installed version is immutable by
        // contract (docs/07), and every content cache keys on that.
        let tmp = tempfile::tempdir().unwrap();
        let data = tmp.path();
        let version = install_reference_pack_with(
            data,
            &[(
                "lexicon/phrases.jsonl",
                concat!(
                    "{\"id\":\"ja.lex.phrase.demo-time-greet\",\"status\":\"draft\",\"kind\":\"phrase\",\"forms\":[{\"text\":\"おはようございます\",\"is_primary\":true}],\"readings\":[{\"text\":\"おはようございます\",\"script\":\"hiragana\"}],\"glosses\":{\"en-US\":[\"a morning greeting\"]},\"sources\":[\"jf-standard\"],\"slots\":[{\"text\":\"おはよう\",\"alternatives\":[\"こんにちは\",\"こんばんは\"],\"label\":\"the time of day\"},{\"text\":\"ございます\",\"alternatives\":[\"ございます\",\"です\"]}]}\n",
                    "{\"id\":\"ja.lex.phrase.demo-bad-slot\",\"status\":\"draft\",\"kind\":\"phrase\",\"forms\":[{\"text\":\"さようなら\",\"is_primary\":true}],\"glosses\":{\"en-US\":[\"a farewell\"]},\"sources\":[\"jf-standard\"],\"slots\":[{\"text\":\"さよなら\",\"label\":\"does not occur in the surface\"}]}\n",
                ),
            )],
        );

        let entries = lexicon_entries(data, "org.openlanguage.ja-jp.reference", &version).unwrap();
        let phrase = entries
            .iter()
            .find(|e| e.id == "ja.lex.phrase.demo-time-greet")
            .expect("phrase record must parse");
        assert_eq!(phrase.kind, "phrase");
        assert_eq!(phrase.slots.len(), 2);
        assert_eq!(phrase.slots[0].text, "おはよう");
        assert_eq!(phrase.slots[0].alternatives.len(), 2);
        assert_eq!(phrase.slots[0].label.as_deref(), Some("the time of day"));

        // Verbatim rule: a slot that doesn't occur in the surface is
        // dropped, not silently matched.
        let bad = entries
            .iter()
            .find(|e| e.id == "ja.lex.phrase.demo-bad-slot")
            .unwrap();
        assert!(bad.slots.is_empty(), "non-verbatim slot must be dropped");

        // The runner surfaces slot views with exactly one deterministic
        // target; ordinary word entries carry none.
        let profile = create_local_profile(data, "H").unwrap();
        finish_onboarding(data, &profile.id, "org.openlanguage.ja-jp.reference", false).unwrap();
        let t1 = practice_task_at(
            data,
            &profile.id,
            "ja.lex.phrase.demo-time-greet",
            "recall-meaning",
            false,
        )
        .unwrap();
        let t2 = practice_task_at(
            data,
            &profile.id,
            "ja.lex.phrase.demo-time-greet",
            "recall-meaning",
            false,
        )
        .unwrap();
        assert_eq!(t1.slots.len(), 2);
        assert_eq!(
            t1.slots.iter().filter(|s| s.target).count(),
            1,
            "exactly one target slot"
        );
        assert_eq!(t1.slots, t2.slots, "target is deterministic per item");
        let word = practice_task_at(
            data,
            &profile.id,
            "ja.lex.greeting.konnichiwa",
            "recall-meaning",
            false,
        )
        .unwrap();
        assert!(word.slots.is_empty(), "word entries render no slots");
    }

    #[test]
    fn sharded_pack_directories_reach_every_reader() {
        // The pack format lets kanji/, sentences/, and phonology/ shard across
        // multiple *.jsonl files (chunking conventions). The kanji drill, cloze
        // runner, contrast runner, and claims tally must see every shard, not
        // just `entries.jsonl`.
        //
        // K-63-follow: the extra shards join the pack *before* the install, the
        // only way pack content can really arrive — an installed version is
        // immutable by contract (docs/07) and every content cache keys on that.
        // Patching an installed directory also silently outranked the memo, so
        // the old shape of this test was asserting something no install does.
        let source = reference_source();
        // Base counts BEFORE the shard files are written: the pack itself grows
        // (K-45 content), so the assertion must be relative to this source, not
        // hardcoded numbers.
        let base_kanji = jsonl_dir_claims(&source, "kanji").0;
        let base_sentences = jsonl_dir_claims(&source, "sentences").0;
        let base_contrasts = jsonl_dir_claims(&source, "phonology").0;

        let tmp = tempfile::tempdir().unwrap();
        let data = tmp.path();
        let version = install_reference_pack_with(
            data,
            &[
                (
                    "kanji/n5-extra.jsonl",
                    concat!(
                        "{\"id\":\"ja.kanji.demo.shard\",\"status\":\"draft\",\"character\":\"分\",",
                        "\"meanings\":[\"part\"],\"readings\":[\"bu\"],\"radicals\":[\"刀\"],",
                        "\"sources\":[\"jf-standard\"]}\n"
                    ),
                ),
                (
                    "sentences/shard.jsonl",
                    concat!(
                        "{\"id\":\"ja.sent.demo.shard\",\"status\":\"draft\",",
                        "\"text\":\"ひこうきの きっぷ を かります\",\"reading\":\"ひこうきのきっぷをかります\",",
                        "\"gloss\":\"I borrow a plane ticket.\",\"cloze_targets\":[\"きっぷ\"],",
                        "\"sources\":[\"jf-standard\"]}\n"
                    ),
                ),
                (
                    "phonology/contrasts-extra.jsonl",
                    concat!(
                        "{\"id\":\"ja.contrast.demo.shard\",\"status\":\"draft\",",
                        "\"feature_id\":\"ja.phon.vowel-length\",",
                        "\"description\":\"demo shard contrast\",",
                        "\"items\":[{\"text\":\"たべもの\"},{\"text\":\"たべものー\"}],",
                        "\"sources\":[\"jf-standard\"]}\n"
                    ),
                ),
            ],
        );

        let kanji = kanji_entries(data, "org.openlanguage.ja-jp.reference", &version).unwrap();
        assert!(
            kanji.iter().any(|e| e.id == "ja.kanji.demo.shard"),
            "shard-file kanji must reach the drill"
        );
        let sentences =
            sentence_entries(data, "org.openlanguage.ja-jp.reference", &version).unwrap();
        assert!(
            sentences.iter().any(|e| e.id == "ja.sent.demo.shard"),
            "shard-file sentences must reach the cloze runner"
        );
        let contrasts =
            contrast_entries(data, "org.openlanguage.ja-jp.reference", &version).unwrap();
        assert!(
            contrasts.iter().any(|e| e.id == "ja.contrast.demo.shard"),
            "shard-file contrasts must reach the discrimination runner"
        );
        let profile = create_local_profile(data, "H").unwrap();
        finish_onboarding(data, &profile.id, "org.openlanguage.ja-jp.reference", false).unwrap();
        let cloze = practice_task_at(
            data,
            &profile.id,
            "ja.sent.demo.shard",
            "production-writing",
            false,
        )
        .unwrap();
        assert!(cloze.typed, "shard sentence builds a cloze task");
        // The install warmed this pack's tallies, so the report a learner sees is
        // the memo the install computed — shards included.
        let claims = pack_claims_at(data).unwrap();
        let ja = claims
            .iter()
            .find(|c| c.pack_id == "org.openlanguage.ja-jp.reference")
            .unwrap();
        assert!(
            ja.counts.kanji == base_kanji + 1
                && ja.counts.sentences == base_sentences + 1
                && ja.counts.phonological_contrasts == base_contrasts + 1,
            "claims must tally shard files: kanji={}/{} sentences={}/{} contrasts={}/{}",
            ja.counts.kanji,
            base_kanji,
            ja.counts.sentences,
            base_sentences,
            ja.counts.phonological_contrasts,
            base_contrasts
        );
    }

    #[test]
    fn lexicon_entries_covers_all_pack_lexicon_files() {
        // The pack format allows multiple lexicon/*.jsonl files; the
        // scheduler plans entries from side files (greetings, time, …),
        // so display/practice readers must see them too — otherwise the
        // plan renders raw content ids instead of surfaces.
        let tmp = tempfile::tempdir().unwrap();
        let data = tmp.path();
        install_bundled_pack(data, "org.openlanguage.ja-jp.reference").unwrap();
        let version = lts_langpack::archive::current_version(
            "org.openlanguage.ja-jp.reference",
            &data.join("packs"),
        )
        .unwrap();
        let entries = lexicon_entries(data, "org.openlanguage.ja-jp.reference", &version).unwrap();
        let by_id: std::collections::HashMap<&str, &LexEntry> =
            entries.iter().map(|e| (e.id.as_str(), e)).collect();
        let arigatou = by_id
            .get("ja.lex.greetings.arigatou-gozaimasu")
            .expect("side-file entry must be visible");
        assert_eq!(arigatou.surface, "ありがとうございます");
        assert_eq!(by_id.get("ja.lex.time.nanji").unwrap().surface, "なんじ");
        assert!(entries.len() > 200, "expected the full pack lexicon");
    }

    #[test]
    fn bundled_pack_phrase_entries_carry_valid_slots() {
        // The ja-JP pack annotates set phrases with kind/slots; every
        // declared slot must occur verbatim in the primary surface
        // (the engine drops non-verbatim slots, so a slot that never
        // renders is an authoring bug worth failing on).
        let tmp = tempfile::tempdir().unwrap();
        let data = tmp.path();
        install_bundled_pack(data, "org.openlanguage.ja-jp.reference").unwrap();
        let version = lts_langpack::archive::current_version(
            "org.openlanguage.ja-jp.reference",
            &data.join("packs"),
        )
        .unwrap();
        let entries = lexicon_entries(data, "org.openlanguage.ja-jp.reference", &version).unwrap();
        let phrases: Vec<&LexEntry> = entries.iter().filter(|e| e.kind == "phrase").collect();
        assert!(
            phrases.len() >= 5,
            "the pack must annotate its set phrases (got {})",
            phrases.len()
        );
        for p in &phrases {
            assert!(!p.slots.is_empty(), "phrase {} declares no slots", p.id);
            for s in &p.slots {
                assert!(
                    p.surface.contains(&s.text),
                    "slot {:?} not verbatim in {} ({})",
                    s.text,
                    p.surface,
                    p.id
                );
            }
        }
        // The runner renders the annotated phrase with one target.
        let profile = create_local_profile(data, "H").unwrap();
        finish_onboarding(data, &profile.id, "org.openlanguage.ja-jp.reference", false).unwrap();
        let task = practice_task_at(
            data,
            &profile.id,
            "ja.lex.greetings.ohayou-gozaimasu",
            "recall-meaning",
            false,
        )
        .unwrap();
        assert_eq!(task.slots.len(), 2);
        assert_eq!(task.slots.iter().filter(|s| s.target).count(), 1);
    }

    #[test]
    fn situation_ids_resolve_to_human_labels() {
        // Scenario cards must show the pack-defined situation name,
        // never a raw `ja.situation.*` id, and must fall back to the
        // id (never an invented label) when the pack defines no name.
        let tmp = tempfile::tempdir().unwrap();
        let data = tmp.path();
        install_bundled_pack(data, "org.openlanguage.ja-jp.reference").unwrap();
        assert_eq!(
            scenarios::situation_label(data, "ja.situation.first-meeting").as_deref(),
            Some("An introduction where people have not met before")
        );
        assert_eq!(scenarios::situation_label(data, "ja.situation.nope"), None);
    }

    fn cid(s: &str) -> lts_domain::ContentId {
        lts_domain::ContentId::parse(s).unwrap()
    }

    fn attempt(
        target: &str,
        modality: lts_domain::ActivityModality,
        family: &str,
        support: u8,
        at: &str,
        id: &str,
        profile: &str,
    ) -> lts_domain::EvidenceEvent {
        lts_learner_model::AttemptDraft::new(
            vec![cid(target)],
            modality,
            cid("ja.activity.demo.recall-choice"),
            "org.openlanguage.ja-demo",
            "0.1.0",
        )
        .prompt_family(cid(family))
        .support(lts_domain::SupportLevel::new(support).unwrap(), vec![])
        .scored(lts_domain::Score::Correct)
        .finish(
            lts_domain::EventId::new(id),
            at,
            lts_domain::ProfileId::new(profile),
        )
    }

    #[test]
    fn plan_uses_scheduler_values_under_budget() {
        let tmp = tempfile::tempdir().unwrap();
        let data = tmp.path();
        install_bundled_pack(data, "org.openlanguage.ja-demo").unwrap();
        let p = create_local_profile(data, "Hunter").unwrap();
        finish_onboarding(data, &p.id, "org.openlanguage.ja-demo", false).unwrap();
        let store = lts_storage::Store::open(data.join("profiles.db")).unwrap();

        // 2025-11-03T00:00:00Z; one overdue FSRS item.
        let now_secs: u64 = 1_762_128_000;
        let state = lts_scheduler::ItemState {
            stability_days: 1.0,
            difficulty: 5.0,
            reps: 2,
            lapses: 0,
            last_review: (now_secs - 3 * 86_400) as i64,
        };
        store
            .save_scheduler_state(
                &p.id,
                &lts_storage::SchedulerRecord {
                    item_id: "ja.lex.demo.hajimemashite#recall-meaning".into(),
                    scheduler: lts_scheduler::SPIKE_VERSION.into(),
                    params_json: serde_json::to_string(&state).unwrap(),
                    due_at: rfc3339_utc(now_secs - 3_600),
                },
            )
            .unwrap();

        // konnichiwa reaches Independent recall (2 supported-free
        // successes, distinct prompts) -> goal prerequisites met.
        for (i, at) in ["2025-11-01T00:00:00Z", "2025-11-02T00:00:00Z"]
            .iter()
            .enumerate()
        {
            let ev = attempt(
                "ja.lex.demo.konnichiwa",
                lts_domain::ActivityModality::RecallMeaning,
                if i == 0 {
                    "ja.expr.demo.greet-a"
                } else {
                    "ja.expr.demo.greet-b"
                },
                0,
                at,
                &format!("k{i}"),
                &p.id,
            );
            store.append_evidence(&ev).unwrap();
        }
        // watashi: one scaffolded success -> seen but weak.
        let weak = attempt(
            "ja.lex.demo.watashi",
            lts_domain::ActivityModality::ComprehensionReading,
            "ja.expr.demo.self-a",
            2,
            "2025-11-02T12:00:00Z",
            "w1",
            &p.id,
        );
        store.append_evidence(&weak).unwrap();

        let plan = build_plan(data, &p.id, 5, now_secs).unwrap();
        assert!(
            plan.items
                .iter()
                .any(|i| i.reason == lts_scheduler::PlanReason::DueReview)
        );
        assert!(
            plan.items
                .iter()
                .any(|i| i.reason == lts_scheduler::PlanReason::WeakSkill)
        );
        assert!(
            plan.items
                .iter()
                .any(|i| i.reason == lts_scheduler::PlanReason::Progression)
        );
        assert!(plan.total_seconds <= 300);
        // Deterministic: identical inputs produce identical plans.
        assert_eq!(plan, build_plan(data, &p.id, 5, now_secs).unwrap());
    }

    #[test]
    fn personalize_progression_favors_developing_dimensions() {
        use lts_domain::{ActivityModality as M, MasteryState as S};
        let dm = |c: &str, m: M, conf: f32| lts_learner_model::DerivedMastery {
            content_id: c.into(),
            dimension: m,
            state: S::Introduced,
            confidence: conf,
            needs_refresh: false,
            policy_version: "p".into(),
            algorithm_version: "a".into(),
        };
        let pi = |c: &str, m: M| lts_scheduler::ProgressionItem {
            content_id: c.into(),
            modality: m,
        };
        // Recall-meaning mastered (~0.8); discrimination developing (~0.2).
        let derived = vec![
            dm("r1", M::RecallMeaning, 0.8),
            dm("r2", M::RecallMeaning, 0.8),
            dm("d1", M::PhonologicalDiscrimination, 0.2),
        ];
        // Curriculum order interleaves the two dimensions.
        let mut prog = vec![
            pi("rA", M::RecallMeaning),
            pi("dA", M::PhonologicalDiscrimination),
            pi("rB", M::RecallMeaning),
            pi("dB", M::PhonologicalDiscrimination),
        ];
        personalize_progression(&mut prog, &derived);
        // Developing dimension first, within-dimension curriculum order kept.
        let order: Vec<&str> = prog.iter().map(|p| p.content_id.as_str()).collect();
        assert_eq!(order, vec!["dA", "dB", "rA", "rB"]);

        // A fresh learner (no seen items) is a stable no-op: curriculum order.
        let mut fresh = vec![
            pi("rA", M::RecallMeaning),
            pi("dA", M::PhonologicalDiscrimination),
        ];
        personalize_progression(&mut fresh, &[]);
        let fresh_order: Vec<&str> = fresh.iter().map(|p| p.content_id.as_str()).collect();
        assert_eq!(fresh_order, vec!["rA", "dA"]);
    }

    #[test]
    fn progress_shows_modality_differences() {
        let tmp = tempfile::tempdir().unwrap();
        let data = tmp.path();
        install_bundled_pack(data, "org.openlanguage.ja-demo").unwrap();
        let p = create_local_profile(data, "Hunter").unwrap();
        let store = lts_storage::Store::open(data.join("profiles.db")).unwrap();
        let ev = attempt(
            "ja.lex.demo.watashi",
            lts_domain::ActivityModality::ComprehensionReading,
            "ja.expr.demo.self-a",
            0,
            "2025-11-02T12:00:00Z",
            "w1",
            &p.id,
        );
        store.append_evidence(&ev).unwrap();

        let now_rfc = rfc3339_utc(1_762_128_000);
        let derived = derive_pairs(&store, &p.id, &now_rfc).unwrap();
        // Reading evidence moves reading only; writing stays unseen
        // (never even a row) — capabilities are per dimension (docs/03 §2).
        let reading = derived
            .iter()
            .find(|d| {
                d.content_id == "ja.lex.demo.watashi"
                    && dimension_kebab(d.dimension) == "comprehension-reading"
            })
            .unwrap();
        assert_ne!(reading.state, lts_domain::MasteryState::Unseen);
        assert!(
            !derived.iter().any(|d| d.content_id == "ja.lex.demo.watashi"
                && dimension_kebab(d.dimension) == "production-writing")
        );
    }

    /// M4-E2E: fresh user completes a small Japanese on-ramp flow
    /// (encounter text placeholder -> recall -> IME typing), state
    /// persists, restart resumes safely, and no streak/heart value is
    /// exposed anywhere.
    #[test]
    fn fresh_user_onramp_flow_persists_and_resumes() {
        let tmp = tempfile::tempdir().unwrap();
        let data = tmp.path();
        install_bundled_pack(data, "org.openlanguage.ja-demo").unwrap();
        let p = create_local_profile(data, "New").unwrap();
        finish_onboarding(data, &p.id, "org.openlanguage.ja-demo", false).unwrap();

        // Load the installed pack into the activity runtime.
        let packs_root = data.join("packs");
        let version =
            lts_langpack::archive::current_version("org.openlanguage.ja-demo", &packs_root)
                .unwrap();
        let pack = lts_langpack::Pack::load_dir(
            &packs_root.join("org.openlanguage.ja-demo").join(&version),
        )
        .unwrap();
        let rt = lts_activity::ActivityRuntime::from_pack(&pack).unwrap();

        let store = lts_storage::Store::open(data.join("profiles.db")).unwrap();
        let t0: u64 = 1_762_128_000; // 2025-11-03T00:00:00Z
        let spike = lts_scheduler::FsrsSpike {
            w: lts_scheduler::fsrs::DEFAULT_W,
            request_ret: lts_scheduler::fsrs::DEFAULT_REQUEST_RET,
        };
        let mut state: Option<lts_scheduler::ItemState> = None;

        // 1. Encounter: text placeholder (pack declares listening: false).
        let enc = rt.render("ja.activity.demo.encounter-greet").unwrap();
        let a = lts_activity::Attempt::begin(
            &enc,
            vec![cid("ja.lex.demo.konnichiwa")],
            Some("g-enc".into()),
            Some(cid("ja.expr.demo.greet-p1")),
        );
        let o = a.submit(
            lts_domain::Score::Correct,
            lts_domain::EventId::new("e-enc"),
            rfc3339_utc(t0),
            lts_domain::ProfileId::new(&p.id),
        );
        store.append_evidence(&o.evidence).unwrap();

        // 2. Two independent recalls on distinct prompts -> Independent
        //    recall; each valid retrieval updates the scheduler.
        for (i, fam) in ["ja.expr.demo.greet-p1", "ja.expr.demo.greet-p2"]
            .iter()
            .enumerate()
        {
            let at = t0 + 60 * (i as u64 + 1);
            let act = rt.render("ja.activity.demo.recall-greet").unwrap();
            let a = lts_activity::Attempt::begin(
                &act,
                vec![cid("ja.lex.demo.konnichiwa")],
                Some(format!("g-r{i}")),
                Some(cid(fam)),
            );
            let o = a.submit(
                lts_domain::Score::Correct,
                lts_domain::EventId::new(format!("e-r{i}")),
                rfc3339_utc(at),
                lts_domain::ProfileId::new(&p.id),
            );
            store.append_evidence(&o.evidence).unwrap();
            let rating = lts_scheduler::rating_from_evidence(&o.evidence).unwrap();
            let decision =
                lts_scheduler::Scheduler::review(&spike, state.as_ref(), rating, at as i64);
            state = Some(decision.state.clone());
            store
                .save_scheduler_state(
                    &p.id,
                    &lts_storage::SchedulerRecord {
                        item_id: "ja.lex.demo.konnichiwa#recall-meaning".into(),
                        scheduler: lts_scheduler::SPIKE_VERSION.into(),
                        params_json: serde_json::to_string(&decision.state).unwrap(),
                        due_at: rfc3339_utc(decision.due_at as u64),
                    },
                )
                .unwrap();
        }

        // 3. Typed (IME) answer, graded against the canonical form.
        let wact = rt.render("ja.activity.demo.type-greet").unwrap();
        let wt = lts_activity::WritingTask {
            item_id: "ja.lex.demo.konnichiwa".into(),
            answer: "こんにちは".into(),
            accepted: vec![],
            prompt_text: "hello / good afternoon".into(),
            answer_reading: None,
            answer_romaji: None,
        };
        assert!(lts_activity::grade_writing("こんにちは", &wt).correct);
        let a = lts_activity::Attempt::begin(
            &wact,
            vec![cid("ja.lex.demo.konnichiwa")],
            Some("g-w".into()),
            Some(cid("ja.expr.demo.greet-p3")),
        );
        let o = a.submit(
            lts_domain::Score::Correct,
            lts_domain::EventId::new("e-w"),
            rfc3339_utc(t0 + 300),
            lts_domain::ProfileId::new(&p.id),
        );
        store.append_evidence(&o.evidence).unwrap();

        // 4. Persistence: progress reflects the whole flow.
        let derived = derive_pairs(&store, &p.id, &rfc3339_utc(t0 + 3_600)).unwrap();
        let recall = derived
            .iter()
            .find(|d| {
                d.content_id == "ja.lex.demo.konnichiwa"
                    && dimension_kebab(d.dimension) == "recall-meaning"
            })
            .unwrap();
        assert_eq!(recall.state, lts_domain::MasteryState::Independent);
        assert!(
            derived
                .iter()
                .any(|d| dimension_kebab(d.dimension) == "production-writing"
                    && d.state != lts_domain::MasteryState::Unseen)
        );

        // 5. Restart: reopen storage fresh; resume safely at a later
        //    clock — the due review is planned, new material unlocked.
        drop(store);
        let later = t0 + 4 * 86_400;
        let plan = build_plan(data, &p.id, 5, later).unwrap();
        assert!(
            plan.items
                .iter()
                .any(|i| i.reason == lts_scheduler::PlanReason::DueReview)
        );
        assert!(
            plan.items
                .iter()
                .any(|i| i.reason == lts_scheduler::PlanReason::Progression)
        );

        // 6. No streak/heart mechanics anywhere in exposed state.
        let json = serde_json::to_string(&plan).unwrap();
        assert!(!json.contains("streak"));
        assert!(!json.contains("heart"));
    }

    /// ADR-0019: a staged sidecar payload outranks the development vendor tree,
    /// so a released build never depends on a developer's cache directory.
    #[test]
    fn the_bundled_sidecar_outranks_the_dev_vendor_tree() {
        let tmp = tempfile::TempDir::new().unwrap();
        let data = tmp.path();
        let payload = data.join("resources/aligner");
        write_fake_sidecar(&payload, "");
        // A vendor tree that could also answer must lose.
        let vendor = write_fake_vendor(data);

        let got = aligner_probe_with(
            data,
            "org.openlanguage.speech.whisper-ggml-tiny",
            Some(&payload),
            Some(&vendor),
        )
        .unwrap();
        assert_eq!(got.source, "bundled");
        assert!(
            got.binary.starts_with(&payload),
            "the bundled payload must be the one used: {:?}",
            got.binary
        );
        assert_eq!(got.runtime_version.as_deref(), Some("1.9.4"));
    }

    /// The two failures are different sentences. A CPU below the payload's
    /// stated floor must not be reported as "this build has no runtime"
    /// (docs/18: say the thing that is actually true).
    #[test]
    fn a_payload_the_cpu_cannot_run_says_so_instead_of_claiming_absence() {
        let tmp = tempfile::TempDir::new().unwrap();
        let payload = tmp.path().join("aligner");
        write_fake_sidecar(&payload, "avx1024");
        let miss = aligner_probe_with(
            tmp.path(),
            "org.openlanguage.speech.whisper-ggml-tiny",
            Some(&payload),
            None,
        )
        .expect_err("an impossible instruction-set floor cannot resolve");
        assert!(matches!(miss, AlignerMiss::Cpu { .. }), "{:?}", miss);
        assert_eq!(aligner_miss_reason(&miss), "aligner-cpu-unsupported");
    }

    /// A half-staged payload must never be executed, and must not take the
    /// development path down with it.
    #[test]
    fn an_incomplete_payload_never_runs_and_does_not_shadow_the_dev_path() {
        let tmp = tempfile::TempDir::new().unwrap();
        let payload = tmp.path().join("aligner");
        write_fake_sidecar(&payload, "");
        std::fs::remove_file(
            payload
                .join(lts_speech_runtime::sidecar::host_platform())
                .join("model/ggml-tiny.bin"),
        )
        .unwrap();
        let vendor = write_fake_vendor(tmp.path());

        let got = aligner_probe_with(
            tmp.path(),
            "org.openlanguage.speech.whisper-ggml-tiny",
            Some(&payload),
            Some(&vendor),
        )
        .unwrap();
        assert_eq!(
            got.source, "bench",
            "an unusable payload must not hide a working dev path"
        );

        let miss = aligner_probe_with(
            tmp.path(),
            "org.openlanguage.speech.whisper-ggml-tiny",
            Some(&payload),
            None,
        )
        .expect_err("nothing usable");
        assert_eq!(
            aligner_miss_reason(&miss),
            "aligner-unavailable",
            "a broken payload is an absence, not a CPU claim"
        );
    }

    /// Choosing no speech model is the user opting out, which is a different
    /// answer from a build that has no runtime.
    #[test]
    fn a_disabled_speech_model_is_reported_as_opted_out() {
        let tmp = tempfile::TempDir::new().unwrap();
        let miss = aligner_probe(tmp.path()).expect_err("the default preference is off");
        assert_eq!(aligner_miss_reason(&miss), "speech-model-off");
    }

    /// Same-size corruption is exactly what the declared-size gate cannot see.
    /// The resolver must fall through to "absent" rather than hand the caller a
    /// payload that would produce wrong alignment silently.
    #[test]
    fn a_bundled_payload_whose_bytes_disagree_with_the_manifest_is_refused() {
        let tmp = tempfile::TempDir::new().unwrap();
        let payload = tmp.path().join("aligner");
        write_fake_sidecar(&payload, "");
        let model = payload
            .join(lts_speech_runtime::sidecar::host_platform())
            .join("model/ggml-tiny.bin");
        // Same length as the declared 10 bytes, different content.
        std::fs::write(&model, "corrupt-modl").unwrap();
        let miss = aligner_probe_with(
            tmp.path(),
            "org.openlanguage.speech.whisper-ggml-tiny",
            Some(&payload),
            None,
        )
        .expect_err("a corrupted payload must never resolve");
        assert_eq!(aligner_miss_reason(&miss), "aligner-unavailable");
    }

    /// A payload that satisfies the resolver's gates without a real whisper.cpp
    /// build: declared sizes match the files on disk, and `requires_cpu` is the
    /// caller's so the CPU gate can be driven both ways.
    fn write_fake_sidecar(root: &Path, requires_cpu: &str) {
        use lts_speech_runtime::sidecar::{MANIFEST_FILE, host_platform};
        let dir = root.join(host_platform());
        std::fs::create_dir_all(dir.join("bin")).unwrap();
        std::fs::create_dir_all(dir.join("model")).unwrap();
        let files = [
            "bin/whisper-cli",
            "bin/libwhisper.so.1",
            "bin/libggml.so.0",
            "bin/libggml-cpu.so.0",
            "bin/libggml-base.so.0",
            "bin/libgomp.so.1",
        ];
        for f in files {
            std::fs::write(dir.join(f), format!("fake-{f}")).unwrap();
        }
        std::fs::write(dir.join("model/ggml-tiny.bin"), "fake-model").unwrap();
        let entries = files
            .iter()
            .map(|f| {
                let raw = std::fs::read(dir.join(f)).unwrap();
                format!(
                    "    - path: {f}\n      bytes: {}\n      sha256: {}",
                    raw.len(),
                    sha256_hex(&raw)
                )
            })
            .collect::<Vec<_>>()
            .join("\n");
        std::fs::write(
            dir.join(MANIFEST_FILE),
            [
                "schema_version: 1",
                "component: whisper.cpp-aligner",
                &format!("built_for: {}", host_platform()),
                "runtime:",
                "  upstream: https://github.com/ggml-org/whisper.cpp",
                &format!("  ref: {}", "0".repeat(40)),
                "  version: 1.9.4",
                "  license: MIT",
                "  build_flags: -DGGML_NATIVE=OFF",
                &format!("  requires_cpu: \"{requires_cpu}\""),
                "  files:",
                &entries,
                "model:",
                "  id: ggml-tiny",
                "  upstream: https://huggingface.co/ggerganov/whisper.cpp",
                "  license: MIT",
                &format!("  bytes: {}", "fake-model".len()),
                &format!("  sha256: {}", sha256_hex(b"fake-model")),
                "staged:",
                "  date: \"2026-10-08T00:00:00Z\"",
                "  by: test",
                "  host: test",
            ]
            .join("\n"),
        )
        .unwrap();
    }

    /// The fixture's digests have to be real digests now that the resolver
    /// recomputes them; a placeholder would make every positive test a
    /// test of the refusal path instead.
    fn sha256_hex(bytes: &[u8]) -> String {
        use sha2::{Digest, Sha256};
        Sha256::digest(bytes)
            .iter()
            .map(|b| format!("{b:02x}"))
            .collect()
    }

    /// A development vendor tree that the resolver would accept, so priority is
    /// proven against a real alternative rather than an empty directory.
    fn write_fake_vendor(root: &Path) -> PathBuf {
        let vendor = root.join("vendor");
        std::fs::create_dir_all(vendor.join("whisper.cpp/build/bin")).unwrap();
        std::fs::write(
            vendor.join("whisper.cpp/build/bin/whisper-cli"),
            "#!/bin/sh\n",
        )
        .unwrap();
        std::fs::write(vendor.join("ggml-tiny.bin"), "vendor model").unwrap();
        vendor
    }

    #[test]
    fn pronunciation_check_abstains_on_weak_reference_and_mismatch() {
        use base64::Engine;
        let vendor = std::env::var("LTS_BENCH_VENDOR")
            .map(PathBuf::from)
            .unwrap_or_else(|_| {
                PathBuf::from(std::env::var("HOME").unwrap()).join(".cache/lts-bench")
            });
        if !vendor.join("whisper.cpp/build/bin/whisper-cli").exists() {
            eprintln!("SKIP: vendor aligner not present");
            return;
        }
        let tmp = tempfile::TempDir::new().unwrap();
        let data = tmp.path();
        install_bundled_pack(data, "org.openlanguage.ja-demo").unwrap();
        // The feature is opt-in: select a speech model so the aligner resolves.
        crate::models::save_speech_pref(
            data,
            &crate::models::SpeechPref {
                asr_model: "org.openlanguage.speech.whisper-ggml-tiny".into(),
            },
        )
        .unwrap();
        let packs_root = data.join("packs");
        let version =
            lts_langpack::archive::current_version("org.openlanguage.ja-demo", &packs_root)
                .unwrap();
        let media = packs_root
            .join("org.openlanguage.ja-demo")
            .join(&version)
            .join("media");
        let short = std::fs::read(media.join("ja.lex.demo.obasan.wav")).unwrap();
        let long = std::fs::read(media.join("ja.lex.demo.obaasan.wav")).unwrap();
        let sb = lts_speech_runtime::from_wav16(&short).unwrap();
        let lb = lts_speech_runtime::from_wav16(&long).unwrap();
        let mut samples = sb.samples.clone();
        samples.extend(
            std::iter::repeat_n(0.0f32, (0.2 * sb.sample_rate_hz as f32) as usize)
                .chain(lb.samples.clone()),
        );
        let attempt_wav = lts_speech_runtime::to_wav16(&lts_speech_api::AudioBuffer {
            samples,
            sample_rate_hz: sb.sample_rate_hz,
        });
        let attempt = PronunciationAttempt {
            pack_id: "org.openlanguage.ja-demo".into(),
            short_unit: "ja.lex.demo.obasan".into(),
            long_unit: "ja.lex.demo.obaasan".into(),
            short_text: "おばさん".into(),
            long_text: "おばあさん".into(),
            wav_b64: base64::engine::general_purpose::STANDARD.encode(&attempt_wav),
        };
        let res = pronunciation_check_at(data, attempt.clone()).unwrap();
        // The bundled demo reference is TTS audio whose long/short voiced ratio
        // is ~1.04 (Kokoro does not actually lengthen the long vowel), too weak
        // to anchor a length judgement. The reference-contrast gate abstains
        // rather than flag a correct contrast as "too long" (docs/05). A genuine
        // positive-scoring path needs a real recording with a true contrast.
        assert_eq!(
            res.abstain_reason.as_deref(),
            Some("reference-contrast-weak"),
            "got {:?}",
            res.abstain_reason
        );
        assert!(res.corrections.is_empty());

        // Verification gate: only the short word against the expected pair.
        let mismatch = PronunciationAttempt {
            wav_b64: base64::engine::general_purpose::STANDARD.encode(&short),
            ..attempt
        };
        let res2 = pronunciation_check_at(data, mismatch).unwrap();
        let reason = res2.abstain_reason.expect("must abstain");
        assert!(
            reason.starts_with("mismatch") || reason.starts_with("abstained"),
            "unexpected reason {reason}"
        );
        assert!(res2.corrections.is_empty());

        // Reference playback: allowlisted pack + validated content id only.
        let b64 =
            reference_audio_at(data, "org.openlanguage.ja-demo", "ja.lex.demo.obasan").unwrap();
        assert!(!b64.is_empty());
        assert!(reference_audio_at(data, "org.openlanguage.ja-demo", "../etc/passwd").is_err());
        assert!(reference_audio_at(data, "org.evil.pack", "ja.lex.demo.obasan").is_err());
    }

    /// Option 3: a pack that DECLARES a production target (mora-derived) and
    /// ships no media still scores length. The same weak TTS audio that the
    /// media path rejected as `reference-contrast-weak` is now correctly judged
    /// against the declared target — and a no-contrast production reads
    /// "shorter", not the old false "close".
    #[test]
    fn pronunciation_check_uses_pack_declared_target_without_media() {
        use base64::Engine;
        let Some(tmp) = dictation_vendor() else {
            return;
        };
        let data = tmp.path();
        // ja-JP declares mora targets (obasan pair 1.25) and ships NO media.
        install_bundled_pack(data, "org.openlanguage.ja-jp.reference").unwrap();
        let packs_root = data.join("packs");
        let demo_ver =
            lts_langpack::archive::current_version("org.openlanguage.ja-demo", &packs_root)
                .unwrap();
        let media = packs_root
            .join("org.openlanguage.ja-demo")
            .join(&demo_ver)
            .join("media");
        let short = std::fs::read(media.join("ja.lex.demo.obasan.wav")).unwrap();
        let long = std::fs::read(media.join("ja.lex.demo.obaasan.wav")).unwrap();
        let sb = lts_speech_runtime::from_wav16(&short).unwrap();
        let lb = lts_speech_runtime::from_wav16(&long).unwrap();
        let mut samples = sb.samples.clone();
        samples.extend(
            std::iter::repeat_n(0.0f32, (0.2 * sb.sample_rate_hz as f32) as usize)
                .chain(lb.samples.clone()),
        );
        let attempt_wav = lts_speech_runtime::to_wav16(&lts_speech_api::AudioBuffer {
            samples,
            sample_rate_hz: sb.sample_rate_hz,
        });
        let attempt = PronunciationAttempt {
            pack_id: "org.openlanguage.ja-jp.reference".into(),
            short_unit: "ja.contrast.vowel-length.obasan.short".into(),
            long_unit: "ja.contrast.vowel-length.obasan.long".into(),
            short_text: "おばさん".into(),
            long_text: "おばあさん".into(),
            wav_b64: base64::engine::general_purpose::STANDARD.encode(&attempt_wav),
        };
        let res = pronunciation_check_at(data, attempt).unwrap();
        // Declared target present -> no `reference-media-missing` abstention.
        assert_eq!(res.abstain_reason, None, "got {:?}", res.abstain_reason);
        // Weak TTS contrast (~1.04) vs mora target 1.25 -> shorter, not close.
        assert_eq!(res.corrections.len(), 1);
        assert_eq!(
            res.corrections[0].feedback_template_id,
            "speech.long-vowel.shorter"
        );
        // Pitch needs a reference recording; length still scored without it.
        assert_eq!(
            res.pitch.unavailable_reason.as_deref(),
            Some("no-reference-recording")
        );
    }

    #[test]
    fn pronunciation_check_abstains_when_speech_model_is_off() {
        use base64::Engine;
        let tmp = tempfile::TempDir::new().unwrap();
        let data = tmp.path();
        install_bundled_pack(data, "org.openlanguage.ja-demo").unwrap();
        // Privacy default: no speech model is selected, so speaking is not assessed.
        assert_eq!(crate::models::load_speech_pref(data).asr_model, "off");
        let attempt = PronunciationAttempt {
            pack_id: "org.openlanguage.ja-demo".into(),
            short_unit: "ja.lex.demo.obasan".into(),
            long_unit: "ja.lex.demo.obaasan".into(),
            short_text: "おばさん".into(),
            long_text: "おばあさん".into(),
            wav_b64: base64::engine::general_purpose::STANDARD.encode(
                lts_speech_runtime::to_wav16(&lts_speech_api::AudioBuffer {
                    samples: vec![0.0f32; 1600],
                    sample_rate_hz: 16000,
                }),
            ),
        };
        let res = pronunciation_check_at(data, attempt).unwrap();
        assert_eq!(res.abstain_reason.as_deref(), Some("speech-model-off"));
        assert!(res.corrections.is_empty());
    }

    fn dictation_vendor() -> Option<tempfile::TempDir> {
        let vendor = std::env::var("LTS_BENCH_VENDOR")
            .map(PathBuf::from)
            .unwrap_or_else(|_| {
                PathBuf::from(std::env::var("HOME").unwrap()).join(".cache/lts-bench")
            });
        if !vendor.join("whisper.cpp/build/bin/whisper-cli").exists()
            || !vendor.join("ggml-tiny.bin").exists()
        {
            eprintln!("SKIP: vendor aligner/model not present");
            return None;
        }
        let tmp = tempfile::TempDir::new().unwrap();
        let data = tmp.path();
        install_bundled_pack(data, "org.openlanguage.ja-demo").unwrap();
        crate::models::save_speech_pref(
            data,
            &crate::models::SpeechPref {
                asr_model: "org.openlanguage.speech.whisper-ggml-tiny".into(),
            },
        )
        .unwrap();
        Some(tmp)
    }

    #[test]
    fn dictation_check_abstains_when_model_off() {
        use base64::Engine;
        let tmp = tempfile::TempDir::new().unwrap();
        let data = tmp.path();
        install_bundled_pack(data, "org.openlanguage.ja-demo").unwrap();
        let attempt = DictationAttempt {
            pack_id: "org.openlanguage.ja-demo".into(),
            target_text: "おばあさん".into(),
            wav_b64: base64::engine::general_purpose::STANDARD.encode(b"not-a-wav"),
        };
        let res = dictation_check_at(data, attempt).unwrap();
        assert_eq!(res.abstain_reason.as_deref(), Some("speech-model-off"));
        assert_eq!(res.matched, None);
    }

    #[test]
    fn dictation_check_matches_spoken_target() {
        use base64::Engine;
        let Some(tmp) = dictation_vendor() else {
            return;
        };
        let data = tmp.path();
        let wav = std::fs::read(
            data.join("packs/org.openlanguage.ja-demo")
                .join(
                    lts_langpack::archive::current_version(
                        "org.openlanguage.ja-demo",
                        &data.join("packs"),
                    )
                    .unwrap(),
                )
                .join("media/ja.lex.demo.obaasan.wav"),
        )
        .unwrap();
        let res = dictation_check_at(
            data,
            DictationAttempt {
                pack_id: "org.openlanguage.ja-demo".into(),
                target_text: "おばあさん".into(),
                wav_b64: base64::engine::general_purpose::STANDARD.encode(&wav),
            },
        )
        .unwrap();
        assert_eq!(res.abstain_reason, None, "got {:?}", res.abstain_reason);
        assert_eq!(res.matched, Some(true), "heard {:?}", res.heard);
    }

    #[test]
    fn dictation_check_flags_clear_mismatch() {
        use base64::Engine;
        let Some(tmp) = dictation_vendor() else {
            return;
        };
        let data = tmp.path();
        let wav = std::fs::read(
            data.join("packs/org.openlanguage.ja-demo")
                .join(
                    lts_langpack::archive::current_version(
                        "org.openlanguage.ja-demo",
                        &data.join("packs"),
                    )
                    .unwrap(),
                )
                .join("media/ja.lex.demo.obaasan.wav"),
        )
        .unwrap();
        let res = dictation_check_at(
            data,
            DictationAttempt {
                pack_id: "org.openlanguage.ja-demo".into(),
                target_text: "これは何ですか".into(),
                wav_b64: base64::engine::general_purpose::STANDARD.encode(&wav),
            },
        )
        .unwrap();
        // Clear mismatch: heard おばあさん vs an unrelated target.
        // Safety invariant: an unrelated target must never yield a match.
        // (Whisper may abstain under parallel load, so assert "not a match",
        // not a hard false verdict.)
        assert_ne!(res.matched, Some(true), "heard {:?}", res.heard);
    }

    #[test]
    fn dictation_check_abstains_on_silence() {
        use base64::Engine;
        let Some(tmp) = dictation_vendor() else {
            return;
        };
        let data = tmp.path();
        let silence = lts_speech_runtime::to_wav16(&lts_speech_api::AudioBuffer {
            samples: vec![0.0f32; 8000],
            sample_rate_hz: 16000,
        });
        let res = dictation_check_at(
            data,
            DictationAttempt {
                pack_id: "org.openlanguage.ja-demo".into(),
                target_text: "おばあさん".into(),
                wav_b64: base64::engine::general_purpose::STANDARD.encode(&silence),
            },
        )
        .unwrap();
        assert_eq!(res.matched, None);
        assert_eq!(res.abstain_reason.as_deref(), Some("quality:silence"));
    }

    #[test]
    fn dictation_target_prefers_kana_only_and_rotates() {
        let tmp = tempfile::TempDir::new().unwrap();
        let data = tmp.path();
        install_bundled_pack(data, "org.openlanguage.ja-jp.reference").unwrap();
        let t = dictation_target_at(data, "org.openlanguage.ja-jp.reference", 0).unwrap();
        assert!(!t.text.is_empty() && !t.reading.is_empty());
        // Preferred candidates are kana-only: text and reading normalize equal.
        assert_eq!(
            normalize_for_match(&t.text),
            normalize_for_match(&t.reading)
        );
        // Rotation is deterministic and wraps without panic.
        let a0 = dictation_target_at(data, "org.openlanguage.ja-jp.reference", 0).unwrap();
        let a0b = dictation_target_at(data, "org.openlanguage.ja-jp.reference", 0).unwrap();
        assert_eq!(a0.id, a0b.id, "same offset is deterministic");
        let b = dictation_target_at(data, "org.openlanguage.ja-jp.reference", 1).unwrap();
        let big = dictation_target_at(data, "org.openlanguage.ja-jp.reference", 9999).unwrap();
        assert!(
            !b.id.is_empty() && !big.id.is_empty(),
            "large offset wraps to a valid target"
        );
    }

    #[test]
    fn speech_audio_prefers_licensed_media_then_synthesizes() {
        let tmp = tempfile::TempDir::new().unwrap();
        let data = tmp.path();
        install_bundled_pack(data, "org.openlanguage.ja-demo").unwrap();
        // Curated licensed recording wins (TTS runtime not needed).
        let a = speech_audio_at(
            data,
            "org.openlanguage.ja-demo",
            "ja.lex.demo.obasan",
            "おばさん",
        )
        .unwrap();
        assert_eq!(a.source, "licensed-recording");
        assert!(!a.wav_b64.is_empty());
        // Path safety + allowlist.
        assert!(speech_audio_at(data, "org.openlanguage.ja-demo", "../etc/passwd", "x").is_err());
        assert!(speech_audio_at(data, "org.evil.pack", "ja.lex.demo.obasan", "x").is_err());

        // Fallback: no media for konnichiwa -> local synthesis, labeled.
        let vendor = std::env::var("LTS_BENCH_VENDOR")
            .map(PathBuf::from)
            .unwrap_or_else(|_| {
                PathBuf::from(std::env::var("HOME").unwrap()).join(".cache/lts-bench")
            });
        if !vendor.join("kokoro-multi-lang-v1_0/model.onnx").exists() {
            eprintln!("SKIP: vendor TTS not present");
            return;
        }
        let b = speech_audio_at(
            data,
            "org.openlanguage.ja-demo",
            "ja.lex.demo.konnichiwa",
            "こんにちは",
        )
        .unwrap();
        assert_eq!(b.source, "model-output");
        assert!(!b.wav_b64.is_empty());
    }

    /// K-65/K-65b: the pinned synthesis engine spells a romanization out
    /// letter by letter and cannot read a logographic surface at all. The
    /// reading rule must therefore rank by structure only — this fixture uses
    /// invented script names on purpose, because naming a real script here
    /// would mean the engine knew about it.
    #[test]
    fn pick_reading_ranks_by_structure_and_never_returns_a_transliteration() {
        let readings = vec![
            serde_json::json!({"text": "roman", "transliteration_system": "system-x"}),
            serde_json::json!({"text": "same-script", "script": "logographic"}),
            serde_json::json!({"text": "phonetic", "script": "syllabic"}),
        ];
        assert_eq!(
            pick_reading(Some(&readings), Some("logographic")).as_deref(),
            Some("phonetic"),
            "the reading in another script explains the written form"
        );
        let only_same = vec![
            serde_json::json!({"text": "same", "script": "logographic"}),
            serde_json::json!({"text": "roman", "transliteration_system": "system-x"}),
        ];
        assert_eq!(
            pick_reading(Some(&only_same), Some("logographic")).as_deref(),
            Some("same")
        );
        let only_romanization =
            vec![serde_json::json!({"text": "roman", "transliteration_system": "system-x"})];
        assert_eq!(
            pick_reading(Some(&only_romanization), Some("logographic")),
            None,
            "a romanization is never a reading"
        );
        assert_eq!(pick_reading(None, Some("logographic")), None);
    }

    #[test]
    fn speakable_text_prefers_the_declared_reading_over_the_written_form() {
        let tmp = tempfile::TempDir::new().unwrap();
        let data = tmp.path();
        // The demo fixture's logographic entry: written form `私`, declared
        // reading `わたし`, and a romanization the engine must never be handed
        // (measured: Kokoro spells romaji out letter by letter — K-65).
        let demo = "org.openlanguage.ja-demo";
        install_bundled_pack(data, demo).unwrap();
        let version =
            lts_langpack::archive::current_version(demo, &data.join("packs")).expect("version");
        let text = speakable_text(data, demo, &version, "ja.lex.demo.watashi").unwrap();
        assert_eq!(text, "わたし", "synthesis speaks the declared reading");
        assert_ne!(text, "私", "never the written form the engine cannot read");
        assert_ne!(text, "watashi", "never the romanization");
        // Sentences synthesize their own declared text.
        let pack = "org.openlanguage.ja-jp.reference";
        install_bundled_pack(data, pack).unwrap();
        let version =
            lts_langpack::archive::current_version(pack, &data.join("packs")).expect("version");
        let sentence = sentence_entries(data, pack, &version)
            .unwrap()
            .into_iter()
            .next()
            .expect("the reference pack declares sentences");
        assert_eq!(
            speakable_text(data, pack, &version, &sentence.id).unwrap(),
            sentence.text
        );
        // No record: abstain, never guess.
        assert_eq!(
            speakable_text(data, pack, &version, "ja.lex.no.such.entry").unwrap_err(),
            "unknown item"
        );
    }

    #[test]
    fn an_entry_with_no_declared_reading_falls_back_to_its_written_form() {
        let entry = LexEntry {
            id: "ja.lex.test.entry".into(),
            surface: "logograph".into(),
            reading: None,
            romaji: Some("roman".into()),
            gloss: "gloss".into(),
            status: "draft".into(),
            kind: "word".into(),
            slots: Vec::new(),
        };
        assert_eq!(entry.speakable(), "logograph");
        let entry = LexEntry {
            reading: Some("phonetic".into()),
            ..entry
        };
        assert_eq!(entry.speakable(), "phonetic");
    }

    #[test]
    fn media_provenance_comes_from_the_pack_manifest_not_file_presence() {
        // ADR-0016: shipped audio must never surface as a licensed recording just
        // because a file sits in media/. The pack's manifest decides.
        let tmp = tempfile::TempDir::new().unwrap();
        let data = tmp.path();
        install_bundled_pack(data, "org.openlanguage.ja-demo").unwrap();
        let version =
            lts_langpack::archive::current_version("org.openlanguage.ja-demo", &data.join("packs"))
                .expect("installed pack version");
        let pack_dir = data
            .join("packs")
            .join("org.openlanguage.ja-demo")
            .join(&version);
        let media = pack_dir.join("media");
        std::fs::create_dir_all(&media).unwrap();
        // RIFF headers are enough here: this path copies bytes, it never decodes.
        for unit in ["ja.lex.demo.obasan", "ja.lex.demo.konnichiwa"] {
            std::fs::write(media.join(format!("{unit}.wav")), b"RIFF0000WAVEfmt ").unwrap();
        }
        std::fs::write(
            pack_dir.join("media/manifest.jsonl"),
            "{\"id\":\"ja.lex.demo.obasan\",\"file\":\"media/ja.lex.demo.obasan.wav\",\"sha256\":\"0000000000000000000000000000000000000000000000000000000000000000\",\"bytes\":16,\"sample_rate\":22050,\"channels\":1,\"provenance\":\"model-output\",\"synthesizer\":{\"runtime\":\"sherpa-onnx-v1.13.8\",\"model\":\"kokoro-multi-lang-v1_1\",\"voice\":\"37\"},\"text\":\"おばさん\",\"generated\":\"2026-10-07\"}\n",
        )
        .unwrap();
        let declared = speech_audio_at(
            data,
            "org.openlanguage.ja-demo",
            "ja.lex.demo.obasan",
            "おばさん",
        )
        .expect("declared generated asset");
        assert_eq!(declared.source, "model-output");
        // An asset the manifest never mentions keeps the pre-manifest convention.
        let undeclared = speech_audio_at(
            data,
            "org.openlanguage.ja-demo",
            "ja.lex.demo.konnichiwa",
            "こんにちは",
        )
        .expect("curated asset");
        assert_eq!(undeclared.source, "licensed-recording");
    }

    /// ADR-0018: the environments come from the active pack, and unlock
    /// state follows derived capability — never activity volume (ADR-0002).
    /// The bundled reference pack declares `cafe-price-check` (recall-meaning
    /// `introduced` for two drink words plus comprehension-listening
    /// `introduced` for one sentence) and `cafe-order-drink` (a listening and
    /// a writing requirement at `supported`), so the first is reachable from
    /// a handful of events and the second is not.
    #[test]
    fn world_unlocks_follow_pack_declared_capabilities() {
        let tmp = tempfile::tempdir().unwrap();
        let data = tmp.path();
        install_bundled_pack(data, "org.openlanguage.ja-jp.reference").unwrap();
        let p = create_local_profile(data, "Hunter").unwrap();
        let store = lts_storage::Store::open(data.join("profiles.db")).unwrap();
        let version = lts_langpack::archive::current_version(
            "org.openlanguage.ja-jp.reference",
            &data.join("packs"),
        )
        .unwrap();
        store
            .set_active_pack(&p.id, "org.openlanguage.ja-jp.reference", &version)
            .unwrap();
        let menu = || {
            world_state_at(data, &p.id)
                .unwrap()
                .into_iter()
                .find(|e| e.id == "cafe-price-check")
        };

        // The pack's own ids and labels are what the app shows; the
        // app-authored demo environments are gone.
        let envs = world_state_at(data, &p.id).unwrap();
        assert!(!envs.is_empty(), "the reference pack declares environments");
        assert!(
            envs.iter()
                .all(|e| e.id != "cafe" && e.id != "greeting-desk"),
            "the engine must contribute no environment of its own: {:?}",
            envs.iter().map(|e| &e.id).collect::<Vec<_>>()
        );
        let fresh = menu().expect("cafe-price-check comes from the pack");
        assert!(!fresh.unlocked, "a new profile has earned nothing");
        assert_eq!(
            fresh.missing.len(),
            3,
            "every declared requirement is unmet: {:?}",
            fresh.missing
        );

        for (target, family, at, id) in [
            (
                "ja.lex.food-drink.kohi",
                "ja.expr.demo.food-a",
                "2026-10-02T10:00:00Z",
                "r1",
            ),
            (
                "ja.lex.food-drink.ocha",
                "ja.expr.demo.food-b",
                "2026-10-02T10:05:00Z",
                "r2",
            ),
        ] {
            let ev = attempt(
                target,
                lts_domain::ActivityModality::RecallMeaning,
                family,
                0,
                at,
                id,
                &p.id,
            );
            store.append_evidence(&ev).unwrap();
        }
        let half = menu().unwrap();
        assert!(
            !half.unlocked,
            "the listening requirement is still unmet, so the place stays shut"
        );
        assert_eq!(
            half.missing.len(),
            1,
            "the two recall requirements are met: {:?}",
            half.missing
        );
        assert!(
            half.missing[0].starts_with("ja.sent.check-price"),
            "the hint must name the missing content: {:?}",
            half.missing
        );

        let ev = attempt(
            "ja.sent.check-price",
            lts_domain::ActivityModality::ComprehensionListening,
            "ja.expr.demo.read-a",
            0,
            "2026-10-02T10:10:00Z",
            "rd1",
            &p.id,
        );
        store.append_evidence(&ev).unwrap();
        let unlocked = world_state_at(data, &p.id).unwrap();
        assert!(
            unlocked
                .iter()
                .find(|e| e.id == "cafe-price-check")
                .unwrap()
                .unlocked,
            "meeting the pack's requirements opens the place"
        );
        assert!(
            !unlocked
                .iter()
                .find(|e| e.id == "cafe-order-drink")
                .unwrap()
                .unlocked,
            "a different pack-declared place is not opened by this evidence"
        );

        // Activity volume changes nothing: 50 more events on other
        // content leave the unlock set identical (no streaks, ADR-0002).
        for i in 0..50 {
            let ev = attempt(
                "ja.lex.transport.kippu",
                lts_domain::ActivityModality::RecallMeaning,
                "ja.expr.demo.self-a",
                0,
                "2026-10-02T12:00:00Z",
                &format!("x{i}"),
                &p.id,
            );
            store.append_evidence(&ev).unwrap();
        }
        assert_eq!(world_state_at(data, &p.id).unwrap(), unlocked);
    }

    /// ADR-0018: a pack that declares no world collection gives the learner
    /// no places to go. That is a normal state, not an error, and the app
    /// must not fall back to anything.
    #[test]
    fn a_pack_without_environments_gives_an_empty_world() {
        let tmp = tempfile::tempdir().unwrap();
        let data = tmp.path();
        install_bundled_pack(data, "org.openlanguage.ja-demo").unwrap();
        let p = create_local_profile(data, "Test").unwrap();
        let store = lts_storage::Store::open(data.join("profiles.db")).unwrap();
        let version =
            lts_langpack::archive::current_version("org.openlanguage.ja-demo", &data.join("packs"))
                .unwrap();
        store
            .set_active_pack(&p.id, "org.openlanguage.ja-demo", &version)
            .unwrap();
        assert_eq!(world_state_at(data, &p.id).unwrap(), vec![]);
        // And a profile with no active pack at all resolves to nothing.
        let other = create_local_profile(data, "Nobody").unwrap();
        assert_eq!(world_state_at(data, &other.id).unwrap(), vec![]);
    }

    /// K-40: the goal map surfaces installed-pack goals (not unit
    /// counts) with prereq structure and per-dimension mastery derived
    /// from evidence only.
    #[test]
    fn goal_map_surfaces_pack_goals_with_prereqs_and_mastery() {
        let tmp = tempfile::tempdir().unwrap();
        let data = tmp.path();
        install_bundled_pack(data, "org.openlanguage.ja-jp.reference").unwrap();
        let p = create_local_profile(data, "Hunter").unwrap();
        finish_onboarding(data, &p.id, "org.openlanguage.ja-jp.reference", false).unwrap();
        let goals = goal_map_at(data, &p.id).unwrap();
        assert!(!goals.is_empty(), "installed pack surfaces goals");
        assert!(
            goals
                .iter()
                .all(|g| g.pack_id == "org.openlanguage.ja-jp.reference"),
            "view is pack-data-driven"
        );
        let kana = goals
            .iter()
            .find(|g| g.id == "ja.goal.onramp.kana-hiragana")
            .expect("on-ramp kana goal present");
        assert_eq!(kana.band.as_deref(), Some("on-ramp"));
        assert!(kana.assessed, "goal declares assessment ids");
        assert_eq!(kana.review_status.as_deref(), Some("draft"));
        assert!(
            kana.dimensions.iter().all(|d| d.state == "unseen"),
            "no evidence yet: every dimension starts unseen"
        );

        // Evidence on one required concept moves that dimension only.
        let store = lts_storage::Store::open(data.join("profiles.db")).unwrap();
        let ev = attempt(
            "ja.orth.hira.a",
            lts_domain::ActivityModality::ComprehensionReading,
            "ja.expr.goalmap.a-1",
            0,
            "2026-10-02T10:00:00Z",
            "g1",
            &p.id,
        );
        store.append_evidence(&ev).unwrap();
        let goals = goal_map_at(data, &p.id).unwrap();
        let kana = goals
            .iter()
            .find(|g| g.id == "ja.goal.onramp.kana-hiragana")
            .unwrap();
        let reading = kana
            .dimensions
            .iter()
            .find(|d| d.modality == "reading")
            .unwrap();
        assert_ne!(reading.state, "unseen", "derived mastery moves the row");
        assert_eq!(reading.exemplar.as_deref(), Some("ja.orth.hira.a"));
    }

    /// K-47: goal-map bands follow the proficiency ladder, not ASCII order.
    /// A plain string sort filed the pack's `on-ramp` band after `B2`
    /// (lowercase `o` sorts above uppercase `B`), putting the warm-up band at
    /// the bottom of the map.
    #[test]
    fn goal_map_orders_bands_by_ladder_not_ascii() {
        let tmp = tempfile::tempdir().unwrap();
        let data = tmp.path();
        install_bundled_pack(data, "org.openlanguage.ja-jp.reference").unwrap();
        let p = create_local_profile(data, "Hunter").unwrap();
        finish_onboarding(data, &p.id, "org.openlanguage.ja-jp.reference", false).unwrap();
        let goals = goal_map_at(data, &p.id).unwrap();
        let mut seen: Vec<Option<String>> = Vec::new();
        for g in &goals {
            if !seen.iter().any(|b| b == &g.band) {
                seen.push(g.band.clone());
            }
        }
        assert!(
            seen.len() >= 5,
            "the pack spans the ladder, so ordering is exercised: {seen:?}"
        );
        assert_eq!(
            seen.first().and_then(|b| b.as_deref()),
            Some("on-ramp"),
            "the warm-up band leads the map: {seen:?}"
        );
        for (a, b) in seen.iter().zip(seen.iter().skip(1)) {
            assert!(
                band_sort_key(a.as_deref()) <= band_sort_key(b.as_deref()),
                "bands must be non-decreasing by ladder rank: {seen:?}"
            );
        }
        let idx = |name: &str| {
            seen.iter()
                .position(|b| b.as_deref().is_some_and(|x| x.eq_ignore_ascii_case(name)))
                .unwrap_or_else(|| panic!("{name} band missing from {seen:?}"))
        };
        assert!(idx("on-ramp") < idx("A1"));
        assert!(idx("A1") < idx("A2"));
        assert!(idx("A2") < idx("B1"));
        assert!(idx("B1") < idx("B2"));
    }

    /// Bands outside the known ladder must still appear, just after it;
    /// a goal with no band at all goes last. Case must not matter.
    #[test]
    fn band_sort_key_places_unknown_and_missing_bands_after_the_ladder() {
        let mut keys = [
            band_sort_key(None),
            band_sort_key(Some("novice")),
            band_sort_key(Some("B2")),
            band_sort_key(Some("on-ramp")),
            band_sort_key(Some("a1")),
        ];
        keys.sort();
        let idx = |k| keys.iter().position(|x| *x == k).unwrap();
        assert!(idx(band_sort_key(Some("on-ramp"))) < idx(band_sort_key(Some("a1"))));
        assert!(idx(band_sort_key(Some("b2"))) < idx(band_sort_key(Some("novice"))));
        assert_eq!(idx(band_sort_key(None)), keys.len() - 1);
        assert_eq!(band_sort_key(Some("A1")), band_sort_key(Some("a1")));
    }

    /// K-40 acceptance: goal state derives from derived mastery and
    /// assessment evidence only — never activity counts, dates, or
    /// streaks (ADR-0002). 50 events on unrelated content leave the
    /// whole map byte-identical.
    #[test]
    fn goal_map_ignores_activity_volume() {
        let tmp = tempfile::tempdir().unwrap();
        let data = tmp.path();
        install_bundled_pack(data, "org.openlanguage.ja-jp.reference").unwrap();
        let p = create_local_profile(data, "Hunter").unwrap();
        finish_onboarding(data, &p.id, "org.openlanguage.ja-jp.reference", false).unwrap();
        let before = goal_map_at(data, &p.id).unwrap();
        let store = lts_storage::Store::open(data.join("profiles.db")).unwrap();
        for i in 0..50 {
            let ev = attempt(
                "ja.lex.demo.watashi",
                lts_domain::ActivityModality::RecallMeaning,
                "ja.expr.demo.self-a",
                0,
                "2026-10-02T12:00:00Z",
                &format!("v{i}"),
                &p.id,
            );
            store.append_evidence(&ev).unwrap();
        }
        let after = goal_map_at(data, &p.id).unwrap();
        assert_eq!(before.len(), after.len());
        for (b, a) in before.iter().zip(&after) {
            assert_eq!(b.id, a.id);
            assert_eq!(b.locked, a.locked);
            assert_eq!(b.dimensions, a.dimensions, "no drift from volume");
        }
    }

    /// K-43 acceptance: the claims panel derives entirely from the
    /// installed pack's own files — counts match the real ja-JP pack,
    /// review posture is reported as a distribution (never promoted),
    /// trust_state passes through untouched, and provenance entries
    /// surface as claims.
    #[test]
    fn pack_claims_report_installed_pack_data_without_upgrading_trust() {
        let tmp = tempfile::tempdir().unwrap();
        let data = tmp.path();
        install_bundled_pack(data, "org.openlanguage.ja-jp.reference").unwrap();
        let p = create_local_profile(data, "Hunter").unwrap();
        finish_onboarding(data, &p.id, "org.openlanguage.ja-jp.reference", false).unwrap();

        let claims = pack_claims_at(data).unwrap();
        assert_eq!(claims.len(), 1);
        let c = &claims[0];
        assert_eq!(c.pack_id, "org.openlanguage.ja-jp.reference");
        // The install gate recorded "community"; claims never promote it.
        assert_eq!(c.trust_state, "community");

        // Counts derive from the installed files: goals match the goal
        // map, assessments match the assessment definitions, and every
        // posture tally sums to its kind's count.
        let goals = goal_map_at(data, &p.id).unwrap();
        assert_eq!(c.counts.goals, goals.len());
        assert!(c.counts.assessments > 0);
        assert!(c.counts.lexicon > 0);
        assert!(c.counts.units > 0);
        for kind in ["goals", "assessments", "lexicon", "units"] {
            let total: usize = c
                .postures
                .iter()
                .filter(|r| r.kind == kind)
                .map(|r| r.count)
                .sum();
            let claimed = match kind {
                "goals" => c.counts.goals,
                "assessments" => c.counts.assessments,
                "lexicon" => c.counts.lexicon,
                _ => c.counts.units,
            };
            assert_eq!(total, claimed, "{kind} postures tally to the count");
        }
        // Draft-heavy pack: the honest posture is draft, not verified.
        let draft = c
            .postures
            .iter()
            .find(|r| r.kind == "lexicon" && r.posture == "draft")
            .unwrap();
        assert!(draft.count > 0);
        assert!(
            !c.postures
                .iter()
                .any(|r| r.kind == "lexicon" && r.posture == "verified"),
            "nothing in the reference pack is verified"
        );

        // Provenance surfaces as claims with license/access metadata.
        assert!(!c.provenance.is_empty());
        assert!(c.provenance.iter().any(|s| !s.title.is_empty()));
    }

    /// K-63: the claim report memoizes the content-derived tallies per pack
    /// root, but the store's `trust_state` is re-read every call. Flipping
    /// the installation record's trust state must surface immediately (the
    /// memo never freezes it), while the content tallies stay identical.
    #[test]
    fn the_claim_report_survives_a_trust_change_without_lying_about_it() {
        let tmp = tempfile::tempdir().unwrap();
        let data = tmp.path();
        install_bundled_pack(data, "org.openlanguage.ja-jp.reference").unwrap();

        let first = pack_claims_at(data).unwrap();
        assert_eq!(first.len(), 1);
        assert_eq!(first[0].trust_state, "community");
        let counts = first[0].counts.clone();
        let postures = serde_json::to_string(&first[0].postures).unwrap();
        assert!(counts.units > 0 && counts.lexicon > 0);

        // Rewrite the installation record's trust state in the store
        // (`record_installation` upserts on (pack_id, version)).
        let store = lts_storage::Store::open(data.join("profiles.db")).unwrap();
        let version = lts_langpack::archive::current_version(
            "org.openlanguage.ja-jp.reference",
            &data.join("packs"),
        )
        .unwrap();
        store
            .record_installation(&lts_storage::PackInstallation {
                pack_id: "org.openlanguage.ja-jp.reference".into(),
                version,
                installed_at: rfc3339_utc(now_secs()),
                trust_state: "verified".into(),
            })
            .unwrap();

        // The second call hits the memo: the content tallies are unchanged...
        let second = pack_claims_at(data).unwrap();
        assert_eq!(second.len(), 1);
        assert_eq!(second[0].counts.units, counts.units);
        assert_eq!(second[0].counts.goals, counts.goals);
        assert_eq!(second[0].counts.lexicon, counts.lexicon);
        assert_eq!(
            serde_json::to_string(&second[0].postures).unwrap(),
            postures,
            "the memo returns the same posture tallies"
        );
        // ...and the store's NEW trust state is reported, never the cached one.
        assert_eq!(second[0].trust_state, "verified");
    }

    /// K-46: device-tier classification follows the PERF-001 tier
    /// shape and recommends the largest model that fits comfortably;
    /// detection failure recommends nothing (honest abstention).
    #[test]
    fn device_tier_detection_recommends_by_measured_capacity() {
        let low = classify_device_tier(4, 8_000.0);
        assert_eq!(low.tier, "low");
        assert_eq!(
            low.recommended_model.as_deref(),
            Some("org.openlanguage.speech.whisper-ggml-tiny"),
            "8 GB cannot comfortably hold base"
        );
        let typical = classify_device_tier(8, 16_000.0);
        assert_eq!(typical.tier, "typical");
        assert_eq!(
            typical.recommended_model.as_deref(),
            Some("org.openlanguage.speech.whisper-ggml-base"),
            "16 GB fits base but not small"
        );
        let high = classify_device_tier(16, 32_000.0);
        assert_eq!(high.tier, "high");
        assert_eq!(
            high.recommended_model.as_deref(),
            Some("org.openlanguage.speech.whisper-ggml-small")
        );
        // A high-core machine with little RAM stays low and honest.
        let ram_poor = classify_device_tier(32, 8_000.0);
        assert_eq!(ram_poor.tier, "low");
        assert_eq!(
            ram_poor.recommended_model.as_deref(),
            Some("org.openlanguage.speech.whisper-ggml-tiny")
        );
        // Detection failure: abstain, never guess.
        let failed = classify_device_tier(0, 0.0);
        assert_eq!(failed.recommended_model, None);
        // The real machine measures something plausible (Linux path).
        let (cores, ram) = measure_device();
        assert!(cores > 0);
        assert!(ram > 0.0);
    }

    /// K-41: stress visibility is data-driven and user-toggleable.
    /// ja-JP data carries no U+0301 marks → auto stays off; ru-RU data
    /// carries them → auto turns on; explicit off wins; invalid modes
    /// fall back to auto.
    #[test]
    fn stress_display_settings_are_data_driven_and_persisted() {
        let tmp = tempfile::tempdir().unwrap();
        let data = tmp.path();
        install_bundled_pack(data, "org.openlanguage.ja-jp.reference").unwrap();
        {
            let (bytes, _sha) = lts_langpack::archive::build(
                &PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../../languages/ru-RU"),
            )
            .unwrap();
            lts_langpack::archive::install(&bytes, &data.join("packs")).unwrap();
        }
        let p = create_local_profile(data, "Hunter").unwrap();
        finish_onboarding(data, &p.id, "org.openlanguage.ja-jp.reference", false).unwrap();

        let s = display_settings_at(data, &p.id).unwrap();
        assert_eq!(s.stress_mode, "auto");
        assert!(!s.pack_has_stress, "ja-JP readings carry no stress marks");

        packs::switch_pack(data, &p.id, "org.openlanguage.ru-ru.reference").unwrap();
        let s = display_settings_at(data, &p.id).unwrap();
        assert!(s.pack_has_stress, "ru-RU readings carry U+0301 stress");

        let store = lts_storage::Store::open(data.join("profiles.db")).unwrap();
        store
            .set_setting(&p.id, "stress-mode", &serde_json::json!("off"))
            .unwrap();
        assert_eq!(
            display_settings_at(data, &p.id).unwrap().stress_mode,
            "off",
            "user toggle persists"
        );
        store
            .set_setting(&p.id, "stress-mode", &serde_json::json!("bogus"))
            .unwrap();
        assert_eq!(
            display_settings_at(data, &p.id).unwrap().stress_mode,
            "auto",
            "invalid stored values fall back to auto"
        );
    }

    /// SETTINGS-001: Settings-surface commands. The microphone decision
    /// round-trips (off when unset — opt-in); romaji-mode accepts exactly
    /// the reader's vocabulary (auto/always/off) and rejects anything
    /// else without writing.
    #[test]
    fn settings_microphone_and_romaji_round_trip() {
        let tmp = tempfile::tempdir().unwrap();
        let data = tmp.path();
        let p = create_local_profile(data, "Hunter").unwrap();

        assert!(
            !microphone_enabled_at(data, &p.id).unwrap(),
            "microphone is opt-in when unset"
        );
        assert!(set_microphone_enabled_at(data, &p.id, true).unwrap());
        assert!(
            microphone_enabled_at(data, &p.id).unwrap(),
            "microphone setting persists"
        );

        assert_eq!(romaji_mode_at(data, &p.id).unwrap(), "auto");
        assert_eq!(set_romaji_mode_at(data, &p.id, "off").unwrap(), "off");
        assert_eq!(romaji_mode_at(data, &p.id).unwrap(), "off");
        assert_eq!(set_romaji_mode_at(data, &p.id, "always").unwrap(), "always");
        assert!(set_romaji_mode_at(data, &p.id, "sometimes").is_err());
        assert!(set_romaji_mode_at(data, &p.id, "").is_err());
        assert_eq!(
            romaji_mode_at(data, &p.id).unwrap(),
            "always",
            "a rejected value never overwrites the stored one"
        );
        // K-64: the chosen microphone is a profile setting like the others.
        // No stored device means the system default, which is a decision, not
        // a missing value — clearing must survive the same way choosing does.
        assert_eq!(microphone_device_at(data, &p.id).unwrap(), None);
        assert_eq!(
            set_microphone_device_at(data, &p.id, Some("mic-headset".into()))
                .unwrap()
                .as_deref(),
            Some("mic-headset")
        );
        assert_eq!(
            microphone_device_at(data, &p.id).unwrap().as_deref(),
            Some("mic-headset"),
            "the chosen microphone persists across restarts"
        );
        assert_eq!(set_microphone_device_at(data, &p.id, None).unwrap(), None);
        assert_eq!(microphone_device_at(data, &p.id).unwrap(), None);
        assert!(microphone_device_at(data, "prof-does-not-exist").is_err());
        assert!(microphone_enabled_at(data, "prof-does-not-exist").is_err());
    }

    /// SETTINGS-001: the privacy notice promises export and delete, so
    /// both must exist. Export is versioned JSON naming the profile,
    /// excluding recording metadata by default; delete removes the
    /// profile, and a second delete errors rather than silently
    /// succeeding.
    #[test]
    fn profile_export_writes_bundle_and_delete_is_one_shot() {
        let tmp = tempfile::tempdir().unwrap();
        let data = tmp.path();
        install_bundled_pack(data, "org.openlanguage.ja-jp.reference").unwrap();
        let p = create_local_profile(data, "Hunter").unwrap();
        finish_onboarding(data, &p.id, "org.openlanguage.ja-jp.reference", true).unwrap();

        let path = profile_export_at(data, &p.id).unwrap();
        let json = std::fs::read_to_string(&path).unwrap();
        let bundle: serde_json::Value = serde_json::from_str(&json).unwrap();
        assert_eq!(bundle["format_version"], lts_storage::EXPORT_FORMAT_VERSION);
        assert_eq!(bundle["profile"]["id"], p.id);
        assert!(
            bundle.get("recordings").is_none(),
            "recordings stay out of the export by default"
        );

        profile_delete_at(data, &p.id).unwrap();
        assert!(list_profiles_at(data).unwrap().is_empty());
        assert!(
            profile_delete_at(data, &p.id).is_err(),
            "a second delete errors"
        );
        assert!(profile_export_at(data, &p.id).is_err());
    }

    /// Every install reports its stages; this test is about the install gate,
    /// so it drops them.
    fn drop_stage(_: &crate::progress::Progress) {}

    /// Community pack flow: a local .lpk import goes through the same
    /// install gate, is recorded as community trust, and the learning
    /// language can be switched to it; everything works offline.
    #[test]
    fn community_import_installs_and_switches_learning_language() {
        let tmp = tempfile::tempdir().unwrap();
        let data = tmp.path();
        let dir = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("../../../tests/fixtures/packs/ja-demo");
        let (bytes, _sha) = lts_langpack::archive::build(&dir).unwrap();
        use base64::Engine;
        let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
        let inst = packs::import_pack_b64_report(data, &b64, &mut drop_stage).unwrap();
        assert_eq!(inst.trust_state, "community");
        assert_eq!(inst.pack_id, "org.openlanguage.ja-demo");

        let p = create_local_profile(data, "Community").unwrap();
        packs::switch_pack(data, &p.id, "org.openlanguage.ja-demo").unwrap();
        assert_eq!(
            packs::active_pack(data, &p.id).unwrap(),
            vec!["org.openlanguage.ja-demo"]
        );
        // Offline: installed packs list without any network call.
        assert_eq!(packs::installed_packs(data).len(), 1);
        // A pack that was never installed cannot be switched to.
        assert!(packs::switch_pack(data, &p.id, "community.example.absent").is_err());
    }

    /// Preview first-run journey on the ORIGINAL eo-demo pack: select +
    /// install, complete activities, restart with progress retained,
    /// switch to another pack and back — all offline (tests never touch
    /// the network).
    #[test]
    fn preview_journey_select_activity_restart_switch_retain() {
        let tmp = tempfile::tempdir().unwrap();
        let data = tmp.path();
        install_bundled_pack(data, "org.openlanguage.eo-demo").unwrap();
        let p = create_local_profile(data, "Preview").unwrap();
        finish_onboarding(data, &p.id, "org.openlanguage.eo-demo", false).unwrap();
        assert_eq!(
            packs::active_pack(data, &p.id).unwrap(),
            vec!["org.openlanguage.eo-demo"]
        );

        // Complete activities: encounter + two recalls with distinct
        // prompt families (the same flow the UI drives).
        let store = lts_storage::Store::open(data.join("profiles.db")).unwrap();
        let eo_attempt = |target: &str, family: &str, id: &str| {
            lts_learner_model::AttemptDraft::new(
                vec![cid(target)],
                lts_domain::ActivityModality::RecallMeaning,
                cid("eo.activity.demo.recall-greet"),
                "org.openlanguage.eo-demo",
                "0.1.0",
            )
            .prompt_family(cid(family))
            .support(lts_domain::SupportLevel::new(0).unwrap(), vec![])
            .scored(lts_domain::Score::Correct)
            .finish(
                lts_domain::EventId::new(id),
                "2026-10-03T10:00:00Z",
                lts_domain::ProfileId::new(&p.id),
            )
        };
        for (i, (target, family)) in [
            ("eo.lex.demo.saluton", "eo.expr.demo.kiel-iras"),
            ("eo.lex.demo.saluton", "eo.expr.demo.bonan-tagon"),
        ]
        .iter()
        .enumerate()
        {
            store
                .append_evidence(&eo_attempt(target, family, &format!("eo{i}")))
                .unwrap();
        }

        // Restart: fresh store handle over the same files; progress and
        // the selected pack are retained.
        let store2 = lts_storage::Store::open(data.join("profiles.db")).unwrap();
        let derived = derive_pairs(&store2, &p.id, &rfc3339_utc(1_791_014_400)).unwrap();
        let saluton = derived
            .iter()
            .find(|d| d.content_id == "eo.lex.demo.saluton")
            .expect("eo evidence derives mastery");
        assert_eq!(saluton.state, lts_domain::MasteryState::Independent);
        assert_eq!(
            packs::active_pack(data, &p.id).unwrap(),
            vec!["org.openlanguage.eo-demo"]
        );

        // Switch to the other bundled pack and back; mastery is intact.
        install_bundled_pack(data, "org.openlanguage.ja-demo").unwrap();
        packs::switch_pack(data, &p.id, "org.openlanguage.ja-demo").unwrap();
        assert_eq!(
            packs::active_pack(data, &p.id).unwrap(),
            vec!["org.openlanguage.ja-demo"]
        );
        packs::switch_pack(data, &p.id, "org.openlanguage.eo-demo").unwrap();
        let derived2 = derive_pairs(&store2, &p.id, &rfc3339_utc(1_791_014_400)).unwrap();
        assert_eq!(
            derived2
                .iter()
                .find(|d| d.content_id == "eo.lex.demo.saluton")
                .unwrap()
                .state,
            lts_domain::MasteryState::Independent
        );
        // Both packs installed and listed offline.
        assert_eq!(packs::installed_packs(data).len(), 2);
    }

    #[test]
    fn new_profile_gets_first_lessons_and_runner_records_evidence() {
        let tmp = tempfile::tempdir().unwrap();
        let data = tmp.path();
        install_bundled_pack(data, "org.openlanguage.ja-demo").unwrap();
        let p = create_local_profile(data, "Hunter").unwrap();
        finish_onboarding(data, &p.id, "org.openlanguage.ja-demo", false).unwrap();

        // A brand-new profile must have something to learn: the
        // unseen-lexicon stream fills the session even though every
        // goal is gated behind prerequisites.
        let plan = build_plan(data, &p.id, 5, 1_762_128_000).unwrap();
        assert!(!plan.items.is_empty());
        assert!(
            plan.items
                .iter()
                .all(|i| i.reason == lts_scheduler::PlanReason::Progression)
        );

        // The view carries the actual word + gloss, not just ids.
        let view = build_plan_view(data, &p.id, 5, 1_762_128_000).unwrap();
        let first = view.items.first().unwrap();
        assert!(first.surface.is_some() && first.gloss.is_some());

        // Runner task: deterministic four-choice, correct gloss present.
        let t1 = practice_task_at(
            data,
            &p.id,
            "ja.lex.demo.konnichiwa",
            "recall-meaning",
            false,
        )
        .unwrap();
        let t2 = practice_task_at(
            data,
            &p.id,
            "ja.lex.demo.konnichiwa",
            "recall-meaning",
            false,
        )
        .unwrap();
        assert_eq!(t1.choices, t2.choices);
        assert_eq!(t1.choices.len(), 4);
        assert!(t1.choices.contains(&"hello".to_string()));
        assert_eq!(t1.surface.as_deref(), Some("こんにちは"));

        // Correct answer: scored evidence + a scheduler row appear.
        let idx = t1.choices.iter().position(|c| c == "hello").unwrap();
        let grade = practice_submit_at(
            data,
            &p.id,
            "ja.lex.demo.konnichiwa",
            "recall-meaning",
            idx,
            None,
            false,
        )
        .unwrap();
        assert!(grade.correct);
        let store = lts_storage::Store::open(data.join("profiles.db")).unwrap();
        assert!(
            store
                .evidence_for_profile(&p.id)
                .unwrap()
                .iter()
                .any(
                    |e| e.modality == lts_domain::ActivityModality::RecallMeaning
                        && e.outcome == lts_domain::Outcome::Scored
                )
        );
        assert!(
            store
                .scheduler_state(&p.id)
                .unwrap()
                .iter()
                .any(|r| r.item_id == "ja.lex.demo.konnichiwa#recall-meaning")
        );

        // Wrong choice grades incorrect (maps to a scheduler lapse).
        let wrong_idx = t1.choices.iter().position(|c| c != "hello").unwrap();
        let g2 = practice_submit_at(
            data,
            &p.id,
            "ja.lex.demo.konnichiwa",
            "recall-meaning",
            wrong_idx,
            None,
            false,
        )
        .unwrap();
        assert!(!g2.correct);

        // Modalities without a runner abstain honestly.
        assert!(
            practice_task_at(
                data,
                &p.id,
                "ja.lex.demo.konnichiwa",
                "production-writing",
                false
            )
            .is_err(),
        );
    }

    // K-66 (ADR-0020/0021): the guided first run. Everything below is
    // derived from pack data the pack itself declares — goal map band
    // order, unit file order, orthography teaching_order. Nothing pins
    // an app-side ordering of Japanese.
    #[test]
    fn a_fresh_ja_jp_plan_is_all_introductions_in_the_packs_goal_order() {
        let tmp = tempfile::tempdir().unwrap();
        let data = tmp.path();
        install_bundled_pack(data, "org.openlanguage.ja-jp.reference").unwrap();
        let p = create_local_profile(data, "Hunter").unwrap();
        finish_onboarding(data, &p.id, "org.openlanguage.ja-jp.reference", false).unwrap();
        let version = lts_langpack::archive::current_version(
            "org.openlanguage.ja-jp.reference",
            &data.join("packs"),
        )
        .unwrap();
        let root = data
            .join("packs")
            .join("org.openlanguage.ja-jp.reference")
            .join(&version);

        let view = build_plan_view(data, &p.id, 5, 1_762_128_000).unwrap();
        assert!(!view.items.is_empty(), "a fresh profile gets a first run");
        // Introduction items are not evidence (ADR-0020 consequences):
        // with nothing recorded, every plan item is one.
        assert!(view.items.iter().all(|i| i.kind == "introduction"));

        // ADR-0020 §1: the pack's goal map ranks the introduction half —
        // band ladder, then unit order, then content order. Ranked items
        // lead and stay in rank order; unranked items only ever tail.
        let ranks = goal_rank_map(&root, &[]);
        assert!(
            !ranks.is_empty(),
            "the reference pack ranks its early content"
        );
        let seen: Vec<Option<GoalRank>> = view
            .items
            .iter()
            .map(|i| ranks.get(&i.content_id).copied())
            .collect();
        if let Some(pos) = seen.iter().position(Option::is_none) {
            assert!(
                seen[pos..].iter().all(Option::is_none),
                "unranked items must tail the ranked ones, never interleave"
            );
        }
        let ranked: Vec<&GoalRank> = seen.iter().flatten().collect();
        assert!(
            ranked.windows(2).all(|w| w[0] <= w[1]),
            "ranked items stay in goal-map order"
        );

        // The first thing a learner sees belongs to the first unlocked
        // goal's own unit — the pack's file, read as data.
        let unit: serde_yaml::Value = serde_yaml::from_str(
            &std::fs::read_to_string(
                root.join("curriculum/units/010-kana-hiragana-vowels-ko.yaml"),
            )
            .unwrap(),
        )
        .unwrap();
        let refs: Vec<&str> = unit["activities"]
            .as_sequence()
            .unwrap()
            .iter()
            .flat_map(|a| a["content_refs"].as_sequence().unwrap().iter())
            .map(|v| v.as_str().unwrap())
            .collect();
        assert!(
            refs.contains(&view.items[0].content_id.as_str()),
            "the plan leads with the first unlocked goal's unit content"
        );
    }

    #[test]
    fn first_run_steps_lead_with_the_declared_script_in_its_teaching_order() {
        let tmp = tempfile::tempdir().unwrap();
        let data = tmp.path();
        install_bundled_pack(data, "org.openlanguage.ja-jp.reference").unwrap();
        let p = create_local_profile(data, "Hunter").unwrap();
        finish_onboarding(data, &p.id, "org.openlanguage.ja-jp.reference", false).unwrap();

        let steps = first_run_steps_at(data, &p.id).unwrap();
        // ADR-0020 §4: at most three steps, and ja-JP declares enough to fill them.
        assert!(!steps.is_empty() && steps.len() <= 3);
        let first = steps.first().unwrap();
        assert_eq!(first.kind, "introduction");
        // The declaration, not the engine: the unit that claims
        // `script-introduction` names its goal; the engine only follows.
        assert_eq!(
            first.goal_id.as_deref(),
            Some("ja.goal.onramp.kana-hiragana")
        );
        // And the pack's own teaching_order decides what is taught first.
        assert_eq!(first.content_id.as_deref(), Some("ja.orth.hira.a"));
        // Labels are pack display strings, never bare ids (ADR-0021 rule 4).
        assert!(!first.label.is_empty());
        assert_ne!(first.label.as_str(), first.content_id.as_deref().unwrap());
        // No content id repeats across the steps.
        let ids: Vec<&str> = steps
            .iter()
            .filter_map(|s| s.content_id.as_deref())
            .collect();
        let uniq: std::collections::HashSet<&str> = ids.iter().copied().collect();
        assert_eq!(ids.len(), uniq.len());
    }

    #[test]
    fn first_run_steps_make_no_script_claim_for_a_pack_without_the_declaration() {
        let tmp = tempfile::tempdir().unwrap();
        let data = tmp.path();
        install_bundled_pack(data, "org.openlanguage.ja-demo").unwrap();
        let p = create_local_profile(data, "Hunter").unwrap();
        finish_onboarding(data, &p.id, "org.openlanguage.ja-demo", false).unwrap();
        let steps = first_run_steps_at(data, &p.id).unwrap();
        // ja-demo declares no capability and no goal map: no step may
        // name a goal or claim an introduction order (ADR-0021 rule 4).
        for s in &steps {
            assert_eq!(s.goal_id, None);
        }
    }

    #[test]
    fn goal_rank_map_follows_the_band_ladder_and_asks_nothing_of_locked_or_unrunnable_content() {
        let tmp = tempfile::tempdir().unwrap();
        let root = tmp.path();
        std::fs::create_dir_all(root.join("curriculum/units")).unwrap();
        std::fs::write(
            root.join("curriculum/goals.yaml"),
            "goals:\n\
             - id: zz.goal.banded\n  band: a1\n  description: Later.\n  modalities: [reading]\n\
             - id: aa.goal.locked\n  band: on-ramp\n  description: Gated.\n  modalities: [reading]\n  prerequisites:\n  - target: ja.orth.hira.n\n    dimension: comprehension-reading\n    required_state: independent\n    strength: hard\n\
             - id: mm.goal.first\n  band: on-ramp\n  description: First.\n  modalities: [reading, speaking]\n",
        )
        .unwrap();
        std::fs::write(
            root.join("curriculum/units/001-locked.yaml"),
            "goal_id: aa.goal.locked\nactivities:\n- modality: reading\n  content_refs: [w1]\n",
        )
        .unwrap();
        std::fs::write(
            root.join("curriculum/units/002-first.yaml"),
            "goal_id: mm.goal.first\nactivities:\n- modality: reading\n  content_refs: [w2]\n- modality: speaking\n  content_refs: [w4]\n",
        )
        .unwrap();
        std::fs::write(
            root.join("curriculum/units/003-banded.yaml"),
            "goal_id: zz.goal.banded\nactivities:\n- modality: reading\n  content_refs: [w3]\n",
        )
        .unwrap();

        let ranks = goal_rank_map(root, &[]);
        // Band ladder first: the on-ramp goal (its lower-id sibling is
        // locked and contributes nothing) ranks before the a1 goal.
        let w2 = ranks.get("w2");
        let w3 = ranks.get("w3");
        assert!(
            w2.is_some() && w3.is_some(),
            "unlocked goals rank their content"
        );
        // Band ladder first: on-ramp content (whose lower-id sibling goal
        // is hard-locked and contributes nothing) outranks the a1 goal's.
        assert!(w2.unwrap() < w3.unwrap());
        // Content of a hard-locked goal is never ranked ahead.
        assert!(!ranks.contains_key("w1"));
        // Ranking is order, not runnability: content the pack schedules
        // only under a goal-vocabulary modality ("speaking") still holds
        // its place in the pack's content order.
        assert!(ranks.contains_key("w4"));

        // The reorder keeps every candidate and never invents one:
        // ranked first in rank order, unranked tail in old relative order.
        let mut prog = vec![
            lts_scheduler::ProgressionItem {
                content_id: "w9".into(),
                modality: lts_domain::ActivityModality::RecallMeaning,
            },
            lts_scheduler::ProgressionItem {
                content_id: "w3".into(),
                modality: lts_domain::ActivityModality::OrthographyRecognition,
            },
            lts_scheduler::ProgressionItem {
                content_id: "w8".into(),
                modality: lts_domain::ActivityModality::RecallMeaning,
            },
            lts_scheduler::ProgressionItem {
                content_id: "w2".into(),
                modality: lts_domain::ActivityModality::OrthographyRecognition,
            },
        ];
        order_progression_by_goal_map(&mut prog, &ranks);
        // Ranked first in rank order, unranked tail in its old relative
        // order, nothing dropped.
        let order: Vec<&str> = prog.iter().map(|i| i.content_id.as_str()).collect();
        assert_eq!(order, ["w2", "w3", "w9", "w8"]);
    }

    #[test]
    fn scenario_locks_until_prereqs_then_records_interaction_evidence() {
        let tmp = tempfile::tempdir().unwrap();
        let data = tmp.path();
        install_bundled_pack(data, "org.openlanguage.ja-demo").unwrap();
        let p = create_local_profile(data, "Hunter").unwrap();
        finish_onboarding(data, &p.id, "org.openlanguage.ja-demo", false).unwrap();
        let sessions = scenarios::SessionStore::default();
        let sid = "ja.scenario.demo.first-meeting";

        // Fresh profile: the scenario is listed but locked, with an
        // actionable reason naming the unmet prerequisite.
        let list = scenarios::list_at(data, &p.id).unwrap();
        let sc = list.iter().find(|s| s.scenario_id == sid).unwrap();
        assert!(!sc.unlocked);
        assert!(
            sc.locked_reason
                .as_deref()
                .unwrap()
                .contains("ja.lex.demo.konnichiwa")
        );
        assert!(scenarios::start_at(data, &p.id, sid, &sessions).is_err());

        // Meet the hard prerequisite: two independent successes
        // (support <= 1) across two prompt families.
        let store = lts_storage::Store::open(data.join("profiles.db")).unwrap();
        for (fam, id, at) in [
            (
                "ja.expr.demo.scen-p1",
                "ev-prereq-a",
                "2026-10-01T00:00:00Z",
            ),
            (
                "ja.expr.demo.scen-p2",
                "ev-prereq-b",
                "2026-10-01T00:05:00Z",
            ),
        ] {
            store
                .append_evidence(&attempt(
                    "ja.lex.demo.konnichiwa",
                    lts_domain::ActivityModality::RecallMeaning,
                    fam,
                    0,
                    at,
                    id,
                    &p.id,
                ))
                .unwrap();
        }
        let list = scenarios::list_at(data, &p.id).unwrap();
        assert!(list.iter().find(|s| s.scenario_id == sid).unwrap().unlocked);

        // Session flow: wrong intent offers pack-declared recovery;
        // recovery resolves back to the node; ladder support is recorded.
        let view = scenarios::start_at(data, &p.id, sid, &sessions).unwrap();
        assert_eq!(view.node.actions, ["greeting"]);
        let step = scenarios::attempt_at(data, &p.id, sid, "small-talk", &sessions).unwrap();
        assert_eq!(step.result, "not-satisfied");
        assert_eq!(step.recovery, vec!["ja.activity.demo.sc.repair-repeat"]);
        scenarios::recovery_at(
            data,
            &p.id,
            sid,
            "ja.activity.demo.sc.repair-repeat",
            &sessions,
        )
        .unwrap();
        let step =
            scenarios::attempt_at(data, &p.id, sid, "request-repetition", &sessions).unwrap();
        assert_eq!(step.result, "advanced");
        // Undeclared ladder levels are rejected; declared ones recorded.
        assert!(scenarios::support_at(data, &p.id, sid, 4, &sessions).is_err());
        scenarios::support_at(data, &p.id, sid, 3, &sessions).unwrap();
        let step = scenarios::attempt_at(data, &p.id, sid, "greeting", &sessions).unwrap();
        assert_eq!(step.result, "advanced");
        let step = scenarios::attempt_at(data, &p.id, sid, "name-question", &sessions).unwrap();
        assert_eq!(step.result, "completed");
        scenarios::transfer_at(
            data,
            &p.id,
            sid,
            "ja.scenario.demo.first-meeting.formal",
            &sessions,
        )
        .unwrap();
        let out = scenarios::finish_at(data, &p.id, sid, &sessions).unwrap();
        assert_eq!(out.nodes_completed, 2);
        assert!(out.transfer_requirement_met);

        // One scored interaction event per completed node, with the
        // support actually used at that node (3 at open, 0 at ask-name).
        let events = store.evidence_for_profile(&p.id).unwrap();
        let inter: Vec<_> = events
            .iter()
            .filter(|e| e.modality == lts_domain::ActivityModality::Interaction)
            .collect();
        assert_eq!(inter.len(), 2);
        assert!(inter.iter().any(|e| {
            e.targets
                .iter()
                .any(|t| t.as_str() == "ja.activity.demo.sc.open")
                && e.support_level.value() == 3
        }));
        assert!(inter.iter().any(|e| {
            e.targets
                .iter()
                .any(|t| t.as_str() == "ja.activity.demo.sc.ask-name")
                && e.support_level.value() == 0
        }));

        // The session is consumed by finish; further attempts error.
        assert!(scenarios::attempt_at(data, &p.id, sid, "greeting", &sessions).is_err());
    }

    #[test]
    fn listening_runner_hides_transcript_and_schedules_listening_row() {
        let tmp = tempfile::tempdir().unwrap();
        let data = tmp.path();
        install_bundled_pack(data, "org.openlanguage.ja-demo").unwrap();
        let p = create_local_profile(data, "Hunter").unwrap();
        finish_onboarding(data, &p.id, "org.openlanguage.ja-demo", false).unwrap();

        // A listening task never carries the transcript: a visible
        // surface would disqualify the evidence (MASTERY_POLICY).
        let t = practice_task_at(
            data,
            &p.id,
            "ja.lex.demo.konnichiwa",
            "comprehension-listening",
            false,
        )
        .unwrap();
        assert!(t.surface.is_none() && t.reading.is_none());
        assert_eq!(t.item_id, "ja.lex.demo.konnichiwa#comprehension-listening");
        assert_eq!(t.choices.len(), 4);

        // Grading records comprehension-listening evidence and its own
        // scheduler row (per-modality memory, docs/03 §7).
        let idx = t.choices.iter().position(|c| c == "hello").unwrap();
        let g = practice_submit_at(
            data,
            &p.id,
            "ja.lex.demo.konnichiwa",
            "comprehension-listening",
            idx,
            None,
            false,
        )
        .unwrap();
        assert!(g.correct);
        let store = lts_storage::Store::open(data.join("profiles.db")).unwrap();
        let events = store.evidence_for_profile(&p.id).unwrap();
        let listen = events
            .iter()
            .find(|e| e.modality == lts_domain::ActivityModality::ComprehensionListening)
            .expect("listening evidence recorded");
        assert_eq!(listen.activity_id.as_str(), "ja.lex.demo.konnichiwa");
        let rows = store.scheduler_state(&p.id).unwrap();
        assert!(
            rows.iter()
                .any(|r| r.item_id == "ja.lex.demo.konnichiwa#comprehension-listening")
        );

        // Audio resolves natively: licensed pack media wins; otherwise
        // local synthesis or an honest error — never a transcript.
        let a = listening_audio_at(data, &p.id, "ja.lex.demo.obasan").unwrap();
        assert_eq!(a.source, "licensed-recording");
        // Unknown items never reach the audio path. (Synthesis itself is
        // covered by speech_audio_prefers_licensed_media_then_synthesizes;
        // running two sherpa subprocesses concurrently flaps the box.)
        assert_eq!(
            listening_audio_at(data, &p.id, "ja.lex.demo.nonexistent").unwrap_err(),
            "unknown item"
        );

        // Modalities without a runner still abstain honestly.
        assert!(
            practice_task_at(
                data,
                &p.id,
                "ja.lex.demo.konnichiwa",
                "production-speaking",
                false
            )
            .is_err(),
        );
    }

    /// D2: the media a pack funds has to be practicable. A sentence with
    /// declared audio becomes a listening task — transcript hidden, meaning
    /// chosen against other sentence glosses — and the audio resolves
    /// natively. Without the audio the runner refuses rather than offering an
    /// activity that cannot be heard.
    #[test]
    fn sentence_listening_practises_declared_audio_without_the_transcript() {
        let tmp = tempfile::tempdir().unwrap();
        let data = tmp.path();
        install_bundled_pack(data, "org.openlanguage.ja-demo").unwrap();
        let p = create_local_profile(data, "Hunter").unwrap();
        finish_onboarding(data, &p.id, "org.openlanguage.ja-demo", false).unwrap();

        let task = practice_task_at(
            data,
            &p.id,
            "ja.sent.demo.obasan-aunt",
            "comprehension-listening",
            false,
        )
        .unwrap();
        assert_eq!(
            task.item_id,
            "ja.sent.demo.obasan-aunt#comprehension-listening"
        );
        // A visible transcript disqualifies evidence for this dimension.
        assert!(task.surface.is_none());
        assert!(task.reading.is_none());
        assert!(task.choices.iter().any(|c| c == "She is an aunt."));
        assert!(
            task.choices
                .iter()
                .filter(|c| *c != "She is an aunt.")
                .count()
                >= 2,
            "distractors come from other pack sentences"
        );

        let audio = listening_audio_at(data, &p.id, "ja.sent.demo.obasan-aunt").unwrap();
        assert_eq!(audio.source, "licensed-recording");

        // And a sentence the pack never recorded at all abstains. That is
        // the only shape "no audio" can take in a shipped product: an
        // installed version directory is immutable by contract (docs/07 —
        // the same contract every content cache keys on), so the old
        // delete-the-wav variant asserted a state the product cannot
        // reach. The never-declared sentence is the reachable one.
        assert_eq!(
            practice_task_at(
                data,
                &p.id,
                "ja.sent.demo.konnichiwa",
                "comprehension-listening",
                false,
            )
            .err(),
            Some("pack declares no audio for this sentence".to_string())
        );
    }

    /// D2: proposed new items put listening where the pack can actually play
    /// something, and never on a word that has no recording.
    #[test]
    fn proposed_listening_items_point_at_audio_the_pack_declares() {
        let tmp = tempfile::tempdir().unwrap();
        let data = tmp.path();
        install_bundled_pack(data, "org.openlanguage.ja-demo").unwrap();
        let p = create_local_profile(data, "Hunter").unwrap();
        finish_onboarding(data, &p.id, "org.openlanguage.ja-demo", false).unwrap();
        let store = lts_storage::Store::open(data.join("profiles.db")).unwrap();

        let mut progression = Vec::new();
        add_new_item_candidates(data, &store, &p.id, &[], &mut progression, &[]).unwrap();
        let listening: Vec<String> = progression
            .iter()
            .filter(|i| i.modality == lts_domain::ActivityModality::ComprehensionListening)
            .map(|i| i.content_id.clone())
            .collect();
        assert!(
            listening.iter().any(|c| c == "ja.sent.demo.obasan-aunt"),
            "audio-bearing sentences become listening items: {listening:?}"
        );
        assert!(
            listening.iter().all(|c| !c.starts_with("ja.lex.")),
            "words without declared audio are never proposed for listening: {listening:?}"
        );
    }

    /// D3: media ids resolve through the installed pack's manifest, so the
    /// filenames are pack data rather than an engine convention — and a
    /// manifest row can never point outside the pack's media directory.
    #[test]
    fn reference_audio_follows_the_manifest_and_refuses_traversal() {
        let tmp = tempfile::tempdir().unwrap();
        let data = tmp.path();
        install_bundled_pack(data, "org.openlanguage.ja-demo").unwrap();
        let version =
            lts_langpack::archive::current_version("org.openlanguage.ja-demo", &data.join("packs"))
                .unwrap();
        let media = data
            .join("packs")
            .join("org.openlanguage.ja-demo")
            .join(&version)
            .join("media");
        std::fs::rename(
            media.join("ja.contrast.demo.vowel-length-0.wav"),
            media.join("renamed-short.wav"),
        )
        .unwrap();
        std::fs::write(
            media.join("manifest.jsonl"),
            [
                "{\"id\":\"ja.contrast.demo.vowel-length-0\",\"file\":\"media/renamed-short.wav\"}",
                "{\"id\":\"ja.lex.demo.obasan\",\"file\":\"media/../../escaped.wav\"}",
            ]
            .join("\n"),
        )
        .unwrap();

        assert!(
            !reference_audio_at(
                data,
                "org.openlanguage.ja-demo",
                "ja.contrast.demo.vowel-length-0"
            )
            .unwrap()
            .is_empty()
        );
        // The hostile row is ignored; the id convention still answers for it.
        assert!(
            !reference_audio_at(data, "org.openlanguage.ja-demo", "ja.lex.demo.obasan")
                .unwrap()
                .is_empty()
        );
        assert!(!data.join("escaped.wav").exists());
    }
    #[test]
    fn discrimination_runner_records_phonological_dimension_evidence() {
        let tmp = tempfile::tempdir().unwrap();
        let data = tmp.path();
        install_bundled_pack(data, "org.openlanguage.ja-demo").unwrap();
        let p = create_local_profile(data, "Hunter").unwrap();
        finish_onboarding(data, &p.id, "org.openlanguage.ja-demo", false).unwrap();

        // The contrast set IS the answer space; the written target is
        // never visible while listening (surface hidden like listening).
        let t = practice_task_at(
            data,
            &p.id,
            "ja.contrast.demo.vowel-length",
            "phonological-discrimination",
            false,
        )
        .unwrap();
        assert!(t.surface.is_none() && t.reading.is_none());
        assert_eq!(
            t.item_id,
            "ja.contrast.demo.vowel-length#phonological-discrimination"
        );
        assert_eq!(t.choices.len(), 2);

        // Contrasts join the new-item stream for a fresh profile.
        let plan = build_plan_view(data, &p.id, 60, 1_760_000_000).unwrap();
        assert!(
            plan.items
                .iter()
                .any(|i| i.modality == "phonological-discrimination"
                    && i.content_id == "ja.contrast.demo.vowel-length")
        );

        // Audio: licensed media named `<id>-<item-index>.wav` wins, and
        // the played member is the same deterministic target the grader
        // uses (transcript never crosses IPC).
        let a = contrast_audio_at(data, &p.id, "ja.contrast.demo.vowel-length").unwrap();
        assert_eq!(a.source, "licensed-recording");
        let target = (fnv1a("ja.contrast.demo.vowel-length") % 2) as usize;

        let g = practice_submit_at(
            data,
            &p.id,
            "ja.contrast.demo.vowel-length",
            "phonological-discrimination",
            target,
            None,
            false,
        )
        .unwrap();
        assert!(g.correct);
        let store = lts_storage::Store::open(data.join("profiles.db")).unwrap();
        let events = store.evidence_for_profile(&p.id).unwrap();
        let disc = events
            .iter()
            .find(|e| e.modality == lts_domain::ActivityModality::PhonologicalDiscrimination)
            .expect("discrimination evidence recorded");
        // The contrast itself is the activity id: no language literals.
        assert_eq!(disc.activity_id.as_str(), "ja.contrast.demo.vowel-length");
        let rows = store.scheduler_state(&p.id).unwrap();
        assert!(
            rows.iter()
                .any(|r| r.item_id == "ja.contrast.demo.vowel-length#phonological-discrimination")
        );
    }

    #[test]
    fn shadowing_targets_come_from_pack_and_record_no_evidence() {
        let tmp = tempfile::tempdir().unwrap();
        let data = tmp.path();
        install_bundled_pack(data, "org.openlanguage.ja-demo").unwrap();
        let p = create_local_profile(data, "Hunter").unwrap();
        finish_onboarding(data, &p.id, "org.openlanguage.ja-demo", false).unwrap();

        // Shadowing targets are the pack lexicon — pack-data-driven,
        // no language literals in the engine.
        let items = shadowing_items_at(data, &p.id).unwrap();
        assert!(
            items
                .iter()
                .any(|i| i.content_id == "ja.lex.demo.konnichiwa")
        );

        // FORMATIVE ONLY: the shadowing path never writes evidence or
        // scheduler state (docs/05 — no calibrated scorer exists).
        let store = lts_storage::Store::open(data.join("profiles.db")).unwrap();
        assert!(store.evidence_for_profile(&p.id).unwrap().is_empty());
        assert!(store.scheduler_state(&p.id).unwrap().is_empty());
    }

    #[test]
    fn cloze_and_dictation_grade_typed_answers_on_correct_dimensions() {
        let tmp = tempfile::tempdir().unwrap();
        let data = tmp.path();
        install_bundled_pack(data, "org.openlanguage.ja-demo").unwrap();
        let p = create_local_profile(data, "Hunter").unwrap();
        finish_onboarding(data, &p.id, "org.openlanguage.ja-demo", false).unwrap();

        // Cloze: the declared target is blanked in the sentence and the
        // target string never appears in the task payload.
        let t = practice_task_at(
            data,
            &p.id,
            "ja.sent.demo.hajimemashite",
            "production-writing",
            false,
        )
        .unwrap();
        assert!(t.typed);
        let prompt = t.surface.clone().expect("cloze shows the sentence");
        assert!(prompt.contains("______"));
        assert!(!prompt.contains("はじめまして"), "target must stay hidden");
        assert_eq!(t.item_id, "ja.sent.demo.hajimemashite#production-writing");

        // Dictation: the written form is fully hidden (visible target =
        // disqualifying support for transcription grading).
        let d = practice_task_at(
            data,
            &p.id,
            "ja.sent.demo.obasan-aunt",
            "orthographic-encoding",
            false,
        )
        .unwrap();
        assert!(d.typed && d.surface.is_none());
        assert_eq!(d.item_id, "ja.sent.demo.obasan-aunt#orthographic-encoding");

        // Dictation audio: media-first, transcript never crosses IPC.
        let a = dictation_audio_at(data, &p.id, "ja.sent.demo.obasan-aunt").unwrap();
        assert_eq!(a.source, "licensed-recording");

        // Both join the new-item stream for a fresh profile.
        let plan = build_plan_view(data, &p.id, 60, 1_760_000_000).unwrap();
        assert!(
            plan.items.iter().any(|i| i.modality == "production-writing"
                && i.content_id == "ja.sent.demo.hajimemashite")
        );
        assert!(
            plan.items
                .iter()
                .any(|i| i.modality == "orthographic-encoding"
                    && i.content_id == "ja.sent.demo.obasan-aunt")
        );

        // Typed grading lands on the right dimensions: cloze on
        // production-writing, dictation on orthographic-encoding —
        // NEVER production-writing (MASTERY_POLICY disqualifying rule).
        let g = practice_submit_at(
            data,
            &p.id,
            "ja.sent.demo.hajimemashite",
            "production-writing",
            0,
            Some("はじめまして".to_string()),
            false,
        )
        .unwrap();
        assert!(g.correct);
        let g2 = practice_submit_at(
            data,
            &p.id,
            "ja.sent.demo.obasan-aunt",
            "orthographic-encoding",
            0,
            Some("おばさんです。".to_string()),
            false,
        )
        .unwrap();
        assert!(g2.correct);
        let g3 = practice_submit_at(
            data,
            &p.id,
            "ja.sent.demo.obasan-aunt",
            "orthographic-encoding",
            0,
            Some("おばあさん".to_string()),
            false,
        )
        .unwrap();
        assert!(!g3.correct, "near-miss transcription must not pass");

        let store = lts_storage::Store::open(data.join("profiles.db")).unwrap();
        let events = store.evidence_for_profile(&p.id).unwrap();
        let cloze = events
            .iter()
            .find(|e| e.modality == lts_domain::ActivityModality::ProductionWriting)
            .expect("cloze evidence on production-writing");
        assert_eq!(cloze.activity_id.as_str(), "ja.sent.demo.hajimemashite");
        let dict = events
            .iter()
            .find(|e| e.modality == lts_domain::ActivityModality::OrthographicEncoding)
            .expect("dictation evidence on orthographic-encoding");
        assert_eq!(dict.activity_id.as_str(), "ja.sent.demo.obasan-aunt");
        // Dictation never grants production-writing for this sentence.
        assert!(!events.iter().any(|e| {
            e.modality == lts_domain::ActivityModality::ProductionWriting
                && e.targets
                    .iter()
                    .any(|t| t.as_str() == "ja.sent.demo.obasan-aunt")
        }));
    }

    /// K-80 (W-12): the reader lookup used raw substring containment, so
    /// tapping こんにちは listed the ち ("intelligence") and に lexicon
    /// entries that merely sit inside it, and short surfaces matched at
    /// arbitrary offsets inside longer words. Span segmentation yields one
    /// entry per covered span, in sentence order, and NEVER lists an entry
    /// whose surface only lives inside a consumed span. Synthetic entries
    /// on purpose: behaviour fixtures, not linguistic claims about the
    /// shipped pack.
    #[test]
    fn story_lookup_returns_spans_not_substrings() {
        fn entry(id: &str, surface: &str) -> LexEntry {
            LexEntry {
                id: id.into(),
                surface: surface.into(),
                reading: None,
                romaji: None,
                gloss: id.into(),
                status: "draft".into(),
                kind: "word".into(),
                slots: Vec::new(),
            }
        }
        let lex = vec![
            entry("lex.hello", "こんにちは"),
            entry("lex.chi", "ち"),
            entry("lex.ni", "に"),
            entry("lex.kore", "これ"),
            entry("lex.ha", "は"),
            entry("lex.nandesu", "何です"),
        ];
        let ids = |text: &str| -> Vec<String> {
            sentence_word_spans(text, &lex)
                .into_iter()
                .map(|e| e.id.clone())
                .collect()
        };
        assert_eq!(ids("こんにちは。"), vec!["lex.hello"]);
        // Particles are listed only as their own spans, in sentence order;
        // the observed phantom lookups can no longer occur, because every
        // listed surface is a span the segmentation actually consumed.
        assert_eq!(ids("これは何ですか。"), vec!["lex.kore", "lex.ha", "lex.nandesu"]);
        // What the rule does when the PACK declares a longer,
        // morpheme-crossing surface: the longer surface wins its span by
        // construction (the engine keeps no language analysis to prefer
        // anything else), still exactly one entry per span. A junk surface
        // like this is pack-data lint — what segmentation guarantees is
        // that it appears at its real position once, and the smaller
        // surfaces inside it stop piling on.
        let mut phantom_lex = lex.clone();
        phantom_lex.push(entry("lex.phantom", "は何"));
        let got: Vec<String> = sentence_word_spans("これは何ですか。", &phantom_lex)
            .into_iter()
            .map(|e| e.id.clone())
            .collect();
        assert_eq!(got, vec!["lex.kore", "lex.phantom"]);
    }

    #[test]
    fn story_reader_shows_scaffolds_and_lookup_without_evidence() {
        let tmp = tempfile::tempdir().unwrap();
        let data = tmp.path();
        install_bundled_pack(data, "org.openlanguage.ja-demo").unwrap();
        let p = create_local_profile(data, "Hunter").unwrap();
        finish_onboarding(data, &p.id, "org.openlanguage.ja-demo", false).unwrap();

        let list = story_list_at(data, &p.id).unwrap();
        assert!(
            list.iter()
                .any(|s| s.id == "ja.story.demo.first-meeting" && s.sentence_count == 3)
        );

        let v = story_view_at(data, &p.id, "ja.story.demo.first-meeting").unwrap();
        assert_eq!(v.sentences.len(), 3);
        // Tap-to-lookup: lexicon surfaces occurring in the sentence.
        let obasan = v
            .sentences
            .iter()
            .find(|s| s.content_id == "ja.sent.demo.obasan-aunt")
            .unwrap();
        assert!(obasan.known.iter().any(|w| w.id == "ja.lex.demo.obasan"));

        // Per-sentence audio is media-first where a recording exists.
        let a = dictation_audio_at(data, &p.id, "ja.sent.demo.obasan-aunt").unwrap();
        assert_eq!(a.source, "licensed-recording");

        // FORMATIVE ONLY: reading records no evidence at all.
        let store = lts_storage::Store::open(data.join("profiles.db")).unwrap();
        assert!(store.evidence_for_profile(&p.id).unwrap().is_empty());
    }

    #[test]
    fn mined_words_schedule_without_touching_mastery_evidence() {
        let tmp = tempfile::tempdir().unwrap();
        let data = tmp.path();
        install_bundled_pack(data, "org.openlanguage.ja-demo").unwrap();
        let p = create_local_profile(data, "Hunter").unwrap();
        finish_onboarding(data, &p.id, "org.openlanguage.ja-demo", false).unwrap();

        let item = mine_add_at(
            data,
            &p.id,
            "ねこ".to_string(),
            None,
            Some("cat".to_string()),
            "ja.story.demo.first-meeting".to_string(),
        )
        .unwrap();
        assert!(item.id.starts_with("mine-"));
        assert!(item.was_new);
        assert_eq!(item.source_citation, "ja.story.demo.first-meeting");

        // An unscheduled word is not "due": the review path must not offer it.
        assert!(
            mine_due_at(data, &p.id).unwrap().is_empty(),
            "a mined word with no schedule is not review-due"
        );

        // Self-graded review schedules the mined item only.
        let due_at = mine_grade_at(data, &p.id, &item.id, false).unwrap();
        let listed = mine_list_at(data, &p.id).unwrap();
        assert_eq!(listed.len(), 1);
        assert!(listed[0].due_at.is_some());
        assert_eq!(listed[0].due_at.as_deref(), Some(due_at.as_str()));

        let store = lts_storage::Store::open(data.join("profiles.db")).unwrap();
        // NEVER mastery evidence, and no pack-content scheduler rows.
        assert!(store.evidence_for_profile(&p.id).unwrap().is_empty());
        let rows = store.scheduler_state(&p.id).unwrap();
        assert_eq!(rows.len(), 1);
        assert!(rows[0].item_id.starts_with("mine-"));
        assert!(
            mine_due_at(data, &p.id).unwrap().is_empty(),
            "a freshly graded word is scheduled ahead, not due now"
        );

        // Back-dating the schedule is what makes it due: the engine is the one
        // that decides, which is why the app calls `mine_due` instead of
        // comparing timestamps itself.
        store
            .save_scheduler_state(
                &p.id,
                &lts_storage::SchedulerRecord {
                    item_id: item.id.clone(),
                    scheduler: lts_scheduler::SPIKE_VERSION.to_string(),
                    params_json: rows[0].params_json.clone(),
                    due_at: "2026-10-01T00:00:00Z".to_string(),
                },
            )
            .unwrap();
        let due = mine_due_at(data, &p.id).unwrap();
        assert_eq!(due.len(), 1, "the back-dated word is now due");
        assert_eq!(due[0].id, item.id);
    }

    #[test]
    fn duplicate_mine_returns_the_original_id_instead_of_an_error() {
        // K-61: mining a surface that is already in My words used to hit
        // "UNIQUE constraint failed: mined_items.profile_id,
        // mined_items.surface" and show that raw sqlite text in the UI.
        let tmp = tempfile::tempdir().unwrap();
        let data = tmp.path();
        install_bundled_pack(data, "org.openlanguage.ja-demo").unwrap();
        let p = create_local_profile(data, "Hunter").unwrap();
        finish_onboarding(data, &p.id, "org.openlanguage.ja-demo", false).unwrap();

        let first = mine_add_at(
            data,
            &p.id,
            "ねこ".to_string(),
            None,
            Some("cat".to_string()),
            "ja.story.demo.first-meeting".to_string(),
        )
        .unwrap();
        assert!(first.was_new);

        // Grade it so the item has SRS history anchored to its id.
        let due_at = mine_grade_at(data, &p.id, &first.id, false).unwrap();

        let dup = mine_add_at(
            data,
            &p.id,
            "ねこ".to_string(),
            Some("ねこ".to_string()),
            Some("CAT".to_string()),
            "manual".to_string(),
        )
        .unwrap();
        assert!(!dup.was_new, "the learner is told, not silently re-created");
        assert_eq!(dup.id, first.id, "the original row survives");
        // The response describes what is stored, not what was sent.
        assert_eq!(dup.created_at, first.created_at);
        assert_eq!(dup.reading.as_deref(), Some("ねこ"));
        assert_eq!(dup.due_at.as_deref(), Some(due_at.as_str()));

        // Exactly one word, and its schedule still hangs off the original id.
        let listed = mine_list_at(data, &p.id).unwrap();
        assert_eq!(listed.len(), 1);
        assert_eq!(listed[0].id, first.id);
        let store = lts_storage::Store::open(data.join("profiles.db")).unwrap();
        let rows = store.scheduler_state(&p.id).unwrap();
        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0].item_id, first.id);
    }
    #[test]
    fn reader_fades_scaffolds_and_reveals_record_support() {
        let tmp = tempfile::tempdir().unwrap();
        let data = tmp.path();
        install_bundled_pack(data, "org.openlanguage.ja-demo").unwrap();
        let p = create_local_profile(data, "Hunter").unwrap();
        finish_onboarding(data, &p.id, "org.openlanguage.ja-demo", false).unwrap();

        // Kanji item, no reading history: furigana and romaji visible
        // as on-ramp scaffolds (READ-001 auto rules).
        let t =
            practice_task_at(data, &p.id, "ja.lex.demo.watashi", "recall-meaning", false).unwrap();
        assert_eq!(t.furigana.as_deref(), Some("わたし"));
        assert_eq!(t.romaji.as_deref(), Some("watashi"));
        assert!(!t.faded_by_mastery);
        // Reveal against already-auto scaffolds adds no support.
        let idx = t
            .choices
            .iter()
            .position(|c| c == "I (neutral polite first person)")
            .unwrap();
        let g = practice_submit_at(
            data,
            &p.id,
            "ja.lex.demo.watashi",
            "recall-meaning",
            idx,
            None,
            true,
        )
        .unwrap();
        assert!(g.correct);

        // Reading mastery at `supported` hides furigana automatically.
        let store = lts_storage::Store::open(data.join("profiles.db")).unwrap();
        for (fam, id, at) in [
            ("ja.expr.demo.read-p1", "ev-read-a", "2026-10-01T00:00:00Z"),
            ("ja.expr.demo.read-p2", "ev-read-b", "2026-10-01T00:05:00Z"),
        ] {
            store
                .append_evidence(&attempt(
                    "ja.lex.demo.watashi",
                    lts_domain::ActivityModality::ComprehensionReading,
                    fam,
                    0,
                    at,
                    id,
                    &p.id,
                ))
                .unwrap();
        }
        let t2 =
            practice_task_at(data, &p.id, "ja.lex.demo.watashi", "recall-meaning", false).unwrap();
        assert!(t2.furigana.is_none(), "furigana must fade at supported");
        assert!(t2.faded_by_mastery);

        // Revealing against the fade rule is recorded as support.
        let g2 = practice_submit_at(
            data,
            &p.id,
            "ja.lex.demo.watashi",
            "recall-meaning",
            idx,
            None,
            true,
        )
        .unwrap();
        assert!(g2.correct);
        let events = store.evidence_for_profile(&p.id).unwrap();
        let recall = |ev: &lts_domain::EvidenceEvent| {
            ev.modality == lts_domain::ActivityModality::RecallMeaning
                && ev
                    .targets
                    .iter()
                    .any(|t| t.as_str() == "ja.lex.demo.watashi")
        };
        // The reveal submit recorded support 3 with the concrete action.
        assert!(
            events.iter().any(|ev| {
                recall(ev)
                    && ev.support_level.value() == 3
                    && ev.support_actions.iter().any(|a| a == "supplied-reading")
            }),
            "reveal recorded as support: {:?}",
            events
                .iter()
                .filter(|e| recall(e))
                .map(|e| (&e.support_actions, e.support_level.value()))
                .collect::<Vec<_>>()
        );
        // The first submit (reveal against already-auto scaffolds) stayed
        // unscored-support: revealing what is already shown is not a crutch.
        assert!(
            events.iter().any(|ev| recall(ev)
                && ev.support_level.value() == 0
                && ev.support_actions.is_empty()),
            "auto scaffold reveal is not support"
        );

        // Kana literacy (set once kana is learned) fades kana romaji.
        store
            .set_setting(&p.id, "kana-literacy-established", &serde_json::json!(true))
            .unwrap();
        let t3 = practice_task_at(
            data,
            &p.id,
            "ja.lex.demo.konnichiwa",
            "recall-meaning",
            false,
        )
        .unwrap();
        assert!(t3.romaji.is_none(), "kana romaji fades with literacy");
    }

    #[test]
    fn orth_recognition_runner_records_evidence_and_establishes_kana_literacy() {
        let tmp = tempfile::tempdir().unwrap();
        let data = tmp.path();
        install_bundled_pack(data, "org.openlanguage.ja-demo").unwrap();
        let p = create_local_profile(data, "Hunter").unwrap();
        finish_onboarding(data, &p.id, "org.openlanguage.ja-demo", false).unwrap();

        // New profiles see script-instruction items in the plan.
        let view = build_plan_view(data, &p.id, 10, 1_760_000_000).unwrap();
        assert!(
            view.items
                .iter()
                .any(|i| i.modality == "orthography-recognition"
                    && i.content_id.starts_with("ja.orth.hira.")),
            "orth units join the new-item stream"
        );

        // A deterministic symbol<->reading choice task builds and grades.
        let t = practice_task_at(
            data,
            &p.id,
            "ja.orth.hira.a",
            "orthography-recognition",
            false,
        )
        .unwrap();
        assert_eq!(t.item_id, "ja.orth.hira.a#orthography-recognition");
        assert_eq!(t.choices.len(), 4);
        let idx = t
            .choices
            .iter()
            .position(|c| c == "a" || c == "あ")
            .unwrap();
        let g = practice_submit_at(
            data,
            &p.id,
            "ja.orth.hira.a",
            "orthography-recognition",
            idx,
            None,
            false,
        )
        .unwrap();
        assert!(g.correct);
        let store = lts_storage::Store::open(data.join("profiles.db")).unwrap();
        let events = store.evidence_for_profile(&p.id).unwrap();
        let ev = events
            .iter()
            .find(|e| {
                e.modality == lts_domain::ActivityModality::OrthographyRecognition
                    && e.targets.iter().any(|t| t.as_str() == "ja.orth.hira.a")
            })
            .expect("orthography evidence recorded");
        // The unit itself is the activity id: no language literals.
        assert_eq!(ev.activity_id.as_str(), "ja.orth.hira.a");
        let rows = store.scheduler_state(&p.id).unwrap();
        assert!(
            rows.iter()
                .any(|r| r.item_id == "ja.orth.hira.a#orthography-recognition")
        );

        // Drive every kana unit the pack teaches to `supported`
        // (two successes, distinct prompt families); the roll-up fires
        // on the next orth submit.
        let orth = orth_entries(data, "org.openlanguage.ja-demo", "0.1.0").unwrap();
        assert_eq!(orth.len(), 16, "ja-demo ships 16 kana units");
        for (i, e) in orth.iter().enumerate() {
            for (j, fam) in ["ja.expr.demo.kana-p1", "ja.expr.demo.kana-p2"]
                .iter()
                .enumerate()
            {
                store
                    .append_evidence(&attempt(
                        &e.id,
                        lts_domain::ActivityModality::OrthographyRecognition,
                        fam,
                        0,
                        &format!("2026-10-0{}T00:0{}:00Z", (i % 9) + 1, j),
                        &format!("ev-kana-{i}-{j}"),
                        &p.id,
                    ))
                    .unwrap();
            }
        }
        assert!(
            !store
                .get_setting(&p.id, "kana-literacy-established")
                .unwrap()
                .map(|v| v.as_bool().unwrap_or(false))
                .unwrap_or(false),
            "roll-up only fires from a submit"
        );
        practice_submit_at(
            data,
            &p.id,
            "ja.orth.hira.ko",
            "orthography-recognition",
            0,
            None,
            false,
        )
        .unwrap();
        assert_eq!(
            store
                .get_setting(&p.id, "kana-literacy-established")
                .unwrap()
                .and_then(|v| v.as_bool()),
            Some(true),
            "all kana supported establishes literacy"
        );
    }

    #[test]
    fn list_and_resume_profiles_round_trip() {
        let tmp = tempfile::tempdir().unwrap();
        let data = tmp.path();
        let a = create_local_profile(data, "Hunter").unwrap();
        let b = create_local_profile(data, "Aiko").unwrap();

        let listed = list_profiles_at(data).unwrap();
        assert!(
            listed
                .iter()
                .any(|p| p.id == a.id && p.display_name == "Hunter")
        );
        assert!(
            listed
                .iter()
                .any(|p| p.id == b.id && p.display_name == "Aiko")
        );

        let resumed = resume_profile_at(data, &b.id).unwrap();
        assert_eq!(resumed.id, b.id);
        assert_eq!(resumed.display_name, "Aiko");
        assert_eq!(
            resume_profile_at(data, "nope").unwrap_err(),
            "unknown profile",
            "unknown profile never resumes"
        );
    }

    #[test]
    fn placement_records_diagnostic_evidence_and_unlocks() {
        let tmp = tempfile::tempdir().unwrap();
        let data = tmp.path();
        install_bundled_pack(data, "org.openlanguage.ja-demo").unwrap();
        let p = create_local_profile(data, "Hunter").unwrap();
        finish_onboarding(data, &p.id, "org.openlanguage.ja-demo", false).unwrap();

        // One low-stakes task per pack assessment, built from the
        // assessment's goal unit content.
        let plan = placement_plan_at(data, &p.id).unwrap();
        assert_eq!(plan.len(), 2, "both ja-demo assessments plan tasks");
        let greet = plan
            .iter()
            .find(|i| i.assessment_id == "ja.assess.demo.greet")
            .unwrap();
        assert_eq!(greet.content_id, "ja.lex.demo.konnichiwa");
        assert_eq!(greet.modality, "recall-meaning");

        // The greet goal's hard prereq (konnichiwa recall-meaning
        // independent) gates progression before any diagnosis.
        let store = lts_storage::Store::open(data.join("profiles.db")).unwrap();
        let derived = derive_pairs(&store, &p.id, &rfc3339_utc(1_760_000_000)).unwrap();
        assert!(
            !progression_items(data, &store, &p.id, &derived)
                .unwrap()
                .iter()
                .any(|i| i.content_id == "ja.grammar.demo.greetings"),
            "greet goal locked before diagnosis"
        );

        // Two correct support-0 diagnostic answers reach `independent`
        // through the normal derivation path (policy fixture
        // known-diagnostic-reaches-independent).
        for _ in 0..2 {
            let (t, correct_choice, _) =
                practice_build(data, &p.id, &greet.content_id, &greet.modality, false).unwrap();
            let idx = t.choices.iter().position(|c| *c == correct_choice).unwrap();
            let g = practice_submit_inner(
                data,
                &p.id,
                &greet.content_id,
                &greet.modality,
                idx,
                SubmitOpts {
                    answer: None,
                    reveal_reading: false,
                    diagnostic: Some(&greet.assessment_id),
                },
            )
            .unwrap();
            assert!(g.correct);
        }

        // Evidence is tagged Diagnostic and attributed to the assessment.
        let events = store.evidence_for_profile(&p.id).unwrap();
        let diags: Vec<_> = events
            .iter()
            .filter(|e| {
                e.assessment_kind == Some(lts_domain::AssessmentKind::Diagnostic)
                    && e.targets
                        .iter()
                        .any(|t| t.as_str() == "ja.lex.demo.konnichiwa")
            })
            .collect();
        assert_eq!(diags.len(), 2, "both attempts recorded as diagnostic");
        assert!(
            diags
                .iter()
                .all(|e| e.activity_id.as_str() == "ja.assess.demo.greet")
        );

        // Known foundation unlocked: state rose and the gated goal now
        // enters the progression stream.
        let derived = derive_pairs(&store, &p.id, &rfc3339_utc(1_760_000_000)).unwrap();
        assert_eq!(
            derived
                .iter()
                .find(|d| d.content_id == "ja.lex.demo.konnichiwa"
                    && d.dimension == lts_domain::ActivityModality::RecallMeaning)
                .unwrap()
                .state,
            lts_domain::MasteryState::Independent,
            "diagnostic unlocks known foundations"
        );
        assert!(
            progression_items(data, &store, &p.id, &derived)
                .unwrap()
                .iter()
                .any(|i| i.content_id == "ja.grammar.demo.greetings"),
            "greet goal unlocks after diagnosis"
        );
    }

    #[test]
    fn kanji_drill_uses_existing_dimensions_and_srs_gates_resurfacing() {
        let tmp = tempfile::tempdir().unwrap();
        let data = tmp.path();
        install_bundled_pack(data, "org.openlanguage.ja-demo").unwrap();
        let p = create_local_profile(data, "Hunter").unwrap();
        finish_onboarding(data, &p.id, "org.openlanguage.ja-demo", false).unwrap();

        // Pack-declared characters join the new-item stream for both
        // drills (meaning + reading).
        let store = lts_storage::Store::open(data.join("profiles.db")).unwrap();
        let derived = derive_pairs(&store, &p.id, &rfc3339_utc(1_760_000_000)).unwrap();
        let mut candidates = Vec::new();
        add_new_item_candidates(data, &store, &p.id, &derived, &mut candidates, &[]).unwrap();
        assert!(
            candidates
                .iter()
                .any(|i| i.content_id.starts_with("ja.kanji.demo.")),
            "kanji items join the new-item stream"
        );

        // Meaning drill: character -> meaning choices.
        let (t, correct, _) =
            practice_build(data, &p.id, "ja.kanji.demo.hito", "recall-meaning", false).unwrap();
        assert_eq!(t.surface.as_deref(), Some("人"));
        assert_eq!(correct, "person");
        let idx = t.choices.iter().position(|c| c == "person").unwrap();
        let g = practice_submit_at(
            data,
            &p.id,
            "ja.kanji.demo.hito",
            "recall-meaning",
            idx,
            None,
            false,
        )
        .unwrap();
        assert!(g.correct);

        // Reading drill: character -> reading choices.
        let (t2, correct2, _) = practice_build(
            data,
            &p.id,
            "ja.kanji.demo.hito",
            "orthography-recognition",
            false,
        )
        .unwrap();
        assert_eq!(t2.surface.as_deref(), Some("人"));
        assert_eq!(correct2, "hito");
        let idx2 = t2.choices.iter().position(|c| c == "hito").unwrap();
        let g2 = practice_submit_at(
            data,
            &p.id,
            "ja.kanji.demo.hito",
            "orthography-recognition",
            idx2,
            None,
            false,
        )
        .unwrap();
        assert!(g2.correct);

        // Evidence lands on the two EXISTING dimensions only.
        let store = lts_storage::Store::open(data.join("profiles.db")).unwrap();
        let events = store.evidence_for_profile(&p.id).unwrap();
        for dim in [
            lts_domain::ActivityModality::RecallMeaning,
            lts_domain::ActivityModality::OrthographyRecognition,
        ] {
            assert!(
                events.iter().any(|e| {
                    e.modality == dim
                        && e.targets.iter().any(|t| t.as_str() == "ja.kanji.demo.hito")
                }),
                "kanji drill evidence on {dim:?}"
            );
        }
        // Kanji reading recognition must NOT establish kana literacy:
        // the roll-up only counts the pack's kana chart units.
        assert_ne!(
            store
                .get_setting(&p.id, "kana-literacy-established")
                .unwrap()
                .and_then(|v| v.as_bool()),
            Some(true),
            "kanji drills do not establish kana literacy"
        );

        // SRS gating: drilled drills now carry due dates; the mnemonic
        // and its review status surface for the UI.
        let cards = kanji_list_at(data, &p.id).unwrap();
        let hito = cards.iter().find(|c| c.id == "ja.kanji.demo.hito").unwrap();
        assert!(hito.meaning_due.is_some() && hito.reading_due.is_some());
        let yasu = cards.iter().find(|c| c.id == "ja.kanji.demo.yasu").unwrap();
        assert!(
            yasu.meaning_due.is_none() && yasu.reading_due.is_none(),
            "undrilled characters have no due rows"
        );
        assert_eq!(yasu.status, "review-needed");
        assert!(yasu.mnemonic.is_some(), "mnemonic surfaces for the UI");
    }

    #[test]
    fn the_blank_window_workaround_forces_the_fallback_renderer_only_when_unset() {
        // The failure is launch-path-dependent unless the binary opts out
        // itself: the helper scripts exported the switch, `cargo tauri dev`
        // and the bare binary did not, and those opened a blank window.
        assert_eq!(webkit_dmabuf_fallback(None), Some("1"));
        assert_eq!(
            webkit_dmabuf_fallback(Some(std::ffi::OsStr::new("0"))),
            None,
            "an explicit operator value is never clobbered"
        );
        assert_eq!(
            webkit_dmabuf_fallback(Some(std::ffi::OsStr::new("1"))),
            None,
            "an already-exported opt-out stays as the operator set it"
        );
    }

    /// K-63-follow: the lexicon parse is shared per version *root*, so a second
    /// version of the same pack must never be answered with the rows memorised
    /// for the first. That key is the whole safety of the cache, and a
    /// single-version test cannot see it being wrong.
    #[test]
    fn a_new_lexicon_version_is_never_answered_with_the_old_versions_rows() {
        let tmp = tempfile::tempdir().unwrap();
        let data = tmp.path();
        let fixture =
            PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../../tests/fixtures/packs/ja-demo");
        let id = "org.openlanguage.ja-demo";
        let v1 = data.join("packs").join(id).join("0.1.0");
        let v2 = data.join("packs").join(id).join("0.2.0");
        copy_tree(&fixture, &v1);
        copy_tree(&fixture, &v2);
        // Same pack id, different bytes: this version's lexicon has twice the
        // rows, so an answer carried over from the other version is visible.
        let rows = v2.join("lexicon/entries.jsonl");
        let original = std::fs::read_to_string(&rows).unwrap();
        std::fs::write(&rows, format!("{original}{original}")).unwrap();

        let first = lexicon_entries(data, id, "0.1.0").expect("first version parses");
        let second = lexicon_entries(data, id, "0.2.0").expect("second version parses");
        assert!(
            !first.is_empty() && second.len() > first.len(),
            "a different version directory must be parsed on its own: {} vs {}",
            first.len(),
            second.len()
        );
        let ids = |rows: &Vec<LexEntry>| {
            rows.iter()
                .map(|e| e.id.clone())
                .collect::<Vec<std::string::String>>()
        };
        assert_eq!(
            ids(&first),
            ids(&lexicon_entries(data, id, "0.1.0").unwrap()),
            "the same version must keep answering with its own rows"
        );
    }

    /// K-63-follow: installing a pack through the production path also warms
    /// its content caches, so the first click after an install is not the
    /// slowest thing the learner does — measured as 460 ms cold against 81 ms
    /// warm for the Languages tab, the whole difference being one parse.
    #[test]
    fn installing_a_pack_warms_its_content_for_the_first_visit() {
        let tmp = tempfile::tempdir().unwrap();
        let data = tmp.path();
        install_bundled_pack(data, "org.openlanguage.ja-jp.reference")
            .expect("reference pack installs");
        let id = "org.openlanguage.ja-jp.reference";
        let version = lts_langpack::archive::current_version(id, &data.join("packs"))
            .expect("the install records a current version");
        let root = data.join("packs").join(id).join(&version);
        assert!(
            LEXICON_CACHE
                .lock()
                .unwrap_or_else(|e| e.into_inner())
                .contains_key(&root),
            "an install must leave the lexicon parsed, not re-read on first use"
        );
        assert!(
            CLAIM_CACHE
                .lock()
                .unwrap_or_else(|e| e.into_inner())
                .contains_key(&root),
            "an install must leave the claim tallies computed, not recomputed \
             on the first Languages visit"
        );
    }

    fn copy_tree(from: &Path, to: &Path) {
        std::fs::create_dir_all(to).unwrap();
        let mut stack = vec![from.to_path_buf()];
        while let Some(dir) = stack.pop() {
            for e in std::fs::read_dir(&dir).unwrap().flatten() {
                let p = e.path();
                let dest = to.join(p.strip_prefix(from).unwrap());
                if p.is_dir() {
                    std::fs::create_dir_all(&dest).unwrap();
                    stack.push(p);
                } else {
                    std::fs::copy(&p, &dest).unwrap();
                }
            }
        }
    }

    /// Install the reference pack with extra pack files joined **before** the
    /// install — the only way pack content can really arrive, since an installed
    /// version directory is immutable by contract (docs/07) and every content
    /// cache in the app keys on that fact. Returns the installed version.
    fn install_reference_pack_with(data: &Path, extra: &[(&str, &str)]) -> String {
        fn drop_stage(_: &crate::progress::Progress) {}
        let src = tempfile::tempdir().unwrap();
        copy_tree(&reference_source(), src.path());
        for (rel, body) in extra {
            let path = src.path().join(rel);
            if let Some(parent) = path.parent() {
                std::fs::create_dir_all(parent).unwrap();
            }
            std::fs::write(&path, body).unwrap();
        }
        let (bytes, _sha) =
            lts_langpack::archive::build(src.path()).expect("the extended source packs");
        packs::install_pack_bytes_report(data, &bytes, None, drop_stage)
            .expect("the extended pack installs through the production path");
        lts_langpack::archive::current_version(
            "org.openlanguage.ja-jp.reference",
            &data.join("packs"),
        )
        .expect("the install records a current version")
    }

    /// The reference pack's source tree, for reading base counts out of.
    fn reference_source() -> PathBuf {
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../../languages/ja-JP")
    }

    /// The caches are only ever correct while a version directory is immutable,
    /// and only safe while a different version is a different key. That is the
    /// invariant every content cache here rests on, so it is checked.
    #[test]
    fn a_unit_parse_is_shared_per_version_root_and_never_across_roots() {
        let tmp = tempfile::tempdir().unwrap();
        let fixture =
            Path::new(env!("CARGO_MANIFEST_DIR")).join("../../../tests/fixtures/packs/ja-demo");
        let v1 = tmp.path().join("org.openlanguage.ja-demo/0.1.0");
        let v2 = tmp.path().join("org.openlanguage.ja-demo/0.2.0");
        copy_tree(&fixture, &v1);
        copy_tree(&fixture, &v2);

        let units = pack_units(&v1);
        assert!(!units.is_empty(), "the fixture declares units to parse");
        assert!(
            std::sync::Arc::ptr_eq(&units, &pack_units(&v1)),
            "the same immutable root must share one parse"
        );
        assert!(
            !std::sync::Arc::ptr_eq(&units, &pack_units(&v2)),
            "a different version root must never reuse another version's parse"
        );
    }

    /// Writing targets depend only on the pack, so the parse is shared per
    /// immutable version root and never reused across roots; a pack that will
    /// not parse is never cached.
    #[test]
    fn writing_targets_are_parsed_once_per_version_root() {
        let tmp = tempfile::tempdir().unwrap();
        let data = tmp.path();
        let version = install_reference_pack_with(data, &[]);
        let id = "org.openlanguage.ja-jp.reference";
        let first = writing_tasks(data, id, &version).expect("reference pack writing targets");
        assert!(!first.is_empty(), "the pack declares writing targets");
        assert!(
            std::sync::Arc::ptr_eq(
                &first,
                &writing_tasks(data, id, &version).expect("targets again")
            ),
            "a second call must reuse the parse instead of repeating it"
        );
        let fixture =
            Path::new(env!("CARGO_MANIFEST_DIR")).join("../../../tests/fixtures/packs/ja-demo");
        copy_tree(&fixture, &data.join("packs/org.openlanguage.ja-demo/0.1.0"));
        let demo = writing_tasks(data, "org.openlanguage.ja-demo", "0.1.0")
            .expect("the other pack's targets parse");
        assert!(
            !std::sync::Arc::ptr_eq(&first, &demo),
            "a different version root must never reuse another root's targets"
        );
        assert!(
            writing_tasks(data, id, "9.9.9").is_err(),
            "an absent version errors"
        );
        assert!(
            writing_tasks(data, id, "9.9.9").is_err(),
            "a failed parse caches nothing"
        );
    }
}
