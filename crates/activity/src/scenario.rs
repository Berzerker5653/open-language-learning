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

/// Finalized scenario session.
#[derive(Debug, Clone, Serialize)]
pub struct ScenarioOutcome {
    pub scenario_id: String,
    pub nodes: Vec<NodeRecord>,
    pub transfers_completed: Vec<String>,
    pub transfer_requirement_met: bool,
}

/// One in-progress scenario session.
pub struct ScenarioSession {
    scenario: PackScenario,
    current: String,
    active_recovery: Option<RecoveryBranch>,
    support_used: Vec<u8>,
    attempts: u32,
    records: Vec<NodeRecord>,
    transfers: Vec<String>,
}

impl ScenarioSession {
    /// Begin at the scenario's first node.
    pub fn begin(scenario: &PackScenario) -> Option<Self> {
        let first = scenario.nodes.first()?.id.clone();
        Some(Self {
            scenario: scenario.clone(),
            current: first,
            active_recovery: None,
            support_used: Vec::new(),
            attempts: 0,
            records: Vec::new(),
            transfers: Vec::new(),
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
            None => StepResult::Completed,
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

    /// Finalize: node records + transfer coverage.
    pub fn finish(self) -> ScenarioOutcome {
        let met = self.transfer_requirement_met();
        ScenarioOutcome {
            scenario_id: self.scenario.id,
            nodes: self.records,
            transfers_completed: self.transfers,
            transfer_requirement_met: met,
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
                    node_id,
                    pack_id,
                    pack_version,
                )
                .attempt_group(format!("{}:{}", outcome.scenario_id, rec.node_id))
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
                    EventId::new(format!("{}:node:{}", outcome.scenario_id, i)),
                    clock(i),
                    profile_id.clone(),
                )
            })
            .collect()
    }
}
