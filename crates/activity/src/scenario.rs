//! Data-driven scenario/dialogue runtime (SCENARIO-001).
//!
//! The runtime executes the pack-defined scenario graph: nodes with
//! accepted intents (`expected_actions`), success edges (`next`),
//! recovery branches (`recovery`), a declared support ladder, and
//! transfer variants. It contains NO language-specific branch logic:
//! every decision is a function of pack data (acceptance criterion 2).

use crate::spec::{PackScenario, RecoveryBranch, ScenarioNode};
use lts_domain::{ContentId, EventId, ProfileId, Score, SupportLevel};
use lts_learner_model::AttemptDraft;
use serde::Serialize;

/// Result of an intent attempt at the active prompt.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum StepResult {
    /// The node's FULL declared action set was performed; moved to the
    /// next node (or recovery target). (SCENARIO-INTERACTION-001: a
    /// single accepted click no longer satisfies a multi-action node.)
    Advanced { to: String },
    /// The full action set was performed at the final node; the
    /// scenario chain is complete.
    Completed,
    /// Intent accepted, but the node declares more actions than the
    /// learner has performed. `remaining` counts what is still owed
    /// before the node is satisfied. (SCENARIO-INTERACTION-001)
    PartialAccepted { remaining: usize },
    /// Intent not among the node's accepted actions. `recovery` lists
    /// pack-defined recovery branch ids the learner can take. Reached
    /// by clicking a rendered distractor — the decision set is wider
    /// than the answer, so this path is live, not dead content.
    NotSatisfied { recovery: Vec<String> },
}

/// SCENARIO-INTERACTION-001 (finding S-03): scenario decisions are made
/// by picking from on-screen wording that includes the right answer, so
/// a click-through is a recognition task, not unaided retrieval. Node
/// evidence is therefore never stamped better than this support level:
/// MASTERY_POLICY 0.2.0 caps the `independent` stage at support level 1,
/// so a stamp at 2 (the bottom of the `supported` band, 2-3) keeps
/// guided scenario clicks OUT of independent/flexible mastery while the
/// earned Correct score still counts. Lift this floor when pack work
/// (S-01) puts real target-language retrieval into the prompts.
pub const GUIDED_SCENARIO_SUPPORT_FLOOR: u8 = 2;

/// SCENARIO-INTERACTION-001: how many distractor intents a node's
/// rendered decision set carries at most. Deterministic (pack
/// declaration order) so the same pack data renders the same choices.
pub const MAX_SCENARIO_DISTRACTORS: usize = 4;

/// Per-node record for evidence and review.
#[derive(Debug, Clone, Serialize)]
pub struct NodeRecord {
    pub node_id: String,
    pub support_level: u8,
    pub attempts: u32,
    pub succeeded: bool,
}

/// Finalized scenario session. `session_id` identifies one sitting: the
/// same scenario replayed tomorrow is a different session, so its evidence
/// stays a separate observation instead of colliding with the first run
/// (review finding R03).
#[derive(Debug, Clone, Serialize)]
pub struct ScenarioOutcome {
    pub scenario_id: String,
    pub session_id: String,
    pub nodes: Vec<NodeRecord>,
    pub transfers_completed: Vec<String>,
    pub transfer_requirement_met: bool,
    /// U08: exchange nodes the scenario declares, so ending a session
    /// early can label the work honestly instead of claiming completion.
    pub exchanges_total: usize,
    /// U08: transfer variants the pack requires (may be 0), so the UI can
    /// state the actual number rather than a bare "at least".
    pub transfers_required: u32,
    /// U08: true only when the walk reached the chain's terminal node AND
    /// the transfer requirement is met. Pressing the end-session button is
    /// never what makes this true.
    pub completed: bool,
}

