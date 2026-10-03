//! Language-pack domain model (docs/04). The model is target-language
//! independent: nothing in this crate treats any locale specially, and packs
//! are untrusted declarative data with no executable code.

use crate::ids::{LocaleTag, PackId};
use crate::versioning::{EngineCompat, SchemaVersion, SemVer};
use serde::{Deserialize, Serialize};

/// Pack trust/maturity lifecycle (docs/04 "Trust states"). Promotion requires
/// evidence; declaring a higher state is never self-certifying.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum TrustState {
    /// Incomplete; may contain unreviewed AI content.
    Experimental,
    /// Community submission; automated gates pass.
    Community,
    /// Structural/curriculum audits pass; sampled linguistic review exists.
    Validated,
    /// Defined review coverage and speech/assessment calibration pass.
    Verified,
    /// Canonical maintained example of the current spec.
    Reference,
}

/// How a declared language feature may be used by the engine (docs/04
/// "Phonology/prosody").
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum FeatureMode {
    /// Teach explicitly, no automatic scoring.
    Teach,
    /// Automatic scoring allowed only within calibrated envelopes (docs/05).
    AssessAutomatic,
    /// Human-guided comparison only.
    AssessGuided,
    /// Display/reference only.
    ReferenceOnly,
}

/// Text direction declared by a pack's identity data.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum TextDirection {
    Ltr,
    Rtl,
    Ttb,
}

/// Engine capability a pack may request; the engine exposes declarative
/// capabilities and never executes pack code (docs/04 "Security").
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct DeclaredCapability {
    pub id: String,
    pub min_engine_version: Option<SemVer>,
}

/// License summary entry for the pack as distributed.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct LicenseSummary {
    /// SPDX-like identifier for the pack's own original content.
    pub content_license: Option<String>,
    /// SPDX-like identifier for pack code-free data structures; None = unresolved.
    pub distribution_license: Option<String>,
    /// True only when redistribution rights are actually resolved (docs/10).
    pub redistribution_allowed: bool,
}

/// The manifest fields required by docs/04. Field-level schema validation is
/// PACK-001's job; this type is the in-memory contract the engine consumes.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PackManifest {
    pub pack_id: PackId,
    pub display_name: String,
    pub target_locale: LocaleTag,
    /// Learner/interface source languages the pack is written for.
    pub source_languages: Vec<LocaleTag>,
    pub pack_version: SemVer,
    pub schema_version: SchemaVersion,
    pub engine_compat: EngineCompat,
    pub authors: Vec<String>,
    pub trust_state: TrustState,
    /// Declared writing systems (IDs of orthography records).
    pub scripts: Vec<String>,
    pub direction: TextDirection,
    pub capabilities: Vec<DeclaredCapability>,
    pub license: LicenseSummary,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ids::{LocaleTag, PackId};
    use crate::versioning::{EngineCompat, SchemaVersion};

    fn manifest(locale: &str, pack: &str) -> PackManifest {
        PackManifest {
            pack_id: PackId::parse(pack).unwrap(),
            display_name: "Test Pack".into(),
            target_locale: LocaleTag::parse(locale).unwrap(),
            source_languages: vec![LocaleTag::parse("en").unwrap()],
            pack_version: SemVer::parse("0.1.0").unwrap(),
            schema_version: SchemaVersion::parse("0.1.0").unwrap(),
            engine_compat: EngineCompat::parse(">=0.1.0, <1.0.0").unwrap(),
            authors: vec!["test".into()],
            trust_state: TrustState::Experimental,
            scripts: vec!["script-primary".into()],
            direction: TextDirection::Ltr,
            capabilities: vec![],
            license: LicenseSummary {
                content_license: None,
                distribution_license: None,
                redistribution_allowed: false,
            },
        }
    }

    #[test]
    fn model_handles_any_locale_identically() {
        // Acceptance: no ja-JP dependency in the domain model. The same code
        // path models a Japanese pack and non-Japanese packs, including an
        // RTL one, with no locale-specific behavior.
        let ja = manifest("ja-JP", "org.openlanguage.ja-jp.reference");
        let sw = manifest("sw", "org.openlanguage.sw.reference");
        let ar = PackManifest {
            direction: TextDirection::Rtl,
            ..manifest("ar", "org.openlanguage.ar.reference")
        };
        for m in [&ja, &sw, &ar] {
            assert_eq!(m.trust_state, TrustState::Experimental);
            assert!(m.engine_compat.matches(&SemVer::parse("0.2.0").unwrap()));
        }
        assert_eq!(ar.direction, TextDirection::Rtl);
    }

    #[test]
    fn trust_state_order_is_monotonic() {
        let mut states = [
            TrustState::Reference,
            TrustState::Experimental,
            TrustState::Verified,
            TrustState::Community,
            TrustState::Validated,
        ];
        states.sort();
        assert_eq!(
            states,
            [
                TrustState::Experimental,
                TrustState::Community,
                TrustState::Validated,
                TrustState::Verified,
                TrustState::Reference,
            ]
        );
    }

    #[test]
    fn unresolved_license_is_explicit_not_implicit() {
        let m = manifest("ja-JP", "org.openlanguage.ja-jp.reference");
        assert!(!m.license.redistribution_allowed);
        assert_eq!(m.license.distribution_license, None);
    }
}
