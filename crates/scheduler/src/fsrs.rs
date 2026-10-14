//! Dependency-free FSRS-shaped spike (FSRS-4.5 formula shape with the
//! community default parameters as fixed engineering placeholders —
//! not calibrated for this app's learners).

use serde::{Deserialize, Serialize};

pub const SPIKE_VERSION: &str = "fsrs-spike-0.1.0";

/// Scheduler tag for learner-owned (sentence-mined) items. Identical
/// parameters to `SPIKE_VERSION`, but a separate tag: a plan built for a
/// pack must never pick up a mined row (and vice versa), and mined
/// practice can never reach pack-content mastery (review finding R02).
pub const MINED_SCHEDULER: &str = "fsrs-spike-0.1.0+mined";

/// Retrieval rating for a scheduled review (FSRS grading scale 1..=4).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Rating {
    Again = 1,
    Hard = 2,
    Good = 3,
    Easy = 4,
}

/// Per-item memory state.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ItemState {
    /// Stability in days at retrievability 0.9.
    pub stability_days: f64,
    /// Difficulty 1..=10.
    pub difficulty: f64,
    pub reps: u32,
    pub lapses: u32,
    /// Epoch seconds of the last review.
    pub last_review: i64,
}

/// Outcome of one review under a scheduler.
#[derive(Debug, Clone, PartialEq)]
pub struct ScheduleDecision {
    pub state: ItemState,
    /// Next due time, epoch seconds.
    pub due_at: i64,
    /// Retrievability at review time (before the review applied).
    pub retrievability: f64,
    /// Interval used for `due_at`, in days.
    pub interval_days: f64,
}

/// Scheduler interface: the engine depends only on this trait, so the
/// spike can be replaced by `fsrs-rs` (BSD-3-Clause) or another
/// implementation without touching callers.
pub trait Scheduler {
    /// Apply one review at `now` (epoch seconds) to optional prior
    /// state. Pure and deterministic.
    fn review(&self, prior: Option<&ItemState>, rating: Rating, now: i64) -> ScheduleDecision;

    /// Retrievability of an item at `now`.
    fn retrievability(&self, state: &ItemState, now: i64) -> f64;

    /// An item is due when retrievability falls to `threshold`.
    fn is_due(&self, state: &ItemState, now: i64, threshold: f64) -> bool {
        self.retrievability(state, now) <= threshold + 1e-9
    }

    fn version(&self) -> &str;
}

/// Target retrievability for interval computation.
pub const DEFAULT_REQUEST_RET: f64 = 0.9;

pub struct FsrsSpike {
    pub w: [f64; 15],
    pub request_ret: f64,
}

/// Placeholder engineering parameters in the FSRS-4.5 formula shape.
/// Deliberately NOT community defaults (those ship calibrated with the
/// production crate); chosen so the spike behaves sanely: successes
/// grow stability, lapses shrink it, intervals stay in days-to-weeks.
/// Production adoption would use `fsrs-rs` defaults/optimization —
/// see docs/assessment/SCHEDULING_RESEARCH.md.
pub const DEFAULT_W: [f64; 15] = [
    0.5, 1.2, 3.0, 12.0, 6.0, 0.6, 1.2, 0.05, 1.6, 0.15, 1.1, 1.5, 0.3, 0.4, 2.0,
];

impl Default for FsrsSpike {
    fn default() -> Self {
        Self {
            w: DEFAULT_W,
            request_ret: DEFAULT_REQUEST_RET,
        }
    }
}

const DAY: f64 = 86_400.0;

impl FsrsSpike {
    fn clamp_d(d: f64) -> f64 {
        d.clamp(1.0, 10.0)
    }

    fn clamp_s(s: f64) -> f64 {
        s.max(0.01)
    }

    fn init_s(&self, g: Rating) -> f64 {
        Self::clamp_s(self.w[g as usize - 1])
    }

    fn init_d(&self, g: Rating) -> f64 {
        Self::clamp_d(self.w[4] - (g as u8 as f64 - 3.0))
    }

    fn next_d(&self, d: f64, g: Rating) -> f64 {
        // FSRS-4.5 shape: rating shifts current difficulty, then mean
        // reversion toward the easy-anchor.
        Self::clamp_d(
            self.w[7] * self.init_d(Rating::Easy)
                + (1.0 - self.w[7]) * (d - self.w[6] * (g as u8 as f64 - 3.0)),
        )
    }

    fn interval(&self, s: f64) -> f64 {
        // I = 9 * S * (1/r - 1); at r = 0.9 this is exactly S days.
        9.0 * s * (1.0 / self.request_ret - 1.0)
    }
}

impl Scheduler for FsrsSpike {
    fn review(&self, prior: Option<&ItemState>, rating: Rating, now: i64) -> ScheduleDecision {
        let (s, d, reps, lapses, r) = match prior {
            None => (self.init_s(rating), self.init_d(rating), 1, 0, 1.0),
            Some(p) => {
                let elapsed_days = ((now - p.last_review).max(0) as f64) / DAY;
                let r = (1.0 + elapsed_days / (9.0 * p.stability_days)).powf(-1.0);
                let s = if rating == Rating::Again {
                    // Post-failure stability (FSRS-4.5 form), capped:
                    // forgetting can never increase stability.
                    Self::clamp_s(
                        self.w[11]
                            * p.difficulty.powf(-self.w[12])
                            * ((p.stability_days + 1.0).powf(self.w[13]) - 1.0)
                            * (self.w[14] * (1.0 - r)).exp(),
                    )
                    .min(p.stability_days)
                } else {
                    // Post-success stability (FSRS-4.5 form).
                    p.stability_days
                        * (1.0
                            + self.w[8].exp()
                                * (11.0 - p.difficulty)
                                * p.stability_days.powf(-self.w[9])
                                * ((self.w[10] * (1.0 - r)).exp() - 1.0))
                };
                (
                    Self::clamp_s(s),
                    self.next_d(p.difficulty, rating),
                    p.reps + 1,
                    p.lapses + if rating == Rating::Again { 1 } else { 0 },
                    r,
                )
            }
        };
        let interval_days = if rating == Rating::Again {
            // Relearn: short fixed step, then the normal curve resumes.
            self.w[0].max(0.01)
        } else {
            self.interval(s)
        };
        let state = ItemState {
            stability_days: s,
            difficulty: d,
            reps,
            lapses,
            last_review: now,
        };
        ScheduleDecision {
            state,
            due_at: now + (interval_days * DAY).round() as i64,
            retrievability: r,
            interval_days,
        }
    }

    fn retrievability(&self, state: &ItemState, now: i64) -> f64 {
        let elapsed_days = ((now - state.last_review).max(0) as f64) / DAY;
        (1.0 + elapsed_days / (9.0 * state.stability_days)).powf(-1.0)
    }

    fn version(&self) -> &str {
        SPIKE_VERSION
    }
}
