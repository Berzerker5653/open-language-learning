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

use crate::progress::Progress;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs;
use std::io::Read;
use std::io::Write;
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
    /// `"unpublished"` when this build lists a payload it cannot deliver
    /// because the release asset has not been staged (ADR-0009). Absent means
    /// the payload is offered for download.
    #[serde(default)]
    pub availability: Option<String>,
    /// What the payload is FOR: `"recognition"` (learner's speech -> text)
    /// or `"synthesis"` (text -> spoken voice). The onboarding start gate
    /// needs only recognition present; a missing synthesis payload degrades
    /// speech activities to honest text-only feedback, it must never block
    /// a learner who can already speak to the app.
    #[serde(default)]
    pub role: Option<String>,
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
    pub size_bytes: u64,
    /// False when the catalog lists a payload this build cannot deliver; the
    /// UI must not offer a download button for it.
    pub installable: bool,
    /// Carried through from the catalog: see `ModelEntry::role`.
    pub role: Option<String>,
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

/// What the last full verification observed about the installed files
/// (K-74). Stored next to `installed.json` as `verified.json`.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
struct ProbeEntry {
    path: String,
    size_bytes: u64,
    mtime_secs: u64,
    mtime_nanos: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct VerifyProbe {
    checked_at_unix: u64,
    entries: Vec<ProbeEntry>,
}

/// Probe the filesystem reports right now for every file the install
/// record lists (payload files plus zip members, which the extract step
/// recorded because the catalog cannot pin them).
fn probe_now(dir: &Path) -> Result<Vec<ProbeEntry>, String> {
    let raw = fs::read_to_string(dir.join("installed.json"))
        .map_err(|e| format!("installed model record unreadable: {e}"))?;
    let record: InstalledRecord =
        serde_json::from_str(&raw).map_err(|e| format!("installed model record invalid: {e}"))?;
    let mut out = Vec::new();
    for path in record
        .files
        .iter()
        .filter(|f| !f.dir)
        .map(|f| f.path.as_str())
        .chain(record.extracted.iter().map(|h| h.path.as_str()))
    {
        let md =
            fs::metadata(dir.join(path)).map_err(|_| format!("recorded file {path} is gone"))?;
        let mtime = md
            .modified()
            .map_err(|e| format!("recorded file {path} has no mtime: {e}"))?;
        let since = mtime
            .duration_since(std::time::UNIX_EPOCH)
            .map_err(|e| format!("recorded file {path} has a pre-epoch mtime: {e}"))?;
        out.push(ProbeEntry {
            path: path.to_string(),
            size_bytes: md.len(),
            mtime_secs: since.as_secs(),
            mtime_nanos: since.subsec_nanos(),
        });
    }
    Ok(out)
}

fn write_probe(dir: &Path) {
    if let Ok(entries) = probe_now(dir) {
        let probe = VerifyProbe {
            checked_at_unix: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_secs())
                .unwrap_or(0),
            entries,
        };
        if let Ok(raw) = serde_json::to_string(&probe) {
            let _ = fs::write(dir.join("verified.json"), raw);
        }
    }
}

/// Is this model installed and intact — without re-hashing every byte on
/// every read (K-74, found when opening the Languages tab next to the
/// 466 MB whisper model froze the UI). The previous full verification is
/// trusted only while its probe still matches the filesystem: every
/// recorded path exists with the same size and mtime. Any drift re-runs
/// the full checksum verification, which refreshes the probe on success.
/// Corruption that preserves size AND mtime exactly is outside this
/// fast path; `verify_installed` remains the explicit full check and runs
/// after every install.
fn verify_cached(data: &Path, entry: &ModelEntry) -> bool {
    let dir = model_dir(data, entry);
    if !dir.join("installed.json").exists() {
        return false;
    }
    let now = match probe_now(&dir) {
        Ok(entries) if !entries.is_empty() => entries,
        _ => return false,
    };
    if let Ok(raw) = fs::read_to_string(dir.join("verified.json")) {
        if let Ok(probe) = serde_json::from_str::<VerifyProbe>(&raw) {
            if probe.entries == now {
                return true;
            }
        }
    }
    if verify_installed(data, entry).unwrap_or(false) {
        write_probe(&dir);
        return true;
    }
    false
}

