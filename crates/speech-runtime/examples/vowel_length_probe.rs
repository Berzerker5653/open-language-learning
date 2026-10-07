//! Local pronunciation probe (dev tool; NOT shipped, NOT a calibration gate).
//!
//! Runs the SAME align -> measure -> interpret path the desktop app uses
//! (`pronunciation_check_at` in apps/desktop) over arbitrary WAV clips so a
//! human can sanity-check the vowel-length feature on their own recordings and
//! on openly-licensed audio. It reports what the feature WOULD say; it does not
//! authorize automatic scoring (that stays gated on SPEECH-007 calibration).
//!
//! Usage:
//!   cargo run -p lts-speech-runtime --example vowel_length_probe -- \
//!     --ref-short <short.wav> --ref-long <long.wav> --clips <dir> [--vendor <dir>] [--model <ggml-*.bin>]
//!   ...or point it at the app's device data dir to use the model the app
//!   actually selected:  --data-dir <data_dir> [--catalog <catalog.json>]
//!
//! In <dir>, each attempt is `<name>.wav` plus a `<name>.meta` file with two
//! lines: the expected short text and the expected long text (the minimal pair
//! the clip is being scored against). Reference wavs are the pack's reviewed
//! short/long media used to compute the reference ratio.
//!
//! Requires the whisper.cpp aligner + ggml model (LTS_BENCH_VENDOR or
//! ~/.cache/lts-bench), same as the desktop speech tests.
//!
//! NOTE: the pinned whisper ggml-tiny aligner is weak on short Japanese and
//! often mis-recognizes target words; the aligner then ABSTAINS (never scores
//! garbage). If every clip abstains with `mismatch:expected-text-not-matched`,
//! the aligner model — not the measurement/interpretation layer — is the limit.

use lts_speech_api::{
    AcousticFeatureProvider, AlignmentProvider, ExpectedUtterance, PronunciationInterpreter,
    ProviderOutcome,
};
use lts_speech_runtime::acoustic::voiced_seconds;
use lts_speech_runtime::{
    VoicedDurationFeature, VowelLengthInterpreter, WhisperConstrainedAligner, from_wav16,
};
use std::path::{Path, PathBuf};

fn vendor_root(explicit: Option<&str>) -> PathBuf {
    if let Some(v) = explicit {
        return PathBuf::from(v);
    }
    if let Ok(v) = std::env::var("LTS_BENCH_VENDOR") {
        return PathBuf::from(v);
    }
    PathBuf::from(std::env::var("HOME").unwrap_or_default()).join(".cache/lts-bench")
}

/// Resolve the model file the desktop app would use, from its device
/// `speech.json` preference + the runtime catalog. Returns `None` when the
/// preference is `"off"` (the probe then falls back to tiny). Mirrors
/// `aligner_paths` in the desktop crate without depending on it.
fn selected_model_file(data_dir: &Path, catalog: Option<&str>) -> Result<Option<String>, String> {
    let pref_path = data_dir.join("speech.json");
    let pref: serde_json::Value = serde_json::from_str(
        &std::fs::read_to_string(&pref_path)
            .map_err(|e| format!("read {}: {e}", pref_path.display()))?,
    )
    .map_err(|e| format!("bad speech.json: {e}"))?;
    let id = pref["asr_model"].as_str().unwrap_or("off");
    if id == "off" {
        return Ok(None);
    }
    let cat_path = catalog
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("apps/desktop/src-tauri/models/catalog.json"));
    let cat: serde_json::Value = serde_json::from_str(
        &std::fs::read_to_string(&cat_path)
            .map_err(|e| format!("read {}: {e}", cat_path.display()))?,
    )
    .map_err(|e| format!("bad catalog: {e}"))?;
    let models = cat["models"]
        .as_array()
        .ok_or("catalog has no models array")?;
    for m in models {
        if m["id"].as_str() == Some(id) {
            if let Some(p) = m["files"]
                .as_array()
                .and_then(|a| a.first())
                .and_then(|f| f["path"].as_str())
            {
                return Ok(Some(p.to_string()));
            }
        }
    }
    Err(format!("selected model id {id} not found in catalog"))
}

fn read_meta(path: &Path) -> Option<(String, String)> {
    let text = std::fs::read_to_string(path).ok()?;
    let mut lines = text.lines().map(|l| l.trim().to_string());
    let short = lines.next()?;
    let long = lines.next()?;
    Some((short, long))
}

