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
    /// True when the CURRENT node carries a support payload at this
    /// level. Packs published before 2026-10-19 (0.4.0–0.4.2) declare
    /// ladder rungs but ship no per-node `support` payloads; for those
    /// the rung is not pressable: the UI disables it and says why, and
    /// `support_at` refuses it without consuming it or stamping the
    /// node's evidence.
    pub delivered: bool,
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

/// One unmet hard prerequisite, rendered for copy: the pack's declared
/// gate plus the human display data resolved from pack metadata. Deliberately
/// carries no raw target id — by the time a gate becomes this record, only
/// the pack-supplied name or an honest fallback may reach the learner
/// (SCENARIO-LOCK-COPY-001).
#[derive(Clone, Debug)]
pub struct UnmetPrereq {
    pub dimension: String,
    pub required_state: String,
    /// True when the target is itself a goal in the same goal map: the gate
    /// is curriculum stage, not a capability the learner can drill.
    pub target_is_goal: bool,
    /// Learner-facing name resolved from the pack's own content metadata
    /// (lexicon gloss, grammar concept name, kana label, or the goal map's
    /// description). `None` when the pack defines no display name; lock copy
    /// then falls back to a generic honest phrase, never the raw id
    /// (SCENARIO-LOCK-COPY-001).
    pub display_name: Option<String>,
    /// Where the prerequisite is practiced, as a human unit title from the
    /// pack's curriculum (first unit that references the content, or first
    /// unit whose goal is this goal). `None` when no unit names it.
    pub practice_title: Option<String>,
}

/// SCENARIO-LOCK-COPY-001: pack display data for lock copy, read from the
/// installed pack's own files — the same raw-pack-data precedent as
/// `situation_label` and the goals map. Never hardcoded per language: every
/// name and place is a field the pack itself ships.
#[derive(Default, Clone)]
pub struct PackCopyIndex {
    /// content id -> learner-facing name (lexicon gloss, grammar concept
    /// name, orthography symbol label)
    names: HashMap<String, String>,
    /// content id -> title of the first (teaching-order) unit practicing it
    practice: HashMap<String, String>,
    /// goal id -> title of the first unit whose goal_id names it
    goal_practice: HashMap<String, String>,
}

