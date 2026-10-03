//! Versioned mastery policy (LEARN-005): loads
//! `docs/assessment/MASTERY_POLICY.yaml`, validates its invariants, and
//! provides the deterministic transition evaluator used by the worked
//! fixtures. LEARN-002 extends this with confidence scoring and
//! prerequisite health; the policy itself is frozen until documented
//! revision.

use lts_domain::{ActivityModality, AssessmentKind, MasteryState, Outcome, Score};
use serde::Deserialize;

#[derive(Debug, Clone, Deserialize)]
pub struct Policy {
    pub policy_version: String,
    pub schema_version: u32,
    pub status: String,
    pub states: Vec<String>,
    pub eligibility: Eligibility,
    pub support: Support,
    pub evidence: Evidence,
    pub transitions: Transitions,
    pub regression: Regression,
    pub fixtures_dir: String,
    pub fixtures: Vec<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct Eligibility {
    pub counted_outcomes: Vec<String>,
    pub never_linguistic: Vec<String>,
    pub require_score_for_scored: bool,
}

#[derive(Debug, Clone, Deserialize)]
pub struct Support {
    pub independent_max_level: u8,
    pub supported_max_level: u8,
}

#[derive(Debug, Clone, Deserialize)]
pub struct Evidence {
    pub attempt_grouping: AttemptGrouping,
    pub partial_credit: PartialCredit,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AttemptGrouping {
    pub one_observation_per_group: bool,
    pub group_representative: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct PartialCredit {
    pub counts_for: Vec<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct Transitions {
    pub introduced: Introduced,
    pub supported: Supported,
    pub independent: Independent,
    pub flexible: Flexible,
    pub retained: Retained,
}

#[derive(Debug, Clone, Deserialize)]
pub struct Introduced {
    pub min_valid_events: usize,
}

#[derive(Debug, Clone, Deserialize)]
pub struct Supported {
    pub min_successes: usize,
    pub max_support_level: u8,
}

#[derive(Debug, Clone, Deserialize)]
pub struct Independent {
    pub min_successes: usize,
    pub max_support_level: u8,
    pub min_distinct_prompts: usize,
}

#[derive(Debug, Clone, Deserialize)]
pub struct Flexible {
    pub min_successes: usize,
    pub max_support_level: u8,
    pub min_distinct_prompt_families: usize,
    pub requires_assessment_kinds: Vec<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct Retained {
    pub requires_prior_state: Vec<String>,
    pub min_delay_days: i64,
    pub min_successes_after_delay: usize,
    pub max_support_level: u8,
}

#[derive(Debug, Clone, Deserialize)]
pub struct Regression {
    pub stale_after_days_without_valid_evidence: i64,
    pub downgrade_on_confident_mismatch: bool,
    pub consecutive_mismatches_to_downgrade: usize,
    pub downgrade_steps: usize,
}

impl Policy {
    pub fn load(text: &str) -> Result<Self, String> {
        let policy: Policy = serde_yaml::from_str(text).map_err(|e| e.to_string())?;
        policy.validate()?;
        Ok(policy)
    }

    /// Structural invariants the policy artifact must satisfy
    /// (LEARN-005 acceptance).
    pub fn validate(&self) -> Result<(), String> {
        let canonical: Vec<String> = [
            MasteryState::Unseen,
            MasteryState::Introduced,
            MasteryState::Supported,
            MasteryState::Independent,
            MasteryState::Flexible,
            MasteryState::Retained,
        ]
        .iter()
        .map(|s| {
            serde_json::to_string(s)
                .unwrap()
                .trim_matches('"')
                .to_string()
        })
        .collect();
        if self.states != canonical {
            return Err(format!(
                "states must be the canonical machine names {canonical:?}, got {:?}",
                self.states
            ));
        }
        if self.status != "provisional-hypotheses" {
            return Err(
                "thresholds must be marked provisional-hypotheses until calibrated (docs/03 §5)"
                    .into(),
            );
        }
        if self.eligibility.counted_outcomes != ["scored"] {
            return Err("only scored outcomes may be counted".into());
        }
        for never in &self.eligibility.never_linguistic {
            if ![
                "technical-failure",
                "abstained",
                "skipped",
                "deferred",
                "excluded",
            ]
            .contains(&never.as_str())
            {
                return Err(format!("unexpected never_linguistic outcome {never}"));
            }
        }
        if self.support.independent_max_level > self.support.supported_max_level {
            return Err("independent_max_level must not exceed supported_max_level".into());
        }
        if self.transitions.independent.min_successes < 2
            || self.transitions.independent.min_distinct_prompts < 2
        {
            return Err(
                "a single correct response cannot establish durable mastery (docs/03 §5)".into(),
            );
        }
        if self.transitions.retained.min_delay_days <= 0 {
            return Err("retained requires a positive declared delay".into());
        }
        if self.regression.downgrade_on_confident_mismatch
            && self.regression.consecutive_mismatches_to_downgrade < 1
        {
            return Err("mismatch downgrade needs a positive trigger count".into());
        }
        if self.fixtures.is_empty() {
            return Err("the policy must ship worked fixtures".into());
        }
        Ok(())
    }
}

/// A fixture event: the simplified, deterministic form of an
/// `EvidenceEvent` used by worked examples.
#[derive(Debug, Clone, Deserialize)]
pub struct FixEvent {
    pub event_id: String,
    pub occurred_at: String,
    pub modality: ActivityModality,
    pub outcome: Outcome,
    pub score: Option<Score>,
    pub support_level: u8,
    pub activity_id: String,
    pub prompt_family_id: Option<String>,
    pub assessment_kind: Option<AssessmentKind>,
    pub attempt_group_id: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct FixCorrection {
    pub event_id: String,
    pub references: Vec<String>,
    #[serde(default)]
    pub reason: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct Expectation {
    pub dimension: ActivityModality,
    pub expected_state: MasteryState,
}

#[derive(Debug, Clone, Deserialize)]
pub struct Fixture {
    pub name: String,
    pub events: Vec<FixEvent>,
    #[serde(default)]
    pub corrections: Vec<FixCorrection>,
    pub expectations: Vec<Expectation>,
    #[serde(default)]
    pub notes: String,
}

/// A derived decision always carries the policy version in effect
/// (recorded into mastery_snapshots by LEARN-002).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Decision {
    pub dimension: ActivityModality,
    pub state: MasteryState,
    pub policy_version: String,
}

/// One observation after attempt-group collapsing.
pub struct Obs {
    pub at: i64,
    pub score: Score,
    pub support: u8,
    pub prompt: String,
    pub family: String,
    pub assessment: Option<AssessmentKind>,
}

pub fn epoch_seconds(ts: &str) -> Result<i64, String> {
    // Strict RFC 3339 UTC: YYYY-MM-DDTHH:MM:SSZ
    let (date, time) = ts
        .split_once('T')
        .ok_or_else(|| format!("bad timestamp {ts}"))?;
    let time = time
        .strip_suffix('Z')
        .ok_or_else(|| format!("timestamp must be UTC {ts}"))?;
    let mut nums = Vec::new();
    for part in date.split('-').chain(time.split(':')) {
        nums.push(
            part.parse::<i64>()
                .map_err(|_| format!("bad timestamp {ts}"))?,
        );
    }
    if nums.len() != 6 {
        return Err(format!("bad timestamp {ts}"));
    }
    let (y, m, d) = (nums[0], nums[1], nums[2]);
    // Days since epoch (Howard Hinnant's civil algorithm).
    let y = if m <= 2 { y - 1 } else { y };
    let era = (if y >= 0 { y } else { y - 399 }) / 400;
    let yoe = y - era * 400;
    let mp = (m + 9) % 12;
    let doy = (153 * mp + 2) / 5 + d - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    Ok((era * 146097 + doe - 719468) * 86400 + nums[3] * 3600 + nums[4] * 60 + nums[5])
}

/// Raw observation input before attempt-group collapsing.
pub struct ObsInput<'a> {
    pub event_id: &'a str,
    pub occurred_at: &'a str,
    pub score: Score,
    pub support: u8,
    pub prompt_family_id: Option<&'a str>,
    pub attempt_group_id: Option<&'a str>,
    pub assessment: Option<AssessmentKind>,
}

/// Collapse attempt groups (one observation per group, last scored wins)
/// and return time-ordered observations.
pub fn observations(policy: &Policy, mut inputs: Vec<ObsInput<'_>>) -> Result<Vec<Obs>, String> {
    inputs.sort_by(|a, b| (a.occurred_at, a.event_id).cmp(&(b.occurred_at, b.event_id)));
    let mut obs: Vec<Obs> = Vec::new();
    let mut by_group: std::collections::HashMap<&str, usize> = std::collections::HashMap::new();
    for e in inputs {
        let o = Obs {
            at: epoch_seconds(e.occurred_at)?,
            score: e.score,
            support: e.support,
            prompt: e.prompt_family_id.unwrap_or(e.event_id).to_string(),
            family: e.prompt_family_id.unwrap_or(e.event_id).to_string(),
            assessment: e.assessment,
        };
        match e.attempt_group_id {
            Some(g) if policy.evidence.attempt_grouping.one_observation_per_group => {
                match by_group.get(g) {
                    Some(&idx) => obs[idx] = o,
                    None => {
                        by_group.insert(g, obs.len());
                        obs.push(o);
                    }
                }
            }
            _ => obs.push(o),
        }
    }
    Ok(obs)
}

/// Apply the frozen transition ladder and regression rules.
pub fn ladder(policy: &Policy, obs: &[Obs]) -> MasteryState {
    let t = &policy.transitions;
    let full = |o: &Obs, max_support: u8| o.score == Score::Correct && o.support <= max_support;

    let mut state = MasteryState::Unseen;
    if obs.len() >= t.introduced.min_valid_events {
        state = MasteryState::Introduced;
    }
    let sup_ok: Vec<&Obs> = obs
        .iter()
        .filter(|o| {
            (o.score == Score::Correct
                || policy
                    .evidence
                    .partial_credit
                    .counts_for
                    .iter()
                    .any(|s| s == "supported" && o.score == Score::PartiallyCorrect))
                && o.support <= t.supported.max_support_level
        })
        .collect();
    if sup_ok.len() >= t.supported.min_successes {
        state = MasteryState::Supported;
    }
    let ind_ok: Vec<&Obs> = obs
        .iter()
        .filter(|o| full(o, t.independent.max_support_level))
        .collect();
    let distinct_prompts: std::collections::HashSet<&str> =
        ind_ok.iter().map(|o| o.prompt.as_str()).collect();
    if ind_ok.len() >= t.independent.min_successes
        && distinct_prompts.len() >= t.independent.min_distinct_prompts
    {
        state = MasteryState::Independent;
    }
    let flex_ok: Vec<&Obs> = obs
        .iter()
        .filter(|o| full(o, t.flexible.max_support_level))
        .collect();
    let families: std::collections::HashSet<&str> =
        flex_ok.iter().map(|o| o.family.as_str()).collect();
    let has_novel_assessment = flex_ok.iter().any(|o| {
        o.assessment.map(|a| {
            let name = serde_json::to_string(&a)
                .unwrap()
                .trim_matches('"')
                .to_string();
            t.flexible
                .requires_assessment_kinds
                .iter()
                .any(|k| k == &name)
        }) == Some(true)
    });
    if flex_ok.len() >= t.flexible.min_successes
        && families.len() >= t.flexible.min_distinct_prompt_families
        && has_novel_assessment
    {
        state = MasteryState::Flexible;
    }
    if (state == MasteryState::Independent || state == MasteryState::Flexible)
        && t.retained.requires_prior_state.iter().any(|s| {
            (s == "independent" && state == MasteryState::Independent)
                || (s == "flexible" && state == MasteryState::Flexible)
        })
    {
        let mut times: Vec<i64> = ind_ok.iter().map(|o| o.at).collect();
        times.sort();
        if times.len() >= t.independent.min_successes {
            let established = times[t.independent.min_successes - 1];
            let delayed = flex_ok
                .iter()
                .filter(|o| {
                    o.support <= t.retained.max_support_level
                        && o.at - established >= t.retained.min_delay_days * 86_400
                })
                .count();
            if delayed >= t.retained.min_successes_after_delay {
                state = MasteryState::Retained;
            }
        }
    }

    if policy.regression.downgrade_on_confident_mismatch {
        let mismatches = obs
            .iter()
            .rev()
            .take_while(|o| {
                o.score == Score::Incorrect && o.support <= policy.support.supported_max_level
            })
            .count();
        if mismatches >= policy.regression.consecutive_mismatches_to_downgrade {
            for _ in 0..policy.regression.downgrade_steps {
                state = match state {
                    MasteryState::Retained => MasteryState::Flexible,
                    MasteryState::Flexible => MasteryState::Independent,
                    MasteryState::Independent => MasteryState::Supported,
                    MasteryState::Supported => MasteryState::Introduced,
                    s => s,
                };
            }
        }
    }
    state
}

/// Deterministically derive the state for one dimension of one content
/// target from fixture events, per the frozen policy.
pub fn derive(
    policy: &Policy,
    fixture: &Fixture,
    dimension: ActivityModality,
) -> Result<Decision, String> {
    let excluded: std::collections::HashSet<&str> = fixture
        .corrections
        .iter()
        .flat_map(|c| c.references.iter().map(|r| r.as_str()))
        .collect();
    let inputs: Vec<ObsInput<'_>> = fixture
        .events
        .iter()
        .filter(|e| e.modality == dimension)
        .filter(|e| !excluded.contains(e.event_id.as_str()))
        .filter(|e| e.outcome == Outcome::Scored && e.score.is_some())
        .map(|e| ObsInput {
            event_id: &e.event_id,
            occurred_at: &e.occurred_at,
            score: e.score.unwrap(),
            support: e.support_level,
            prompt_family_id: e.prompt_family_id.as_deref(),
            attempt_group_id: e.attempt_group_id.as_deref(),
            assessment: e.assessment_kind,
        })
        .collect();
    let obs = observations(policy, inputs)?;
    Ok(Decision {
        dimension,
        state: ladder(policy, &obs),
        policy_version: policy.policy_version.clone(),
    })
}
