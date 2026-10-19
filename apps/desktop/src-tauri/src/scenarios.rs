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

/// K-75: how close a scenario is to being startable, derived from the
/// pack goal map plus derived mastery — never from file names or id order.
/// Tier order is the list order: playable first, then near, then later.
#[derive(Serialize, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Debug)]
#[serde(rename_all = "snake_case")]
pub enum Readiness {
    /// Every hard prerequisite is met; the learner can start now.
    Playable,
    /// Locked, but the pack's own data puts it close: some hard
    /// prerequisite is already met, the learner is part-way up one, or the
    /// goal sits in a band they can already reach.
    Near,
    /// Nothing started toward the gate in a later band — or a goal the pack
    /// does not define at all.
    Later,
}

/// Why a scenario is locked, classified from the goal graph itself rather
/// than from id conventions: a hard prerequisite that names another goal is
/// a curriculum-stage gate; one that names content is a capability the
/// learner can drill.
#[derive(Serialize, Clone, Copy, PartialEq, Eq, Debug)]
#[serde(rename_all = "snake_case")]
pub enum LockKind {
    Capability,
    Stage,
    UndefinedGoal,
}

#[derive(Clone, Serialize)]
pub struct ScenarioSummary {
    pub scenario_id: String,
    pub title: String,
    pub situation: Option<String>,
    pub goal_id: String,
    /// Goal band exactly as the pack's goal map labels it (`on-ramp`,
    /// `A1`, …). `None` when the pack does not define the scenario's goal.
    pub goal_band: Option<String>,
    /// K-75: what the learner can do with this scenario today.
    pub readiness: Readiness,
    pub unlocked: bool,
    /// Human-readable lock reason; present only when locked.
    pub locked_reason: Option<String>,
    /// The kind of gate: capability practice, a later curriculum stage, or
    /// a goal this pack never defines. Only when locked.
    pub lock_kind: Option<LockKind>,
    /// What unlocks the scenario, one entry per unmet hard prerequisite the
    /// pack declares. Empty when playable.
    pub unlocks: Vec<String>,
    /// True on exactly one row — the scenario to do next, i.e. the first
    /// playable one after ordering. All false when nothing is playable.
    pub recommended: bool,
}

#[derive(Serialize)]
pub struct RecoveryView {
    pub id: String,
    pub prompt: String,
}

/// U07: one respond button. `intent` is the internal pack token the
/// runtime matches against `expected_actions`; `label` is the learner-
/// facing wording from the pack's `action_labels` (or a generic word).
/// The token must never be rendered as the label.
#[derive(Serialize)]
pub struct ActionView {
    pub intent: String,
    pub label: String,
}

#[derive(Serialize)]
pub struct NodeView {
    pub id: String,
    pub prompt: String,
    /// U07: pack-declared intents the learner can attempt at this prompt.
    /// An empty list means free response (any attempt advances).
    pub actions: Vec<ActionView>,
    pub recovery: Vec<RecoveryView>,
}

#[derive(Serialize)]
pub struct LadderView {
    pub support_level: u8,
    pub description: String,
}

/// U07: the help a ladder rung actually delivered. A rung the learner
/// can press is a promise; `support_at` fills this from the current
/// node's `support` payload at that level, and validation guarantees
/// every rung > 0 in a 0.2 scenario has one.
#[derive(Serialize)]
pub struct HelpView {
    pub kind: String,
    pub text: String,
    pub options: Vec<String>,
}

#[derive(Serialize)]
pub struct TransferView {
    pub id: String,
    pub description: String,
    pub done: bool,
}

#[derive(Serialize)]
pub struct ScenarioView {
    pub scenario_id: String,
    pub title: String,
    pub situation: Option<String>,
    pub node: NodeView,
    pub ladder: Vec<LadderView>,
    pub transfers: Vec<TransferView>,
    pub transfers_required: u32,
    pub support_used: Vec<u8>,
    /// U07: set only by `support_at`, from the rung's payload; None on
    /// every other command so stale help never lingers on a new prompt.
    pub delivered_help: Option<HelpView>,
}

#[derive(Serialize)]
pub struct StepView {
    /// "advanced" | "completed" | "not-satisfied"
    pub result: String,
    /// Node ids offered as recovery branches when not satisfied.
    pub recovery: Vec<String>,
    pub completed: bool,
    pub view: ScenarioView,
}

#[derive(Serialize)]
pub struct OutcomeView {
    pub nodes_completed: u32,
    /// U08: exchange nodes the scenario declares, so the UI can report a
    /// partial walk honestly rather than claiming completion.
    pub exchanges_total: u32,
    /// U08: true only when the chain reached its terminal node and the
    /// transfer requirement is met — never from the button press itself.
    pub completed: bool,
    pub transfers_completed: u32,
    /// U08: the pack-declared requirement (may be 0), so the transfer
    /// line names the actual number instead of a bare "at least".
    pub transfers_required: u32,
    pub transfer_requirement_met: bool,
}

