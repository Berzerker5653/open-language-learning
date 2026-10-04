//! ACT-001 acceptance:
//! 1. encounter/comprehension/retrieval/explanation render from pack data;
//! 2. hints/replays/translations emit support evidence;
//! 3. correct answer with strong help is not independent success.

use lts_activity::{ActivityKind, ActivityRuntime, SupportAction, classify_type, dimension_for};
use lts_domain::{ContentId, EventId, ProfileId, Score, SupportLevel};
use lts_langpack::Pack;
use std::path::PathBuf;

fn pack() -> Pack {
    let dir =
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../tests/fixtures/packs/valid-full");
    Pack::load_dir(&dir).unwrap()
}

fn cid(s: &str) -> ContentId {
    ContentId::parse(s).unwrap()
}

#[test]
fn all_four_activity_kinds_render_from_pack_data() {
    let pack = pack();
    let rt = ActivityRuntime::from_pack(&pack).unwrap();
    let encounter = rt.render("es.activity.intro.encounter").unwrap();
    assert_eq!(encounter.kind, ActivityKind::Encounter);
    assert_eq!(encounter.prompt.content[0].forms[0].text, "hola");

    let comprehension = rt.render("es.activity.intro.match").unwrap();
    assert_eq!(comprehension.kind, ActivityKind::Comprehension);
    assert_eq!(comprehension.prompt.content[0].forms[0].text, "hola");
    assert_eq!(
        comprehension.prompt.concepts[0].id,
        "es.grammar.gender.noun"
    );

    let retrieval = rt.render("es.activity.intro.recall").unwrap();
    assert_eq!(retrieval.kind, ActivityKind::Retrieval);
    assert_eq!(
        retrieval.dimension,
        lts_domain::MasteryDimension::RecallMeaning
    );

    let explanation = rt.render("es.activity.intro.why").unwrap();
    assert_eq!(explanation.kind, ActivityKind::Explanation);
    assert_eq!(
        explanation.dimension,
        lts_domain::MasteryDimension::GrammarControlled
    );
    assert_eq!(explanation.prompt.concepts.len(), 1);

    // Scenario activity renders its pack-declared nodes + ladder.
    let scenario = rt.render("es.activity.intro.scenario").unwrap();
    let sc = scenario.scenario.clone().expect("scenario rendered");
    assert_eq!(sc.nodes.len(), 2);
    assert_eq!(sc.nodes[0].prompt, "Greet your new colleague");
    assert_eq!(sc.support_ladder.len(), 2);
    assert_eq!(sc.support_ladder[1].support_level, 3);

    // Every render carries the default support options for the ladder UI.
    assert!(!scenario.support_options.is_empty());
    assert_eq!(scenario.support_options[0].action, "context-cue");
}

#[test]
fn hints_replays_translations_emit_support_evidence() {
    let pack = pack();
    let rt = ActivityRuntime::from_pack(&pack).unwrap();
    let activity = rt.render("es.activity.intro.encounter").unwrap();

    let mut attempt = lts_activity::Attempt::begin(
        &activity,
        vec![cid("es.lex.greet.hola")],
        Some("group-1".into()),
        Some(cid("es.expr.greet.hola")),
    );
    attempt.use_support(SupportAction::Replay);
    attempt.use_support(SupportAction::FullTranslation);
    let out = attempt.submit(
        Score::Correct,
        EventId::new("e1"),
        "2026-10-03T12:00:00Z",
        ProfileId::new("p1"),
    );

    // Acceptance 2: concrete actions + ordinal summary in the event.
    assert_eq!(
        out.evidence.support_actions,
        vec!["replay".to_string(), "full-translation".to_string()]
    );
    assert_eq!(out.evidence.support_level, SupportLevel::new(5).unwrap());
    assert_eq!(out.support_level, 5);
    assert_eq!(out.evidence.outcome, lts_domain::Outcome::Scored);
    assert_eq!(out.evidence.score, Some(Score::Correct));
    assert_eq!(out.evidence.attempt_group_id.as_deref(), Some("group-1"));
}

