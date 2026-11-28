//! FIX-M2-SUPPLY-RU-001 takeover instrumentation: replay the mastery ladder
//! offline against a finished sim walk's evidence DB, using the EXACT engine
//! code (lts_learner_model::derive + lts_storage loader). No engine edits.
//!
//! Usage: m2probe <profiles.db> <goals.yaml> <policy.yaml> <profile_id> <t30> <t60>
//!   <t30>/<t60> = RFC3339 cutoffs; events after each cutoff are excluded.

use lts_domain::{ActivityModality, EvidenceEvent, MasteryState};
use lts_learner_model::derive::derive_mastery_in_pack;
use lts_learner_model::policy::Policy;
use serde::Deserialize;
use std::collections::{BTreeMap, HashMap, HashSet};

#[derive(Deserialize)]
struct GoalsFile {
    goals: Vec<PackGoal>,
}

#[derive(Deserialize)]
struct PackGoal {
    id: String,
    #[serde(default)]
    prerequisites: Vec<Prereq>,
    #[serde(default)]
    required_concepts: Vec<String>,
}

#[derive(Deserialize)]
struct Prereq {
    target: String,
    dimension: String,
    required_state: String,
    strength: String,
}

/// Mirror of apps/desktop/src-tauri/src/lib.rs::goal_derived_state.
fn goal_derived_state(
    goal: &PackGoal,
    dim: ActivityModality,
    derived: &[(String, ActivityModality, MasteryState)],
) -> (MasteryState, Option<String>) {
    if goal.required_concepts.is_empty() {
        return (MasteryState::Unseen, None);
    }
    let mut it = goal.required_concepts.iter();
    let first = it.next().unwrap();
    let state_of = |c: &str| {
        derived
            .iter()
            .find(|(cid, d, _)| cid == c && *d == dim)
            .map(|(_, _, s)| *s)
            .unwrap_or(MasteryState::Unseen)
    };
    let mut worst = state_of(first);
    let mut bottleneck = Some(first.clone());
    for c in it {
        let st = state_of(c);
        if st < worst {
            bottleneck = Some(c.clone());
            worst = st;
        }
    }
    (worst, bottleneck)
}

