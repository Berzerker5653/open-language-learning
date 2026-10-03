//! Attempts: support ledger + honest evidence finalization
//! (ACT-001 acceptance 2 + 3).

use crate::spec::RenderedActivity;
use crate::support::{SupportAction, SupportLedger};
use lts_domain::{ContentId, EventId, EvidenceEvent, Outcome, ProfileId, Score, SupportLevel};
use lts_learner_model::AttemptDraft;

/// A finalized attempt: the immutable event plus honest classification.
#[derive(Debug, Clone)]
pub struct AttemptOutcome {
    pub evidence: EvidenceEvent,
    /// Ordinal support summary actually used.
    pub support_level: u8,
    /// True only for a correct answer with minimal help (docs/01:
    /// correct-with-strong-help is NOT independent success).
    pub independent_success: bool,
}

/// One in-progress attempt at a rendered activity.
pub struct Attempt {
    draft: AttemptDraft,
    ledger: SupportLedger,
}

impl Attempt {
    /// Begin an attempt for `activity`. `attempt_group_id` groups
    /// immediate retries so they cannot create multiple independent
    /// observations (docs/03 §5).
    pub fn begin(
        activity: &RenderedActivity,
        targets: Vec<ContentId>,
        attempt_group_id: Option<String>,
        prompt_family: Option<ContentId>,
    ) -> Self {
        let activity_id =
            ContentId::parse(&activity.activity_id).expect("pack ids are validated on load");
        let mut draft = AttemptDraft::new(
            targets,
            activity.dimension,
            activity_id,
            activity.pack_id.clone(),
            activity.pack_version.clone(),
        );
        if let Some(group) = attempt_group_id {
            draft = draft.attempt_group(group);
        }
        if let Some(family) = prompt_family {
            draft = draft.prompt_family(family);
        }
        Self {
            draft,
            ledger: SupportLedger::new(),
        }
    }

    /// Learner takes a scaffold. Recorded immediately: support revealed
    /// earlier in the attempt stays part of the attempt's evidence even
    /// if hidden before submission (docs/03 §5).
    pub fn use_support(&mut self, action: SupportAction) {
        self.ledger.record(action);
    }

    pub fn support_level(&self) -> SupportLevel {
        self.ledger.level()
    }

    /// Finalize a scored attempt into evidence.
    pub fn submit(
        self,
        score: Score,
        event_id: EventId,
        occurred_at: impl Into<String>,
        profile_id: ProfileId,
    ) -> AttemptOutcome {
        let support_level = self.ledger.level();
        let actions = self.ledger.action_labels();
        let evidence = self
            .draft
            .support(support_level, actions)
            .scored(score)
            .finish(event_id, occurred_at, profile_id);
        let independent_success = score == Score::Correct && support_level.is_minimal_help();
        AttemptOutcome {
            support_level: support_level.value(),
            independent_success,
            evidence,
        }
    }

    /// Learner chose not to attempt: recorded, but never linguistic
    /// evidence and never a failed rating (docs/03 §3).
    pub fn skip(
        self,
        event_id: EventId,
        occurred_at: impl Into<String>,
        profile_id: ProfileId,
    ) -> AttemptOutcome {
        let support_level = self.ledger.level();
        let actions = self.ledger.action_labels();
        let evidence =
            self.draft
                .support(support_level, actions)
                .finish(event_id, occurred_at, profile_id);
        // finish() keeps the default Scored outcome; force Skipped.
        let mut evidence = evidence;
        evidence.outcome = Outcome::Skipped;
        evidence.score = None;
        AttemptOutcome {
            support_level: support_level.value(),
            independent_success: false,
            evidence,
        }
    }
}