#[test]
fn correct_with_strong_help_is_not_independent_success() {
    let pack = pack();
    let rt = ActivityRuntime::from_pack(&pack).unwrap();
    let activity = rt.render("es.activity.intro.recall").unwrap();

    // Independent: correct with no support.
    let attempt = lts_activity::Attempt::begin(
        &activity,
        vec![cid("es.lex.greet.hola")],
        None,
        Some(cid("es.expr.greet.hola")),
    );
    let independent = attempt.submit(
        Score::Correct,
        EventId::new("e-indep"),
        "2026-10-03T12:00:00Z",
        ProfileId::new("p1"),
    );
    assert!(independent.independent_success);
    assert_eq!(independent.support_level, 0);

    // Same correct answer, strong help: never independent.
    let mut attempt = lts_activity::Attempt::begin(
        &activity,
        vec![cid("es.lex.greet.hola")],
        None,
        Some(cid("es.expr.greet.hola")),
    );
    attempt.use_support(SupportAction::WordBank);
    attempt.use_support(SupportAction::ResponseTemplate);
    let helped = attempt.submit(
        Score::Correct,
        EventId::new("e-helped"),
        "2026-10-03T12:05:00Z",
        ProfileId::new("p1"),
    );
    assert!(!helped.independent_success);
    assert_eq!(helped.support_level, 4);
    assert_eq!(helped.evidence.score, Some(Score::Correct));

    // End-to-end: the versioned mastery policy treats the two differently.
    let text = std::fs::read_to_string(
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../docs/assessment/MASTERY_POLICY.yaml"),
    )
    .unwrap();
    let policy = lts_learner_model::policy::Policy::load(&text).unwrap();
    let helped_state = lts_learner_model::derive::derive_mastery(
        &policy,
        "es.lex.greet.hola",
        activity.dimension,
        &[helped.evidence],
        &[],
        "2026-10-03T13:00:00Z",
    )
    .unwrap();
    let independent_events = vec![independent.evidence.clone(), {
        let a = lts_activity::Attempt::begin(
            &activity,
            vec![cid("es.lex.greet.hola")],
            None,
            Some(cid("es.expr.greet.adios")),
        );
        a.submit(
            Score::Correct,
            EventId::new("e-indep-2"),
            "2026-10-03T12:10:00Z",
            ProfileId::new("p1"),
        )
        .evidence
    }];
    let independent_state = lts_learner_model::derive::derive_mastery(
        &policy,
        "es.lex.greet.hola",
        activity.dimension,
        &independent_events,
        &[],
        "2026-10-03T13:00:00Z",
    )
    .unwrap();
    assert_eq!(
        independent_state.state,
        lts_domain::MasteryState::Independent
    );
    assert_ne!(helped_state.state, independent_state.state);
    assert!(helped_state.confidence < independent_state.confidence);
}

#[test]
fn unknown_activity_types_are_rejected() {
    assert!(classify_type("charade").is_err());
    assert_eq!(
        classify_type("read-and-match").unwrap(),
        ActivityKind::Comprehension
    );
    assert_eq!(classify_type("scenario").unwrap(), ActivityKind::Retrieval);
    assert_eq!(classify_type("encounter").unwrap(), ActivityKind::Encounter);
    assert_eq!(
        classify_type("explain-why").unwrap(),
        ActivityKind::Explanation
    );
    assert_eq!(
        classify_type("minimal-pair").unwrap(),
        ActivityKind::Discrimination
    );
    assert_eq!(classify_type("hvpt").unwrap(), ActivityKind::Discrimination);
    assert_eq!(classify_type("shadow").unwrap(), ActivityKind::Shadowing);
    assert_eq!(classify_type("cloze").unwrap(), ActivityKind::Retrieval);
    assert_eq!(classify_type("dictation").unwrap(), ActivityKind::Dictation);
}

#[test]
fn modality_dimension_mapping_is_conservative() {
    use lts_activity::PackModality;
    use lts_domain::MasteryDimension;
    assert_eq!(
        dimension_for(ActivityKind::Comprehension, PackModality::Listening),
        MasteryDimension::ComprehensionListening
    );
    assert_eq!(
        dimension_for(ActivityKind::Retrieval, PackModality::Speaking),
        MasteryDimension::ProductionSpeaking
    );
    assert_eq!(
        dimension_for(ActivityKind::Retrieval, PackModality::Reading),
        MasteryDimension::RecallMeaning
    );
    // K-10: perceptual discrimination never lands on a production
    // dimension, even though it is listening-based.
    assert_eq!(
        dimension_for(ActivityKind::Discrimination, PackModality::Listening),
        MasteryDimension::PhonologicalDiscrimination
    );
    // K-11: shadowing maps to production-speaking for a future
    // calibrated path, but the runtime itself is formative-only.
    assert_eq!(
        dimension_for(ActivityKind::Shadowing, PackModality::Speaking),
        MasteryDimension::ProductionSpeaking
    );
    // K-12: dictation never lands on production-writing (MASTERY_POLICY
    // lists dictation-of-target as disqualifying support there).
    assert_eq!(
        dimension_for(ActivityKind::Dictation, PackModality::Listening),
        MasteryDimension::OrthographicEncoding
    );
    // Cloze is typed recall from context: production-writing stands.
    assert_eq!(
        dimension_for(ActivityKind::Retrieval, PackModality::Writing),
        MasteryDimension::ProductionWriting
    );
    assert_eq!(
        dimension_for(ActivityKind::Explanation, PackModality::Writing),
        MasteryDimension::GrammarControlled
    );
    assert_eq!(
        dimension_for(ActivityKind::Encounter, PackModality::Interaction),
        MasteryDimension::Interaction
    );
}