fn main() {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let opt = |flag: &str| -> Option<String> {
        args.iter()
            .position(|a| a == flag)
            .and_then(|i| args.get(i + 1))
            .cloned()
    };
    let (Some(ref_short), Some(ref_long), Some(clips_dir)) =
        (opt("--ref-short"), opt("--ref-long"), opt("--clips"))
    else {
        eprintln!(
            "usage: vowel_length_probe --ref-short <wav> --ref-long <wav> --clips <dir> [--vendor <dir>] [--model <ggml-*.bin>] [--data-dir <dir>]"
        );
        std::process::exit(2);
    };

    let vendor = vendor_root(opt("--vendor").as_deref());
    let binary = vendor.join("whisper.cpp/build/bin/whisper-cli");
    let model_file = match (opt("--model"), opt("--data-dir")) {
        (Some(m), _) => m,
        (None, Some(dd)) => {
            match selected_model_file(Path::new(&dd), opt("--catalog").as_deref()) {
                Ok(Some(f)) => {
                    println!("honoring in-app selected speech model: {f}");
                    f
                }
                Ok(None) => {
                    println!("in-app speech model is OFF; probe falls back to ggml-tiny.bin");
                    "ggml-tiny.bin".to_string()
                }
                Err(e) => {
                    eprintln!("--data-dir model resolution failed: {e}");
                    std::process::exit(3);
                }
            }
        }
        (None, None) => "ggml-tiny.bin".to_string(),
    };
    let model = vendor.join(&model_file);
    if !binary.exists() || !model.exists() {
        eprintln!(
            "aligner unavailable: need {binary:?} and {model:?}\n\
             (set LTS_BENCH_VENDOR or place the bench vendor at ~/.cache/lts-bench)"
        );
        std::process::exit(3);
    }

    // Reference ratio from the pack's reviewed short/long media.
    let sr = match std::fs::read(&ref_short).map(|b| from_wav16(&b)) {
        Ok(Ok(a)) => a,
        _ => {
            eprintln!("cannot read reference short wav: {ref_short}");
            std::process::exit(4);
        }
    };
    let lr = match std::fs::read(&ref_long).map(|b| from_wav16(&b)) {
        Ok(Ok(a)) => a,
        _ => {
            eprintln!("cannot read reference long wav: {ref_long}");
            std::process::exit(4);
        }
    };
    let rs = voiced_seconds(&sr, 320, 0.01);
    let rl = voiced_seconds(&lr, 320, 0.01);
    if rs <= 0.0 || rl <= 0.0 {
        eprintln!("reference media produced no voiced material (rs={rs}, rl={rl})");
        std::process::exit(4);
    }
    let reference_ratio = rl / rs;
    println!("reference voiced seconds: short={rs:.3}s long={rl:.3}s ratio={reference_ratio:.3}");
    println!("(this is GUIDED probe output; it does not enable automatic scoring)\n");

    let aligner = WhisperConstrainedAligner {
        binary,
        model,
        language: "ja".into(),
        threshold: 0.6,
    };

    let mut clips: Vec<PathBuf> = Vec::new();
    for entry in std::fs::read_dir(&clips_dir).expect("clips dir") {
        let p = entry.expect("entry").path();
        if p.extension().and_then(|e| e.to_str()) == Some("wav") {
            clips.push(p);
        }
    }
    clips.sort();
    if clips.is_empty() {
        eprintln!("no .wav clips found in {clips_dir}");
        std::process::exit(4);
    }

    let mut scored = 0usize;
    let mut abstained = 0usize;
    for wav in &clips {
        let stem = wav.file_stem().unwrap().to_string_lossy().to_string();
        let meta = wav.with_extension("meta");
        let Some((short_text, long_text)) = read_meta(&meta) else {
            println!("{stem:24} SKIP  (missing {stem}.meta: two lines short/long)");
            continue;
        };
        let bytes = std::fs::read(wav).unwrap();
        let audio = match from_wav16(&bytes) {
            Ok(a) => a,
            Err(e) => {
                println!("{stem:24} ERROR (bad wav: {e})");
                continue;
            }
        };
        let expected = ExpectedUtterance {
            content_id: stem.clone(),
            units: vec![short_text.clone(), long_text.clone()],
        };
        let alignment = match aligner.align(&audio, &expected) {
            ProviderOutcome::Usable { value, .. } => value,
            other => {
                abstained += 1;
                println!("{stem:24} ABSTAIN ({})", reason_of(&other));
                continue;
            }
        };
        let features = match VoicedDurationFeature::default().extract(&audio, &alignment) {
            ProviderOutcome::Usable { value, .. } => value,
            other => {
                abstained += 1;
                println!("{stem:24} ABSTAIN ({})", reason_of(&other));
                continue;
            }
        };
        let evidence = lts_speech_api::PronunciationEvidence {
            alignment,
            features,
            prosody: None,
        };
        let interpreter = VowelLengthInterpreter {
            short_unit_id: short_text,
            long_unit_id: long_text,
            reference_ratio,
            ..Default::default()
        };
        match interpreter.interpret(&evidence) {
            ProviderOutcome::Usable { value, confidence } => {
                scored += 1;
                let c = &value[0];
                println!(
                    "{stem:24} {:14} {}  (align_conf={:?})",
                    format!("{:?}", c.band),
                    c.feedback_template_id,
                    confidence
                );
            }
            other => {
                abstained += 1;
                println!("{stem:24} ABSTAIN ({})", reason_of(&other));
            }
        }
    }
    println!(
        "\nscored={scored} abstained={abstained} clips={}",
        clips.len()
    );
}

fn reason_of<T>(o: &ProviderOutcome<T>) -> String {
    match o {
        ProviderOutcome::QualityRejected { reason } => format!("quality:{}", reason.0),
        ProviderOutcome::UtteranceMismatch { reason } => format!("mismatch:{}", reason.0),
        ProviderOutcome::Unsupported { reason } => format!("unsupported:{}", reason.0),
        ProviderOutcome::ProviderError { reason } => format!("provider-error:{}", reason.0),
        ProviderOutcome::Abstained { reason } => format!("abstain:{}", reason.0),
        ProviderOutcome::Usable { .. } => "usable".into(),
    }
}
