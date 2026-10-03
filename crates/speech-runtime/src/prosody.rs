//! Prosody (F0) provider (SPEECH-006).
//!
//! Autocorrelation pitch tracking with explicit reliability: unvoiced
//! or implausible frames are masked (`reliable = false`); missing F0 is
//! unavailable evidence, never "low pitch" (docs/05). Comparison paths
//! consume only normalized values (semitones relative to the speaker's
//! own median over reliable frames); absolute Hz is a measurement,
//! never a correctness rule.

use lts_speech_api::{
    Alignment, AlignmentSpan, AudioBuffer, FeatureObservation, ProsodyProfile, ProsodyProvider,
    ProviderInfo, ProviderOutcome, ReasonCode,
};

pub struct AutocorrelationProsody {
    pub window: usize,
    pub hop: usize,
    pub f0_min_hz: f32,
    pub f0_max_hz: f32,
    pub voiced_peak: f32,
    pub speech_rms: f32,
}

impl Default for AutocorrelationProsody {
    fn default() -> Self {
        Self {
            window: 1024,
            hop: 256,
            f0_min_hz: 60.0,
            f0_max_hz: 400.0,
            voiced_peak: 0.35,
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

/// Normalized contour: semitones relative to the median of reliable
/// observations. Unreliable observations are dropped (masked), never
/// interpolated into a target (docs/05).
pub fn normalize_semitones(observations: &[FeatureObservation]) -> Vec<f64> {
    let mut reliable: Vec<f64> = observations
        .iter()
        .filter(|o| o.feature_id == "f0.hz" && o.reliable && o.value > 0.0)
        .map(|o| o.value)
        .collect();
    if reliable.len() < 3 {
        return Vec::new();
    }
    reliable.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
    let median = reliable[reliable.len() / 2];
    observations
        .iter()
        .filter(|o| o.feature_id == "f0.hz" && o.reliable && o.value > 0.0)
        .map(|o| 12.0 * (o.value / median).log2())
        .collect()
}

/// Plain-language contour shape for accessible output (SPEECH-006
/// acceptance: "shown accessibly"). Text, not just a picture.
pub fn contour_shape_text(values: &[f64]) -> String {
    if values.len() < 3 {
        return "not enough voiced material to describe the pitch shape".into();
    }
    let third = (values.len() / 3).max(1);
    let start: f64 = values[..third].iter().sum::<f64>() / third as f64;
    let end_slice = &values[values.len() - third..];
    let end: f64 = end_slice.iter().sum::<f64>() / third as f64;
    let delta = end - start;
    let direction = if delta > 1.5 {
        "rising overall"
    } else if delta < -1.5 {
        "falling overall"
    } else {
        "roughly level overall"
    };
    let peaks = values
        .windows(3)
        .filter(|w| w[1] > w[0] && w[1] > w[2])
        .count();
    let movement = if peaks >= 2 {
        format!(", with {peaks} local pitch peaks")
    } else {
        String::new()
    };
    format!("pitch is {direction}{movement}")
}

impl AutocorrelationProsody {
    /// F0 for one frame via autocorrelation; None when unvoiced.
    fn frame_f0(&self, x: &[f32], rate: u32) -> Option<f32> {
        if rms(x) < self.speech_rms {
            return None;
        }
        let rate = rate as f32;
        let min_lag = (rate / self.f0_max_hz) as usize;
        let max_lag = ((rate / self.f0_min_hz) as usize).min(x.len() / 2);
        if max_lag <= min_lag {
            return None;
        }
        let energy: f32 = x.iter().map(|s| s * s).sum();
        if energy <= 0.0 {
            return None;
        }
        let mut best_lag = 0usize;
        let mut best_corr = 0.0f32;
        for lag in min_lag..=max_lag {
            let corr: f32 = x[..x.len() - lag]
                .iter()
                .zip(x[lag..].iter())
                .map(|(a, b)| a * b)
                .sum();
            if corr > best_corr {
                best_corr = corr;
                best_lag = lag;
            }
        }
        if best_lag == 0 || best_corr / energy < self.voiced_peak {
            return None;
        }
        Some(rate / best_lag as f32)
    }
}

impl ProsodyProvider for AutocorrelationProsody {
    fn info(&self) -> ProviderInfo {
        ProviderInfo {
            id: "autocorrelation-prosody".into(),
            version: "0.1.0".into(),
            kind: "prosody".into(),
            locales: vec!["ja".into()],
            requires_network: false,
        }
    }

    fn analyze(
        &self,
        audio: &AudioBuffer,
        alignment: &Alignment,
    ) -> ProviderOutcome<ProsodyProfile> {
        if alignment.spans.is_empty() {
            return ProviderOutcome::Abstained {
                reason: ReasonCode::new("no-aligned-spans"),
            };
        }
        let mut observations = Vec::new();
        for span in &alignment.spans {
            let start = span.start_sample.min(audio.samples.len());
            let end = span.end_sample.min(audio.samples.len()).max(start);
            let mut local: Vec<(usize, Option<f32>)> = Vec::new();
            let mut pos = start;
            while pos + self.window <= end {
                let f0 =
                    self.frame_f0(&audio.samples[pos..pos + self.window], audio.sample_rate_hz);
                local.push((pos, f0));
                pos += self.hop;
            }
            // Octave-jump masking: a frame whose F0 doubles/halves both
            // neighbours is implausible -> unavailable evidence.
            for (i, (pos, f0)) in local.iter().enumerate() {
                let flagged = match *f0 {
                    None => false,
                    Some(v) => {
                        let prev_f0 = if i > 0 { local[i - 1].1 } else { None };
                        let next_f0 = local.get(i + 1).and_then(|(_, f)| *f);
                        match (prev_f0, next_f0) {
                            (Some(p), Some(n)) => {
                                (v > p * 1.8 && v > n * 1.8) || (v * 1.8 < p && v * 1.8 < n)
                            }
                            _ => false,
                        }
                    }
                };
                observations.push(FeatureObservation {
                    feature_id: "f0.hz".into(),
                    span: Some(AlignmentSpan {
                        unit_id: span.unit_id.clone(),
                        start_sample: *pos,
                        end_sample: (*pos + self.window).min(end),
                        confidence: span.confidence,
                    }),
                    value: f0.map(f64::from).unwrap_or(0.0),
                    reliable: f0.is_some() && !flagged,
                });
            }
        }
        ProviderOutcome::Usable {
            value: ProsodyProfile { observations },
            confidence: alignment.overall_confidence,
        }
    }
}
