//! K-01: scenario runtime wired into the app (SCENARIO-001 engine → UI).
//!
//! Sessions live in managed state for the app lifetime; only the pack
//! graph is persisted data. Unlock follows the versioned prerequisite
//! contract (docs/03 §7): a scenario is enterable when its goal's hard
//! prerequisites are met by derived mastery — permission to enter is
//! distinct from mastery of the goal itself. Finishing records one
//! scored interaction event per completed node with the support the
//! learner actually used; the scheduler is untouched (scenario nodes
//! are not discrete memory cards).

use crate::{PackGoals, derive_pairs, now_secs, parse_dimension, parse_state, rfc3339_utc};
use lts_activity::scenario::{ScenarioOutcome, ScenarioSession};
use lts_activity::spec::{ActivityRuntime, PackScenario};
use lts_domain::ProfileId;
use serde::Serialize;
use std::collections::HashMap;
use std::path::Path;
use std::sync::Mutex;

/// In-progress sessions keyed by "<profile-id>:<scenario-id>".
pub type SessionStore = Mutex<HashMap<String, ScenarioSession>>;

#[derive(Serialize)]
#[serde(rename_all = "kebab-case")]
pub struct ScenarioSummary {
    pub scenario_id: String,
    pub title: String,
    pub situation: Option<String>,
    pub goal_id: String,
    pub unlocked: bool,
    /// Human-readable lock reason; present only when locked.
    pub locked_reason: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "kebab-case")]
pub struct RecoveryView {
    pub id: String,
    pub prompt: String,
}

#[derive(Serialize)]
#[serde(rename_all = "kebab-case")]
pub struct NodeView {
    pub id: String,
    pub prompt: String,
    /// Pack-declared intents the learner can attempt at this prompt.
    /// An empty list means free response (any attempt advances).
    pub actions: Vec<String>,
    pub recovery: Vec<RecoveryView>,
}

#[derive(Serialize)]
#[serde(rename_all = "kebab-case")]
pub struct LadderView {
    pub support_level: u8,
    pub description: String,
}

#[derive(Serialize)]
#[serde(rename_all = "kebab-case")]
pub struct TransferView {
    pub id: String,
    pub description: String,
    pub done: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "kebab-case")]
pub struct ScenarioView {
    pub scenario_id: String,
    pub title: String,
    pub situation: Option<String>,
    pub node: NodeView,
    pub ladder: Vec<LadderView>,
    pub transfers: Vec<TransferView>,
    pub transfers_required: u32,
    pub support_used: Vec<u8>,
}

#[derive(Serialize)]
#[serde(rename_all = "kebab-case")]
pub struct StepView {
    /// "advanced" | "completed" | "not-satisfied"
    pub result: String,
    /// Node ids offered as recovery branches when not satisfied.
    pub recovery: Vec<String>,
    pub completed: bool,
    pub view: ScenarioView,
}

#[derive(Serialize)]
#[serde(rename_all = "kebab-case")]
pub struct OutcomeView {
    pub nodes_completed: u32,
    pub transfers_completed: u32,
    pub transfer_requirement_met: bool,
}

fn session_key(profile_id: &str, scenario_id: &str) -> String {
    format!("{profile_id}:{scenario_id}")
}

/// Load the activity runtime (units/scenarios/lexicon) for an installed
/// pack. Paths are built only from validated pack ids and versions.
fn runtime_for(data: &Path, pack_id: &str) -> Result<(ActivityRuntime, String), String> {
    let packs_root = data.join("packs");
    let version = lts_langpack::archive::current_version(pack_id, &packs_root)
        .ok_or_else(|| format!("pack {pack_id} not installed"))?;
    let root = packs_root.join(pack_id).join(&version);
    let pack = lts_langpack::Pack::load_dir(&root).map_err(|e| format!("pack load: {e}"))?;
    let runtime = ActivityRuntime::from_pack(&pack).map_err(|e| format!("activity load: {e}"))?;
    Ok((runtime, version))
}

