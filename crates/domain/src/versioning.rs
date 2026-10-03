//! Semantic versioning and engine compatibility (docs/04 "Compatibility").
//!
//! Pack versions and schema versions use full SemVer including prerelease and
//! build metadata, matching the published schema pattern. Engine compatibility
//! is expressed as a SemVer version requirement.

use semver::{Version, VersionReq};
use serde::{Deserialize, Serialize};
use thiserror::Error;

pub use semver::Version as SemVer;

#[derive(Debug, Error)]
pub enum VersionError {
    #[error("invalid semver {0:?}: {1}")]
    Invalid(String, String),
    #[error("invalid engine requirement {0:?}: {1}")]
    InvalidRequirement(String, String),
}

/// A schema version. Currently the scaffold publishes `0.1.0`-style versions.
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct SchemaVersion(Version);

impl SchemaVersion {
    pub fn parse(raw: &str) -> Result<Self, VersionError> {
        Version::parse(raw)
            .map(Self)
            .map_err(|e| VersionError::Invalid(raw.to_owned(), e.to_string()))
    }

    pub fn version(&self) -> &Version {
        &self.0
    }
}

impl std::fmt::Display for SchemaVersion {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        self.0.fmt(f)
    }
}

impl<'de> Deserialize<'de> for SchemaVersion {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let s = String::deserialize(deserializer)?;
        Self::parse(&s).map_err(serde::de::Error::custom)
    }
}

impl Serialize for SchemaVersion {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.0.to_string())
    }
}

/// A pack's declared compatible engine range, e.g. `>=1.0.0, <2.0.0`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EngineCompat(VersionReq);

impl EngineCompat {
    pub fn parse(raw: &str) -> Result<Self, VersionError> {
        VersionReq::parse(raw)
            .map(Self)
            .map_err(|e| VersionError::InvalidRequirement(raw.to_owned(), e.to_string()))
    }

    /// True when an engine at `engine` may load this pack.
    pub fn matches(&self, engine: &Version) -> bool {
        self.0.matches(engine)
    }
}

impl<'de> Deserialize<'de> for EngineCompat {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let s = String::deserialize(deserializer)?;
        Self::parse(&s).map_err(serde::de::Error::custom)
    }
}

impl Serialize for EngineCompat {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.0.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_prerelease_and_build_metadata() {
        // The original validator rejected prerelease+build; the contract accepts full SemVer.
        let v = SchemaVersion::parse("1.2.3-rc.1+build.5").unwrap();
        assert_eq!(v.to_string(), "1.2.3-rc.1+build.5");
        assert!(SchemaVersion::parse("01.2.3").is_err());
    }

    #[test]
    fn prerelease_orders_before_release() {
        let rc = SchemaVersion::parse("1.0.0-rc.1").unwrap();
        let rel = SchemaVersion::parse("1.0.0").unwrap();
        assert!(rc < rel);
    }

    #[test]
    fn engine_range_semantics() {
        let compat = EngineCompat::parse(">=1.2.0, <2.0.0").unwrap();
        assert!(compat.matches(&Version::parse("1.2.0").unwrap()));
        assert!(compat.matches(&Version::parse("1.9.9").unwrap()));
        assert!(!compat.matches(&Version::parse("2.0.0").unwrap()));
        assert!(!compat.matches(&Version::parse("1.1.9").unwrap()));
    }
}
