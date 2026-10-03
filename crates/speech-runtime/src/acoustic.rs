//! Acoustic feature providers (SPEECH-005).
//!
//! Measurements only: the pack (speech profiles) decides which features
//! are taught/assessed, and interpretation is separate (docs/05).

use lts_speech_api::{
    AcousticFeatureProvider, Alignment, AudioBuffer, FeatureObservation, ProviderInfo,
    ProviderOutcome, ReasonCode,
};

/// Voiced (energy-gated) duration in seconds per alignment span.
///
/// Deliberately crude: an energy gate, not a glottal measure. Spans with
/// no voiced frames are `reliable = false` — missing evidence, never a
/// zero-length claim (docs/05).
pub struct VoicedDurationFeature {
    pub frame: usize,
    pub speech_rms: f32,
}

impl Default for VoicedDurationFeature {
    fn default() -> Self {
        Self {
            frame: 320,
            speech_rms: 0.01,
        }
    }
}

fn rms(samples: &[f32]) -> f32 {
    if samples.is_empty() {
        return 0.0;
    }
    let sum: f32 = samples.iter().map(|s| s * s).sum();
    (sum / samples.len() as f32).sqrt()
}

/// Voiced seconds over an arbitrary buffer (reference measurements).
pub fn voiced_seconds(audio: &AudioBuffer, frame: usize, speech_rms: f32) -> f64 {
    let mut voiced = 0usize;
    for chunk in audio.samples.chunks(frame) {
        if chunk.len() < frame / 2 {
            continue;
        }
        if rms(chunk) > speech_rms {
            voiced += chunk.len();
        }
    }
    voiced as f64 / audio.sample_rate_hz as f64
}

impl VoicedDurationFeature {
    pub fn voiced_seconds_in(&self, audio: &AudioBuffer, start: usize, end: usize) -> f64 {
        let start = start.min(audio.samples.len());
        let end = end.min(audio.samples.len()).max(start);
        voiced_seconds(
            &AudioBuffer {
                samples: audio.samples[start..end].to_vec(),
                sample_rate_hz: audio.sample_rate_hz,
            },
            self.frame,
            self.speech_rms,
        )
    }
}

impl AcousticFeatureProvider for VoicedDurationFeature {
    fn info(&self) -> ProviderInfo {
        ProviderInfo {
            id: "energy-voiced-duration".into(),
            version: "0.1.0".into(),
            kind: "acoustic-feature".into(),
            locales: vec!["ja".into()],
            requires_network: false,
        }
    }

    fn extract(
        &self,
        audio: &AudioBuffer,
        alignment: &Alignment,
    ) -> ProviderOutcome<Vec<FeatureObservation>> {
        if alignment.spans.is_empty() {
            return ProviderOutcome::Abstained {
                reason: ReasonCode::new("no-aligned-spans"),
            };
        }
        let obs = alignment
            .spans
            .iter()
            .map(|span| {
                let secs = self.voiced_seconds_in(audio, span.start_sample, span.end_sample);
                let span_confident = span.confidence.map(|c| c >= 0.5).unwrap_or(false);
                FeatureObservation {
                    feature_id: "duration.voiced-seconds".into(),
                    span: Some(span.clone()),
                    value: secs,
                    reliable: span_confident && secs > 0.0,
                }
            })
            .collect();
        ProviderOutcome::Usable {
            value: obs,
            confidence: alignment.overall_confidence,
        }
    }
}