/// One in-progress scenario session.
pub struct ScenarioSession {
    scenario: PackScenario,
    session_id: String,
    current: String,
    active_recovery: Option<RecoveryBranch>,
    support_used: Vec<u8>,
    attempts: u32,
    records: Vec<NodeRecord>,
    transfers: Vec<String>,
    // SCENARIO-INTERACTION-001: accepted intents already performed at
    // the current node. A node is satisfied only when its full declared
    // `expected_actions` set is in here.
    node_actions_done: Vec<String>,
    // U08: set only when an accepted intent closed the chain's terminal
    // node; finish() turns this plus the transfer gate into `completed`.
    chain_complete: bool,
}

impl ScenarioSession {
    /// Begin at the scenario's first node. `session_id` is supplied by the
    /// caller (the app owns session identity, so the engine stays
    /// deterministic and testable) and must be unique per sitting.
    pub fn begin(scenario: &PackScenario, session_id: &str) -> Option<Self> {
        let first = scenario.nodes.first()?.id.clone();
        Some(Self {
            scenario: scenario.clone(),
            session_id: session_id.to_string(),
            current: first,
            active_recovery: None,
            support_used: Vec::new(),
            attempts: 0,
            records: Vec::new(),
            transfers: Vec::new(),
            node_actions_done: Vec::new(),
            chain_complete: false,
        })
    }

    pub fn current_node(&self) -> &ScenarioNode {
        self.scenario
            .nodes
            .iter()
            .find(|n| n.id == self.current)
            .expect("current is a node id")
    }

    /// The prompt (node or active recovery branch) the learner responds
    /// to, plus its accepted intents.
    pub fn active_prompt(&self) -> (&str, &[String]) {
        match &self.active_recovery {
            Some(r) => (r.prompt.as_str(), &r.expected_actions),
            None => {
                let n = self.current_node();
                (n.prompt.as_str(), &n.expected_actions)
            }
        }
    }

    /// SCENARIO-INTERACTION-001 (finding S-02): plausible wrong moves to
    /// render alongside the accepted intents — every intent the scenario
    /// declares anywhere (other nodes' actions, any node's recovery
    /// actions) that the ACTIVE prompt does not accept. Pack data only,
    /// in pack declaration order, deduped and capped at
    /// [`MAX_SCENARIO_DISTRACTORS`], so the same pack always offers the
    /// same set. When the pack declares nothing beyond the answer, the
    /// set is empty and the engine cannot invent distractors — that is a
    /// pack-authoring gap, never invented content.
    pub fn distractor_actions(&self) -> Vec<String> {
        let accepted = self.active_prompt().1;
        let mut out: Vec<String> = Vec::new();
        for n in self.scenario.nodes.iter() {
            for a in n
                .expected_actions
                .iter()
                .chain(n.recovery.iter().flat_map(|r| r.expected_actions.iter()))
            {
                if accepted.iter().any(|x| x == a) || out.contains(a) {
                    continue;
                }
                out.push(a.clone());
                if out.len() >= MAX_SCENARIO_DISTRACTORS {
                    return out;
                }
            }
        }
        out
    }

    /// The FULL set rendered at the active prompt: accepted intents plus
    /// distractors — a strict superset of the answer whenever the pack
    /// declares more intents than this prompt accepts. Deterministically
    /// interleaved (distractor first) so the answer is not simply the
    /// first button. Free-navigation prompts (empty accepted set accept
    /// any attempt) render no set.
    pub fn decision_set(&self) -> Vec<String> {
        let accepted = self.active_prompt().1;
        if accepted.is_empty() {
            return Vec::new();
        }
        let distractors = self.distractor_actions();
        let mut out = Vec::with_capacity(accepted.len() + distractors.len());
        for i in 0..std::cmp::max(accepted.len(), distractors.len()) {
            if let Some(d) = distractors.get(i) {
                out.push(d.clone());
            }
            if let Some(a) = accepted.get(i) {
                out.push(a.clone());
            }
        }
        out
    }

