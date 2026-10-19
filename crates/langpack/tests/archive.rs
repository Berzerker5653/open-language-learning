//! Secure archive conformance (PACK-004): deterministic build, hardened
//! install, upgrade/rollback.

use lts_langpack::archive;
use std::fs;
use std::io::{Cursor, Write};
use std::path::Path;

fn fixture(name: &str) -> std::path::PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../../tests/fixtures/packs")
        .join(name)
}

fn copy_pack(src: &Path, dst: &Path) {
    fs::create_dir_all(dst).unwrap();
    for entry in walk(src) {
        let rel = entry.strip_prefix(src).unwrap();
        let to = dst.join(rel);
        fs::create_dir_all(to.parent().unwrap()).unwrap();
        fs::copy(entry, &to).unwrap();
    }
}

fn walk(dir: &Path) -> Vec<std::path::PathBuf> {
    let mut out = Vec::new();
    for entry in fs::read_dir(dir).unwrap() {
        let p = entry.unwrap().path();
        if p.is_dir() {
            out.extend(walk(&p));
        } else {
            out.push(p);
        }
    }
    out
}

#[test]
fn build_is_deterministic() {
    let (a, sha_a) = archive::build(&fixture("valid-minimal")).unwrap();
    let (b, sha_b) = archive::build(&fixture("valid-minimal")).unwrap();
    assert_eq!(a, b, "archive bytes must be identical");
    assert_eq!(sha_a, sha_b);
    assert_eq!(
        archive::inspect(&a).unwrap().pack_id,
        "org.openlanguage.test-minimal"
    );
}

#[test]
fn build_rejects_invalid_pack() {
    let err = archive::build(&fixture("invalid-id-grammar")).unwrap_err();
    assert!(err.contains("validation error"), "{err}");
}

#[test]
fn install_upgrade_rollback_cycle() {
    let store = tempfile::tempdir().unwrap();
    let pack_dir = tempfile::tempdir().unwrap();
    copy_pack(&fixture("valid-minimal"), pack_dir.path());

    let (bytes, _) = archive::build(pack_dir.path()).unwrap();
    let out = archive::install(&bytes, store.path()).unwrap();
    assert_eq!(out.pack_id, "org.openlanguage.test-minimal");
    assert_eq!(out.version, "0.1.0");
    assert_eq!(
        archive::current_version("org.openlanguage.test-minimal", store.path()).as_deref(),
        Some("0.1.0")
    );
    assert!(out.directory.join("manifest.yaml").is_file());

    // Upgrade: bump the version and reinstall.
    let manifest = pack_dir.path().join("manifest.yaml");
    let text = fs::read_to_string(&manifest)
        .unwrap()
        .replace("0.1.0", "0.2.0");
    fs::write(&manifest, text).unwrap();
    let (bytes2, _) = archive::build(pack_dir.path()).unwrap();
    let out2 = archive::install(&bytes2, store.path()).unwrap();
    assert_eq!(out2.previous.as_deref(), Some("0.1.0"));
    assert_eq!(
        archive::current_version("org.openlanguage.test-minimal", store.path()).as_deref(),
        Some("0.2.0")
    );
    assert!(
        store
            .path()
            .join("org.openlanguage.test-minimal/0.1.0")
            .is_dir(),
        "old version kept for rollback"
    );

    // Rollback.
    let back = archive::rollback("org.openlanguage.test-minimal", store.path(), None).unwrap();
    assert_eq!(back, "0.1.0");
    assert_eq!(
        archive::current_version("org.openlanguage.test-minimal", store.path()).as_deref(),
        Some("0.1.0")
    );
}

/// ADR-0038 regression pin for the 0.4.2 CI failure ("pack rejected by
/// install validation: 215 error(s)"): the U07 scenario-help codes are an
/// opt-in promise. The same payload-less ladder-3 scenario must install
/// when the pack never declared `capabilities.scenario_help`, and must be
/// refused when it did.
const U07_PAYLOAD_LESS_SCENARIO: &str = "\
id: es.scenario.u07.help
goal_id: es.goal.intro.greet
title: Ask the time
nodes:
- id: es.scenario.u07.help.open
  prompt: Ask a passer-by what time it is.
  expected_actions: [ask-time]
  next: []
support_ladder:
- support_level: 0
  description: No supports
- support_level: 3
  description: Word bank
transfer_variants_required: 0
";

