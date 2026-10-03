//! Evidence event model (docs/03 §3, docs/08 "Evidence immutability").
//!
//! Evidence is append-oriented. Only valid `Scored` results may affect
//! linguistic mastery or memory-retrieval ratings; technical failures,
//! abstention, skips, deferrals, and exclusions never create positive or
//! negative linguistic evidence.

use crate::ids::{ContentId, EventId, ProfileId};
use crate::mastery::SupportLevel;
use serde::{Deserialize, Serialize};

/// Result classification for a learner attempt (docs/03 §3).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum Outcome {
    /// A valid scored observation; the only kind that may affect mastery.
    Scored,
    /// Provider/device/technical failure; no linguistic meaning.
    TechnicalFailure,
    /// The assessor could not confidently judge; no linguistic meaning.
    Abstained,
    /// Learner chose not to attempt; no linguistic meaning.
    Skipped,
    /// Modality deferred (e.g. accessibility accommodation); no linguistic meaning.
    Deferred,
    /// Content or prior evidence found invalid; excluded from derivation.
    Excluded,
}

impl Outcome {
    /// Whether this outcome can carry linguistic mastery or scheduler ratings.
    pub fn is_linguistically_scored(self) -> bool {
        self == Self::Scored
    }
}

/// Whether a scored attempt succeeded, and how strongly.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum Score {
    Correct,
    PartiallyCorrect,
    Incorrect,
}

/// The response modality actually exercised by the activity.
pub use crate::mastery::MasteryDimension as ActivityModality;

/// Assessment kind (docs/03 §10).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum AssessmentKind {
    Diagnostic,
    Formative,
    Checkpoint,
    Transfer,
    Retention,
}

/// An appended learner observation. Fields follow docs/03 §3; privacy rule:
/// store content IDs and outcomes, not free-form speech, unless a disclosed
/// feature requires more (docs/08).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct EvidenceEvent {
    pub event_id: EventId,
    /// RFC 3339 UTC timestamp string; storage owns the clock.
    pub occurred_at: String,
    pub profile_id: ProfileId,
    /// Content targets this evidence bears on.
    pub targets: Vec<ContentId>,
    pub modality: ActivityModality,
    /// Activity template ID from the pack.
    pub activity_id: ContentId,
    /// Prompt family for exposure/guessing-resistance accounting.
    pub prompt_family_id: Option<ContentId>,
    /// Attempt/assessment group: immediate retries share one group and cannot
    /// create multiple independent observations (docs/03 §5).
    pub attempt_group_id: Option<String>,
    pub support_level: SupportLevel,
    /// Actual support actions taken (hint/replay/translation IDs or labels).
    pub support_actions: Vec<String>,
    pub outcome: Outcome,
    pub score: Option<Score>,
    /// Assessment kind when the attempt was part of an assessment.
    pub assessment_kind: Option<AssessmentKind>,
    /// Held-out status of the prompt at attempt time (docs/03 §11).
    pub held_out: bool,
    /// Provider/model confidence when speech was involved (raw, uncalibrated).
    pub provider_confidence: Option<f32>,
    /// Content/pack versions in effect, for reproducibility.
    pub pack_id: String,
    pub pack_version: String,
    /// Versions of the activity/rubric/policy interpretations (recorded by
    /// the derivation layer; stored here when known).
    pub rubric_version: Option<String>,
    pub policy_version: Option<String>,
    /// Privacy-safe device/provider metadata for reproducibility.
    pub provider_id: Option<String>,
    /// Machine-readable reason for non-linguistic outcomes
    /// (TechnicalFailure/Abstained), e.g. "asr-timeout", "mic-denied".
    /// Never contains transcript or audio content (docs/08).
    pub failure_reason: Option<String>,
}

impl EvidenceEvent {
    /// True when this event may feed mastery/scheduler derivation.
    pub fn is_scored_evidence(&self) -> bool {
        self.outcome.is_linguistically_scored() && self.score.is_some()
    }
}

/// A correction/exclusion referencing prior evidence without deleting it
/// (docs/03 §11, docs/08).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct EvidenceCorrection {
    pub event_id: EventId,
    pub occurred_at: String,
    pub profile_id: ProfileId,
    /// Original events affected.
    pub references: Vec<EventId>,
    pub reason: String,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ids::{ContentId, EventId, ProfileId};
    use crate::mastery::{MasteryDimension, SupportLevel};

    fn event(outcome: Outcome, score: Option<Score>) -> EvidenceEvent {
        EvidenceEvent {
            event_id: EventId::new("e1"),
            occurred_at: "2026-10-02T12:00:00Z".into(),
            profile_id: ProfileId::new("p1"),
            targets: vec![ContentId::parse("ja.lex.person.watashi").unwrap()],
            modality: MasteryDimension::RecallMeaning,
            activity_id: ContentId::parse("ja.activity.recall-choice").unwrap(),
            prompt_family_id: None,
            attempt_group_id: None,
            support_level: SupportLevel::independent(),
            support_actions: vec![],
            outcome,
            score,
            assessment_kind: None,
            held_out: false,
            provider_confidence: None,
            pack_id: "org.openlanguage.ja-jp.reference".into(),
            pack_version: "0.1.0".into(),
            rubric_version: None,
            policy_version: None,
            provider_id: None,
            failure_reason: None,
        }
    }

    #[test]
    fn only_scored_outcomes_count() {
        assert!(event(Outcome::Scored, Some(Score::Correct)).is_scored_evidence());
        for non_scored in [
            Outcome::TechnicalFailure,
            Outcome::Abstained,
            Outcome::Skipped,
            Outcome::Deferred,
            Outcome::Excluded,
        ] {
            assert!(!event(non_scored, None).is_scored_evidence());
            // Even a score attached to a non-scored outcome never counts.
            assert!(!event(non_scored, Some(Score::Correct)).is_scored_evidence());
        }
        // A scored outcome without a score is incomplete, not linguistic evidence.
        assert!(!event(Outcome::Scored, None).is_scored_evidence());
    }

    #[test]
    fn serde_roundtrip() {
        let e = event(Outcome::Scored, Some(Score::PartiallyCorrect));
        let json = serde_json::to_string(&e).unwrap();
        let back: EvidenceEvent = serde_json::from_str(&json).unwrap();
        assert_eq!(e, back);
        assert!(json.contains("\"partially-correct\""));
    }
}