    /// Take a pack-declared support ladder step (level must be declared
    /// in the scenario's ladder).
    pub fn use_support(&mut self, level: u8) -> bool {
        if self
            .scenario
            .support_ladder
            .iter()
            .any(|s| s.support_level == level)
        {
            self.support_used.push(level);
            true
        } else {
            false
        }
    }

    pub fn support_level(&self) -> SupportLevel {
        self.support_used
            .iter()
            .max()
            .copied()
            .and_then(SupportLevel::new)
            .unwrap_or_else(SupportLevel::independent)
    }

    /// Enter a pack-defined recovery branch for the current node.
    pub fn enter_recovery(&mut self, recovery_id: &str) -> bool {
        let branch = self
            .current_node()
            .recovery
            .iter()
            .find(|r| r.id == recovery_id)
            .cloned();
        match branch {
            Some(b) => {
                self.active_recovery = Some(b);
                true
            }
            None => false,
        }
    }

    /// Attempt an intent (label) at the active prompt. Intent matching
    /// is exact against pack-declared actions; an empty action list
    /// accepts any attempt (free navigation).
    pub fn attempt(&mut self, intent: &str) -> StepResult {
        self.attempts += 1;
        if let Some(recovery) = self.active_recovery.clone() {
            let accepted = recovery.expected_actions.is_empty()
                || recovery.expected_actions.iter().any(|a| a == intent);
            if accepted {
                // Recovery resolved: return to its declared target
                // (usually the current node) with support recorded.
                self.active_recovery = None;
                let to = recovery.to.unwrap_or_else(|| self.current.clone());
                self.current = to.clone();
                return StepResult::Advanced { to };
            }
            let options = self
                .current_node()
                .recovery
                .iter()
                .map(|r| r.id.clone())
                .collect();
            return StepResult::NotSatisfied { recovery: options };
        }

        let (accepted, next_first, recovery_ids) = {
            let node = self.current_node();
            // SCENARIO-INTERACTION-001: an accepted intent only
            // contributes to satisfaction through the performed-set
            // check below. An empty expected_actions set accepts any
            // attempt (free navigation).
            let accepted = node.expected_actions.is_empty()
                || node.expected_actions.iter().any(|a| a == intent);
            (
                accepted,
                node.next.first().cloned(),
                node.recovery
                    .iter()
                    .map(|r| r.id.clone())
                    .collect::<Vec<_>>(),
            )
        };
        if !accepted {
            return StepResult::NotSatisfied {
                recovery: recovery_ids,
            };
        }

        // Count this intent once; re-clicks of an already-performed
        // accepted action never double-count toward the set.
        if !self.node_actions_done.iter().any(|a| a == intent) {
            self.node_actions_done.push(intent.to_string());
        }
        let remaining: usize = {
            let node = self.current_node();
            node.expected_actions
                .iter()
                .filter(|a| !self.node_actions_done.contains(*a))
                .count()
        };
        if remaining > 0 {
            // Correct move, node not yet satisfied: the learner still
            // owes this node's declared actions before it advances.
            return StepResult::PartialAccepted { remaining };
        }

        // Node satisfied by its FULL declared action set: record and
        // advance along the first edge. SCENARIO-INTERACTION-001
        // (finding S-03): the stamp is floored — a label-guided
        // decision is never recorded better than the `supported` band.
        self.records.push(NodeRecord {
            node_id: self.current.clone(),
            support_level: self
                .support_level()
                .value()
                .max(GUIDED_SCENARIO_SUPPORT_FLOOR),
            attempts: self.attempts,
            succeeded: true,
        });
        self.support_used.clear();
        self.node_actions_done.clear();
        self.attempts = 0;
        match next_first {
            Some(next) => {
                self.current = next.clone();
                StepResult::Advanced { to: next }
            }
            None => {
                // U08: reaching the terminal node is the only path that
                // can later report `completed: true` at finish.
                self.chain_complete = true;
                StepResult::Completed
            }
        }
    }

