//! Bundled sidecar resolver acceptance (owner decision 2026-10-08):
//! a staged payload resolves only when intact, right-platform, right-CPU;
//! the aligner child inherits LD_LIBRARY_PATH pointing at the payload libs.
//!
//! All payloads here are fake (tiny files / shell scripts) — hermetic, no
//! network, no real whisper, no assumption about this host's ISA beyond what
//! `is_x86_feature_detected!` itself reports.

use lts_speech_api::AudioBuffer;
use lts_speech_runtime::sidecar::{
    self, EXPECTED_COMPONENT, EXPECTED_SCHEMA, MANIFEST_FILE, Sidecar, SidecarProblem,
};
use std::io::Write;
use std::path::Path;
use tempfile::TempDir;
/// Default fixture bytes; sha256("hello\n") so verify_hashes can pass.
const FILE_BYTES: &[u8] = b"hello\n";
const FILE_SHA: &str = "5891b5b522d5df086d0ff0b110fbd9d21bb4fc7163af34d08286a2e846f6be03";

fn manifest_yaml(built_for: &str, schema: u32, component: &str, requires_cpu: &str) -> String {
    let mut files = Vec::new();
    for f in ["bin/whisper-cli", "bin/libwhisper.so.1"] {
        files.push(format!(
            "    - path: {f}\n      bytes: {}\n      sha256: {FILE_SHA}",
            FILE_BYTES.len()
        ));
    }
    format!(
        "schema_version: {schema}\n\
         component: {component}\n\
         built_for: {built_for}\n\
         runtime:\n\
         \x20 upstream: https://github.com/ggml-org/whisper.cpp\n\
         \x20 ref: 60c0be6ac8fa71b1a2ae2dd938a31a34a508e774\n\
         \x20 version: 1.9.4\n\
         \x20 license: MIT\n\
         \x20 build_flags: -DGGML_NATIVE=OFF\n\
         \x20 requires_cpu: {requires_cpu}\n\
         \x20 files:\n{}\n\
         model:\n\
         \x20 id: ggml-tiny\n\
         \x20 upstream: https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin\n\
         \x20 license: MIT\n\
         \x20 bytes: {}\n\
         \x20 sha256: {FILE_SHA}\n\
         staged:\n\
         \x20 date: \"2026-10-08T00:00:00Z\"\n\
         \x20 by: test\n\
         \x20 host: Linux x64\n",
        files.join("\n"),
        FILE_BYTES.len()
    )
}

/// Minimal but structurally real payload: manifest + bin/whisper-cli +
/// bin/libwhisper.so.1 + model/ggml-tiny.bin, all real bytes.
fn staged_payload(dir: &Path) {
    write_manifest(dir, &manifest_yaml("linux-x64", 1, EXPECTED_COMPONENT, ""));
    std::fs::create_dir_all(dir.join("bin")).unwrap();
    std::fs::create_dir_all(dir.join("model")).unwrap();
    for f in [
        "bin/whisper-cli",
        "bin/libwhisper.so.1",
        "model/ggml-tiny.bin",
    ] {
        std::fs::write(dir.join(f), FILE_BYTES).unwrap();
    }
}

fn write_manifest(dir: &Path, yaml: &str) {
    std::fs::write(dir.join(MANIFEST_FILE), yaml).unwrap();
}

#[test]
fn well_formed_payload_loads_with_usable_paths() {
    let tmp = TempDir::new().unwrap();
    staged_payload(tmp.path());
    let sc = Sidecar::load(tmp.path()).expect("payload should load");
    assert_eq!(sc.manifest.schema_version, EXPECTED_SCHEMA);
    assert_eq!(sc.binary(), tmp.path().join("bin/whisper-cli"));
    assert_eq!(sc.model_path(), tmp.path().join("model/ggml-tiny.bin"));
    assert!(sc.binary().is_file());
    assert!(sc.model_path().is_file());
    // Declared hashes match the fixture bytes: the opt-in deep check passes.
    sc.verify_hashes().expect("hashes match fixture bytes");
}

