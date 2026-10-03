//! Native shell for the desktop app. The web UI is outside the native trust
//! boundary: every command argument is validated here, capabilities are
//! least-privilege, and no arbitrary paths come from rendered content
//! (docs/07 "Native privilege and provider isolation").
//!
//! UX-001 onboarding surface: local profile creation (no account),
//! bundled Japanese pack install (allowlisted ids only — the UI never
//! supplies paths), and an honest privacy notice (docs/08).

mod models;
use lts_speech_api::{
    AcousticFeatureProvider, AlignmentProvider, PronunciationInterpreter, ProsodyProvider,
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
    let progression = progression_items(data, &store, profile_id, &derived)?;
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

#[derive(Serialize)]
struct HomeState {
    display_name: String,
    plan: lts_scheduler::SessionPlan,
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
    let plan = build_plan(&data, &profile_id, 5, now_secs())?;
    Ok(HomeState {
        display_name: profile.display_name,
        plan,
    })
}

#[tauri::command]
fn practice_plan(profile_id: String, minutes: u32) -> Result<lts_scheduler::SessionPlan, String> {
    build_plan(&data_dir(), &profile_id, minutes, now_secs())
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
        .invoke_handler(tauri::generate_handler![
            app_mode,
            smoke_ack,
            privacy_notice,
            available_packs,
            install_pack,
            create_profile,
            complete_onboarding,
            home_state,
            practice_plan,
            progress_summary,
            available_models,
            install_model,
            delete_model,
            pronunciation_check,
            reference_audio
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
}