fn scenario_copy(declare_promise: bool) -> tempfile::TempDir {
    let tmp = tempfile::tempdir().unwrap();
    copy_pack(&fixture("valid-minimal"), tmp.path());
    if declare_promise {
        let manifest = tmp.path().join("manifest.yaml");
        let text = fs::read_to_string(&manifest).unwrap();
        fs::write(
            &manifest,
            text.replace(
                "  writing: true\n",
                "  writing: true\n  scenario_help: true\n",
            ),
        )
        .unwrap();
    }
    let dir = tmp.path().join("activities/scenarios");
    fs::create_dir_all(&dir).unwrap();
    fs::write(dir.join("900-u07.yaml"), U07_PAYLOAD_LESS_SCENARIO).unwrap();
    tmp
}

/// Re-sign an archive with a new `manifest.yaml` body: the same zip
/// entries, MANIFEST.json rebuilt with fresh hashes. This is the only way
/// to reach the install gate with a declared-promise pack, since `build`
/// itself refuses one before it ever emits bytes.
fn resign_with_manifest(bytes: &[u8], manifest_body: &[u8]) -> Vec<u8> {
    let am = archive::inspect(bytes).unwrap();
    let mut files: Vec<(String, Vec<u8>)> = Vec::new();
    for f in &am.files {
        let body = if f.path == "manifest.yaml" {
            manifest_body.to_vec()
        } else {
            archive::read_entry(bytes, &f.path).unwrap()
        };
        files.push((f.path.clone(), body));
    }
    let entries: Vec<archive::FileEntry> = files
        .iter()
        .map(|(path, body)| archive::FileEntry {
            path: path.clone(),
            sha256: archive::hex_sha256(body),
            size: body.len() as u64,
        })
        .collect();
    let am = archive::ArchiveManifest {
        files: entries,
        ..am
    };
    let mut zip = zip::ZipWriter::new(Cursor::new(Vec::new()));
    let opts = zip::write::SimpleFileOptions::default();
    zip.start_file(archive::MANIFEST_ENTRY, opts).unwrap();
    zip.write_all(&serde_json::to_vec(&am).unwrap()).unwrap();
    for (path, body) in &files {
        zip.start_file(path, opts).unwrap();
        zip.write_all(body).unwrap();
    }
    zip.finish().unwrap().into_inner()
}

#[test]
fn undeclared_help_promise_installs_payload_less_scenario() {
    let store = tempfile::tempdir().unwrap();
    let pack_dir = scenario_copy(false);
    let (bytes, _) = archive::build(pack_dir.path())
        .expect("a pack that never declared scenario_help must still build");
    let out = archive::install(&bytes, store.path())
        .expect("pre-promise archives (the 0.4.2 shape) must stay installable");
    assert_eq!(out.pack_id, "org.openlanguage.test-minimal");
}

#[test]
fn declared_help_promise_blocks_payload_less_scenario_at_build_and_install() {
    // Build refuses the declared pack up front (strictness applies in
    // scaffold posture too)…
    let declared_dir = scenario_copy(true);
    let build_err = archive::build(declared_dir.path())
        .expect_err("a declared promise must be enforced at build");
    assert!(
        build_err.contains("ladder level 3 is not delivered"),
        "the refusal must name the undelivered rung: {build_err}"
    );
    // …and the install gate refuses an archive whose pack declares the
    // promise: same undeclared-built bytes, manifest re-declared.
    let store = tempfile::tempdir().unwrap();
    let (bytes, _) = archive::build(scenario_copy(false).path()).unwrap();
    let declared_manifest = fs::read_to_string(declared_dir.path().join("manifest.yaml")).unwrap();
    let bytes = resign_with_manifest(&bytes, declared_manifest.as_bytes());
    let err = archive::install(&bytes, store.path())
        .expect_err("a declared promise must be enforced at install");
    assert!(matches!(err, archive::ArchiveError::Validation(_)), "{err}");
    assert!(
        err.to_string()
            .contains("scenario_support_rung_undelivered"),
        "the refusal must name the undelivered rung: {err}"
    );
}

