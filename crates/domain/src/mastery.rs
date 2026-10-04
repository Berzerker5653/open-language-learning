//! Mastery dimensions, derived states, and support levels (docs/03 §4-6).
//!
//! States are derived from evidence by a versioned policy (LEARN-005); this
//! module only fixes the canonical vocabulary so storage, packs, and the UI
//! share one contract.

use serde::{Deserialize, Serialize};

/// Modality/dimension axes tracked independently (docs/03 §4). Evidence in one
/// dimension informs but never automatically grants another.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum MasteryDimension {
    ComprehensionListening,
    ComprehensionReading,
    RecallMeaning,
    OrthographyRecognition,
    /// Perceptual contrast discrimination (K-10, HVPT/minimal-pair
    /// training). Kept separate from the production pronunciation
    /// dimensions: hearing a contrast does not grant credit for
    /// producing it (docs/03 §4 — evidence in one dimension informs but
    /// never automatically grants another).
    PhonologicalDiscrimination,
    /// Perceptual encoding of written form (K-12 dictation): hearing a
    /// target and typing its spelling. Kept separate from
    /// production-writing — MASTERY_POLICY lists dictation-of-target as
    /// disqualifying support for generative writing, so dictation
    /// evidence must never land there.
    OrthographicEncoding,
    ProductionSpeaking,
    ProductionWriting,
    PronunciationSegmental,
    PronunciationProsody,
    GrammarControlled,
    GrammarSpontaneous,
    PragmaticUse,
    Interaction,
    Retention,
}

/// Canonical derived mastery states (docs/00 §9, docs/03 §5). Regression is
/// allowed; transitions are decided by the versioned mastery policy.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum MasteryState {
    Unseen,
    Introduced,
    Supported,
    Independent,
    Flexible,
    Retained,
}

/// Evidence/availability markers that are NOT mastery states (docs/00 §9).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum EvidenceAvailability {
    Unassessed,
    Deferred,
    Excluded,
}

/// Ordinal support level 0..=5 with the default meanings in docs/03 §5.
/// Levels are not interchangeable across modalities and are never a numeric
/// mastery weight.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[serde(try_from = "u8", into = "u8")]
pub struct SupportLevel(u8);

pub const MAX_SUPPORT_LEVEL: u8 = 5;

impl SupportLevel {
    pub fn new(level: u8) -> Option<Self> {
        if level <= MAX_SUPPORT_LEVEL {
            Some(Self(level))
        } else {
            None
        }
    }

    /// No additional answer-revealing scaffold beyond the declared task.
    pub fn independent() -> Self {
        Self(0)
    }

    pub fn value(self) -> u8 {
        self.0
    }

    /// Whether this level counts as "minimal help" for independent-success
    /// rules. The versioned policy may override per rubric; this default
    /// treats levels 0-1 as minimal.
    pub fn is_minimal_help(self) -> bool {
        self.0 <= 1
    }
}

impl TryFrom<u8> for SupportLevel {
    type Error = String;
    fn try_from(v: u8) -> Result<Self, Self::Error> {
        Self::new(v).ok_or_else(|| format!("support level must be 0..={MAX_SUPPORT_LEVEL}"))
    }
}

impl From<SupportLevel> for u8 {
    fn from(v: SupportLevel) -> u8 {
        v.0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn support_level_bounds() {
        assert_eq!(SupportLevel::new(0).unwrap().value(), 0);
        assert_eq!(SupportLevel::new(5).unwrap().value(), 5);
        assert!(SupportLevel::new(6).is_none());
        assert!(SupportLevel::independent().is_minimal_help());
        assert!(!SupportLevel::new(4).unwrap().is_minimal_help());
    }

    #[test]
    fn serde_kebab_case() {
        assert_eq!(
            serde_json::to_string(&MasteryDimension::ComprehensionListening).unwrap(),
            "\"comprehension-listening\""
        );
        assert_eq!(
            serde_json::to_string(&MasteryState::Independent).unwrap(),
            "\"independent\""
        );
        assert_eq!(
            serde_json::to_string(&EvidenceAvailability::Deferred).unwrap(),
            "\"deferred\""
        );
    }

    #[test]
    fn state_order_is_canonical() {
        let mut states = [
            MasteryState::Retained,
            MasteryState::Unseen,
            MasteryState::Flexible,
            MasteryState::Introduced,
            MasteryState::Supported,
            MasteryState::Independent,
        ];
        states.sort();
        assert_eq!(
            states,
            [
                MasteryState::Unseen,
                MasteryState::Introduced,
                MasteryState::Supported,
                MasteryState::Independent,
                MasteryState::Flexible,
                MasteryState::Retained,
            ]
        );
    }
}
