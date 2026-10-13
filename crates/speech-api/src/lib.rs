//! Speech provider contracts (docs/05 "Provider interfaces").
//!
//! This crate compiles with zero concrete provider dependencies. Every
//! provider result distinguishes `usable`, `quality-rejected`,
//! `utterance-mismatch`, `unsupported`, `provider-error`, and `abstained`,
//! preserving per-stage reason codes so a technical failure is never treated
//! as a learner error.

pub mod calibration;
use serde::{Deserialize, Serialize};

/// Outcome classification shared by all provider stages (docs/05).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ProviderStatus {
    /// Stage produced usable output.
    Usable,
    /// Input quality gate rejected the capture (silence, clipping, noise...).
    QualityRejected,
    /// The utterance does not match the expected target; a confident mismatch
    /// may be linguistic evidence for the task, but never a pronunciation score.
    UtteranceMismatch,
    /// This provider/model cannot do the requested feature.
    Unsupported,
    /// Provider/runtime failure; no linguistic meaning.
    ProviderError,
    /// Provider declined to judge below its confidence floor; no linguistic meaning.
    Abstained,
}

/// Machine-readable reason code for non-usable outcomes.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ReasonCode(pub String);

impl ReasonCode {
    pub fn new(code: impl Into<String>) -> Self {
        Self(code.into())
    }
    pub fn as_str(&self) -> &str {
        &self.0
    }
}

/// A provider stage result. `confidence` is a raw provider score, never a
/// calibrated probability, and is not comparable across providers (docs/05).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum ProviderOutcome<T> {
    Usable { value: T, confidence: Option<f32> },
    QualityRejected { reason: ReasonCode },
    UtteranceMismatch { reason: ReasonCode },
    Unsupported { reason: ReasonCode },
    ProviderError { reason: ReasonCode },
    Abstained { reason: ReasonCode },
}

impl<T> ProviderOutcome<T> {
    pub fn usable(value: T, confidence: Option<f32>) -> Self {
        Self::Usable { value, confidence }
    }

    pub fn status(&self) -> ProviderStatus {
        match self {
            Self::Usable { .. } => ProviderStatus::Usable,
            Self::QualityRejected { .. } => ProviderStatus::QualityRejected,
            Self::UtteranceMismatch { .. } => ProviderStatus::UtteranceMismatch,
            Self::Unsupported { .. } => ProviderStatus::Unsupported,
            Self::ProviderError { .. } => ProviderStatus::ProviderError,
            Self::Abstained { .. } => ProviderStatus::Abstained,
        }
    }

    pub fn is_usable(&self) -> bool {
        matches!(self, Self::Usable { .. })
    }

    /// Whether this stage result carries no linguistic meaning at all
    /// (docs/05 "Input quality gate").
    pub fn is_linguistically_neutral(&self) -> bool {
        !matches!(self, Self::Usable { .. } | Self::UtteranceMismatch { .. })
    }

    pub fn value(self) -> Option<T> {
        match self {
            Self::Usable { value, .. } => Some(value),
            _ => None,
        }
    }
}

/// User-facing confidence band (docs/05 "Confidence policy"). Numeric
/// precision is never presented to users.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ConfidenceBand {
    Confident,
    PossibleIssue,
    UnableToAssess,
}

/// Mono PCM audio in memory. Raw recordings are memory-only by default
/// (docs/08 "Deletion and recovery contract").
#[derive(Debug, Clone, PartialEq)]
pub struct AudioBuffer {
    pub samples: Vec<f32>,
    pub sample_rate_hz: u32,
}

impl AudioBuffer {
    pub fn duration_ms(&self) -> u64 {
        if self.sample_rate_hz == 0 {
            return 0;
        }
        (self.samples.len() as u64 * 1000) / self.sample_rate_hz as u64
    }
}

/// A detected speech segment in samples.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SpeechSegment {
    pub start_sample: usize,
    pub end_sample: usize,
}

