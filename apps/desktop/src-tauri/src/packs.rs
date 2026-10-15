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
use std::io::{Read, Write};
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

/// Sidecar binding a partial download to the one catalog artifact those
/// bytes belong to. A partial is never identified by name alone: the URL,
/// the pinned digest and the pinned size all have to agree before a retry
/// will append to it.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
struct PartialMeta {
    url: String,
    sha256: String,
    size_bytes: u64,
}

/// Cache key for one pinned artifact. Re-pinning a release asset (new digest
/// or size, or a moved URL) changes the key, so a stale partial can never be
/// adopted by the entry that replaced it.
fn resume_key(entry: &PackEntry) -> String {
    hex_sha256(
        format!(
            "{}\u{1}{}\u{1}{}",
            entry.url, entry.sha256, entry.size_bytes
        )
        .as_bytes(),
    )
}

fn partial_paths(data: &Path, entry: &PackEntry) -> (PathBuf, PathBuf) {
    let key = resume_key(entry);
    (
        data.join(format!("partial-{key}.part")),
        data.join(format!("partial-{key}.part.meta")),
    )
}

/// The byte range a retry asks the server for; nothing at all when there is
/// nothing on disk to continue.
fn range_header(have: u64) -> Option<String> {
    (have > 0).then(|| format!("bytes={have}-"))
}

/// What the answer to a ranged request means for the bytes already on disk.
enum Resume {
    /// The server honoured the range: its body continues the file.
    Append,
    /// The body is the whole archive — which includes a plain `200` from a
    /// server that ignored `Range`, and any answer at all when nothing usable
    /// is on disk. The partial is discarded rather than appended to.
    Restart,
}

fn resume_decision(status: u16, have: u64) -> Resume {
    if status == 206 && have > 0 {
        Resume::Append
    } else {
        Resume::Restart
    }
}

/// A partial download in the data directory: the bytes plus the sidecar that
/// says which artifact they are a prefix of. This is what makes an
/// interrupted install cost the bytes still in flight instead of the whole
/// archive (I05). It never makes the install less strict — the finished file
/// is still SHA-256 checked against the catalog entry before a byte of it
/// reaches the pack store, and a digest mismatch throws the partial away.
struct PartialDownload {
    part: PathBuf,
    meta: PathBuf,
}

impl PartialDownload {
    fn for_entry(data: &Path, entry: &PackEntry) -> PartialDownload {
        let (part, meta) = partial_paths(data, entry);
        PartialDownload { part, meta }
    }

    /// Bytes usable for a retry: sidecar present, parseable, naming this
    /// exact artifact, with the file on disk no larger than the pinned size.
    /// Anything else is deleted on the spot and reported as zero, so a
    /// leftover can only ever cost a re-download, never a wrong install.
    fn usable(&self, entry: &PackEntry) -> u64 {
        let want = PartialMeta {
            url: entry.url.clone(),
            sha256: entry.sha256.clone(),
            size_bytes: entry.size_bytes,
        };
        let raw = match fs::read(&self.meta) {
            Ok(b) => b,
            Err(_) => {
                self.discard();
                return 0;
            }
        };
        let got: PartialMeta = match serde_json::from_slice(&raw) {
            Ok(m) => m,
            Err(_) => {
                self.discard();
                return 0;
            }
        };
        if got != want {
            self.discard();
            return 0;
        }
        let len = match fs::metadata(&self.part) {
            Ok(m) => m.len(),
            Err(_) => {
                self.discard();
                return 0;
            }
        };
        if len > entry.size_bytes {
            self.discard();
            return 0;
        }
        len
    }

    /// Open the destination for this attempt: append to the bytes kept, so
    /// the new write lands at end of file, or truncate and start over when the
    /// server is sending the whole archive. Without `append` a write would
    /// overwrite the prefix from offset zero and the finished file would fail
    /// the digest — resume would be silently impossible.
    fn open(&self, append: bool) -> Result<fs::File, String> {
        let mut opts = fs::OpenOptions::new();
        opts.write(true).create(true);
        if append {
            opts.append(true);
        } else {
            opts.truncate(true);
        }
        // A disk that is already full fails right here, and that has to read
        // as a full disk, not as an os error string.
        opts.open(&self.part).map_err(|e| write_error(&e))
    }

