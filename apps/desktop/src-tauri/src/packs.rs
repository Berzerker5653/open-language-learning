//! Community language-pack catalog: a small maintained index pointing to
//! versioned GitHub release assets, plus local import.
//!
//! Invariants:
//! - packs remain untrusted declarative data: every archive goes through
//!   the same `lts_langpack::archive::install` gate (format, path safety,
//!   size limits, per-file checksums, schema validation) as bundled packs;
//! - catalog entries pin exact URLs, SHA-256, and sizes; downloads are
//!   size-capped and checksum-verified BEFORE install, and the archive's
//!   own manifest must agree with the entry (no bait-and-switch);
//! - download hosts are allowlisted to GitHub release infrastructure, so
//!   a compromised catalog cannot point the app at arbitrary servers;
//! - installs are always recorded with trust_state "community": a
//!   catalog's claimed review status is displayed as a claim, never
//!   promoted to verified trust (docs/16 review gates are human-only);
//! - the last good catalog is cached, so browsing and reinstalling work
//!   offline after any successful fetch.

use base64::Engine as _;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs;
use std::io::Read;
use std::path::{Path, PathBuf};

const MAX_CATALOG_BYTES: u64 = 1 << 20;
/// GitHub release page redirects and the asset CDN it resolves to.
const ALLOWED_HOSTS: [&str; 2] = ["github.com", "objects.githubusercontent.com"];

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PackEntry {
    pub pack_id: String,
    pub version: String,
    pub display_name: String,
    pub locale: String,
    pub author: String,
    pub license: String,
    /// Claimed review posture from the catalog author: "community" or
    /// "reviewed". Displayed as a claim; never upgrades local trust.
    pub review_status: String,
    pub min_sdk_version: String,
    pub url: String,
    pub sha256: String,
    pub size_bytes: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PackCatalog {
    pub catalog_version: String,
    #[serde(default)]
    pub note: String,
    pub packs: Vec<PackEntry>,
}

#[derive(Debug, Clone, Serialize)]
pub struct CatalogView {
    pub pack_id: String,
    pub version: String,
    pub display_name: String,
    pub locale: String,
    pub author: String,
    pub license: String,
    pub review_status: String,
    pub min_sdk_version: String,
    pub size_bytes: u64,
    pub installed_version: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct InstalledPack {
    pub pack_id: String,
    pub version: String,
    pub display_name: String,
    pub locale: String,
    pub trust_state: String,
}

fn is_hex64(s: &str) -> bool {
    s.len() == 64 && s.bytes().all(|b| b.is_ascii_hexdigit())
}

/// Reverse-domain pack ids only; keeps ids out of path shape.
fn valid_pack_id(s: &str) -> bool {
    let parts: Vec<&str> = s.split('.').collect();
    parts.len() >= 3
        && parts
            .iter()
            .all(|p| !p.is_empty() && p.chars().all(|c| c.is_ascii_alphanumeric() || c == '-'))
}

pub fn validate_entry(e: &PackEntry) -> Result<(), String> {
    if !valid_pack_id(&e.pack_id) {
        return Err(format!("bad pack id {:?}", e.pack_id));
    }
    if e.version.is_empty() || e.display_name.is_empty() || e.author.is_empty() {
        return Err(format!("entry {} missing version/name/author", e.pack_id));
    }
    if !is_hex64(&e.sha256) {
        return Err(format!("entry {} sha256 not 64 hex chars", e.pack_id));
    }
    if e.size_bytes == 0 || e.size_bytes > lts_langpack::archive::MAX_TOTAL_BYTES {
        return Err(format!("entry {} size out of range", e.pack_id));
    }
    let url = url::Url::parse(&e.url).map_err(|_| format!("entry {} bad url", e.pack_id))?;
    if url.scheme() != "https" {
        return Err(format!("entry {} not https", e.pack_id));
    }
    let host = url.host_str().unwrap_or("");
    if !ALLOWED_HOSTS.contains(&host) {
        return Err(format!("entry {} host {} not allowlisted", e.pack_id, host));
    }
    if !matches!(e.review_status.as_str(), "community" | "reviewed") {
        return Err(format!("entry {} unknown review_status", e.pack_id));
    }
    Ok(())
}

fn cache_path(data: &Path) -> PathBuf {
    data.join("pack-catalog-cache.json")
}

fn write_cache(data: &Path, catalog: &PackCatalog) {
    let p = cache_path(data);
    let tmp = data.join("pack-catalog-cache.json.tmp");
    if let Ok(bytes) = serde_json::to_vec_pretty(catalog) {
        if fs::write(&tmp, &bytes).is_ok() {
            let _ = fs::rename(&tmp, p);
        }
    }
}

pub fn load_cache(data: &Path) -> Option<PackCatalog> {
    let bytes = fs::read(cache_path(data)).ok()?;
    serde_json::from_slice(&bytes).ok()
}

/// Fetch + validate the catalog. Ok(catalog) on success (cache updated);
/// Err carries a human-readable status for the UI.
pub fn fetch_catalog(url: &str) -> Result<PackCatalog, String> {
    let parsed = url::Url::parse(url).map_err(|_| "catalog url invalid")?;
    if parsed.scheme() != "https" {
        return Err("catalog url must be https".into());
    }
    let resp = ureq::get(url)
        .call()
        .map_err(|e| format!("catalog fetch failed: {e}"))?;
    let mut bytes = Vec::new();
    let mut reader = resp.into_reader();
    let mut buf = [0u8; 1 << 14];
    loop {
        let n = reader
            .read(&mut buf)
            .map_err(|e| format!("catalog read: {e}"))?;
        if n == 0 {
            break;
        }
        bytes.extend_from_slice(&buf[..n]);
        if bytes.len() as u64 > MAX_CATALOG_BYTES {
            return Err("catalog exceeds size limit".into());
        }
    }
    let catalog: PackCatalog =
        serde_json::from_slice(&bytes).map_err(|e| format!("catalog invalid: {e}"))?;
    for e in &catalog.packs {
        validate_entry(e)?;
    }
    Ok(catalog)
}

/// Catalog entries for the UI plus installed-version info and an honest
/// status string ("live", "cached", "no-catalog-url", "offline-no-cache").
pub fn catalog_view(data: &Path) -> (Vec<CatalogView>, String) {
    let url = std::env::var("LTS_PACK_CATALOG_URL").unwrap_or_default();
    let (catalog, status) = if url.is_empty() {
        let cached = load_cache(data);
        let status = if cached.is_some() {
            "cached"
        } else {
            "no-catalog-url"
        };
        (cached, status.to_string())
    } else {
        match fetch_catalog(&url) {
            Ok(c) => {
                write_cache(data, &c);
                (Some(c), "live".to_string())
            }
            Err(_) => {
                let cached = load_cache(data);
                let status = if cached.is_some() {
                    "offline-cached"
                } else {
                    "offline-no-cache"
                };
                (cached, status.to_string())
            }
        }
    };
    let installed = installed_packs(data);
    let views = catalog
        .map(|c| {
            c.packs
                .iter()
                .map(|e| CatalogView {
                    pack_id: e.pack_id.clone(),
                    version: e.version.clone(),
                    display_name: e.display_name.clone(),
                    locale: e.locale.clone(),
                    author: e.author.clone(),
                    license: e.license.clone(),
                    review_status: e.review_status.clone(),
                    min_sdk_version: e.min_sdk_version.clone(),
                    size_bytes: e.size_bytes,
                    installed_version: installed
                        .iter()
                        .find(|i| i.pack_id == e.pack_id)
                        .map(|i| i.version.clone()),
                })
                .collect()
        })
        .unwrap_or_default();
    (views, status.to_string())
}

fn download(url: &str, max_bytes: u64) -> Result<Vec<u8>, String> {
    let resp = ureq::get(url)
        .call()
        .map_err(|e| format!("download failed: {e}"))?;
    let mut bytes = Vec::new();
    let mut reader = resp.into_reader();
    let mut buf = [0u8; 1 << 16];
    loop {
        let n = reader
            .read(&mut buf)
            .map_err(|e| format!("download read: {e}"))?;
        if n == 0 {
            break;
        }
        bytes.extend_from_slice(&buf[..n]);
        if bytes.len() as u64 > max_bytes {
            return Err("download exceeded pinned size".into());
        }
    }
    Ok(bytes)
}

fn hex_sha256(bytes: &[u8]) -> String {
    let mut h = Sha256::new();
    h.update(bytes);
    h.finalize().iter().map(|b| format!("{b:02x}")).collect()
}

/// Core install path shared by catalog installs and local imports. When
/// `expected` is given, checksum and manifest identity must match.
pub fn install_pack_bytes(
    data: &Path,
    bytes: &[u8],
    expected: Option<&PackEntry>,
) -> Result<InstalledPack, String> {
    if let Some(e) = expected {
        validate_entry(e)?;
        if bytes.len() as u64 > e.size_bytes {
            return Err("archive exceeds pinned size".into());
        }
        if hex_sha256(bytes) != e.sha256 {
            return Err("archive checksum does not match catalog entry".into());
        }
    }
    let am = lts_langpack::archive::inspect(bytes).map_err(|e| format!("archive inspect: {e}"))?;
    if let Some(e) = expected {
        if am.pack_id != e.pack_id || am.version != e.version {
            return Err("archive identity does not match catalog entry".into());
        }
    }
    let outcome = lts_langpack::archive::install(bytes, &data.join("packs"))
        .map_err(|e| format!("install rejected: {e}"))?;
    let store = lts_storage::Store::open(data.join("profiles.db")).map_err(|e| e.to_string())?;
    // Community installs NEVER self-upgrade trust: the catalog's claimed
    // review status is metadata, not a review record (docs/16).
    store
        .record_installation(&lts_storage::PackInstallation {
            pack_id: outcome.pack_id.clone(),
            version: outcome.version.clone(),
            installed_at: crate::rfc3339_utc(crate::now_secs()),
            trust_state: "community".into(),
        })
        .map_err(|e| e.to_string())?;
    Ok(display_for(
        data,
        &outcome.pack_id,
        &outcome.version,
        "community",
    ))
}

/// Install the catalog-cached entry for `pack_id` (download -> verify ->
/// install). Offline reinstall of an already-installed pack is a no-op
/// success.
pub fn install_from_catalog(data: &Path, pack_id: &str) -> Result<InstalledPack, String> {
    if !valid_pack_id(pack_id) {
        return Err("bad pack id".into());
    }
    let catalog =
        load_cache(data).ok_or_else(|| "no catalog cache; connect once first".to_string())?;
    let entry = catalog
        .packs
        .iter()
        .find(|e| e.pack_id == pack_id)
        .ok_or_else(|| "pack not in catalog".to_string())?;
    validate_entry(entry)?;
    if let Some(v) = lts_langpack::archive::current_version(pack_id, &data.join("packs")) {
        if v == entry.version {
            return Ok(display_for(data, pack_id, &v, "community"));
        }
    }
    let bytes = download(&entry.url, entry.size_bytes)?;
    install_pack_bytes(data, &bytes, Some(entry))
}

/// Import a locally supplied archive (bytes never carry paths through
/// IPC; the UI reads the file and sends contents).
pub fn import_pack_b64(data: &Path, data_b64: &str) -> Result<InstalledPack, String> {
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(data_b64)
        .map_err(|_| "invalid archive data".to_string())?;
    if bytes.len() as u64 > lts_langpack::archive::MAX_TOTAL_BYTES {
        return Err("archive exceeds size limit".into());
    }
    install_pack_bytes(data, &bytes, None)
}

fn display_for(data: &Path, pack_id: &str, version: &str, trust: &str) -> InstalledPack {
    // Display metadata comes from the installed pack's own manifest.
    let manifest = data
        .join("packs")
        .join(pack_id)
        .join(version)
        .join("manifest.yaml");
    let (display_name, locale) = fs::read_to_string(&manifest)
        .ok()
        .and_then(|s| serde_yaml::from_str::<serde_yaml::Value>(&s).ok())
        .map(|v| {
            let g = |k: &str| {
                v.get(k)
                    .and_then(|x| x.as_str())
                    .unwrap_or_default()
                    .to_string()
            };
            (g("display_name"), g("target_locale"))
        })
        .unwrap_or_else(|| (pack_id.to_string(), String::new()));
    InstalledPack {
        pack_id: pack_id.into(),
        version: version.into(),
        display_name,
        locale,
        trust_state: trust.into(),
    }
}

pub fn installed_packs(data: &Path) -> Vec<InstalledPack> {
    let Ok(store) = lts_storage::Store::open(data.join("profiles.db")) else {
        return Vec::new();
    };
    let Ok(insts) = store.installations() else {
        return Vec::new();
    };
    insts
        .iter()
        .map(|i| display_for(data, &i.pack_id, &i.version, &i.trust_state))
        .collect()
}

pub fn active_pack(data: &Path, profile_id: &str) -> Result<Vec<String>, String> {
    let store = lts_storage::Store::open(data.join("profiles.db")).map_err(|e| e.to_string())?;
    store
        .selected_packs(profile_id)
        .map(|v| v.into_iter().map(|(id, _)| id).collect())
        .map_err(|e| e.to_string())
}

/// Switch the profile's learning language to an installed pack. The
/// display language of the app itself is unaffected: packs are the
/// language being learned, never the UI language.
pub fn switch_pack(data: &Path, profile_id: &str, pack_id: &str) -> Result<(), String> {
    if !valid_pack_id(pack_id) {
        return Err("bad pack id".into());
    }
    let version = lts_langpack::archive::current_version(pack_id, &data.join("packs"))
        .ok_or_else(|| "pack not installed".to_string())?;
    let store = lts_storage::Store::open(data.join("profiles.db")).map_err(|e| e.to_string())?;
    store
        .set_active_pack(profile_id, pack_id, &version)
        .map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn entry(url: &str) -> PackEntry {
        PackEntry {
            pack_id: "community.example.japanese".into(),
            version: "1.0.0".into(),
            display_name: "Example Japanese".into(),
            locale: "ja-JP".into(),
            author: "Example Author".into(),
            license: "CC-BY-4.0".into(),
            review_status: "community".into(),
            min_sdk_version: "0.1.0".into(),
            url: url.into(),
            sha256: "a".repeat(64),
            size_bytes: 1024,
        }
    }

    #[test]
    fn entries_are_hardened() {
        assert!(
            validate_entry(&entry("https://github.com/o/r/releases/download/v1/p.lpk")).is_ok()
        );
        // http and off-GitHub hosts are rejected even from a trusted catalog
        assert!(validate_entry(&entry("http://github.com/o/r/x")).is_err());
        assert!(validate_entry(&entry("https://evil.example/x.lpk")).is_err());
        // path-shaped or short pack ids are rejected
        assert!(
            validate_entry(&entry("https://github.com/o/r/x"))
                .and_then(|_| {
                    let mut e = entry("https://github.com/o/r/x");
                    e.pack_id = "../etc".into();
                    validate_entry(&e)
                })
                .is_err()
        );
        // bad checksums and oversized claims are rejected
        let mut e = entry("https://github.com/o/r/x");
        e.sha256 = "nope".into();
        assert!(validate_entry(&e).is_err());
        let mut e = entry("https://github.com/o/r/x");
        e.size_bytes = lts_langpack::archive::MAX_TOTAL_BYTES + 1;
        assert!(validate_entry(&e).is_err());
    }

    fn ja_demo_archive() -> Vec<u8> {
        let dir =
            PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../../tests/fixtures/packs/ja-demo");
        lts_langpack::archive::build(&dir).unwrap().0
    }

    #[test]
    fn import_validates_then_installs_as_community() {
        let tmp = tempfile::tempdir().unwrap();
        let data = tmp.path();
        let bytes = ja_demo_archive();
        let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
        let inst = import_pack_b64(data, &b64).unwrap();
        assert_eq!(inst.pack_id, "org.openlanguage.ja-demo");
        assert_eq!(inst.trust_state, "community");
        assert!(!inst.display_name.is_empty());
        // offline use: the pack is on disk and selectable
        let p = crate::create_local_profile(data, "T").unwrap();
        switch_pack(data, &p.id, "org.openlanguage.ja-demo").unwrap();
        assert_eq!(
            active_pack(data, &p.id).unwrap(),
            vec!["org.openlanguage.ja-demo"]
        );
        assert!(!installed_packs(data).is_empty());
    }

    #[test]
    fn tampered_archive_is_rejected() {
        let tmp = tempfile::tempdir().unwrap();
        let data = tmp.path();
        let bytes = ja_demo_archive();
        // catalog entry with a wrong checksum must fail before install
        let mut e = entry("https://github.com/o/r/x.lpk");
        e.pack_id = "org.openlanguage.ja-demo".into();
        e.version = "0.1.0".into();
        e.size_bytes = bytes.len() as u64;
        e.sha256 = "b".repeat(64);
        assert!(install_pack_bytes(data, &bytes, Some(&e)).is_err());
        assert!(
            lts_langpack::archive::current_version("org.openlanguage.ja-demo", &data.join("packs"))
                .is_none()
        );
        // identity mismatch (entry claims a different version) also fails
        let mut e2 = e.clone();
        e2.sha256 = hex_sha256(&bytes);
        e2.version = "9.9.9".into();
        assert!(install_pack_bytes(data, &bytes, Some(&e2)).is_err());
    }

    #[test]
    fn catalog_cache_roundtrip_and_view() {
        let tmp = tempfile::tempdir().unwrap();
        let data = tmp.path();
        let mut c = PackCatalog {
            catalog_version: "1".into(),
            note: String::new(),
            packs: vec![entry("https://github.com/o/r/x.lpk")],
        };
        c.packs[0].pack_id = "org.openlanguage.ja-demo".into();
        write_cache(data, &c);
        let loaded = load_cache(data).unwrap();
        assert_eq!(loaded.packs.len(), 1);
        // no LTS_PACK_CATALOG_URL in tests -> cached status, entry visible
        let (views, status) = catalog_view(data);
        assert_eq!(status, "cached");
        assert_eq!(views[0].pack_id, "org.openlanguage.ja-demo");
        assert_eq!(views[0].installed_version, None);
    }
}
