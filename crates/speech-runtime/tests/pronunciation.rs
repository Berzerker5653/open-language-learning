//! SPEECH-005 acceptance:
//! 1. a validated high-value Japanese contrast (vowel length,
//!    おばさん/おばあさん — declared in the pack phonology + speech
//!    profile as assess-guided) is taught with actionable feedback;
//! 2. ASR success is not the pronunciation score (alignment alone
//!    abstains; corrections require reliable acoustic evidence);
//! 3. feedback abstains and exposes why (reason codes);
//! 4. reference + in-memory attempt playback is UI (pronunciation.tsx).

use lts_speech_api::{
    AcousticFeatureProvider, Alignment, AlignmentProvider, AlignmentSpan, AudioBuffer,
    ConfidenceBand, PronunciationEvidence, PronunciationInterpreter, ProviderOutcome,
};
use lts_speech_runtime::acoustic::{VoicedDurationFeature, voiced_seconds};
use lts_speech_runtime::interpret::VowelLengthInterpreter;

fn voiced_burst(rate: u32, seconds: f32) -> AudioBuffer {
    let mut samples = Vec::new();
    for i in 0..(seconds * rate as f32) as usize {
        samples.push(0.3 * (2.0 * std::f32::consts::PI * 200.0 * i as f32 / rate as f32).sin());
    }
    AudioBuffer {
        samples,
        sample_rate_hz: rate,
    }
}

fn span(unit_id: &str, start: usize, end: usize) -> AlignmentSpan {
    AlignmentSpan {
        unit_id: unit_id.into(),
        start_sample: start,
        end_sample: end,
        confidence: Some(1.0),
    }
}

fn evidence(short_secs: f32, long_secs: f32, align_conf: f32) -> PronunciationEvidence {
    let rate = 8_000u32;
    let short = (short_secs * rate as f32) as usize;
    let long = (long_secs * rate as f32) as usize;
    let audio = voiced_burst(rate, short_secs + long_secs);
    let alignment = Alignment {
        spans: vec![
            span("おばさん", 0, short),
            span("おばあさん", short, short + long),
        ],
        overall_confidence: Some(align_conf),
    };
    let features = VoicedDurationFeature::default()
        .extract(&audio, &alignment)
        .value()
        .expect("features");
    PronunciationEvidence {
        alignment,
        features,
        prosody: None,
    }
}

fn interpreter(reference_ratio: f64) -> VowelLengthInterpreter {
    VowelLengthInterpreter {
        short_unit_id: "おばさん".into(),
        long_unit_id: "おばあさん".into(),
        reference_ratio,
        ..Default::default()
    }
}

#[test]
fn duration_features_measure_voiced_spans() {
    let audio = voiced_burst(8_000, 0.5);
    let alignment = Alignment {
        spans: vec![span("おばさん", 0, 4_000)],
        overall_confidence: Some(1.0),
    };
    let obs = VoicedDurationFeature::default()
        .extract(&audio, &alignment)
        .value()
        .expect("features");
    assert_eq!(obs.len(), 1);
    assert!(obs[0].reliable);
    assert!((obs[0].value - 0.5).abs() < 0.05);
    assert!(voiced_seconds(&audio, 320, 0.01) > 0.45);
}

#[test]
fn short_long_vowel_gets_actionable_feedback() {
    // Reference ratio 1.6; user ratio 0.5/0.4 = 1.25 -> rel 0.78 < 0.8.
    let ev = evidence(0.4, 0.5, 0.9);
    let out = interpreter(1.6).interpret(&ev);
    let corrections = out.value().expect("corrections");
    assert_eq!(corrections.len(), 1);
    assert_eq!(corrections[0].band, ConfidenceBand::PossibleIssue);
    assert_eq!(
        corrections[0].feedback_template_id,
        "speech.long-vowel.shorter"
    );
    assert_eq!(corrections[0].feature_id, "ja.phon.long-vowel");
}

#[test]
fn overlong_and_close_bands_are_distinct() {
    // ratio 1.2/0.4 = 3.0 -> rel 1.875 > 1.25 -> longer.
    let ev = evidence(0.4, 1.2, 0.9);
    let c = interpreter(1.6).interpret(&ev).value().unwrap();
    assert_eq!(c[0].feedback_template_id, "speech.long-vowel.longer");
    // ratio 0.64/0.4 = 1.6 -> rel 1.0 -> close.
    let ev = evidence(0.4, 0.64, 0.9);
    let c = interpreter(1.6).interpret(&ev).value().unwrap();
    assert_eq!(c[0].feedback_template_id, "speech.long-vowel.close");
    assert_eq!(c[0].band, ConfidenceBand::Confident);
}

