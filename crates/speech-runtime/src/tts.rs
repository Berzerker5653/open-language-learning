//! Local TTS adapter (TTS-001): sherpa-onnx Kokoro subprocess.
//!
//! Licenses are audited separately for model weights vs runtime code
//! (docs/provenance/tts-candidates.md); this adapter never touches the
//! network. Synthesized audio is marked as model output wherever it is
//! persisted into packs; curated licensed recordings always win
//! (docs/10).

use lts_speech_api::{
    AudioBuffer, ProviderInfo, ProviderOutcome, ReasonCode, SpeechSynthesisProvider, VoiceRef,
};
use std::path::PathBuf;
use std::process::Command;

use crate::asr::from_wav16;

pub struct SherpaSubprocessTts {
    pub binary: PathBuf,
    pub model: PathBuf,
    pub voices: PathBuf,
    pub tokens: PathBuf,
    pub data_dir: PathBuf,
    pub lang: String,
}

impl SherpaSubprocessTts {
    fn sid(voice: &VoiceRef) -> Result<u32, String> {
        voice
            .voice_id
            .parse::<u32>()
            .map_err(|_| "voice id must be a numeric speaker id".to_string())
    }
}

impl SpeechSynthesisProvider for SherpaSubprocessTts {
    fn info(&self) -> ProviderInfo {
        ProviderInfo {
            id: "sherpa-onnx-kokoro-tts".into(),
            version: "0.1.0".into(),
            kind: "tts".into(),
            locales: vec![self.lang.clone()],
            requires_network: false,
        }
    }

    fn synthesize(&self, text: &str, voice: &VoiceRef) -> ProviderOutcome<AudioBuffer> {
        if text.is_empty() || text.chars().count() > 400 {
            return ProviderOutcome::QualityRejected {
                reason: ReasonCode::new("text-out-of-range"),
            };
        }
        let sid = match Self::sid(voice) {
            Ok(s) => s,
            Err(reason) => {
                return ProviderOutcome::Unsupported {
                    reason: ReasonCode::new(reason),
                };
            }
        };
        let out = std::env::temp_dir().join(format!(
            "lts-tts-{}-{}.wav",
            std::process::id(),
            text.chars().count()
        ));
        let status = Command::new(&self.binary)
            .arg(format!("--kokoro-model={}", self.model.display()))
            .arg(format!("--kokoro-voices={}", self.voices.display()))
            .arg(format!("--kokoro-tokens={}", self.tokens.display()))
            .arg(format!("--kokoro-data-dir={}", self.data_dir.display()))
            .arg(format!("--kokoro-lang={}", self.lang))
            .arg(format!("--sid={sid}"))
            .arg(format!("--output-filename={}", out.display()))
            .arg(text)
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .status();
        let result = (|| -> Result<AudioBuffer, String> {
            let status = status.map_err(|_| "tts-spawn-failed".to_string())?;
            if !status.success() {
                return Err("tts-nonzero-exit".to_string());
            }
            let bytes = std::fs::read(&out).map_err(|_| "tts-no-output".to_string())?;
            from_wav16(&bytes).map_err(|e| e.to_string())
        })();
        let _ = std::fs::remove_file(&out);
        match result {
            Ok(audio) if !audio.samples.is_empty() => ProviderOutcome::Usable {
                value: audio,
                confidence: None,
            },
            Ok(_) => ProviderOutcome::ProviderError {
                reason: ReasonCode::new("tts-empty-audio"),
            },
            Err(reason) => ProviderOutcome::ProviderError {
                reason: ReasonCode::new(reason),
            },
        }
    }
}
