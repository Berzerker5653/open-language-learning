//! Local ASR adapters (SPEECH-002, ADR-0007).
//!
//! `SherpaSubprocessAsr` drives a locally installed sherpa-onnx runtime
//! over installed model files (from the SPEECH-003 model manager). It
//! never touches the network: audio goes to a temp WAV, the transcript
//! comes back on stdout.

use lts_speech_api::{
    AudioBuffer, ProviderInfo, ProviderOutcome, ReasonCode, RecognitionHints, RecognitionResult,
    SpeechRecognitionProvider,
};
use std::io::Write;
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::time::Duration;

use crate::sidecar;

/// Mono 16-bit PCM WAV bytes (RIFF) from an in-memory buffer.
pub fn to_wav16(audio: &AudioBuffer) -> Vec<u8> {
    let rate = audio.sample_rate_hz;
    let mut samples = Vec::with_capacity(audio.samples.len() * 2);
    for s in &audio.samples {
        let v = (s.clamp(-1.0, 1.0) * 32767.0).round() as i16;
        samples.extend_from_slice(&v.to_le_bytes());
    }
    let data_len = samples.len() as u32;
    let mut out = Vec::with_capacity(44 + samples.len());
    out.extend_from_slice(b"RIFF");
    out.extend_from_slice(&(36 + data_len).to_le_bytes());
    out.extend_from_slice(b"WAVE");
    out.extend_from_slice(b"fmt ");
    out.extend_from_slice(&16u32.to_le_bytes());
    out.extend_from_slice(&1u16.to_le_bytes()); // mono
    out.extend_from_slice(&1u16.to_le_bytes()); // PCM
    out.extend_from_slice(&rate.to_le_bytes());
    out.extend_from_slice(&(rate * 2).to_le_bytes());
    out.extend_from_slice(&2u16.to_le_bytes());
    out.extend_from_slice(&16u16.to_le_bytes());
    out.extend_from_slice(b"data");
    out.extend_from_slice(&data_len.to_le_bytes());
    out.extend_from_slice(&samples);
    out
}

/// Minimal mono 16-bit PCM WAV reader (fixtures/tests).
pub fn from_wav16(bytes: &[u8]) -> Result<AudioBuffer, String> {
    if bytes.len() < 44 || &bytes[0..4] != b"RIFF" || &bytes[8..12] != b"WAVE" {
        return Err("not a RIFF/WAVE file".into());
    }
    let rate = u32::from_le_bytes([bytes[24], bytes[25], bytes[26], bytes[27]]);
    let mut pos = 12;
    let mut data: Option<(usize, usize)> = None;
    while pos + 8 <= bytes.len() {
        let id = &bytes[pos..pos + 4];
        let size = u32::from_le_bytes([
            bytes[pos + 4],
            bytes[pos + 5],
            bytes[pos + 6],
            bytes[pos + 7],
        ]) as usize;
        if id == b"data" {
            data = Some((pos + 8, size.min(bytes.len() - pos - 8)));
            break;
        }
        pos += 8 + size + (size % 2);
    }
    let (start, len) = data.ok_or("no data chunk")?;
    let mut samples = Vec::with_capacity(len / 2);
    for chunk in bytes[start..start + len].chunks_exact(2) {
        let v = i16::from_le_bytes([chunk[0], chunk[1]]);
        samples.push(v as f32 / 32768.0);
    }
    Ok(AudioBuffer {
        samples,
        sample_rate_hz: rate,
    })
}

/// sherpa-onnx offline recognizer run as a local subprocess.
pub struct SherpaSubprocessAsr {
    pub binary: PathBuf,
    pub encoder: PathBuf,
    pub decoder: PathBuf,
    pub tokens: PathBuf,
    pub language: String,
    pub num_threads: u32,
    /// Wall-clock budget per sidecar call; `None` derives
    /// `max(30 s, 8 x audio seconds)` via [`sidecar::call_timeout`].
    /// Tests inject short deadlines.
    pub timeout: Option<Duration>,
}

impl SpeechRecognitionProvider for SherpaSubprocessAsr {
    fn info(&self) -> ProviderInfo {
        ProviderInfo {
            id: "sherpa-onnx-subprocess".into(),
            version: "0.1.0".into(),
            kind: "asr".into(),
            locales: vec![self.language.clone()],
            requires_network: false,
        }
    }

    fn recognize(
        &self,
        audio: &AudioBuffer,
        _hints: &RecognitionHints,
    ) -> ProviderOutcome<RecognitionResult> {
        // Staged privately (0700 dir, 0600 wav): plaintext recordings must
        // never sit world-readable in the shared temp dir.
        let (mut f, wav) = match sidecar::create_staged_wav("lts-asr") {
            Ok(pair) => pair,
            Err(e) => {
                return ProviderOutcome::ProviderError {
                    reason: ReasonCode::new(e.to_string()),
                };
            }
        };
        let staged = f.write_all(&to_wav16(audio)).and_then(|_| f.flush());
        if let Err(e) = staged {
            let _ = std::fs::remove_file(&wav);
            return ProviderOutcome::ProviderError {
                reason: ReasonCode::new(e.to_string()),
            };
        }
        drop(f);
        let mut cmd = Command::new(&self.binary);
        cmd.arg("--model-type=whisper")
            .arg(format!("--whisper-encoder={}", self.encoder.display()))
            .arg(format!("--whisper-decoder={}", self.decoder.display()))
            .arg(format!("--whisper-language={}", self.language))
            .arg(format!("--tokens={}", self.tokens.display()))
            .arg(format!("--num-threads={}", self.num_threads))
            .arg(&wav);
        // A wedged sherpa process is killed and reaped at the deadline
        // (max 30 s / 8x audio, injectable): unavailable evidence, not a
        // verdict — the outcome is a neutral abstention.
        let deadline =
            sidecar::call_timeout(audio.samples.len(), audio.sample_rate_hz, self.timeout);
        let spawned = cmd.stdout(Stdio::piped()).stderr(Stdio::piped()).spawn();
        let out = match spawned {
            Ok(child) => sidecar::output_with_deadline(child, deadline),
            Err(_) => {
                let _ = std::fs::remove_file(&wav);
                return ProviderOutcome::ProviderError {
                    reason: ReasonCode::new("asr-spawn-failed"),
                };
            }
        };
        let _ = std::fs::remove_file(&wav);
        let output = match out {
            Ok(Some(output)) => output,
            Ok(None) => {
                return ProviderOutcome::Abstained {
                    reason: ReasonCode::new(sidecar::SIDECAR_TIMEOUT_REASON),
                };
            }
            Err(_) => {
                return ProviderOutcome::ProviderError {
                    reason: ReasonCode::new("asr-wait-failed"),
                };
            }
        };
        if !output.status.success() {
            return ProviderOutcome::ProviderError {
                reason: ReasonCode::new("asr-nonzero-exit"),
            };
        }
        let stdout = String::from_utf8_lossy(&output.stdout);
        for line in stdout.lines() {
            let line = line.trim();
            if !line.starts_with('{') {
                continue;
            }
            // Minimal parse: the "text" field of the result JSON.
            if let Some(t) = line
                .split("\"text\":")
                .nth(1)
                .and_then(|rest| rest.split('"').nth(1))
            {
                return ProviderOutcome::Usable {
                    value: RecognitionResult {
                        transcript: t.to_string(),
                        alternatives: Vec::new(),
                        timestamps: false,
                    },
                    confidence: None,
                };
            }
        }
        ProviderOutcome::ProviderError {
            reason: ReasonCode::new("asr-no-result"),
        }
    }
}