#[test]
fn asr_success_alone_is_not_a_pronunciation_score() {
    // High alignment confidence but no reliable duration evidence.
    let alignment = Alignment {
        spans: vec![span("おばさん", 0, 3_000), span("おばあさん", 3_000, 6_000)],
        overall_confidence: Some(0.95),
    };
    let ev = PronunciationEvidence {
        alignment,
        features: vec![],
        prosody: None,
    };
    let out = interpreter(1.6).interpret(&ev);
    match out {
        ProviderOutcome::Abstained { reason } => {
            assert_eq!(reason.as_str(), "no-reliable-duration-evidence")
        }
        other => panic!("expected abstention, got {other:?}"),
    }
}

#[test]
fn low_alignment_confidence_abstains_with_reason() {
    let ev = evidence(0.4, 0.5, 0.4);
    let out = interpreter(1.6).interpret(&ev);
    match out {
        ProviderOutcome::Abstained { reason } => {
            assert_eq!(reason.as_str(), "low-alignment-confidence")
        }
        other => panic!("expected abstention, got {other:?}"),
    }
}

fn vendor_dir() -> std::path::PathBuf {
    std::env::var("LTS_BENCH_VENDOR")
        .map(std::path::PathBuf::from)
        .unwrap_or_else(|_| {
            std::path::PathBuf::from(std::env::var("HOME").unwrap()).join(".cache/lts-bench")
        })
}

#[test]
fn real_pipeline_verifies_then_interprets_reference_pair() {
    let vendor = vendor_dir();
    let binary = vendor.join("whisper.cpp/build/bin/whisper-cli");
    let model = vendor.join("ggml-tiny.bin");
    let media = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../../tests/fixtures/packs/ja-demo/media");
    let short_wav = media.join("ja.lex.demo.obasan.wav");
    let long_wav = media.join("ja.lex.demo.obaasan.wav");
    if !binary.exists() || !model.exists() || !short_wav.exists() {
        eprintln!("SKIP: vendor or pack media not present");
        return;
    }
    let short = lts_speech_runtime::from_wav16(&std::fs::read(&short_wav).unwrap()).unwrap();
    let long = lts_speech_runtime::from_wav16(&std::fs::read(&long_wav).unwrap()).unwrap();
    // "Attempt": both reference words back to back (rate-matched).
    let rate = short.sample_rate_hz;
    let mut samples = short.samples.clone();
    samples.extend(
        std::iter::repeat_n(0.0f32, (0.2 * rate as f32) as usize).chain(long.samples.clone()),
    );
    let attempt = AudioBuffer {
        samples,
        sample_rate_hz: rate,
    };

    let aligner = lts_speech_runtime::WhisperConstrainedAligner {
        binary,
        model,
        language: "ja".into(),
        threshold: 0.6,
    };
    let expected = lts_speech_api::ExpectedUtterance {
        content_id: "ja.lex.demo.obasan".into(),
        units: vec!["おばさん".into(), "おばあさん".into()],
    };
    let alignment = aligner.align(&attempt, &expected).value().expect("aligned");
    assert_eq!(alignment.spans.len(), 2);

    let features = VoicedDurationFeature::default()
        .extract(&attempt, &alignment)
        .value()
        .expect("features");
    let ref_ratio = voiced_seconds(&long, 320, 0.01) / voiced_seconds(&short, 320, 0.01);
    let ev = PronunciationEvidence {
        alignment,
        features,
        prosody: None,
    };
    let corrections = interpreter(ref_ratio)
        .interpret(&ev)
        .value()
        .expect("corrections");
    assert_eq!(
        corrections[0].feedback_template_id,
        "speech.long-vowel.close"
    );

    // Verification gate: saying only the short word against the expected
    // pair must abstain before any correction is issued.
    let out = aligner.align(&short, &expected);
    assert!(matches!(
        out,
        ProviderOutcome::UtteranceMismatch { .. } | ProviderOutcome::Abstained { .. }
    ));
}
