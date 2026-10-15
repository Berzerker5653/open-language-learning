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
use std::sync::atomic::{AtomicBool, Ordering};

const MAX_CATALOG_BYTES: u64 = 1 << 20;
/// Hosts a pack download may sit on, checked for the start URL *and*
/// every redirect hop. This allowlist is the thing that stops a
/// compromised catalog from bouncing the client to an arbitrary
/// server: whatever a catalog entry claims, the transport only ever
/// talks to these hosts.
/// - `github.com`: the start host of every release-download URL
///   shipped in `catalog/packs.json`
///   (`https://github.com/<owner>/<repo>/releases/download/<tag>/<file>`);
/// - `objects.githubusercontent.com`: GitHub's long-standing
///   release-asset CDN, where older release assets still redirect;
/// - `release-assets.githubusercontent.com`: the GitHub release-asset
///   CDN that `/releases/download/` URLs redirect to today — both
///   pinned reference-pack entries 302 here (R01).
const ALLOWED_HOSTS: [&str; 3] = [
    "github.com",
    "objects.githubusercontent.com",
    "release-assets.githubusercontent.com",
];
// Initial request plus at most this many redirects; enforced by
// `url_policy`, which `fetch_capped` drives on every live hop.
const MAX_REDIRECT_HOPS: usize = 5;

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
    /// `capabilities.rtl` from the installed pack's own manifest.yaml; the
    /// renderer flips text containers on this, see ADR-0029. Absent means
    /// false, the schema default (`schemas/language-pack-manifest.schema.json`).
    pub rtl: bool,
}

fn is_hex64(s: &str) -> bool {
    s.len() == 64 && s.bytes().all(|b| b.is_ascii_hexdigit())
}

/// Reverse-domain pack ids only; keeps ids out of path shape.
pub fn valid_pack_id(s: &str) -> bool {
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
    // The catalog itself is small and fast: no byte progress to measure and
    // no transfer the learner would try to cancel.
    let bytes = fetch_capped(url, MAX_CATALOG_BYTES, false, &mut |_| {}, &|| false)
        .map_err(|e| format!("catalog fetch failed: {e}"))?;
    let catalog: PackCatalog =
        serde_json::from_slice(&bytes).map_err(|e| format!("catalog invalid: {e}"))?;
    for e in &catalog.packs {
        validate_entry(e)?;
    }
    Ok(catalog)
}

/// The published catalog for this project's reference packs. It lives in this
/// repository, so a build with no `LTS_PACK_CATALOG_URL` still has a content
/// path: without it the Languages screen is a dead end and no pack can be
/// installed at all (ADR-0027).
pub const DEFAULT_CATALOG_URL: &str = "https://raw.githubusercontent.com/Berzerker5653/open-language-learning/main/catalog/packs.json";

/// Explicit configuration wins, including an explicit empty value ("no
/// catalog"), so an offline or kiosk build can still opt out or repoint.
fn catalog_url_from(env_value: Option<String>) -> String {
    env_value.unwrap_or_else(|| DEFAULT_CATALOG_URL.to_string())
}

/// Catalog entries for the UI plus installed-version info and an honest
/// status string ("live", "cached", "no-catalog-url", "offline-no-cache").
pub fn catalog_view(data: &Path) -> (Vec<CatalogView>, String) {
    let url = catalog_url_from(std::env::var("LTS_PACK_CATALOG_URL").ok());
    catalog_view_with(data, &url)
}