    /// Write the sidecar before the first byte of this attempt, so a crash
    /// mid-transfer still leaves a retry able to identify what is on disk.
    fn write_meta(&self, entry: &PackEntry) {
        let meta = PartialMeta {
            url: entry.url.clone(),
            sha256: entry.sha256.clone(),
            size_bytes: entry.size_bytes,
        };
        if let Ok(bytes) = serde_json::to_vec(&meta) {
            let _ = fs::write(&self.meta, bytes);
        }
    }

    /// Drop the partial and its sidecar: after a verified download (a finished
    /// install leaves no debris), and whenever the bytes on disk are no longer
    /// trustworthy.
    fn discard(&self) {
        let _ = fs::remove_file(&self.part);
        let _ = fs::remove_file(&self.meta);
    }
}

/// Remove partials for artifacts this entry does not pin, so an old download
/// of a replaced release asset does not sit in the user's data directory
/// forever eating the space the next install needs.
fn prune_partials(data: &Path, entry: &PackEntry) {
    let keep = partial_paths(data, entry);
    let read = match fs::read_dir(data) {
        Ok(rd) => rd,
        Err(_) => return,
    };
    for dent in read.flatten() {
        let path = dent.path();
        let name = match path.file_name().and_then(|s| s.to_str()) {
            Some(n) => n.to_string(),
            None => continue,
        };
        if !name.starts_with("partial-") {
            continue;
        }
        if path != keep.0 && path != keep.1 {
            let _ = fs::remove_file(path);
        }
    }
}

/// A full disk has to read as a full disk, not as "install failed": the
/// learner's next action is freeing space, not pressing the same button.
fn write_error(e: &std::io::Error) -> String {
    if e.kind() == std::io::ErrorKind::StorageFull || e.raw_os_error() == Some(28) {
        return "not enough space left on device to finish installing".into();
    }
    format!("write: {e}")
}

/// Drain a response body onto disk under the hard size cap, starting from
/// `already` bytes on disk. Same rules as `read_capped` — abort the moment
/// the running total passes the cap, hand the real cumulative count to
/// `on_bytes`, consult `cancelled` before every chunk — except the bytes land
/// in a file, which is what makes an interrupted transfer resumable. Returns
/// the total bytes now on disk.
fn drain_into_file(
    mut reader: impl Read,
    mut file: fs::File,
    already: u64,
    max_bytes: u64,
    on_bytes: &mut dyn FnMut(u64),
    cancelled: &dyn Fn() -> bool,
) -> Result<u64, String> {
    let mut total = already;
    let mut buf = [0u8; 1 << 16];
    loop {
        if cancelled() {
            return Err(CANCELLED.into());
        }
        let n = reader.read(&mut buf).map_err(|e| format!("read: {e}"))?;
        if n == 0 {
            break;
        }
        if total + n as u64 > max_bytes {
            return Err("response exceeded size limit".into());
        }
        file.write_all(&buf[..n]).map_err(|e| write_error(&e))?;
        total += n as u64;
        on_bytes(total);
    }
    file.flush().map_err(|e| write_error(&e))?;
    Ok(total)
}

/// `fetch_capped` with resumable bytes on disk (I05). The transport rules are
/// unchanged and still enforced per hop: https start, the GitHub allowlist on
/// the start URL and every `Location`, at most `MAX_REDIRECT_HOPS`, `cancelled`
/// honored before every hop and every chunk. The difference is that a retry
/// sends `Range: bytes=<n>-` for the prefix it already holds and accepts that
/// prefix only if the server answers `206`; the completed file is then checked
/// against the pinned digest and size before the caller sees it.
fn fetch_capped_resumable(
    entry: &PackEntry,
    require_allowlisted: bool,
    partial: &PartialDownload,
    on_bytes: &mut dyn FnMut(u64),
    cancelled: &dyn Fn() -> bool,
) -> Result<Vec<u8>, String> {
    let agent = ureq::AgentBuilder::new().redirects(0).build();
    let mut hops: Vec<String> = Vec::new();
    let have = partial.usable(entry);
    // A previous attempt already landed every pinned byte (a crash between the
    // last write and the checksum, say): verify what is on disk instead of
    // asking the server for a range that starts at the end of the file.
    if have == entry.size_bytes {
        return finalize_partial(partial, entry);
    }
    loop {
        if cancelled() {
            return Err(CANCELLED.into());
        }
        let url = url_policy(&entry.url, &hops, require_allowlisted)?
            .pop()
            .expect("url_policy never returns an empty chain");
        let mut req = agent.get(url.as_str());
        if let Some(range) = range_header(have) {
            req = req.set("Range", &range);
        }
        let resp = req.call().map_err(|e| format!("fetch failed: {e}"))?;
        if !(300..400).contains(&resp.status()) {
            let append = matches!(resume_decision(resp.status(), have), Resume::Append);
            let file = partial.open(append)?;
            partial.write_meta(entry);
            drain_into_file(
                resp.into_reader(),
                file,
                if append { have } else { 0 },
                entry.size_bytes,
                on_bytes,
                cancelled,
            )?;
            break;
        }
        let loc = resp.header("location").ok_or("redirect without location")?;
        hops.push(loc.to_string());
    }
    finalize_partial(partial, entry)
}

