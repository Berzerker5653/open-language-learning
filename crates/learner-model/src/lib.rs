//! Evidence -> mastery derivation. Evidence construction (LEARN-001)
//! lives in [`evidence`]; the frozen versioned policy and its
//! deterministic evaluator live in [`policy`].

pub mod evidence;
pub mod policy;

pub use evidence::AttemptDraft;
pub use policy::{Decision, Fixture, Policy};
