//! Cross-file curriculum graph checks (PACK-002).
//!
//! Edges come from goal prerequisites (bare 0.1 ids or 0.2 records),
//! concept prerequisites (0.1), and the optional `grammar/dependencies.yaml`
//! mirror (`prerequisite_edges: [{from, to}]`), which must agree with the
//! authoritative content prerequisites. Cycles fail with the cycle path;
//! goals that are neither delivered (unit/scenario) nor gating (prerequisite
//! of a delivered goal, transitively) are reported by the audit.

use crate::diagnose::{Diagnostic, Severity};
use serde_json::Value;
use std::collections::{HashMap, HashSet};

/// (source, target) prerequisite edges plus the dependency-file mirror.
pub struct Graph {
    pub content_edges: Vec<(String, String)>,
    pub mirror_edges: Option<Vec<(String, String)>>,
    pub goals: Vec<String>,
    pub delivered: HashSet<String>,
}

/// Collect the graph from loaded instances and structural documents.
pub(crate) fn build(
    instances: &[crate::pack::Instance],
    structural: &[(String, Value)],
    v2: bool,
) -> Graph {
    let mut content_edges = Vec::new();
    let mut goals = Vec::new();
    let mut delivered = HashSet::new();

    for inst in instances {
        match inst.schema {
            "goal" => {
                if let Some(id) = inst.value.get("id").and_then(Value::as_str) {
                    goals.push(id.to_string());
                    if v2 {
                        for p in array(&inst.value, "prerequisites") {
                            if let Some(t) = p.1.get("target").and_then(Value::as_str) {
                                content_edges.push((id.to_string(), t.to_string()));
                            }
                        }
                    } else {
                        for t in strings(&inst.value, "prerequisites") {
                            content_edges.push((id.to_string(), t.to_string()));
                        }
                    }
                }
            }
            "concept" | "lexical-entry" if !v2 => {
                let Some(id) = inst.value.get("id").and_then(Value::as_str) else {
                    continue;
                };
                for t in strings(&inst.value, "prerequisites") {
                    content_edges.push((id.to_string(), t.to_string()));
                }
            }
            "unit" => {
                if let Some(g) = inst.value.get("goal_id").and_then(Value::as_str) {
                    delivered.insert(g.to_string());
                }
                for g in strings(&inst.value, "goal_ids") {
                    delivered.insert(g.to_string());
                }
            }
            "scenario" => {
                if let Some(g) = inst.value.get("goal_id").and_then(Value::as_str) {
                    delivered.insert(g.to_string());
                }
                for g in strings(&inst.value, "target_goal_ids") {
                    delivered.insert(g.to_string());
                }
            }
            _ => {}
        }
    }
    // 0.1 scenarios are structural.
    for (_, doc) in structural {
        for g in strings(doc, "target_goal_ids") {
            delivered.insert(g.to_string());
        }
    }

    let mut mirror_edges = None;
    for (file, doc) in structural
        .iter()
        .map(|(f, d)| (f, d))
        .chain(instances.iter().map(|i| (&i.file, &i.value)))
    {
        if file == "grammar/dependencies.yaml"
            || file == "grammar/dependencies.yml"
            || file == "grammar/dependencies.json"
        {
            let mut edges = Vec::new();
            for (_, e) in array(doc, "prerequisite_edges") {
                let from = e.get("from").and_then(Value::as_str).unwrap_or_default();
                let to = e.get("to").and_then(Value::as_str).unwrap_or_default();
                if !from.is_empty() && !to.is_empty() {
                    edges.push((from.to_string(), to.to_string()));
                }
            }
            mirror_edges = Some(edges);
            break;
        }
    }

    Graph {
        content_edges,
        mirror_edges,
        goals,
        delivered,
    }
}

