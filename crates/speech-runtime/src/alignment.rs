//! Constrained alignment prototype (SPEECH-004, ADR-0008).
//!
//! Embedded-runtime approach: word-level timestamps from whisper.cpp
//! (`-oj`, verified in SPEECH-001) are constrained-matched against the
//! pack-declared expected units. Alignment never proves the expected
//! text was spoken: large mismatch or missing speech abstains.

use lts_speech_api::{
    Alignment, AlignmentProvider, AlignmentSpan, AudioBuffer, ExpectedUtterance, ProviderInfo,
    ProviderOutcome, ReasonCode,
};
use serde::Deserialize;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::Command;

use crate::asr::to_wav16;
use crate::sidecar;

/// A recognized word with millisecond offsets (whisper.cpp `-oj`).
#[derive(Debug, Clone, PartialEq)]
pub struct WordToken {
    pub text: String,
    pub from_ms: u64,
    pub to_ms: u64,
}

#[derive(Deserialize)]
struct WhisperJson {
    transcription: Vec<WhisperSegment>,
}

#[derive(Deserialize)]
struct WhisperSegment {
    #[serde(default)]
    text: String,
    offsets: WhisperOffsets,
}

#[derive(Deserialize)]
struct WhisperOffsets {
    from: u64,
    to: u64,
}

/// Run whisper.cpp with word timestamps over `audio`; returns tokens.
pub fn run_whisper_words(
    binary: &Path,
    model: &Path,
    language: &str,
    audio: &AudioBuffer,
) -> Result<Vec<WordToken>, String> {
    // Unique per call: pid separates processes, an atomic counter separates
    // concurrent calls in one process. Keying on audio length alone collided
    // when two runs shared identical audio (parallel tests clobbered each
    // other's temp wav/json).
    static ALIGN_SEQ: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);
    let seq = ALIGN_SEQ.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
    let stem = std::env::temp_dir().join(format!("lts-align-{}-{}", std::process::id(), seq));
    let wav = {
        let mut p = stem.clone();
        p.set_extension("wav");
        p
    };
    {
        let mut f = std::fs::File::create(&wav).map_err(|e| e.to_string())?;
        f.write_all(&to_wav16(audio)).map_err(|e| e.to_string())?;
        f.flush().map_err(|e| e.to_string())?;
    }
    let mut cmd = Command::new(binary);
    // Staged payloads carry a build-machine RUNPATH; point the child at the
    // payload's own lib dir (no-op layout-wise when the binary sits alone).
    sidecar::apply_runtime_env(&mut cmd, binary);
    let status = cmd
        .arg("-m")
        .arg(model)
        .arg("-l")
        .arg(language)
        .arg("-nt")
        .arg("-np")
        .arg("-oj")
        .arg("-f")
        .arg(&wav)
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .status();
    // whisper.cpp writes `<input>` + ".json" (i.e. stem.wav.json).
    let json_path = {
        let mut p = wav.clone();
        p.set_extension("wav.json");
        p
    };
    let result = (|| {
        let Ok(status) = status else {
            return Err("whisper-spawn-failed".to_string());
        };
        if !status.success() {
            return Err("whisper-nonzero-exit".to_string());
        }
        let raw = std::fs::read_to_string(&json_path).map_err(|e| e.to_string())?;
        let parsed: WhisperJson = serde_json::from_str(&raw).map_err(|e| e.to_string())?;
        Ok(parsed
            .transcription
            .into_iter()
            .map(|s| WordToken {
                text: s.text,
                from_ms: s.offsets.from,
                to_ms: s.offsets.to,
            })
            .collect::<Vec<_>>())
    })();
    let _ = std::fs::remove_file(&wav);
    let _ = std::fs::remove_file(&json_path);
    result
}

/// Characters used for constrained matching: drop whitespace and
/// punctuation (Japanese long-vowel/markers are meaningful and kept).
pub fn normalize_chars(s: &str) -> Vec<char> {
    s.chars()
        .filter(|c| {
            !c.is_whitespace()
                && !c.is_ascii_punctuation()
                && !matches!(
                    c,
                    '、' | '。' | '！' | '？' | '・' | '「' | '」' | '（' | '）'
                )
        })
        .collect()
}