pub fn model_status(data: &Path) -> Vec<ModelStatus> {
    load_catalog()
        .models
        .into_iter()
        .map(|m| {
            // Installed only if the record exists and the cached
            // verification is still trusted (K-74); drift re-hashes and
            // corruption reads as missing (K-52 intent preserved).
            let installed = verify_cached(data, &m);
            let size_bytes = m.files.iter().map(|f| f.size_bytes).sum();
            // Computed before the move below: the entry is consumed field by
            // field while building the status.
            let can_install = installable(&m);
            ModelStatus {
                installed,
                size_bytes,
                id: m.id,
                version: m.version,
                runtime: m.runtime,
                role: m.role,
                tier: m.tier,
                license_code: m.license_code,
                license_model: m.license_model,
                installable: can_install,
            }
        })
        .collect()
}

/// Can this payload actually be fetched? A catalog entry that is explicitly
/// unpublished, or whose URL is still the staging placeholder, must never be
/// offered: the user would spend a download slot on a DNS failure.
pub fn installable(entry: &ModelEntry) -> bool {
    if entry.availability.as_deref() == Some("unpublished") {
        return false;
    }
    entry
        .files
        .iter()
        .all(|f| !f.url.contains("PENDING-RELEASE-URL") && !f.url.is_empty())
}

/// Install one model streamed to disk by `fetch(file, part_path, on_chunk)`,
/// reporting the stage it is in (K-62) and, during a fetch, the fraction of
/// bytes actually received (K-73). Files stream to a `*.part` file in a
/// staging directory, every checksum is verified from the streamed file
/// (never from a whole-file memory buffer), then the directory is moved into
/// place atomically; any failure removes the staging directory, leaving the
/// model `missing` (retry-safe). The percentage is one the app can actually
/// know: the catalog pins every file's size, and `on_chunk` fires with the
/// cumulative bytes the transport has delivered, so the fraction is measured,
/// not estimated.
pub fn install_model_files_report(
    data: &Path,
    entry: &ModelEntry,
    now_rfc: &str,
    fetch: impl Fn(&ModelFile, &Path, &mut dyn FnMut(u64)) -> Result<(), String>,
    mut report: impl FnMut(&Progress),
) -> Result<InstalledRecord, String> {
    if !installable(entry) {
        return Err(format!(
            "{} {} is not published in this build; nothing was downloaded",
            entry.id, entry.version
        ));
    }
    let total_bytes: u64 = entry.files.iter().map(|f| f.size_bytes).sum();
    let mut fetched_bytes: u64 = 0;
    let mut last_percent: Option<u8> = None;
    let dest = model_dir(data, entry);
    let staging = dest.with_extension("staging");
    let _ = fs::remove_dir_all(&staging);
    fs::create_dir_all(&staging).map_err(|e| e.to_string())?;

    let result = (|| -> Result<InstalledRecord, String> {
        let mut extracted: Vec<HashedFile> = Vec::new();
        for f in &entry.files {
            // One event per stage-entry, plus one whenever the received
            // fraction actually moves — never a duplicate, never a guess.
            let start = percent_done(fetched_bytes, total_bytes);
            if last_percent != Some(start) {
                report(&Progress::with_percent(
                    "install-model",
                    &entry.id,
                    "fetch",
                    start,
                ));
                last_percent = Some(start);
            }
            let part = staging.join(format!("{}.part", f.path));
            if let Some(parent) = part.parent() {
                fs::create_dir_all(parent).map_err(|e| e.to_string())?;
            }
            fetch(f, &part, &mut |got| {
                let p = percent_done(fetched_bytes.saturating_add(got), total_bytes);
                if last_percent != Some(p) {
                    report(&Progress::with_percent(
                        "install-model",
                        &entry.id,
                        "fetch",
                        p,
                    ));
                    last_percent = Some(p);
                }
            })?;
            let meta = fs::metadata(&part).map_err(|e| format!("{} after fetch: {e}", f.path))?;
            if meta.len() != f.size_bytes {
                return Err(format!(
                    "size mismatch for {}: expected {} got {}",
                    f.path,
                    f.size_bytes,
                    meta.len()
                ));
            }
            let got = stream_sha256(&part)?;
            if got != f.sha256 {
                return Err(format!(
                    "checksum mismatch for {}: expected {} got {}",
                    f.path, f.sha256, got
                ));
            }
            if f.dir {
                extracted.extend(extract_dir_entry(&staging, f, &part)?);
                fs::remove_file(&part).map_err(|e| e.to_string())?;
            } else {
                fs::rename(&part, staging.join(&f.path)).map_err(|e| e.to_string())?;
            }
            fetched_bytes += f.size_bytes;
        }
        report(&Progress::stage("install-model", &entry.id, "record"));
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
        // Every byte was checksummed on the way in — record that fact so
        // the next status read does not hash the payload again (K-74).
        write_probe(&dest);
        Ok(record)
    })();

    if result.is_err() {
        let _ = fs::remove_dir_all(&staging);
    }
    result
}

