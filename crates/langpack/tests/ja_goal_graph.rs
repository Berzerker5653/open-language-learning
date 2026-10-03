//! JA-RES-004: the Japanese communicative goal graph validates
//! against the v0.2 goal schema, spans on-ramp..B2, has scoped
//! prerequisite records that resolve inside the graph without cycles,
//! and every goal carries modalities + an assessment plan.

use lts_langpack::schema::SchemaSet;
use serde_yaml::Value;
use std::collections::{HashMap, HashSet};

fn goals() -> Vec<Value> {
    let path = concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/../../docs/curriculum/JA_GOAL_GRAPH.yaml"
    );
    let text = std::fs::read_to_string(path).expect("goal graph must exist");
    let doc: Value = serde_yaml::from_str(&text).expect("goal graph must parse");
    doc["goals"].as_sequence().expect("goals sequence").clone()
}

#[test]
fn every_goal_validates_against_v02_goal_schema() {
    let set = SchemaSet::load().unwrap();
    let v = set.validator("goal", true).unwrap();
    for g in goals() {
        let json = serde_json::to_value(&g).unwrap();
        let errors: Vec<String> = v.iter_errors(&json).map(|e| format!("{e}")).collect();
        assert!(
            errors.is_empty(),
            "goal {} schema errors: {errors:#?}",
            g["id"].as_str().unwrap_or("?")
        );
    }
}

#[test]
fn bands_cover_onramp_through_release_band() {
    let mut seen: HashSet<String> = HashSet::new();
    for g in goals() {
        seen.insert(g["band"].as_str().unwrap().to_string());
    }
    for band in ["on-ramp", "A1", "A2", "B1", "B2"] {
        assert!(seen.contains(band), "no goals in band {band}");
    }
}

#[test]
fn prerequisites_resolve_and_are_acyclic() {
    let gs = goals();
    let ids: HashSet<String> = gs
        .iter()
        .map(|g| g["id"].as_str().unwrap().to_string())
        .collect();
    let mut edges: HashMap<String, Vec<String>> = HashMap::new();
    for g in &gs {
        let id = g["id"].as_str().unwrap().to_string();
        let mut deps = Vec::new();
        for p in g["prerequisites"].as_sequence().unwrap() {
            // versioned record shape (schema enforces fields; here we
            // check the target resolves inside the graph)
            let target = p["target"].as_str().unwrap().to_string();
            assert!(
                ids.contains(&target),
                "dangling prerequisite {target} in {id}"
            );
            deps.push(target);
        }
        edges.insert(id, deps);
    }
    // DFS cycle check.
    fn visit(n: &str, edges: &HashMap<String, Vec<String>>, state: &mut HashMap<String, u8>) {
        match state.get(n).copied().unwrap_or(0) {
            1 => panic!("cycle through goal {n}"),
            2 => return,
            _ => {}
        }
        state.insert(n.to_string(), 1);
        for d in edges.get(n).map(|v| v.as_slice()).unwrap_or(&[]) {
            visit(d, edges, state);
        }
        state.insert(n.to_string(), 2);
    }
    let mut state = HashMap::new();
    for id in &ids {
        visit(id, &edges, &mut state);
    }
}

#[test]
fn goals_have_modalities_assessments_and_framework_refs() {
    for g in goals() {
        let id = g["id"].as_str().unwrap();
        assert!(
            !g["modalities"].as_sequence().unwrap().is_empty(),
            "{id} lacks modalities"
        );
        assert!(
            !g["assessment_ids"].as_sequence().unwrap().is_empty(),
            "{id} lacks an assessment plan"
        );
        assert!(
            !g["framework_refs"].as_sequence().unwrap().is_empty(),
            "{id} lacks framework references"
        );
        // AI-assisted drafts are never self-certified as reviewed.
        assert_eq!(g["review_status"].as_str().unwrap(), "draft", "{id}");
    }
}
