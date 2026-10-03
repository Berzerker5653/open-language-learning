//! SCENARIO-001 acceptance:
//! 1. pack-defined graph supports intents, support ladder, recovery
//!    branches, and transfer variants;
//! 2. no Japanese-specific branch logic in the runtime.

use lts_activity::{PackScenario, ScenarioSession, StepResult};
use lts_langpack::Pack;
use std::path::PathBuf;

fn load(pack: &str, scenario_file_contains: &str) -> PackScenario {
    let dir = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../tests/fixtures/packs/");
    let pack = Pack::load_dir(&dir.join(pack)).unwrap();
    pack.instances()
        .iter()
        .filter(|i| i.schema == "scenario")
        .find(|i| i.file.contains(scenario_file_contains))
        .map(|i| serde_json::from_value(i.value.clone()).unwrap())
        .expect("scenario instance")
}

fn walk(session: &mut ScenarioSession, intents: &[&str]) -> Vec<StepResult> {
    intents.iter().map(|i| session.attempt(i)).collect()
}

#[test]
fn graph_supports_intents_ladder_recovery_and_transfers() {
    let scenario = load("valid-full", "intro.yaml");
    let mut s = ScenarioSession::begin(&scenario).unwrap();

    // Intents: wrong action is rejected and names the pack-defined
    // recovery branches.
    assert_eq!(
        s.attempt("small-talk"),
        StepResult::NotSatisfied {
            recovery: vec!["es.activity.intro.meeting.repair-repeat".into()]
        }
    );

    // Recovery branch: its own prompt + intents; resolving returns to
    // the declared target.
    assert!(s.enter_recovery("es.activity.intro.meeting.repair-repeat"));
    let (prompt, actions) = s.active_prompt();
    assert_eq!(prompt, "You were not understood; ask them to repeat");
    assert_eq!(actions, &["request-repetition".to_string()]);
    assert_eq!(
        s.attempt("request-repetition"),
        StepResult::Advanced {
            to: "es.activity.intro.meeting.open".into()
        }
    );

    // Support ladder: only declared levels are accepted.
    assert!(s.use_support(3));
    assert!(!s.use_support(5));
    assert_eq!(s.support_level().value(), 3);

    // Success edges: greeting advances, name-question completes.
    let results = walk(&mut s, &["greeting", "name-question"]);
    assert_eq!(
        results[0],
        StepResult::Advanced {
            to: "es.activity.intro.meeting.ask-name".into()
        }
    );
    assert_eq!(results[1], StepResult::Completed);

    // Transfer variants: only pack-declared ids count; requirement met.
    assert!(!s.complete_transfer("es.scenario.intro.nonexistent"));
    assert!(s.complete_transfer("es.scenario.intro.meeting.formal"));
    assert!(s.transfer_requirement_met());

    let out = s.finish();
    assert_eq!(out.nodes.len(), 2);
    assert_eq!(out.nodes[0].support_level, 3);
    assert_eq!(out.nodes[0].attempts, 3); // wrong + recovery + greeting
    assert!(out.transfer_requirement_met);
}

#[test]
fn evidence_events_record_support_per_node() {
    let scenario = load("valid-full", "intro.yaml");
    let mut s = ScenarioSession::begin(&scenario).unwrap();
    s.use_support(3);
    s.attempt("greeting");
    s.attempt("name-question");
    let out = s.finish();
    let events = ScenarioSession::evidence_events(
        &out,
        "org.openlanguage.test-full",
        "0.1.0",
        &lts_domain::ProfileId::new("p1"),
        |i| format!("2026-10-03T12:0{i}:00Z"),
    );
    assert_eq!(events.len(), 2);
    assert_eq!(events[0].support_level.value(), 3);
    assert_eq!(events[1].support_level.value(), 0);
    assert_eq!(
        events[0].modality,
        lts_domain::ActivityModality::Interaction
    );
    assert_eq!(
        events[0].attempt_group_id.as_deref(),
        Some("es.scenario.intro.meeting:es.activity.intro.meeting.open")
    );
}

#[test]
fn runtime_is_language_agnostic() {
    // The SAME code path drives a Spanish and a Japanese scenario:
    // identical step shapes, identical recovery mechanics. All branch
    // decisions come from pack data, never from language literals.
    let es = load("valid-full", "intro.yaml");
    let ja = load("ja-curriculum-draft", "service.yaml");

    for scenario in [&es, &ja] {
        let mut s = ScenarioSession::begin(scenario).unwrap();
        let first = s.current_node().id.clone();

        // A wrong intent at the opening node yields recovery options.
        let wrong = s.attempt("totally-unrelated-intent");
        assert!(matches!(wrong, StepResult::NotSatisfied { .. }));

        // The pack's recovery branch resolves back to the opening node.
        let recovery_id = match wrong {
            StepResult::NotSatisfied { recovery } => recovery[0].clone(),
            _ => unreachable!(),
        };
        assert!(s.enter_recovery(&recovery_id));
        let actions = s.active_prompt().1.to_vec();
        assert_eq!(
            s.attempt(&actions[0]),
            StepResult::Advanced { to: first.clone() }
        );

        // The pack's accepted intents walk the graph to completion.
        let node = s.current_node();
        let ok = node.expected_actions[0].clone();
        assert!(matches!(s.attempt(&ok), StepResult::Advanced { .. }));
        let node = s.current_node();
        let ok2 = node.expected_actions[0].clone();
        assert_eq!(s.attempt(&ok2), StepResult::Completed);
        let variant = scenario.transfer_variants[0].id.clone();
        assert!(s.complete_transfer(&variant));
        assert!(s.transfer_requirement_met());
    }
}