/// Completed fraction of the install, 0-100. Empty manifests report 0 rather
/// than dividing by zero.
fn percent_done(done: u64, total: u64) -> u8 {
    if total == 0 {
        return 0;
    }
    ((done.min(total) * 100) / total).min(100) as u8
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
    archive: &Path,
) -> Result<Vec<HashedFile>, String> {
    let file = fs::File::open(archive).map_err(|e| format!("{}: {e}", f.path))?;
    let mut archive =
        zip::ZipArchive::new(file).map_err(|e| format!("{}: invalid zip: {e}", f.path))?;
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
        // Members stream to disk and hash chunk-wise: a hundreds-of-MB
        // member never lands as one in-memory Vec (K-73).
        let mut out_file = fs::File::create(&out).map_err(|e| e.to_string())?;
        let mut hasher = Sha256::new();
        let mut buf = [0u8; 1 << 16];
        let mut written = 0u64;
        loop {
            let n = member.read(&mut buf).map_err(|e| e.to_string())?;
            if n == 0 {
                break;
            }
            written += n as u64;
            total += n as u64;
            if total > cap {
                return Err(format!(
                    "{}: extracted size exceeds 10x pinned archive size",
                    f.path
                ));
            }
            hasher.update(&buf[..n]);
            out_file.write_all(&buf[..n]).map_err(|e| e.to_string())?;
        }
        manifest.push(HashedFile {
            path: format!("{}/{}", f.path, name.to_string_lossy()),
            sha256: format!("{:x}", hasher.finalize()),
            size_bytes: written,
        });
        #[cfg(unix)]
        if let Some(mode) = member.unix_mode() {
            use std::os::unix::fs::PermissionsExt;
            fs::set_permissions(&out, fs::Permissions::from_mode(mode & 0o7777))
                .map_err(|e| e.to_string())?;
        }
    }
    Ok(manifest)
}

/// SHA-256 of a file, read in chunks — never a whole-file buffer.
fn stream_sha256(path: &Path) -> Result<String, String> {
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
    Ok(format!("{:x}", hasher.finalize()))
}

