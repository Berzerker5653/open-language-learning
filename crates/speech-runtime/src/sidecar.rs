//! Bundled sidecar resolver (owner decision 2026-10-08).
//!
//! Shipped desktop builds carry the whisper.cpp aligner as a self-contained
//! payload staged by `scripts/stage-aligner-sidecar.sh`:
//! `<dir>/SIDECAR.yaml` + `bin/` (binary + shared libs) + `model/`. In
//! development the binary comes from `$LTS_BENCH_VENDOR`; a shipped app has no
//! such cache, so it resolves the payload through this module instead.
//!
//! Invariants the resolver enforces at load (startup-cheap, no hashing):
//! manifest parses, schema/component/platform match, every declared file is a
//! real file (never a symlink: cmake keeps SONAME `.so.N` entries as symlinks
//! into versioned files and a payload entry pointing outside the payload would
//! carry no bytes of its own) at exactly the declared size, and the host CPU
//! satisfies `requires_cpu`. Deep sha256 verification is opt-in via
//! [`Sidecar::verify_hashes`]; the model is tens of MB and `load` runs at
//! startup.

use serde::Deserialize;
use sha2::{Digest, Sha256};
use std::path::{Component, Path, PathBuf};

pub const MANIFEST_FILE: &str = "SIDECAR.yaml";
pub const EXPECTED_COMPONENT: &str = "whisper.cpp-aligner";
pub const EXPECTED_SCHEMA: u32 = 1;

