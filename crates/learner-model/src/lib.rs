//! Evidence -> mastery derivation. Evidence construction (LEARN-001)
//! lives in [`evidence`]; the frozen versioned policy and its
//! deterministic evaluator live in [`policy`]; per-dimension derivation
//! with heuristic confidence in [`derive`].

pub mod derive;
pub mod evidence;
pub mod policy;

pub use derive::{ALGORITHM_VERSION, DerivedMastery};
pub use evidence::AttemptDraft;
pub use policy::{Decision, Fixture, Policy};