/// Hard-prerequisite gate shared with curriculum progression: every
/// `hard` prerequisite must be met by derived mastery at or above the
/// required state on the declared dimension.
pub fn hard_prereqs_met(
    goal: &crate::PackGoal,
    derived: &[lts_learner_model::DerivedMastery],
) -> bool {
    goal.prerequisites.iter().all(|p| {
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
    })
}

/// List scenarios from every pack the profile studies, with honest
/// lock state from the prerequisite contract.
pub fn list_at(data: &Path, profile_id: &str) -> Result<Vec<ScenarioSummary>, String> {
    let store = lts_storage::Store::open(data.join("profiles.db")).map_err(|e| e.to_string())?;
    let selected = store
        .selected_packs(profile_id)
        .map_err(|e| e.to_string())?;
    let derived = derive_pairs(&store, profile_id, &rfc3339_utc(now_secs()))?;
    let mut out = Vec::new();
    for (pack_id, _v) in selected {
        let (runtime, _version) = runtime_for(data, &pack_id)?;
        let packs_root = data.join("packs");
        let version = lts_langpack::archive::current_version(&pack_id, &packs_root)
            .ok_or_else(|| format!("pack {pack_id} not installed"))?;
        let goals_path = packs_root
            .join(&pack_id)
            .join(version)
            .join("curriculum/goals.yaml");
        let goals: HashMap<String, crate::PackGoal> = std::fs::read_to_string(&goals_path)
            .ok()
            .and_then(|t| serde_yaml::from_str::<PackGoals>(&t).ok())
            .map(|g| {
                g.goals
                    .into_iter()
                    .map(|goal| (goal.id.clone(), goal))
                    .collect()
            })
            .unwrap_or_default();
        for sc in runtime.scenarios() {
            let (unlocked, locked_reason) = match goals.get(&sc.goal_id) {
                None => (
                    false,
                    Some(format!("goal {} is not defined in this pack", sc.goal_id)),
                ),
                Some(goal) => {
                    if hard_prereqs_met(goal, &derived) {
                        (true, None)
                    } else {
                        let missing: Vec<String> = goal
                            .prerequisites
                            .iter()
                            .filter(|p| p.strength == "hard")
                            .filter(|p| {
                                match (
                                    parse_dimension(&p.dimension),
                                    parse_state(&p.required_state),
                                ) {
                                    (Some(dim), Some(req)) => !derived.iter().any(|d| {
                                        d.content_id == p.target
                                            && d.dimension == dim
                                            && d.state >= req
                                    }),
                                    _ => true,
                                }
                            })
                            .map(|p| {
                                format!("{} ({} → {})", p.target, p.dimension, p.required_state)
                            })
                            .collect();
                        (
                            false,
                            Some(format!(
                                "not yet ready — practice first: {}",
                                missing.join("; ")
                            )),
                        )
                    }
                }
            };
            out.push(ScenarioSummary {
                scenario_id: sc.id.clone(),
                title: sc.title.clone(),
                situation: sc.situation.clone(),
                goal_id: sc.goal_id.clone(),
                unlocked,
                locked_reason,
            });
        }
    }
    out.sort_by(|a, b| a.scenario_id.cmp(&b.scenario_id));
    Ok(out)
}

fn view_of(sc: &PackScenario, session: &ScenarioSession) -> ScenarioView {
    let (prompt, actions) = session.active_prompt();
    let node = session.current_node();
    ScenarioView {
        scenario_id: sc.id.clone(),
        title: sc.title.clone(),
        situation: sc.situation.clone(),
        node: NodeView {
            id: node.id.clone(),
            prompt: prompt.to_string(),
            actions: actions.to_vec(),
            recovery: node
                .recovery
                .iter()
                .map(|r| RecoveryView {
                    id: r.id.clone(),
                    prompt: r.prompt.clone(),
                })
                .collect(),
        },
        ladder: sc
            .support_ladder
            .iter()
            .map(|s| LadderView {
                support_level: s.support_level,
                description: s.description.clone(),
            })
            .collect(),
        transfers: sc
            .transfer_variants
            .iter()
            .map(|t| TransferView {
                id: t.id.clone(),
                description: t.description.clone(),
                done: false,
            })
            .collect(),
        transfers_required: sc.transfer_variants_required,
        support_used: Vec::new(),
    }
}

