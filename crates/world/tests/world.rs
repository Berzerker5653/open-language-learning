//! GAME-001 acceptance:
//! 1. capabilities unlock environments/interactions, not daily
//!    activity (the API has no activity/date input at all; identical
//!    capability snapshots give identical unlocks);
//! 2. world layer is pure logic — no graphics dependency; engine
//!    tests never touch this crate.

use lts_domain::{ActivityModality, MasteryState};
use lts_world::{CapabilityRequirement, CapabilitySnapshot, Environment, WorldConfig, evaluate};
use std::collections::HashMap;

fn config() -> WorldConfig {
    WorldConfig {
        environments: vec![
            Environment {
                id: "cafe".into(),
                display_name: "Quiet café".into(),
                requires: vec![CapabilityRequirement {
                    content_id: "ja.lex.demo.konnichiwa".into(),
                    modality: ActivityModality::ComprehensionReading,
                    min_state: MasteryState::Independent,
                }],
            },
            Environment {
                id: "market".into(),
                display_name: "Busy market".into(),
                requires: vec![CapabilityRequirement {
                    content_id: "ja.lex.demo.konnichiwa".into(),
                    modality: ActivityModality::ComprehensionListening,
                    min_state: MasteryState::Supported,
                }],
            },
        ],
        version: "world-demo-0.1.0".into(),
    }
}

fn snapshot(entries: &[(&str, ActivityModality, MasteryState)]) -> CapabilitySnapshot {
    CapabilitySnapshot {
        states: entries
            .iter()
            .map(|(c, m, s)| ((c.to_string(), *m), *s))
            .collect(),
    }
}

#[test]
fn capabilities_unlock_not_anything_else() {
    let s = snapshot(&[(
        "ja.lex.demo.konnichiwa",
        ActivityModality::ComprehensionReading,
        MasteryState::Independent,
    )]);
    let statuses = evaluate(&config(), &s);
    let cafe = statuses.iter().find(|e| e.id == "cafe").unwrap();
    let market = statuses.iter().find(|e| e.id == "market").unwrap();
    assert!(cafe.unlocked, "reading capability opens the café");
    assert!(!market.unlocked, "listening capability is still missing");
    assert_eq!(market.missing.len(), 1);
    assert_eq!(
        market.missing[0].modality,
        ActivityModality::ComprehensionListening
    );
}

#[test]
fn evaluation_is_deterministic_in_capabilities_only() {
    // Same capability state, different insertion order: identical
    // unlocks. There is no activity-count, date, or streak parameter
    // anywhere in the API, so engagement volume cannot unlock content.
    let a = snapshot(&[
        (
            "ja.lex.demo.konnichiwa",
            ActivityModality::ComprehensionReading,
            MasteryState::Independent,
        ),
        (
            "ja.lex.demo.konnichiwa",
            ActivityModality::ComprehensionListening,
            MasteryState::Supported,
        ),
    ]);
    let mut states = HashMap::new();
    states.insert(
        (
            "ja.lex.demo.konnichiwa".to_string(),
            ActivityModality::ComprehensionListening,
        ),
        MasteryState::Supported,
    );
    states.insert(
        (
            "ja.lex.demo.konnichiwa".to_string(),
            ActivityModality::ComprehensionReading,
        ),
        MasteryState::Independent,
    );
    let b = CapabilitySnapshot { states };
    assert_eq!(evaluate(&config(), &a), evaluate(&config(), &b));
    assert!(evaluate(&config(), &a).iter().all(|e| e.unlocked));
}

#[test]
fn state_order_is_monotonic() {
    for (have, need, ok) in [
        (MasteryState::Supported, MasteryState::Independent, false),
        (MasteryState::Independent, MasteryState::Independent, true),
        (MasteryState::Flexible, MasteryState::Independent, true),
        (MasteryState::Retained, MasteryState::Flexible, true),
    ] {
        let s = snapshot(&[(
            "ja.lex.demo.konnichiwa",
            ActivityModality::ComprehensionReading,
            have,
        )]);
        let mut cfg = config();
        cfg.environments.truncate(1);
        cfg.environments[0].requires[0].min_state = need;
        assert_eq!(evaluate(&cfg, &s)[0].unlocked, ok, "{have:?} vs {need:?}");
    }
}
