//! LEARN-002 acceptance: reading success does not grant speaking
//! mastery; support weakens evidence strength; regression/needs-refresh
//! are possible; algorithm version is recorded with every decision.

use lts_domain::{ActivityModality, ContentId, EventId, ProfileId, Score, SupportLevel};
use lts_learner_model::policy::Policy;
use lts_learner_model::{ALGORITHM_VERSION, AttemptDraft};
use lts_storage::{MasterySnapshot, Store};
use std::path::PathBuf;

fn policy() -> Policy {
    let text = std::fs::read_to_string(
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../docs/assessment/MASTERY_POLICY.yaml"),
    )
    .unwrap();
    Policy::load(&text).unwrap()
}

fn cid(s: &str) -> ContentId {
    ContentId::parse(s).unwrap()
}

fn attempt(
    modality: ActivityModality,
    score: Score,
    support: u8,
    family: &str,
    at: &str,
    id: &str,
) -> lts_domain::EvidenceEvent {
    AttemptDraft::new(
        vec![cid("es.lex.greet.hola")],
        modality,
        cid("es.activity.recall-choice"),
        "org.openlanguage.test",
        "0.1.0",
    )
    .prompt_family(cid(family))
    .support(SupportLevel::new(support).unwrap(), vec![])
    .scored(score)
    .finish(EventId::new(id), at, ProfileId::new("p1"))
}

#[test]
fn reading_success_never_grants_speaking_mastery() {
    let p = policy();
    let events = vec![
        attempt(
            ActivityModality::ComprehensionReading,
            Score::Correct,
            0,
            "es.expr.greet.hola",
            "2026-10-02T12:00:00Z",
            "r1",
        ),
        attempt(
            ActivityModality::ComprehensionReading,
            Score::Correct,
            0,
            "es.expr.greet.adious",
            "2026-10-02T12:05:00Z",
            "r2",
        ),
    ];
    let now = "2026-10-03T12:00:00Z";
    let reading = lts_learner_model::derive::derive_mastery(
        &p,
        "es.lex.greet.hola",
        ActivityModality::ComprehensionReading,
        &events,
        &[],
        now,
    )
    .unwrap();
    let speaking = lts_learner_model::derive::derive_mastery(
        &p,
        "es.lex.greet.hola",
        ActivityModality::ProductionSpeaking,
        &events,
        &[],
        now,
    )
    .unwrap();
    assert_eq!(reading.state, lts_domain::MasteryState::Independent);
    assert_eq!(speaking.state, lts_domain::MasteryState::Unseen);
    assert_eq!(speaking.confidence, 0.0);
}

#[test]
fn supported_success_is_weaker_evidence_than_independent() {
    let p = policy();
    let supported: Vec<_> = [
        attempt(
            ActivityModality::RecallMeaning,
            Score::Correct,
            2,
            "es.expr.greet.hola",
            "2026-10-02T12:00:00Z",
            "s1",
        ),
        attempt(
            ActivityModality::RecallMeaning,
            Score::Correct,
            2,
            "es.expr.greet.adious",
            "2026-10-02T12:05:00Z",
            "s2",
        ),
    ]
    .into();
    let independent: Vec<_> = [
        attempt(
            ActivityModality::RecallMeaning,
            Score::Correct,
            0,
            "es.expr.greet.hola",
            "2026-10-02T12:00:00Z",
            "i1",
        ),
        attempt(
            ActivityModality::RecallMeaning,
            Score::Correct,
            0,
            "es.expr.greet.adious",
            "2026-10-02T12:05:00Z",
            "i2",
        ),
    ]
    .into();
    let now = "2026-10-03T12:00:00Z";
    let a = lts_learner_model::derive::derive_mastery(
        &p,
        "es.lex.greet.hola",
        ActivityModality::RecallMeaning,
        &supported,
        &[],
        now,
    )
    .unwrap();
    let b = lts_learner_model::derive::derive_mastery(
        &p,
        "es.lex.greet.hola",
        ActivityModality::RecallMeaning,
        &independent,
        &[],
        now,
    )
    .unwrap();
    assert_eq!(a.state, lts_domain::MasteryState::Supported);
    assert_eq!(b.state, lts_domain::MasteryState::Independent);
    assert!(
        a.confidence < b.confidence,
        "supported {} must be weaker than independent {}",
        a.confidence,
        b.confidence
    );
    // Uncalibrated: never near certainty.
    assert!(b.confidence <= 0.9);
}