/// Needleman-Wunsch character match: returns (match ratio, matched
/// (expected_idx, recognized_idx) pairs in order).
pub fn char_match(expected: &[char], recognized: &[char]) -> (f32, Vec<(usize, usize)>) {
    let (n, m) = (expected.len(), recognized.len());
    if n == 0 || m == 0 {
        return (0.0, Vec::new());
    }
    let mut dist = vec![vec![0u32; m + 1]; n + 1];
    for (i, row) in dist.iter_mut().enumerate() {
        row[0] = i as u32;
    }
    for (j, cell) in dist[0].iter_mut().enumerate() {
        *cell = j as u32;
    }
    for i in 1..=n {
        for j in 1..=m {
            let sub = if expected[i - 1] == recognized[j - 1] {
                dist[i - 1][j - 1]
            } else {
                dist[i - 1][j - 1] + 1
            };
            dist[i][j] = sub.min(dist[i - 1][j] + 1).min(dist[i][j - 1] + 1);
        }
    }
    let mut pairs = Vec::new();
    let (mut i, mut j) = (n, m);
    while i > 0 && j > 0 {
        if expected[i - 1] == recognized[j - 1] && dist[i][j] == dist[i - 1][j - 1] {
            pairs.push((i - 1, j - 1));
            i -= 1;
            j -= 1;
        } else if dist[i][j] == dist[i - 1][j] + 1 {
            i -= 1;
        } else {
            j -= 1;
        }
    }
    pairs.reverse();
    let ratio = pairs.len() as f32 / n.max(m) as f32;
    (ratio, pairs)
}

/// Constrained mapping of recognized tokens onto expected units.
///
/// - No recognized speech -> `Abstained`.
/// - Match ratio below `threshold` -> `UtteranceMismatch` (never a
///   partial alignment on a wrong phrase).
/// - Otherwise `Usable` with per-unit spans; units whose own match
///   fraction is below 0.3 get no span (locally unreliable). Spans are
///   clamped to `max_sample` (whisper segment offsets cover the padded
///   30 s window, not just the utterance).
pub fn match_units(
    tokens: &[WordToken],
    expected_units: &[String],
    sample_rate_hz: u32,
    threshold: f32,
    max_sample: usize,
) -> ProviderOutcome<Alignment> {
    let recognized_chars: Vec<char> = tokens
        .iter()
        .flat_map(|t| normalize_chars(&t.text))
        .collect();
    if recognized_chars.is_empty() {
        return ProviderOutcome::Abstained {
            reason: ReasonCode::new("no-recognized-speech"),
        };
    }
    let expected_chars: Vec<char> = expected_units
        .iter()
        .flat_map(|u| normalize_chars(u))
        .collect();
    let (ratio, pairs) = char_match(&expected_chars, &recognized_chars);
    if ratio < threshold {
        return ProviderOutcome::UtteranceMismatch {
            reason: ReasonCode::new("expected-text-not-matched"),
        };
    }
    // Recognized char index -> token index.
    let mut token_of: Vec<usize> = Vec::with_capacity(recognized_chars.len());
    for (ti, t) in tokens.iter().enumerate() {
        for _ in normalize_chars(&t.text) {
            token_of.push(ti);
        }
    }
    let mut spans = Vec::new();
    let mut base = 0usize;
    for unit in expected_units {
        let n = normalize_chars(unit).len();
        let unit_pairs: Vec<(usize, usize)> = pairs
            .iter()
            .copied()
            .filter(|(e, _)| *e >= base && *e < base + n)
            .collect();
        let conf = if n > 0 {
            unit_pairs.len() as f32 / n as f32
        } else {
            0.0
        };
        if conf >= 0.3 && !unit_pairs.is_empty() {
            let mut toks: Vec<usize> = unit_pairs.iter().map(|(_, r)| token_of[*r]).collect();
            toks.sort_unstable();
            toks.dedup();
            let start_ms = toks.iter().map(|t| tokens[*t].from_ms).min().unwrap();
            let end_ms = toks.iter().map(|t| tokens[*t].to_ms).max().unwrap();
            spans.push(AlignmentSpan {
                unit_id: unit.clone(),
                start_sample: ((start_ms * sample_rate_hz as u64 / 1000) as usize).min(max_sample),
                end_sample: ((end_ms * sample_rate_hz as u64 / 1000) as usize).min(max_sample),
                confidence: Some(conf),
            });
        }
        base += n;
    }
    ProviderOutcome::Usable {
        value: Alignment {
            spans,
            overall_confidence: Some(ratio),
        },
        confidence: Some(ratio),
    }
}

/// Embedded-runtime aligner: whisper.cpp subprocess + constrained
/// unit matching (ADR-0008).
pub struct WhisperConstrainedAligner {
    pub binary: PathBuf,
    pub model: PathBuf,
    pub language: String,
    pub threshold: f32,
}

impl AlignmentProvider for WhisperConstrainedAligner {
    fn info(&self) -> ProviderInfo {
        ProviderInfo {
            id: "whispercpp-constrained-aligner".into(),
            version: "0.1.0".into(),
            kind: "alignment".into(),
            locales: vec![self.language.clone()],
            requires_network: false,
        }
    }

    fn align(
        &self,
        audio: &AudioBuffer,
        expected: &ExpectedUtterance,
    ) -> ProviderOutcome<Alignment> {
        let tokens = match run_whisper_words(&self.binary, &self.model, &self.language, audio) {
            Ok(t) => t,
            Err(reason) => {
                return ProviderOutcome::ProviderError {
                    reason: ReasonCode::new(reason),
                };
            }
        };
        match_units(
            &tokens,
            &expected.units,
            audio.sample_rate_hz,
            self.threshold,
            audio.samples.len(),
        )
    }
}