fn session_key(profile_id: &str, scenario_id: &str) -> String {
    format!("{profile_id}:{scenario_id}")
}

/// Load the activity runtime (units/scenarios/lexicon) for an installed pack.
/// Paths are built only from validated pack ids and versions.
///
/// K-63: the runtime is shared per installed version rather than rebuilt per
/// command. An installed version directory is immutable, and the Scenarios
/// route was paying a full pack parse (~550 ms on the reference machine) each
/// time it listed the same activities.
fn runtime_for(
    data: &Path,
    pack_id: &str,
) -> Result<(std::sync::Arc<ActivityRuntime>, String), String> {
    let packs_root = data.join("packs");
    let version = lts_langpack::archive::current_version(pack_id, &packs_root)
        .ok_or_else(|| format!("pack {pack_id} not installed"))?;
    let root = packs_root.join(pack_id).join(&version);
    Ok((crate::packcache::runtime(&root)?, version))
}

/// One hard prerequisite record against derived mastery: met when the
/// learner holds that (content, dimension) at or above the required state.
fn prereq_met(derived: &[lts_learner_model::DerivedMastery], p: &crate::PackPrereq) -> bool {
    match (
        parse_dimension(&p.dimension),
        parse_state(&p.required_state),
    ) {
        (Some(dim), Some(req)) => derived
            .iter()
            .any(|d| d.content_id == p.target && d.dimension == dim && d.state >= req),
        _ => false,
    }
}

/// Part-way signal for an unmet hard prerequisite: the learner already
/// holds the declared dimension for the target, just below the required
/// state. Honest because it reads the same derived mastery the gate uses.
fn prereq_under_way(derived: &[lts_learner_model::DerivedMastery], p: &crate::PackPrereq) -> bool {
    match (
        parse_dimension(&p.dimension),
        parse_state(&p.required_state),
    ) {
        (Some(dim), Some(_)) => derived
            .iter()
            .any(|d| d.content_id == p.target && d.dimension == dim),
        _ => false,
    }
}

/// Hard-prerequisite gate shared with curriculum progression: every
/// `hard` prerequisite must be met by derived mastery at or above the
/// required state on the declared dimension.
pub fn hard_prereqs_met(
    goal: &crate::PackGoal,
    derived: &[lts_learner_model::DerivedMastery],
) -> bool {
    goal.prerequisites
        .iter()
        .all(|p| p.strength != "hard" || prereq_met(derived, p))
}

/// One unmet hard prerequisite, exactly as the pack's goal map declares it.
#[derive(Clone, Debug)]
pub struct UnmetPrereq {
    pub target: String,
    pub dimension: String,
    pub required_state: String,
    /// True when the target is itself a goal in the same goal map: the gate
    /// is curriculum stage, not a capability the learner can drill.
    pub target_is_goal: bool,
}

/// The goal-graph facts the readiness tier is derived from. Split out from
/// the pack/store I/O so the ordering rule is a pure function the tests can
/// pin without an installed pack.
#[derive(Clone, Copy, Debug, Default)]
pub struct ReadinessFacts<'a> {
    pub goal_defined: bool,
    pub hard_prereqs_met: bool,
    /// Hard prerequisites the learner already meets.
    pub hard_prereqs_met_count: usize,
    /// Unmet hard prerequisites they already hold the dimension for, below
    /// the required state: part-way up a rung.
    pub in_progress_unmet: usize,
    pub goal_band: Option<&'a str>,
    /// Highest band among the scenario goals this profile can already play.
    pub reached_band: Option<&'a str>,
}

/// K-75 readiness tier. Pure and data-driven: `Near` means the pack's own
/// goal graph says the gate is already part open (a rung cleared or under
/// way) or the goal sits at a stage the learner can reach today; anything
/// else that is locked is `Later`. Nothing here reads file names or ids.
pub fn readiness_of(f: ReadinessFacts<'_>) -> Readiness {
    if !f.goal_defined {
        return Readiness::Later;
    }
    if f.hard_prereqs_met {
        return Readiness::Playable;
    }
    let part_open = f.hard_prereqs_met_count > 0 || f.in_progress_unmet > 0;
    let same_stage = match (f.goal_band, f.reached_band) {
        (Some(band), Some(reached)) => {
            crate::band_sort_key(Some(band)) <= crate::band_sort_key(Some(reached))
        }
        _ => false,
    };
    if part_open || same_stage {
        Readiness::Near
    } else {
        Readiness::Later
    }
}

