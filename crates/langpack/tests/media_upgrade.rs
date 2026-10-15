//! Installed media cannot silently drift from the manifest that is in force.
//!
//! Install verifies hashes on the way IN (PACK-004, `archive::install`), but the
//! store is where the bytes actually live: an upgrade, a same-version reinstall,
//! or a corrupted cache must all leave `<store>/<pack_id>/<version>` describing
//! itself truthfully. A media directory that merges across versions, or an
//! installed tree whose bytes no longer match its shipped `media/manifest.jsonl`,
//! gives the app provenance labels for audio it is not playing (ADR-0016).

use lts_langpack::archive;
use lts_langpack::{Mode, Pack, Severity};
use serde_json::Value;
use std::fs;
use std::path::{Path, PathBuf};

const PACK_ID: &str = "org.openlanguage.test-minimal";
const MEDIA_FILE: &str = "media/es.lex.greet.hola.wav";
const MEDIA_NAME: &str = "es.lex.greet.hola.wav";

fn fixture(name: &str) -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../../tests/fixtures/packs")
        .join(name)
}

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

/// RIFF/WAVE-shaped bytes: the audit hashes what is on disk, it does not decode
/// audio, so payload differences are the whole story.
fn wav_bytes(payload: &[u8]) -> Vec<u8> {
    let mut v = b"RIFF0000WAVEfmt ".to_vec();
    v.extend_from_slice(payload);
    v
}

/// A temp copy of the media-carrying fixture — the fixture under
/// `tests/fixtures` stays untouched — shipped with `payload` as its audio and a
/// media manifest row re-hashed and re-sized to describe those exact bytes, at
/// `version`.
fn pack_variant(dir: &Path, version: &str, payload: &[u8]) {
    copy_dir(&fixture("valid-minimal"), dir);

    let body = wav_bytes(payload);
    let sha = archive::hex_sha256(&body);
    let len = body.len() as u64;
    fs::write(dir.join(MEDIA_FILE), &body).expect("write media file");

    let media_manifest = dir.join("media/manifest.jsonl");
    let text = fs::read_to_string(&media_manifest).expect("read media manifest");
    let mut rewritten = 0usize;
    let joined: String = text
        .lines()
        .filter(|l| !l.trim().is_empty())
        .map(|line| {
            let mut value: Value = serde_json::from_str(line).expect("media row is json");
            if value.get("file").and_then(Value::as_str) == Some(MEDIA_FILE) {
                value["sha256"] = Value::String(sha.clone());
                value["bytes"] = serde_json::json!(len);
                rewritten += 1;
            }
            format!("{value}\n")
        })
        .collect();
    fs::write(&media_manifest, joined).expect("write re-hashed media manifest");
    assert_eq!(
        rewritten, 1,
        "the fixture must carry exactly one {MEDIA_FILE} row"
    );

    // Line-scoped version override: `min_version` also says 0.1.0, and a
    // substring replace would rewrite it too.
    let pack_manifest = dir.join("manifest.yaml");
    let text = fs::read_to_string(&pack_manifest).expect("read pack manifest");
    let joined: String = text
        .lines()
        .map(|line| {
            if line.starts_with("version: ") {
                format!("version: \"{version}\"\n")
            } else {
                format!("{line}\n")
            }
        })
        .collect();
    fs::write(&pack_manifest, joined).expect("write versioned pack manifest");
}

/// The `sha256` the installed version's own media manifest declares for the
/// fixture asset.
fn declared_sha(store: &Path, version: &str) -> String {
    let path = store
        .join(PACK_ID)
        .join(version)
        .join("media/manifest.jsonl");
    let text = fs::read_to_string(&path).expect("installed media manifest");
    let mut found: Option<String> = None;
    for line in text.lines().filter(|l| !l.trim().is_empty()) {
        let value: Value = serde_json::from_str(line).expect("installed media row is json");
        if value.get("file").and_then(Value::as_str) == Some(MEDIA_FILE) {
            assert!(
                found.is_none(),
                "version {version} declares {MEDIA_FILE} more than once"
            );
            found = Some(
                value
                    .get("sha256")
                    .and_then(Value::as_str)
                    .expect("row declares sha256")
                    .to_string(),
            );
        }
    }
    found.unwrap_or_else(|| panic!("version {version} has no {MEDIA_FILE} row"))
}

/// sha256 of the audio bytes actually on disk under `version`, plus the file
/// names sitting in that version's media directory (the manifest excluded).
fn installed_media(store: &Path, version: &str) -> (String, Vec<String>) {
    let media_dir = store.join(PACK_ID).join(version).join("media");
    let mut names: Vec<String> = Vec::new();
    let mut sha = None;
    for entry in fs::read_dir(&media_dir)
        .unwrap_or_else(|e| panic!("read {}: {e}", media_dir.display()))
        .flatten()
    {
        let name = entry.file_name().to_string_lossy().into_owned();
        if name == "manifest.jsonl" {
            continue;
        }
        names.push(name.clone());
        if name == MEDIA_NAME {
            let bytes = fs::read(entry.path()).expect("read installed media");
            sha = Some(archive::hex_sha256(&bytes));
        }
    }
    names.sort();
    (
        sha.unwrap_or_else(|| panic!("{version} has no {MEDIA_NAME} on disk")),
        names,
    )
}

fn error_codes(diags: &[lts_langpack::Diagnostic]) -> Vec<String> {
    diags
        .iter()
        .filter(|d| d.severity == Severity::Error)
        .map(|d| d.code.clone())
        .collect()
}