impl PackCopyIndex {
    /// Read lexicon/grammar/orthography names and unit practice hosts from a
    /// pack root. Missing or malformed pieces are skipped, never fatal: the
    /// copy falls back to honest generic phrases per id.
    pub fn load(root: &Path) -> Self {
        let mut idx = Self::default();
        for file in data_files(root, "lexicon") {
            for line in jsonl_lines(&file) {
                let Ok(doc) = serde_json::from_str::<serde_json::Value>(&line) else {
                    continue;
                };
                let Some(id) = doc.get("id").and_then(|i| i.as_str()) else {
                    continue;
                };
                if let Some(name) = gloss_label(&doc) {
                    idx.names.entry(id.to_string()).or_insert(name);
                }
            }
        }
        for file in data_files(root, "grammar") {
            for line in jsonl_lines(&file) {
                let Ok(doc) = serde_json::from_str::<serde_json::Value>(&line) else {
                    continue;
                };
                let id = doc.get("id").and_then(|i| i.as_str()).unwrap_or("");
                if let Some(name) = doc.get("name").and_then(|n| n.as_str()) {
                    let name = name.trim();
                    if !id.is_empty() && !name.is_empty() {
                        idx.names.entry(id.to_string()).or_insert(name.to_string());
                    }
                }
            }
        }
        for file in data_files(root, "orthography") {
            for line in jsonl_lines(&file) {
                let Ok(doc) = serde_json::from_str::<serde_json::Value>(&line) else {
                    continue;
                };
                let id = doc.get("id").and_then(|i| i.as_str()).unwrap_or("");
                let symbol = doc.get("symbol").and_then(|s| s.as_str()).unwrap_or("");
                if id.is_empty() || symbol.is_empty() {
                    continue;
                }
                let script = doc.get("script").and_then(|s| s.as_str()).unwrap_or("");
                let reading = doc.get("reading").and_then(|s| s.as_str()).unwrap_or("");
                let mut name = String::new();
                if !script.is_empty() {
                    name.push_str(script);
                    name.push(' ');
                }
                name.push_str(symbol);
                if !reading.is_empty() && reading != symbol {
                    name.push_str(" (");
                    name.push_str(reading);
                    name.push(')');
                }
                idx.names.entry(id.to_string()).or_insert(name);
            }
        }
        for file in data_files(root, "curriculum/units") {
            let Ok(text) = std::fs::read_to_string(&file) else {
                continue;
            };
            let Ok(doc) = serde_yaml::from_str::<serde_yaml::Value>(&text) else {
                continue;
            };
            let title = match doc.get("title").and_then(|t| t.as_str()) {
                Some(t) if !t.trim().is_empty() => t.trim().to_string(),
                _ => continue,
            };
            if let Some(goal) = doc.get("goal_id").and_then(|g| g.as_str()) {
                idx.goal_practice
                    .entry(goal.to_string())
                    .or_insert_with(|| title.clone());
            }
            let refs_of = |seq: Option<&serde_yaml::Value>| -> Vec<String> {
                seq.and_then(|s| s.as_sequence())
                    .map(|s| {
                        s.iter()
                            .filter_map(|v| v.as_str().map(str::to_string))
                            .collect()
                    })
                    .unwrap_or_default()
            };
            let mut refs: Vec<String> = doc
                .get("activities")
                .and_then(|a| a.as_sequence())
                .map(|acts| {
                    acts.iter()
                        .flat_map(|a| refs_of(a.get("content_refs")).into_iter())
                        .collect()
                })
                .unwrap_or_default();
            if let Some(gc) = doc.get("generation_contract") {
                refs.extend(refs_of(gc.get("allowed_vocab")));
                refs.extend(refs_of(gc.get("allowed_grammar")));
            }
            for r in refs {
                idx.practice.entry(r).or_insert_with(|| title.clone());
            }
        }
        idx
    }

    pub fn name(&self, id: &str) -> Option<&str> {
        self.names.get(id).map(String::as_str)
    }

    pub fn practice(&self, id: &str) -> Option<&str> {
        self.practice.get(id).map(String::as_str)
    }

    pub fn goal_practice(&self, goal_id: &str) -> Option<&str> {
        self.goal_practice.get(goal_id).map(String::as_str)
    }
}

/// Sorted regular files directly under `root/<dir>` (deterministic order:
/// unit file names carry teaching-order prefixes, so file order is the
/// pack's own first-taught order).
fn data_files(root: &Path, dir: &str) -> Vec<std::path::PathBuf> {
    let mut out: Vec<_> = std::fs::read_dir(root.join(dir))
        .ok()
        .into_iter()
        .flatten()
        .filter_map(|e| e.ok())
        .map(|e| e.path())
        .filter(|p| p.is_file())
        .collect();
    out.sort();
    out
}

fn jsonl_lines(file: &std::path::Path) -> Vec<String> {
    std::fs::read_to_string(file)
        .map(|t| t.lines().map(str::to_string).collect())
        .unwrap_or_default()
}

/// Learner-facing name from a lexicon entry's glosses: prefer the app UI
/// locale's gloss, else any gloss the pack ships; cut at the first clause
/// boundary and keep it short enough to read inside a lock line.
fn gloss_label(doc: &serde_json::Value) -> Option<String> {
    let glosses = doc.get("glosses")?.as_object()?;
    let list = glosses
        .get("en-US")
        .or_else(|| glosses.values().next())
        .and_then(|v| v.as_array());
    let first = list?.first()?.as_str()?.trim();
    let head = first.split(';').next().unwrap_or("").trim();
    short_label(head, 48)
}