#[test]
fn regression_and_needs_refresh_are_possible() {
    let p = policy();
    let mut events = vec![
        attempt(
            ActivityModality::RecallMeaning,
            Score::Correct,
            0,
            "es.expr.greet.hola",
            "2026-10-01T12:00:00Z",
            "c1",
        ),
        attempt(
            ActivityModality::RecallMeaning,
            Score::Correct,
            0,
            "es.expr.greet.adious",
            "2026-10-01T12:05:00Z",
            "c2",
        ),
    ];
    let fresh = lts_learner_model::derive::derive_mastery(
        &p,
        "es.lex.greet.hola",
        ActivityModality::RecallMeaning,
        &events,
        &[],
        "2026-10-02T12:00:00Z",
    )
    .unwrap();
    assert_eq!(fresh.state, lts_domain::MasteryState::Independent);
    assert!(!fresh.needs_refresh);

    // Two confident mismatches regress one step.
    events.push(attempt(
        ActivityModality::RecallMeaning,
        Score::Incorrect,
        0,
        "es.expr.greet.hola",
        "2026-10-20T12:00:00Z",
        "m1",
    ));
    events.push(attempt(
        ActivityModality::RecallMeaning,
        Score::Incorrect,
        0,
        "es.expr.greet.adious",
        "2026-10-20T12:01:00Z",
        "m2",
    ));
    let regressed = lts_learner_model::derive::derive_mastery(
        &p,
        "es.lex.greet.hola",
        ActivityModality::RecallMeaning,
        &events,
        &[],
        "2026-10-21T12:00:00Z",
    )
    .unwrap();
    assert_eq!(regressed.state, lts_domain::MasteryState::Supported);

    // Long silence => needs_refresh (display guidance, not a state).
    let stale = lts_learner_model::derive::derive_mastery(
        &p,
        "es.lex.greet.hola",
        ActivityModality::RecallMeaning,
        &events,
        &[],
        "2026-12-15T12:00:00Z",
    )
    .unwrap();
    assert!(stale.needs_refresh);
}

#[test]
fn snapshots_record_algorithm_and_policy_versions() {
    let p = policy();
    let store = Store::in_memory().unwrap();
    let prof = store.create_profile("Ana", "2026-10-01T09:00:00Z").unwrap();
    let events = vec![
        attempt(
            ActivityModality::RecallMeaning,
            Score::Correct,
            0,
            "es.expr.greet.hola",
            "2026-10-02T12:00:00Z",
            "c1",
        ),
        attempt(
            ActivityModality::RecallMeaning,
            Score::Correct,
            0,
            "es.expr.greet.adious",
            "2026-10-02T12:05:00Z",
            "c2",
        ),
    ];
    let d = lts_learner_model::derive::derive_mastery(
        &p,
        "es.lex.greet.hola",
        ActivityModality::RecallMeaning,
        &events,
        &[],
        "2026-10-03T12:00:00Z",
    )
    .unwrap();
    store
        .record_mastery_snapshot(
            &prof.id,
            &MasterySnapshot {
                content_id: d.content_id.clone(),
                dimension: serde_json::to_string(&d.dimension)
                    .unwrap()
                    .trim_matches('"')
                    .to_string(),
                state: serde_json::to_string(&d.state)
                    .unwrap()
                    .trim_matches('"')
                    .to_string(),
                confidence: Some(d.confidence as f64),
                algorithm_version: d.algorithm_version.clone(),
                policy_version: d.policy_version.clone(),
                computed_at: "2026-10-03T12:00:00Z".into(),
            },
        )
        .unwrap();
    let snaps = store.latest_mastery(&prof.id).unwrap();
    assert_eq!(snaps.len(), 1);
    assert_eq!(snaps[0].algorithm_version, ALGORITHM_VERSION);
    assert_eq!(snaps[0].policy_version, p.policy_version);
    assert_eq!(snaps[0].state, "independent");
}
