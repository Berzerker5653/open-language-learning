//! Memory scheduling (Layer A, docs/03 §7) behind a deterministic
//! interface. The spike is an FSRS-shaped model (stability, difficulty,
//! power-law retrievability) with fixed default parameters — see
//! `docs/assessment/SCHEDULING_RESEARCH.md` for the production
//! implementation comparison.
//!
//! Invariants:
//! - ratings come only from valid scored retrieval outcomes; an
//!   unscored attempt (technical failure, abstention, skip, deferral)
//!   is never a review, positive or negative;
//! - scheduling is per-item due-time based; there is no daily
//!   attendance or streak objective (ADR-0002);
//! - the core path is pure arithmetic: deterministic under a test
//!   clock, no RNG.

pub mod fsrs;
pub mod planner;

pub use fsrs::{
    FsrsSpike, ItemState, MINED_SCHEDULER, Rating, SPIKE_VERSION, ScheduleDecision, Scheduler,
};
pub use planner::{
    BUDGET_PRESETS, DueReviewItem, PLANNER_VERSION, PlanReason, PlannedItem, PlannerConfig,
    PlannerError, PlannerInputs, ProgressionItem, SessionPlan, WeakSkillItem, plan_session,
};

use lts_domain::{EvidenceEvent, Outcome, Score};

/// Map an evidence event to a memory-retrieval rating. Only valid
/// scored retrieval outcomes map into the scheduler (docs/03 §7);
/// everything else is `None` — never a failed card review.
pub fn rating_from_evidence(event: &EvidenceEvent) -> Option<Rating> {
    if event.outcome != Outcome::Scored {
        return None;
    }
    match event.score? {
        Score::Correct => Some(Rating::Good),
        Score::PartiallyCorrect => Some(Rating::Hard),
        Score::Incorrect => Some(Rating::Again),
    }
}
