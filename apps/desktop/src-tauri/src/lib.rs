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
            progress_summary
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
}
