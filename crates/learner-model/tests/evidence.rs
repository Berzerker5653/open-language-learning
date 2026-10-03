//! LEARN-001 acceptance: activities append typed evidence (support,
//! confidence, content versions); events survive restart; technical
//! speech failures are representable separately from learner errors.

use lts_domain::{ActivityModality, ContentId, EventId, Outcome, ProfileId, Score, SupportLevel};
use lts_learner_model::AttemptDraft;
use lts_storage::Store;

fn cid(s: &str) -> ContentId {
    ContentId::parse(s).unwrap()
}

fn attempt(profile: &ProfileId, id: &str) -> lts_domain::EvidenceEvent {
    AttemptDraft::new(
        vec![cid("es.lex.greet.hola")],
        ActivityModality::ProductionSpeaking,
        cid("es.activity.speak.repeat"),
        "org.openlanguage.test",
        "0.1.0",
    )
    .prompt_family(cid("es.expr.greet.hola"))
    .versions("rubric-v2", "policy-v1")
    .finish(EventId::new(id), "2026-10-02T12:00:00Z", profile.clone())
}

#[test]
fn typed_attempt_carries_support_confidence_and_versions() {
    let store = Store::in_memory().unwrap();
    let p = store.create_profile("Ana", "2026-10-02T09:00:00Z").unwrap();
    let profile = ProfileId::new(p.id.clone());

    let event = AttemptDraft::new(
        vec![cid("es.lex.greet.hola")],
        ActivityModality::ProductionSpeaking,
        cid("es.activity.speak.repeat"),
        "org.openlanguage.test",
        "0.1.0",
    )
    .attempt_group("retry-group-1")
    .support(
        SupportLevel::new(2).unwrap(),
        vec!["model-audio-replay".into()],
    )
    .scored(Score::PartiallyCorrect)
    .provider_confidence(0.62)
    .held_out(true)
    .versions("rubric-v2", "policy-v1")
    .finish(
        EventId::new("typed-1"),
        "2026-10-02T12:00:00Z",
        profile.clone(),
    );

    assert!(store.append_evidence(&event).unwrap());
    let events = store.evidence_for_profile(&p.id).unwrap();
    assert_eq!(events.len(), 1);
    let e = &events[0];
    assert_eq!(e.support_level, SupportLevel::new(2).unwrap());
    assert_eq!(e.support_actions, vec!["model-audio-replay"]);
    assert_eq!(e.provider_confidence, Some(0.62));
    assert_eq!(e.rubric_version.as_deref(), Some("rubric-v2"));
    assert_eq!(e.policy_version.as_deref(), Some("policy-v1"));
    assert_eq!(e.pack_version, "0.1.0");
    assert_eq!(e.attempt_group_id.as_deref(), Some("retry-group-1"));
    assert!(e.held_out);
    assert!(e.is_scored_evidence());
}

#[test]
fn events_remain_queryable_after_restart() {
    let dir = tempfile::tempdir().unwrap();
    let db = dir.path().join("learner.db");
    let profile = {
        let store = Store::open(&db).unwrap();
        let p = store.create_profile("Ana", "2026-10-02T09:00:00Z").unwrap();
        let profile = ProfileId::new(p.id.clone());
        assert!(store.append_evidence(&attempt(&profile, "e1")).unwrap());
        profile
    };
    // Simulated app restart: new Store over the same file.
    let store = Store::open(&db).unwrap();
    let events = store.evidence_for_profile(profile.as_str()).unwrap();
    assert_eq!(events.len(), 1);
    assert_eq!(events[0].event_id, EventId::new("e1"));
    assert_eq!(events[0].rubric_version.as_deref(), Some("rubric-v2"));
}

#[test]
fn technical_speech_failure_is_distinct_from_learner_error() {
    let store = Store::in_memory().unwrap();
    let p = store.create_profile("Ana", "2026-10-02T09:00:00Z").unwrap();
    let profile = ProfileId::new(p.id.clone());

    // Learner error: a real scored attempt.
    let learner_error = AttemptDraft::new(
        vec![cid("es.lex.greet.hola")],
        ActivityModality::ProductionSpeaking,
        cid("es.activity.speak.repeat"),
        "org.openlanguage.test",
        "0.1.0",
    )
    .scored(Score::Incorrect)
    .finish(
        EventId::new("err-1"),
        "2026-10-02T12:00:00Z",
        profile.clone(),
    );

    // Technical failure: ASR timeout, no score, machine-readable reason.
    let asr_failure = AttemptDraft::new(
        vec![cid("es.lex.greet.hola")],
        ActivityModality::ProductionSpeaking,
        cid("es.activity.speak.repeat"),
        "org.openlanguage.test",
        "0.1.0",
    )
    .technical_failure("asr-timeout", "local-asr-v1")
    .finish(
        EventId::new("tech-1"),
        "2026-10-02T12:01:00Z",
        profile.clone(),
    );

    assert!(store.append_evidence(&learner_error).unwrap());
    assert!(store.append_evidence(&asr_failure).unwrap());

    let events = store.evidence_for_profile(&p.id).unwrap();
    let scored: Vec<_> = events.iter().filter(|e| e.is_scored_evidence()).collect();
    let failures: Vec<_> = events
        .iter()
        .filter(|e| e.outcome == Outcome::TechnicalFailure)
        .collect();

    assert_eq!(scored.len(), 1);
    assert_eq!(scored[0].event_id, EventId::new("err-1"));
    assert_eq!(scored[0].score, Some(Score::Incorrect));

    assert_eq!(failures.len(), 1);
    assert_eq!(failures[0].event_id, EventId::new("tech-1"));
    assert_eq!(failures[0].failure_reason.as_deref(), Some("asr-timeout"));
    assert_eq!(failures[0].provider_id.as_deref(), Some("local-asr-v1"));
    assert_eq!(failures[0].score, None);
    assert!(!failures[0].is_scored_evidence());
}