/// Turn the bytes on disk into an answer: they have to be exactly the pinned
/// size and hash to the pinned digest. A refusal removes the file, so the next
/// attempt cannot inherit bad bytes. A verified file stays put until the install
/// that consumed it settles, which is what makes a cancel during unpacking
/// retryable without downloading the archive a second time.
fn finalize_partial(partial: &PartialDownload, entry: &PackEntry) -> Result<Vec<u8>, String> {
    let bytes =
        fs::read(&partial.part).map_err(|e| format!("could not read the downloaded bytes: {e}"))?;
    if bytes.len() as u64 != entry.size_bytes {
        partial.discard();
        return Err(format!(
            "download incomplete: got {} of {} bytes",
            bytes.len(),
            entry.size_bytes
        ));
    }
    if hex_sha256(&bytes) != entry.sha256 {
        partial.discard();
        return Err("archive checksum does not match catalog entry".into());
    }
    Ok(bytes)
}

/// Free space an install is expected to need: the archive itself, the staging
/// copy the installer unpacks into, and the installed copy that survives.
/// Text-and-audio packs of this size land within a small multiple of their
/// archive, so this is a conservative expectation, not a measurement — it is
/// used only to refuse a download that cannot possibly finish.
fn estimated_install_bytes(entry: &PackEntry) -> u64 {
    entry.size_bytes.saturating_mul(3)
}

/// The refusal when the pack cannot fit. It names the pack, the space the
/// install expects to need, and what is actually free: "install failed" gives
/// the learner nothing to act on, freeing space gives them the next step.
fn space_error(entry: &PackEntry, need: u64, free: u64) -> String {
    format!(
        "not enough free space: {} needs about {} MB and this device has {} MB free",
        entry.display_name,
        need / 1_000_000,
        free / 1_000_000
    )
}

/// Bytes available to this user on the filesystem holding `path`, or `None`
/// where there is no cheap way to ask (Windows). A `None` skips the preflight
/// rather than guessing at it.
#[cfg(unix)]
fn free_bytes(path: &Path) -> Option<u64> {
    use std::ffi::CString;
    use std::os::unix::ffi::OsStrExt;
    let c = CString::new(path.as_os_str().as_bytes()).ok()?;
    // SAFETY: `statvfs` only writes through the pointer into a
    // zero-initialized `statvfs` of the correct type, and the path is a valid
    // NUL-terminated C string.
    let mut stat: libc::statvfs = unsafe { std::mem::zeroed() };
    if unsafe { libc::statvfs(c.as_ptr(), &mut stat) } != 0 {
        return None;
    }
    Some(stat.f_frsize as u64 * stat.f_bavail as u64)
}

