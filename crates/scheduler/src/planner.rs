//! Session planning (docs/01 §Session design, docs/03 §7).
//!
//! Composes a session from three learning objectives under a time
//! budget: due reviews (memory), weak-skill practice (mastery), and
//! curriculum progression. There is deliberately no attendance,
//! streak, or day-presence objective anywhere in this module
//! (ADR-0002): every planned item carries a learning reason.
//!
//! Determinism: the planner is a pure function of its inputs. No
//! RNG is used; the `seed` field is recorded in the plan and
//! reserved for future stochastic variants, so identical
//! (input, seed) pairs always produce byte-identical plans.

use lts_domain::ActivityModality;
use serde::{Deserialize, Serialize};

pub const PLANNER_VERSION: &str = "session-planner-0.2.0";

/// Named budget presets (minutes). "30+" means any budget >= 30 is
/// accepted; the presets are the product's advertised tiers.
pub const BUDGET_PRESETS: [u32; 4] = [5, 10, 20, 30];

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum PlanReason {
    DueReview,
    /// A review of a learner-owned (sentence-mined) item. It spends the
    /// same review share as pack-content reviews but is routed to a
    /// different surface and can never grant pack-content mastery
    /// (review finding R02).
    SavedReview,
    WeakSkill,
    Progression,
}

/// A retrievable item whose scheduler due time has arrived.
/// Callers obtain these from `lts_storage::due_items` + the
/// scheduler's retrievability function.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct DueReviewItem {
    pub item_id: String,
    pub content_id: String,
    pub modality: ActivityModality,
    /// Current estimated retrievability; lower = more urgent.
    pub retrievability: f64,
    /// True for learner-owned (mined) items, which have their own
    /// scheduler partition and their own review surface.
    #[serde(default)]
    pub saved: bool,
}

/// A content/dimension pair with low derived mastery confidence.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct WeakSkillItem {
    pub content_id: String,
    pub dimension: ActivityModality,
    /// Derived mastery confidence; lower = weaker.
    pub confidence: f64,
}

/// A not-yet-introduced curriculum item whose prerequisites are met.
/// Input order encodes curriculum order and is preserved.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct ProgressionItem {
    pub content_id: String,
    pub modality: ActivityModality,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct PlannerConfig {
    pub budget_minutes: u32,
    /// Recorded in the plan; the current algorithm is seed-independent.
    pub seed: u64,
    /// Repetition limit: max planned items per modality PER OBJECTIVE
    /// (FIX-M1-PROGRESSION-001: a shared cap let a review/weak backlog of
    /// the same dimension claim every slot and starve NEW material of the
    /// same dimension — the second Month-1 starvation mechanism).
    pub max_per_modality: usize,
    /// Budget shares per objective; must sum to 1.0 (±1e-9).
    pub review_share: f64,
    pub weak_share: f64,
    pub progression_share: f64,
    /// Estimated seconds per item per objective.
    pub review_seconds: u32,
    pub weak_seconds: u32,
    pub progression_seconds: u32,
}