/// K-75 lock label: the actual gate plus what unlocks it, read off the
/// unmet hard prerequisites themselves. Every line names something the pack
/// declares; nothing is invented.
pub fn lock_of(unmet: &[UnmetPrereq]) -> (LockKind, String, Vec<String>) {
    let stage_only = unmet.iter().all(|p| p.target_is_goal);
    let kind = if stage_only {
        LockKind::Stage
    } else {
        LockKind::Capability
    };
    let head = if stage_only {
        "not open yet — a later stage of the curriculum"
    } else {
        "not open yet — practice first"
    };
    let names: Vec<String> = unmet.iter().map(prereq_name).collect();
    let unlocks: Vec<String> = unmet.iter().map(unlock_hint).collect();
    (kind, format!("{head}: {}", names.join("; ")), unlocks)
}

fn prereq_name(p: &UnmetPrereq) -> String {
    if p.target_is_goal {
        format!("goal {}", p.target)
    } else {
        format!("{} ({} → {})", p.target, p.dimension, p.required_state)
    }
}

fn unlock_hint(p: &UnmetPrereq) -> String {
    if p.target_is_goal {
        format!("reach goal {} first", p.target)
    } else {
        format!(
            "practice {} to {} ({})",
            p.target, p.required_state, p.dimension
        )
    }
}

/// K-75 list order: readiness tier (playable, then near, then later), then
/// the pack's own goal-band ladder, then how much of the gate is still
/// missing, then goal id, then scenario id. No filename or pack-iteration
/// order leaks in, and the key is a total order, so the same pack data
/// always lists the same way. Exactly one row is marked as the
/// recommendation: the first playable one. None is when nothing is open.
pub fn order_summaries(mut rows: Vec<ScenarioSummary>) -> Vec<ScenarioSummary> {
    rows.sort_by_key(order_key);
    let next = rows.iter().position(|r| r.readiness == Readiness::Playable);
    for (i, row) in rows.iter_mut().enumerate() {
        row.recommended = Some(i) == next;
    }
    rows
}

/// The total ordering key: tier, band ladder rank, remaining gate size,
/// goal id, scenario id.
type OrderKey = (u8, (u8, String), usize, String, String);

fn order_key(s: &ScenarioSummary) -> OrderKey {
    (
        s.readiness as u8,
        crate::band_sort_key(s.goal_band.as_deref()),
        s.unlocks.len(),
        s.goal_id.clone(),
        s.scenario_id.clone(),
    )
}

/// Gate, label, and readiness for every scenario in one pack, given its
/// goal map, its scenarios, and the profile's derived mastery. Pure over
/// pack data — `list_at` feeds it the parsed pack, and the tests can feed
/// it the real pack files without opening a store.
pub fn summaries_for<'a>(
    scenarios: impl Iterator<Item = &'a PackScenario>,
    goals: &HashMap<String, crate::PackGoal>,
    derived: &[lts_learner_model::DerivedMastery],
    situation: &dyn Fn(&str) -> Option<String>,
) -> Vec<ScenarioSummary> {
    // Facts first, tier second: "near" is relative to the highest band this
    // profile can already play in this pack, which is only known once every
    // scenario in the pack has been checked.
    struct Pending {
        row: ScenarioSummary,
        goal_defined: bool,
        met_count: usize,
        in_progress: usize,
    }
    let mut pending: Vec<Pending> = Vec::new();
    for sc in scenarios {
        let goal = goals.get(&sc.goal_id);
        let goal_defined = goal.is_some();
        let hard: Vec<&crate::PackPrereq> = goal
            .map(|g| {
                g.prerequisites
                    .iter()
                    .filter(|p| p.strength == "hard")
                    .collect()
            })
            .unwrap_or_default();
        let unmet: Vec<UnmetPrereq> = hard
            .iter()
            .filter(|p| !prereq_met(derived, p))
            .map(|p| UnmetPrereq {
                target: p.target.clone(),
                dimension: p.dimension.clone(),
                required_state: p.required_state.clone(),
                target_is_goal: goals.contains_key(&p.target),
            })
            .collect();
        let in_progress = hard
            .iter()
            .filter(|p| !prereq_met(derived, p) && prereq_under_way(derived, p))
            .count();
        let playable = goal.map(|g| hard_prereqs_met(g, derived)).unwrap_or(false);
        let (lock_kind, locked_reason, unlocks) = if playable {
            (None, None, Vec::new())
        } else if !goal_defined {
            (
                Some(LockKind::UndefinedGoal),
                Some(format!(
                    "not open yet — this pack does not define goal {}",
                    sc.goal_id
                )),
                vec![format!("a pack update that defines goal {}", sc.goal_id)],
            )
        } else {
            let (kind, reason, hints) = lock_of(&unmet);
            (Some(kind), Some(reason), hints)
        };
        pending.push(Pending {
            row: ScenarioSummary {
                scenario_id: sc.id.clone(),
                title: sc.title.clone(),
                situation: sc.situation.clone().map(|s| situation(&s).unwrap_or(s)),
                goal_id: sc.goal_id.clone(),
                goal_band: goal.and_then(|g| g.band.clone()),
                // Replaced once the whole pack has been checked.
                readiness: Readiness::Later,
                unlocked: playable,
                locked_reason,
                lock_kind,
                unlocks,
                recommended: false,
            },
            goal_defined,
            met_count: hard.len() - unmet.len(),
            in_progress,
        });
    }
    let reached: Option<String> = pending
        .iter()
        .filter(|p| p.row.unlocked)
        .filter_map(|p| p.row.goal_band.as_deref())
        .max_by(|a, b| crate::band_sort_key(Some(a)).cmp(&crate::band_sort_key(Some(b))))
        .map(str::to_string);
    for p in pending.iter_mut() {
        p.row.readiness = readiness_of(ReadinessFacts {
            goal_defined: p.goal_defined,
            hard_prereqs_met: p.row.unlocked,
            hard_prereqs_met_count: p.met_count,
            in_progress_unmet: p.in_progress,
            goal_band: p.row.goal_band.as_deref(),
            reached_band: reached.as_deref(),
        });
    }
    pending.into_iter().map(|p| p.row).collect()
}

