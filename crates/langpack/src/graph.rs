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
    /// All instance ids in the pack (goals, concepts, lexicon, ...).
    pub known_ids: HashSet<String>,
    /// Whether the pack uses the 0.2 contract (concept dependency
    /// edges live in the mirror; 0.1 keeps them on concept records).
    pub v2: bool,
    /// FIX-M2-SUPPLY-RU-001: ids of required_concepts that a practice
    /// runner can actually grade on a runner dimension (lexicon, sentence,
    /// story, kanji, orthography). Grammar/phonology concepts are taught by
    /// authored encounter stages but mint no evidence rows (ADR-0036), so
    /// they can never satisfy a ladder gate.
    pub gradeable_concepts: HashSet<String>,
    /// Goals that carry at least one `strength: hard` prerequisite edge.
    pub hard_gated_goals: HashSet<String>,
    /// Hard goal prerequisite edges whose `dimension` has no runner
    /// (`(goal, target, dimension)`).
    pub unrunnable_hard_edges: Vec<(String, String, String)>,
    /// Hard-gated goals with no gradeable `required_concepts` — the ladder
    /// minimum is `Unseen` forever, so the goal can never unlock.
    pub unsatisfiable_hard_gated: Vec<String>,
}

/// The six dimensions the engine's practice runners build and grade
/// (ADR-0018/ADR-0036 runner table). A goal-prerequisite edge on any other
/// dimension can never be satisfied by derived evidence.
pub const RUNNER_DIMENSIONS: [&str; 6] = [
    "recall-meaning",
    "comprehension-listening",
    "orthography-recognition",
    "phonological-discrimination",
    "production-writing",
    "orthographic-encoding",
];

