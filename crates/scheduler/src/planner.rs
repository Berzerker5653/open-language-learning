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

pub const PLANNER_VERSION: &str = "session-planner-0.1.0";

/// Named budget presets (minutes). "30+" means any budget >= 30 is
/// accepted; the presets are the product's advertised tiers.
pub const BUDGET_PRESETS: [u32; 4] = [5, 10, 20, 30];

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum PlanReason {
    DueReview,
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
    /// Repetition limit: max planned items per modality.
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

    let mut plan = SessionPlan {
        items: Vec::new(),
        total_seconds: 0,
        budget_minutes: config.budget_minutes,
        seed: config.seed,
        planner_version: PLANNER_VERSION.to_string(),
    };
    let mut per_modality: std::collections::HashMap<ActivityModality, usize> = Default::default();

    // Phase 1: fill each objective's reserved share of the budget.
    let caps = [
        (budget as f64 * config.review_share) as u32,
        (budget as f64 * config.weak_share) as u32,
        (budget as f64 * config.progression_share) as u32,
    ];

    let mut ri = 0usize;
    let mut wi = 0usize;
    let mut pi = 0usize;

    while ri < reviews.len()
        && plan.total_seconds + config.review_seconds <= caps[0].min(budget - plan.total_seconds)
    {
        let r = &reviews[ri];
        if count(&per_modality, &r.modality) < config.max_per_modality {
            *per_modality.entry(r.modality).or_insert(0) += 1;
            plan.items.push(PlannedItem {
                item_id: r.item_id.clone(),
                content_id: r.content_id.clone(),
                modality: r.modality,
                reason: PlanReason::DueReview,
                est_seconds: config.review_seconds,
            });
            plan.total_seconds += config.review_seconds;
        }
        ri += 1;
    }
    while wi < weak.len()
        && plan.total_seconds + config.weak_seconds <= caps[1].min(budget - plan.total_seconds)
    {
        let w = &weak[wi];
        if count(&per_modality, &w.dimension) < config.max_per_modality {
            *per_modality.entry(w.dimension).or_insert(0) += 1;
            plan.items.push(PlannedItem {
                item_id: format!("{}:{}", w.content_id, serde_key(w.dimension)),
                content_id: w.content_id.clone(),
                modality: w.dimension,
                reason: PlanReason::WeakSkill,
                est_seconds: config.weak_seconds,
            });
            plan.total_seconds += config.weak_seconds;
        }
        wi += 1;
    }
    while pi < progression.len()
        && plan.total_seconds + config.progression_seconds
            <= caps[2].min(budget - plan.total_seconds)
    {
        let p = &progression[pi];
        if count(&per_modality, &p.modality) < config.max_per_modality {
            *per_modality.entry(p.modality).or_insert(0) += 1;
            plan.items.push(PlannedItem {
                item_id: format!("{}:{}", p.content_id, serde_key(p.modality)),
                content_id: p.content_id.clone(),
                modality: p.modality,
                reason: PlanReason::Progression,
                est_seconds: config.progression_seconds,
            });
            plan.total_seconds += config.progression_seconds;
        }
        pi += 1;
    }

    // Phase 2: spend any leftover budget on the highest-urgency
    // remaining candidates, cycling objectives review → weak →
    // progression so no objective starves the others.
    'fill: while plan.total_seconds < budget {
        for pass in 0..3 {
            if plan.total_seconds >= budget {
                break 'fill;
            }
            if pass == 0 {
                while ri < reviews.len() && plan.total_seconds + config.review_seconds <= budget {
                    let r = &reviews[ri];
                    if count(&per_modality, &r.modality) < config.max_per_modality {
                        *per_modality.entry(r.modality).or_insert(0) += 1;
                        plan.items.push(PlannedItem {
                            item_id: r.item_id.clone(),
                            content_id: r.content_id.clone(),
                            modality: r.modality,
                            reason: PlanReason::DueReview,
                            est_seconds: config.review_seconds,
                        });
                        plan.total_seconds += config.review_seconds;
                    }
                    ri += 1;
                }
            } else if pass == 1 {
                while wi < weak.len() && plan.total_seconds + config.weak_seconds <= budget {
                    let w = &weak[wi];
                    if count(&per_modality, &w.dimension) < config.max_per_modality {
                        *per_modality.entry(w.dimension).or_insert(0) += 1;
                        plan.items.push(PlannedItem {
                            item_id: format!("{}:{}", w.content_id, serde_key(w.dimension)),
                            content_id: w.content_id.clone(),
                            modality: w.dimension,
                            reason: PlanReason::WeakSkill,
                            est_seconds: config.weak_seconds,
                        });
                        plan.total_seconds += config.weak_seconds;
                    }
                    wi += 1;
                }
            } else {
                while pi < progression.len()
                    && plan.total_seconds + config.progression_seconds <= budget
                {
                    let p = &progression[pi];
                    if count(&per_modality, &p.modality) < config.max_per_modality {
                        *per_modality.entry(p.modality).or_insert(0) += 1;
                        plan.items.push(PlannedItem {
                            item_id: format!("{}:{}", p.content_id, serde_key(p.modality)),
                            content_id: p.content_id.clone(),
                            modality: p.modality,
                            reason: PlanReason::Progression,
                            est_seconds: config.progression_seconds,
                        });
                        plan.total_seconds += config.progression_seconds;
                    }
                    pi += 1;
                }
            }
        }
        // One full pass made no progress (all candidates exhausted or
        // blocked by modality caps): stop.
        if ri >= reviews.len() && wi >= weak.len() && pi >= progression.len() {
            break 'fill;
        }
    }

    Ok(plan)
}

fn count(per: &std::collections::HashMap<ActivityModality, usize>, m: &ActivityModality) -> usize {
    per.get(m).copied().unwrap_or(0)
}

fn serde_key(m: ActivityModality) -> String {
    format!("{m:?}").to_lowercase()
}