impl Default for PlannerConfig {
    fn default() -> Self {
        Self {
            budget_minutes: 10,
            seed: 0,
            max_per_modality: 3,
            review_share: 0.5,
            weak_share: 0.3,
            progression_share: 0.2,
            review_seconds: 20,
            weak_seconds: 40,
            progression_seconds: 60,
        }
    }
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct PlannedItem {
    pub item_id: String,
    pub content_id: String,
    pub modality: ActivityModality,
    pub reason: PlanReason,
    pub est_seconds: u32,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct SessionPlan {
    pub items: Vec<PlannedItem>,
    pub total_seconds: u32,
    pub budget_minutes: u32,
    pub seed: u64,
    pub planner_version: String,
}

#[derive(Clone, Debug, PartialEq)]
pub enum PlannerError {
    ZeroBudget,
    SharesMustSumToOne(f64),
    InvalidShare(f64),
    ModalityLimitMustBePositive,
}

#[derive(Clone, Debug, Default)]
pub struct PlannerInputs {
    pub due_reviews: Vec<DueReviewItem>,
    pub weak_skills: Vec<WeakSkillItem>,
    pub progression: Vec<ProgressionItem>,
}

/// Compose a session plan. Deterministic: same inputs and config
/// always produce the same plan.
///
/// FIX-M1-PROGRESSION-001 (Month-1 starvation, measured in the
/// LEARNER-REVIEW-M1-001 day logs): each objective's reserved share must be
/// spendable no matter how deep the other backlogs are. Two mechanisms
/// starved NEW material (and weak skills) behind the review backlog before
/// this fix:
/// 1. every phase-1 fill loop compared the objective's cap against TOTAL
///    elapsed seconds, so an objective whose turn came after a full stream
///    could never even start — its own share was already "spent";
/// 2. the fill phase spent every leftover second sequentially
///    (all reviews, then all weak, then progression), so the reserved
///    floors could still be eaten by an earlier stream's surplus.
///
/// Now: phase 1 fills each objective against its OWN spent seconds, and
/// the fill phase spends leftovers strictly round-robin, one item per
/// objective per cycle, so no objective starves the others — which is what
/// the old comment already promised.
pub fn plan_session(
    config: &PlannerConfig,
    inputs: &PlannerInputs,
) -> Result<SessionPlan, PlannerError> {
    if config.budget_minutes == 0 {
        return Err(PlannerError::ZeroBudget);
    }
    for s in [
        config.review_share,
        config.weak_share,
        config.progression_share,
    ] {
        if !(0.0..=1.0).contains(&s) {
            return Err(PlannerError::InvalidShare(s));
        }
    }
    let sum = config.review_share + config.weak_share + config.progression_share;
    if (sum - 1.0).abs() > 1e-9 {
        return Err(PlannerError::SharesMustSumToOne(sum));
    }
    if config.max_per_modality == 0 {
        return Err(PlannerError::ModalityLimitMustBePositive);
    }

    let budget = config.budget_minutes * 60;

    // Urgency ordering: most-likely-forgotten reviews first, weakest
    // skills first; ties broken by id for total determinism.
    let mut reviews = inputs.due_reviews.clone();
    reviews.sort_by(|a, b| {
        a.retrievability
            .partial_cmp(&b.retrievability)
            .unwrap_or(std::cmp::Ordering::Equal)
            .then_with(|| a.item_id.cmp(&b.item_id))
    });
    let mut weak = inputs.weak_skills.clone();
    weak.sort_by(|a, b| {
        a.confidence
            .partial_cmp(&b.confidence)
            .unwrap_or(std::cmp::Ordering::Equal)
            .then_with(|| a.content_id.cmp(&b.content_id))
    });
    // Progression keeps curriculum order (stable).
    let progression = inputs.progression.clone();

    // The three streams share one fill engine: urgency/curriculum order in,
    // item identity out. Objective index: 0 reviews, 1 weak, 2 progression.
    let est = [
        config.review_seconds,
        config.weak_seconds,
        config.progression_seconds,
    ];
    let streams: [Vec<(String, String, ActivityModality, PlanReason)>; 3] = [
        reviews
            .iter()
            .map(|r| {
                (
                    r.item_id.clone(),
                    r.content_id.clone(),
                    r.modality,
                    if r.saved {
                        PlanReason::SavedReview
                    } else {
                        PlanReason::DueReview
                    },
                )
            })
            .collect(),
        weak.iter()
            .map(|w| {
                (
                    format!("{}:{}", w.content_id, serde_key(w.dimension)),
                    w.content_id.clone(),
                    w.dimension,
                    PlanReason::WeakSkill,
                )
            })
            .collect(),
        progression
            .iter()
            .map(|p| {
                (
                    format!("{}:{}", p.content_id, serde_key(p.modality)),
                    p.content_id.clone(),
                    p.modality,
                    PlanReason::Progression,
                )
            })
            .collect(),
    ];

    let mut plan = SessionPlan {
        items: Vec::new(),
        total_seconds: 0,
        budget_minutes: config.budget_minutes,
        seed: config.seed,
        planner_version: PLANNER_VERSION.to_string(),
    };
    let mut per_modality: std::collections::HashMap<(usize, ActivityModality), usize> =
        Default::default();
    let mut cursor = [0usize; 3];

    // Phase 1: each objective fills its own reserved share, measured in
    // ITS OWN spent seconds — a full review backlog cannot pre-spend the
    // weak or progression floor (FIX-M1-PROGRESSION-001 mechanism 1).
    let caps = [
        (budget as f64 * config.review_share) as u32,
        (budget as f64 * config.weak_share) as u32,
        (budget as f64 * config.progression_share) as u32,
    ];
    let mut objective_used = [0u32; 3];
    for k in 0..3 {
        while cursor[k] < streams[k].len()
            && objective_used[k] + est[k] <= caps[k]
            && plan.total_seconds + est[k] <= budget
        {
            let (item_id, content_id, modality, reason) = streams[k][cursor[k]].clone();
            cursor[k] += 1;
            if count(&per_modality, k, &modality) < config.max_per_modality {
                *per_modality.entry((k, modality)).or_insert(0) += 1;
                objective_used[k] += est[k];
                plan.total_seconds += est[k];
                plan.items.push(PlannedItem {
                    item_id,
                    content_id,
                    modality,
                    reason,
                    est_seconds: est[k],
                });
            }
        }
    }

    // Phase 2: spend any leftover budget on the highest-urgency
    // remaining candidates, cycling objectives review → weak →
    // progression ONE ITEM AT A TIME so no objective starves the others
    // (FIX-M1-PROGRESSION-001 mechanism 2 — the old shape drained each
    // stream fully before touching the next, which is how a beginner's
    // weak-skill backlog ate the whole plan for a month).
    'fill: while plan.total_seconds < budget {
        let before = plan.total_seconds;
        for k in 0..3 {
            while cursor[k] < streams[k].len() {
                if plan.total_seconds + est[k] > budget {
                    break;
                }
                let (item_id, content_id, modality, reason) = streams[k][cursor[k]].clone();
                if count(&per_modality, k, &modality) >= config.max_per_modality {
                    // Blocked for this objective by the repetition limit:
                    // never plannable, advance past it.
                    cursor[k] += 1;
                    continue;
                }
                cursor[k] += 1;
                *per_modality.entry((k, modality)).or_insert(0) += 1;
                plan.total_seconds += est[k];
                plan.items.push(PlannedItem {
                    item_id,
                    content_id,
                    modality,
                    reason,
                    est_seconds: est[k],
                });
                // One item per objective per cycle: back to the round-robin.
                break;
            }
            if plan.total_seconds >= budget {
                break 'fill;
            }
        }
        // A full cycle that added nothing (candidates exhausted, blocked
        // by modality caps, or simply too long for the remaining
        // budget): stop. Comparing progress, not candidate positions,
        // is what guarantees termination: candidates can remain while
        // nothing fits anymore.
        if plan.total_seconds == before {
            break 'fill;
        }
    }

    Ok(plan)
}

fn count(
    per: &std::collections::HashMap<(usize, ActivityModality), usize>,
    objective: usize,
    m: &ActivityModality,
) -> usize {
    per.get(&(objective, *m)).copied().unwrap_or(0)
}

fn serde_key(m: ActivityModality) -> String {
    format!("{m:?}").to_lowercase()
}