#[cfg(not(unix))]
fn free_bytes(_path: &Path) -> Option<u64> {
    None
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
/// not started yet (before the checksum, before unpacking) and inside the
/// unpack itself: the hook runs once per archive entry and again immediately
/// before the store is touched, so an abort leaves no version directory and
/// never moves the `current` pointer.
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
    // The unpack is cancellable on the same terms as the download: the hook
    // is consulted per archive entry, and an abort drops the staging
    // directory without touching the pack store.
    let outcome =
        match lts_langpack::archive::install_with_cancel(bytes, &data.join("packs"), cancelled) {
            Ok(o) => o,
            Err(lts_langpack::archive::ArchiveError::Cancelled) => {
                report(&Progress::stage("install-pack", &am.pack_id, "cancelled"));
                return Err(CANCELLED.into());
            }
            Err(e) => return Err(format!("install rejected: {e}")),
        };
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
/// next byte boundary, and it also stops an unpack that has already begun; a
/// cancelled install records nothing and the store still shows no version of
/// the pack. Bytes already downloaded stay on disk, so the next attempt
/// continues the transfer instead of re-fetching the whole archive. Offline
/// reinstall of an already-installed pack is a no-op success with no receipt
/// — nothing was fetched or verified this run, and a receipt that says
/// otherwise would be a lie.
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
    // Ask before spending the learner's bandwidth and disk. A pack that
    // cannot possibly fit is refused now, with a reason that names free space,
    // instead of failing at the last byte of the unpack; `None` from
    // `free_bytes` skips the check rather than guessing at it.
    if let Some(free) = free_bytes(data) {
        let need = estimated_install_bytes(entry);
        if free < need {
            return Err(space_error(entry, need, free));
        }
    }
    // Continue an interrupted transfer if one is on disk for this exact
    // artifact, and clear partials for artifacts this catalog no longer pins.
    prune_partials(data, entry);
    let partial = PartialDownload::for_entry(data, entry);
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
        fetch_capped_resumable(entry, true, &partial, &mut on_bytes, &cancelled)
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
    let installed =
        match install_pack_bytes_report(data, &bytes, Some(entry), &mut report, &cancelled) {
            Ok(v) => {
                // The pack is in the store: the downloaded archive has done
                // its job, and its bytes are the learner's disk space.
                partial.discard();
                v
            }
            Err(e) => {
                // A cancel keeps the bytes so the retry does not re-fetch them.
                // Any other failure means this archive was refused, and holding
                // onto it would only eat the space the learner needs instead.
                if e != CANCELLED {
                    partial.discard();
                }
                return Err(e);
            }
        };
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

    /// I05: an interrupted transfer costs the bytes still in flight, not the
    /// whole archive. The first attempt is cancelled partway through; the pack
    /// store shows nothing at all; the next attempt appends to what survived
    /// and the finished bytes still have to carry the pinned digest.
    #[test]
    fn an_interrupted_download_resumes_from_the_bytes_on_disk() {
        use std::io::Cursor;
        let tmp = tempfile::tempdir().unwrap();
        let data = tmp.path();
        // Big enough to span several read chunks, so a cancel lands mid-stream.
        let full: Vec<u8> = (0..400_000u32).map(|i| (i % 251) as u8).collect();
        let mut e = entry("https://github.com/o/r/releases/download/v1/big.lpk");
        e.size_bytes = full.len() as u64;
        e.sha256 = hex_sha256(&full);
        let partial = PartialDownload::for_entry(data, &e);

        let cut = (full.len() / 2) as u64;
        let flag = AtomicBool::new(false);
        let err = drain_into_file(
            Cursor::new(&full[..]),
            {
                let f = partial.open(false).unwrap();
                partial.write_meta(&e);
                f
            },
            0,
            e.size_bytes,
            &mut |done| {
                if done >= cut {
                    flag.store(true, Ordering::Relaxed);
                }
            },
            &|| flag.load(Ordering::Relaxed),
        )
        .unwrap_err();
        assert_eq!(err, CANCELLED);

        // Nothing about the install exists yet: the learner never sees a pack
        // that was not finished, and there is no half-written version to undo.
        assert!(installed_packs(data).is_empty());
        assert!(
            lts_langpack::archive::current_version(
                "community.example.japanese",
                &data.join("packs")
            )
            .is_none()
        );

        // The prefix is worth keeping, and it is strictly less than the whole.
        let kept = partial.usable(&e);
        assert!(
            kept > 0 && kept < e.size_bytes,
            "kept {kept} of {}",
            e.size_bytes
        );

        // Attempt two: only the missing bytes move, and the total is real.
        let seen: std::cell::RefCell<Vec<u64>> = std::cell::RefCell::new(Vec::new());
        let total = drain_into_file(
            Cursor::new(&full[kept as usize..]),
            partial.open(true).unwrap(),
            kept,
            e.size_bytes,
            &mut |done| seen.borrow_mut().push(done),
            &never_cancelled,
        )
        .unwrap();
        assert_eq!(total, e.size_bytes);
        let first = seen
            .borrow()
            .first()
            .copied()
            .expect("progress was reported");
        let last = seen
            .borrow()
            .last()
            .copied()
            .expect("progress was reported");
        assert!(
            first > kept,
            "a resumed attempt counts the bytes already on disk, not only the ones fetched now"
        );
        assert_eq!(last, e.size_bytes, "the fraction ends on the pinned total");
        let resumed = finalize_partial(&partial, &e).unwrap();
        assert_eq!(resumed, full, "the spliced file is the pinned archive");
        // A verified archive stays on disk until the install that consumed it
        // settles, so a cancel during unpacking is still retryable without a
        // second download. A catalog change clears the bytes it no longer pins.
        assert_eq!(partial.usable(&e), e.size_bytes);
        let mut repinned = e.clone();
        repinned.sha256 = "c".repeat(64);
        prune_partials(data, &repinned);
        assert!(
            !partial.part.exists() && !partial.meta.exists(),
            "a catalog change clears the bytes it no longer pins"
        );
    }

    /// The sidecar is the only thing identifying a partial, so it is checked
    /// against the catalog entry in full. Anything that does not name this
    /// exact artifact — re-pinned digest, moved URL, corrupt file, a part
    /// longer than the pinned size — is deleted instead of spliced.
    #[test]
    fn an_unidentifiable_partial_is_refused_and_cleared() {
        let tmp = tempfile::tempdir().unwrap();
        let data = tmp.path();
        let full: Vec<u8> = (0..5_000u32).map(|i| (i % 251) as u8).collect();
        let mut e = entry("https://github.com/o/r/releases/download/v1/p.lpk");
        e.size_bytes = full.len() as u64;
        e.sha256 = hex_sha256(&full);
        let partial = PartialDownload::for_entry(data, &e);
        fs::write(&partial.part, &full[..2_000]).unwrap();
        partial.write_meta(&e);
        assert_eq!(partial.usable(&e), 2_000, "the honest case works");

        // The catalog re-pins the asset: same URL, different digest.
        let mut repinned = e.clone();
        repinned.sha256 = "b".repeat(64);
        fs::write(
            &partial.meta,
            serde_json::to_vec(&PartialMeta {
                url: repinned.url.clone(),
                sha256: repinned.sha256.clone(),
                size_bytes: repinned.size_bytes,
            })
            .unwrap(),
        )
        .unwrap();
        assert_eq!(
            partial.usable(&e),
            0,
            "a partial naming another artifact starts from zero"
        );
        assert!(
            !partial.part.exists(),
            "the refused bytes are deleted, not kept for later"
        );

        // A corrupt sidecar and an over-long part are refused the same way.
        fs::write(&partial.part, &full[..2_000]).unwrap();
        fs::write(&partial.meta, b"not json").unwrap();
        assert_eq!(partial.usable(&e), 0);
        fs::write(&partial.part, vec![0u8; full.len() + 1]).unwrap();
        partial.write_meta(&e);
        assert_eq!(partial.usable(&e), 0, "more than the pinned size is a lie");
        assert!(!partial.part.exists());

        // Re-establish this entry's own partial: the refusals above deleted it.
        fs::write(&partial.part, &full[..2_000]).unwrap();
        partial.write_meta(&e);
        // Partials for artifacts this entry does not pin are pruned away.
        let stale = data.join("partial-00000000000000000000000000000000.part");
        fs::write(&stale, b"leftover from a replaced release asset").unwrap();
        prune_partials(data, &e);
        assert!(!stale.exists());
        assert!(partial.part.exists(), "this entry's own partial survives");
    }

    /// The resume rules spelled out: no range when there is nothing to
    /// continue, and only a `206` may be appended to. A server that ignored
    /// `Range` answers `200` with the whole archive, so appending to the
    /// partial would duplicate it — that answer restarts the file instead.
    #[test]
    fn a_retry_asks_for_the_missing_bytes_and_only_trusts_a_partial_answer() {
        assert_eq!(range_header(0), None);
        assert_eq!(range_header(4_096).as_deref(), Some("bytes=4096-"));
        assert!(matches!(resume_decision(206, 4_096), Resume::Append));
        assert!(matches!(resume_decision(200, 4_096), Resume::Restart));
        assert!(matches!(resume_decision(206, 0), Resume::Restart));
        assert!(matches!(resume_decision(404, 4_096), Resume::Restart));
    }

    /// Bytes already on disk are never adopted blindly: they have to be the
    /// exact pinned size and hash to the exact pinned digest, and a refusal
    /// removes them so the next attempt cannot inherit a corrupted file.
    #[test]
    fn a_partial_on_disk_is_verified_before_anything_is_installed() {
        let tmp = tempfile::tempdir().unwrap();
        let data = tmp.path();
        let full = ja_demo_archive();
        let mut e = entry("https://github.com/o/r/releases/download/v0.1.0/ja-demo.lpk");
        e.pack_id = "org.openlanguage.ja-demo".into();
        e.version = "0.1.0".into();
        e.size_bytes = full.len() as u64;
        e.sha256 = hex_sha256(&full);
        let partial = PartialDownload::for_entry(data, &e);

        // A previous attempt landed every byte and died before the checksum.
        fs::write(&partial.part, &full).unwrap();
        partial.write_meta(&e);
        assert_eq!(partial.usable(&e), e.size_bytes);
        let resumed = finalize_partial(&partial, &e).unwrap();
        assert_eq!(resumed, full);
        // Those bytes go through the same install gate as a fresh download.
        let inst =
            install_pack_bytes_report(data, &resumed, Some(&e), &mut no_progress, &never_cancelled)
                .unwrap();
        assert_eq!(inst.pack_id, "org.openlanguage.ja-demo");
        assert_eq!(
            lts_langpack::archive::current_version("org.openlanguage.ja-demo", &data.join("packs"))
                .as_deref(),
            Some("0.1.0")
        );
        // The bytes remain available for a retry until the install settles; the
        // store gate above re-validated every one of them either way.
        assert_eq!(partial.usable(&e), e.size_bytes);

        // Right length, wrong bytes: refused, and not left on disk.
        fs::write(&partial.part, vec![9u8; full.len()]).unwrap();
        partial.write_meta(&e);
        let err = finalize_partial(&partial, &e).unwrap_err();
        assert!(err.contains("checksum"), "{err}");
        assert!(!partial.part.exists());

        // One byte short of the pinned size is a refusal, not a truncated pack.
        fs::write(&partial.part, &full[..full.len() - 1]).unwrap();
        partial.write_meta(&e);
        let err = finalize_partial(&partial, &e).unwrap_err();
        assert!(err.contains("incomplete"), "{err}");
        assert!(!partial.part.exists());
    }

    /// A full disk and an impossible plan both have to name themselves: these
    /// strings are what the learner reads in the alert, and "install failed"
    /// tells them nothing they can act on.
    #[test]
    fn a_full_disk_is_named_rather_than_reported_as_a_generic_failure() {
        let enospc = std::io::Error::from_raw_os_error(28);
        let msg = write_error(&enospc);
        assert!(msg.contains("space left on device"), "{msg}");
        // Any other write failure keeps its own explanation.
        let other = std::io::Error::new(std::io::ErrorKind::PermissionDenied, "denied");
        assert!(write_error(&other).starts_with("write:"), "{other:?}");

        // The preflight expectation covers the archive, the staging copy and
        // the installed copy; the refusal quotes both numbers.
        let mut e = entry("https://github.com/o/r/releases/download/v1/p.lpk");
        e.size_bytes = 300_000_000;
        assert_eq!(estimated_install_bytes(&e), 900_000_000);
        let refusal = space_error(&e, estimated_install_bytes(&e), 120_000_000);
        assert!(refusal.contains("free space"), "{refusal}");
        assert!(refusal.contains("Example Japanese"), "{refusal}");
        assert!(
            refusal.contains("900 MB") && refusal.contains("120 MB"),
            "{refusal}"
        );

        // The platform plumbing answers something sane where it answers at all.
        if cfg!(unix) {
            let free = free_bytes(std::path::Path::new(".")).expect("unix has statvfs");
            assert!(free > 0, "free space read as {free}");
        }
    }

    /// The unpack is now cancellable too: a cancel that arrives while the
    /// archive is being extracted stops the install, reports the terminal
    /// `cancelled` stage, and leaves the pack store exactly as it was.
    #[test]
    fn cancelling_during_unpacking_leaves_no_pack_installed() {
        let tmp = tempfile::tempdir().unwrap();
        let data = tmp.path();
        let bytes = ja_demo_archive();
        let seen = std::cell::Cell::new(0usize);
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
            &mut |p: &Progress| stages.push(p.stage),
            // `install_pack_bytes_report` consults the flag twice before the
            // unpack begins, so the third call is the extraction loop's own.
            &|| {
                seen.set(seen.get() + 1);
                seen.get() > 2
            },
        )
        .unwrap_err();
        assert_eq!(err, CANCELLED, "{err}");
        assert_eq!(stages, vec!["verify", "install", "cancelled"]);
        assert!(seen.get() >= 3, "the unpack itself was reached");
        assert!(installed_packs(data).is_empty());
        assert_eq!(
            lts_langpack::archive::current_version("org.openlanguage.ja-demo", &data.join("packs")),
            None,
            "a cancelled unpack leaves no version installed"
        );
    }
}
