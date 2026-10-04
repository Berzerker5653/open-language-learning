//! SPEECH-003 model manager: versioned, checksummed, licensed,
//! removable speech models, downloaded on demand.
//!
//! Invariants:
//! - the base app never bundles models: `models/` starts empty and the
//!   core learning flow runs with zero installed models;
//! - installation is staged and checksum-verified: a mismatch or
//!   interrupted download leaves NO partial model (recoverable: the
//!   status returns to `missing` and retry is safe);
//! - every install records version, per-file checksums, and license in
//!   `installed.json` so trust never travels across versions
//!   (docs/17 "never carry trust forward").

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs;
use std::io::Read;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelFile {
    pub path: String,
    pub url: String,
    pub sha256: String,
    pub size_bytes: u64,
    /// TTS-002 (ADR-0009): when true, `url` is a zip archive and `path`
    /// is the directory it expands into. The archive hash pins every
    /// member (multi-file pin); extraction records per-member hashes so
    /// corruption of any member reads as missing.
    #[serde(default)]
    pub dir: bool,
}

/// One extracted member of a directory entry, hashed at install time.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HashedFile {
    pub path: String,
    pub sha256: String,
    pub size_bytes: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelEntry {
    pub id: String,
    pub version: String,
    pub runtime: String,
    pub tier: String,
    pub files: Vec<ModelFile>,
    pub license_code: String,
    pub license_model: String,
    pub source: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Catalog {
    pub catalog_version: String,
    #[serde(default)]
    pub note: String,
    pub models: Vec<ModelEntry>,
}

pub fn load_catalog() -> Catalog {
    serde_json::from_str(include_str!("../models/catalog.json"))
        .expect("bundled model catalog must be valid")
}

pub fn models_root(data: &Path) -> PathBuf {
    data.join("models")
}

pub(crate) fn model_dir(data: &Path, entry: &ModelEntry) -> PathBuf {
    models_root(data).join(&entry.id).join(&entry.version)
}

#[derive(Debug, Clone, Serialize)]
pub struct ModelStatus {
    pub id: String,
    pub version: String,
    pub runtime: String,
    pub tier: String,
    pub license_code: String,
    pub license_model: String,
    pub installed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstalledRecord {
    pub id: String,
    pub version: String,
    pub runtime: String,
    pub license_code: String,
    pub license_model: String,
    pub files: Vec<ModelFile>,
    #[serde(default)]
    pub extracted: Vec<HashedFile>,
    pub installed_at: String,
}

pub fn model_status(data: &Path) -> Vec<ModelStatus> {
    load_catalog()
        .models
        .into_iter()
        .map(|m| {
            // Installed only if the record exists AND files still match
            // their pinned checksums (corruption reads as missing).
            let installed = verify_installed(data, &m).unwrap_or(false);
            ModelStatus {
                installed,
                id: m.id,
                version: m.version,
                runtime: m.runtime,
                tier: m.tier,
                license_code: m.license_code,
                license_model: m.license_model,
            }
        })
        .collect()
}

/// Install one model from bytes produced by `fetch(file)`. Files are
/// written to a staging directory, every checksum verified, then the
/// directory is moved into place atomically. Any failure removes the
/// staging directory, leaving the model `missing` (retry-safe).
pub fn install_model_files(
    data: &Path,
    entry: &ModelEntry,
    now_rfc: &str,
    fetch: impl Fn(&ModelFile) -> Result<Vec<u8>, String>,
) -> Result<InstalledRecord, String> {
    let dest = model_dir(data, entry);
    let staging = dest.with_extension("staging");
    let _ = fs::remove_dir_all(&staging);
    fs::create_dir_all(&staging).map_err(|e| e.to_string())?;

    let result = (|| -> Result<InstalledRecord, String> {
        let mut extracted: Vec<HashedFile> = Vec::new();
        for f in &entry.files {
            let bytes = fetch(f)?;
            let mut hasher = Sha256::new();
            hasher.update(&bytes);
            let got = format!("{:x}", hasher.finalize());
            if got != f.sha256 {
                return Err(format!(
                    "checksum mismatch for {}: expected {} got {}",
                    f.path, f.sha256, got
                ));
            }
            if bytes.len() as u64 != f.size_bytes {
                return Err(format!(
                    "size mismatch for {}: expected {} got {}",
                    f.path,
                    f.size_bytes,
                    bytes.len()
                ));
            }
            if f.dir {
                extracted.extend(extract_dir_entry(&staging, f, &bytes)?);
            } else {
                let out = staging.join(&f.path);
                if let Some(parent) = out.parent() {
                    fs::create_dir_all(parent).map_err(|e| e.to_string())?;
                }
                fs::write(&out, &bytes).map_err(|e| e.to_string())?;
            }
        }
        let record = InstalledRecord {
            id: entry.id.clone(),
            version: entry.version.clone(),
            runtime: entry.runtime.clone(),
            license_code: entry.license_code.clone(),
            license_model: entry.license_model.clone(),
            files: entry.files.clone(),
            extracted,
            installed_at: now_rfc.to_string(),
        };
        fs::write(
            staging.join("installed.json"),
            serde_json::to_string_pretty(&record).map_err(|e| e.to_string())?,
        )
        .map_err(|e| e.to_string())?;
        if dest.exists() {
            fs::remove_dir_all(&dest).map_err(|e| e.to_string())?;
        }
        fs::create_dir_all(dest.parent().ok_or("model path has no parent")?)
            .map_err(|e| e.to_string())?;
        fs::rename(&staging, &dest).map_err(|e| e.to_string())?;
        Ok(record)
    })();

    if result.is_err() {
        let _ = fs::remove_dir_all(&staging);
    }
    result
}

/// Extract a directory entry's zip archive into `staging/<path>`.
/// Safety: member names must be relative and contained (no absolute
/// paths, no `..` traversal), symlinks are rejected, and the total
/// extracted size is capped at 10x the pinned archive size (zip-bomb
/// guard). Unix permission bits are preserved (the sherpa runtime
/// archive carries executable modes). Returns the per-member hash
/// manifest recorded in `installed.json` so later corruption of ANY
/// member reads as missing.
fn extract_dir_entry(
    staging: &Path,
    f: &ModelFile,
    bytes: &[u8],
) -> Result<Vec<HashedFile>, String> {
    let cursor = std::io::Cursor::new(bytes);
    let mut archive =
        zip::ZipArchive::new(cursor).map_err(|e| format!("{}: invalid zip: {e}", f.path))?;
    let dest = staging.join(&f.path);
    let cap = f.size_bytes.saturating_mul(10);
    let mut total = 0u64;
    let mut manifest = Vec::new();
    for i in 0..archive.len() {
        let mut member = archive.by_index(i).map_err(|e| e.to_string())?;
        let name = match member.enclosed_name() {
            Some(n) if !n.as_os_str().is_empty() => n,
            _ => return Err(format!("{}: unsafe archive member path", f.path)),
        };
        if member.is_dir() {
            fs::create_dir_all(dest.join(&name)).map_err(|e| e.to_string())?;
            continue;
        }
        if member.is_symlink() {
            return Err(format!(
                "{}: archive contains a symlink ({})",
                f.path,
                name.display()
            ));
        }
        let out = dest.join(&name);
        if let Some(parent) = out.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        let mut data = Vec::new();
        member.read_to_end(&mut data).map_err(|e| e.to_string())?;
        total += data.len() as u64;
        if total > cap {
            return Err(format!(
                "{}: extracted size exceeds 10x pinned archive size",
                f.path
            ));
        }
        let mut hasher = Sha256::new();
        hasher.update(&data);
        manifest.push(HashedFile {
            path: format!("{}/{}", f.path, name.to_string_lossy()),
            sha256: format!("{:x}", hasher.finalize()),
            size_bytes: data.len() as u64,
        });
        fs::write(&out, &data).map_err(|e| e.to_string())?;
        #[cfg(unix)]
        if let Some(mode) = member.unix_mode() {
            use std::os::unix::fs::PermissionsExt;
            fs::set_permissions(&out, fs::Permissions::from_mode(mode & 0o7777))
                .map_err(|e| e.to_string())?;
        }
    }
    Ok(manifest)
}

fn hash_matches(path: &Path, want: &str) -> Result<bool, String> {
    let mut file = fs::File::open(path).map_err(|e| e.to_string())?;
    let mut hasher = Sha256::new();
    let mut buf = [0u8; 1 << 16];
    loop {
        let n = file.read(&mut buf).map_err(|e| e.to_string())?;
        if n == 0 {
            break;
        }
        hasher.update(&buf[..n]);
    }
    Ok(format!("{:x}", hasher.finalize()) == want)
}

/// Verify an installed model still matches its recorded checksums
/// (guards against silent corruption; mismatch => treat as missing).
pub fn verify_installed(data: &Path, entry: &ModelEntry) -> Result<bool, String> {
    let dir = model_dir(data, entry);
    let record: InstalledRecord = serde_json::from_str(
        &fs::read_to_string(dir.join("installed.json")).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;
    for f in &record.files {
        if f.dir {
            // Directory entries keep no archive on disk; verify the
            // recorded per-member hashes instead.
            for h in &record.extracted {
                if !hash_matches(&dir.join(&h.path), &h.sha256)? {
                    return Ok(false);
                }
            }
            continue;
        }
        if !hash_matches(&dir.join(&f.path), &f.sha256)? {
            return Ok(false);
        }
    }
    Ok(true)
}

pub fn delete_model(data: &Path, entry: &ModelEntry) -> Result<(), String> {
    let dir = model_dir(data, entry);
    if dir.exists() {
        fs::remove_dir_all(&dir).map_err(|e| e.to_string())?;
    }
    Ok(())
}

pub fn download(f: &ModelFile) -> Result<Vec<u8>, String> {
    let resp = ureq::get(&f.url)
        .call()
        .map_err(|e| format!("download {}: {e}", f.url))?;
    let mut bytes = Vec::new();
    let mut reader = resp.into_reader();
    let mut buf = [0u8; 1 << 16];
    loop {
        let n = reader
            .read(&mut buf)
            .map_err(|e| format!("read {}: {e}", f.url))?;
        if n == 0 {
            break;
        }
        bytes.extend_from_slice(&buf[..n]);
        if bytes.len() as u64 > f.size_bytes {
            return Err(format!("download exceeded pinned size for {}", f.path));
        }
    }
    Ok(bytes)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_entry() -> ModelEntry {
        ModelEntry {
            id: "test.model".into(),
            version: "1.0.0".into(),
            runtime: "test".into(),
            tier: "development".into(),
            files: vec![ModelFile {
                path: "f.bin".into(),
                url: "unused".into(),
                // sha256("hello")
                sha256: "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824".into(),
                size_bytes: 5,
                dir: false,
            }],
            license_code: "MIT".into(),
            license_model: "test".into(),
            source: "test".into(),
        }
    }

    #[test]
    fn install_is_checksummed_atomic_and_removable() {
        let tmp = tempfile::tempdir().unwrap();
        let data = tmp.path();
        let e = test_entry();

        // Bad bytes: checksum error, and NO partial install (recoverable).
        let err = install_model_files(data, &e, "2026-10-03T00:00:00Z", |_| Ok(b"wrong!".to_vec()));
        assert!(err.is_err());
        assert!(!model_dir(data, &e).exists());

        // Retry with correct bytes succeeds; record carries version+license.
        let rec = install_model_files(data, &e, "2026-10-03T00:00:00Z", |_| Ok(b"hello".to_vec()))
            .unwrap();
        assert_eq!(rec.license_code, "MIT");
        assert_eq!(rec.version, "1.0.0");
        assert!(verify_installed(data, &e).unwrap());

        // Corruption is detectable.
        fs::write(model_dir(data, &e).join("f.bin"), b"corrupt").unwrap();
        assert!(!verify_installed(data, &e).unwrap());

        // Removable: status returns to missing.
        delete_model(data, &e).unwrap();
        assert!(!model_dir(data, &e).exists());
    }

    #[test]
    fn fetch_failure_leaves_no_partial_install() {
        let tmp = tempfile::tempdir().unwrap();
        let data = tmp.path();
        let e = test_entry();
        let err = install_model_files(data, &e, "2026-10-04T00:00:00Z", |_| {
            Err("network down".into())
        })
        .unwrap_err();
        assert!(err.contains("network down"));
        assert!(!model_dir(data, &e).exists());
        assert!(!model_dir(data, &e).with_extension("staging").exists());
    }

    fn zip_bytes(members: Vec<(&str, &[u8], u32)>) -> Vec<u8> {
        use std::io::Write;
        let mut buf = std::io::Cursor::new(Vec::new());
        {
            let mut w = zip::ZipWriter::new(&mut buf);
            for (name, data, mode) in members {
                let opts = zip::write::SimpleFileOptions::default().unix_permissions(mode);
                w.start_file(name, opts).unwrap();
                w.write_all(data).unwrap();
            }
            w.finish().unwrap();
        }
        buf.into_inner()
    }

    fn dir_entry(archive: &[u8]) -> ModelEntry {
        let mut hasher = Sha256::new();
        hasher.update(archive);
        ModelEntry {
            id: "test.dirmodel".into(),
            version: "1.0.0".into(),
            runtime: "test".into(),
            tier: "development".into(),
            files: vec![ModelFile {
                path: "payload".into(),
                url: "unused".into(),
                sha256: format!("{:x}", hasher.finalize()),
                size_bytes: archive.len() as u64,
                dir: true,
            }],
            license_code: "Apache-2.0".into(),
            license_model: "test".into(),
            source: "test".into(),
        }
    }

    #[test]
    fn directory_entry_installs_verifies_and_rejects_unsafe_archives() {
        let tmp = tempfile::tempdir().unwrap();
        let data = tmp.path();
        let archive = zip_bytes(vec![
            ("model.onnx", b"weights".as_slice(), 0o644),
            ("espeak-ng-data/index", b"idx".as_slice(), 0o644),
            ("bin/tool", b"#!/bin/sh".as_slice(), 0o755),
        ]);
        let e = dir_entry(&archive);

        let rec =
            install_model_files(data, &e, "2026-10-04T00:00:00Z", |_| Ok(archive.clone())).unwrap();
        assert_eq!(rec.extracted.len(), 3);
        let dir = model_dir(data, &e);
        assert!(dir.join("payload/espeak-ng-data/index").exists());
        // Executable modes survive extraction (runtime binaries must run).
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let mode = fs::metadata(dir.join("payload/bin/tool"))
                .unwrap()
                .permissions()
                .mode();
            assert_ne!(mode & 0o111, 0);
        }
        assert!(verify_installed(data, &e).unwrap());

        // Corruption of ANY member reads as missing.
        fs::write(dir.join("payload/espeak-ng-data/index"), b"tamper").unwrap();
        assert!(!verify_installed(data, &e).unwrap());

        // Path traversal rejected: nothing escapes the model dir and
        // staging is cleaned (same id as the install above, so check
        // the escaped path and the staging sibling, not the model dir).
        let evil = zip_bytes(vec![("../evil", b"x".as_slice(), 0o644)]);
        let e2 = dir_entry(&evil);
        assert!(
            install_model_files(data, &e2, "2026-10-04T00:00:00Z", |_| Ok(evil.clone())).is_err()
        );
        assert!(!data.join("evil").exists());
        assert!(!model_dir(data, &e).with_extension("staging").exists());

        // Symlinks rejected: no member created, staging cleaned.
        let mut lbuf = std::io::Cursor::new(Vec::new());
        {
            let mut w = zip::ZipWriter::new(&mut lbuf);
            w.add_symlink(
                "sneaky",
                "/etc/passwd",
                zip::write::SimpleFileOptions::default(),
            )
            .unwrap();
            w.finish().unwrap();
        }
        let link = lbuf.into_inner();
        let e3 = dir_entry(&link);
        assert!(
            install_model_files(data, &e3, "2026-10-04T00:00:00Z", |_| Ok(link.clone())).is_err()
        );
        assert!(!model_dir(data, &e).join("payload/sneaky").exists());
        assert!(!model_dir(data, &e).with_extension("staging").exists());
    }

    #[test]
    fn catalog_entries_are_pinned_and_licensed() {
        let c = load_catalog();
        assert!(!c.models.is_empty());
        for m in &c.models {
            assert!(!m.license_code.is_empty());
            assert!(!m.version.is_empty());
            for f in &m.files {
                assert_eq!(f.sha256.len(), 64, "{}", f.path);
                assert!(f.url.starts_with("https://"), "{}", f.path);
                assert!(f.size_bytes > 0);
            }
        }
    }
}
