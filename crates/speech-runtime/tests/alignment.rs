//! SPEECH-004 acceptance:
//! 1. expected short utterances align to useful units with confidence;
//! 2. mismatch / low confidence abstains;
//! 3. embedded-runtime vs preparation-tooling decision in ADR-0008.
//!
//! The matcher core is tested hermetically; the end-to-end aligner runs
//! against whisper.cpp vendor artifacts when present (skips otherwise).

use lts_speech_api::{AlignmentProvider, ExpectedUtterance};
use lts_speech_runtime::alignment::{WordToken, match_units};
use std::path::PathBuf;

fn units(v: &[&str]) -> Vec<String> {
    v.iter().map(|s| s.to_string()).collect()
}

#[test]
fn matched_phrase_aligns_with_confidence() {
    let tokens = vec![WordToken {
        text: " こんにちは".into(),
        from_ms: 120,
        to_ms: 980,
    }];
    let out = match_units(&tokens, &units(&["こんにちは"]), 16_000, 0.6, 16_000);
    let a = out.value().expect("alignment");
    assert_eq!(a.spans.len(), 1);
    assert_eq!(a.spans[0].unit_id, "こんにちは");
    assert_eq!(a.spans[0].start_sample, 120 * 16);
    assert_eq!(a.spans[0].end_sample, 980 * 16);
    assert!(a.spans[0].confidence.unwrap() >= 0.99);
    assert!(a.overall_confidence.unwrap() >= 0.99);
}

#[test]
fn multi_unit_phrase_maps_each_unit() {
    let tokens = vec![
        WordToken {
            text: "わたしは".into(),
            from_ms: 0,
            to_ms: 500,
        },
        WordToken {
            text: "ハンター".into(),
            from_ms: 500,
            to_ms: 1000,
        },
        WordToken {
            text: "です".into(),
            from_ms: 1000,
            to_ms: 1300,
        },
    ];
    let out = match_units(
        &tokens,
        &units(&["わたしは", "ハンター", "です"]),
        16_000,
        0.6,
        16_000,
    );
    let a = out.value().expect("alignment");
    assert_eq!(a.spans.len(), 3);
    assert_eq!(a.spans[1].unit_id, "ハンター");
    assert_eq!(a.spans[1].start_sample, 500 * 16);
    assert_eq!(a.spans[1].end_sample, 1000 * 16);
}

#[test]
fn wrong_expected_text_mismatches_never_partial_aligns() {
    let tokens = vec![WordToken {
        text: "おはようございます".into(),
        from_ms: 0,
        to_ms: 2000,
    }];
    let out = match_units(&tokens, &units(&["さようなら"]), 16_000, 0.6, 16_000);
    assert!(matches!(
        out,
        lts_speech_api::ProviderOutcome::UtteranceMismatch { .. }
    ));
}

#[test]
fn no_recognized_speech_abstains() {
    let tokens = vec![WordToken {
        text: " 。".into(),
        from_ms: 0,
        to_ms: 100,
    }];
    let out = match_units(&tokens, &units(&["こんにちは"]), 16_000, 0.6, 16_000);
    assert!(matches!(
        out,
        lts_speech_api::ProviderOutcome::Abstained { .. }
    ));
}

#[test]
fn unreliable_unit_is_dropped_but_phrase_still_aligns() {
    // Recognized "こんばん" against expected units ["こんばんは", "です"]:
    // first unit partially matches, second has no evidence -> no span.
    let tokens = vec![WordToken {
        text: "こんばん".into(),
        from_ms: 0,
        to_ms: 800,
    }];
    let out = match_units(
        &tokens,
        &units(&["こんばんは", "です"]),
        16_000,
        0.4,
        16_000,
    );
    let a = out.value().expect("alignment");
    assert_eq!(a.spans.len(), 1);
    assert_eq!(a.spans[0].unit_id, "こんばんは");
    assert!(a.spans[0].confidence.unwrap() < 1.0);
}

fn vendor_dir() -> PathBuf {
    std::env::var("LTS_BENCH_VENDOR")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from(std::env::var("HOME").unwrap()).join(".cache/lts-bench"))
}

#[test]
fn real_whisper_aligns_fixture_and_abstains_on_mismatch() {
    let vendor = vendor_dir();
    let binary = vendor.join("whisper.cpp/build/bin/whisper-cli");
    let model = vendor.join("ggml-tiny.bin");
    let dir = vendor.join("fixtures-ja-onramp-synth-0.1.0");
    if !binary.exists() || !model.exists() || !dir.join("u01.wav").exists() {
        eprintln!("SKIP: vendor artifacts not present ({})", vendor.display());
        return;
    }
    let audio =
        lts_speech_runtime::from_wav16(&std::fs::read(dir.join("u01.wav")).unwrap()).unwrap();
    let aligner = lts_speech_runtime::alignment::WhisperConstrainedAligner {
        binary,
        model,
        language: "ja".into(),
        threshold: 0.6,
    };
    assert!(!aligner.info().requires_network);

    // Acceptance 1: expected utterance aligns with confidence.
    let out = aligner.align(
        &audio,
        &ExpectedUtterance {
            content_id: "ja.demo.greet".into(),
            units: units(&["こんにちは"]),
        },
    );
    let a = out.value().expect("alignment");
    assert_eq!(a.spans.len(), 1);
    assert!(a.overall_confidence.unwrap() >= 0.6);
    assert!(a.spans[0].end_sample <= audio.samples.len());

    // Acceptance 2: wrong expected text abstains (u02 audio vs u01 text).
    let audio2 =
        lts_speech_runtime::from_wav16(&std::fs::read(dir.join("u02.wav")).unwrap()).unwrap();
    let out2 = aligner.align(
        &audio2,
        &ExpectedUtterance {
            content_id: "ja.demo.greet".into(),
            units: units(&["こんにちは"]),
        },
    );
    assert!(
        matches!(
            out2,
            lts_speech_api::ProviderOutcome::UtteranceMismatch { .. }
                | lts_speech_api::ProviderOutcome::Abstained { .. }
        ),
        "expected abstention on mismatch, got {out2:?}"
    );
}