    /// Mark a transfer variant as performed (must be pack-declared).
    pub fn complete_transfer(&mut self, variant_id: &str) -> bool {
        if self
            .scenario
            .transfer_variants
            .iter()
            .any(|v| v.id == variant_id)
            && !self.transfers.contains(&variant_id.to_string())
        {
            self.transfers.push(variant_id.to_string());
            true
        } else {
            false
        }
    }

    pub fn transfer_requirement_met(&self) -> bool {
        self.transfers.len() as u32 >= self.scenario.transfer_variants_required
    }
    /// Support levels consumed at the current node (for honest UI state).
    pub fn support_used_snapshot(&self) -> Vec<u8> {
        self.support_used.clone()
    }

    /// Whether a transfer variant has been performed in this session.
    pub fn transfer_done(&self, variant_id: &str) -> bool {
        self.transfers.iter().any(|t| t == variant_id)
    }

    /// Finalize: node records + transfer coverage. U08: the evidence from
    /// a partial walk survives untouched; only the `completed` label is
    /// withheld when the chain was cut short.
    pub fn finish(self) -> ScenarioOutcome {
        let met = self.transfer_requirement_met();
        ScenarioOutcome {
            scenario_id: self.scenario.id,
            session_id: self.session_id,
            nodes: self.records,
            transfers_completed: self.transfers,
            transfer_requirement_met: met,
            exchanges_total: self.scenario.nodes.len(),
            transfers_required: self.scenario.transfer_variants_required,
            // U08: completion is earned by the walk, never by the
            // learner pressing the button.
            completed: self.chain_complete && met,
        }
    }

