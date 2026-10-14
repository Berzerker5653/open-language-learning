//! WRITE-001 acceptance:
//! 1. IME/keyboard input works without requiring handwriting;
//! 2. writing production evidence is distinct from recognition.

use lts_activity::{
    ActivityKind, ActivityRuntime, Attempt, InputSurface, SupportAction, WritingHint, WritingTask,
    classify_type, dimension_for, grade_writing, render_writing_prompt,
};
use lts_domain::{
    ActivityModality, ContentId, EventId, MasteryDimension, MasteryState, ProfileId, Score,
};
use lts_langpack::Pack;
use lts_learner_model::policy::Policy;
use std::path::PathBuf;

fn cid(s: &str) -> ContentId {
    ContentId::parse(s).unwrap()
}

fn task() -> WritingTask {
    WritingTask {
        item_id: "ja.lex.demo.watashi".into(),
        answer: "私".into(),
        accepted: vec!["わたし".into()],
        prompt_text: "I (neutral polite)".into(),
        answer_reading: Some("わたし".into()),
        answer_romaji: Some("watashi".into()),
    }
}

#[test]
fn keyboard_is_the_only_input_surface_no_handwriting_required() {
    // The pack type routes to the retrieval family; the writing
    // dimension comes from modality, and the render surface is always
    // keyboard text (IME). No handwriting/stroke concept exists.
    assert_eq!(classify_type("produce").unwrap(), ActivityKind::Retrieval);
    assert_eq!(
        dimension_for(
            lts_activity::ActivityKind::Retrieval,
            lts_activity::PackModality::Writing
        ),
        MasteryDimension::ProductionWriting
    );

    let prompt = render_writing_prompt(&task(), WritingHint::None);
    assert_eq!(prompt.input_surface, InputSurface::Keyboard);
    let json = serde_json::to_string(&prompt).unwrap();
    assert!(json.contains("\"input_surface\":\"keyboard\""));
    assert!(!json.contains("stroke"));
    assert!(!json.contains("hand"));
}

#[test]
fn grading_accepts_canonical_and_declared_variants() {
    let t = task();
    let g = grade_writing("私", &t);
    assert!(g.correct && !g.matched_variant);
    // IME candidates sometimes carry stray whitespace.
    let g = grade_writing(" プライベート ", &t);
    assert!(!g.correct);
    let g = grade_writing("わたし", &t);
    assert!(g.correct && g.matched_variant);
    let g = grade_writing("私は", &t);
    assert!(!g.correct);
    let g = grade_writing("", &t);
    assert!(!g.correct);
}

#[test]
fn a_miss_carries_the_form_the_task_asked_for() {
    // Review finding I03: the practice hub promises that a miss shows the form
    // it expected. The verdict carries it; the task the learner sees before
    // answering never does (K-12).
    let t = task();
    let miss = grade_writing("私は", &t);
    assert!(!miss.correct);
    assert_eq!(miss.expected, "私");
    let empty = grade_writing("", &t);
    assert_eq!(empty.expected, "私");
    let prompt = serde_json::to_string(&render_writing_prompt(&t, WritingHint::None)).unwrap();
    assert!(!prompt.contains("私"));
    assert!(!prompt.contains("\"answer\""));
}

#[test]
fn hints_are_support_not_answers() {
    let t = task();
    let p = render_writing_prompt(&t, WritingHint::Reading);
    assert_eq!(p.reading_hint.as_deref(), Some("わたし"));
    assert_eq!(p.support_reveals, vec![SupportAction::SuppliedReading]);
    let p = render_writing_prompt(&t, WritingHint::Romaji);
    assert_eq!(p.romaji_hint.as_deref(), Some("watashi"));
    assert_eq!(p.support_reveals, vec![SupportAction::RomajiReveal]);
}

#[test]
fn writing_evidence_is_distinct_from_recognition() {
    let dir =
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../tests/fixtures/packs/valid-full");
    let pack = Pack::load_dir(&dir).unwrap();
    let rt = ActivityRuntime::from_pack(&pack).unwrap();
    let activity = rt.render("es.activity.intro.type-script").unwrap();
    assert_eq!(activity.dimension, MasteryDimension::ProductionWriting);

    let attempt = Attempt::begin(
        &activity,
        vec![cid("es.lex.greet.hola")],
        Some("g1".into()),
        Some(cid("es.expr.greet.hola")),
    );
    let outcome = attempt.submit(
        Score::Correct,
        EventId::new("w1"),
        "2026-10-03T10:00:00Z",
        ProfileId::new("p1"),
    );
    assert_eq!(
        outcome.evidence.modality,
        ActivityModality::ProductionWriting
    );
    assert!(outcome.independent_success);

    // Derivation: writing success moves ProductionWriting only;
    // recognition dimensions stay unseen (docs/03 §2, LEARN-002).
    let policy_text = std::fs::read_to_string(
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../docs/assessment/MASTERY_POLICY.yaml"),
    )
    .unwrap();
    let policy = Policy::load(&policy_text).unwrap();
    let events = vec![outcome.evidence.clone()];
    let writing = lts_learner_model::derive::derive_mastery(
        &policy,
        "es.lex.greet.hola",
        MasteryDimension::ProductionWriting,
        &events,
        &[],
        "2026-10-03T12:00:00Z",
    )
    .unwrap();
    assert_ne!(writing.state, MasteryState::Unseen);
    for dim in [
        MasteryDimension::ComprehensionReading,
        MasteryDimension::RecallMeaning,
        MasteryDimension::ComprehensionListening,
    ] {
        let other = lts_learner_model::derive::derive_mastery(
            &policy,
            "es.lex.greet.hola",
            dim,
            &events,
            &[],
            "2026-10-03T12:00:00Z",
        )
        .unwrap();
        assert_eq!(other.state, MasteryState::Unseen, "{dim:?} polluted");
    }
}
