//! Derived multimodal mastery (LEARN-002): per (content, dimension)
//! state + heuristic confidence from real `EvidenceEvent`s under the
//! frozen policy. Reading success never grants speaking mastery: each
//! dimension is derived only from events whose exercised modality is
//! that dimension. Support weakens evidence strength relative to
//! independent performance via the confidence factors below. All
//! confidence values are uncalibrated heuristics (policy `confidence`
//! section) and are capped away from certainty.

use crate::policy::{self, ObsInput, Policy};
use lts_domain::{ActivityModality, EvidenceCorrection, EvidenceEvent, MasteryState, Score};

pub const ALGORITHM_VERSION: &str = "mastery-derive-0.1.0";

#[derive(Debug, Clone, PartialEq)]
pub struct DerivedMastery {
    pub content_id: String,
    pub dimension: ActivityModality,
    pub state: MasteryState,
    /// Uncalibrated heuristic in [0, 0.9]; never a statistical interval.
    pub confidence: f32,
    /// "Needs refresh" framing (docs/03 §16): valid evidence exists but
    /// none recent enough. Not a mastery state; display guidance only.
    pub needs_refresh: bool,
    pub policy_version: String,
    pub algorithm_version: String,
}

/// Derive mastery for one (content, dimension) pair from the event log.
/// `now` is RFC 3339 UTC from the app clock (deterministic under test
/// clocks).
pub fn derive_mastery(
    policy: &Policy,
    content_id: &str,
    dimension: ActivityModality,
    events: &[EvidenceEvent],
    corrections: &[EvidenceCorrection],
    now: &str,
) -> Result<DerivedMastery, String> {
    derive_mastery_in_pack(
        policy,
        content_id,
        dimension,
        events,
        corrections,
        now,
        None,
    )
}

/// Derivation with pack scope. When `pack_scope` names a pack, only
/// evidence recorded against that pack (or recorded before pack
/// attribution existed) can grant credit for the content id, so two
/// installed packs that declare the same content id never share mastery
/// (review finding R07). Unattributed evidence stays visible: dropping it
/// would silently erase a learner's history.
pub fn derive_mastery_in_pack(
    policy: &Policy,
    content_id: &str,
    dimension: ActivityModality,
    events: &[EvidenceEvent],
    corrections: &[EvidenceCorrection],
    now: &str,
    pack_scope: Option<&str>,
) -> Result<DerivedMastery, String> {
    let excluded: std::collections::HashSet<&str> = corrections
        .iter()
        .flat_map(|c| c.references.iter().map(|r| r.as_str()))
        .collect();

    let inputs: Vec<ObsInput<'_>> = events
        .iter()
        .filter(|e| pack_scope.is_none_or(|p| e.pack_id.is_empty() || e.pack_id == p))
        .filter(|e| e.modality == dimension)
        .filter(|e| e.targets.iter().any(|t| t.as_str() == content_id))
        .filter(|e| !excluded.contains(e.event_id.as_str()))
        .filter(|e| e.outcome == lts_domain::Outcome::Scored && e.score.is_some())
        .map(|e| ObsInput {
            event_id: e.event_id.as_str(),
            occurred_at: &e.occurred_at,
            score: e.score.unwrap(),
            support: e.support_level.value(),
            activity_id: e.activity_id.as_str(),
            prompt_family_id: e.prompt_family_id.as_ref().map(|p| p.as_str()),
            attempt_group_id: e.attempt_group_id.as_deref(),
            support_actions: &e.support_actions,
            assessment: e.assessment_kind,
        })
        .collect();

    // Dimension-scoped: the policy drops evidence whose recorded support
    // supplied this dimension's assessed construct before the ladder runs.
    let obs = policy::observations(policy, dimension, inputs)?;
    let state = policy::ladder(policy, &obs);
    let confidence = confidence(policy, &obs, state, now)?;
    let needs_refresh = state != MasteryState::Unseen
        && match obs.last() {
            Some(last) => {
                let now = policy::epoch_seconds(now)?;
                now - last.at > policy.regression.stale_after_days_without_valid_evidence * 86_400
            }
            None => false,
        };
    Ok(DerivedMastery {
        content_id: content_id.to_string(),
        dimension,
        state,
        confidence,
        needs_refresh,
        policy_version: policy.policy_version.clone(),
        algorithm_version: ALGORITHM_VERSION.to_string(),
    })
}

/// Heuristic confidence: state rank scaled by support quality, prompt
/// diversity, and recency. Deliberately coarse and capped at 0.9 —
/// unknown/uncalibrated evidence must never read as certain (docs/03 §6).
fn confidence(
    policy: &Policy,
    obs: &[policy::Obs],
    state: MasteryState,
    now: &str,
) -> Result<f32, String> {
    let rank = match state {
        MasteryState::Unseen => return Ok(0.0),
        MasteryState::Introduced => 0.20,
        MasteryState::Supported => 0.40,
        MasteryState::Independent => 0.65,
        MasteryState::Flexible => 0.80,
        MasteryState::Retained => 0.85,
    };
    // Support factor: successes with more scaffolding are weaker evidence.
    let successes: Vec<&policy::Obs> = obs
        .iter()
        .filter(|o| o.score == Score::Correct && o.support <= policy.support.supported_max_level)
        .collect();
    let avg_support = if successes.is_empty() {
        0.0
    } else {
        successes.iter().map(|o| o.support as f32).sum::<f32>() / successes.len() as f32
    };
    let support_factor = (1.0 - 0.08 * avg_support).max(0.5);
    // Diversity: distinct declared prompt families out of 3. Evidence that
    // never recorded a family contributes no diversity credit — absence is
    // not evidence of variety (policy 0.2.0).
    let families: std::collections::HashSet<&str> = successes
        .iter()
        .filter_map(|o| o.family.as_deref())
        .collect();
    let diversity_factor = 0.6 + 0.4 * (families.len() as f32 / 3.0).min(1.0);
    // Recency: full weight for 30 days, linear to 0.5 by 90, floor 0.5.
    let recency_factor = match obs.last() {
        Some(last) => {
            let age_days = (policy::epoch_seconds(now)? - last.at).max(0) as f32 / 86_400.0;
            if age_days <= 30.0 {
                1.0
            } else if age_days <= 90.0 {
                1.0 - (age_days - 30.0) / 120.0
            } else {
                0.5
            }
        }
        None => 0.5,
    };
    Ok((rank * support_factor * diversity_factor * recency_factor).min(0.9))
}