/// First clause of a pack-declared sentence (goal descriptions read
/// "Do the thing: the long detail list"), bounded for one-line copy.
fn short_label(text: &str, max_chars: usize) -> Option<String> {
    let flat: String = text.split_whitespace().collect::<Vec<_>>().join(" ");
    let head = flat
        .split([':', '.'])
        .next()
        .unwrap_or("")
        .trim()
        .to_string();
    if head.is_empty() {
        return None;
    }
    if head.chars().count() <= max_chars {
        return Some(head);
    }
    let cut: Vec<usize> = head
        .char_indices()
        .take_while(|(i, _)| *i <= max_chars)
        .map(|(i, _)| i)
        .collect();
    let edge = *cut.last()?;
    let trimmed = head[..edge].trim_end();
    match trimmed.rfind(' ') {
        Some(sp) if sp > 12 => Some(format!("{}…", &trimmed[..sp])),
        _ => Some(format!("{}…", trimmed)),
    }
}

/// Process-wide copy index per installed pack version, keyed by the immutable
/// pack root (the same correctness argument packcache K-63 rests on). A fresh
/// pack version is a new directory, hence a new key; loads never fail, so
/// caching is always honest.
static COPY_CACHE: std::sync::LazyLock<
    std::sync::Mutex<HashMap<std::path::PathBuf, std::sync::Arc<PackCopyIndex>>>,
> = std::sync::LazyLock::new(|| std::sync::Mutex::new(HashMap::new()));