#[test]
fn a_tampered_payload_byte_fails_the_deep_check_and_names_the_file() {
    let tmp = TempDir::new().unwrap();
    staged_payload(tmp.path());
    // Same byte count as declared, different content: the size gate in `load`
    // is blind to this, so the opt-in digest check has to catch it (and
    // finish — its hand-rolled predecessor hung here forever).
    std::fs::write(tmp.path().join("bin/whisper-cli"), b"hellx\n").unwrap();
    let sc = Sidecar::load(tmp.path()).expect("size gate still passes");
    match sc.verify_hashes().expect_err("tampered bytes must fail") {
        SidecarProblem::Incomplete { missing } => {
            assert_eq!(missing, vec!["bin/whisper-cli".to_string()]);
        }
        other => panic!("expected Incomplete, got {other:?}"),
    }
}

#[test]
fn declared_file_one_byte_short_is_incomplete_naming_that_path() {
    let tmp = TempDir::new().unwrap();
    staged_payload(tmp.path());
    std::fs::write(tmp.path().join("bin/libwhisper.so.1"), b"hell").unwrap();
    let err = Sidecar::load(tmp.path()).unwrap_err();
    match err {
        SidecarProblem::Incomplete { missing } => {
            assert_eq!(missing, vec!["bin/libwhisper.so.1".to_string()]);
        }
        other => panic!("expected Incomplete, got {other:?}"),
    }
}

#[cfg(unix)]
#[test]
fn symlinked_payload_entry_is_incomplete() {
    let tmp = TempDir::new().unwrap();
    staged_payload(tmp.path());
    // Payloads must carry real bytes: replace the declared lib with a symlink
    // to identical content elsewhere (exactly the cmake .so.1 shape that must
    // not survive staging).
    std::fs::remove_file(tmp.path().join("bin/libwhisper.so.1")).unwrap();
    std::os::unix::fs::symlink(
        tmp.path().join("model/ggml-tiny.bin"),
        tmp.path().join("bin/libwhisper.so.1"),
    )
    .unwrap();
    let err = Sidecar::load(tmp.path()).unwrap_err();
    match err {
        SidecarProblem::Incomplete { missing } => {
            assert_eq!(missing, vec!["bin/libwhisper.so.1".to_string()]);
        }
        other => panic!("expected Incomplete, got {other:?}"),
    }
}

#[test]
fn payload_for_other_platform_mismatches_with_both_values() {
    let tmp = TempDir::new().unwrap();
    write_manifest(
        tmp.path(),
        &manifest_yaml("windows-x64", 1, EXPECTED_COMPONENT, ""),
    );
    let err = Sidecar::load(tmp.path()).unwrap_err();
    match err {
        SidecarProblem::PlatformMismatch { built_for, host } => {
            assert_eq!(built_for, "windows-x64");
            assert_eq!(host, sidecar::host_platform());
        }
        other => panic!("expected PlatformMismatch, got {other:?}"),
    }
}

#[test]
fn future_schema_is_rejected() {
    let tmp = TempDir::new().unwrap();
    write_manifest(
        tmp.path(),
        &manifest_yaml("linux-x64", 2, EXPECTED_COMPONENT, ""),
    );
    let err = Sidecar::load(tmp.path()).unwrap_err();
    match err {
        SidecarProblem::SchemaVersion { got } => assert_eq!(got, 2),
        other => panic!("expected SchemaVersion, got {other:?}"),
    }
}

#[test]
fn wrong_component_is_rejected() {
    let tmp = TempDir::new().unwrap();
    write_manifest(
        tmp.path(),
        &manifest_yaml("linux-x64", 1, "something-else", ""),
    );
    let err = Sidecar::load(tmp.path()).unwrap_err();
    match err {
        SidecarProblem::Component { got } => assert_eq!(got, "something-else"),
        other => panic!("expected Component, got {other:?}"),
    }
}

#[test]
fn missing_manifest_is_reported_with_dir() {
    let tmp = TempDir::new().unwrap();
    let err = Sidecar::load(tmp.path()).unwrap_err();
    match err {
        SidecarProblem::MissingManifest { dir } => assert_eq!(dir, tmp.path()),
        other => panic!("expected MissingManifest, got {other:?}"),
    }
}

