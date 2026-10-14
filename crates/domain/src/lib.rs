//! Core domain types: stable IDs, versions, evidence, mastery vocabulary,
//! curriculum graph, and the language-pack model.
//!
//! Invariants (docs/07 dependency rule):
//! - no dependency on any specific language pack or locale behavior;
//! - no dependency on speech/storage providers;
//! - packs are untrusted declarative data, never code.

pub mod curriculum;
pub mod evidence;
pub mod ids;
pub mod mastery;
pub mod pack;
pub mod versioning;

pub use curriculum::{
    CurriculumEdge, EdgeKind, NodeKind, PrerequisiteRecord, PrerequisiteStrength,
};
pub use evidence::{
    ActivityModality, AssessmentKind, EvidenceCorrection, EvidenceEvent, Outcome, Score,
};
pub use ids::{ContentId, ContentKind, EventId, IdError, LocaleTag, PackId, ProfileId};
pub use mastery::support_actions;
pub use mastery::{EvidenceAvailability, MasteryDimension, MasteryState, SupportLevel};
pub use pack::{
    DeclaredCapability, FeatureMode, LicenseSummary, PackManifest, TextDirection, TrustState,
};
pub use versioning::{EngineCompat, SchemaVersion, SemVer, VersionError};
