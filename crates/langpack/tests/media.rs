//! Media manifest integrity (ADR-0016): `media/manifest.jsonl` must describe
//! the bytes that actually ship, in both directions. A manifest that drifts
//! from the audio is worse than no manifest, because the app reads provenance
//! from it instead of guessing from file presence.

use lts_langpack::{Mode, Pack, Severity, archive::hex_sha256};
use std::fs;
use std::path::{Path, PathBuf};

fn wav_bytes(payload: &[u8]) -> Vec<u8> {
    // RIFF/WAVE-shaped bytes: the audit hashes what is on disk, it does not
    // decode audio.
    let mut v = b"RIFF0000WAVEfmt ".to_vec();
    v.extend_from_slice(payload);
    v
}

fn row(id: &str, file: &str, sha: &str, len: u64) -> String {
    serde_json::json!({
        "id": id,
        "file": file,
        "sha256": sha,
        "bytes": len,
        "sample_rate": 24000,
        "channels": 1,
        "seconds": 0.5,
        "provenance": "model-output",
        "synthesizer": {
            "runtime": "sherpa-onnx-v1.13.8-linux-x64-shared",
            "model": "kokoro-multi-lang-v1_1",
            "model_sha256": "0".repeat(64),
            "voice": "37",
            "speed": 1.0
        },
        "text": "きて",
        "generated": "2026-10-07",
        "notes": "test fixture"
    })
    .to_string()
}

/// Fixture pack that validates clean, plus a media directory shaped as asked.
/// The seed must be clean: `archive::build` fails on any scaffold error, which
/// would mask the media gate the last test is about.
fn copy_dir(from: &Path, to: &Path) {
    fs::create_dir_all(to).expect("create dir");
    for entry in fs::read_dir(from).expect("read dir").flatten() {
        let dest = to.join(entry.file_name());
        if entry.file_type().map(|t| t.is_dir()).unwrap_or(false) {
            copy_dir(&entry.path(), &dest);
        } else {
            fs::copy(entry.path(), &dest).expect("copy file");
        }
    }
}

fn pack_with(dir: &Path, rows: &[String], files: &[(&str, Vec<u8>)]) -> Pack {
    let seed =
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../tests/fixtures/packs/valid-minimal");
    copy_dir(&seed, dir);
    let media = dir.join("media");
    fs::create_dir_all(&media).expect("create media dir");
    let joined: String = rows.iter().map(|r| format!("{r}\n")).collect();
    fs::write(media.join("manifest.jsonl"), joined).expect("write media manifest");
    for (name, bytes) in files {
        fs::write(media.join(name), bytes).expect("write media file");
    }
    Pack::load_dir(dir).expect("load pack")
}

fn codes(diags: &[lts_langpack::Diagnostic], severity: Severity) -> Vec<String> {
    diags
        .iter()
        .filter(|d| d.severity == severity)
        .map(|d| d.code.clone())
        .collect()
}

#[test]
fn declared_asset_matching_its_bytes_is_clean() {
    let tmp = tempfile::tempdir().unwrap();
    let body = wav_bytes(b"hello");
    let sha = hex_sha256(&body);
    let len = body.len() as u64;
    let pack = pack_with(
        tmp.path(),
        &[row("ja.demo.kite-0", "media/ja.demo.kite-0.wav", &sha, len)],
        &[("ja.demo.kite-0.wav", body)],
    );
    let diags = pack.audit_media(true);
    assert!(diags.is_empty(), "clean pair: {diags:?}");
    assert!(
        !codes(&pack.validate(Mode::Install, None), Severity::Error)
            .iter()
            .any(|c| c.starts_with("media_")),
        "install validation must stay clean: {:?}",
        pack.validate(Mode::Install, None)
    );
}

#[test]
fn tampered_audio_fails_whatever_the_mode() {
    let tmp = tempfile::tempdir().unwrap();
    let declared = hex_sha256(&wav_bytes(b"hello"));
    let tampered = wav_bytes(b"hellp");
    let len = tampered.len() as u64;
    let pack = pack_with(
        tmp.path(),
        &[row(
            "ja.demo.kite-0",
            "media/ja.demo.kite-0.wav",
            &declared,
            len,
        )],
        &[("ja.demo.kite-0.wav", tampered)],
    );
    for require_present in [true, false] {
        let diags = pack.audit_media(require_present);
        assert!(
            codes(&diags, Severity::Error).contains(&"media_hash_mismatch".to_string()),
            "require_present={require_present}: {diags:?}"
        );
    }
    // Even a source checkout (scaffold) fails: the manifest would be lying.
    assert!(
        codes(&pack.validate(Mode::Scaffold, None), Severity::Error)
            .contains(&"media_hash_mismatch".to_string()),
        "validate(scaffold): {:?}",
        pack.validate(Mode::Scaffold, None)
    );
}

#[test]
fn unbuilt_media_blocks_install_and_speaks_once_in_a_checkout() {
    let tmp = tempfile::tempdir().unwrap();
    let declared = hex_sha256(&wav_bytes(b"hello"));
    let pack = pack_with(
        tmp.path(),
        &[
            row("ja.demo.kite-0", "media/ja.demo.kite-0.wav", &declared, 17),
            row("ja.demo.kite-1", "media/ja.demo.kite-1.wav", &declared, 17),
        ],
        &[],
    );
    let install = pack.audit_media(true);
    assert!(
        codes(&install, Severity::Error).contains(&"media_unbuilt".to_string()),
        "install must refuse audio the pack never built: {install:?}"
    );
    let scaffold = pack.audit_media(false);
    let infos: Vec<_> = scaffold
        .iter()
        .filter(|d| d.code == "media_unbuilt")
        .collect();
    assert_eq!(
        infos.len(),
        1,
        "an unbuilt checkout is one fact, not one diagnostic per asset: {scaffold:?}"
    );
    assert_eq!(infos[0].severity, Severity::Info);
    assert_eq!(codes(&scaffold, Severity::Error).len(), 0, "{scaffold:?}");
    assert!(infos[0].message.contains("2 asset"), "{}", infos[0].message);
}