/// List scenarios from every pack the profile studies, with honest lock
/// state from the prerequisite contract, ordered by readiness and labelled
/// with what unlocks each locked one (K-75).
pub fn list_at(data: &Path, profile_id: &str) -> Result<Vec<ScenarioSummary>, String> {
    let store = lts_storage::Store::open(data.join("profiles.db")).map_err(|e| e.to_string())?;
    let selected = store
        .selected_packs(profile_id)
        .map_err(|e| e.to_string())?;
    let derived = derive_pairs(&store, profile_id, &rfc3339_utc(now_secs()))?;
    let mut out: Vec<ScenarioSummary> = Vec::new();
    for (pack_id, _v) in selected {
        let (runtime, _version) = runtime_for(data, &pack_id)?;
        let packs_root = data.join("packs");
        let version = lts_langpack::archive::current_version(&pack_id, &packs_root)
            .ok_or_else(|| format!("pack {pack_id} not installed"))?;
        let goals_path = packs_root
            .join(&pack_id)
            .join(&version)
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
        out.extend(summaries_for(
            runtime.scenarios(),
            &goals,
            &derived,
            &|id| situation_label(data, id),
        ));
    }
    Ok(order_summaries(out))
}

/// Resolve a situation id to its human label from an installed pack's
/// `language/pragmatics.yaml`. `None` when no name is defined; callers
/// fall back to the raw id (honest, never invented).
pub(crate) fn situation_label(data: &Path, id: &str) -> Option<String> {
    let packs_dir = data.join("packs");
    let Ok(packs) = std::fs::read_dir(&packs_dir) else {
        return None;
    };
    for pack in packs.filter_map(|e| e.ok()) {
        let Ok(versions) = std::fs::read_dir(pack.path()) else {
            continue;
        };
        for v in versions.filter_map(|e| e.ok()) {
            let Ok(text) = std::fs::read_to_string(v.path().join("language/pragmatics.yaml"))
            else {
                continue;
            };
            let Ok(doc) = serde_yaml::from_str::<serde_yaml::Value>(&text) else {
                continue;
            };
            if let Some(situations) = doc.get("situations").and_then(|s| s.as_sequence()) {
                for s in situations {
                    if s.get("id").and_then(|i| i.as_str()) == Some(id) {
                        if let Some(name) = s.get("name").and_then(|n| n.as_str()) {
                            return Some(name.to_string());
                        }
                    }
                }
            }
        }
    }
    None
}