/// I05: a cancel pressed while the archive is being unpacked must not leave
/// the learner looking at an installed (or half-installed) pack. The store is
/// byte-for-byte what it was, and the same bytes install cleanly on retry.
#[test]
fn a_cancelled_unpack_leaves_the_store_untouched() {
    let store = tempfile::tempdir().unwrap();
    let (bytes, _) = archive::build(&fixture("valid-minimal")).unwrap();
    let entries = archive::inspect(&bytes).unwrap().files.len();
    assert!(entries >= 2, "fixture needs entries to abort between");

    // Cancel before the first entry is extracted.
    let err = archive::install_with_cancel(&bytes, store.path(), &|| true).unwrap_err();
    assert!(matches!(err, archive::ArchiveError::Cancelled), "{err}");

    // Cancel one entry in: the hook is consulted once per entry, so this
    // aborts after the first file landed in staging and before the store was
    // renamed into place.
    let seen = std::cell::Cell::new(0usize);
    let hook = || {
        seen.set(seen.get() + 1);
        seen.get() > 1
    };
    let err = archive::install_with_cancel(&bytes, store.path(), &hook).unwrap_err();
    assert!(matches!(err, archive::ArchiveError::Cancelled), "{err}");
    assert!(seen.get() >= 2, "the hook has to be consulted per entry");

    // Nothing about the store changed: no `current` pointer, no version
    // directory, and no leftover staging files.
    assert_eq!(
        archive::current_version("org.openlanguage.test-minimal", store.path()),
        None
    );
    assert!(
        !store.path().join("org.openlanguage.test-minimal").exists(),
        "a cancelled install must not create the pack directory"
    );
    assert!(
        walk(store.path()).is_empty(),
        "no partial files left behind"
    );

    // Retrying with no cancel installs the very same archive.
    let out = archive::install(&bytes, store.path()).unwrap();
    assert_eq!(out.version, "0.1.0");
    assert_eq!(out.pack_id, "org.openlanguage.test-minimal");
}

/// The wrapper has to be exactly the old behavior: no hook, no cancel.
#[test]
fn install_is_install_with_cancel_that_never_fires() {
    let one = tempfile::tempdir().unwrap();
    let two = tempfile::tempdir().unwrap();
    let (bytes, sha) = archive::build(&fixture("valid-minimal")).unwrap();
    let plain = archive::install(&bytes, one.path()).unwrap();
    let wrapped = archive::install_with_cancel(&bytes, two.path(), &|| false).unwrap();
    assert_eq!(plain.pack_id, wrapped.pack_id);
    assert_eq!(plain.version, wrapped.version);
    assert_eq!(archive::hex_sha256(&bytes), sha);
    assert_eq!(
        fs::read(wrapped.directory.join("manifest.yaml")).unwrap(),
        fs::read(plain.directory.join("manifest.yaml")).unwrap()
    );
}

#[test]
fn install_rejects_path_traversal() {
    let store = tempfile::tempdir().unwrap();
    let mut zip = zip::ZipWriter::new(Cursor::new(Vec::new()));
    let opts = zip::write::SimpleFileOptions::default();
    let manifest = archive::ArchiveManifest {
        format: archive::FORMAT.into(),
        pack_id: "org.openlanguage.evil".into(),
        version: "0.1.0".into(),
        schema_version: "0.2".into(),
        files: vec![archive::FileEntry {
            path: "../escape.txt".into(),
            sha256: "x".into(),
            size: 1,
        }],
    };
    zip.start_file(archive::MANIFEST_ENTRY, opts).unwrap();
    zip.write_all(serde_json::to_vec(&manifest).unwrap().as_slice())
        .unwrap();
    zip.start_file("../escape.txt", opts).unwrap();
    zip.write_all(b"x").unwrap();
    let bytes = zip.finish().unwrap().into_inner();
    let err = archive::install(&bytes, store.path()).unwrap_err();
    assert!(err.to_string().contains("unsafe path"), "{err}");
    assert!(!store.path().join("../escape.txt").exists());
}

#[test]
fn install_rejects_hash_mismatch() {
    let store = tempfile::tempdir().unwrap();
    let pack_dir = tempfile::tempdir().unwrap();
    copy_pack(&fixture("valid-minimal"), pack_dir.path());
    let (bytes, _) = archive::build(pack_dir.path()).unwrap();

    // Tamper: flip one byte inside the archive's file payload while
    // keeping the manifest hashes. Rebuild the zip with altered content.
    let mut zip = zip::ZipArchive::new(Cursor::new(&bytes)).unwrap();
    let mut out = zip::ZipWriter::new(Cursor::new(Vec::new()));
    let opts = zip::write::SimpleFileOptions::default();
    for i in 0..zip.len() {
        let mut f = zip.by_index(i).unwrap();
        let name = f.name().unwrap().to_string();
        let mut data = Vec::new();
        std::io::Read::read_to_end(&mut f, &mut data).unwrap();
        if name == "lexicon/entries.jsonl" {
            data[0] = b'X'; // same length, different content
        }
        out.start_file(name.as_str(), opts).unwrap();
        out.write_all(&data).unwrap();
    }
    let tampered = out.finish().unwrap().into_inner();
    let err = archive::install(&tampered, store.path()).unwrap_err();
    assert!(err.to_string().contains("hash mismatch"), "{err}");
}