/// Begin (or restart) a session. Enforces the unlock gate.
pub fn start_at(
    data: &Path,
    profile_id: &str,
    scenario_id: &str,
    sessions: &SessionStore,
) -> Result<ScenarioView, String> {
    let summaries = list_at(data, profile_id)?;
    let summary = summaries
        .iter()
        .find(|s| s.scenario_id == scenario_id)
        .ok_or("scenario not found in the profile's packs")?;
    if !summary.unlocked {
        return Err(summary
            .locked_reason
            .clone()
            .unwrap_or_else(|| "scenario locked".into()));
    }
    let active = lts_storage::Store::open(data.join("profiles.db"))
        .and_then(|s| s.selected_packs(profile_id))
        .map_err(|e| e.to_string())?;
    let mut found: Option<(&str, PackScenario)> = None;
    for (pack_id, _v) in &active {
        let (runtime, _ver) = runtime_for(data, pack_id)?;
        if let Some(sc) = runtime.scenarios().find(|s| s.id == scenario_id) {
            found = Some((pack_id.as_str(), sc.clone()));
            break;
        }
    }
    let (_pack_id, sc) = found.ok_or("scenario not found")?;
    let session = ScenarioSession::begin(&sc).ok_or("scenario has no nodes")?;
    let view = view_of(&sc, &session);
    let mut guard = sessions.lock().map_err(|_| "session store poisoned")?;
    guard.insert(session_key(profile_id, scenario_id), session);
    Ok(view)
}

fn with_session<T>(
    sessions: &SessionStore,
    profile_id: &str,
    scenario_id: &str,
    data: &Path,
    f: impl FnOnce(&mut ScenarioSession) -> Result<T, String>,
) -> Result<(T, PackScenario), String> {
    // Re-resolve the pack scenario for view building (pack data is
    // immutable per version; sessions hold their own clone).
    let active = lts_storage::Store::open(data.join("profiles.db"))
        .and_then(|s| s.selected_packs(profile_id))
        .map_err(|e| e.to_string())?;
    let mut sc: Option<PackScenario> = None;
    for (pack_id, _v) in &active {
        let (runtime, _ver) = runtime_for(data, pack_id)?;
        if let Some(s) = runtime.scenarios().find(|s| s.id == scenario_id) {
            sc = Some(s.clone());
            break;
        }
    }
    let sc = sc.ok_or("scenario not found")?;
    let mut guard = sessions.lock().map_err(|_| "session store poisoned")?;
    let key = session_key(profile_id, scenario_id);
    let session = guard
        .get_mut(&key)
        .ok_or("no session in progress — start the scenario first")?;
    let out = f(session)?;
    Ok((out, sc))
}

pub fn attempt_at(
    data: &Path,
    profile_id: &str,
    scenario_id: &str,
    intent: &str,
    sessions: &SessionStore,
) -> Result<StepView, String> {
    let (result, sc) = with_session(sessions, profile_id, scenario_id, data, |s| {
        Ok::<_, String>(s.attempt(intent))
    })?;
    let mut guard = sessions.lock().map_err(|_| "session store poisoned")?;
    let session = guard
        .get_mut(&session_key(profile_id, scenario_id))
        .ok_or("no session")?;
    use lts_activity::scenario::StepResult::*;
    let (name, recovery, completed) = match &result {
        Advanced { .. } => ("advanced", Vec::new(), false),
        Completed => ("completed", Vec::new(), true),
        NotSatisfied { recovery } => ("not-satisfied", recovery.clone(), false),
    };
    let mut view = view_of(&sc, session);
    view.support_used = session.support_used_snapshot();
    Ok(StepView {
        result: name.to_string(),
        recovery,
        completed,
        view,
    })
}

