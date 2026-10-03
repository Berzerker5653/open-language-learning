//! Activity runtime and support ladder (ACT-001, docs/01 §Support,
//! docs/03 §5).
//!
//! Loads pack units/scenarios/lexicon/concepts into a typed runtime and
//! renders the four activity families — encounter, comprehension,
//! retrieval, explanation — as serializable render specs (the UI layer
//! consumes these; UX-002/M4-E2E). Attempts record concrete support
//! actions (hint/replay/translation) and finalize into honest
//! `EvidenceEvent`s: a correct answer obtained with strong help is
//! recorded with its support level and is never flagged as an
//! independent success (docs/01: "A correct answer after a full
//! translation is not equal to independent comprehension").

pub mod attempt;
pub mod reading;
pub mod scenario;
pub mod spec;
pub mod support;
pub mod writing;

pub use attempt::{Attempt, AttemptOutcome};
pub use reading::{
    HIDE_AT_STATE, ReaderSettings, ReadingDisplay, ReadingItem, RomajiUserMode, ScriptKind,
    is_kana_only, render_reading_display, script_of,
};
pub use scenario::{NodeRecord, ScenarioOutcome, ScenarioSession, StepResult};
pub use spec::{
    ActivityError, ActivityKind, ActivityRuntime, PackActivity, PackModality, PackScenario,
    PackUnit, RenderedActivity, RenderedPrompt, RenderedScenario, SupportOption, classify_type,
    dimension_for,
};
pub use support::{SupportAction, SupportLedger};
pub use writing::{
    InputSurface, WritingGrade, WritingHint, WritingPrompt, WritingTask, grade_writing,
    normalize_typed, render_writing_prompt,
};