fn parse_state(s: &str) -> Option<MasteryState> {
    serde_json::from_value::<MasteryState>(serde_json::Value::String(s.to_string())).ok()
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<String> = std::env::args().collect();
    let (db_path, goals_path, policy_path, profile_id, t30, t60) = (
        &args[1], &args[2], &args[3], &args[4], &args[5], &args[6],
    );
    let store = lts_storage::Store::open(db_path)?;
    let events_all = store.evidence_for_profile(profile_id)?;
    let selected: HashSet<String> = store
        .selected_packs(profile_id)?
        .into_iter()
        .map(|(p, _)| p)
        .collect();
    let policy = Policy::load(&std::fs::read_to_string(policy_path)?)?;
    let goals: Vec<PackGoal> = serde_yaml::from_str::<GoalsFile>(&std::fs::read_to_string(
        goals_path,
    )?)?
    .goals;
    let goals_by_id: HashMap<&str, &PackGoal> =
        goals.iter().map(|g| (g.id.as_str(), g)).collect();

    // Hard goal->goal edges (the ladder) — the lock path unit_goal_locked uses.
    let mut hard_edges: Vec<(&str, &PackGoal)> = Vec::new();
    for g in &goals {
        for p in &g.prerequisites {
            if p.strength == "hard" && goals_by_id.contains_key(p.target.as_str()) {
                hard_edges.push((g.id.as_str(), g));
                break;
            }
        }
    }
    // Distinct (target, dim, req) edges
    let mut edges: BTreeMap<String, Vec<(&Prereq, &str)>> = BTreeMap::new();
    for g in &goals {
        for p in &g.prerequisites {
            if p.strength == "hard" && goals_by_id.contains_key(p.target.as_str()) {
                edges
                    .entry(format!("{}|{}|{}", p.target, p.dimension, p.required_state))
                    .or_default()
                    .push((p, g.id.as_str()));
            }
        }
    }

    // Shared required concepts across hard-edge targets.
    let mut shared: BTreeMap<&str, Vec<&str>> = BTreeMap::new();
    for (_, tgt, _, _) in edges.keys().map(|k| {
        let mut it = k.split('|');
        ((), it.next().unwrap(), it.next().unwrap(), it.next().unwrap())
    }) {
        if let Some(g) = goals_by_id.get(tgt) {
            for c in &g.required_concepts {
                shared.entry(c).or_default().push(tgt);
            }
        }
    }

    // Per-concept event counts (served evidence, per modality) — for "most-drilled".
    let mut served: HashMap<String, usize> = HashMap::new();
    for ev in &events_all {
        for t in &ev.targets {
            *served.entry(t.as_str().to_string()).or_default() += 1;
        }
    }

    println!("== distinct shared required_concepts across hard-edge targets: {}", shared.len());
    println!("== concept | total_served_events | per-dim state @t30 / @t60 (only dims with evidence) ==");
    let mut dump_concept_rows = |cutoff: &str, label: &str| -> Result<
        Vec<(String, ActivityModality, MasteryState)>,
        Box<dyn std::error::Error>,
    > {
        let mut evs: Vec<EvidenceEvent> = events_all
            .iter()
            .filter(|e| e.occurred_at.as_str() <= cutoff)
            .cloned()
            .collect();
        evs.sort_by(|a, b| a.occurred_at.cmp(&b.occurred_at));
        // Bucket like derive_pairs: (content, modality) with pack scoping.
        let mut buckets: HashMap<(String, ActivityModality), Vec<usize>> = HashMap::new();
        let mut owners: HashMap<String, Option<String>> = HashMap::new();
        for (idx, ev) in evs.iter().enumerate() {
            if !selected.is_empty() && !ev.pack_id.is_empty() && !selected.contains(&ev.pack_id) {
                continue;
            }
            for t in &ev.targets {
                buckets
                    .entry((t.as_str().to_string(), ev.modality))
                    .or_default()
                    .push(idx);
                let content = t.as_str();
                if ev.pack_id.is_empty() {
                    owners.insert(content.to_string(), None);
                } else {
                    let e = owners
                        .entry(content.to_string())
                        .or_insert_with(|| Some(ev.pack_id.clone()));
                    if e.as_deref() != Some(ev.pack_id.as_str()) {
                        *e = None;
                    }
                }
            }
        }
        let mut out: Vec<(String, ActivityModality, MasteryState)> = Vec::new();
        for ((content, dim), idxs) in buckets.iter() {
            let scope = owners
                .get(content)
                .and_then(|o| o.as_deref())
                .filter(|p| !p.is_empty());
            let pair_events: Vec<EvidenceEvent> = idxs.iter().map(|i| evs[*i].clone()).collect();
            let d = derive_mastery_in_pack(&policy, content, *dim, &pair_events, &[], cutoff, scope)?;
            out.push((d.content_id.clone(), d.dimension, d.state));
        }
        out.sort_by(|a, b| (&a.0, format!("{:?}", a.1)).cmp(&(&b.0, format!("{:?}", b.1))));
        println!("--- derived rows for shared concepts at {label} ({cutoff}) ---");
        for c in shared.keys() {
            let rows: Vec<_> = out
                .iter()
                .filter(|(cid, _, _)| cid == c)
                .map(|(_, d, s)| format!("{:?}={:?}", d, s))
                .collect();
            println!("{c} served={} {}", served.get(&c.to_string()).copied().unwrap_or(0), rows.join(" "));
        }
        Ok(out)
    };

    let d30 = dump_concept_rows(t30, "day30")?;
    let d60 = dump_concept_rows(t60, "day60")?;

    println!("== hard-edge unlock evaluation (unit_goal_locked path: target is a GOAL) ==");
    println!("edge(target|dim|required_state) | goal_derived_state t30/t60 | satisfied t30/t60 | bottleneck concept(s) at t60");
    let mut sat30 = 0usize;
    let mut sat60 = 0usize;
    for key in edges.keys() {
        let mut it = key.split('|');
        let tgt = it.next().unwrap();
        let dim_s = it.next().unwrap();
        let req_s = it.next().unwrap();
        let g = goals_by_id[tgt];
        let Some(dim) = serde_json::from_value::<ActivityModality>(serde_json::Value::String(
            dim_s.to_string(),
        ))
        .ok() else {
            println!("{key} | UNPARSEABLE DIMENSION");
            continue;
        };
        let Some(req) = parse_state(req_s) else {
            println!("{key} | UNPARSEABLE STATE");
            continue;
        };
        let (s30, _) = goal_derived_state(g, dim, &d30);
        let (s60, b60) = goal_derived_state(g, dim, &d60);
        if s30 >= req {
            sat30 += 1;
        }
        if s60 >= req {
            sat60 += 1;
        }
        // full bottleneck list at t60: every concept whose state == s60
        let bottlenecks: Vec<&String> = g
            .required_concepts
            .iter()
            .filter(|c| {
                let st = d60
                    .iter()
                    .find(|(cid, d, _)| cid == *c && *d == dim)
                    .map(|(_, _, s)| *s)
                    .unwrap_or(MasteryState::Unseen);
                st == s60
            })
            .collect();
        let bstr = if bottlenecks.len() <= 6 {
            bottlenecks.iter().map(|s| s.as_str()).collect::<Vec<_>>().join(",")
        } else {
            format!("{} concepts ({} total)", bottlenecks.len(), g.required_concepts.len())
        };
        println!("{key} | {s30:?}/{s60:?} | {}/{}, req {req:?} | min@t60: {bstr}", s30 >= req, s60 >= req);
    }
    println!("== hard edges total={} satisfied@t30={} satisfied@t60={}", edges.len(), sat30, sat60);
    if let Ok(path) = std::env::var("M2DUMP_ALL") {
        let mut s = String::new();
        for (cid, d, st) in &d60 {
            s.push_str(&format!("{cid}\t{d:?}\t{st:?}\n"));
        }
        std::fs::write(path, s)?;
    }
    Ok(())
}