fn copy_index(root: &Path) -> std::sync::Arc<PackCopyIndex> {
    let mut cache = COPY_CACHE.lock().unwrap_or_else(|e| e.into_inner());
    if let Some(hit) = cache.get(root) {
        return std::sync::Arc::clone(hit);
    }
    let idx = std::sync::Arc::new(PackCopyIndex::load(root));
    cache.insert(root.to_path_buf(), std::sync::Arc::clone(&idx));
    idx
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

/// SCENARIO-LOCK-COPY-001: the learner-facing name of an unmet prerequisite,
/// resolved from pack display data — a lexicon gloss, a grammar concept name,
/// a kana label, or the goal map's own description. When the pack defines no
/// name, the copy says so generically; the raw id never reaches the learner.
fn prereq_name(p: &UnmetPrereq) -> String {
    if p.target_is_goal {
        match &p.display_name {
            Some(n) => format!("goal \"{n}\""),
            None => "a later goal of this curriculum".to_string(),
        }
    } else {
        format!(
            "{} ({} → {})",
            shown_prereq_name(p),
            p.dimension,
            p.required_state
        )
    }
}

fn unlock_hint(p: &UnmetPrereq) -> String {
    let base = if p.target_is_goal {
        match &p.display_name {
            Some(n) => format!("reach \"{n}\" first"),
            None => "reach a later goal of this curriculum first".to_string(),
        }
    } else {
        format!(
            "practice {} to {} ({})",
            shown_prereq_name(p),
            p.required_state,
            p.dimension
        )
    };
    // Name where the prerequisite is practiced, from the pack's own
    // curriculum (the first unit that teaches it), when one does.
    match &p.practice_title {
        Some(t) => format!("{base} — practiced in \"{t}\""),
        None => base,
    }
}

/// The prerequisite's display name as it appears in a sentence: quoted when
/// a pack-supplied name resolved, otherwise the honest generic phrase.
fn shown_prereq_name(p: &UnmetPrereq) -> String {
    match &p.display_name {
        Some(n) => format!("\"{n}\""),
        None => "a skill you have not started yet".to_string(),
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
/// goal map, its scenarios, the profile's derived mastery, and the pack's
/// display index (names/practice locations for lock copy). Pure over pack
/// data — `list_at` feeds it the parsed pack, and the tests can feed it the
/// real pack files without opening a store.
pub fn summaries_for<'a>(
    scenarios: impl Iterator<Item = &'a PackScenario>,
    goals: &HashMap<String, crate::PackGoal>,
    derived: &[lts_learner_model::DerivedMastery],
    situation: &dyn Fn(&str) -> Option<String>,
    copy: &PackCopyIndex,
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
            .map(|p| {
                let target_is_goal = goals.contains_key(&p.target);
                // SCENARIO-LOCK-COPY-001: resolve the human name and the
                // practice host from the pack's own data — the goal map's
                // description for a stage gate, the content metadata for a
                // capability gate.
                let display_name = if target_is_goal {
                    goals
                        .get(&p.target)
                        .and_then(|g| short_label(&g.description, 64))
                } else {
                    copy.name(&p.target).map(str::to_string)
                };
                let practice_title = if target_is_goal {
                    copy.goal_practice(&p.target).map(str::to_string)
                } else {
                    copy.practice(&p.target).map(str::to_string)
                };
                UnmetPrereq {
                    dimension: p.dimension.clone(),
                    required_state: p.required_state.clone(),
                    target_is_goal,
                    display_name,
                    practice_title,
                }
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
                Some(
                    "not open yet — this pack does not define a goal for this scenario".to_string(),
                ),
                vec!["a pack update that defines this scenario's goal".to_string()],
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
        let root = packs_root.join(&pack_id).join(&version);
        let goals_path = root.join("curriculum/goals.yaml");
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
            &copy_index(&root),
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
                delivered: node.support.iter().any(|p| p.level == s.support_level),
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
        // Honesty before mutation: resolve payload availability for the
        // requested level on the CURRENT node FIRST. A pack that declares
        // the rung but carries no payload for this step must not consume
        // it (support_used) nor stamp the node's evidence (support_level)
        // — a phantom rung press used to silently void the node's
        // contribution to the supported stage.
        if !s.current_node().support.iter().any(|p| p.level == level) {
            return Err(format!(
                "this pack delivers no help at level {level} for this step"
            ));
        }
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
                delivered: true,
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
        // U07: every ladder rung on the wire carries `delivered` — the
        // UI disables (and annotates) rungs the pack cannot deliver, so
        // the key is wire contract like the action split.
        let rung = serde_json::to_value(&view.ladder[0]).expect("rung serializes");
        let mut rung_keys: Vec<String> = rung
            .as_object()
            .expect("rung is an object")
            .keys()
            .cloned()
            .collect();
        rung_keys.sort();
        assert_eq!(rung_keys, ["delivered", "description", "support_level"]);
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

    /// A capability-gate record with no resolved name/place (the fallback
    /// shape). `_target` names the gate at the call site for readability;
    /// the record itself carries no raw id.
    fn prereq(_target: &str, target_is_goal: bool) -> UnmetPrereq {
        UnmetPrereq {
            dimension: "recall-meaning".into(),
            required_state: "supported".into(),
            target_is_goal,
            display_name: None,
            practice_title: None,
        }
    }

    /// Copy scanner for leaked pack identifiers: a dotted token with three
    /// or more segments whose first segment is a short all-lowercase tag
    /// (`ja.lex.demonstratives.koko`, `x.goal.eat`-family ids). Ordinary
    /// copy — hyphenated dimension words, decimal-free prose — never
    /// matches (SCENARIO-LOCK-COPY-001 gate).
    fn pack_id_like(s: &str) -> Option<String> {
        let idch = |c: char| c.is_ascii_alphanumeric() || c == '_' || c == '-' || c == '.';
        let chars: Vec<char> = s.chars().collect();
        let mut i = 0;
        while i < chars.len() {
            if idch(chars[i]) {
                let start = i;
                while i < chars.len() && idch(chars[i]) {
                    i += 1;
                }
                let tok: String = chars[start..i].iter().collect();
                let segs: Vec<&str> = tok.split('.').collect();
                let first = segs[0];
                if segs.len() >= 3
                    && !first.is_empty()
                    && first.len() <= 4
                    && first.chars().all(|c| c.is_ascii_lowercase())
                {
                    return Some(tok);
                }
            } else {
                i += 1;
            }
        }
        None
    }

    #[test]
    fn the_copy_scanner_finds_pack_ids_and_ignores_ordinary_copy() {
        assert_eq!(
            pack_id_like("practice ja.lex.demonstratives.koko to supported (recall-meaning)"),
            Some("ja.lex.demonstratives.koko".to_string())
        );
        assert_eq!(
            pack_id_like("reach goal ru.goal.on-ramp.cyrillic first"),
            Some("ru.goal.on-ramp.cyrillic".to_string())
        );
        for clean in [
            "not open yet — practice first: \"here\" (recall-meaning → supported)",
            "practice \"here\" to supported (recall-meaning) — practiced in \"Asking where things are\"",
            "reach \"Retell simple past events and stories\" first",
            "a skill you have not started yet",
        ] {
            assert_eq!(pack_id_like(clean), None, "{clean} must read as copy");
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

    // SCENARIO-LOCK-COPY-001: the copy names the capability with the name
    // the pack itself carries, says where it is practiced, and never shows
    // the raw content id.
    #[test]
    fn a_content_gate_names_the_capability_and_where_it_is_practiced() {
        let p = UnmetPrereq {
            display_name: Some("here".into()),
            practice_title: Some("Asking where things are".into()),
            ..prereq("ja.lex.demonstratives.koko", false)
        };
        let (kind, reason, unlocks) = lock_of(&[p]);
        assert_eq!(kind, LockKind::Capability);
        assert!(reason.contains("practice first"), "{reason}");
        assert!(
            reason.contains("\"here\" (recall-meaning → supported)"),
            "{reason}"
        );
        assert_eq!(
            unlocks,
            [
                "practice \"here\" to supported (recall-meaning) — practiced in \"Asking where things are\""
            ]
        );
        assert!(!reason.contains("ja.lex.demonstratives.koko"), "{reason}");
        assert!(pack_id_like(&reason).is_none(), "{reason}");
        for u in &unlocks {
            assert!(pack_id_like(u).is_none(), "{u}");
        }
    }

    #[test]
    fn a_goal_gate_is_labelled_a_later_curriculum_stage_by_its_own_words() {
        let p = UnmetPrereq {
            display_name: Some("Retell simple past events and stories".into()),
            practice_title: Some("Telling yesterday apart".into()),
            ..prereq("ja.goal.a1.past-stories", true)
        };
        let (kind, reason, unlocks) = lock_of(&[p]);
        assert_eq!(kind, LockKind::Stage);
        assert!(reason.contains("later stage"), "{reason}");
        assert!(
            reason.contains("goal \"Retell simple past events and stories\""),
            "{reason}"
        );
        assert_eq!(
            unlocks,
            [
                "reach \"Retell simple past events and stories\" first — practiced in \"Telling yesterday apart\""
            ]
        );
        assert!(!reason.contains("ja.goal.a1.past-stories"), "{reason}");
        assert!(pack_id_like(&reason).is_none(), "{reason}");
        for u in &unlocks {
            assert!(pack_id_like(u).is_none(), "{u}");
        }
    }

    // Fallback (gate c): when no pack metadata names the prerequisite, the
    // copy says so with a generic honest phrase — never the raw id.
    #[test]
    fn an_unnamed_prerequisite_falls_back_to_an_honest_phrase_not_the_id() {
        let (kind, reason, unlocks) = lock_of(&[prereq("ja.lex.demonstratives.koko", false)]);
        assert_eq!(kind, LockKind::Capability);
        assert!(
            reason.contains("a skill you have not started yet"),
            "{reason}"
        );
        assert!(!reason.contains("ja.lex.demonstratives.koko"), "{reason}");
        assert_eq!(unlocks.len(), 1);
        assert!(pack_id_like(&reason).is_none(), "{reason}");
        for u in &unlocks {
            assert!(pack_id_like(u).is_none(), "{u}");
        }
        // A stage gate with no resolvable goal label reads generically too.
        let (_, reason, unlocks) = lock_of(&[prereq("ja.goal.a1.past-stories", true)]);
        assert!(
            reason.contains("a later goal of this curriculum"),
            "{reason}"
        );
        assert_eq!(unlocks, ["reach a later goal of this curriculum first"]);
        for s in std::iter::once(reason).chain(unlocks) {
            assert!(pack_id_like(&s).is_none(), "{s}");
        }
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
            &PackCopyIndex::load(&root),
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

    /// Gate (a), SCENARIO-LOCK-COPY-001: walk every locked row a fresh
    /// profile sees against the REAL shipped packs (ja-JP and ru-RU) and
    /// assert no pack identifier — content id or goal id — reaches the
    /// learner-facing lock copy or the rendered situation line.
    #[test]
    fn a_fresh_profiles_lock_copy_carries_no_raw_ids_in_either_shipped_pack() {
        for pack in ["ja-JP", "ru-RU"] {
            let root =
                Path::new(env!("CARGO_MANIFEST_DIR")).join(format!("../../../languages/{pack}"));
            let runtime = crate::packcache::runtime(&root).expect("the shipped pack parses");
            let goals: HashMap<String, crate::PackGoal> = serde_yaml::from_str::<crate::PackGoals>(
                &std::fs::read_to_string(root.join("curriculum/goals.yaml")).unwrap(),
            )
            .expect("the shipped goal map parses")
            .goals
            .into_iter()
            .map(|g| (g.id.clone(), g))
            .collect();
            let copy = PackCopyIndex::load(&root);
            // Situation labels resolve from the pack's own pragmatics file,
            // as `situation_label` does for an installed pack.
            let prag: serde_yaml::Value = serde_yaml::from_str(
                &std::fs::read_to_string(root.join("language/pragmatics.yaml")).unwrap(),
            )
            .expect("the shipped pragmatics file parses");
            let named: HashMap<String, String> = prag
                .get("situations")
                .and_then(|s| s.as_sequence())
                .map(|seq| {
                    seq.iter()
                        .filter_map(|s| {
                            Some((
                                s.get("id")?.as_str()?.to_string(),
                                s.get("name")?.as_str()?.to_string(),
                            ))
                        })
                        .collect()
                })
                .unwrap_or_default();
            let rows = summaries_for(
                runtime.scenarios(),
                &goals,
                &[],
                &|id| named.get(id).cloned(),
                &copy,
            );

            // Prerequisite targets from the goal map: none may appear, in
            // any form, inside a learner-facing string.
            let targets: Vec<&str> = goals
                .values()
                .flat_map(|g| g.prerequisites.iter().map(|p| p.target.as_str()))
                .collect();

            let locked: Vec<&ScenarioSummary> = rows.iter().filter(|r| !r.unlocked).collect();
            assert!(
                !locked.is_empty(),
                "{pack}: a fresh profile has locked rows to audit"
            );
            let mut capability_rows = 0;
            for r in &locked {
                let strings: Vec<String> = r
                    .locked_reason
                    .clone()
                    .into_iter()
                    .chain(r.unlocks.iter().cloned())
                    .collect();
                assert!(!strings.is_empty(), "{} names its gate", r.scenario_id);
                for s in &strings {
                    if let Some(tok) = pack_id_like(s) {
                        panic!("{pack}: {} copy leaks pack id {tok}: {s:?}", r.scenario_id);
                    }
                    for t in &targets {
                        assert!(
                            !s.contains(t),
                            "{pack}: {} copy {s:?} leaks prereq target {t}",
                            r.scenario_id
                        );
                    }
                }
                if r.lock_kind == Some(LockKind::Capability) {
                    capability_rows += 1;
                    // Shipped packs carry names for their capability gates,
                    // so these rows must name the capability itself, not
                    // fall back to the generic phrase.
                    assert!(
                        r.unlocks.iter().all(|u| {
                            u.contains('"') || !u.contains("a skill you have not started yet")
                        }),
                        "{} should name the capability from pack data: {:?}",
                        r.scenario_id,
                        r.unlocks
                    );
                }
            }
            if pack == "ja-JP" {
                assert!(
                    capability_rows > 0,
                    "ja-JP exercises the capability-gate copy path"
                );
            }
            // The list itself: rendered situation lines are copy too.
            for r in &rows {
                if let Some(s) = &r.situation {
                    assert!(
                        pack_id_like(s).is_none(),
                        "{pack}: situation copy {s:?} leaks a pack id"
                    );
                }
            }
        }
    }

    /// Gate (b), SCENARIO-LOCK-COPY-001: the names and places come from the
    /// pack's own data — renaming the display fields in a fixture pack
    /// changes the generated lock copy.
    #[test]
    fn renaming_pack_display_data_renames_the_lock_copy() {
        let tmp = tempfile::tempdir().unwrap();
        let root = tmp.path();
        std::fs::create_dir_all(root.join("lexicon")).unwrap();
        std::fs::create_dir_all(root.join("curriculum/units")).unwrap();
        let write = |rel: &str, text: &str| {
            std::fs::write(root.join(rel), text).expect("fixture write");
        };
        write(
            "lexicon/tool.jsonl",
            "{\"id\":\"x.lex.tool.spoon\",\"forms\":[{\"text\":\"スプーン\"}],\"glosses\":{\"en-US\":[\"spoon\"]}}",
        );
        write(
            "curriculum/units/001-tool.yaml",
            "id: x.unit.spoon\ngoal_id: x.goal.eat\ntitle: Using the spoon\nactivities:\n- id: x.activity.spoon-read\n  type: encounter-read\n  modality: reading\n  support_level: 5\n  content_refs:\n  - x.lex.tool.spoon\n",
        );
        let sc: PackScenario = serde_yaml::from_str(
            "id: x.scenario.eat\ngoal_id: x.goal.eat\ntitle: Ordering a meal\nnodes: []\nsupport_ladder: []\n",
        )
        .expect("fixture scenario");
        let goals: HashMap<String, crate::PackGoal> = [(
            "x.goal.eat".to_string(),
            crate::PackGoal {
                description: "Talk about eating out".into(),
                band: Some("on-ramp".into()),
                review_status: None,
                id: "x.goal.eat".into(),
                modalities: vec!["speaking".into()],
                prerequisites: vec![crate::PackPrereq {
                    target: "x.lex.tool.spoon".into(),
                    dimension: "recall-meaning".into(),
                    required_state: "supported".into(),
                    strength: "hard".into(),
                }],
                required_concepts: vec![],
                assessment_ids: vec![],
            },
        )]
        .into_iter()
        .collect();
        let row = |root: &Path| {
            let rows = summaries_for(
                std::iter::once(&sc),
                &goals,
                &[],
                &|_s| Option::<String>::None,
                &PackCopyIndex::load(root),
            );
            rows.into_iter().next().expect("one scenario")
        };

        let first = row(root);
        assert!(!first.unlocked);
        let reason = first.locked_reason.clone().expect("a lock reason");
        assert!(reason.contains("\"spoon\""), "{reason}");
        let hint = &first.unlocks[0];
        assert!(hint.contains("\"spoon\""), "{hint}");
        assert!(hint.contains("Using the spoon"), "{hint}");
        assert!(pack_id_like(&reason).is_none(), "{reason}");
        assert!(pack_id_like(hint).is_none(), "{hint}");

        // Rename what the PACK says, and only the pack data changed.
        write(
            "lexicon/tool.jsonl",
            "{\"id\":\"x.lex.tool.spoon\",\"forms\":[{\"text\":\"フォーク\"}],\"glosses\":{\"en-US\":[\"fork\"]}}",
        );
        write(
            "curriculum/units/001-tool.yaml",
            "id: x.unit.spoon\ngoal_id: x.goal.eat\ntitle: Forks at dinner\nactivities:\n- id: x.activity.spoon-read\n  type: encounter-read\n  modality: reading\n  support_level: 5\n  content_refs:\n  - x.lex.tool.spoon\n",
        );
        let second = row(root);
        let reason2 = second.locked_reason.clone().expect("a lock reason");
        assert!(
            reason2.contains("\"fork\"") && !reason2.contains("spoon"),
            "{reason2}"
        );
        let hint2 = &second.unlocks[0];
        assert!(hint2.contains("Forks at dinner"), "{hint2}");
        assert!(pack_id_like(hint2).is_none(), "{hint2}");
    }
}