/// Content schemas whose records can receive gradeable practice evidence.
fn is_gradeable_schema(schema: &str) -> bool {
    matches!(
        schema,
        "lexicon-entry" | "lexical-entry" | "sentence" | "story" | "kanji" | "orthography-unit"
    )
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
    let mut known_ids = HashSet::new();
    let mut gradeable_concepts = HashSet::new();
    let mut hard_gated_by_goal_edges: Vec<String> = Vec::new();
    let mut unrunnable_hard_edges: Vec<(String, String, String)> = Vec::new();
    let mut goal_required_concepts: HashMap<String, Vec<String>> = HashMap::new();

    for inst in instances {
        if let Some(id) = inst.value.get("id").and_then(Value::as_str) {
            known_ids.insert(id.to_string());
            if is_gradeable_schema(inst.schema) {
                gradeable_concepts.insert(id.to_string());
            }
        }
        match inst.schema {
            "goal" => {
                if let Some(id) = inst.value.get("id").and_then(Value::as_str) {
                    goals.push(id.to_string());
                    if v2 {
                        for p in array(&inst.value, "prerequisites") {
                            if let Some(t) = p.1.get("target").and_then(Value::as_str) {
                                content_edges.push((id.to_string(), t.to_string()));
                                let hard =
                                    p.1.get("strength")
                                        .and_then(Value::as_str)
                                        .unwrap_or("hard")
                                        == "hard";
                                if hard {
                                    hard_gated_by_goal_edges.push(id.to_string());
                                    let dim =
                                        p.1.get("dimension")
                                            .and_then(Value::as_str)
                                            .unwrap_or_default();
                                    if !RUNNER_DIMENSIONS.contains(&dim) {
                                        unrunnable_hard_edges.push((
                                            id.to_string(),
                                            t.to_string(),
                                            dim.to_string(),
                                        ));
                                    }
                                }
                            }
                        }
                        if let Some(rc) = inst
                            .value
                            .get("required_concepts")
                            .and_then(Value::as_array)
                        {
                            let refs: Vec<String> = rc
                                .iter()
                                .filter_map(|c| c.as_str().map(String::from))
                                .collect();
                            goal_required_concepts.insert(id.to_string(), refs);
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

    // A goal hard-gated by another GOAL is satisfiable only if at least
    // one of its required_concepts can receive gradeable evidence (ADR-0031
    // aggregates the ladder over required_concepts). Edges targeting content
    // (e.g. a lexicon id) settle on that content's own derived row and are
    // not subject to this aggregation.
    let goalset: HashSet<&str> = goals.iter().map(String::as_str).collect();
    let hard_gated_goals: HashSet<String> = hard_gated_by_goal_edges
        .iter()
        .filter(|g| {
            // edge source goal whose target is itself a goal
            content_edges
                .iter()
                .any(|(from, to)| from == *g && goalset.contains(to.as_str()))
        })
        .cloned()
        .collect();
    let unsatisfiable_hard_gated: Vec<String> = hard_gated_goals
        .iter()
        .filter(|g| {
            goal_required_concepts
                .get(g.as_str())
                .map(|refs| !refs.iter().any(|r| gradeable_concepts.contains(r)))
                .unwrap_or(true) // hard-gated with no declared concepts
        })
        .cloned()
        .collect();

    Graph {
        content_edges,
        mirror_edges,
        goals,
        delivered,
        known_ids,
        v2,
        gradeable_concepts,
        hard_gated_goals,
        unrunnable_hard_edges,
        unsatisfiable_hard_gated,
    }
}

/// Curriculum graph audit only (cycles, mirror, reachability).
pub fn audit_curriculum(pack: &crate::pack::Pack) -> Vec<Diagnostic> {
    let v2 = pack.schema_version() != "0.1";
    let graph = build(&pack.instances, &pack.structural, v2);
    check(&graph)
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

    // v0.2: concept→concept dependency edges are authoritative in the
    // mirror (the concept schema carries no prerequisites field); they
    // join cycle detection and the missing-dependency check but are
    // exempt from goal-mirror comparison.
    let mut concept_edges: Vec<(String, String)> = Vec::new();
    if graph.v2 {
        if let Some(mirror) = &graph.mirror_edges {
            for e in mirror {
                if !graph.goals.contains(&e.0) {
                    concept_edges.push(e.clone());
                }
            }
        }
    }
    for (from, to) in &concept_edges {
        adj.entry(from.as_str()).or_default().push(to.as_str());
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
            if graph.v2 && !graph.goals.contains(&e.0) {
                continue; // authoritative concept dependency edge
            }
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
            if graph.v2 && !graph.goals.contains(&e.0) {
                continue;
            }
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

    // --- missing dependencies: every edge endpoint must resolve ---
    for (from, to) in graph.content_edges.iter().chain(concept_edges.iter()) {
        if !graph.known_ids.contains(to) {
            diags.push(Diagnostic::new(
                file,
                "",
                "missing_dependency",
                format!(
                    "prerequisite target {to:?} (from {from:?}) is not an instance in this pack"
                ),
                Severity::Warning,
            ));
        }
    }
    for (from, _to) in &concept_edges {
        if !graph.known_ids.contains(from) {
            diags.push(Diagnostic::new(
                file,
                "",
                "missing_dependency",
                format!("dependency source {from:?} is not an instance in this pack"),
                Severity::Warning,
            ));
        }
    }

    // --- ladder gradeability (FIX-M2-SUPPLY-RU-001 recurrence guard) ---
    // RU days 31-60 starved because every hard goal→goal edge demanded
    // `comprehension-reading` evidence on grammar-only required_concepts:
    // a dimension with no runner over concepts no runner can grade. The
    // ladder unlock is then structurally unsatisfiable and no band past
    // the on-ramp ever opens. Same shape re-emerges the moment a pack
    // reintroduces it, so gate it here.
    for (goal, target, dim) in &graph.unrunnable_hard_edges {
        diags.push(Diagnostic::new(
            "curriculum/goals.yaml",
            "",
            "goal_ladder_unrunnable_dimension",
            format!(
                "goal {goal:?} has a hard prerequisite on {target:?} with dimension {dim:?}, which has no practice runner; the edge can never be satisfied (valid dimensions: {})",
                RUNNER_DIMENSIONS.join(", ")
            ),
            Severity::Error,
        ));
    }
    for goal in &graph.unsatisfiable_hard_gated {
        diags.push(Diagnostic::new(
            "curriculum/goals.yaml",
            "",
            "goal_ladder_unsatisfiable",
            format!(
                "goal {goal:?} is gated by hard prerequisites but none of its required_concepts can receive gradeable practice evidence; the ladder minimum stays Unseen and the goal can never unlock (teach grammar via unit encounter stages, gate the ladder on gradeable refs)"
            ),
            Severity::Error,
        ));
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