#[test]
fn install_rejects_decompression_bomb() {
    let store = tempfile::tempdir().unwrap();
    let big = vec![b'0'; 8 * 1024 * 1024]; // highly compressible
    let sha = {
        use sha2::{Digest, Sha256};
        let mut h = Sha256::new();
        h.update(&big);
        h.finalize()
            .iter()
            .map(|b| format!("{b:02x}"))
            .collect::<String>()
    };
    let manifest = archive::ArchiveManifest {
        format: archive::FORMAT.into(),
        pack_id: "org.openlanguage.bomb".into(),
        version: "0.1.0".into(),
        schema_version: "0.2".into(),
        files: vec![
            archive::FileEntry {
                path: "manifest.yaml".into(),
                sha256: sha.clone(),
                size: 10,
            },
            archive::FileEntry {
                path: "media/huge.bin".into(),
                sha256: sha,
                size: 10,
            },
        ],
    };
    let mut zip = zip::ZipWriter::new(Cursor::new(Vec::new()));
    let opts = zip::write::SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);
    zip.start_file(archive::MANIFEST_ENTRY, opts).unwrap();
    zip.write_all(serde_json::to_vec(&manifest).unwrap().as_slice())
        .unwrap();
    for name in ["manifest.yaml", "media/huge.bin"] {
        zip.start_file(name, opts).unwrap();
        zip.write_all(&big).unwrap();
    }
    let bytes = zip.finish().unwrap().into_inner();
    let err = archive::install(&bytes, store.path()).unwrap_err();
    assert!(err.to_string().contains("decompression bomb"), "{err}");
}

#[test]
fn install_rejects_unlisted_and_symlink_entries() {
    let store = tempfile::tempdir().unwrap();
    let pack_dir = tempfile::tempdir().unwrap();
    copy_pack(&fixture("valid-minimal"), pack_dir.path());
    let (bytes, _) = archive::build(pack_dir.path()).unwrap();

    // Rebuild with an extra unlisted entry.
    let mut zip = zip::ZipArchive::new(Cursor::new(&bytes)).unwrap();
    let mut out = zip::ZipWriter::new(Cursor::new(Vec::new()));
    let opts = zip::write::SimpleFileOptions::default();
    for i in 0..zip.len() {
        let mut f = zip.by_index(i).unwrap();
        let name = f.name().unwrap().to_string();
        let mut data = Vec::new();
        std::io::Read::read_to_end(&mut f, &mut data).unwrap();
        out.start_file(name.as_str(), opts).unwrap();
        out.write_all(&data).unwrap();
    }
    out.start_file("surprise.txt", opts).unwrap();
    std::io::Write::write_all(&mut out, b"nope").unwrap();
    let extra = out.finish().unwrap().into_inner();
    let err = archive::install(&extra, store.path()).unwrap_err();
    assert!(err.to_string().contains("unlisted entry"), "{err}");
}

#[test]
fn install_enforces_install_mode_gates() {
    let store = tempfile::tempdir().unwrap();
    // valid-scaffold-draft has declared unresolved refs + blocked license.
    let (bytes, _) = archive::build(&fixture("valid-scaffold-draft")).unwrap();
    let err = archive::install(&bytes, store.path()).unwrap_err();
    let msg = err.to_string();
    assert!(msg.contains("declared_unresolved_reference"), "{msg}");
    assert!(msg.contains("redistribution_blocked"), "{msg}");
}

/// sweep-manifest-bomb: `inspect`/`read_entry` must cap an entry on its
/// DECOMPRESSED size. The desktop caller caps only the compressed
/// archive bytes (1 GiB), so a tiny MANIFEST.json that inflates past
/// `MAX_ENTRY_RAW_BYTES` would otherwise be materialized whole.
#[test]
fn inspect_and_read_entry_reject_decompressed_bombs() {
    let big = vec![b'A'; 20 * 1024 * 1024]; // highly compressible
    let mut zip = zip::ZipWriter::new(Cursor::new(Vec::new()));
    let opts = zip::write::SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);
    zip.start_file(archive::MANIFEST_ENTRY, opts).unwrap();
    zip.write_all(&big).unwrap();
    zip.start_file("manifest.yaml", opts).unwrap();
    zip.write_all(&big).unwrap();
    let bytes = zip.finish().unwrap().into_inner();
    assert!(bytes.len() < 1024 * 1024, "bomb is tiny compressed");

    let err = archive::inspect(&bytes).unwrap_err();
    let msg = err.to_string();
    assert!(
        msg.contains(archive::MANIFEST_ENTRY) && msg.contains("inflates past"),
        "{msg}"
    );

    let err = archive::read_entry(&bytes, "manifest.yaml").unwrap_err();
    let msg = err.to_string();
    assert!(
        msg.contains("manifest.yaml") && msg.contains("inflates past"),
        "{msg}"
    );
}
