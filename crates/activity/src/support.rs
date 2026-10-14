//! Support ladder (docs/03 §5 defaults). Support actions are recorded
//! concretely; the ordinal level is a summary, never a mastery weight.

use lts_domain::SupportLevel;
use serde::{Deserialize, Serialize};

/// Concrete scaffold a learner can take during an attempt. Default
/// levels follow the docs/03 §5 table; a rubric may remap per construct
/// (recorded separately; not implemented here).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum SupportAction {
    /// Extra environmental/context cue; no response form or meaning.
    ContextCue,
    /// Additional replay of the input.
    Replay,
    /// Slowed input playback.
    SlowInput,
    /// Limited meaning hint.
    MeaningHint,
    /// Text/reading/form cue that materially narrows the response.
    TextCue,
    /// Word bank / option set.
    WordBank,
    /// Guided choice that materially narrows the response.
    ChoiceSupport,
    /// Partial translation.
    PartialTranslation,
    /// Response template.
    ResponseTemplate,
    /// Full translation available to read.
    FullTranslation,
    /// Full modeled response available to copy/repeat.
    ModeledResponse,
    /// Kana reading (furigana) revealed on demand for a kanji item;
    /// supplied readings cannot establish unsupported script decoding
    /// (docs/03 §5, JA_ORTHOGRAPHY_POLICY reveal_counts_as: support).
    SuppliedReading,
    /// Romaji revealed on demand against the auto-fade rule.
    RomajiReveal,
}

impl SupportAction {
    /// Default ordinal level 0..=5 from docs/03 §5.
    pub fn default_level(self) -> u8 {
        match self {
            Self::ContextCue => 1,
            Self::Replay | Self::SlowInput | Self::MeaningHint => 2,
            Self::TextCue
            | Self::WordBank
            | Self::ChoiceSupport
            | Self::SuppliedReading
            | Self::RomajiReveal => 3,
            Self::PartialTranslation | Self::ResponseTemplate => 4,
            Self::FullTranslation | Self::ModeledResponse => 5,
        }
    }

    /// Stable machine-readable label recorded in evidence. The names live
    /// in `lts_domain::support_actions` — the same vocabulary
    /// `MASTERY_POLICY.yaml` `support.disqualifying_for` lists and the
    /// policy enforces — so a scaffold the learner took can never be
    /// recorded under a name the rules do not know.
    pub fn label(self) -> &'static str {
        use lts_domain::support_actions as sa;
        match self {
            Self::ContextCue => sa::CONTEXT_CUE,
            Self::Replay => sa::REPLAY,
            Self::SlowInput => sa::SLOW_INPUT,
            Self::MeaningHint => sa::MEANING_HINT,
            Self::TextCue => sa::TEXT_CUE,
            Self::WordBank => sa::WORD_BANK,
            Self::ChoiceSupport => sa::CHOICE_SUPPORT,
            Self::PartialTranslation => sa::PARTIAL_TRANSLATION,
            Self::ResponseTemplate => sa::RESPONSE_TEMPLATE,
            Self::FullTranslation => sa::FULL_TRANSLATION,
            Self::ModeledResponse => sa::MODELED_RESPONSE,
            Self::SuppliedReading => sa::SUPPLIED_READING,
            // The romaji reveal is the romanisation crutch the policy names
            // `romaji-substitution` (policy 0.2.0): one name, one meaning,
            // so the disqualifier for production-writing actually matches.
            Self::RomajiReveal => sa::ROMAJI_SUBSTITUTION,
        }
    }

    /// The full default ladder for UI rendering.
    pub fn default_ladder() -> Vec<(SupportAction, u8, &'static str)> {
        use SupportAction::*;
        vec![
            (
                ContextCue,
                1,
                "Extra context cue (no answer form or meaning)",
            ),
            (Replay, 2, "Replay the input again"),
            (SlowInput, 2, "Slow down the input"),
            (MeaningHint, 2, "Limited meaning hint"),
            (TextCue, 3, "Text or form cue narrowing the response"),
            (WordBank, 3, "Word bank"),
            (ChoiceSupport, 3, "Guided choices"),
            (PartialTranslation, 4, "Partial translation"),
            (ResponseTemplate, 4, "Response template"),
            (FullTranslation, 5, "Full translation"),
            (ModeledResponse, 5, "Full modeled response to copy"),
        ]
    }
}

/// Support actually taken during one attempt. Support revealed earlier
/// in an attempt stays part of that attempt's evidence even if hidden
/// before submission (docs/03 §5).
#[derive(Debug, Clone, Default)]
pub struct SupportLedger {
    actions: Vec<SupportAction>,
}

impl SupportLedger {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn record(&mut self, action: SupportAction) {
        self.actions.push(action);
    }

    /// Ordinal summary = strongest action taken (docs/03 §5).
    pub fn level(&self) -> SupportLevel {
        self.actions
            .iter()
            .map(|a| a.default_level())
            .max()
            .and_then(SupportLevel::new)
            .unwrap_or_else(SupportLevel::independent)
    }

    /// Concrete actions taken, in order, as evidence labels.
    pub fn action_labels(&self) -> Vec<String> {
        self.actions.iter().map(|a| a.label().to_string()).collect()
    }

    pub fn is_empty(&self) -> bool {
        self.actions.is_empty()
    }
}