#[test]
fn cpu_gate_tracks_detection_not_hardcoded_answers() {
    assert!(sidecar::cpu_supported(""));
    // Unrecognised ISA-shaped claim: fails closed on every host.
    assert!(!sidecar::cpu_supported("avx1024"));
    #[cfg(target_arch = "x86_64")]
    {
        // The manifest requirement is satisfied exactly when the host really
        // has every named feature — no machine-specific expectation baked in.
        let required =
            sidecar::cpu_supported("x86-64-v3 (SSE4.2, F16C, FMA, BMI2, AVX, AVX2; no AVX-512)");
        let actually_present = std::is_x86_feature_detected!("sse4.2")
            && std::is_x86_feature_detected!("f16c")
            && std::is_x86_feature_detected!("fma")
            && std::is_x86_feature_detected!("bmi2")
            && std::is_x86_feature_detected!("avx")
            && std::is_x86_feature_detected!("avx2");
        assert_eq!(required, actually_present);
    }
}

#[cfg(unix)]
#[test]
fn runtime_env_prepends_binary_dir_and_keeps_existing_entry() {
    let tmp = TempDir::new().unwrap();
    let mut cmd = std::process::Command::new("true");
    cmd.env("LD_LIBRARY_PATH", "/keep/me");
    sidecar::apply_runtime_env(&mut cmd, &tmp.path().join("bin/whisper-cli"));
    // get_envs, not get_env: MSRV 1.85 predates Command::get_env.
    let value = cmd
        .get_envs()
        .find(|(k, _)| *k == std::ffi::OsStr::new("LD_LIBRARY_PATH"))
        .and_then(|(_, v)| v.map(|v| v.to_owned()))
        .expect("LD_LIBRARY_PATH set");
    let value = value.to_string_lossy().into_owned();
    assert_eq!(
        value,
        format!("{}:/keep/me", tmp.path().join("bin").display())
    );
}

/// End-to-end for the alignment.rs change: a fake whisper-cli that refuses to
/// run unless LD_LIBRARY_PATH names its own directory, and that writes the
/// `<wav-stem>.wav.json` whisper.cpp would write.
#[cfg(unix)]
#[test]
fn aligner_child_sees_payload_library_path_and_parses_its_json() {
    let tmp = TempDir::new().unwrap();
    std::fs::create_dir_all(tmp.path().join("bin")).unwrap();
    let script = tmp.path().join("bin/whisper-cli");
    let mut f = std::fs::File::create(&script).unwrap();
    // Positional args are every flag, so the wav path is $9
    // (-m <model> -l <lang> -nt -np -oj -f <wav>). run_whisper_words reads the
    // result at `<wav path with .wav replaced by .wav.json>`, i.e. the stem plus
    // `.wav.json`. The fixture is a raw string written as bytes, so the JSON
    // below carries the real UTF-8 bytes of the token, not printf escapes.
    let script_body = r#"#!/bin/sh
here=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)
case ":${LD_LIBRARY_PATH:-}:" in
  *":$here:"*) ;;
  *) echo "LD_LIBRARY_PATH missing $here" >&2; exit 3 ;;
esac
printf '%s\n' '{"transcription":[{"text":"あ","offsets":{"from":0,"to":100}}]}' > "${9%.wav}.wav.json"
"#;
    f.write_all(script_body.as_bytes()).unwrap();
    drop(f);
    std::fs::set_permissions(&script, std::os::unix::fs::PermissionsExt::from_mode(0o755)).unwrap();

    let audio = AudioBuffer {
        samples: vec![0.0f32; 160],
        sample_rate_hz: 16_000,
    };
    let tokens = lts_speech_runtime::alignment::run_whisper_words(
        &script,
        &tmp.path().join("model/ggml-tiny.bin"),
        "ja",
        &audio,
        None,
    )
    .expect("fake whisper-cli should succeed through run_whisper_words");
    assert_eq!(tokens.len(), 1);
    assert_eq!(tokens[0].text, "あ");
    assert_eq!(tokens[0].from_ms, 0);
    assert_eq!(tokens[0].to_ms, 100);
}

