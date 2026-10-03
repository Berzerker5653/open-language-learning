//! JA-RES-005: the Japanese grammar/pragmatics dependency map (draft
//! pack ja-curriculum-draft) validates clean — no cycles, no missing
//! dependencies, mirror agrees with content — and the concept layer
//! covers every required_concept referenced by the goal graph.

use lts_langpack::{Mode, Pack, Severity};
use std::collections::HashSet;
use std::path::PathBuf;

fn pack() -> Pack {
    let dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../tests/fixtures/packs/ja-curriculum-draft");
    Pack::load_dir(&dir).expect("ja draft pack must load")
}

#[test]
fn validator_reports_no_cycles_or_missing_dependencies() {
    let diags = pack().validate(Mode::Scaffold, None);
    for code in [
        "prerequisite_cycle",
        "missing_dependency",
        "dependency_graph_mismatch",
    ] {
        let hits: Vec<&str> = diags
            .iter()
            .filter(|d| d.code == code)
            .map(|d| d.message.as_str())
            .collect();
        assert!(hits.is_empty(), "{code}: {hits:?}");
    }
    assert_eq!(
        diags
            .iter()
            .filter(|d| d.severity == Severity::Error)
            .count(),
        0,
        "errors: {:?}",
        diags
            .iter()
            .filter(|d| d.severity == Severity::Error)
            .map(|d| &d.message)
            .collect::<Vec<_>>()
    );
}

#[test]
fn concepts_cover_every_goal_required_concept() {
    let p = pack();
    let mut available: HashSet<String> = HashSet::new();
    let mut goals: Vec<(String, Vec<String>)> = Vec::new();
    for inst in p.instances() {
        if let Some(id) = inst.value.get("id").and_then(|v| v.as_str()) {
            available.insert(id.to_string());
        }
        if inst.schema == "goal" {
            let id = inst.value["id"].as_str().unwrap().to_string();
            let reqs = inst
                .value
                .get("required_concepts")
                .and_then(|v| v.as_array())
                .map(|a| {
                    a.iter()
                        .filter_map(|s| s.as_str().map(String::from))
                        .collect()
                })
                .unwrap_or_default();
            goals.push((id, reqs));
        }
    }
    assert!(!goals.is_empty(), "draft pack must carry goals");
    for (goal, reqs) in &goals {
        for r in reqs {
            assert!(
                available.contains(r),
                "goal {goal} requires concept {r} which is not defined in the pack"
            );
        }
    }
}

#[test]
fn politeness_is_contextual_not_binary() {
    // The pragmatics contract models multiple named registers on a
    // formality scale plus situation→register mappings; there is no
    // single polite/plain switch.
    let p = pack();
    let prag = p
        .instances()
        .iter()
        .find(|i| i.schema == "pragmatics")
        .expect("pragmatics document")
        .value
        .clone();
    let registers = prag["registers"].as_array().unwrap();
    assert!(registers.len() >= 5, "expected multiple registers");
    let formality: HashSet<Option<i64>> = registers
        .iter()
        .map(|r| r.get("formality").and_then(|v| v.as_i64()))
        .collect();
    assert!(formality.len() >= 3, "registers must span formality levels");
    let situations = prag["situations"].as_array().unwrap();
    assert!(!situations.is_empty());
    // At least one situation maps to more than one typical register:
    // choice is contextual, not a switch.
    assert!(situations.iter().any(|s| {
        s.get("typical_registers")
            .and_then(|v| v.as_array())
            .map(|a| a.len() > 1)
            .unwrap_or(false)
    }));
}
