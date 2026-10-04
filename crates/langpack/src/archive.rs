//! Secure pack archives: deterministic build, hardened install, rollback
//! (PACK-004, docs/04 + docs/08).
//!
//! Archive format `lts-pack/1`: a zip with sorted entries, fixed
//! timestamps, a `MANIFEST.json` (pack identity + per-file SHA-256), and
//! the pack files verbatim. Install verifies every hash, rejects path
//! traversal, symlink entries, oversized files and decompression bombs
//! (written bytes exceeding the declared size), enforces install-mode
//! pack validation, and only then atomically swaps the store pointer.

use crate::pack::{Mode, Pack};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::BTreeSet;
use std::fs;
use std::io::{Cursor, Read, Write};
use std::path::{Component, Path, PathBuf};

pub const MANIFEST_ENTRY: &str = "MANIFEST.json";
pub const FORMAT: &str = "lts-pack/1";
pub const MAX_FILE_BYTES: u64 = 32 * 1024 * 1024;
pub const MAX_TOTAL_BYTES: u64 = 256 * 1024 * 1024;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct FileEntry {
    pub path: String,
    pub sha256: String,
    pub size: u64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ArchiveManifest {
    pub format: String,
    pub pack_id: String,
    pub version: String,
    pub schema_version: String,
    pub files: Vec<FileEntry>,
}

#[derive(Debug, thiserror::Error)]
pub enum ArchiveError {
    #[error("io: {0}")]
    Io(#[from] std::io::Error),
    #[error("zip: {0}")]
    Zip(#[from] zip::result::ZipError),
    #[error("invalid archive: {0}")]
    Invalid(String),
    #[error("pack rejected by install validation: {0}")]
    Validation(String),
}

pub fn hex_sha256(bytes: &[u8]) -> String {
    let mut h = Sha256::new();
    h.update(bytes);
    h.finalize().iter().map(|b| format!("{b:02x}")).collect()
}

/// Build a deterministic `lts-pack/1` archive from a pack directory.
/// Returns the archive bytes and their SHA-256.
pub fn build(dir: &Path) -> Result<(Vec<u8>, String), String> {
    let pack = Pack::load_dir(dir).map_err(|e| format!("cannot load pack: {e}"))?;
    let diags = pack.validate(Mode::Scaffold, None);
    let errors: Vec<_> = diags
        .iter()
        .filter(|d| d.severity == crate::Severity::Error)
        .collect();
    if !errors.is_empty() {
        return Err(format!(
            "pack has {} validation error(s); fix before build (first: {})",
            errors.len(),
            errors[0].message
        ));
    }
    let manifest = pack
        .manifest
        .as_ref()
        .ok_or_else(|| "pack has no manifest".to_string())?;
    let am = ArchiveManifest {
        format: FORMAT.to_string(),
        pack_id: manifest
            .get("pack_id")
            .and_then(serde_json::Value::as_str)
            .unwrap_or("")
            .to_string(),
        version: manifest
            .get("version")
            .and_then(serde_json::Value::as_str)
            .unwrap_or("")
            .to_string(),
        schema_version: pack.schema_version().to_string(),
        files: Vec::new(),
    };

    let mut files = Vec::new();
    crate::pack::collect_files(dir, dir, &mut files).map_err(|e| e.to_string())?;
    files.sort();
    let mut entries = Vec::new();
    for rel in &files {
        let bytes = fs::read(dir.join(rel)).map_err(|e| format!("read {rel}: {e}"))?;
        if bytes.len() as u64 > MAX_FILE_BYTES {
            return Err(format!("{rel} exceeds per-file limit"));
        }
        entries.push(FileEntry {
            path: rel.clone(),
            sha256: hex_sha256(&bytes),
            size: bytes.len() as u64,
        });
    }
    let mut am = am;
    am.files = entries;

    let mut zip = zip::ZipWriter::new(Cursor::new(Vec::new()));
    let opts = zip::write::SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated)
        .last_modified_time(zip::DateTime::default());
    zip.start_file(MANIFEST_ENTRY, opts)
        .map_err(|e| e.to_string())?;
    zip.write_all(
        serde_json::to_vec(&am)
            .map_err(|e| e.to_string())?
            .as_slice(),
    )
    .map_err(|e| e.to_string())?;
    for rel in &files {
        let bytes = fs::read(dir.join(rel)).map_err(|e| format!("read {rel}: {e}"))?;
        zip.start_file(rel.as_str(), opts)
            .map_err(|e| e.to_string())?;
        zip.write_all(&bytes).map_err(|e| e.to_string())?;
    }
    let bytes = zip.finish().map_err(|e| e.to_string())?.into_inner();
    let sha = hex_sha256(&bytes);
    Ok((bytes, sha))
}

/// Read the archive manifest without extracting anything.
pub fn inspect(bytes: &[u8]) -> Result<ArchiveManifest, ArchiveError> {
    let mut zip = zip::ZipArchive::new(Cursor::new(bytes))?;
    let mut buf = Vec::new();
    zip.by_name(MANIFEST_ENTRY)?.read_to_end(&mut buf)?;
    let am: ArchiveManifest = serde_json::from_slice(&buf)
        .map_err(|e| ArchiveError::Invalid(format!("bad MANIFEST.json: {e}")))?;
    if am.format != FORMAT {
        return Err(ArchiveError::Invalid(format!(
            "unsupported archive format {:?}",
            am.format
        )));
    }
    Ok(am)
}

/// Read a single named entry from the archive without extracting to disk.
pub fn read_entry(bytes: &[u8], name: &str) -> Result<Vec<u8>, ArchiveError> {
    let mut zip = zip::ZipArchive::new(Cursor::new(bytes))?;
    let mut buf = Vec::new();
    zip.by_name(name)?.read_to_end(&mut buf)?;
    Ok(buf)
}

/// Validate a zip entry name; None when unsafe (traversal, absolute,
/// backslash, drive letter, empty or dot components).
fn safe_rel(name: &str) -> Option<String> {
    if name.is_empty() || name.contains('\\') || name.contains(':') || name.starts_with('/') {
        return None;
    }
    let mut parts = Vec::new();
    for c in Path::new(name).components() {
        match c {
            Component::Normal(p) => parts.push(p.to_string_lossy().into_owned()),
            _ => return None,
        }
    }
    if parts.is_empty() {
        return None;
    }
    Some(parts.join("/"))
}

#[derive(Debug)]
pub struct InstallOutcome {
    pub pack_id: String,
    pub version: String,
    pub previous: Option<String>,
    pub directory: PathBuf,
}

/// Verify and install an archive into a pack store.
pub fn install(bytes: &[u8], store: &Path) -> Result<InstallOutcome, ArchiveError> {
    let am = inspect(bytes)?;
    let mut zip = zip::ZipArchive::new(Cursor::new(bytes))?;

    // Entry-level safety before any extraction.
    let mut total_declared = 0u64;
    for f in &am.files {
        if safe_rel(&f.path).is_none() {
            return Err(ArchiveError::Invalid(format!(
                "unsafe path in manifest: {:?}",
                f.path
            )));
        }
        if f.size > MAX_FILE_BYTES {
            return Err(ArchiveError::Invalid(format!(
                "{:?} exceeds per-file size limit",
                f.path
            )));
        }
        total_declared += f.size;
        if total_declared > MAX_TOTAL_BYTES {
            return Err(ArchiveError::Invalid(
                "archive exceeds total size limit".into(),
            ));
        }
    }
    let manifest_paths: BTreeSet<&str> = am.files.iter().map(|f| f.path.as_str()).collect();
    for i in 0..zip.len() {
        let name = zip.by_index(i)?.name().to_string();
        if name == MANIFEST_ENTRY {
            continue;
        }
        if safe_rel(&name).is_none() {
            return Err(ArchiveError::Invalid(format!(
                "unsafe path in archive: {name:?}"
            )));
        }
        if !manifest_paths.contains(name.as_str()) {
            return Err(ArchiveError::Invalid(format!(
                "archive contains unlisted entry {name:?}"
            )));
        }
        if zip.by_index(i)?.unix_mode().map(|m| m & 0o170_000) == Some(0o120_000) {
            return Err(ArchiveError::Invalid(format!(
                "symlink entry not allowed: {name:?}"
            )));
        }
    }

    // Extract to a staging directory inside the store (same filesystem).
    fs::create_dir_all(store)?;
    let staging = tempfile::tempdir_in(store)?;
    for f in &am.files {
        let rel = safe_rel(&f.path).unwrap();
        let mut data = Vec::new();
        std::io::Read::take(zip.by_name(&f.path)?, f.size + 1).read_to_end(&mut data)?;
        if data.len() as u64 > f.size {
            return Err(ArchiveError::Invalid(format!(
                "decompression bomb: {:?} expanded to {} bytes, declared {}",
                f.path,
                data.len(),
                f.size
            )));
        }
        if hex_sha256(&data) != f.sha256 {
            return Err(ArchiveError::Invalid(format!(
                "hash mismatch for {:?}",
                f.path
            )));
        }
        let dest = staging.path().join(&rel);
        if let Some(parent) = dest.parent() {
            fs::create_dir_all(parent)?;
        }
        fs::write(&dest, &data)?;
    }

    // Install-mode gate on the extracted pack.
    let pack = Pack::load_dir(staging.path())?;
    let diags = pack.validate(Mode::Install, None);
    let errors: Vec<_> = diags
        .iter()
        .filter(|d| d.severity == crate::Severity::Error)
        .collect();
    if !errors.is_empty() {
        let detail = errors
            .iter()
            .take(5)
            .map(|d| format!("{}: {}", d.code, d.message))
            .collect::<Vec<_>>()
            .join("; ");
        return Err(ArchiveError::Validation(format!(
            "{} error(s) — {detail}",
            errors.len()
        )));
    }
    let m = pack
        .manifest
        .as_ref()
        .ok_or_else(|| ArchiveError::Invalid("extracted pack lost its manifest".into()))?;
    let pack_id = m
        .get("pack_id")
        .and_then(serde_json::Value::as_str)
        .unwrap_or("")
        .to_string();
    let version = m
        .get("version")
        .and_then(serde_json::Value::as_str)
        .unwrap_or("")
        .to_string();
    if pack_id != am.pack_id || version != am.version {
        return Err(ArchiveError::Invalid(format!(
            "archive manifest identity {}/{version} disagrees with pack manifest {pack_id}/{}",
            am.pack_id,
            m.get("version")
                .and_then(serde_json::Value::as_str)
                .unwrap_or("?")
        )));
    }

    let pack_dir = store.join(&pack_id);
    fs::create_dir_all(&pack_dir)?;
    let current_file = pack_dir.join("current");
    let previous = fs::read_to_string(&current_file)
        .ok()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());
    let dest = pack_dir.join(&version);
    if dest.exists() {
        fs::remove_dir_all(&dest)?;
    }
    fs::rename(staging.keep(), &dest)?;
    write_current(&current_file, &version)?;
    Ok(InstallOutcome {
        pack_id,
        version,
        previous,
        directory: dest,
    })
}

fn write_current(current_file: &Path, version: &str) -> std::io::Result<()> {
    let tmp = current_file.with_extension("current.tmp");
    fs::write(&tmp, format!("{version}\n"))?;
    fs::rename(&tmp, current_file)
}

/// Point `current` at another installed version (highest other semver by
/// default, or `to` when given). Returns the new current version.
pub fn rollback(pack_id: &str, store: &Path, to: Option<&str>) -> Result<String, ArchiveError> {
    let pack_dir = store.join(pack_id);
    if !pack_dir.is_dir() {
        return Err(ArchiveError::Invalid(format!(
            "no installed pack {pack_id:?}"
        )));
    }
    let current_file = pack_dir.join("current");
    let current = fs::read_to_string(&current_file)
        .ok()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());
    let mut versions: Vec<semver::Version> = Vec::new();
    let mut names: Vec<String> = Vec::new();
    for entry in fs::read_dir(&pack_dir)? {
        let name = entry?.file_name().to_string_lossy().into_owned();
        if let Ok(v) = semver::Version::parse(&name) {
            if pack_dir.join(&name).is_dir() {
                versions.push(v);
                names.push(name);
            }
        }
    }
    let chosen = if let Some(to) = to {
        if !names.iter().any(|n| n == to) {
            return Err(ArchiveError::Invalid(format!(
                "version {to:?} is not installed for {pack_id:?}"
            )));
        }
        to.to_string()
    } else {
        let mut candidates: Vec<(semver::Version, String)> = versions
            .into_iter()
            .zip(names)
            .filter(|(_v, n)| Some(n) != current.as_ref())
            .collect();
        candidates.sort_by(|a, b| b.0.cmp(&a.0));
        candidates.first().map(|(_, n)| n.clone()).ok_or_else(|| {
            ArchiveError::Invalid(format!(
                "no other installed version to roll back to for {pack_id:?}"
            ))
        })?
    };
    write_current(&current_file, &chosen)?;
    Ok(chosen)
}

/// Installed `current` version for a pack, if any.
pub fn current_version(pack_id: &str, store: &Path) -> Option<String> {
    fs::read_to_string(store.join(pack_id).join("current"))
        .ok()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
}