/// sweep-sidecar-timeout: a wedged whisper.cpp child is killed and reaped
/// at the injected deadline, surfacing as the exact reason
/// `sidecar-timeout` instead of hanging the caller forever.
#[cfg(unix)]
#[test]
fn wedged_whisper_child_is_killed_at_the_deadline() {
    let tmp = TempDir::new().unwrap();
    let script = tmp.path().join("whisper-cli");
    let mut f = std::fs::File::create(&script).unwrap();
    f.write_all(b"#!/bin/sh\nsleep 300\n").unwrap();
    drop(f);
    std::fs::set_permissions(&script, std::os::unix::fs::PermissionsExt::from_mode(0o755)).unwrap();
    let audio = AudioBuffer {
        samples: vec![0.0f32; 160],
        sample_rate_hz: 16_000,
    };
    let started = std::time::Instant::now();
    let err = lts_speech_runtime::alignment::run_whisper_words(
        &script,
        &tmp.path().join("model/ggml-tiny.bin"),
        "ja",
        &audio,
        Some(std::time::Duration::from_millis(300)),
    )
    .expect_err("a sidecar that never finishes must not return tokens");
    let elapsed = started.elapsed();
    assert_eq!(err, sidecar::SIDECAR_TIMEOUT_REASON);
    // The deadline is enforced, not merely observed after the child's own
    // 300 s sleep.
    assert!(
        elapsed < std::time::Duration::from_secs(5),
        "took {elapsed:?}"
    );
}

/// sweep-tmp-audio-privacy: staged WAVs live in a dedicated private dir
/// (dir 0700, file 0600); the startup sweep removes stale leftovers from
/// killed/crashed runs but never a file that is young enough to be
/// in-flight.
#[cfg(unix)]
#[test]
fn staged_wavs_are_private_and_stale_ones_get_swept() {
    use std::os::unix::fs::PermissionsExt;
    let (f, wav) = sidecar::create_staged_wav("lts-test-stage").unwrap();
    let dir = wav.parent().unwrap().to_path_buf();
    assert_eq!(
        std::fs::metadata(&dir).unwrap().permissions().mode() & 0o777,
        0o700,
        "staging dir must be owner-only"
    );
    assert_eq!(
        f.metadata().unwrap().permissions().mode() & 0o777,
        0o600,
        "staged wav must not be group/other readable"
    );
    drop(f);

    // Age the first file into staleness; a fresh one stands in for an
    // in-flight sidecar call.
    let past = std::time::SystemTime::UNIX_EPOCH + std::time::Duration::from_secs(1);
    std::fs::File::options()
        .write(true)
        .open(&wav)
        .unwrap()
        .set_modified(past)
        .unwrap();
    let (fresh, fresh_path) = sidecar::create_staged_wav("lts-test-stage").unwrap();
    drop(fresh);

    let removed = sidecar::sweep_stale_audio_tmp(std::time::Duration::from_secs(60));
    assert!(removed >= 1, "the stale file should have been swept");
    assert!(!wav.exists(), "stale staging file must be removed");
    assert!(
        fresh_path.exists(),
        "a file younger than the threshold is in use, keep it"
    );
    let _ = std::fs::remove_file(&fresh_path);
}

/// PERF-002 (owner decision 2026-10-21): sidecar children must yield the
/// scheduler to the UI process. The observable contract is the child's OS
/// nice value; /proc's field 19 (1-based) is it, read from the spawned
/// child itself so the assertion covers the fork-to-exec hook, not just
/// the parent's intent.
#[cfg(target_os = "linux")]
#[test]
fn lowered_priority_children_run_at_nice_10() {
    let mut cmd = std::process::Command::new("/bin/sh");
    cmd.arg("-c").arg("cat /proc/self/stat");
    sidecar::lower_priority(&mut cmd);
    let out = cmd.output().expect("spawn must succeed");
    assert!(out.status.success(), "child must run to completion");
    let stat = String::from_utf8(out.stdout).expect("stat is UTF-8");
    let nice: i32 = stat
        .split_whitespace()
        .nth(18)
        .expect("/proc stat must have a nice field")
        .parse()
        .expect("nice field parses as i32");
    assert_eq!(
        nice, 10,
        "the sidecar spawn hook must leave the child at nice +10"
    );
}