#[test]
fn partially_built_media_is_refused_in_every_mode() {
    let tmp = tempfile::tempdir().unwrap();
    let body = wav_bytes(b"hello");
    let sha = hex_sha256(&body);
    let len = body.len() as u64;
    let missing = hex_sha256(&wav_bytes(b"other"));
    let pack = pack_with(
        tmp.path(),
        &[
            row("ja.demo.kite-0", "media/ja.demo.kite-0.wav", &sha, len),
            row("ja.demo.kite-1", "media/ja.demo.kite-1.wav", &missing, 17),
        ],
        &[("ja.demo.kite-0.wav", body)],
    );
    for require_present in [true, false] {
        let diags = pack.audit_media(require_present);
        assert!(
            codes(&diags, Severity::Error).contains(&"media_missing".to_string()),
            "require_present={require_present}: a half-built media directory cannot be \
             trusted as provenance: {diags:?}"
        );
        assert!(
            !codes(&diags, Severity::Error).contains(&"media_unbuilt".to_string()),
            "some audio is present, so this is not an unbuilt checkout: {diags:?}"
        );
    }
}

#[test]
fn undeclared_media_file_is_caught() {
    let tmp = tempfile::tempdir().unwrap();
    let body = wav_bytes(b"hello");
    let sha = hex_sha256(&body);
    let len = body.len() as u64;
    let pack = pack_with(
        tmp.path(),
        &[row("ja.demo.kite-0", "media/ja.demo.kite-0.wav", &sha, len)],
        &[
            ("ja.demo.kite-0.wav", body),
            ("ja.demo.stray.wav", wav_bytes(b"undeclared")),
        ],
    );
    let diags = pack.audit_media(true);
    assert!(
        codes(&diags, Severity::Warning).contains(&"media_unlisted".to_string()),
        "an asset with no manifest row has no declared provenance: {diags:?}"
    );
    // And it is never reported for the declared pair.
    assert_eq!(
        diags
            .iter()
            .filter(|d| d.code == "media_unlisted" && d.message.contains("ja.demo.kite-0"))
            .count(),
        0
    );
}

#[test]
fn drifting_media_is_refused_by_build() {
    // Build is where generated bytes and the committed manifest meet: hash drift
    // must stop the archive rather than ship a manifest that lies.
    let tmp = tempfile::tempdir().unwrap();
    let declared = hex_sha256(&wav_bytes(b"hello"));
    let pack_dir = tmp.path().to_path_buf();
    let pack = pack_with(
        &pack_dir,
        &[row(
            "ja.demo.kite-0",
            "media/ja.demo.kite-0.wav",
            &declared,
            5,
        )],
        &[("ja.demo.kite-0.wav", wav_bytes(b"worse"))],
    );
    assert!(
        pack.audit_media(true)
            .iter()
            .any(|d| d.severity == Severity::Error)
    );
    let err = lts_langpack::archive::build(&pack_dir)
        .expect_err("build must refuse a drifting media manifest");
    assert!(err.contains("media"), "{err}");
}

#[test]
fn an_unbuilt_pack_builds_an_honest_audio_less_archive() {
    // Every fresh checkout is in this state: the .wav bytes are gitignored
    // (ADR-0016). Refusing to build would make the pack uninstallable anywhere,
    // so build drops the manifest rather than shipping a promise it cannot keep.
    let tmp = tempfile::tempdir().unwrap();
    let declared = hex_sha256(&wav_bytes(b"hello"));
    let pack_dir = tmp.path().to_path_buf();
    pack_with(
        &pack_dir,
        &[row(
            "ja.demo.kite-0",
            "media/ja.demo.kite-0.wav",
            &declared,
            17,
        )],
        &[],
    );
    let (bytes, _) =
        lts_langpack::archive::build(&pack_dir).expect("an audio-less build must succeed");
    let am = lts_langpack::archive::inspect(&bytes).expect("inspect the built archive");
    assert!(
        !am.files.iter().any(|f| f.path == "media/manifest.jsonl"),
        "an archive that ships no audio must not carry a media manifest: {:?}",
        am.files
            .iter()
            .map(|f| f.path.clone())
            .collect::<Vec<String>>()
    );
    let store = tempfile::tempdir().unwrap();
    let outcome =
        lts_langpack::archive::install(&bytes, store.path()).expect("install must accept it");
    assert!(
        !outcome.directory.join("media/manifest.jsonl").exists(),
        "installed copy must match the archive: {:?}",
        outcome.directory
    );
}

#[test]
fn a_partially_built_pack_never_builds() {
    let tmp = tempfile::tempdir().unwrap();
    let body = wav_bytes(b"hello");
    let sha = hex_sha256(&body);
    let len = body.len() as u64;
    let missing = hex_sha256(&wav_bytes(b"other"));
    let pack_dir = tmp.path().to_path_buf();
    pack_with(
        &pack_dir,
        &[
            row("ja.demo.kite-0", "media/ja.demo.kite-0.wav", &sha, len),
            row("ja.demo.kite-1", "media/ja.demo.kite-1.wav", &missing, 17),
        ],
        &[("ja.demo.kite-0.wav", body)],
    );
    let err = lts_langpack::archive::build(&pack_dir)
        .expect_err("a half-built media directory cannot be shipped");
    assert!(
        err.contains("media") && err.contains("partial"),
        "the refusal must name the partial media build: {err}"
    );
}
