//! SPEECH-006 acceptance:
//! 1. normalized F0 contour can be shown accessibly for suitable
//!    voiced segments (provider + normalized values + text shape);
//! 2. no absolute-Hz correctness rule (comparison is speaker-relative:
//!    doubling every Hz value leaves the normalized contour identical);
//! 3. unvoiced/implausible frames are masked, never targets; the pack
//!    profile keeps the feature reference-only until calibrated.

use lts_speech_api::{Alignment, AlignmentSpan, AudioBuffer, ProsodyProvider};
use lts_speech_runtime::prosody::{
    AutocorrelationProsody, contour_shape_text, normalize_semitones,
};

fn sine_sweep(rate: u32, f_start: f32, f_end: f32, seconds: f32) -> AudioBuffer {
    let n = (seconds * rate as f32) as usize;
    let mut samples = Vec::with_capacity(n);
    let mut phase = 0.0f32;
    for i in 0..n {
        let t = i as f32 / n as f32;
        let f = f_start + (f_end - f_start) * t;
        phase += 2.0 * std::f32::consts::PI * f / rate as f32;
        samples.push(0.4 * phase.sin());
    }
    AudioBuffer {
        samples,
        sample_rate_hz: rate,
    }
}

fn full_span(len: usize) -> Alignment {
    Alignment {
        spans: vec![AlignmentSpan {
            unit_id: "おばあさん".into(),
            start_sample: 0,
            end_sample: len,
            confidence: Some(1.0),
        }],
        overall_confidence: Some(1.0),
    }
}

#[test]
fn tracks_stable_pitch_with_reliability() {
    let audio = sine_sweep(8_000, 220.0, 220.0, 1.0);
    let profile = AutocorrelationProsody::default()
        .analyze(&audio, &full_span(audio.samples.len()))
        .value()
        .expect("profile");
    let reliable: Vec<f64> = profile
        .observations
        .iter()
        .filter(|o| o.reliable)
        .map(|o| o.value)
        .collect();
    assert!(reliable.len() > 10);
    assert!(
        reliable.iter().all(|v| (v - 220.0).abs() < 10.0),
        "f0s: {reliable:?}"
    );
}

#[test]
fn silence_is_masked_not_low_pitch() {
    let audio = AudioBuffer {
        samples: vec![0.0001; 8_000],
        sample_rate_hz: 8_000,
    };
    let profile = AutocorrelationProsody::default()
        .analyze(&audio, &full_span(audio.samples.len()))
        .value()
        .expect("profile");
    assert!(!profile.observations.is_empty());
    assert!(profile.observations.iter().all(|o| !o.reliable));
    assert!(normalize_semitones(&profile.observations).is_empty());
}

#[test]
fn normalized_contour_is_speaker_range_invariant() {
    // Acceptance 2: no absolute-Hz rule — a low voice and the same
    let low = sine_sweep(8_000, 100.0, 180.0, 1.2);
    let high = sine_sweep(8_000, 200.0, 360.0, 1.2);
    let p = AutocorrelationProsody::default();
    let a = p
        .analyze(&low, &full_span(low.samples.len()))
        .value()
        .unwrap();
    let b = p
        .analyze(&high, &full_span(high.samples.len()))
        .value()
        .unwrap();
    let na = normalize_semitones(&a.observations);
    let nb = normalize_semitones(&b.observations);
    assert!(na.len() > 10 && nb.len() > 10);
    assert!(na.last().unwrap() > &na[0]); // rising shape detected
    let pairs = na.len().min(nb.len());
    let max_dev: f64 = na[..pairs]
        .iter()
        .zip(&nb[..pairs])
        .map(|(x, y)| (x - y).abs())
        .fold(0.0, f64::max);
    assert!(max_dev < 1.0, "normalized contours diverge: {max_dev}");
    let shape = contour_shape_text(&na);
    assert!(shape.contains("rising"), "shape text: {shape}");
}

#[test]
fn octave_jump_frames_are_masked() {
    // 220 Hz, then a 440 Hz island, then 220 Hz: the island's frames
    // must be flagged implausible (unavailable evidence).
    let mut samples = Vec::new();
    for seg in [220.0f32, 440.0, 220.0] {
        let s = sine_sweep(8_000, seg, seg, 0.4);
        samples.extend(s.samples);
    }
    let audio = AudioBuffer {
        samples,
        sample_rate_hz: 8_000,
    };
    let profile = AutocorrelationProsody::default()
        .analyze(&audio, &full_span(audio.samples.len()))
        .value()
        .expect("profile");
    let flagged = profile
        .observations
        .iter()
        .filter(|o| o.reliable && o.value > 350.0)
        .count();
    assert_eq!(flagged, 0, "octave island leaked into reliable set");
}
