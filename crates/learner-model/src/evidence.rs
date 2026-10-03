//! Typed evidence construction for activities (LEARN-001). Activities
//! describe an attempt; the draft finalizes into an immutable
//! `EvidenceEvent` carrying support level, provider confidence, and the
//! content versions in effect. Technical speech failures are first-class
//! outcomes, never conflated with learner errors (docs/03 §3).

use lts_domain::{
    ActivityModality, AssessmentKind, ContentId, EventId, EvidenceEvent, Outcome, ProfileId, Score,
    SupportLevel,
};

/// An in-progress attempt not yet stamped with identity/time.
#[derive(Debug, Clone)]
pub struct AttemptDraft {
    targets: Vec<ContentId>,
    modality: ActivityModality,
    activity_id: ContentId,
    prompt_family_id: Option<ContentId>,
    attempt_group_id: Option<String>,
    support_level: SupportLevel,
    support_actions: Vec<String>,
    outcome: Outcome,
    score: Option<Score>,
    assessment_kind: Option<AssessmentKind>,
    held_out: bool,
    provider_confidence: Option<f32>,
    pack_id: String,
    pack_version: String,
    rubric_version: Option<String>,
    policy_version: Option<String>,
    provider_id: Option<String>,
    failure_reason: Option<String>,
}

impl AttemptDraft {
    /// Start a draft for an activity attempt on `targets`.
    pub fn new(
        targets: Vec<ContentId>,
        modality: ActivityModality,
        activity_id: ContentId,
        pack_id: impl Into<String>,
        pack_version: impl Into<String>,
    ) -> Self {
        Self {
            targets,
            modality,
            activity_id,
            prompt_family_id: None,
            attempt_group_id: None,
            support_level: SupportLevel::independent(),
            support_actions: Vec::new(),
            outcome: Outcome::Scored,
            score: None,
            assessment_kind: None,
            held_out: false,
            provider_confidence: None,
            pack_id: pack_id.into(),
            pack_version: pack_version.into(),
            rubric_version: None,
            policy_version: None,
            provider_id: None,
            failure_reason: None,
        }
    }

    pub fn prompt_family(mut self, id: ContentId) -> Self {
        self.prompt_family_id = Some(id);
        self
    }

    /// Immediate retries share one attempt group so they cannot create
    /// multiple independent observations (docs/03 §5).
    pub fn attempt_group(mut self, group: impl Into<String>) -> Self {
        self.attempt_group_id = Some(group.into());
        self
    }

    /// Support actually used; `actions` lists concrete scaffolds.
    pub fn support(mut self, level: SupportLevel, actions: Vec<String>) -> Self {
        self.support_level = level;
        self.support_actions = actions;
        self
    }

    pub fn scored(mut self, score: Score) -> Self {
        self.outcome = Outcome::Scored;
        self.score = Some(score);
        self.failure_reason = None;
        self
    }

    /// A provider/device failure: no linguistic meaning, recorded with a
    /// machine-readable reason and the responsible provider (docs/03 §3,
    /// docs/08). ASR success/failure never sets `score`.
    pub fn technical_failure(
        mut self,
        reason: impl Into<String>,
        provider_id: impl Into<String>,
    ) -> Self {
        self.outcome = Outcome::TechnicalFailure;
        self.score = None;
        self.failure_reason = Some(reason.into());
        self.provider_id = Some(provider_id.into());
        self
    }

    /// The assessor could not judge confidently; also no linguistic
    /// meaning, but distinct from a technical failure.
    pub fn abstained(mut self, reason: impl Into<String>, provider_id: impl Into<String>) -> Self {
        self.outcome = Outcome::Abstained;
        self.score = None;
        self.failure_reason = Some(reason.into());
        self.provider_id = Some(provider_id.into());
        self
    }

    /// Raw (uncalibrated) provider confidence; never treated as accuracy
    /// (docs/03 §12).
    pub fn provider_confidence(mut self, confidence: f32) -> Self {
        self.provider_confidence = Some(confidence);
        self
    }

    pub fn assessment_kind(mut self, kind: AssessmentKind) -> Self {
        self.assessment_kind = Some(kind);
        self
    }

    pub fn held_out(mut self, held_out: bool) -> Self {
        self.held_out = held_out;
        self
    }

    /// Interpretation versions recorded for reproducibility (docs/03 §3).
    pub fn versions(mut self, rubric: impl Into<String>, policy: impl Into<String>) -> Self {
        self.rubric_version = Some(rubric.into());
        self.policy_version = Some(policy.into());
        self
    }

    /// Freeze into the immutable event.
    pub fn finish(
        self,
        event_id: EventId,
        occurred_at: impl Into<String>,
        profile_id: ProfileId,
    ) -> EvidenceEvent {
        EvidenceEvent {
            event_id,
            occurred_at: occurred_at.into(),
            profile_id,
            targets: self.targets,
            modality: self.modality,
            activity_id: self.activity_id,
            prompt_family_id: self.prompt_family_id,
            attempt_group_id: self.attempt_group_id,
            support_level: self.support_level,
            support_actions: self.support_actions,
            outcome: self.outcome,
            score: self.score,
            assessment_kind: self.assessment_kind,
            held_out: self.held_out,
            provider_confidence: self.provider_confidence,
            pack_id: self.pack_id,
            pack_version: self.pack_version,
            rubric_version: self.rubric_version,
            policy_version: self.policy_version,
            provider_id: self.provider_id,
            failure_reason: self.failure_reason,
        }
    }
}
