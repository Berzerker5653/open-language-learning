//! Native shell for the desktop app. The web UI is outside the native trust
//! boundary: every command argument is validated here, capabilities are
//! least-privilege, and no arbitrary paths come from rendered content
//! (docs/07 "Native privilege and provider isolation").
//!
//! UX-001 onboarding surface: local profile creation (no account),
//! bundled Japanese pack install (allowlisted ids only — the UI never
//! supplies paths), and an honest privacy notice (docs/08).

mod models;
mod packs;
mod scenarios;
use lts_speech_api::{
    AcousticFeatureProvider, AlignmentProvider, PronunciationInterpreter, ProsodyProvider,
    SpeechSynthesisProvider,
};
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
    let packs = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../../tests/fixtures/packs");
    vec![
        (
            PackCandidate {
                pack_id: "org.openlanguage.ja-demo".into(),
                display_name: "Japanese — demo lexicon (EDRDG-derived, unreviewed)".into(),
                locale: "ja-JP".into(),
                maturity: "community".into(),
            },
            packs.join("ja-demo"),
        ),
        (
            PackCandidate {
                pack_id: "org.openlanguage.eo-demo".into(),
                display_name: "Esperanto — original demo (unreviewed)".into(),
                locale: "eo".into(),
                maturity: "community".into(),
            },
            packs.join("eo-demo"),
        ),
    ]
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
fn catalog_packs() -> CatalogResponse {
    let (entries, status) = packs::catalog_view(&data_dir());
    CatalogResponse { entries, status }
}

#[tauri::command]
fn install_catalog_pack(pack_id: String) -> Result<packs::InstalledPack, String> {
    packs::install_from_catalog(&data_dir(), &pack_id)
}

/// Import a locally supplied .lpk archive (contents cross IPC as base64;
/// filesystem paths never do).
#[tauri::command]
fn import_pack(data_b64: String) -> Result<packs::InstalledPack, String> {
    packs::import_pack_b64(&data_dir(), &data_b64)
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
}

/// Parse an installed pack's lexicon into display/practice entries.
/// Malformed lines are skipped; ids are validated as content ids so
/// they can never become path components.
fn lexicon_entries(data: &Path, pack_id: &str, version: &str) -> Result<Vec<LexEntry>, String> {
    let path = data
        .join("packs")
        .join(pack_id)
        .join(version)
        .join("lexicon")
        .join("entries.jsonl");
    let text = std::fs::read_to_string(&path).map_err(|_| "pack lexicon not found".to_string())?;
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
        let Some(surface) = forms
            .iter()
            .find(|f| {
                f.get("is_primary")
                    .and_then(|b| b.as_bool())
                    .unwrap_or(false)
            })
            .or(forms.first())
            .and_then(|f| f.get("text").and_then(|t| t.as_str()))
            .filter(|t| !t.is_empty())
        else {
            continue;
        };
        let reading = entry
            .get("readings")
            .and_then(|v| v.as_array())
            .and_then(|a| {
                a.iter()
                    .find(|r| r.get("script").and_then(|s| s.as_str()) == Some("hiragana"))
                    .or(a.first())
                    .and_then(|r| r.get("text").and_then(|t| t.as_str()))
                    .map(String::from)
            });
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
        out.push(LexEntry {
            id: id.to_string(),
            surface: surface.to_string(),
            reading,
            romaji,
            gloss: gloss.to_string(),
        });
    }
    Ok(out)
}

/// An orthography unit reduced to what the script-instruction runner
/// needs. Packs for any writing system can supply these; the engine
/// never interprets `script` beyond Unicode-script detection for the
/// kana-literacy roll-up (language neutrality, docs/00).
struct OrthEntry {
    id: String,
    symbol: String,
    reading: String,
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
            });
        }
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
}

struct ContrastItem {
    text: String,
}