/// Env-independent core (url passed explicitly) so the honest status
/// behavior is testable without mutating process environment.
pub fn catalog_view_with(data: &Path, url: &str) -> (Vec<CatalogView>, String) {
    let (catalog, status) = if url.is_empty() {
        let cached = load_cache(data);
        let status = if cached.is_some() {
            "cached"
        } else {
            "no-catalog-url"
        };
        (cached, status.to_string())
    } else {
        match fetch_catalog(url) {
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

/// Resolve one redirect hop under the fetch policy: stay on https, and
/// for pack downloads stay on the allowlisted GitHub release hosts.
/// ureq 2.x follows redirects without re-validating the destination, so
/// every hop passes through here (a compromised or misconfigured host
/// cannot bounce the client to an arbitrary server).
fn next_hop(
    current: &url::Url,
    location: &str,
    require_allowlisted: bool,
) -> Result<url::Url, String> {
    let next = current
        .join(location)
        .map_err(|_| "bad redirect location")?;
    if next.scheme() != "https" {
        return Err("redirect left https".into());
    }
    if require_allowlisted {
        let host = next.host_str().ok_or("redirect has no host")?;
        if !ALLOWED_HOSTS.contains(&host) {
            return Err(format!("redirect host {host} not allowlisted"));
        }
    }
    Ok(next)
}

/// Check the start URL under the same rules the hops are checked under:
/// https always, allowlisted host when the download requires it.
fn checked_start(start: &str, require_allowlisted: bool) -> Result<url::Url, String> {
    let url = url::Url::parse(start).map_err(|_| "bad url")?;
    if url.scheme() != "https" {
        return Err("url must be https".into());
    }
    if require_allowlisted {
        let host = url.host_str().ok_or("url has no host")?;
        if !ALLOWED_HOSTS.contains(&host) {
            return Err(format!("host {host} not allowlisted"));
        }
    }
    Ok(url)
}

/// The redirect policy as a pure function: `start` plus the `location`
/// values a server returned, resolved one hop at a time into the full
/// chain. Rules: https on the start URL and every hop; every host
/// allowlisted (start and hops) when `require_allowlisted`; at most
/// `MAX_REDIRECT_HOPS` redirects. No socket is involved, so the tests
/// can replay a scripted chain offline — and `fetch_capped` replays
/// every live `Location` back through this same function, so the
/// scripted chain is exactly the chain a real download walks (R01).
pub(crate) fn url_policy(
    start: &str,
    hops: &[String],
    require_allowlisted: bool,
) -> Result<Vec<url::Url>, String> {
    let mut chain = vec![checked_start(start, require_allowlisted)?];
    for (i, loc) in hops.iter().enumerate() {
        if i >= MAX_REDIRECT_HOPS {
            return Err("too many redirects".into());
        }
        chain.push(next_hop(&chain[i], loc, require_allowlisted)?);
    }
    Ok(chain)
}

/// GET with per-hop policy and a hard size cap. `require_allowlisted`
/// enforces the GitHub host allowlist on every hop (pack downloads);
/// the operator-configured catalog URL is only held to https. ureq
/// never follows a redirect itself (`redirects(0)`): each `Location`
/// goes through `url_policy`, and only the re-resolved chain head is
/// ever requested. `on_bytes` sees the running total actually read and
/// `cancelled` is consulted before every hop and every read chunk, so
/// a cancel stops the transfer at the next byte boundary.
fn fetch_capped(
    start: &str,
    max_bytes: u64,
    require_allowlisted: bool,
    on_bytes: &mut dyn FnMut(u64),
    cancelled: &dyn Fn() -> bool,
) -> Result<Vec<u8>, String> {
    let agent = ureq::AgentBuilder::new().redirects(0).build();
    let mut hops: Vec<String> = Vec::new();
    loop {
        if cancelled() {
            return Err(CANCELLED.into());
        }
        let url = url_policy(start, &hops, require_allowlisted)?
            .pop()
            .expect("url_policy never returns an empty chain");
        let resp = agent
            .get(url.as_str())
            .call()
            .map_err(|e| format!("fetch failed: {e}"))?;
        if !(300..400).contains(&resp.status()) {
            return read_capped(resp.into_reader(), max_bytes, on_bytes, cancelled);
        }
        let loc = resp.header("location").ok_or("redirect without location")?;
        hops.push(loc.to_string());
    }
}

/// The one error string every cancelled install shares; the renderer turns
/// it into the "cancelled, nothing was installed" state rather than a
/// generic failure.
pub const CANCELLED: &str = "install cancelled";

/// Drain a response body under the hard size cap: the read aborts the
/// moment the running total passes `max_bytes`, so an oversized body
/// never lands in memory in full. Separate from the socket so tests can
/// drive it with an in-memory reader. `on_bytes` is called with the real
/// cumulative count after every chunk (measured progress, never a timer),
/// and `cancelled` is consulted before every chunk.
fn read_capped(
    mut reader: impl Read,
    max_bytes: u64,
    on_bytes: &mut dyn FnMut(u64),
    cancelled: &dyn Fn() -> bool,
) -> Result<Vec<u8>, String> {
    let mut bytes = Vec::new();
    let mut buf = [0u8; 1 << 16];
    loop {
        if cancelled() {
            return Err(CANCELLED.into());
        }
        let n = reader.read(&mut buf).map_err(|e| format!("read: {e}"))?;
        if n == 0 {
            break;
        }
        bytes.extend_from_slice(&buf[..n]);
        if bytes.len() as u64 > max_bytes {
            return Err("response exceeded size limit".into());
        }
        on_bytes(bytes.len() as u64);
    }
    Ok(bytes)
}

/// Percent of the pinned archive actually transferred. The denominator is
/// the size the catalog entry pinned, so the number is a real measured
/// fraction; it never exceeds 100 no matter what the server sends.
fn fetch_percent(done: u64, pinned: u64) -> u8 {
    if pinned == 0 {
        return 0;
    }
    ((done.min(pinned) * 100) / pinned).min(100) as u8
}

fn hex_sha256(bytes: &[u8]) -> String {
    let mut h = Sha256::new();
    h.update(bytes);
    h.finalize().iter().map(|b| format!("{b:02x}")).collect()
}

// K-62: the progress type lives in its own module so pack installs and model
// installs report on one channel; re-exported here because installs are its
// main caller.
pub use crate::progress::Progress;

/// Install a pack archive — the shared path for catalog installs and local
/// imports. With `expected`, checksum and identity must match. Reports
/// happen *before* the work they name, which is the whole point: a stage
/// announced after it finished would still leave the learner watching a
/// frozen button. `cancelled` is honored at the phase boundaries that have
/// not started yet (before the checksum, before unpacking); once the
/// unpack has begun the install runs to completion, because the swap into
/// the pack store is atomic and a half-unpacked version is never visible.
pub fn install_pack_bytes_report(
    data: &Path,
    bytes: &[u8],
    expected: Option<&PackEntry>,
    mut report: impl FnMut(&Progress),
    cancelled: &dyn Fn() -> bool,
) -> Result<InstalledPack, String> {
    let subject = expected
        .map(|e| e.pack_id.clone())
        .unwrap_or_else(|| "imported pack".to_string());
    if cancelled() {
        report(&Progress::stage("install-pack", &subject, "cancelled"));
        return Err(CANCELLED.into());
    }
    if let Some(e) = expected {
        validate_entry(e)?;
        if bytes.len() as u64 > e.size_bytes {
            return Err("archive exceeds pinned size".into());
        }
        report(&Progress::stage("install-pack", &subject, "verify"));
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
    if cancelled() {
        report(&Progress::stage("install-pack", &am.pack_id, "cancelled"));
        return Err(CANCELLED.into());
    }
    report(&Progress::stage("install-pack", &am.pack_id, "install"));
    let outcome = lts_langpack::archive::install(bytes, &data.join("packs"))
        .map_err(|e| format!("install rejected: {e}"))?;
    let store = lts_storage::Store::open(data.join("profiles.db")).map_err(|e| e.to_string())?;
    // Community installs NEVER self-upgrade trust: the catalog's claimed
    // review status is metadata, not a review record (docs/16).
    report(&Progress::stage("install-pack", &outcome.pack_id, "record"));
    store
        .record_installation(&lts_storage::PackInstallation {
            pack_id: outcome.pack_id.clone(),
            version: outcome.version.clone(),
            installed_at: crate::rfc3339_utc(crate::now_secs()),
            trust_state: "community".into(),
        })
        .map_err(|e| e.to_string())?;
    // K-63-follow: parse the pack now, while the install is on screen, rather
    // than making the learner's first visit to it pay for the read.
    crate::warm_pack(data, &outcome.pack_id, &outcome.version);
    Ok(display_for(
        data,
        &outcome.pack_id,
        &outcome.version,
        "community",
    ))
}

/// Install the catalog-cached entry for `pack_id` (download -> verify ->
/// install), reporting the stage it is in and, during the download, the
/// fraction of the pinned archive actually transferred (K-62 + the real
/// progress half of INSTALL-UX-001). `cancel` stops the transfer at the
/// next byte boundary; a cancelled install records nothing and the store
/// still shows no version of the pack. Offline reinstall of an
/// already-installed pack is a no-op success with no receipt — nothing was
/// fetched or verified this run, and a receipt that says otherwise would
/// be a lie.
pub fn install_from_catalog_report(
    data: &Path,
    pack_id: &str,
    mut report: impl FnMut(&Progress),
    cancel: &AtomicBool,
) -> Result<InstallResult, String> {
    let cancelled = || cancel.load(Ordering::Relaxed);
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
            return Ok(InstallResult {
                installed: display_for(data, pack_id, &v, "community"),
                receipt: None,
            });
        }
    }
    // The catalog entry pins the exact archive size, so bytes already read
    // are a real fraction of known work: percent advances only when a whole
    // new percent of *measured* bytes is in, and verify/install stay named
    // without a number because their work is single-pass and unmeasured.
    report(&Progress::stage("install-pack", pack_id, "fetch"));
    let pinned = entry.size_bytes;
    let mut last_pct: u8 = 0;
    let fetch = {
        let mut on_bytes = |done: u64| {
            let pct = fetch_percent(done, pinned);
            if pct != last_pct {
                last_pct = pct;
                report(&Progress::with_percent(
                    "install-pack",
                    pack_id,
                    "fetch",
                    pct,
                ));
            }
        };
        fetch_capped(
            &entry.url,
            entry.size_bytes,
            true,
            &mut on_bytes,
            &cancelled,
        )
    };
    let bytes = match fetch {
        Ok(b) => b,
        Err(e) => {
            if e == CANCELLED {
                report(&Progress::stage("install-pack", pack_id, "cancelled"));
            }
            return Err(e);
        }
    };
    let installed = install_pack_bytes_report(data, &bytes, Some(entry), &mut report, &cancelled)?;
    Ok(InstallResult {
        installed,
        receipt: Some(receipt_for(entry, &bytes, data)),
    })
}

/// Import a locally supplied archive (bytes never carry paths through IPC;
/// the UI reads the file and sends contents), reporting each stage (K-62).
/// The bytes are already on this device, so there is no transfer to cancel.
pub fn import_pack_b64_report(
    data: &Path,
    data_b64: &str,
    report: impl FnMut(&Progress),
) -> Result<InstalledPack, String> {
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(data_b64)
        .map_err(|_| "invalid archive data".to_string())?;
    if bytes.len() as u64 > lts_langpack::archive::MAX_TOTAL_BYTES {
        return Err("archive exceeds size limit".into());
    }
    install_pack_bytes_report(data, &bytes, None, report, &|| false)
}

/// What a finished catalog install can honestly name: the pack version,
/// where the bytes came from, the digest that was verified against this
/// run's bytes, the size that actually arrived, and the capabilities the
/// installed pack's own manifest declares. No field is invented.
#[derive(Debug, Clone, Serialize)]
pub struct InstallReceipt {
    pub pack_id: String,
    pub version: String,
    pub source_url: String,
    pub source_host: String,
    /// SHA-256 computed over the fetched bytes and required to equal the
    /// catalog pin before anything was unpacked.
    pub sha256: String,
    pub size_bytes: u64,
    /// `capabilities` keys the installed manifest sets true, sorted.
    pub capabilities: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct InstallResult {
    pub installed: InstalledPack,
    /// None when the install was a no-op (already-current version: no
    /// download and verification happened this run).
    pub receipt: Option<InstallReceipt>,
}

fn receipt_for(entry: &PackEntry, fetched: &[u8], data: &Path) -> InstallReceipt {
    InstallReceipt {
        pack_id: entry.pack_id.clone(),
        version: entry.version.clone(),
        source_url: entry.url.clone(),
        source_host: url::Url::parse(&entry.url)
            .ok()
            .and_then(|u| u.host_str().map(str::to_string))
            .unwrap_or_default(),
        sha256: hex_sha256(fetched),
        size_bytes: fetched.len() as u64,
        capabilities: declared_capabilities(data, &entry.pack_id, &entry.version),
    }
}

/// The capabilities an installed pack version declares true in its own
/// manifest. Never a fixed list: an absent or unparseable manifest yields
/// nothing, and only `true` values are named — the receipt cannot grant
/// what the pack itself did not claim.
pub fn declared_capabilities(data: &Path, pack_id: &str, version: &str) -> Vec<String> {
    let manifest = data
        .join("packs")
        .join(pack_id)
        .join(version)
        .join("manifest.yaml");
    let mut caps: Vec<String> = fs::read_to_string(&manifest)
        .ok()
        .and_then(|s| serde_yaml::from_str::<serde_yaml::Value>(&s).ok())
        .and_then(|v| {
            let m = v.get("capabilities")?.as_mapping()?;
            Some(
                m.iter()
                    .filter_map(|(k, val)| {
                        if val.as_bool() == Some(true) {
                            k.as_str().map(str::to_string)
                        } else {
                            None
                        }
                    })
                    .collect(),
            )
        })
        .unwrap_or_default();
    caps.sort();
    caps
}

fn display_for(data: &Path, pack_id: &str, version: &str, trust: &str) -> InstalledPack {
    // Display metadata comes from the installed pack's own manifest.
    let manifest = data
        .join("packs")
        .join(pack_id)
        .join(version)
        .join("manifest.yaml");
    let (display_name, locale, rtl) = fs::read_to_string(&manifest)
        .ok()
        .and_then(|s| serde_yaml::from_str::<serde_yaml::Value>(&s).ok())
        .map(|v| {
            let g = |k: &str| {
                v.get(k)
                    .and_then(|x| x.as_str())
                    .unwrap_or_default()
                    .to_string()
            };
            let rtl = v
                .get("capabilities")
                .and_then(|c| c.get("rtl"))
                .and_then(|x| x.as_bool())
                .unwrap_or(false);
            (g("display_name"), g("target_locale"), rtl)
        })
        .unwrap_or_else(|| (pack_id.to_string(), String::new(), false));
    InstalledPack {
        pack_id: pack_id.into(),
        version: version.into(),
        display_name,
        locale,
        trust_state: trust.into(),
        rtl,
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

    #[test]
    fn catalog_status_is_honest_when_unset_offline_or_cached() {
        let tmp = tempfile::tempdir().unwrap();
        let data = tmp.path();
        // Explicitly empty url, no cache: honest empty state, never "live".
        let (views, status) = catalog_view_with(data, "");
        assert_eq!(status, "no-catalog-url");
        assert!(views.is_empty());
        // Configured but unreachable: reports offline, invents nothing.
        let (views, status) = catalog_view_with(data, "https://127.0.0.1:9/catalog.json");
        assert_eq!(status, "offline-no-cache");
        assert!(views.is_empty());
        // A good cached copy survives an offline fetch.
        write_cache(
            data,
            &PackCatalog {
                catalog_version: "1".into(),
                note: String::new(),
                packs: vec![entry("https://github.com/o/r/releases/download/v1/p.lpk")],
            },
        );
        let (views, status) = catalog_view_with(data, "https://127.0.0.1:9/catalog.json");
        assert_eq!(status, "offline-cached");
        assert_eq!(views.len(), 1);
        let (_, status) = catalog_view_with(data, "");
        assert_eq!(status, "cached");
    }

    #[test]
    fn the_published_catalog_is_the_default_and_explicit_config_overrides_it() {
        // A fresh public-alpha install has a content path without configuration
        // (ADR-0027); an explicit value, including the empty string, still wins.
        assert_eq!(catalog_url_from(None), DEFAULT_CATALOG_URL);
        assert_eq!(catalog_url_from(Some(String::new())), "");
        assert_eq!(
            catalog_url_from(Some("https://example.test/catalog.json".into())),
            "https://example.test/catalog.json"
        );
    }

    /// These tests are not about progress, but every install path reports, so
    /// they hand the install a reporter that drops the stages.
    fn no_progress(_: &Progress) {}

    /// Tests that are not about cancellation hand the install a flag nobody
    /// ever sets.
    fn never_cancelled() -> bool {
        false
    }

    #[test]
    fn import_rejects_garbage_honestly() {
        let tmp = tempfile::tempdir().unwrap();
        // Not base64 at all.
        assert!(import_pack_b64_report(tmp.path(), "not base64!!", &mut no_progress).is_err());
        // Valid base64, not an archive.
        use base64::Engine;
        let b64 = base64::engine::general_purpose::STANDARD.encode(b"definitely not an lpk");
        assert!(import_pack_b64_report(tmp.path(), &b64, &mut no_progress).is_err());
        // Nothing was installed by the failed attempts.
        assert!(installed_packs(tmp.path()).is_empty());
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
        let inst = import_pack_b64_report(data, &b64, &mut no_progress).unwrap();
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
        assert!(
            install_pack_bytes_report(data, &bytes, Some(&e), &mut no_progress, &never_cancelled)
                .is_err()
        );
        assert!(
            lts_langpack::archive::current_version("org.openlanguage.ja-demo", &data.join("packs"))
                .is_none()
        );
        // identity mismatch (entry claims a different version) also fails
        let mut e2 = e.clone();
        e2.sha256 = hex_sha256(&bytes);
        e2.version = "9.9.9".into();
        assert!(
            install_pack_bytes_report(data, &bytes, Some(&e2), &mut no_progress, &never_cancelled)
                .is_err()
        );
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
        // Explicitly no catalog configured -> the cached copy is what shows.
        let (views, status) = catalog_view_with(data, "");
        assert_eq!(status, "cached");
        assert_eq!(views[0].pack_id, "org.openlanguage.ja-demo");
        assert_eq!(views[0].installed_version, None);
    }

    #[test]
    fn redirect_hops_stay_on_allowlisted_hosts_for_downloads() {
        let github = url::Url::parse("https://github.com/o/r/releases/download/v/p.lpk").unwrap();
        // The documented GitHub page -> asset CDN hop is allowed.
        let cdn = next_hop(&github, "https://objects.githubusercontent.com/x", true).unwrap();
        assert_eq!(cdn.host_str().unwrap(), "objects.githubusercontent.com");
        // A bounce to an arbitrary host is rejected (the loophole ureq 2.x
        // would otherwise follow silently).
        assert!(next_hop(&github, "https://evil.example/p.lpk", true).is_err());
        // Downgrade to http is rejected.
        assert!(next_hop(&github, "http://objects.githubusercontent.com/x", true).is_err());
        // Relative Locations resolve against the current url.
        let rel = next_hop(&github, "/redirect/x", true).unwrap();
        assert_eq!(rel.host_str().unwrap(), "github.com");
        // The operator-configured catalog URL is held to https only.
        let cat = url::Url::parse("https://example.org/packs.json").unwrap();
        let moved = next_hop(&cat, "https://cdn.example.org/packs.json", false).unwrap();
        assert_eq!(moved.host_str().unwrap(), "cdn.example.org");
        assert!(next_hop(&cat, "http://cdn.example.org/packs.json", false).is_err());
    }
    /// R01 acceptance: the redirect rules live in one pure function that
    /// `fetch_capped` replays every live `Location` through, so these
    /// scripted chains are exactly what a real download walks — with no
    /// socket, no timing, and no flakiness.
    #[test]
    fn scripted_redirect_chains_are_accepted_or_refused_hop_by_hop() {
        let start = "https://github.com/Berzerker5653/open-language-learning/releases/download/org.openlanguage.ja-jp.reference-0.4.0/ja-jp-reference-0.4.0.lpk";
        // What GitHub actually answers today for a release-download URL:
        // a 302 to the release-asset CDN. Both pinned catalog entries take
        // this hop, so refusing it is what broke native install (R01).
        let asset_cdn = "https://release-assets.githubusercontent.com/github-production-release-asset/1/2?Expires=1&Signature=x";
        let chain = url_policy(start, &[asset_cdn.into()], true)
            .expect("GitHub's asset hop is allowlisted");
        assert_eq!(chain.len(), 2);
        assert_eq!(chain[0].host_str().unwrap(), "github.com");
        assert_eq!(
            chain[1].host_str().unwrap(),
            "release-assets.githubusercontent.com"
        );

        // The full documented chain still works too: the long-standing
        // object CDN redirecting on to the current release-asset CDN.
        let chain = url_policy(
            start,
            &[
                "https://objects.githubusercontent.com/github-production-release-asset/1/2?x=1".into(),
                "https://release-assets.githubusercontent.com/github-production-release-asset/1/2?Expires=1&Signature=x".into(),
            ],
            true,
        )
        .expect("github -> objects -> release-assets is accepted");
        assert_eq!(chain.len(), 3);
        assert_eq!(
            chain[1].host_str().unwrap(),
            "objects.githubusercontent.com"
        );
        assert_eq!(
            chain[2].host_str().unwrap(),
            "release-assets.githubusercontent.com"
        );

        // A bounce to an arbitrary host, even after an allowed first hop.
        assert!(
            url_policy(
                start,
                &[asset_cdn.into(), "https://evil.example/p.lpk".into()],
                true
            )
            .is_err()
        );
        // An https -> http downgrade mid-chain is refused.
        assert!(
            url_policy(
                start,
                &["http://release-assets.githubusercontent.com/x".into()],
                true
            )
            .is_err()
        );
        // A relative Location stays on the current host.
        let moved = url_policy(asset_cdn, &["/other/path".into()], true).unwrap();
        assert_eq!(
            moved[1].as_str(),
            "https://release-assets.githubusercontent.com/other/path"
        );
        // The hop budget is enforced: at the limit it resolves, one more is
        // refused instead of followed (a loop cannot spin the client).
        let looping = "https://github.com/o/r/redirect".to_string();
        assert!(url_policy(start, &vec![looping.clone(); MAX_REDIRECT_HOPS], true).is_ok());
        assert!(url_policy(start, &vec![looping; MAX_REDIRECT_HOPS + 1], true).is_err());
        // The start URL is held to the same rules as a hop: no off-allowlist
        // host, no plaintext.
        assert!(url_policy("https://evil.example/p.lpk", &[], true).is_err());
        assert!(url_policy("http://github.com/o/r/x", &[], true).is_err());
        // The operator-configured catalog is https-only, not host-locked.
        assert!(
            url_policy(
                "https://example.org/packs.json",
                &["https://cdn.example.org/packs.json".into()],
                false
            )
            .is_ok()
        );
        assert!(
            url_policy(
                "https://example.org/packs.json",
                &["http://cdn.example.org/packs.json".into()],
                false
            )
            .is_err()
        );
    }

    /// R01 acceptance: the URLs actually shipped in `catalog/packs.json`
    /// pass the transport policy a download walks, including GitHub's real
    /// asset hop. If the catalog ever points at http or off-allowlist, this
    /// fails in review instead of at a learner's first install.
    #[test]
    fn every_pinned_catalog_entry_passes_the_download_policy() {
        let path = concat!(env!("CARGO_MANIFEST_DIR"), "/../../../catalog/packs.json");
        let text =
            std::fs::read_to_string(path).expect("the shipped catalog must be readable here");
        let catalog: PackCatalog = serde_json::from_str(&text).unwrap();
        let asset_cdn = "https://release-assets.githubusercontent.com/github-production-release-asset/1/2?Expires=1&Signature=x";
        let mut ids = Vec::new();
        for e in &catalog.packs {
            validate_entry(e).unwrap_or_else(|why| panic!("{}: {why}", e.pack_id));
            let chain = url_policy(&e.url, &[asset_cdn.into()], true).unwrap_or_else(|why| {
                panic!("{}: transport policy refused {}: {why}", e.pack_id, e.url)
            });
            assert_eq!(chain[0].host_str().unwrap(), "github.com");
            assert_eq!(
                chain[1].host_str().unwrap(),
                "release-assets.githubusercontent.com"
            );
            assert!(e.size_bytes > 0, "a pinned entry must name its size");
            assert_eq!(e.sha256.len(), 64, "a pinned entry must name its hash");
            ids.push(e.pack_id.clone());
        }
        assert_eq!(
            ids,
            vec![
                "org.openlanguage.ja-jp.reference",
                "org.openlanguage.ru-ru.reference"
            ]
        );
    }

    /// K-62: the owner's complaint was an install that gave no sign of life.
    /// The stage sequence is the contract the renderer draws its line from, so
    /// it is pinned here: every stage is named before the work it describes,
    /// and a path that cannot verify never claims to have verified.
    #[test]
    fn a_catalog_install_reports_each_stage_before_doing_it() {
        let tmp = tempfile::tempdir().unwrap();
        let data = tmp.path();
        let bytes = ja_demo_archive();
        let mut e = entry("https://github.com/o/r/releases/download/v1/ja-demo.lpk");
        e.pack_id = "org.openlanguage.ja-demo".into();
        e.version = "0.1.0".into();
        e.size_bytes = bytes.len() as u64;
        e.sha256 = hex_sha256(&bytes);
        let mut seen: Vec<(&'static str, Option<u8>)> = Vec::new();
        install_pack_bytes_report(
            data,
            &bytes,
            Some(&e),
            &mut |p: &Progress| {
                seen.push((p.stage, p.percent));
            },
            &never_cancelled,
        )
        .unwrap();
        assert_eq!(
            seen.iter().map(|(s, _)| *s).collect::<Vec<_>>(),
            vec!["verify", "install", "record"]
        );
        // None of these stages has a real fraction to report, and inventing one
        // is exactly the failure this card exists to prevent; the bytes-read
        // fraction belongs to the fetch stage, which never ran here.
        assert!(seen.iter().all(|(_, pct)| pct.is_none()));
    }

    /// A local import has no catalog promise to check, so it must not announce
    /// a check it did not perform.
    #[test]
    fn an_import_reports_only_the_stages_it_can_perform() {
        let tmp = tempfile::tempdir().unwrap();
        let bytes = ja_demo_archive();
        let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
        let mut stages: Vec<&str> = Vec::new();
        import_pack_b64_report(tmp.path(), &b64, &mut |p: &Progress| stages.push(p.stage)).unwrap();
        assert_eq!(stages, vec!["install", "record"]);
    }

    /// A failed check ends the sequence: the learner is never told the archive
    /// is being unpacked when the checksum already rejected it.
    #[test]
    fn a_rejected_checksum_stops_after_the_stage_that_failed() {
        let tmp = tempfile::tempdir().unwrap();
        let bytes = ja_demo_archive();
        let mut e = entry("https://github.com/o/r/releases/download/v1/ja-demo.lpk");
        e.pack_id = "org.openlanguage.ja-demo".into();
        e.version = "0.1.0".into();
        e.size_bytes = bytes.len() as u64;
        e.sha256 = "b".repeat(64);
        let mut stages: Vec<&str> = Vec::new();
        let err = install_pack_bytes_report(
            tmp.path(),
            &bytes,
            Some(&e),
            &mut |p: &Progress| stages.push(p.stage),
            &never_cancelled,
        )
        .unwrap_err();
        assert!(err.contains("checksum"), "{err}");
        assert_eq!(stages, vec!["verify"]);
    }

    /// R01: the hardened transport has to carry the archives the shipped
    /// catalog actually pins, not only fixtures. This is the only test in the
    /// tree that touches the network (both reference packs, ~634 MB), so it is
    /// `#[ignore]`d and the release evidence runs it explicitly.
    #[test]
    #[ignore = "downloads both pinned reference packs (~634 MB)"]
    fn both_pinned_catalog_entries_install_through_the_native_transport() {
        let catalog_path =
            PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../../catalog/packs.json");
        let catalog: PackCatalog =
            serde_json::from_str(&fs::read_to_string(catalog_path).unwrap()).unwrap();
        let ids: Vec<&str> = catalog.packs.iter().map(|e| e.pack_id.as_str()).collect();
        assert_eq!(
            ids,
            vec![
                "org.openlanguage.ja-jp.reference",
                "org.openlanguage.ru-ru.reference"
            ],
            "the shipped catalog is what this test covers"
        );
        let tmp = tempfile::tempdir().unwrap();
        let data = tmp.path();
        write_cache(data, &catalog);
        for pin in &catalog.packs {
            validate_entry(pin).unwrap();
            let res = install_from_catalog_report(
                data,
                &pin.pack_id,
                &mut no_progress,
                &AtomicBool::new(false),
            )
            .expect("the pinned archive installs through the native transport");
            let inst = res.installed;
            assert_eq!(inst.version, pin.version);
            assert_eq!(inst.locale, pin.locale);
            assert!(!inst.display_name.is_empty());
            let receipt = res.receipt.expect("a fetched install carries a receipt");
            assert_eq!(receipt.sha256, pin.sha256, "the verified digest is the pin");
            assert_eq!(receipt.source_host, "github.com");
        }
        let installed: Vec<(String, String)> = installed_packs(data)
            .into_iter()
            .map(|p| (p.pack_id, p.version))
            .collect();
        assert_eq!(
            installed,
            vec![
                ("org.openlanguage.ja-jp.reference".into(), "0.4.0".into()),
                ("org.openlanguage.ru-ru.reference".into(), "0.4.0".into()),
            ],
            "both pinned entries are on disk after one transport run"
        );
    }

    /// INSTALL-UX-001: the fetch percentage is real measured bytes over the
    /// size the catalog pinned — it moves only when bytes actually arrive,
    /// and it can never exceed 100 no matter what the server sends.
    #[test]
    fn fetch_progress_counts_the_bytes_actually_read() {
        use std::io::Cursor;
        let body = vec![7u8; 200_000];
        let mut totals: Vec<u64> = Vec::new();
        let got = read_capped(
            Cursor::new(&body),
            1 << 20,
            &mut |done| totals.push(done),
            &never_cancelled,
        )
        .unwrap();
        assert_eq!(got.len(), 200_000);
        assert_eq!(*totals.last().unwrap(), 200_000);
        assert!(
            totals.windows(2).all(|w| w[1] > w[0]),
            "progress only ever advances on measured bytes"
        );
        assert_eq!(fetch_percent(0, 3_200_000), 0);
        assert_eq!(fetch_percent(65_536, 3_200_000), 2);
        assert_eq!(fetch_percent(200_000, 200_000), 100);
        // A body smaller than the pinned claim shows as it is measured —
        // it is never rounded up to 100 (the checksum rejects it after).
        assert_eq!(fetch_percent(3_000_000, 3_200_000), 93);
        assert_eq!(fetch_percent(3_200_000, 3_200_000), 100);
        assert_eq!(fetch_percent(3_500_000, 3_200_000), 100);
    }

    /// A cancel set while bytes are moving stops the loop before the next
    /// read — the transfer itself, not just the UI, is what halts.
    #[test]
    fn a_cancelled_transfer_stops_at_the_next_byte_boundary() {
        use std::io::Cursor;
        let body = vec![7u8; 1 << 20];
        let flag = AtomicBool::new(false);
        let mut chunks = 0;
        let err = read_capped(
            Cursor::new(&body),
            u64::MAX,
            &mut |_| {
                chunks += 1;
                flag.store(true, Ordering::Relaxed);
            },
            &|| flag.load(Ordering::Relaxed),
        )
        .unwrap_err();
        assert_eq!(err, CANCELLED);
        assert_eq!(chunks, 1, "the flag is seen before the second read");
    }

    /// A cancel that arrives after the checksum passed must stop before any
    /// unpacking, and the store must be exactly as if nothing had happened:
    /// no version visible, no install record.
    #[test]
    fn cancelling_after_verify_leaves_no_pack_installed() {
        let tmp = tempfile::tempdir().unwrap();
        let data = tmp.path();
        let bytes = ja_demo_archive();
        let flag = AtomicBool::new(false);
        let mut e = entry("https://github.com/o/r/releases/download/v0.1.0/ja-demo.lpk");
        e.pack_id = "org.openlanguage.ja-demo".into();
        e.version = "0.1.0".into();
        e.size_bytes = bytes.len() as u64;
        e.sha256 = hex_sha256(&bytes);
        let mut stages: Vec<&str> = Vec::new();
        let err = install_pack_bytes_report(
            data,
            &bytes,
            Some(&e),
            &mut |p: &Progress| {
                stages.push(p.stage);
                if p.stage == "verify" {
                    flag.store(true, Ordering::Relaxed);
                }
            },
            &|| flag.load(Ordering::Relaxed),
        )
        .unwrap_err();
        assert_eq!(err, CANCELLED);
        assert_eq!(stages, vec!["verify", "cancelled"]);
        assert!(installed_packs(data).is_empty());
        assert!(
            lts_langpack::archive::current_version("org.openlanguage.ja-demo", &data.join("packs"))
                .is_none()
        );
    }

    /// The receipt is the install's proof: pack id, version, the catalog
    /// entry and host the bytes came from, the digest computed over the
    /// fetched bytes, the size that arrived, and only the capabilities the
    /// installed manifest actually declares true (`listening: false` in
    /// this fixture must not appear).
    #[test]
    fn the_receipt_names_the_version_source_and_verified_sha() {
        let tmp = tempfile::tempdir().unwrap();
        let data = tmp.path();
        let bytes = ja_demo_archive();
        let url = "https://github.com/o/r/releases/download/v0.1.0/ja-demo.lpk";
        let mut e = entry(url);
        e.pack_id = "org.openlanguage.ja-demo".into();
        e.version = "0.1.0".into();
        e.size_bytes = bytes.len() as u64;
        e.sha256 = hex_sha256(&bytes);
        let inst =
            install_pack_bytes_report(data, &bytes, Some(&e), &mut no_progress, &never_cancelled)
                .unwrap();
        let r = receipt_for(&e, &bytes, data);
        assert_eq!(r.pack_id, inst.pack_id);
        assert_eq!(r.version, "0.1.0");
        assert_eq!(r.source_url, url);
        assert_eq!(r.source_host, "github.com");
        assert_eq!(r.sha256, hex_sha256(&bytes));
        assert_eq!(r.sha256, e.sha256, "the verified digest is the pin");
        assert_eq!(r.size_bytes, bytes.len() as u64);
        assert_eq!(r.capabilities, vec!["reading", "speaking", "writing"]);
    }
}
