//! TTS-001 acceptance:
//! 2. local Japanese TTS can generate scalable practice audio (all 12
//!    onramp utterances synthesized locally, no network);
//! plus contract behavior: bad voice id unsupported, bad text rejected.
//! (Acceptance 1 = license audit doc; acceptance 3 = desktop
//! speech_audio media-first resolution, tested in lts-desktop.)

use lts_speech_api::{ProviderOutcome, SpeechSynthesisProvider, VoiceRef};
use lts_speech_runtime::tts::SherpaSubprocessTts;
use std::path::PathBuf;

const ONRAMP_TEXTS: [&str; 12] = [
    "こんにちは",
    "はじめまして",
    "わたしは ハンター です",
    "お元気ですか",
    "ありがとうございます",
    "すみません",
    "これは 何ですか",
    "駅は どこですか",
    "もう一度 言ってください",
    "ゆっくり 話してください",
    "わかりません",
    "では また明日",
];

fn vendor_dir() -> PathBuf {
    std::env::var("LTS_BENCH_VENDOR")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from(std::env::var("HOME").unwrap()).join(".cache/lts-bench"))
}

fn tts() -> SherpaSubprocessTts {
    let k = vendor_dir().join("kokoro-multi-lang-v1_0");
    SherpaSubprocessTts {
        binary: vendor_dir()
            .join("sherpa-onnx-v1.13.8-linux-x64-shared/bin/sherpa-onnx-offline-tts"),
        model: k.join("model.onnx"),
        voices: k.join("voices.bin"),
        tokens: k.join("tokens.txt"),
        data_dir: k.join("espeak-ng-data"),
        lang: "ja".into(),
    }
}

#[test]
fn contract_rejects_bad_inputs_without_spawning() {
    let provider = tts();
    let voice = VoiceRef {
        model_id: "kokoro".into(),
        voice_id: "not-a-number".into(),
    };
    assert!(matches!(
        provider.synthesize("こんにちは", &voice),
        ProviderOutcome::Unsupported { .. }
    ));
    let voice = VoiceRef {
        model_id: "kokoro".into(),
        voice_id: "37".into(),
    };
    assert!(matches!(
        provider.synthesize("", &voice),
        ProviderOutcome::QualityRejected { .. }
    ));
    assert!(!provider.info().requires_network);
}

#[test]
fn synthesizes_all_practice_utterances_locally() {
    if !tts().binary.exists() || !tts().model.exists() {
        eprintln!("SKIP: vendor TTS artifacts not present");
        return;
    }
    let provider = tts();
    let voice = VoiceRef {
        model_id: "org.openlanguage.tts.kokoro-multi-lang".into(),
        voice_id: "37".into(),
    };
    for text in ONRAMP_TEXTS {
        let out = provider.synthesize(text, &voice);
        let audio = match &out {
            ProviderOutcome::Usable { value, .. } => value,
            o => panic!("failed for {text}: {o:?}"),
        };
        assert!(
            audio.samples.len() > audio.sample_rate_hz as usize / 4,
            "suspiciously short audio for {text}"
        );
        assert_eq!(audio.sample_rate_hz, 24_000);
    }
}
