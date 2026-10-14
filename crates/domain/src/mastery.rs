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
/// Canonical support-action vocabulary, recorded in
/// `evidence_events.support_actions_json`.
///
/// One source for three consumers: the scaffold ladder
/// (`lts_activity::support::SupportAction::label`) emits these names,
/// `docs/assessment/MASTERY_POLICY.yaml` `support.disqualifying_for` lists
/// them per assessed dimension, and the policy drops matching evidence for
/// that dimension only (docs/03 §5). Anything outside `ALL` is a policy
/// validation error, so a typo can never silently disable a disqualifier.
pub mod support_actions {
    // Scaffolds available during an attempt (docs/03 §5 ladder).
    pub const CONTEXT_CUE: &str = "context-cue";
    pub const REPLAY: &str = "replay";
    pub const SLOW_INPUT: &str = "slow-input";
    pub const MEANING_HINT: &str = "meaning-hint";
    pub const TEXT_CUE: &str = "text-cue";
    pub const WORD_BANK: &str = "word-bank";
    pub const CHOICE_SUPPORT: &str = "choice-support";
    pub const PARTIAL_TRANSLATION: &str = "partial-translation";
    pub const RESPONSE_TEMPLATE: &str = "response-template";
    pub const FULL_TRANSLATION: &str = "full-translation";
    pub const MODELED_RESPONSE: &str = "modeled-response";
    // Reveals that hand over the assessed construct: disqualifying for the
    // dimension they supply, never for the others.
    pub const SUPPLIED_READING: &str = "supplied-reading";
    pub const ROMAJI_SUBSTITUTION: &str = "romaji-substitution";
    pub const AUDIO_PLAYBACK_OF_TARGET: &str = "audio-playback-of-target";
    pub const TRANSLATION: &str = "translation";
    pub const TRANSCRIPT: &str = "transcript";
    pub const DICTATION_OF_TARGET: &str = "dictation-of-target";
    pub const TEXT_INPUT_SUBSTITUTION: &str = "text-input-substitution";
    pub const TARGET_VISIBLE_IN_OPTIONS: &str = "target-visible-in-options";

    /// Every name the policy may list. The policy loader rejects unknown
    /// names for the same reason the ladder emits only these.
    pub const ALL: [&str; 19] = [
        CONTEXT_CUE,
        REPLAY,
        SLOW_INPUT,
        MEANING_HINT,
        TEXT_CUE,
        WORD_BANK,
        CHOICE_SUPPORT,
        PARTIAL_TRANSLATION,
        RESPONSE_TEMPLATE,
        FULL_TRANSLATION,
        MODELED_RESPONSE,
        SUPPLIED_READING,
        ROMAJI_SUBSTITUTION,
        AUDIO_PLAYBACK_OF_TARGET,
        TRANSLATION,
        TRANSCRIPT,
        DICTATION_OF_TARGET,
        TEXT_INPUT_SUBSTITUTION,
        TARGET_VISIBLE_IN_OPTIONS,
    ];
}

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