pub fn support_at(
    data: &Path,
    profile_id: &str,
    scenario_id: &str,
    level: u8,
    sessions: &SessionStore,
) -> Result<ScenarioView, String> {
    let (ok, sc) = with_session(sessions, profile_id, scenario_id, data, |s| {
        if s.use_support(level) {
            Ok(())
        } else {
            Err(format!(
                "support level {level} is not declared by this scenario"
            ))
        }
    })?;
    let _ = ok;
    let mut guard = sessions.lock().map_err(|_| "session store poisoned")?;
    let session = guard
        .get_mut(&session_key(profile_id, scenario_id))
        .ok_or("no session")?;
    let mut view = view_of(&sc, session);
    view.support_used = session.support_used_snapshot();
    Ok(view)
}

pub fn recovery_at(
    data: &Path,
    profile_id: &str,
    scenario_id: &str,
    recovery_id: &str,
    sessions: &SessionStore,
) -> Result<ScenarioView, String> {
    let (_, sc) = with_session(sessions, profile_id, scenario_id, data, |s| {
        if s.enter_recovery(recovery_id) {
            Ok(())
        } else {
            Err("that recovery branch is not available at this node".to_string())
        }
    })?;
    let mut guard = sessions.lock().map_err(|_| "session store poisoned")?;
    let session = guard
        .get_mut(&session_key(profile_id, scenario_id))
        .ok_or("no session")?;
    let mut view = view_of(&sc, session);
    view.support_used = session.support_used_snapshot();
    Ok(view)
}

pub fn transfer_at(
    data: &Path,
    profile_id: &str,
    scenario_id: &str,
    variant_id: &str,
    sessions: &SessionStore,
) -> Result<ScenarioView, String> {
    let (_, sc) = with_session(sessions, profile_id, scenario_id, data, |s| {
        if s.complete_transfer(variant_id) {
            Ok(())
        } else {
            Err("unknown transfer variant".to_string())
        }
    })?;
    let mut guard = sessions.lock().map_err(|_| "session store poisoned")?;
    let session = guard
        .get_mut(&session_key(profile_id, scenario_id))
        .ok_or("no session")?;
    let mut view = view_of(&sc, session);
    view.support_used = session.support_used_snapshot();
    for t in &mut view.transfers {
        t.done = session.transfer_done(&t.id);
    }
    Ok(view)
}

/// Finalize the session: record one scored interaction event per
/// completed node (support = what the learner actually used there).
pub fn finish_at(
    data: &Path,
    profile_id: &str,
    scenario_id: &str,
    sessions: &SessionStore,
) -> Result<OutcomeView, String> {
    let active = lts_storage::Store::open(data.join("profiles.db"))
        .and_then(|s| s.selected_packs(profile_id))
        .map_err(|e| e.to_string())?;
    let mut pack_id: Option<String> = None;
    for (pid, _v) in &active {
        let (runtime, _ver) = runtime_for(data, pid)?;
        if runtime.scenarios().any(|s| s.id == scenario_id) {
            pack_id = Some(pid.clone());
            break;
        }
    }
    let pack_id = pack_id.ok_or("scenario not found")?;
    let version = lts_langpack::archive::current_version(&pack_id, &data.join("packs"))
        .ok_or("pack not installed")?;
    let session = {
        let mut guard = sessions.lock().map_err(|_| "session store poisoned")?;
        guard.remove(&session_key(profile_id, scenario_id))
    }
    .ok_or("no session in progress")?;
    let outcome: ScenarioOutcome = session.finish();
    let store = lts_storage::Store::open(data.join("profiles.db")).map_err(|e| e.to_string())?;
    let base = now_secs();
    let events = ScenarioSession::evidence_events(
        &outcome,
        &pack_id,
        &version,
        &ProfileId::new(profile_id),
        |i| rfc3339_utc(base + i as u64),
    );
    for ev in &events {
        store.append_evidence(ev).map_err(|e| e.to_string())?;
    }
    Ok(OutcomeView {
        nodes_completed: outcome.nodes.iter().filter(|n| n.succeeded).count() as u32,
        transfers_completed: outcome.transfers_completed.len() as u32,
        transfer_requirement_met: outcome.transfer_requirement_met,
    })
}
