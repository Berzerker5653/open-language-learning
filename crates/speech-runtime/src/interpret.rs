//! Pronunciation interpretation (SPEECH-005).
//!
//! Guided feedback only: no numeric grades, no mastery. ASR/alignment
//! success is never a pronunciation score — corrections require
//! reliable acoustic evidence, and every gap abstains with a reason
//! (docs/05 "Recognition vs pronunciation").

use lts_speech_api::{
    ConfidenceBand, Correction, PronunciationEvidence, PronunciationInterpreter, ProviderInfo,
    ProviderOutcome, ReasonCode,
};

/// Vowel-length contrast interpreter (long vs short vowels, e.g.
/// おばさん / おばあさん).
///
/// Self-normalized within the learner's own attempt: the ratio of the
/// long-word duration to the short-word duration, compared against the
/// same ratio measured on the pack's reviewed reference audio. This
/// cancels global speaking rate; it does NOT claim mora equality
/// (docs/06). Bands are guided (`PossibleIssue`/`Confident`); automatic
/// mastery requires SPEECH-007 calibration.
pub struct VowelLengthInterpreter {
    /// Pack-declared feature id (speech profile), e.g. `ja.phon.long-vowel`.
    pub feature_id: String,
    /// Aligned unit ids the exercise expects, in order.
    pub short_unit_id: String,
    pub long_unit_id: String,
    /// dur(long) / dur(short) measured on reference audio.
    pub reference_ratio: f64,
    /// Relative acceptance band around the reference ratio.
    pub tolerance_low: f64,
    pub tolerance_high: f64,
    /// Minimum alignment confidence to interpret at all.
    pub min_alignment_confidence: f32,
}

impl Default for VowelLengthInterpreter {
    fn default() -> Self {
        Self {
            feature_id: "ja.phon.long-vowel".into(),
            short_unit_id: String::new(),
            long_unit_id: String::new(),
            reference_ratio: 1.0,
            tolerance_low: 0.8,
            tolerance_high: 1.25,
            min_alignment_confidence: 0.6,
        }
    }
}

fn find_duration(evidence: &PronunciationEvidence, unit_id: &str) -> Option<f64> {
    evidence
        .features
        .iter()
        .find(|f| {
            f.feature_id == "duration.voiced-seconds"
                && f.reliable
                && f.span.as_ref().is_some_and(|s| s.unit_id == unit_id)
        })
        .map(|f| f.value)
}

impl PronunciationInterpreter for VowelLengthInterpreter {
    fn info(&self) -> ProviderInfo {
        ProviderInfo {
            id: "vowel-length-interpreter".into(),
            version: "0.1.0".into(),
            kind: "pronunciation-interpreter".into(),
            locales: vec!["ja".into()],
            requires_network: false,
        }
    }

    fn interpret(&self, evidence: &PronunciationEvidence) -> ProviderOutcome<Vec<Correction>> {
        let align_conf = evidence.alignment.overall_confidence.unwrap_or(0.0);
        if align_conf < self.min_alignment_confidence {
            return ProviderOutcome::Abstained {
                reason: ReasonCode::new("low-alignment-confidence"),
            };
        }
        let (Some(short), Some(long)) = (
            find_duration(evidence, &self.short_unit_id),
            find_duration(evidence, &self.long_unit_id),
        ) else {
            // Alignment/ASR succeeded but there is no reliable duration
            // evidence: that is unavailable evidence, not a score.
            return ProviderOutcome::Abstained {
                reason: ReasonCode::new("no-reliable-duration-evidence"),
            };
        };
        if short <= 0.0 || self.reference_ratio <= 0.0 {
            return ProviderOutcome::Abstained {
                reason: ReasonCode::new("invalid-duration-measurement"),
            };
        }
        let rel = (long / short) / self.reference_ratio;
        let (band, template) = if rel < self.tolerance_low {
            (ConfidenceBand::PossibleIssue, "speech.long-vowel.shorter")
        } else if rel > self.tolerance_high {
            (ConfidenceBand::PossibleIssue, "speech.long-vowel.longer")
        } else {
            (ConfidenceBand::Confident, "speech.long-vowel.close")
        };
        ProviderOutcome::Usable {
            value: vec![Correction {
                feature_id: self.feature_id.clone(),
                band,
                feedback_template_id: template.into(),
            }],
            confidence: Some(align_conf),
        }
    }
}