/// Recognition result with alternatives; empty text is not silently treated
/// as a learner error.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct RecognitionResult {
    pub transcript: String,
    pub alternatives: Vec<String>,
    /// Character/word timing when the provider supports it.
    pub timestamps: bool,
}

/// Hints for constrained recognition (the app often knows the target).
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct RecognitionHints {
    /// Expected utterance IDs from the pack, if a constrained mode is active.
    pub expected_ids: Vec<String>,
    /// Pack-declared locale/model hints.
    pub locale_hint: Option<String>,
}

/// Alignment span for one language-relevant unit (phone/mora/word as
/// declared by the pack).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct AlignmentSpan {
    pub unit_id: String,
    pub start_sample: usize,
    pub end_sample: usize,
    pub confidence: Option<f32>,
}

/// Full alignment result; providers must abstain on large mismatch.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Alignment {
    pub spans: Vec<AlignmentSpan>,
    pub overall_confidence: Option<f32>,
}

/// An expected utterance for verification/alignment, resolved from pack data.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ExpectedUtterance {
    pub content_id: String,
    /// Pack-declared alignment units for this utterance.
    pub units: Vec<String>,
}

/// A generic acoustic measurement (docs/05 "Acoustic features"). The pack
/// decides which features matter and how they are interpreted.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct FeatureObservation {
    pub feature_id: String,
    pub span: Option<AlignmentSpan>,
    pub value: f64,
    /// Voicing/tracking reliability where applicable; missing F0 is
    /// unavailable evidence, not low pitch (docs/05).
    pub reliable: bool,
}

/// Prosodic summary for an utterance.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ProsodyProfile {
    pub observations: Vec<FeatureObservation>,
}

/// Evidence bundle for pronunciation interpretation: alignment plus features.
/// ASR success alone is never a pronunciation score (docs/05).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PronunciationEvidence {
    pub alignment: Alignment,
    pub features: Vec<FeatureObservation>,
    pub prosody: Option<ProsodyProfile>,
}

/// One actionable correction with a confidence band.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Correction {
    pub feature_id: String,
    pub band: ConfidenceBand,
    /// Pack-provided feedback template ID; rendering is the UI's job.
    pub feedback_template_id: String,
}

/// Provider capability descriptor used by the resolver.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ProviderInfo {
    pub id: String,
    pub version: String,
    /// e.g. "asr", "vad", "tts", "alignment", "features", "prosody", "interpreter".
    pub kind: String,
    pub locales: Vec<String>,
    pub requires_network: bool,
}

// ---------------------------------------------------------------------------
// Provider contracts (docs/05). Object-safe so the runtime can hold boxed
// providers chosen by a resolver.
// ---------------------------------------------------------------------------

pub trait AudioPreprocessor: Send + Sync {
    fn info(&self) -> ProviderInfo;
    fn process(&self, audio: &AudioBuffer) -> ProviderOutcome<AudioBuffer>;
}

pub trait VoiceActivityProvider: Send + Sync {
    fn info(&self) -> ProviderInfo;
    /// Also implements the input quality gate signals via reason codes.
    fn detect(&self, audio: &AudioBuffer) -> ProviderOutcome<Vec<SpeechSegment>>;
}

pub trait SpeechRecognitionProvider: Send + Sync {
    fn info(&self) -> ProviderInfo;
    fn recognize(
        &self,
        audio: &AudioBuffer,
        hints: &RecognitionHints,
    ) -> ProviderOutcome<RecognitionResult>;
}

pub trait AlignmentProvider: Send + Sync {
    fn info(&self) -> ProviderInfo;
    /// Must verify the utterance first; alignment to expected text cannot by
    /// itself prove the text was spoken (docs/05).
    fn align(
        &self,
        audio: &AudioBuffer,
        expected: &ExpectedUtterance,
    ) -> ProviderOutcome<Alignment>;
}

