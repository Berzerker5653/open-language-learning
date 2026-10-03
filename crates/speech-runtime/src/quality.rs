//! Input quality gate + energy VAD (SPEECH-002, docs/05 "Input quality
//! gate").
//!
//! Deterministic and pure: the same PCM always yields the same verdict.
//! Quality rejections are linguistically neutral (docs/05): a silent,
//! noisy, or clipped capture must produce a retry path, never negative
//! mastery evidence.

use lts_speech_api::{
    AudioBuffer, ProviderInfo, ProviderOutcome, ReasonCode, SpeechSegment, VoiceActivityProvider,
};

#[derive(Debug, Clone)]
pub struct EnergyVad {
    /// Frame length in samples.
    pub frame_samples: usize,
    /// RMS at or below which the whole capture is "silence".
    pub silence_rms: f32,
    /// Per-frame RMS above which a frame counts as speech.
    pub speech_rms: f32,
    /// Fraction of full-scale samples tolerated before "clipping".
    pub clip_ratio: f32,
    /// Frames of padding kept around each speech run.
    pub pad_frames: usize,
    /// Gaps up to this many frames inside a run are bridged.
    pub bridge_frames: usize,
}

impl Default for EnergyVad {
    fn default() -> Self {
        Self {
            frame_samples: 320, // 20 ms at 16 kHz
            silence_rms: 0.002,
            speech_rms: 0.01,
            clip_ratio: 0.02,
            pad_frames: 5,
            bridge_frames: 5,
        }
    }
}

fn rms(frame: &[f32]) -> f32 {
    if frame.is_empty() {
        return 0.0;
    }
    let sum: f32 = frame.iter().map(|s| s * s).sum();
    (sum / frame.len() as f32).sqrt()
}

impl EnergyVad {
    fn frames(&self, audio: &AudioBuffer) -> Vec<(usize, usize)> {
        let n = audio.samples.len();
        (0..n.div_ceil(self.frame_samples))
            .map(|i| {
                let start = i * self.frame_samples;
                (start, (start + self.frame_samples).min(n))
            })
            .collect()
    }

    /// Quality verdict independent of segmentation.
    pub fn quality(&self, audio: &AudioBuffer) -> ProviderOutcome<()> {
        if audio.samples.is_empty() {
            return ProviderOutcome::QualityRejected {
                reason: ReasonCode::new("empty"),
            };
        }
        let clipped = audio.samples.iter().filter(|s| s.abs() >= 0.99).count() as f32
            / audio.samples.len() as f32;
        if clipped > self.clip_ratio {
            return ProviderOutcome::QualityRejected {
                reason: ReasonCode::new("clipping"),
            };
        }
        if rms(&audio.samples) <= self.silence_rms {
            return ProviderOutcome::QualityRejected {
                reason: ReasonCode::new("silence"),
            };
        }
        ProviderOutcome::Usable {
            value: (),
            confidence: None,
        }
    }
}

impl VoiceActivityProvider for EnergyVad {
    fn info(&self) -> ProviderInfo {
        ProviderInfo {
            id: "energy-vad".into(),
            version: "0.1.0".into(),
            kind: "vad".into(),
            locales: vec!["any".into()],
            requires_network: false,
        }
    }

    fn detect(&self, audio: &AudioBuffer) -> ProviderOutcome<Vec<SpeechSegment>> {
        if let ProviderOutcome::QualityRejected { reason } = self.quality(audio) {
            return ProviderOutcome::QualityRejected { reason };
        }
        let frames = self.frames(audio);
        let speech: Vec<bool> = frames
            .iter()
            .map(|(s, e)| rms(&audio.samples[*s..*e]) > self.speech_rms)
            .collect();
        if !speech.iter().any(|f| *f) {
            return ProviderOutcome::QualityRejected {
                reason: ReasonCode::new("no-speech-frames"),
            };
        }
        // Runs of speech frames, bridging short gaps.
        let mut runs: Vec<(usize, usize)> = Vec::new();
        let mut i = 0;
        while i < speech.len() {
            if !speech[i] {
                i += 1;
                continue;
            }
            let start = i;
            let mut end = i;
            while i < speech.len() {
                if speech[i] {
                    end = i;
                } else {
                    // bridge only short gaps followed by more speech
                    let mut k = i;
                    while k < speech.len() && !speech[k] {
                        k += 1;
                    }
                    if k < speech.len() && k - i <= self.bridge_frames {
                        i = k;
                        continue;
                    }
                    break;
                }
                i += 1;
            }
            runs.push((start, end));
        }
        let segments = runs
            .into_iter()
            .map(|(start_f, end_f)| {
                let start = start_f
                    .saturating_sub(self.pad_frames)
                    .saturating_mul(self.frame_samples);
                let end = ((end_f + 1 + self.pad_frames)
                    .min(frames.len())
                    .saturating_mul(self.frame_samples))
                .min(audio.samples.len())
                .max(start + 1);
                SpeechSegment {
                    start_sample: start,
                    end_sample: end,
                }
            })
            .collect();
        ProviderOutcome::Usable {
            value: segments,
            confidence: None,
        }
    }
}