#[test]
fn an_upgrade_swaps_the_media_in_force_and_keeps_the_old_bytes_for_rollback() {
    let store = tempfile::tempdir().unwrap();
    let src_a = tempfile::tempdir().unwrap();
    pack_variant(src_a.path(), "0.1.0", b"alpha");
    let sha_a = archive::hex_sha256(&wav_bytes(b"alpha"));
    let (bytes, _) = archive::build(src_a.path()).unwrap();
    let out_a = archive::install(&bytes, store.path()).unwrap();
    assert_eq!(out_a.pack_id, PACK_ID);
    assert_eq!(out_a.version, "0.1.0");

    let src_b = tempfile::tempdir().unwrap();
    pack_variant(src_b.path(), "0.2.0", b"beta audio with different bytes");
    let sha_b = archive::hex_sha256(&wav_bytes(b"beta audio with different bytes"));
    assert_ne!(sha_a, sha_b);
    let (bytes, _) = archive::build(src_b.path()).unwrap();
    let out_b = archive::install(&bytes, store.path()).unwrap();
    assert_eq!(out_b.previous.as_deref(), Some("0.1.0"));

    assert_eq!(
        archive::current_version(PACK_ID, store.path()).as_deref(),
        Some("0.2.0"),
        "the store pointer must move to the upgraded version"
    );

    // The version in force plays what its own manifest declares.
    let (on_disk_b, files_b) = installed_media(store.path(), "0.2.0");
    assert_eq!(on_disk_b, sha_b, "the in-force media bytes drifted");
    assert_eq!(declared_sha(store.path(), "0.2.0"), sha_b);

    // The old version stays intact and self-describing for rollback.
    assert!(
        store.path().join(PACK_ID).join("0.1.0").is_dir(),
        "old version kept for rollback"
    );
    let (on_disk_a, files_a) = installed_media(store.path(), "0.1.0");
    assert_eq!(on_disk_a, sha_a, "the rollback copy was overwritten");
    assert_eq!(declared_sha(store.path(), "0.1.0"), sha_a);

    // No merge between versions: each directory holds exactly its own asset.
    assert_eq!(files_a, vec![MEDIA_NAME.to_string()], "{files_a:?}");
    assert_eq!(files_b, vec![MEDIA_NAME.to_string()], "{files_b:?}");
}

#[test]
fn reinstalling_the_same_version_replaces_the_media_instead_of_merging_it() {
    let store = tempfile::tempdir().unwrap();
    let src_a = tempfile::tempdir().unwrap();
    pack_variant(src_a.path(), "0.1.0", b"alpha");
    let sha_a = archive::hex_sha256(&wav_bytes(b"alpha"));
    let (bytes, _) = archive::build(src_a.path()).unwrap();
    archive::install(&bytes, store.path()).unwrap();

    let src_b = tempfile::tempdir().unwrap();
    pack_variant(src_b.path(), "0.1.0", b"replacement audio");
    let sha_b = archive::hex_sha256(&wav_bytes(b"replacement audio"));
    assert_ne!(sha_a, sha_b);
    let (bytes, _) = archive::build(src_b.path()).unwrap();
    archive::install(&bytes, store.path()).unwrap();

    assert_eq!(
        archive::current_version(PACK_ID, store.path()).as_deref(),
        Some("0.1.0")
    );
    let (on_disk, files) = installed_media(store.path(), "0.1.0");
    assert_eq!(on_disk, sha_b, "the reinstall left the old bytes in place");
    assert_eq!(declared_sha(store.path(), "0.1.0"), sha_b);
    assert_eq!(files, vec![MEDIA_NAME.to_string()], "{files:?}");
    assert_ne!(on_disk, sha_a, "the superseded bytes must not survive");
}

#[test]
fn a_tampered_installed_asset_fails_install_validation() {
    let store = tempfile::tempdir().unwrap();
    let src = tempfile::tempdir().unwrap();
    pack_variant(src.path(), "0.1.0", b"alpha");
    let (bytes, _) = archive::build(src.path()).unwrap();
    let out = archive::install(&bytes, store.path()).unwrap();

    // The tree the store just wrote is clean: without this, the assertion
    // below could be satisfied by a pack that never validated at all.
    let pristine = Pack::load_dir(&out.directory).expect("load installed pack");
    let clean = error_codes(&pristine.validate(Mode::Install, None));
    assert!(clean.is_empty(), "freshly installed pack: {clean:?}");

    // Corrupt the cache in place, leaving the manifest alone.
    let tampered = wav_bytes(b"payload that is longer than alpha");
    fs::write(out.directory.join(MEDIA_FILE), &tampered).expect("tamper media file");

    let tampered_pack = Pack::load_dir(&out.directory).expect("load tampered pack");
    let codes = error_codes(&tampered_pack.validate(Mode::Install, None));
    assert!(
        codes.contains(&"media_hash_mismatch".to_string()),
        "the shipped bytes no longer match the shipped manifest: {codes:?}"
    );
    assert!(
        codes.contains(&"media_size_mismatch".to_string()),
        "the declared byte count also disagrees: {codes:?}"
    );
    // `audit_media(true)` is the very gate install runs, so it must agree.
    let audit = tampered_pack.audit_media(true);
    assert!(
        error_codes(&audit).contains(&"media_hash_mismatch".to_string()),
        "audit_media(true) must agree with validate(): {audit:?}"
    );
}
