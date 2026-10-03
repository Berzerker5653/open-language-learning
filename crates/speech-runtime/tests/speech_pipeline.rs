//! SPEECH-002 acceptance:
//! 1. silence/noise/clipping yield retry (quality-rejected), never
//!    negative mastery (linguistically neutral);
//! 2. a short Japanese utterance is recognized locally after model
//!    install (real sherpa-onnx run when vendor artifacts are present);
//! 3. the pipeline is fully local: no provider in this crate requires
//!    network (`requires_network == false`), and the whole flow runs
//!    offline (CI runs this suite under a network-disabled namespace).

use lts_speech_api::{
    AudioBuffer, ProviderInfo, ProviderOutcome, RecognitionHints, RecognitionResult,
    SpeechRecognitionProvider, VoiceActivityProvider,
};
use lts_speech_runtime::{EnergyVad, SherpaSubprocessAsr, asr::from_wav16};
use std::path::PathBuf;

fn voiced() -> AudioBuffer {
    let rate = 16_000u32;
    let mut samples = Vec::new();
    samples.extend(std::iter::repeat_n(0.0005f32, (0.3 * rate as f32) as usize));
    for i in 0..(0.5 * rate as f32) as usize {
        samples.push(0.3 * (2.0 * std::f32::consts::PI * 220.0 * i as f32 / rate as f32).sin());
    }
    samples.extend(std::iter::repeat_n(0.0005f32, (0.3 * rate as f32) as usize));
    AudioBuffer {
        samples,
        sample_rate_hz: rate,
    }
}

fn silence() -> AudioBuffer {
    AudioBuffer {
        samples: vec![0.0001; 16_000],
        sample_rate_hz: 16_000,
    }
}

fn clipped() -> AudioBuffer {
    AudioBuffer {
        samples: (0..16_000)
            .map(|i| if i % 2 == 0 { 1.0 } else { -1.0 })
            .collect(),
        sample_rate_hz: 16_000,
    }
}

struct StubAsr;

impl SpeechRecognitionProvider for StubAsr {
    fn info(&self) -> ProviderInfo {
        ProviderInfo {
            id: "stub-asr".into(),
            version: "0".into(),
            kind: "asr".into(),
            locales: vec!["ja".into()],
            requires_network: false,
        }
    }
    fn recognize(
        &self,
        _audio: &AudioBuffer,
        _hints: &RecognitionHints,
    ) -> ProviderOutcome<RecognitionResult> {
        ProviderOutcome::Usable {
            value: RecognitionResult {
                transcript: "こんにちは".into(),
                alternatives: vec![],
                timestamps: false,
            },
            confidence: None,
        }
    }
}

#[test]
fn quality_rejections_are_neutral_and_retryable() {
    let vad = EnergyVad::default();

    let s = vad.quality(&silence());
    match &s {
        ProviderOutcome::QualityRejected { reason } => assert_eq!(reason.as_str(), "silence"),
        other => panic!("expected quality rejection, got {other:?}"),
    }
    assert!(s.is_linguistically_neutral());

    let c = vad.quality(&clipped());
    match &c {
        ProviderOutcome::QualityRejected { reason } => assert_eq!(reason.as_str(), "clipping"),
        other => panic!("expected quality rejection, got {other:?}"),
    }
    assert!(c.is_linguistically_neutral());

    // VAD on silence also rejects (retry path), never a segment.
    assert!(matches!(
        vad.detect(&silence()),
        ProviderOutcome::QualityRejected { .. }
    ));
}

#[test]
fn pipeline_segments_speech_and_recognizes_locally() {
    let vad = EnergyVad::default();
    let audio = voiced();
    let segs = vad.detect(&audio).value().expect("segments");
    assert_eq!(segs.len(), 1);
    assert!(segs[0].start_sample > 0);
    assert!(segs[0].end_sample < audio.samples.len());

    let slice = AudioBuffer {
        samples: audio.samples[segs[0].start_sample..segs[0].end_sample].to_vec(),
        sample_rate_hz: audio.sample_rate_hz,
    };
    let res = StubAsr.recognize(&slice, &RecognitionHints::default());
    assert_eq!(
        res.value().map(|r| r.transcript).as_deref(),
        Some("こんにちは")
    );
    assert!(!vad.info().requires_network);
    assert!(!StubAsr.info().requires_network);
}

#[test]
fn real_sherpa_recognizes_installed_model_offline() {
    let vendor = std::env::var("LTS_BENCH_VENDOR")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from(std::env::var("HOME").unwrap()).join(".cache/lts-bench"));
    let binary = vendor.join("sherpa-onnx-v1.13.8-linux-x64-shared/bin/sherpa-onnx-offline");
    let model = vendor.join("sherpa-onnx-whisper-tiny");
    let fixture = vendor.join("fixtures-ja-onramp-synth-0.1.0/u01.wav");
    if !binary.exists() || !model.exists() || !fixture.exists() {
        eprintln!("SKIP: vendor artifacts not present ({})", vendor.display());
        return;
    }
    let bytes = std::fs::read(&fixture).unwrap();
    let audio = from_wav16(&bytes).unwrap();

    let vad = EnergyVad::default();
    let segs = vad.detect(&audio).value().expect("speech segments");
    assert!(!segs.is_empty());
    let slice = AudioBuffer {
        samples: audio.samples[segs[0].start_sample..segs[0].end_sample].to_vec(),
        sample_rate_hz: audio.sample_rate_hz,
    };

    let asr = SherpaSubprocessAsr {
        binary,
        encoder: model.join("tiny-encoder.onnx"),
        decoder: model.join("tiny-decoder.onnx"),
        tokens: model.join("tiny-tokens.txt"),
        language: "ja".into(),
        num_threads: 4,
    };
    assert!(!asr.info().requires_network);
    let res = asr.recognize(&slice, &RecognitionHints::default());
    let transcript = res.value().map(|r| r.transcript).unwrap_or_default();
    assert!(
        transcript.contains("こんにちは"),
        "expected こんにちは, got {transcript:?}"
    );
}