fn hash_matches(path: &Path, want: &str) -> Result<bool, String> {
    Ok(stream_sha256(path)? == want)
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

/// The production fetch: stream the payload into `dest` while reporting
/// cumulative received bytes through `on_progress` (K-73). The pinned size
/// caps the stream, and nothing about the fraction is guessed: every percent
/// comes from bytes the transport actually delivered.
pub fn stream_download(
    f: &ModelFile,
    dest: &Path,
    on_progress: &mut dyn FnMut(u64),
) -> Result<(), String> {
    let resp = ureq::get(&f.url)
        .call()
        .map_err(|e| format!("download {}: {e}", f.url))?;
    let mut out = fs::File::create(dest).map_err(|e| format!("{}: {e}", f.path))?;
    let mut reader = resp.into_reader();
    let mut got = 0u64;
    let mut buf = [0u8; 1 << 16];
    loop {
        let n = reader
            .read(&mut buf)
            .map_err(|e| format!("read {}: {e}", f.url))?;
        if n == 0 {
            break;
        }
        got += n as u64;
        if got > f.size_bytes {
            return Err(format!("download exceeded pinned size for {}", f.path));
        }
        out.write_all(&buf[..n])
            .map_err(|e| format!("{}: {e}", f.path))?;
        on_progress(got);
    }
    Ok(())
}

/// Device-level choice of which ASR/pronunciation model to use. Models are
/// installed once per device, so this is device config, NOT per-profile learner
/// data. `"off"` disables speech recognition/alignment entirely — the
/// privacy-first default: the base app bundles zero models and speaking stays
/// "not assessed" until the user opts in to a model (docs/08 minimization;
/// user control, docs/01).
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SpeechPref {
    /// `"off"` or a catalog model id whose runtime is `whisper.cpp`.
    pub asr_model: String,
}

impl Default for SpeechPref {
    fn default() -> Self {
        Self {
            asr_model: "off".into(),
        }
    }
}

fn speech_pref_path(data: &Path) -> PathBuf {
    data.join("speech.json")
}

pub fn load_speech_pref(data: &Path) -> SpeechPref {
    fs::read_to_string(speech_pref_path(data))
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

/// Persist the choice, validating it is `"off"` or a whisper.cpp catalog model.
pub fn save_speech_pref(data: &Path, pref: &SpeechPref) -> Result<(), String> {
    if pref.asr_model != "off" {
        let known = load_catalog()
            .models
            .iter()
            .any(|m| m.id == pref.asr_model && m.runtime == "whisper.cpp");
        if !known {
            return Err(format!(
                "unknown or non-whisper speech model: {}",
                pref.asr_model
            ));
        }
    }
    let json = serde_json::to_string_pretty(pref).map_err(|e| e.to_string())?;
    fs::write(speech_pref_path(data), json).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Progress is not what most of these tests are about, but the reporter
    /// parameter is how every production install runs: one entry point, no
    /// silent second path.
    fn silent() -> impl FnMut(&Progress) {
        |_| {}
    }

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
            availability: None,
            role: Some("recognition".into()),
        }
    }

    /// Test fetch that writes a fixed payload to the part path and reports
    /// the whole length in one chunk (the K-62 test covers chunk stepping).
    fn put_bytes(
        payload: &'static [u8],
    ) -> impl Fn(&ModelFile, &Path, &mut dyn FnMut(u64)) -> Result<(), String> {
        move |_, dest, on_chunk| {
            fs::write(dest, payload).map_err(|e| e.to_string())?;
            on_chunk(payload.len() as u64);
            Ok(())
        }
    }

    fn put_vec(
        payload: Vec<u8>,
    ) -> impl Fn(&ModelFile, &Path, &mut dyn FnMut(u64)) -> Result<(), String> {
        move |_, dest, on_chunk| {
            fs::write(dest, &payload).map_err(|e| e.to_string())?;
            on_chunk(payload.len() as u64);
            Ok(())
        }
    }

    #[test]
    fn install_is_checksummed_atomic_and_removable() {
        let tmp = tempfile::tempdir().unwrap();
        let data = tmp.path();
        let e = test_entry();

        // Bad bytes: checksum error, and NO partial install (recoverable).
        let err = install_model_files_report(
            data,
            &e,
            "2026-10-03T00:00:00Z",
            put_bytes(b"wrong!"),
            silent(),
        );
        assert!(err.is_err());
        assert!(!model_dir(data, &e).exists());

        // Retry with correct bytes succeeds; record carries version+license.
        let rec = install_model_files_report(
            data,
            &e,
            "2026-10-03T00:00:00Z",
            put_bytes(b"hello"),
            silent(),
        )
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
        let err = install_model_files_report(
            data,
            &e,
            "2026-10-04T00:00:00Z",
            |_, _dest, _on| Err("network down".into()),
            silent(),
        )
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
            availability: None,
            role: Some("recognition".into()),
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

        let rec = install_model_files_report(
            data,
            &e,
            "2026-10-04T00:00:00Z",
            put_vec(archive.clone()),
            silent(),
        )
        .unwrap();
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
            install_model_files_report(
                data,
                &e2,
                "2026-10-04T00:00:00Z",
                put_vec(evil.clone()),
                silent(),
            )
            .is_err()
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
            install_model_files_report(
                data,
                &e3,
                "2026-10-04T00:00:00Z",
                put_vec(link.clone()),
                silent(),
            )
            .is_err()
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

    #[test]
    fn speech_pref_defaults_off_and_validates_selection() {
        let tmp = tempfile::tempdir().unwrap();
        let data = tmp.path();
        // Privacy-first default: no speech model until the user opts in.
        assert_eq!(load_speech_pref(data).asr_model, "off");
        // A whisper.cpp catalog model is accepted and round-trips.
        save_speech_pref(
            data,
            &SpeechPref {
                asr_model: "org.openlanguage.speech.whisper-ggml-base".into(),
            },
        )
        .unwrap();
        assert_eq!(
            load_speech_pref(data).asr_model,
            "org.openlanguage.speech.whisper-ggml-base"
        );
        // Turning speech back off is always allowed.
        save_speech_pref(
            data,
            &SpeechPref {
                asr_model: "off".into(),
            },
        )
        .unwrap();
        assert_eq!(load_speech_pref(data).asr_model, "off");
        // Unknown or non-whisper ids are rejected (no silent typo -> dead aligner).
        assert!(
            save_speech_pref(
                data,
                &SpeechPref {
                    asr_model: "org.openlanguage.speech.nope".into()
                }
            )
            .is_err()
        );
        assert!(
            save_speech_pref(
                data,
                &SpeechPref {
                    asr_model: "org.openlanguage.speech.kokoro-multi-lang".into()
                }
            )
            .is_err()
        );
    }

    /// D5: the catalog ships two TTS payloads whose release assets have never
    /// been staged (ADR-0009). They must read as not installable, every other
    /// entry must carry a real URL, and the installer must refuse the
    /// unpublished ones before opening a connection.
    #[test]
    fn unpublished_payloads_are_never_offered_or_fetched() {
        let catalog = load_catalog();
        let blocked: Vec<&str> = catalog
            .models
            .iter()
            .filter(|m| !installable(m))
            .map(|m| m.id.as_str())
            .collect();
        assert_eq!(
            blocked,
            vec![
                "org.openlanguage.speech.kokoro-multi-lang",
                "org.openlanguage.speech.sherpa-onnx-runtime"
            ],
            "exactly the two unstaged payloads may be blocked"
        );
        for m in catalog.models.iter().filter(|m| installable(m)) {
            for f in &m.files {
                assert!(
                    f.url.starts_with("https://huggingface.co/"),
                    "{} points at {}",
                    m.id,
                    f.url
                );
            }
        }
        let entry = catalog
            .models
            .iter()
            .find(|m| m.id == "org.openlanguage.speech.kokoro-multi-lang")
            .unwrap();
        let tmp = tempfile::tempdir().unwrap();
        let fetched = std::sync::atomic::AtomicUsize::new(0);
        let err = install_model_files_report(
            tmp.path(),
            entry,
            "2026-10-08T00:00:00Z",
            |_, _dest, _on| {
                fetched.fetch_add(1, std::sync::atomic::Ordering::SeqCst);
                Ok(())
            },
            silent(),
        )
        .unwrap_err();
        assert!(
            err.contains("not published"),
            "refusal must name the reason: {err}"
        );
        assert!(
            !model_dir(tmp.path(), entry).exists(),
            "a refused install must leave nothing behind"
        );
    }

    /// The staging placeholder URL is refused even without the availability
    /// marker, so a catalog edit that drops the marker cannot resurrect it.
    #[test]
    fn a_placeholder_url_is_refused_whatever_the_marker_says() {
        let mut e = test_entry();
        e.files[0].url = "https://PENDING-RELEASE-URL.example.invalid/f.bin".into();
        assert!(!installable(&e));
        e.availability = Some("published".into());
        assert!(
            !installable(&e),
            "the sentinel URL check must not depend on the marker"
        );
        let tmp = tempfile::tempdir().unwrap();
        let fetched = std::sync::atomic::AtomicUsize::new(0);
        assert!(
            install_model_files_report(
                tmp.path(),
                &e,
                "2026-10-08T00:00:00Z",
                |_, _dest, _on| {
                    fetched.fetch_add(1, std::sync::atomic::Ordering::SeqCst);
                    Ok(())
                },
                silent(),
            )
            .is_err()
        );
        assert_eq!(fetched.load(std::sync::atomic::Ordering::SeqCst), 0);
    }

    /// K-62/K-73: a model install is the longest wait in the app, and the
    /// catalog pins every file's size, so a percentage is knowable here. It
    /// moves on bytes the transport has ACTUALLY delivered (received), never
    /// on guesses about work in flight, and never twice for the same value.
    #[test]
    fn a_model_install_reports_received_bytes_and_nothing_invented() {
        let tmp = tempfile::tempdir().unwrap();
        let mut e = test_entry();
        let mut h = Sha256::new();
        h.update(b"world");
        e.files.push(ModelFile {
            path: "g.bin".into(),
            url: "unused".into(),
            sha256: format!("{:x}", h.finalize()),
            size_bytes: 5,
            dir: false,
        });
        let mut seen: Vec<(&'static str, Option<u8>)> = Vec::new();
        install_model_files_report(
            tmp.path(),
            &e,
            "2026-10-08T00:00:00Z",
            |f, dest, on_chunk| {
                let payload: &[u8] = if f.path == "f.bin" {
                    b"hello"
                } else {
                    b"world"
                };
                let mut out = fs::File::create(dest).map_err(|e| e.to_string())?;
                // Two chunks per file so in-flight movement is observable.
                out.write_all(&payload[..3]).map_err(|e| e.to_string())?;
                on_chunk(3);
                out.write_all(&payload[3..]).map_err(|e| e.to_string())?;
                on_chunk(payload.len() as u64);
                Ok(())
            },
            &mut |p: &Progress| seen.push((p.stage, p.percent)),
        )
        .unwrap();
        assert_eq!(
            seen,
            vec![
                ("fetch", Some(0)),
                ("fetch", Some(30)),
                ("fetch", Some(50)),
                ("fetch", Some(80)),
                ("fetch", Some(100)),
                ("record", None),
            ]
        );
        assert!(model_dir(tmp.path(), &e).join("g.bin").exists());
    }

    /// K-74: status reads trust the last full verification only while a
    /// persisted probe (path + size + mtime for every recorded file) still
    /// matches the filesystem. Content drift — even same-size corruption —
    /// re-runs the full checksum pass, which is how the K-52 guarantee
    /// survives caching.
    #[test]
    fn model_status_stops_rehashing_until_files_actually_change() {
        let tmp = tempfile::tempdir().unwrap();
        let data = tmp.path();
        let e = test_entry();
        install_model_files_report(
            data,
            &e,
            "2026-10-05T00:00:00Z",
            put_bytes(b"hello"),
            silent(),
        )
        .expect("install");
        assert!(verify_cached(data, &e), "a fresh install verifies");
        // Same bytes rewritten: mtime drifts, the probe goes stale, the
        // full checksum pass re-runs, passes, and refreshes the probe.
        fs::write(model_dir(data, &e).join("f.bin"), b"hello").expect("rewrite");
        assert!(
            verify_cached(data, &e),
            "unchanged content re-verifies after a cosmetic touch"
        );
        fs::write(model_dir(data, &e).join("f.bin"), b"whyz").expect("corrupt");
        assert!(
            !verify_cached(data, &e),
            "same-size corruption defeats the probe and reads as missing"
        );
    }
}
