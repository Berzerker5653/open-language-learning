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
            let out = staging.join(&f.path);
            if let Some(parent) = out.parent() {
                fs::create_dir_all(parent).map_err(|e| e.to_string())?;
            }
            fs::write(&out, &bytes).map_err(|e| e.to_string())?;
        }
        let record = InstalledRecord {
            id: entry.id.clone(),
            version: entry.version.clone(),
            runtime: entry.runtime.clone(),
            license_code: entry.license_code.clone(),
            license_model: entry.license_model.clone(),
            files: entry.files.clone(),
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

/// Verify an installed model still matches its recorded checksums
/// (guards against silent corruption; mismatch => treat as missing).
pub fn verify_installed(data: &Path, entry: &ModelEntry) -> Result<bool, String> {
    let dir = model_dir(data, entry);
    let record: InstalledRecord = serde_json::from_str(
        &fs::read_to_string(dir.join("installed.json")).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;
    for f in &record.files {
        let mut file = fs::File::open(dir.join(&f.path)).map_err(|e| e.to_string())?;
        let mut hasher = Sha256::new();
        let mut buf = [0u8; 1 << 16];
        loop {
            let n = file.read(&mut buf).map_err(|e| e.to_string())?;
            if n == 0 {
                break;
            }
            hasher.update(&buf[..n]);
        }
        if format!("{:x}", hasher.finalize()) != f.sha256 {
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
