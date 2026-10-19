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

/// Result of an intent attempt at the current node.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum StepResult {
    /// Intent accepted; moved to the next node (or recovery target).
    Advanced { to: String },
    /// Intent accepted at the final node; scenario chain complete.
    Completed,
    /// Intent not among the node's accepted actions. `recovery` lists
    /// pack-defined recovery branch ids the learner can take.
    NotSatisfied { recovery: Vec<String> },
}

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
            (
                node.expected_actions.is_empty()
                    || node.expected_actions.iter().any(|a| a == intent),
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

        // Node satisfied: record and advance along the first edge.
        self.records.push(NodeRecord {
            node_id: self.current.clone(),
            support_level: self.support_level().value(),
            attempts: self.attempts,
            succeeded: true,
        });
        self.support_used.clear();
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
                    SupportLevel::new(rec.support_level).unwrap_or_else(SupportLevel::independent),
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
}