pub trait AcousticFeatureProvider: Send + Sync {
    fn info(&self) -> ProviderInfo;
    fn extract(
        &self,
        audio: &AudioBuffer,
        alignment: &Alignment,
    ) -> ProviderOutcome<Vec<FeatureObservation>>;
}

pub trait ProsodyProvider: Send + Sync {
    fn info(&self) -> ProviderInfo;
    fn analyze(
        &self,
        audio: &AudioBuffer,
        alignment: &Alignment,
    ) -> ProviderOutcome<ProsodyProfile>;
}

pub trait PronunciationInterpreter: Send + Sync {
    fn info(&self) -> ProviderInfo;
    /// Interpretation policy comes from the pack; the interpreter may return
    /// an empty list or abstain. Automatic feedback requires calibration
    /// (docs/17); guided paths never emit numeric grades.
    fn interpret(&self, evidence: &PronunciationEvidence) -> ProviderOutcome<Vec<Correction>>;
}

#[cfg(test)]
mod tests {
    use super::*;

    // A mock provider proves the contracts compile and are usable without any
    // concrete provider dependency (ARCH-001 acceptance).
    struct MockAsr;

    impl SpeechRecognitionProvider for MockAsr {
        fn info(&self) -> ProviderInfo {
            ProviderInfo {
                id: "mock-asr".into(),
                version: "0.0.0".into(),
                kind: "asr".into(),
                locales: vec!["ja".into()],
                requires_network: false,
            }
        }
        fn recognize(
            &self,
            audio: &AudioBuffer,
            _hints: &RecognitionHints,
        ) -> ProviderOutcome<RecognitionResult> {
            if audio.samples.is_empty() {
                return ProviderOutcome::QualityRejected {
                    reason: ReasonCode::new("silence"),
                };
            }
            ProviderOutcome::usable(
                RecognitionResult {
                    transcript: "こんにちは".into(),
                    alternatives: vec![],
                    timestamps: false,
                },
                Some(0.9),
            )
        }
    }

    #[test]
    fn providers_are_object_safe() {
        let provider: Box<dyn SpeechRecognitionProvider> = Box::new(MockAsr);
        let silent = AudioBuffer {
            samples: vec![],
            sample_rate_hz: 16000,
        };
        let result = provider.recognize(&silent, &RecognitionHints::default());
        assert_eq!(result.status(), ProviderStatus::QualityRejected);
        assert!(result.is_linguistically_neutral());

        let voiced = AudioBuffer {
            samples: vec![0.1; 1600],
            sample_rate_hz: 16000,
        };
        let result = provider.recognize(&voiced, &RecognitionHints::default());
        assert!(result.is_usable());
        assert_eq!(result.value().unwrap().transcript, "こんにちは");
    }

    #[test]
    fn mismatch_is_the_only_non_usable_linguistic_signal() {
        let mismatch: ProviderOutcome<Alignment> = ProviderOutcome::UtteranceMismatch {
            reason: ReasonCode::new("expected-phrase-not-spoken"),
        };
        let error: ProviderOutcome<Alignment> = ProviderOutcome::ProviderError {
            reason: ReasonCode::new("model-load-failed"),
        };
        let abstain: ProviderOutcome<Alignment> = ProviderOutcome::Abstained {
            reason: ReasonCode::new("below-confidence-floor"),
        };
        assert!(!mismatch.is_linguistically_neutral());
        assert!(error.is_linguistically_neutral());
        assert!(abstain.is_linguistically_neutral());
    }

    #[test]
    fn audio_duration_and_serde() {
        let audio = AudioBuffer {
            samples: vec![0.0; 16000],
            sample_rate_hz: 16000,
        };
        assert_eq!(audio.duration_ms(), 1000);
        let seg = SpeechSegment {
            start_sample: 0,
            end_sample: 100,
        };
        let json = serde_json::to_string(&seg).unwrap();
        let back: SpeechSegment = serde_json::from_str(&json).unwrap();
        assert_eq!(back, seg);
    }
}
