//! Lightweight world/progression layer (GAME-001).
//!
//! Environments and interactions unlock from *capabilities* (derived
//! mastery per content+modality), never from daily activity counts or
//! streaks (ADR-0002; docs/01). This crate is pure logic: the learning
//! engine and its tests never depend on graphics, and the world layer
//! is optional — a caller can render nothing at all.

use lts_domain::{ActivityModality, MasteryState};
use std::collections::HashMap;

/// One capability requirement for an unlock.
#[derive(Debug, Clone, PartialEq)]
pub struct CapabilityRequirement {
    pub content_id: String,
    pub modality: ActivityModality,
    /// Minimum state that satisfies the requirement (state order:
    /// Unseen < Introduced < Supported < Independent < Flexible <
    /// Retained).
    pub min_state: MasteryState,
}

/// An environment/interaction declared by the world config. Config is
/// supplied by the app/pack layer; this crate holds no language- or
/// content-specific data.
#[derive(Debug, Clone, PartialEq)]
pub struct Environment {
    pub id: String,
    pub display_name: String,
    pub requires: Vec<CapabilityRequirement>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct WorldConfig {
    pub environments: Vec<Environment>,
    pub version: String,
}

/// Capability snapshot: (content, modality) -> state. Derived mastery
/// is the only unlock input; activity counts and dates are not inputs
/// at all, so streak-shaped engagement cannot unlock anything.
#[derive(Debug, Clone, PartialEq)]
pub struct CapabilitySnapshot {
    pub states: HashMap<(String, ActivityModality), MasteryState>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct EnvironmentStatus {
    pub id: String,
    pub display_name: String,
    pub unlocked: bool,
    /// Requirements not yet met (for "what would open this" hints).
    pub missing: Vec<CapabilityRequirement>,
}

fn state_rank(s: MasteryState) -> u8 {
    match s {
        MasteryState::Unseen => 0,
        MasteryState::Introduced => 1,
        MasteryState::Supported => 2,
        MasteryState::Independent => 3,
        MasteryState::Flexible => 4,
        MasteryState::Retained => 5,
    }
}

/// Deterministic evaluation: same capabilities -> same unlocks,
/// regardless of when or how often the learner practiced.
pub fn evaluate(config: &WorldConfig, snapshot: &CapabilitySnapshot) -> Vec<EnvironmentStatus> {
    config
        .environments
        .iter()
        .map(|env| {
            let missing: Vec<CapabilityRequirement> = env
                .requires
                .iter()
                .filter(|r| {
                    let have = snapshot
                        .states
                        .get(&(r.content_id.clone(), r.modality))
                        .copied()
                        .unwrap_or(MasteryState::Unseen);
                    state_rank(have) < state_rank(r.min_state)
                })
                .cloned()
                .collect();
            EnvironmentStatus {
                id: env.id.clone(),
                display_name: env.display_name.clone(),
                unlocked: missing.is_empty(),
                missing,
            }
        })
        .collect()
}