fn view_of(data: &Path, sc: &PackScenario, session: &ScenarioSession) -> ScenarioView {
    let (prompt, actions) = session.active_prompt();
    let node = session.current_node();
    ScenarioView {
        scenario_id: sc.id.clone(),
        title: sc.title.clone(),
        situation: sc
            .situation
            .clone()
            .map(|s| situation_label(data, &s).unwrap_or(s)),
        node: NodeView {
            id: node.id.clone(),
            prompt: prompt.to_string(),
            actions: actions
                .iter()
                .map(|intent| ActionView {
                    intent: intent.clone(),
                    label: node
                        .action_labels
                        .get(intent.as_str())
                        .cloned()
                        .unwrap_or_else(|| "Respond".to_string()),
                })
                .collect(),
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
        // U07: help is delivered by `support_at` only; every other
        // command shows a fresh (or advanced) prompt, so no stale card.
        delivered_help: None,
    }
}

/// Begin (or restart) a session. Enforces the unlock gate. `session_id`
/// names this sitting: it is what keeps a replay's evidence separate from an
/// earlier run's instead of colliding with it (review finding R03).
pub fn start_at(
    data: &Path,
    profile_id: &str,
    scenario_id: &str,
    session_id: &str,
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
    let session = ScenarioSession::begin(&sc, session_id).ok_or("scenario has no nodes")?;
    let view = view_of(data, &sc, &session);
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
    let mut view = view_of(data, &sc, session);
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
    let ((), sc) = with_session(sessions, profile_id, scenario_id, data, |s| {
        if s.use_support(level) {
            Ok(())
        } else {
            Err(format!(
                "support level {level} is not declared by this scenario"
            ))
        }
    })?;
    let mut guard = sessions.lock().map_err(|_| "session store poisoned")?;
    let session = guard
        .get_mut(&session_key(profile_id, scenario_id))
        .ok_or("no session")?;
    // U07: the rung the learner just pressed must deliver the pack's
    // help payload for this node at this level — never an empty box.
    let delivered = session
        .current_node()
        .support
        .iter()
        .find(|s| s.level == level)
        .map(|s| HelpView {
            kind: s.kind.clone(),
            text: s.text.clone(),
            options: s.options.clone(),
        });
    let mut view = view_of(data, &sc, session);
    view.support_used = session.support_used_snapshot();
    view.delivered_help = delivered;
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
    let mut view = view_of(data, &sc, session);
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
    let mut view = view_of(data, &sc, session);
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
        // R03: the store refuses a duplicate event id rather than
        // double-counting. A refusal means this attempt was never recorded,
        // so reporting a finished scenario would misstate the learner's
        // record — surface it as an error instead.
        if !store.append_evidence(ev).map_err(|e| e.to_string())? {
            return Err(format!(
                "evidence for {} was not recorded",
                ev.event_id.as_str()
            ));
        }
    }
    Ok(OutcomeView {
        nodes_completed: outcome.nodes.iter().filter(|n| n.succeeded).count() as u32,
        exchanges_total: outcome.exchanges_total as u32,
        completed: outcome.completed,
        transfers_completed: outcome.transfers_completed.len() as u32,
        transfers_required: outcome.transfers_required,
        transfer_requirement_met: outcome.transfer_requirement_met,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    // Wire contract: apps/desktop/src/scenario.tsx and the scenario call
    // sites in App.tsx read these fields by snake_case name. A
    // `#[serde(rename_all = "kebab-case")]` creeping back onto any view
    // struct makes `scenarioId` undefined at the invoke boundary and every
    // scenario action dies with "missing required key scenarioId" (K-60).
    #[test]
    fn scenario_views_serialize_snake_case_keys() {
        let summary = ScenarioSummary {
            scenario_id: "ja.scenario.first-meeting".into(),
            title: "First meeting".into(),
            situation: Some("An acquaintance waves at you.".into()),
            goal_id: "ja.goal.onramp.respond-to-greeting".into(),
            goal_band: Some("on-ramp".into()),
            readiness: Readiness::Playable,
            unlocked: true,
            locked_reason: None,
            lock_kind: None,
            unlocks: Vec::new(),
            recommended: true,
        };
        let mut keys: Vec<String> = serde_json::to_value(&summary)
            .expect("summary serializes")
            .as_object()
            .expect("summary is an object")
            .keys()
            .cloned()
            .collect();
        keys.sort();
        assert_eq!(
            keys,
            [
                "goal_band",
                "goal_id",
                "lock_kind",
                "locked_reason",
                "readiness",
                "recommended",
                "scenario_id",
                "situation",
                "title",
                "unlocked",
                "unlocks"
            ]
        );

        let view = ScenarioView {
            scenario_id: summary.scenario_id.clone(),
            title: summary.title.clone(),
            situation: summary.situation.clone(),
            node: NodeView {
                id: "node-1".into(),
                prompt: "How do you answer?".into(),
                actions: vec![ActionView {
                    intent: "greeting".into(),
                    label: "Greet them back".into(),
                }],
                recovery: vec![RecoveryView {
                    id: "recovery-1".into(),
                    prompt: "Try a smaller move".into(),
                }],
            },
            ladder: vec![LadderView {
                support_level: 1,
                description: "First ladder rung".into(),
            }],
            transfers: vec![TransferView {
                id: "transfer-1".into(),
                description: "Say it to a friend".into(),
                done: false,
            }],
            transfers_required: 1,
            support_used: vec![1],
            delivered_help: Some(HelpView {
                kind: "model".into(),
                text: "こんにちは。".into(),
                options: Vec::new(),
            }),
        };
        let mut keys: Vec<String> = serde_json::to_value(&view)
            .expect("view serializes")
            .as_object()
            .expect("view is an object")
            .keys()
            .cloned()
            .collect();
        keys.sort();
        assert_eq!(
            keys,
            [
                "delivered_help",
                "ladder",
                "node",
                "scenario_id",
                "situation",
                "support_used",
                "title",
                "transfers",
                "transfers_required"
            ]
        );

        // U07: the button split is wire contract — the UI renders
        // `label` and submits `intent`, and the help card branches on
        // `kind`/`text`/`options`. A rename kills both silently.
        let action = serde_json::to_value(&view.node.actions[0]).expect("action serializes");
        let mut action_keys: Vec<String> = action
            .as_object()
            .expect("action is an object")
            .keys()
            .cloned()
            .collect();
        action_keys.sort();
        assert_eq!(action_keys, ["intent", "label"]);
        let help = serde_json::to_value(view.delivered_help.as_ref().expect("help delivered"))
            .expect("help serializes");
        let mut help_keys: Vec<String> = help
            .as_object()
            .expect("help is an object")
            .keys()
            .cloned()
            .collect();
        help_keys.sort();
        assert_eq!(help_keys, ["kind", "options", "text"]);

        // U08: the finish view carries the honest totals; the TS side
        // branches on `completed`, so both keys are wire contract.
        let outcome = OutcomeView {
            nodes_completed: 2,
            exchanges_total: 3,
            completed: false,
            transfers_completed: 0,
            transfers_required: 1,
            transfer_requirement_met: false,
        };
        let mut keys: Vec<String> = serde_json::to_value(&outcome)
            .expect("outcome serializes")
            .as_object()
            .expect("outcome is an object")
            .keys()
            .cloned()
            .collect();
        keys.sort();
        assert_eq!(
            keys,
            [
                "completed",
                "exchanges_total",
                "nodes_completed",
                "transfer_requirement_met",
                "transfers_completed",
                "transfers_required"
            ]
        );
    }

    // The UI branches on these strings, so a renamed variant is a wire
    // break, not a refactor.
    #[test]
    fn readiness_and_lock_kinds_serialize_as_the_ts_union_strings() {
        let values: Vec<(Readiness, &str)> = vec![
            (Readiness::Playable, "playable"),
            (Readiness::Near, "near"),
            (Readiness::Later, "later"),
        ];
        for (kind, wire) in values {
            assert_eq!(serde_json::to_value(kind).expect("serializes"), wire);
        }
        let kinds: Vec<(LockKind, &str)> = vec![
            (LockKind::Capability, "capability"),
            (LockKind::Stage, "stage"),
            (LockKind::UndefinedGoal, "undefined_goal"),
        ];
        for (kind, wire) in kinds {
            assert_eq!(serde_json::to_value(kind).expect("serializes"), wire);
        }
    }

    fn row(
        id: &str,
        goal: &str,
        band: Option<&str>,
        readiness: Readiness,
        unlocks: &[&str],
    ) -> ScenarioSummary {
        let locked = readiness != Readiness::Playable;
        ScenarioSummary {
            scenario_id: id.into(),
            title: format!("{id} title"),
            situation: None,
            goal_id: goal.into(),
            goal_band: band.map(str::to_string),
            readiness,
            unlocked: !locked,
            locked_reason: locked.then(|| format!("not open yet — practice first: {id}")),
            lock_kind: locked.then_some(LockKind::Capability),
            unlocks: unlocks.iter().map(|s| (*s).to_string()).collect(),
            recommended: false,
        }
    }

    fn prereq(target: &str, target_is_goal: bool) -> UnmetPrereq {
        UnmetPrereq {
            target: target.into(),
            dimension: "recall-meaning".into(),
            required_state: "supported".into(),
            target_is_goal,
        }
    }

    // K-75: "Finding the station" (a later A1 goal) led the list while the
    // playable day-one "First meeting" sat below it, because directions.yaml
    // sorts before first-meeting.yaml. Readiness plus the pack's own goal
    // band ladder decide; input order never does.
    #[test]
    fn playable_rows_lead_later_stage_rows_in_either_input_order() {
        let later = row(
            "ja.scenario.directions.station",
            "ja.goal.a1.ask-location",
            Some("A1"),
            Readiness::Later,
            &["ja.lex.demonstratives.koko"],
        );
        let playable = row(
            "ja.scenario.first-meeting.greeting",
            "ja.goal.onramp.respond-to-greeting",
            Some("on-ramp"),
            Readiness::Playable,
            &[],
        );
        for input in [
            vec![later.clone(), playable.clone()],
            vec![playable.clone(), later.clone()],
        ] {
            let ids: Vec<String> = order_summaries(input)
                .into_iter()
                .map(|r| r.scenario_id)
                .collect();
            assert_eq!(
                ids,
                [
                    "ja.scenario.first-meeting.greeting",
                    "ja.scenario.directions.station"
                ],
                "the day-one scenario leads regardless of pack/file order"
            );
        }
    }

    #[test]
    fn near_rows_sit_between_playable_and_later_rows() {
        let rows = order_summaries(vec![
            row(
                "later",
                "ja.goal.b1.later",
                Some("B1"),
                Readiness::Later,
                &["x", "y"],
            ),
            row(
                "near",
                "ja.goal.a1.near",
                Some("A1"),
                Readiness::Near,
                &["x"],
            ),
            row(
                "playable",
                "ja.goal.onramp.open",
                Some("on-ramp"),
                Readiness::Playable,
                &[],
            ),
        ]);
        let tiers: Vec<Readiness> = rows.iter().map(|r| r.readiness).collect();
        assert_eq!(
            tiers,
            [Readiness::Playable, Readiness::Near, Readiness::Later]
        );
    }

    #[test]
    fn within_a_tier_the_band_ladder_then_the_smallest_gate_wins() {
        let rows = order_summaries(vec![
            row("b2", "ja.goal.b2.x", Some("B2"), Readiness::Later, &[]),
            row(
                "a1-wide",
                "ja.goal.a1.wide",
                Some("A1"),
                Readiness::Later,
                &["p", "q"],
            ),
            row(
                "a1-narrow",
                "ja.goal.a1.narrow",
                Some("A1"),
                Readiness::Later,
                &["p"],
            ),
            row(
                "on-ramp",
                "ja.goal.onramp.q",
                Some("on-ramp"),
                Readiness::Later,
                &["p"],
            ),
        ]);
        let ids: Vec<&str> = rows.iter().map(|r| r.scenario_id.as_str()).collect();
        assert_eq!(ids, ["on-ramp", "a1-narrow", "a1-wide", "b2"]);
    }

    #[test]
    fn the_recommendation_is_the_first_playable_row_and_there_is_one() {
        let rows = order_summaries(vec![
            row("a1", "ja.goal.a1.a", Some("A1"), Readiness::Playable, &[]),
            row(
                "on-ramp",
                "ja.goal.onramp.b",
                Some("on-ramp"),
                Readiness::Playable,
                &[],
            ),
            row("near", "ja.goal.a1.c", Some("A1"), Readiness::Near, &["x"]),
        ]);
        let recommended: Vec<&str> = rows
            .iter()
            .filter(|r| r.recommended)
            .map(|r| r.scenario_id.as_str())
            .collect();
        assert_eq!(recommended, ["on-ramp"]);
        assert!(rows[0].recommended, "the pointer sits on the top row");
    }

    #[test]
    fn nothing_is_recommended_while_every_scenario_is_locked() {
        let rows = order_summaries(vec![
            row("a", "ja.goal.a1.a", Some("A1"), Readiness::Later, &["x"]),
            row("b", "ja.goal.a1.b", Some("A1"), Readiness::Near, &["x"]),
        ]);
        assert!(rows.iter().all(|r| !r.recommended));
    }

    #[test]
    fn readiness_is_playable_only_when_the_hard_gate_is_met() {
        assert_eq!(
            readiness_of(ReadinessFacts {
                goal_defined: true,
                hard_prereqs_met: true,
                ..Default::default()
            }),
            Readiness::Playable
        );
    }

    #[test]
    fn readiness_is_near_when_the_gate_is_part_open_or_the_same_stage() {
        // A hard prerequisite already cleared, the rest still missing.
        assert_eq!(
            readiness_of(ReadinessFacts {
                goal_defined: true,
                hard_prereqs_met_count: 1,
                goal_band: Some("A1"),
                ..Default::default()
            }),
            Readiness::Near
        );
        // Part-way up an unmet prerequisite on the declared dimension.
        assert_eq!(
            readiness_of(ReadinessFacts {
                goal_defined: true,
                in_progress_unmet: 1,
                goal_band: Some("A2"),
                reached_band: Some("on-ramp"),
                ..Default::default()
            }),
            Readiness::Near
        );
        // No progress yet, but the same stage as something already playable.
        assert_eq!(
            readiness_of(ReadinessFacts {
                goal_defined: true,
                goal_band: Some("A1"),
                reached_band: Some("A1"),
                ..Default::default()
            }),
            Readiness::Near
        );
    }

    #[test]
    fn readiness_is_later_for_an_untouched_later_stage_or_an_undefined_goal() {
        assert_eq!(
            readiness_of(ReadinessFacts {
                goal_defined: true,
                goal_band: Some("A2"),
                reached_band: Some("on-ramp"),
                ..Default::default()
            }),
            Readiness::Later
        );
        // A goal the pack never defines is never playable, whatever the gate
        // would say.
        assert_eq!(
            readiness_of(ReadinessFacts {
                goal_defined: false,
                hard_prereqs_met: true,
                goal_band: Some("on-ramp"),
                reached_band: Some("on-ramp"),
                ..Default::default()
            }),
            Readiness::Later
        );
    }

    #[test]
    fn a_content_gate_names_the_capability_and_how_to_unlock_it() {
        let (kind, reason, unlocks) = lock_of(&[prereq("ja.lex.demonstratives.koko", false)]);
        assert_eq!(kind, LockKind::Capability);
        assert!(reason.contains("practice first"), "{reason}");
        assert!(reason.contains("ja.lex.demonstratives.koko"), "{reason}");
        assert_eq!(
            unlocks,
            ["practice ja.lex.demonstratives.koko to supported (recall-meaning)"]
        );
    }

    #[test]
    fn a_goal_gate_is_labelled_a_later_curriculum_stage() {
        let (kind, reason, unlocks) = lock_of(&[prereq("ja.goal.a1.ask-location", true)]);
        assert_eq!(kind, LockKind::Stage);
        assert!(reason.contains("later stage"), "{reason}");
        assert!(reason.contains("goal ja.goal.a1.ask-location"), "{reason}");
        assert_eq!(unlocks, ["reach goal ja.goal.a1.ask-location first"]);
    }

    #[test]
    fn a_mixed_gate_stays_the_actionable_one_and_lists_every_rung() {
        let (kind, _, unlocks) = lock_of(&[
            prereq("ja.goal.a1.ask-location", true),
            prereq("ja.lex.demonstratives.koko", false),
        ]);
        assert_eq!(kind, LockKind::Capability);
        assert_eq!(unlocks.len(), 2);
    }

    /// The shipped ja-JP pack is the case the owner hit: a fresh profile was
    /// shown a locked later-stage scenario at the top of the list because
    /// directions.yaml sorts before first-meeting.yaml. Order, labels, and
    /// the pointer must come from the pack's own goal bands and prereq
    /// records, so this test reads that data instead of naming ids.
    #[test]
    fn the_shipped_pack_leads_with_an_openable_scenario_for_a_fresh_profile() {
        let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../../languages/ja-JP");
        let runtime = crate::packcache::runtime(&root).expect("the shipped pack parses");
        let goals: HashMap<String, crate::PackGoal> = serde_yaml::from_str::<crate::PackGoals>(
            &std::fs::read_to_string(root.join("curriculum/goals.yaml")).unwrap(),
        )
        .expect("the shipped goal map parses")
        .goals
        .into_iter()
        .map(|g| (g.id.clone(), g))
        .collect();
        // A fresh profile: no evidence, so no derived mastery at all.
        let rows = order_summaries(summaries_for(
            runtime.scenarios(),
            &goals,
            &[],
            &|_situation| Option::<String>::None,
        ));
        assert!(rows.len() > 1, "the shipped pack offers more than one");

        // A locked row never sits above an open one.
        if let Some(first_locked) = rows.iter().position(|r| !r.unlocked) {
            assert!(
                rows[first_locked..].iter().all(|r| !r.unlocked),
                "playable rows lead: {:?}",
                rows.iter()
                    .map(|r| (r.scenario_id.as_str(), r.readiness))
                    .collect::<Vec<_>>()
            );
        }

        // Exactly one pointer, on the top row, in the earliest band the pack
        // offers a scenario for.
        let top = rows.first().expect("the shipped pack lists scenarios");
        assert!(
            top.unlocked && top.recommended,
            "the top row is open and recommended: {:?}",
            (top.scenario_id.as_str(), top.readiness)
        );
        assert!(rows[1..].iter().all(|r| !r.recommended), "one pointer only");
        let lowest = rows
            .iter()
            .filter_map(|r| r.goal_band.as_deref())
            .min_by(|a, b| crate::band_sort_key(Some(a)).cmp(&crate::band_sort_key(Some(b))))
            .expect("shipped scenario goals carry bands");
        assert_eq!(top.goal_band.as_deref(), Some(lowest));

        // Every locked row states its gate and what unlocks it.
        for r in rows.iter().filter(|r| !r.unlocked) {
            assert!(r.lock_kind.is_some(), "{} names its gate", r.scenario_id);
            assert!(
                !r.unlocks.is_empty(),
                "{} names what unlocks it",
                r.scenario_id
            );
        }
    }
}
