//! SCENARIO-001 acceptance:
//! 1. pack-defined graph supports intents, support ladder, recovery
//!    branches, and transfer variants;
//! 2. no Japanese-specific branch logic in the runtime.

use lts_activity::{PackScenario, ScenarioSession, StepResult, TransferAttempt, TransferStart};
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

/// Perform a node's FULL declared action set (SCENARIO-INTERACTION-001)
/// and return the final step result. Correct-but-incomplete clicks must
/// report PartialAccepted on the way.
fn complete_node(session: &mut ScenarioSession) -> StepResult {
    let acts: Vec<String> = session.current_node().expected_actions.clone();
    assert!(
        !acts.is_empty(),
        "fixture nodes declare at least one action"
    );
    let last = acts.len() - 1;
    let mut final_r: Option<StepResult> = None;
    for (i, a) in acts.iter().enumerate() {
        let got = session.attempt(a);
        if i < last {
            assert_eq!(
                got,
                StepResult::PartialAccepted {
                    remaining: last - i
                }
            );
        } else {
            final_r = Some(got);
        }
    }
    final_r.expect("non-empty action set")
}

#[test]
fn graph_supports_intents_ladder_recovery_and_transfers() {
    let scenario = load("valid-full", "intro.yaml");
    let mut s = ScenarioSession::begin(&scenario, "sess-1").unwrap();

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

    // Success edges need the FULL declared set (SCENARIO-INTERACTION-001):
    // the open node declares greeting AND self-introduction, so the
    // first is accepted but leaves the node owed one action.
    assert_eq!(
        s.attempt("greeting"),
        StepResult::PartialAccepted { remaining: 1 }
    );
    assert_eq!(
        s.attempt("self-introduction"),
        StepResult::Advanced {
            to: "es.activity.intro.meeting.ask-name".into()
        }
    );
    // The ask-name node declares a single action: one click completes.
    assert_eq!(s.attempt("name-question"), StepResult::Completed);

    // Transfer variants (SCENARIO-TRANSFER-001): an unknown variant is
    // refused; a declared one opens its payload, and only performing the
    // payload meets the requirement. A wrong recall answer counts nothing.
    assert_eq!(
        s.start_transfer("es.scenario.intro.nonexistent"),
        TransferStart::UnknownVariant
    );
    assert!(!s.transfer_requirement_met());
    let opened = s.start_transfer("es.scenario.intro.meeting.formal");
    assert!(
        matches!(&opened, TransferStart::Opened { mode, .. } if mode == "recall"),
        "{opened:?}"
    );
    // Opening the payload is not completing it.
    assert!(!s.transfer_requirement_met());
    assert_eq!(
        s.attempt_transfer("just a bare done click"),
        TransferAttempt::NotSatisfied
    );
    assert!(!s.transfer_requirement_met());
    assert_eq!(
        s.attempt_transfer("Buenos días. Me llamo Alex."),
        TransferAttempt::Completed
    );
    assert!(s.transfer_requirement_met());

    let out = s.finish();
    assert_eq!(out.nodes.len(), 2);
    assert_eq!(out.nodes[0].support_level, 3);
    // wrong + recovery + greeting + self-introduction
    assert_eq!(out.nodes[0].attempts, 4);
    assert!(out.transfer_requirement_met);
}

#[test]
fn evidence_events_record_support_per_node() {
    let scenario = load("valid-full", "intro.yaml");
    let mut s = ScenarioSession::begin(&scenario, "sess-1").unwrap();
    s.use_support(3);
    complete_node(&mut s); // open: greeting + self-introduction
    complete_node(&mut s); // ask-name: name-question
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
    // SCENARIO-INTERACTION-001 (finding S-03): the ask-name node had no
    // ladder pressed, but a label-guided scenario click is never stamped
    // independent — it floors at the `supported` band so the
    // independent-stage rule (support ≤ 1) cannot consume it.
    assert_eq!(events[1].support_level.value(), 2);
    assert_eq!(
        events[0].modality,
        lts_domain::ActivityModality::Interaction
    );
    assert_eq!(
        events[0].attempt_group_id.as_deref(),
        Some("es.scenario.intro.meeting:sess-1:es.activity.intro.meeting.open")
    );
    assert_eq!(
        events[0].prompt_family_id.as_ref().map(|p| p.as_str()),
        Some("es.activity.intro.meeting.open"),
        "the node the learner answered is the prompt"
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
        let mut s = ScenarioSession::begin(scenario, "sess-runtime").unwrap();
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

        // The pack's accepted intents walk the graph to completion —
        // every node on its FULL declared set (SCENARIO-INTERACTION-001).
        assert!(matches!(complete_node(&mut s), StepResult::Advanced { .. }));
        assert_eq!(complete_node(&mut s), StepResult::Completed);
        // SCENARIO-TRANSFER-001 over both languages with the SAME code:
        // the transfer is earned by answering the payload's recall, never
        // by a flag. The accepted wording comes from the pack itself.
        let variant = scenario.transfer_variants[0].id.clone();
        let accepted = scenario.transfer_variants[0]
            .payload
            .as_ref()
            .expect("required variants carry payloads")
            .expected[0]
            .clone();
        let opened = s.start_transfer(&variant);
        assert!(
            matches!(&opened, TransferStart::Opened { mode, .. } if mode == "recall"),
            "{opened:?}"
        );
        assert_eq!(s.attempt_transfer(&accepted), TransferAttempt::Completed);
        assert!(s.transfer_requirement_met());
    }
}