    /// Emit one scored evidence event per completed node (interaction
    /// modality), with the support actually used at that node.
    pub fn evidence_events(
        outcome: &ScenarioOutcome,
        pack_id: &str,
        pack_version: &str,
        profile_id: &ProfileId,
        mut clock: impl FnMut(usize) -> String,
    ) -> Vec<lts_domain::EvidenceEvent> {
        outcome
            .nodes
            .iter()
            .enumerate()
            .map(|(i, rec)| {
                let node_id = ContentId::parse(&rec.node_id).expect("validated pack id");
                AttemptDraft::new(
                    vec![node_id.clone()],
                    lts_domain::ActivityModality::Interaction,
                    node_id.clone(),
                    pack_id,
                    pack_version,
                )
                // R03: the node is the prompt the learner answered, so it
                // is the prompt family; the attempt group is scoped to this
                // sitting, and the event id carries the session so a replay
                // can never be swallowed by an `ON CONFLICT` on the first
                // run's id.
                .prompt_family(node_id)
                .attempt_group(format!(
                    "{}:{}:{}",
                    outcome.scenario_id, outcome.session_id, rec.node_id
                ))
                .support(
                    // SCENARIO-INTERACTION-001 (finding S-03): defense in
                    // depth — even a NodeRecord written without the stamp
                    // floor can never emit an `independent` scenario
                    // event (MASTERY_POLICY 0.2.0 caps independent-stage
                    // credit at support level 1).
                    SupportLevel::new(rec.support_level.max(GUIDED_SCENARIO_SUPPORT_FLOOR))
                        .unwrap_or_else(SupportLevel::independent),
                    Vec::new(),
                )
                .scored(if rec.succeeded {
                    Score::Correct
                } else {
                    Score::Incorrect
                })
                .finish(
                    EventId::new(format!(
                        "{}:{}:node:{}",
                        outcome.scenario_id, outcome.session_id, i
                    )),
                    clock(i),
                    profile_id.clone(),
                )
            })
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::spec::{LadderStep, ScenarioNode, TransferVariant};

    /// A linear chain of `n` exchange nodes with a pack-declared transfer
    /// requirement, built from data so the U08 semantics are pinned without
    /// depending on any fixture pack.
    fn chain(n: u32, transfers_required: u32) -> PackScenario {
        let nodes = (0..n)
            .map(|i| ScenarioNode {
                id: format!("es.scenario.u08.n{i}"),
                prompt: format!("Exchange {i}"),
                expected_actions: vec![format!("go{i}")],
                action_labels: Default::default(),
                support: Vec::new(),
                next: if i + 1 < n {
                    vec![format!("es.scenario.u08.n{}", i + 1)]
                } else {
                    Vec::new()
                },
                recovery: Vec::new(),
            })
            .collect();
        let transfer_variants = (0..transfers_required)
            .map(|i| TransferVariant {
                id: format!("es.scenario.u08.v{i}"),
                description: format!("Transfer {i}"),
                changed_variable: None,
            })
            .collect();
        PackScenario {
            id: "es.scenario.u08".into(),
            goal_id: "es.goal.u08".into(),
            title: "U08 chain".into(),
            situation: None,
            register: None,
            nodes,
            support_ladder: vec![LadderStep {
                support_level: 0,
                description: "independent".into(),
            }],
            transfer_variants_required: transfers_required,
            transfer_variants,
        }
    }

    #[test]
    fn early_finish_is_partial_not_complete() {
        // U08: pressing the end-session button after 1 of 3 exchanges is
        // saved work, not scenario completion.
        let scenario = chain(3, 1);
        let mut s = ScenarioSession::begin(&scenario, "sess-partial").unwrap();
        assert_eq!(
            s.attempt("go0"),
            StepResult::Advanced {
                to: "es.scenario.u08.n1".into()
            }
        );
        let out = s.finish();
        assert!(!out.completed, "a cut-short chain is never complete");
        assert_eq!(out.exchanges_total, 3);
        assert_eq!(out.nodes.len(), 1, "the visited exchanges are the evidence");
        assert_eq!(out.transfers_required, 1);
        assert!(!out.transfer_requirement_met);
        // The legitimate evidence earned before finishing survives: exactly
        // one scored event, for the one exchange that succeeded.
        let events = ScenarioSession::evidence_events(
            &out,
            "org.openlanguage.test",
            "0.1.0",
            &ProfileId::new("profile-1"),
            |i| format!("2026-10-19T00:00:0{i}Z"),
        );
        assert_eq!(events.len(), 1);
    }

    #[test]
    fn full_walk_with_transfer_requirement_is_complete() {
        let scenario = chain(3, 1);
        let mut s = ScenarioSession::begin(&scenario, "sess-full").unwrap();
        assert_eq!(
            s.attempt("go0"),
            StepResult::Advanced {
                to: "es.scenario.u08.n1".into()
            }
        );
        assert_eq!(
            s.attempt("go1"),
            StepResult::Advanced {
                to: "es.scenario.u08.n2".into()
            }
        );
        assert_eq!(s.attempt("go2"), StepResult::Completed);
        assert!(s.complete_transfer("es.scenario.u08.v0"));
        let out = s.finish();
        assert!(out.completed);
        assert_eq!(out.exchanges_total, 3);
        assert_eq!(out.nodes.len(), 3);
    }

    #[test]
    fn chain_reached_but_transfer_unmet_is_not_complete() {
        // "Completed" means the required exchanges AND the transfer gate;
        // StepResult::Completed alone is chain reach, not scenario done.
        let scenario = chain(2, 1);
        let mut s = ScenarioSession::begin(&scenario, "sess-no-transfer").unwrap();
        s.attempt("go0");
        assert_eq!(s.attempt("go1"), StepResult::Completed);
        let out = s.finish();
        assert!(!out.completed);
        assert_eq!(out.exchanges_total, 2);
        assert_eq!(out.nodes.len(), 2);
    }

    #[test]
    fn single_exchange_scenario_completes_exactly() {
        // Singular counts: one declared exchange, done once, no transfers.
        let scenario = chain(1, 0);
        let mut s = ScenarioSession::begin(&scenario, "sess-single").unwrap();
        assert_eq!(s.attempt("go0"), StepResult::Completed);
        let out = s.finish();
        assert!(out.completed);
        assert_eq!(out.exchanges_total, 1);
        assert_eq!(out.nodes.len(), 1);
        assert_eq!(out.transfers_required, 0);
    }

    // ------------------------------------------------------------------
    // SCENARIO-INTERACTION-001: distractor action sets, full-set
    // completion, honest evidence.
    // ------------------------------------------------------------------

    /// A node with a FULL set of two accepted actions, a recovery branch,
    /// and other nodes whose intents become distractors.
    fn decision_pack() -> PackScenario {
        let nodes = vec![
            ScenarioNode {
                id: "es.scenario.dec.n0".into(),
                prompt: "Open the exchange".into(),
                expected_actions: vec!["greet".into(), "give-name".into()],
                action_labels: [
                    ("greet".to_string(), "Greet them".to_string()),
                    ("give-name".to_string(), "Say your name".to_string()),
                    ("ask-repeat".to_string(), "Ask them to repeat".to_string()),
                ]
                .into_iter()
                .collect(),
                support: Vec::new(),
                next: vec!["es.scenario.dec.n1".into()],
                recovery: vec![RecoveryBranch {
                    id: "es.scenario.dec.n0.repair".into(),
                    prompt: "Ask them to repeat".into(),
                    expected_actions: vec!["ask-repeat".into()],
                    to: Some("es.scenario.dec.n0".into()),
                }],
            },
            ScenarioNode {
                id: "es.scenario.dec.n1".into(),
                prompt: "Ask them something back".into(),
                expected_actions: vec!["ask-back".into()],
                action_labels: [("ask-back".to_string(), "Ask them a question".to_string())]
                    .into_iter()
                    .collect(),
                support: Vec::new(),
                next: vec!["es.scenario.dec.n2".into()],
                recovery: Vec::new(),
            },
            ScenarioNode {
                id: "es.scenario.dec.n2".into(),
                prompt: "Close it out".into(),
                expected_actions: vec!["part".into()],
                action_labels: [("part".to_string(), "Say goodbye".to_string())]
                    .into_iter()
                    .collect(),
                support: Vec::new(),
                next: Vec::new(),
                recovery: Vec::new(),
            },
        ];
        PackScenario {
            id: "es.scenario.dec".into(),
            goal_id: "es.goal.dec".into(),
            title: "Decision chain".into(),
            situation: None,
            register: None,
            nodes,
            support_ladder: vec![
                LadderStep {
                    support_level: 0,
                    description: "independent".into(),
                },
                LadderStep {
                    support_level: 3,
                    description: "hint".into(),
                },
            ],
            transfer_variants_required: 0,
            transfer_variants: Vec::new(),
        }
    }

    #[test]
    fn the_rendered_set_is_a_strict_superset_of_the_answer_at_every_node() {
        let scenario = decision_pack();
        let mut s = ScenarioSession::begin(&scenario, "sess-superset").unwrap();
        let declared: Vec<String> = scenario
            .nodes
            .iter()
            .flat_map(|n| {
                n.expected_actions
                    .iter()
                    .chain(n.recovery.iter().flat_map(|r| r.expected_actions.iter()))
            })
            .cloned()
            .collect();
        let mut checked_nodes = 0;
        // Visit each node by walking the chain; at every node the
        // rendered decision set must be a strict superset.
        for node_id in [
            "es.scenario.dec.n0",
            "es.scenario.dec.n1",
            "es.scenario.dec.n2",
        ] {
            assert_eq!(s.current_node().id, node_id);
            let accepted = s.active_prompt().1.to_vec();
            let set = s.decision_set();
            // Every accepted intent is present exactly once.
            for a in &accepted {
                assert_eq!(
                    set.iter().filter(|x| *x == a).count(),
                    1,
                    "{a} exactly once"
                );
            }
            // Strict superset: this pack declares other nodes' intents,
            // so distractors must be present at every node.
            assert!(
                set.len() > accepted.len(),
                "node {node_id} rendered only the answer: {set:?}"
            );
            // Distractors are pack-declared, never invented.
            for x in &set {
                assert!(declared.contains(x), "{x} is not a pack-declared intent");
            }
            // At least one distractor is a plausible wrong move: another
            // node's declared action.
            let distractors: Vec<&String> = set.iter().filter(|x| !accepted.contains(x)).collect();
            assert!(!distractors.is_empty(), "{node_id}: no wrong options");
            checked_nodes += 1;
            // Advance with the node's FULL accepted set.
            for a in &accepted {
                s.attempt(a);
            }
        }
        assert_eq!(checked_nodes, 3);
    }

    #[test]
    fn a_wrong_click_on_a_rendered_distractor_yields_recovery_that_renders() {
        let scenario = decision_pack();
        let mut s = ScenarioSession::begin(&scenario, "sess-wrong").unwrap();
        let set = s.decision_set();
        let accepted = s.active_prompt().1.to_vec();
        let distractor = set.iter().find(|x| !accepted.contains(x)).unwrap().clone();
        // The distractor is rendered precisely because clicking it is a
        // real possibility: the node does not accept it.
        let wrong = s.attempt(&distractor);
        let StepResult::NotSatisfied { recovery } = wrong else {
            panic!("a distractor click must not satisfy: {wrong:?}");
        };
        // The pack-defined recovery branch is offered (this is what the
        // UI's Recovery moves group renders — dead content no more).
        assert_eq!(recovery, vec!["es.scenario.dec.n0.repair".to_string()]);
        assert!(s.enter_recovery("es.scenario.dec.n0.repair"));
        let (prompt, r_accepted) = s.active_prompt();
        assert_eq!(prompt, "Ask them to repeat");
        assert_eq!(r_accepted, &["ask-repeat".to_string()]);
        // Even at the recovery prompt the rendered set is wider than the
        // answer: main-line moves stay visible as wrong options.
        let r_set = s.decision_set();
        assert!(r_set.len() > r_accepted.len(), "{r_set:?}");
        assert!(r_set.contains(&"ask-repeat".to_string()));
        let r_distractor = r_set
            .iter()
            .find(|x| !r_accepted.contains(x))
            .unwrap()
            .clone();
        assert!(matches!(
            s.attempt(&r_distractor),
            StepResult::NotSatisfied { .. }
        ));
        assert_eq!(
            s.attempt("ask-repeat"),
            StepResult::Advanced {
                to: "es.scenario.dec.n0".into()
            }
        );
    }

    #[test]
    fn a_node_is_satisfied_only_by_its_full_declared_action_set() {
        let scenario = decision_pack();
        let mut s = ScenarioSession::begin(&scenario, "sess-fullset").unwrap();
        // n0 declares TWO actions: one accepted click is correct but
        // does NOT advance — the node still owes its set.
        assert_eq!(
            s.attempt("greet"),
            StepResult::PartialAccepted { remaining: 1 }
        );
        assert_eq!(s.current_node().id, "es.scenario.dec.n0");
        // No node evidence exists until the node is satisfied.
        // Re-clicking the same accepted intent never double-counts.
        assert_eq!(
            s.attempt("greet"),
            StepResult::PartialAccepted { remaining: 1 }
        );
        // A wrong click while the set is owed still fails honestly.
        assert!(matches!(s.attempt("part"), StepResult::NotSatisfied { .. }));
        assert_eq!(
            s.attempt("give-name"),
            StepResult::Advanced {
                to: "es.scenario.dec.n1".into()
            }
        );
        // Only now does the satisfied node count as one record.
        let out = s.finish();
        assert_eq!(
            out.nodes.len(),
            1,
            "only the fully performed node is evidence"
        );
        assert_eq!(out.nodes[0].node_id, "es.scenario.dec.n0");
    }

    #[test]
    fn full_set_completion_advances_and_terminal_completes() {
        let scenario = decision_pack();
        let mut s = ScenarioSession::begin(&scenario, "sess-advance").unwrap();
        assert_eq!(
            s.attempt("greet"),
            StepResult::PartialAccepted { remaining: 1 }
        );
        assert_eq!(
            s.attempt("give-name"),
            StepResult::Advanced {
                to: "es.scenario.dec.n1".into()
            }
        );
        // n1 declares one action: full-set semantics keep it one click.
        assert_eq!(
            s.attempt("ask-back"),
            StepResult::Advanced {
                to: "es.scenario.dec.n2".into()
            }
        );
        assert_eq!(s.attempt("part"), StepResult::Completed);
        let out = s.finish();
        assert!(out.completed);
        assert_eq!(out.nodes.len(), 3);
    }

    #[test]
    fn a_guided_click_through_never_stamps_independent_evidence() {
        // S-03 down-stamp path: a learner who presses NO support rung
        // and clicks every rendered answer is a click-through — the
        // evidence is never better than the `supported` band, so
        // MASTERY_POLICY 0.2.0 (independent stage caps support at
        // level 1) can never read these events as independent.
        let scenario = decision_pack();
        let mut s = ScenarioSession::begin(&scenario, "sess-guided").unwrap();
        s.attempt("greet");
        s.attempt("give-name");
        s.attempt("ask-back");
        s.attempt("part");
        let out = s.finish();
        assert_eq!(out.nodes.len(), 3);
        for rec in &out.nodes {
            assert!(
                rec.support_level >= GUIDED_SCENARIO_SUPPORT_FLOOR,
                "{} stamped independent: {}",
                rec.node_id,
                rec.support_level
            );
        }
        let events = ScenarioSession::evidence_events(
            &out,
            "org.openlanguage.test",
            "0.1.0",
            &lts_domain::ProfileId::new("profile-guided"),
            |i| format!("2026-11-08T00:00:0{i}Z"),
        );
        assert_eq!(events.len(), 3);
        for ev in &events {
            assert!(
                ev.support_level.value() >= GUIDED_SCENARIO_SUPPORT_FLOOR,
                "{}: guided scenario event stamped level {}",
                ev.event_id.as_str(),
                ev.support_level.value()
            );
            assert!(
                ev.support_level.value() <= 3,
                "down-stamp must land in the `supported` band, not invent worse levels"
            );
        }
    }

    #[test]
    fn declared_support_above_the_floor_is_preserved() {
        // The floor never OVER-states: a learner who really pressed
        // ladder level 3 keeps level 3 on that node's evidence.
        let scenario = decision_pack();
        let mut s = ScenarioSession::begin(&scenario, "sess-floor").unwrap();
        assert!(s.use_support(3));
        s.attempt("greet");
        s.attempt("give-name");
        s.attempt("ask-back");
        s.attempt("part");
        let out = s.finish();
        assert_eq!(out.nodes[0].support_level, 3, "used support survives");
        assert_eq!(
            out.nodes[1].support_level, GUIDED_SCENARIO_SUPPORT_FLOOR,
            "later nodes keep the floor"
        );
    }

    #[test]
    fn a_pack_without_extra_intents_renders_no_invented_distractors() {
        // The engine never invents content: a single-node pack declares
        // nothing to distract with, and the decision set equals the
        // accepted set. Strict supersets are a property of pack data
        // that declares more moves than the node accepts.
        let scenario = chain(1, 0);
        let s = ScenarioSession::begin(&scenario, "sess-alone").unwrap();
        assert_eq!(s.distractor_actions(), Vec::<String>::new());
        assert_eq!(s.decision_set(), vec!["go0".to_string()]);
    }
}
