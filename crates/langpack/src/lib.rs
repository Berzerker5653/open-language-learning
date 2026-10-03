//! Pack loading, schema validation, and semantic checks (docs/04).
//!
//! Layout contract for schema 0.2 packs is defined in [`layout`]; schemas
//! live in `schemas/v0.2/` and are embedded at build time.

pub mod archive;
pub mod audit;
pub mod diagnose;
pub mod graph;
pub mod layout;
pub mod migrate;
pub mod pack;
pub mod schema;

pub use diagnose::{Diagnostic, Severity};
pub use pack::{Mode, Pack};