/// Parse an installed pack's `phonology/contrasts.jsonl`. A pack
/// without perceptual training is not an error: empty list.
fn contrast_entries(
    data: &Path,
    pack_id: &str,
    version: &str,
) -> Result<Vec<ContrastEntry>, String> {
    let path = data
        .join("packs")
        .join(pack_id)
        .join(version)
        .join("phonology")
        .join("contrasts.jsonl");
    let Ok(text) = std::fs::read_to_string(&path) else {
        return Ok(Vec::new());
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
        out.push(ContrastEntry {
            id: id.to_string(),
            description: entry
                .get("description")
                .and_then(|v| v.as_str())
                .unwrap_or("phonological contrast")
                .to_string(),
            items,
        });
    }
    Ok(out)
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
    #[allow(dead_code)]
    id: String,
    modalities: Vec<String>,
    #[serde(default)]
    prerequisites: Vec<PackPrereq>,
    #[serde(default)]
    required_concepts: Vec<String>,
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
    // New-item stream: every selected pack's unseen lexicon entries are
    // introduction candidates. The goal graph alone can gate an entire
    // pack behind prerequisites, which leaves a brand-new profile with
    // an empty session (docs/01: sessions must always offer learning).
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
                // Introduce unseen items in both runner modalities;
                // dedupe is per (content, modality) so a word practiced
                // for recall can still surface for listening.
                for m in [
                    lts_domain::ActivityModality::RecallMeaning,
                    lts_domain::ActivityModality::ComprehensionListening,
                ] {
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
            for entry in sentence_entries(data, &pack_id, &version)? {
                let modes = [
                    lts_domain::ActivityModality::ProductionWriting,
                    lts_domain::ActivityModality::OrthographicEncoding,
                ];
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

/// Plan item enriched with the lexicon display info the UI needs to
/// answer "what am I about to learn?" — the scheduler stays pure.
#[derive(Serialize)]
struct PlanItemView {
    item_id: String,
    content_id: String,
    modality: &'static str,
    reason: &'static str,
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
    Ok(HomeState {
        display_name: profile.display_name,
        plan,
    })
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
// GAME-001: capability-driven world layer. Unlocks come from derived
// capabilities only — no activity counts, dates, or streaks feed this
// path (ADR-0002). Pure logic; the UI may render nothing and the
// engine is unaffected.
// ---------------------------------------------------------------------------

fn demo_world_config() -> lts_world::WorldConfig {
    use lts_domain::{ActivityModality as M, MasteryState as S};
    lts_world::WorldConfig {
        environments: vec![
            lts_world::Environment {
                id: "cafe".into(),
                display_name: "Café corner — read the menu".into(),
                requires: vec![lts_world::CapabilityRequirement {
                    content_id: "ja.lex.demo.konnichiwa".into(),
                    modality: M::ComprehensionReading,
                    min_state: S::Independent,
                }],
            },
            lts_world::Environment {
                id: "greeting-desk".into(),
                display_name: "Greeting desk — say it yourself".into(),
                requires: vec![lts_world::CapabilityRequirement {
                    content_id: "ja.lex.demo.konnichiwa".into(),
                    modality: M::RecallMeaning,
                    min_state: S::Independent,
                }],
            },
        ],
        version: "world-demo-0.1.0".into(),
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
    Ok(lts_world::evaluate(&demo_world_config(), &snapshot)
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
        .collect())
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

/// Dev/vendor aligner path; production packaging ships whisper.cpp as a
/// sidecar (ADR-0008). Model prefers the installed catalog copy.
fn aligner_paths(data: &Path) -> Option<(PathBuf, PathBuf)> {
    let vendor = match std::env::var("LTS_BENCH_VENDOR") {
        Ok(v) => PathBuf::from(v),
        Err(_) => match std::env::var("HOME") {
            Ok(h) => PathBuf::from(h).join(".cache/lts-bench"),
            Err(_) => return None,
        },
    };
    let binary = vendor.join("whisper.cpp/build/bin/whisper-cli");
    if !binary.exists() {
        return None;
    }
    let entry = models::load_catalog()
        .models
        .into_iter()
        .find(|m| m.id == "org.openlanguage.speech.whisper-ggml-tiny")?;
    let installed = models::model_dir(data, &entry).join("ggml-tiny.bin");
    let model = if installed.exists() {
        installed
    } else {
        let v = vendor.join("ggml-tiny.bin");
        if v.exists() {
            v
        } else {
            return None;
        }
    };
    Some((binary, model))
}

#[tauri::command]
fn pronunciation_check(attempt: PronunciationAttempt) -> Result<PronunciationResult, String> {
    pronunciation_check_at(&data_dir(), attempt)
}

fn pronunciation_check_at(
    data: &Path,
    attempt: PronunciationAttempt,
) -> Result<PronunciationResult, String> {
    if !bundled_packs()
        .iter()
        .any(|(c, _)| c.pack_id == attempt.pack_id)
    {
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
    };
    let packs_root = data.join("packs");
    let version = lts_langpack::archive::current_version(&attempt.pack_id, &packs_root)
        .ok_or("pack not installed")?;
    let pack_dir = packs_root.join(&attempt.pack_id).join(&version);
    let Some((binary, model)) = aligner_paths(data) else {
        return Ok(abstain("aligner-unavailable".into()));
    };
    let aligner = lts_speech_runtime::WhisperConstrainedAligner {
        binary,
        model,
        language: "ja".into(),
        threshold: 0.6,
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
    let short_ref = pack_dir.join("media").join(format!("{short}.wav"));
    let long_ref = pack_dir.join("media").join(format!("{long}.wav"));
    let (Ok(sb), Ok(lb)) = (std::fs::read(&short_ref), std::fs::read(&long_ref)) else {
        return Ok(abstain("reference-media-missing".into()));
    };
    let (Ok(sr), Ok(lr)) = (
        lts_speech_runtime::from_wav16(&sb),
        lts_speech_runtime::from_wav16(&lb),
    ) else {
        return Ok(abstain("reference-media-invalid".into()));
    };
    let rs = lts_speech_runtime::acoustic::voiced_seconds(&sr, 320, 0.01);
    let rl = lts_speech_runtime::acoustic::voiced_seconds(&lr, 320, 0.01);
    if rs <= 0.0 || rl <= 0.0 {
        return Ok(abstain("reference-media-invalid".into()));
    }
    let features =
        match lts_speech_runtime::VoicedDurationFeature::default().extract(&audio, &alignment) {
            lts_speech_api::ProviderOutcome::Usable { value, .. } => value,
            other => return Ok(abstain(outcome_reason(&other))),
        };
    // SPEECH-006: normalized contour comparison (reference-only profile).
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
        .analyze(&lr, &ref_alignment)
        .value()
        .map(|p| p.observations)
        .unwrap_or_default();
    let att_c = lts_speech_runtime::prosody::normalize_semitones(&att_obs);
    let ref_c = lts_speech_runtime::prosody::normalize_semitones(&ref_obs);
    let pitch = if att_c.is_empty() || ref_c.is_empty() {
        empty_pitch("insufficient-voiced-material")
    } else {
        PitchComparison {
            reference: ref_c.clone(),
            attempt: att_c.clone(),
            reference_shape: lts_speech_runtime::prosody::contour_shape_text(&ref_c),
            attempt_shape: lts_speech_runtime::prosody::contour_shape_text(&att_c),
            unavailable_reason: None,
        }
    };
    let evidence = lts_speech_api::PronunciationEvidence {
        alignment,
        features,
        prosody: None,
    };
    let interpreter = lts_speech_runtime::VowelLengthInterpreter {
        short_unit_id: attempt.short_text.clone(),
        long_unit_id: attempt.long_text.clone(),
        reference_ratio: rl / rs,
        ..Default::default()
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
        },
        other => PronunciationResult {
            corrections: Vec::new(),
            abstain_reason: Some(outcome_reason(&other)),
            pitch,
        },
    })
}

/// Reference audio for immediate comparison; served from the installed
/// pack's media, addressed only by allowlisted pack + validated content id.
#[tauri::command]
fn reference_audio(pack_id: String, unit_id: String) -> Result<String, String> {
    reference_audio_at(&data_dir(), &pack_id, &unit_id)
}

fn reference_audio_at(data: &Path, pack_id: &str, unit_id: &str) -> Result<String, String> {
    if !bundled_packs().iter().any(|(c, _)| c.pack_id == pack_id) {
        return Err("pack not allowlisted".into());
    }
    let unit = checked_unit(unit_id)?;
    let version = lts_langpack::archive::current_version(pack_id, &data.join("packs"))
        .ok_or("pack not installed")?;
    let path = data
        .join("packs")
        .join(pack_id)
        .join(&version)
        .join("media")
        .join(format!("{unit}.wav"));
    let bytes = std::fs::read(&path).map_err(|_| "reference not found".to_string())?;
    use base64::Engine;
    Ok(base64::engine::general_purpose::STANDARD.encode(&bytes))
}

// ---------------------------------------------------------------------------
// WRITE-001: production-writing practice (typed answers via the platform
// IME; no handwriting surface exists or is required).
// ---------------------------------------------------------------------------

/// Writing targets come from the active pack's lexicon. Entry ids are
/// validated as content ids; no filesystem path is derived from them.
fn writing_tasks(
    data: &Path,
    profile_id: &str,
) -> Result<Vec<lts_activity::writing::WritingTask>, String> {
    let active = packs::active_pack(data, profile_id)?;
    let pack_id = active.first().ok_or("no active language pack")?;
    let version = lts_langpack::archive::current_version(pack_id, &data.join("packs"))
        .ok_or("pack not installed")?;
    let path = data
        .join("packs")
        .join(pack_id)
        .join(&version)
        .join("lexicon")
        .join("entries.jsonl");
    let text = std::fs::read_to_string(&path).map_err(|_| "pack lexicon not found".to_string())?;
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
        let answer_reading = readings.as_ref().and_then(|a| {
            a.iter()
                .find(|r| field(r, "script") == Some("hiragana"))
                .or(a.first())
                .and_then(|r| field(r, "text"))
                .map(String::from)
        });
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
    let tasks = writing_tasks(&data, &profile_id)?;
    let store = lts_storage::Store::open(data.join("profiles.db")).map_err(|e| e.to_string())?;
    let attempted: std::collections::HashSet<String> = store
        .evidence_for_profile(&profile_id)
        .map_err(|e| e.to_string())?
        .iter()
        .filter(|e| e.modality == lts_domain::ActivityModality::ProductionWriting)
        .flat_map(|e| e.targets.iter().map(|c| c.as_str().to_string()))
        .collect();
    Ok(tasks.into_iter().find(|t| !attempted.contains(&t.item_id)))
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
    let tasks = writing_tasks(&data, &profile_id)?;
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
        lts_domain::ContentId::parse("ja.activity.demo.writing-typing")
            .map_err(|_| "invalid activity id")?,
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
        &rfc3339_utc(now.as_secs()),
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
    if dim == lts_domain::ActivityModality::OrthographyRecognition {
        return orth_task_build(data, pack_id, &version, content_id);
    }
    if dim == lts_domain::ActivityModality::PhonologicalDiscrimination {
        return contrast_task_build(data, pack_id, &version, content_id);
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
        typed: false,
    };
    let correct = entry.gloss.clone();
    Ok((task, correct, reveals))
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
    };
    Ok((task, answer.clone(), Vec::new()))
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
        return Ok(SpeechAudio {
            wav_b64: base64::engine::general_purpose::STANDARD.encode(bytes),
            source: "licensed-recording",
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
fn shadowing_items(profile_id: String) -> Result<Vec<ShadowItem>, String> {
    shadowing_items_at(&data_dir(), &profile_id)
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
}

fn sentence_entries(
    data: &Path,
    pack_id: &str,
    version: &str,
) -> Result<Vec<SentenceEntry>, String> {
    let path = data
        .join("packs")
        .join(pack_id)
        .join(version)
        .join("sentences")
        .join("entries.jsonl");
    let text =
        std::fs::read_to_string(&path).map_err(|_| "pack sentences not found".to_string())?;
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
    };
    Ok((task, entry.text, Vec::new()))
}

/// K-12: dictation audio. Media-first (`media/<sentence-id>.wav`), TTS
/// fallback; the transcript is chosen server-side and never crosses IPC.
#[tauri::command]
fn dictation_audio(profile_id: String, content_id: String) -> Result<SpeechAudio, String> {
    dictation_audio_at(&data_dir(), &profile_id, &content_id)
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
        });
    }
    Ok(out)
}

#[derive(Serialize)]
struct StorySummary {
    id: String,
    title: String,
    description: Option<String>,
    sentence_count: usize,
}

#[tauri::command]
fn story_list(profile_id: String) -> Result<Vec<StorySummary>, String> {
    story_list_at(&data_dir(), &profile_id)
}

fn story_list_at(data: &Path, profile_id: &str) -> Result<Vec<StorySummary>, String> {
    let active = packs::active_pack(data, profile_id)?;
    let pack_id = active.first().ok_or("no active language pack")?;
    let version = lts_langpack::archive::current_version(pack_id, &data.join("packs"))
        .ok_or("pack not installed")?;
    Ok(story_entries(&data, pack_id, &version)?
        .into_iter()
        .map(|s| StorySummary {
            sentence_count: s.sentences.len(),
            id: s.id,
            title: s.title,
            description: s.description,
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
}

#[tauri::command]
fn story_view(profile_id: String, story_id: String) -> Result<StoryView, String> {
    story_view_at(&data_dir(), &profile_id, &story_id)
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
        };
        let display = reader_display(data, profile_id, &proxy, false);
        let known: Vec<LexEntry> = lex
            .iter()
            .filter(|e| !e.surface.is_empty() && entry.text.contains(&e.surface))
            .cloned()
            .collect();
        views.push(StorySentenceView {
            content_id: entry.id.clone(),
            text: entry.text.clone(),
            furigana: display.as_ref().and_then(|d| d.furigana.clone()),
            romaji: display.as_ref().and_then(|d| d.romaji.clone()),
            faded_by_mastery: display.as_ref().is_some_and(|d| d.faded_by_mastery),
            gloss: entry.gloss.clone(),
            known,
        });
    }
    Ok(StoryView {
        id: story.id,
        title: story.title,
        sentences: views,
    })
}

/// K-13: per-sentence audio, media-first with model-output fallback
/// (same path as dictation; the written form is already visible in the
/// reader, so no IPC secrecy constraint applies to the text here).
#[tauri::command]
fn story_audio(profile_id: String, sentence_id: String) -> Result<SpeechAudio, String> {
    dictation_audio_at(&data_dir(), &profile_id, &sentence_id)
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
    let id = format!("mine-{}-{}", now.as_secs(), now.subsec_nanos());
    store
        .add_mined(
            &profile_id,
            &id,
            &surface,
            reading.as_deref(),
            gloss.as_deref(),
            source_citation.trim(),
            &rfc3339_utc(now.as_secs()),
        )
        .map_err(|e| e.to_string())?;
    Ok(MinedItemView {
        id,
        surface,
        reading,
        gloss,
        source_citation: source_citation.trim().to_string(),
        created_at: rfc3339_utc(now.as_secs()),
        due_at: None,
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
    let data = data_dir();
    let all = mine_list_at(&data, &profile_id)?;
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
    let (task, correct_choice, reveals) =
        practice_build(data, profile_id, content_id, modality, reveal_reading)?;
    let correct = if task.typed {
        // K-12: typed grading is exact-match on the trimmed string;
        // the expected answer was built server-side and never sent.
        answer
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
    let dim = parse_dimension(&modality).ok_or("unknown modality")?;
    let activity_id = match dim {
        lts_domain::ActivityModality::ComprehensionListening => "ja.activity.demo.mc-listen",
        // The orthography unit itself is the practiced activity; no
        // language-specific activity id literal (engine neutrality).
        lts_domain::ActivityModality::OrthographyRecognition => content_id,
        // The contrast itself is the practiced activity; no
        // language-specific activity id literal (engine neutrality).
        // K-12: the sentence itself is the practiced activity; no
        // language-specific activity id literal (engine neutrality).
        lts_domain::ActivityModality::ProductionWriting
        | lts_domain::ActivityModality::OrthographicEncoding => content_id,
        lts_domain::ActivityModality::PhonologicalDiscrimination => content_id,
        _ => "ja.activity.demo.mc-recall",
    };
    let event = lts_learner_model::AttemptDraft::new(
        vec![lts_domain::ContentId::parse(content_id).map_err(|_| "invalid item id")?],
        dim,
        lts_domain::ContentId::parse(activity_id).map_err(|_| "invalid activity id")?,
        pack_id,
        &version,
    )
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
        &rfc3339_utc(now.as_secs()),
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

#[tauri::command]
fn speech_audio(pack_id: String, unit_id: String, text: String) -> Result<SpeechAudio, String> {
    speech_audio_at(&data_dir(), &pack_id, &unit_id, &text)
}

fn speech_audio_at(
    data: &Path,
    pack_id: &str,
    unit_id: &str,
    text: &str,
) -> Result<SpeechAudio, String> {
    if !bundled_packs().iter().any(|(c, _)| c.pack_id == pack_id) {
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
        return Ok(SpeechAudio {
            wav_b64: base64::engine::general_purpose::STANDARD.encode(bytes),
            source: "licensed-recording",
        });
    }
    let vendor = match std::env::var("LTS_BENCH_VENDOR") {
        Ok(v) => PathBuf::from(v),
        Err(_) => match std::env::var("HOME") {
            Ok(h) => PathBuf::from(h).join(".cache/lts-bench"),
            Err(_) => return Err("tts-runtime-unavailable".into()),
        },
    };
    let kokoro = vendor.join("kokoro-multi-lang-v1_0");
    let tts = lts_speech_runtime::tts::SherpaSubprocessTts {
        binary: vendor.join("sherpa-onnx-v1.13.8-linux-x64-shared/bin/sherpa-onnx-offline-tts"),
        model: kokoro.join("model.onnx"),
        voices: kokoro.join("voices.bin"),
        tokens: kokoro.join("tokens.txt"),
        data_dir: kokoro.join("espeak-ng-data"),
        lang: "ja".into(),
    };
    if !tts.binary.exists() {
        return Err("tts-runtime-unavailable".into());
    }
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
    let entries = lexicon_entries(data, pack_id, &version)?;
    let entry = entries
        .iter()
        .find(|e| e.id == content_id)
        .ok_or("unknown item")?;
    speech_audio_at(data, pack_id, content_id, &entry.surface)
}

// ---------------------------------------------------------------------------
// SPEECH-003: model manager (versioned, checksummed, licensed, removable)
// ---------------------------------------------------------------------------

/// Catalog + install status. The base app ships zero models; speech
/// features report `missing` and stay recoverable (docs/05).
#[tauri::command]
fn available_models() -> Vec<models::ModelStatus> {
    models::model_status(&data_dir())
}

#[tauri::command]
fn install_model(model_id: String) -> Result<models::InstalledRecord, String> {
    let entry = models::load_catalog()
        .models
        .into_iter()
        .find(|m| m.id == model_id)
        .ok_or("unknown model id")?;
    models::install_model_files(
        &data_dir(),
        &entry,
        &rfc3339_utc(now_secs()),
        models::download,
    )
}

#[tauri::command]
fn delete_model(model_id: String) -> Result<(), String> {
    let entry = models::load_catalog()
        .models
        .into_iter()
        .find(|m| m.id == model_id)
        .ok_or("unknown model id")?;
    models::delete_model(&data_dir(), &entry)
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
            progress_summary,
            available_models,
            install_model,
            delete_model,
            pronunciation_check,
            reference_audio,
            speech_audio,
            world_state,
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

    #[test]
    fn pronunciation_check_guides_vowel_length_and_abstains_on_mismatch() {
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
        assert_eq!(res.abstain_reason, None, "got {:?}", res.abstain_reason);
        assert_eq!(res.corrections.len(), 1);
        assert_eq!(res.corrections[0].feature_id, "ja.phon.long-vowel");
        assert_eq!(
            res.corrections[0].feedback_template_id,
            "speech.long-vowel.close"
        );

        // SPEECH-006: normalized contour comparison available.
        assert_eq!(res.pitch.unavailable_reason, None);
        assert!(!res.pitch.reference.is_empty() && !res.pitch.attempt.is_empty());
        assert!(res.pitch.reference_shape.contains("overall"));
        // Normalized: semitones around the speaker median, not Hz.
        assert!(res.pitch.reference.iter().all(|v| v.abs() < 48.0));

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

    #[test]
    fn world_unlocks_follow_capabilities_not_activity_volume() {
        let tmp = tempfile::tempdir().unwrap();
        let data = tmp.path();
        install_bundled_pack(data, "org.openlanguage.ja-demo").unwrap();
        let p = create_local_profile(data, "Hunter").unwrap();
        let store = lts_storage::Store::open(data.join("profiles.db")).unwrap();
        // Two independent recalls (distinct prompt families, no support).
        for (family, id, at) in [
            ("ja.expr.demo.greet-p1", "r1", "2026-10-02T10:00:00Z"),
            ("ja.expr.demo.greet-p2", "r2", "2026-10-02T11:00:00Z"),
        ] {
            let ev = attempt(
                "ja.lex.demo.konnichiwa",
                lts_domain::ActivityModality::RecallMeaning,
                family,
                0,
                at,
                id,
                &p.id,
            );
            store.append_evidence(&ev).unwrap();
        }
        let envs = world_state_at(data, &p.id).unwrap();
        let desk = envs.iter().find(|e| e.id == "greeting-desk").unwrap();
        let cafe = envs.iter().find(|e| e.id == "cafe").unwrap();
        assert!(desk.unlocked, "recall capability opens the desk");
        assert!(!cafe.unlocked, "reading capability is still missing");
        assert!(!cafe.missing.is_empty());

        // Activity volume changes nothing: 50 more events on other
        // content leave the unlock set identical (no streaks, ADR-0002).
        for i in 0..50 {
            let ev = attempt(
                "ja.lex.demo.watashi",
                lts_domain::ActivityModality::RecallMeaning,
                "ja.expr.demo.self-a",
                0,
                "2026-10-02T12:00:00Z",
                &format!("x{i}"),
                &p.id,
            );
            store.append_evidence(&ev).unwrap();
        }
        assert_eq!(world_state_at(data, &p.id).unwrap(), envs);
    }

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
        let inst = packs::import_pack_b64(data, &b64).unwrap();
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
        assert_eq!(listen.activity_id.as_str(), "ja.activity.demo.mc-listen");
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
        assert_eq!(item.source_citation, "ja.story.demo.first-meeting");

        // Self-graded review schedules the mined item only.
        mine_grade_at(data, &p.id, &item.id, false).unwrap();
        let listed = mine_list_at(data, &p.id).unwrap();
        assert_eq!(listed.len(), 1);
        assert!(listed[0].due_at.is_some());

        let store = lts_storage::Store::open(data.join("profiles.db")).unwrap();
        // NEVER mastery evidence, and no pack-content scheduler rows.
        assert!(store.evidence_for_profile(&p.id).unwrap().is_empty());
        let rows = store.scheduler_state(&p.id).unwrap();
        assert_eq!(rows.len(), 1);
        assert!(rows[0].item_id.starts_with("mine-"));
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
        assert_ne!(
            store
                .get_setting(&p.id, "kana-literacy-established")
                .unwrap()
                .map(|v| v.as_bool().unwrap_or(false))
                .unwrap_or(false),
            true,
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
}