/// Run graph diagnostics.
pub(crate) fn check(graph: &Graph) -> Vec<Diagnostic> {
    let mut diags = Vec::new();
    let file = "grammar/dependencies.yaml";

    // Adjacency for cycle detection and reachability.
    let mut adj: HashMap<&str, Vec<&str>> = HashMap::new();
    for (from, to) in &graph.content_edges {
        adj.entry(from).or_default().push(to);
    }

    // --- cycles (authoritative content edges) ---
    let mut color: HashMap<&str, u8> = HashMap::new(); // 0 unvisited, 1 on stack, 2 done
    let mut reported: HashSet<Vec<String>> = HashSet::new();
    for start in adj.keys().copied().collect::<Vec<_>>() {
        if color.get(start).copied().unwrap_or(0) != 0 {
            continue;
        }
        // Iterative DFS with explicit stack path.
        let mut stack: Vec<(&str, usize)> = vec![(start, 0)];
        let mut path: Vec<&str> = vec![];
        color.insert(start, 1);
        path.push(start);
        while let Some((node, idx)) = stack.last_mut() {
            let neighbors = adj.get(*node).map(Vec::as_slice).unwrap_or(&[]);
            if *idx < neighbors.len() {
                let next = neighbors[*idx];
                *idx += 1;
                match color.get(next).copied().unwrap_or(0) {
                    1 => {
                        // back edge: cycle is path from `next` to current + next
                        let pos = path.iter().position(|p| *p == next).unwrap();
                        let ring: Vec<String> = path[pos..].iter().map(|s| s.to_string()).collect();
                        // Open ring [a, b, ...]; rotate to smallest node,
                        // then re-close for a deterministic cycle path.
                        let min = ring
                            .iter()
                            .enumerate()
                            .min_by_key(|(_, s)| s.as_str())
                            .unwrap()
                            .0;
                        let mut cyc = ring;
                        cyc.rotate_left(min);
                        cyc.push(cyc[0].clone());
                        let key = cyc.clone();
                        if reported.insert(key) {
                            diags.push(Diagnostic::new(
                                "curriculum/goals.yaml",
                                "",
                                "prerequisite_cycle",
                                format!("prerequisite cycle: {}", cyc.join(" -> ")),
                                Severity::Error,
                            ));
                        }
                    }
                    0 => {
                        color.insert(next, 1);
                        path.push(next);
                        stack.push((next, 0));
                    }
                    _ => {}
                }
            } else {
                color.insert(*node, 2);
                stack.pop();
                path.pop();
            }
        }
    }

    // --- dependency mirror consistency ---
    if let Some(mirror) = &graph.mirror_edges {
        let content: HashSet<&(String, String)> = graph.content_edges.iter().collect();
        let mirrorset: HashSet<&(String, String)> = mirror.iter().collect();
        for e in mirror.iter() {
            if !content.contains(e) {
                diags.push(Diagnostic::new(
                    file,
                    "",
                    "dependency_graph_mismatch",
                    format!(
                        "dependencies.yaml edge {} -> {} has no matching content prerequisite",
                        e.0, e.1
                    ),
                    Severity::Warning,
                ));
            }
        }
        for e in &graph.content_edges {
            if !mirrorset.contains(e) {
                diags.push(Diagnostic::new(
                    file,
                    "",
                    "dependency_graph_mismatch",
                    format!(
                        "content prerequisite {} -> {} missing from dependencies.yaml mirror",
                        e.0, e.1
                    ),
                    Severity::Warning,
                ));
            }
        }
    }

    // --- unreachable/dead goal audit ---
    // Meaningful only once delivery structure exists; a goals-only draft
    // pack has nothing to be unreachable from yet.
    if graph.delivered.is_empty() {
        return diags;
    }
    let mut reachable: HashSet<&str> = graph.delivered.iter().map(String::as_str).collect();
    let mut queue: Vec<&str> = reachable.iter().copied().collect();
    while let Some(node) = queue.pop() {
        if let Some(nexts) = adj.get(node) {
            for n in nexts {
                if reachable.insert(n) {
                    queue.push(n);
                }
            }
        }
    }
    for goal in &graph.goals {
        if !reachable.contains(goal.as_str()) {
            diags.push(Diagnostic::new(
                "curriculum/goals.yaml",
                "",
                "unreachable_goal",
                format!(
                    "audit: goal {goal:?} is not referenced by any unit/scenario and is not a prerequisite of any delivered goal; it can never unlock for learners"
                ),
                Severity::Warning,
            ));
        }
    }

    diags
}

fn array<'a>(value: &'a Value, field: &str) -> Vec<(usize, &'a Value)> {
    value
        .get(field)
        .and_then(Value::as_array)
        .map(|items| items.iter().enumerate().collect())
        .unwrap_or_default()
}

fn strings(value: &Value, field: &str) -> Vec<String> {
    value
        .get(field)
        .and_then(Value::as_array)
        .map(|items| {
            items
                .iter()
                .filter_map(Value::as_str)
                .map(str::to_string)
                .collect()
        })
        .unwrap_or_default()
}
