//! Machine-measured pack-update timing (state/evidence/PACK-UPDATE-TIMING).
//!
//! Times the post-download half of what an installed user waits for when a
//! reference pack updates: SHA-256 verification of the archive bytes against
//! the pinned catalog hash, then `archive::install` into a fresh store, then
//! a re-install over the existing version (the upgrade path). Same public
//! API the desktop app uses (`install_pack_bytes_report` -> `install`).
//!
//! Ignored: needs a ~318 MB network-fetched fixture, so it is measurement
//! evidence, never a CI gate. Run it against a downloaded archive with:
//!   LTS_PERF_PACK_ARCHIVE=tmp/pack-timing/<pack>.lpk \
//!   LTS_PERF_STORE=tmp/pack-timing/store-<locale> \
//!   cargo test -p lts-langpack --test perf_install -- --ignored --nocapture

use lts_langpack::archive;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::Instant;

fn env_path(name: &str) -> PathBuf {
    let v = std::env::var(name).unwrap_or_else(|_| panic!("{name} must be set (see module docs)"));
    PathBuf::from(v)
}

/// The catalog row pinning this exact archive, matched by release-asset
/// filename. The test verifies against the same pinned sha256/size the
/// desktop app enforces in `validate_entry`.
struct CatalogPin {
    pack_id: String,
    version: String,
    sha256: String,
    size_bytes: u64,
}

fn catalog_pin(archive_path: &Path) -> CatalogPin {
    let catalog = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../catalog/packs.json");
    let doc: serde_json::Value = serde_json::from_slice(&fs::read(&catalog).unwrap())
        .expect("catalog/packs.json must parse");
    let name = archive_path
        .file_name()
        .and_then(|s| s.to_str())
        .expect("archive path must have a filename");
    let entry = doc["packs"]
        .as_array()
        .expect("catalog packs array")
        .iter()
        .find(|e| {
            e["url"]
                .as_str()
                .map(|u| u.rsplit('/').next() == Some(name))
                .unwrap_or(false)
        })
        .unwrap_or_else(|| panic!("no catalog row pins archive {name:?}"));
    CatalogPin {
        pack_id: entry["pack_id"].as_str().unwrap().to_string(),
        version: entry["version"].as_str().unwrap().to_string(),
        sha256: entry["sha256"].as_str().unwrap().to_string(),
        size_bytes: entry["size_bytes"].as_u64().unwrap(),
    }
}

fn report(label: &str, bytes: u64, t: Instant) {
    let secs = t.elapsed().as_secs_f64();
    eprintln!(
        "PERF {label}: {secs:.3} s ({:.1} MiB/s, {} bytes)",
        bytes as f64 / secs / (1 << 20) as f64,
        bytes
    );
}

// Ignored: 318 MB network-fetched fixture; never a CI gate. How to run: see
// the module docs above.
#[test]
#[ignore = "requires a ~318 MB network-fetched pack archive via LTS_PERF_PACK_ARCHIVE; measurement evidence, not a CI gate"]
fn pack_update_timing() {
    let archive_path = env_path("LTS_PERF_PACK_ARCHIVE");
    let store = env_path("LTS_PERF_STORE");
    let pin = catalog_pin(&archive_path);

    let t = Instant::now();
    let bytes = fs::read(&archive_path).expect("archive must exist; fetch it first");
    report("archive-read-from-disk", bytes.len() as u64, t);

    // The same guards `install_pack_bytes_report` applies before hashing.
    assert_eq!(bytes.len() as u64, pin.size_bytes, "size != catalog pin");

    let t = Instant::now();
    let sha = archive::hex_sha256(&bytes);
    report("sha256-verify", bytes.len() as u64, t);
    assert_eq!(sha, pin.sha256, "sha256 != catalog pin");

    let am = archive::inspect(&bytes).expect("archive must inspect");
    assert_eq!(am.pack_id, pin.pack_id);
    assert_eq!(am.version, pin.version);

    // (c) fresh store — exactly what a first install of the update pays.
    if store.exists() {
        fs::remove_dir_all(&store).unwrap();
    }
    let t = Instant::now();
    let out = archive::install(&bytes, &store).expect("install must succeed");
    report("install-fresh-store", bytes.len() as u64, t);
    assert_eq!(out.pack_id, pin.pack_id);
    assert_eq!(out.version, pin.version);
    assert!(out.previous.is_none(), "fresh store had a previous version");
    assert!(out.directory.exists());

    // (d) re-install over the existing version (the upgrade/replace case).
    let t = Instant::now();
    let out2 = archive::install(&bytes, &store).expect("re-install must succeed");
    report("install-over-existing", bytes.len() as u64, t);
    assert_eq!(out2.previous.as_deref(), Some(pin.version.as_str()));
    assert_eq!(out2.directory, out.directory);

    // Store ends up with the expected pack id/version.
    let current = fs::read_to_string(store.join(&pin.pack_id).join("current")).unwrap();
    assert_eq!(current.trim(), pin.version);
    assert_eq!(
        archive::current_version(&pin.pack_id, &store).as_deref(),
        Some(pin.version.as_str())
    );
}