/// Payload platform id for this host; must match the manifest `built_for`.
pub fn host_platform() -> String {
    #[cfg(all(target_os = "linux", target_arch = "x86_64"))]
    {
        "linux-x64".to_string()
    }
    #[cfg(all(target_os = "linux", target_arch = "aarch64"))]
    {
        "linux-arm64".to_string()
    }
    #[cfg(not(all(
        target_os = "linux",
        any(target_arch = "x86_64", target_arch = "aarch64")
    )))]
    {
        "unsupported".to_string()
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct SidecarFile {
    pub path: String,
    pub bytes: u64,
    pub sha256: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SidecarRuntime {
    pub upstream: String,
    #[serde(rename = "ref")]
    pub git_ref: String,
    pub version: String,
    pub license: String,
    pub build_flags: String,
    pub requires_cpu: String,
    pub files: Vec<SidecarFile>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SidecarModel {
    pub id: String,
    pub upstream: String,
    pub license: String,
    pub bytes: u64,
    pub sha256: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SidecarStaged {
    pub date: String,
    pub by: String,
    pub host: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SidecarManifest {
    pub schema_version: u32,
    pub component: String,
    pub built_for: String,
    pub runtime: SidecarRuntime,
    pub model: SidecarModel,
    pub staged: SidecarStaged,
}

#[derive(Debug)]
pub enum SidecarProblem {
    MissingManifest { dir: PathBuf },
    BadManifest { reason: String },
    SchemaVersion { got: u32 },
    Component { got: String },
    PlatformMismatch { built_for: String, host: String },
    CpuUnsupported { requires_cpu: String },
    Incomplete { missing: Vec<String> },
}

impl std::fmt::Display for SidecarProblem {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::MissingManifest { dir } => {
                write!(f, "no {} in {}", MANIFEST_FILE, dir.display())
            }
            Self::BadManifest { reason } => write!(f, "sidecar manifest invalid: {reason}"),
            Self::SchemaVersion { got } => {
                write!(
                    f,
                    "sidecar manifest schema {got}, expected {EXPECTED_SCHEMA}"
                )
            }
            Self::Component { got } => {
                write!(
                    f,
                    "sidecar component '{got}', expected '{EXPECTED_COMPONENT}'"
                )
            }
            Self::PlatformMismatch { built_for, host } => {
                write!(f, "sidecar built for '{built_for}', this host is '{host}'")
            }
            Self::CpuUnsupported { requires_cpu } => {
                write!(f, "host CPU does not satisfy '{requires_cpu}'")
            }
            Self::Incomplete { missing } => {
                write!(
                    f,
                    "sidecar payload incomplete, missing or size/symlink mismatch: {}",
                    missing.join(", ")
                )
            }
        }
    }
}

impl std::error::Error for SidecarProblem {}

#[derive(Debug)]
pub struct Sidecar {
    pub dir: PathBuf,
    pub manifest: SidecarManifest,
}

impl Sidecar {
    /// Gate a payload directory for use. Rejects anything the desktop app
    /// should fall back on rather than half-run: bad manifest, wrong schema,
    /// wrong component, wrong platform, unsupported CPU, or any declared file
    /// missing / wrong size / a symlink.
    pub fn load(dir: &Path) -> Result<Self, SidecarProblem> {
        let manifest_path = dir.join(MANIFEST_FILE);
        let text = match std::fs::read_to_string(&manifest_path) {
            Ok(t) => t,
            Err(_) => {
                return Err(SidecarProblem::MissingManifest {
                    dir: dir.to_path_buf(),
                });
            }
        };
        let manifest: SidecarManifest =
            serde_yaml::from_str(&text).map_err(|e| SidecarProblem::BadManifest {
                reason: e.to_string(),
            })?;
        if manifest.schema_version != EXPECTED_SCHEMA {
            return Err(SidecarProblem::SchemaVersion {
                got: manifest.schema_version,
            });
        }
        if manifest.component != EXPECTED_COMPONENT {
            return Err(SidecarProblem::Component {
                got: manifest.component.clone(),
            });
        }
        let host = host_platform();
        if manifest.built_for != host {
            return Err(SidecarProblem::PlatformMismatch {
                built_for: manifest.built_for.clone(),
                host,
            });
        }
        // Host-capability gate before filesystem checks: a wrong CPU makes the
        // payload unrunnable however intact it is.
        if !cpu_supported(&manifest.runtime.requires_cpu) {
            return Err(SidecarProblem::CpuUnsupported {
                requires_cpu: manifest.runtime.requires_cpu.clone(),
            });
        }
        let mut missing = Vec::new();
        for f in &manifest.runtime.files {
            if !declared_file_ok(dir, &f.path, f.bytes) {
                missing.push(f.path.clone());
            }
        }
        let model_rel = format!("model/{}.bin", manifest.model.id);
        if !declared_file_ok(dir, &model_rel, manifest.model.bytes) {
            missing.push(model_rel);
        }
        if !missing.is_empty() {
            return Err(SidecarProblem::Incomplete { missing });
        }
        Ok(Self {
            dir: dir.to_path_buf(),
            manifest,
        })
    }

    pub fn binary(&self) -> PathBuf {
        self.dir.join("bin/whisper-cli")
    }

    /// Weights path derived from the manifest's `model.id`, never hardcoded:
    /// a re-staged payload may ship a different model.
    pub fn model_path(&self) -> PathBuf {
        self.dir
            .join("model")
            .join(format!("{}.bin", self.manifest.model.id))
    }

    /// Opt-in deep check: recompute sha256 over every declared runtime file
    /// and the model. Deliberately not called from `load`.
    pub fn verify_hashes(&self) -> Result<(), SidecarProblem> {
        let mut mismatched = Vec::new();
        for f in &self.manifest.runtime.files {
            if !file_sha256_matches(&self.dir.join(&f.path), &f.sha256) {
                mismatched.push(f.path.clone());
            }
        }
        let model_rel = format!("model/{}.bin", self.manifest.model.id);
        if !file_sha256_matches(&self.dir.join(&model_rel), &self.manifest.model.sha256) {
            mismatched.push(model_rel);
        }
        if mismatched.is_empty() {
            Ok(())
        } else {
            Err(SidecarProblem::Incomplete {
                missing: mismatched,
            })
        }
    }
}

/// A usable payload entry: real file (not symlink), no path escape, exact
/// declared byte size.
fn declared_file_ok(dir: &Path, rel: &str, bytes: u64) -> bool {
    let rel_path = Path::new(rel);
    // Manifest paths are payload-relative; a crafted manifest must not be able
    // to reference files outside the payload dir.
    if rel_path.is_absolute()
        || rel_path
            .components()
            .any(|c| matches!(c, Component::ParentDir | Component::RootDir))
    {
        return false;
    }
    let full = dir.join(rel_path);
    match std::fs::symlink_metadata(&full) {
        Ok(md) if md.file_type().is_symlink() => false,
        Ok(md) => md.is_file() && md.len() == bytes,
        Err(_) => false,
    }
}

/// True iff this host satisfies a `requires_cpu` requirement string such as
/// "x86-64-v3 (SSE4.2, F16C, FMA, BMI2, AVX, AVX2; no AVX-512)".
///
/// Scanner model: tokens are maximal runs of `[a-z0-9.]`, optionally extended
/// by a `-`-joined digit suffix (`AVX-512` is one token, not "AVX" plus 512).
/// A `no ` prefix marks a negation and is skipped. Tokens whose longest
/// recognised ISA prefix consumes them exactly (or with a `.N` sub-version,
/// e.g. `sse4.2`) must be detected on this CPU; a token that starts with a
/// recognised prefix but continues with extra digits (`avx1024`) fails closed;
/// anything else ("x86-64-v3", "no", prose) is ignored. Empty/absent tokens
/// are vacuously satisfied. On non-x86 hosts the detection macros are not
/// compiled in, so any named x86 token is false (the `built_for` gate rejects
/// an x86 payload there first anyway).
pub fn cpu_supported(requires_cpu: &str) -> bool {
    // Longest first so shorter prefixes never shadow (avx2 before avx).
    const KNOWN: [&str; 6] = ["sse4.2", "avx2", "bmi2", "f16c", "fma", "avx"];
    let s = requires_cpu.to_ascii_lowercase();
    let bytes = s.as_bytes();
    let mut i = 0;
    let mut negated = false;
    let mut all_ok = true;
    while i < bytes.len() {
        if !(bytes[i] as char).is_ascii_alphanumeric() && bytes[i] != b'.' {
            i += 1;
            continue;
        }
        let start = i;
        while i < bytes.len() && ((bytes[i] as char).is_ascii_alphanumeric() || bytes[i] == b'.') {
            i += 1;
        }
        // `-` followed by digits is part of the ISA level, not a separator.
        if i + 1 < bytes.len() && bytes[i] == b'-' && (bytes[i + 1] as char).is_ascii_digit() {
            i += 1;
            while i < bytes.len() && (bytes[i] as char).is_ascii_digit() {
                i += 1;
            }
        }
        let tok = &s[start..i];
        if tok == "no" {
            negated = true;
            continue;
        }
        if negated {
            negated = false;
            continue;
        }
        let known = KNOWN.iter().find(|t| tok.starts_with(**t));
        let Some(known) = known else { continue };
        let rest = &tok[known.len()..];
        if rest.is_empty() || rest.starts_with('.') {
            if !detect(known) {
                all_ok = false;
            }
        } else if rest.starts_with('-') {
            // A modified/extended variant (e.g. "avx-512"): not a plain
            // requirement we can honour, and negations of it are skipped
            // above, so leave it unsatisfied-and-unclaimed: require nothing.
        } else {
            // Unrecognised continuation ("avx1024"): fail closed.
            all_ok = false;
        }
    }
    all_ok
}

fn detect(token: &str) -> bool {
    #[cfg(any(target_arch = "x86", target_arch = "x86_64"))]
    {
        match token {
            "sse4.2" => std::is_x86_feature_detected!("sse4.2"),
            "f16c" => std::is_x86_feature_detected!("f16c"),
            "fma" => std::is_x86_feature_detected!("fma"),
            "bmi2" => std::is_x86_feature_detected!("bmi2"),
            "avx" => std::is_x86_feature_detected!("avx"),
            "avx2" => std::is_x86_feature_detected!("avx2"),
            _ => false,
        }
    }
    #[cfg(not(any(target_arch = "x86", target_arch = "x86_64")))]
    {
        let _ = token;
        false
    }
}

/// The payload libs live next to the binary, but the staged `.so` files carry
/// a RUNPATH pointing at the build machine, so the child must be pointed at
/// the payload `bin/` explicitly.
pub fn apply_runtime_env(cmd: &mut std::process::Command, binary: &Path) {
    #[cfg(unix)]
    {
        let Some(bin_dir) = binary.parent() else {
            return;
        };
        let mut value = bin_dir.display().to_string();
        // Prefer an entry already set on this Command; otherwise inherit the
        // value the child would have received from the process environment.
        let existing = cmd
            .get_envs()
            .find(|(k, _)| *k == std::ffi::OsStr::new("LD_LIBRARY_PATH"))
            .and_then(|(_, v)| v.map(|v| v.to_owned()))
            // MSRV 1.85 predates Command::get_env; get_envs is 1.32.
            .or_else(|| std::env::var_os("LD_LIBRARY_PATH"));
        let existing = existing
            .map(|v| v.to_string_lossy().into_owned())
            .unwrap_or_default();
        if !existing.is_empty() {
            value.push(':');
            value.push_str(&existing);
        }
        cmd.env("LD_LIBRARY_PATH", value);
    }
    #[cfg(not(unix))]
    {
        let _ = (cmd, binary);
    }
}

/// Streaming digest comparison: 64 KiB chunks, so the 77 MB model never has
/// to be held in memory.
fn file_sha256_matches(path: &Path, expected_hex: &str) -> bool {
    let Ok(mut f) = std::fs::File::open(path) else {
        return false;
    };
    let mut hasher = Sha256::new();
    let mut chunk = [0u8; 64 * 1024];
    loop {
        let n = match std::io::Read::read(&mut f, &mut chunk) {
            Ok(0) => break,
            Ok(n) => n,
            Err(e) if e.kind() == std::io::ErrorKind::Interrupted => continue,
            Err(_) => return false,
        };
        hasher.update(&chunk[..n]);
    }
    let digest = hasher.finalize();
    let hex: String = digest.iter().map(|b| format!("{b:02x}")).collect();
    hex.eq_ignore_ascii_case(expected_hex)
}