#[test]
fn ja_seed_first_meeting_graph_runs_end_to_end() {
    // K-06: the reference pack's populated graph must be consumable by
    // the runtime, not only schema-valid.
    let dir = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../languages/ja-JP");
    let pack = Pack::load_dir(&dir).unwrap();
    let scenario: PackScenario = pack
        .instances()
        .iter()
        .filter(|i| i.schema == "scenario")
        .find(|i| i.file.contains("first-meeting"))
        .map(|i| serde_json::from_value(i.value.clone()).unwrap())
        .expect("seed first-meeting scenario");
    assert_eq!(scenario.nodes.len(), 3);
    // SCENARIO-TRANSFER-001 (S-04): shipped draft packs no longer claim
    // a transfer requirement they cannot honour.
    assert_eq!(scenario.transfer_variants_required, 0);

    let mut s = ScenarioSession::begin(&scenario, "sess-ja").unwrap();
    // Wrong intent at the opening node names the pack-defined repair.
    assert_eq!(
        s.attempt("say-closing"),
        StepResult::NotSatisfied {
            recovery: vec!["ja.scenario.first-meeting.greeting.repair-repeat".into()]
        }
    );
    assert!(s.enter_recovery("ja.scenario.first-meeting.greeting.repair-repeat"));
    assert_eq!(
        s.attempt("ask-repeat"),
        StepResult::Advanced {
            to: "ja.scenario.first-meeting.greeting.open".into()
        }
    );
    // Support ladder: only declared levels (0/3/5) are accepted.
    assert!(s.use_support(3));
    assert!(!s.use_support(1));
    // Walk the greeting chain to completion. SCENARIO-INTERACTION-001:
    // single-action nodes take one click; the introduce node declares a
    // FULL set (state-first-meeting + state-name) and only advances once
    // both are performed.
    assert_eq!(
        s.attempt("respond-greeting"),
        StepResult::Advanced {
            to: "ja.scenario.first-meeting.greeting.introduce".into()
        }
    );
    assert_eq!(
        s.attempt("state-first-meeting"),
        StepResult::PartialAccepted { remaining: 1 }
    );
    assert_eq!(
        s.attempt("state-name"),
        StepResult::Advanced {
            to: "ja.scenario.first-meeting.greeting.close".into()
        }
    );
    assert_eq!(s.attempt("say-closing"), StepResult::Completed);
    // SCENARIO-TRANSFER-001 (finding S-04), branch B for this shipped
    // pack: the drafts carry no completable payload, so the requirement
    // was removed (0) rather than kept as a checkbox gate. The declared
    // variant descriptions survive, but the engine refuses to open one —
    // no click sequence can stamp a transfer here.
    assert_eq!(scenario.transfer_variants_required, 0);
    assert_eq!(
        s.start_transfer("ja.scenario.first-meeting.greeting.classmate"),
        TransferStart::NoPayload
    );
    assert_eq!(
        s.attempt_transfer("done"),
        TransferAttempt::NoActiveTransfer
    );
    assert!(!s.transfer_done("ja.scenario.first-meeting.greeting.classmate"));

    let out = s.finish();
    assert_eq!(out.nodes.len(), 3);
    assert!(out.nodes.iter().all(|n| n.succeeded));
    // With the requirement honestly removed, the completed walk completes:
    // 0 required is met by construction, not by a decorative flag.
    assert!(out.transfer_requirement_met);
    assert!(out.completed);
}

/// Review finding R03: the same scenario run twice must not share event ids
/// or attempt groups. Keyed on the scenario id alone, a replay collided
/// with the first run: the store's `ON CONFLICT(event_id) DO NOTHING`
/// discarded the second run's rows, and the policy treated a later sitting
/// as a retry of the first.
#[test]
fn replaying_a_scenario_is_a_separate_sitting() {
    let scenario = load("valid-full", "intro.yaml");
    let run = |session: &str| -> Vec<String> {
        let mut s = ScenarioSession::begin(&scenario, session).unwrap();
        complete_node(&mut s); // open: greeting + self-introduction
        complete_node(&mut s); // ask-name: name-question
        let out = s.finish();
        ScenarioSession::evidence_events(
            &out,
            "org.openlanguage.test-full",
            "0.1.0",
            &lts_domain::ProfileId::new("p1"),
            |i| format!("2026-10-0{i}:12:00:00Z"),
        )
        .iter()
        .map(|e| {
            format!(
                "{}|{}",
                e.event_id.as_str(),
                e.attempt_group_id.as_deref().unwrap_or("")
            )
        })
        .collect()
    };
    let first = run("sess-a");
    let second = run("sess-b");
    assert_eq!(first.len(), 2);
    assert_eq!(second.len(), 2);
    for row in &second {
        assert!(
            !first.contains(row),
            "the replay reused a first-run identity: {row}"
        );
    }
}
