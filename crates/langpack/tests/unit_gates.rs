//! Unit-level phase gates (`requires_unit`, K-70/ADR-0022): the pack declares
//! "every content item of unit X must be at least <state> before this unit's
//! items may be NEW material". These tests pin the validator rules — a gate
//! that can never pass (self-reference, non-unit target, a cycle) is an Error
//! in every mode, exactly like ADR-0018's unlock rules.

use lts_langpack::{Mode, Pack, Severity};
use std::path::PathBuf;

/// Copy `valid-minimal` into a temp dir and drop in unit files, so the gate
/// fixtures are one YAML each instead of whole pack trees.
fn pack_with(units: &[(&str, &str)]) -> tempfile::TempDir {
    let tmp = tempfile::tempdir().unwrap();
    let root = tmp.path().join("pack");
    copy_dir(
        &PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../tests/fixtures/packs/valid-minimal"),
        &root,
    );
    std::fs::create_dir_all(root.join("curriculum/units")).unwrap();
    for (name, body) in units {
        std::fs::write(root.join("curriculum/units").join(name), body).unwrap();
    }
    tmp
}

fn copy_dir(from: &std::path::Path, to: &std::path::Path) {
    std::fs::create_dir_all(to).unwrap();
    for entry in std::fs::read_dir(from).unwrap() {
        let entry = entry.unwrap();
        let dest = to.join(entry.file_name());
        if entry.file_type().unwrap().is_dir() {
            copy_dir(&entry.path(), &dest);
        } else {
            std::fs::copy(entry.path(), &dest).unwrap();
        }
    }
}

fn codes(diags: &[lts_langpack::Diagnostic]) -> Vec<&str> {
    diags.iter().map(|d| d.code.as_str()).collect()
}

const UNIT_A: &str = "\
id: es.unit.chart.first
goal_id: es.goal.intro.greet
title: First chart
activities:
- id: es.activity.chart.first-recall
  type: recall-choice
  modality: reading
  support_level: 1
  content_refs: [es.lex.greet.hola]
";

fn unit_b(gates: &str) -> String {
    format!(
        "\
id: es.unit.chart.second
goal_id: es.goal.intro.greet
title: Second chart
requires_unit:
{gates}activities:
- id: es.activity.chart.second-recall
  type: recall-choice
  modality: reading
  support_level: 1
  content_refs: [es.lex.greet.hola]
"
    )
}

#[test]
fn a_declared_gate_on_a_real_unit_validates_clean() {
    let tmp = pack_with(&[
        ("01-a.yaml", UNIT_A),
        (
            "02-b.yaml",
            &unit_b("- unit: es.unit.chart.first\n  state: introduced\n"),
        ),
    ]);
    for mode in [Mode::Scaffold, Mode::Install] {
        let pack = Pack::load_dir(&tmp.path().join("pack")).unwrap();
        let diags = pack.validate(mode, None);
        assert!(
            diags.iter().all(|d| d.severity != Severity::Error),
            "{mode:?}: {diags:?}"
        );
    }
}

#[test]
fn a_unit_gated_on_itself_can_never_be_introduced() {
    let tmp = pack_with(&[(
        "02-b.yaml",
        &unit_b("- unit: es.unit.chart.second\n  state: introduced\n"),
    )]);
    let pack = Pack::load_dir(&tmp.path().join("pack")).unwrap();
    let diags = pack.validate(Mode::Scaffold, None);
    assert!(
        codes(&diags).contains(&"unit_gate_self_reference"),
        "self-gate must be an error: {diags:?}"
    );
}

#[test]
fn a_gate_target_that_is_not_a_unit_is_rejected() {
    let tmp = pack_with(&[(
        "02-b.yaml",
        &unit_b("- unit: es.goal.intro.greet\n  state: introduced\n"),
    )]);
    let pack = Pack::load_dir(&tmp.path().join("pack")).unwrap();
    let diags = pack.validate(Mode::Scaffold, None);
    assert!(
        codes(&diags).contains(&"unit_gate_not_a_unit"),
        "gate on a non-unit id must be an error: {diags:?}"
    );
}

#[test]
fn a_gate_cycle_locks_every_unit_on_it_and_is_rejected() {
    let tmp = pack_with(&[
        (
            "01-a.yaml",
            &format!("{UNIT_A}requires_unit:\n- unit: es.unit.chart.second\n  state: introduced\n"),
        ),
        (
            "02-b.yaml",
            &unit_b("- unit: es.unit.chart.first\n  state: introduced\n"),
        ),
    ]);
    let pack = Pack::load_dir(&tmp.path().join("pack")).unwrap();
    let diags = pack.validate(Mode::Scaffold, None);
    let hits: Vec<&str> = codes(&diags)
        .into_iter()
        .filter(|c| *c == "unit_gate_cycle")
        .collect();
    assert_eq!(
        hits.len(),
        2,
        "both units of a two-unit gate cycle are reported: {diags:?}"
    );
}

#[test]
fn a_gate_on_an_undeclared_id_travels_the_unresolved_reference_path() {
    let tmp = pack_with(&[(
        "02-b.yaml",
        &unit_b("- unit: es.unit.chart.missing\n  state: introduced\n"),
    )]);
    let pack = Pack::load_dir(&tmp.path().join("pack")).unwrap();
    let scaffold = pack.validate(Mode::Scaffold, None);
    assert!(
        codes(&scaffold).contains(&"unresolved_reference"),
        "dangling gate target is a reference: {scaffold:?}"
    );
    let install = pack.validate(Mode::Install, None);
    let dangling = install
        .iter()
        .find(|d| d.code == "unresolved_reference" && d.message.contains("es.unit.chart.missing"));
    assert_eq!(
        dangling.map(|d| d.severity),
        Some(Severity::Error),
        "install mode must refuse a permanently-unsatisfiable gate: {install:?}"
    );
}

#[test]
fn a_gate_state_outside_the_mastery_vocabulary_fails_the_schema() {
    let tmp = pack_with(&[(
        "02-b.yaml",
        &unit_b("- unit: es.unit.chart.first\n  state: mostly-learned\n"),
    )]);
    let pack = Pack::load_dir(&tmp.path().join("pack")).unwrap();
    let diags = pack.validate(Mode::Scaffold, None);
    let schema_err = diags
        .iter()
        .any(|d| d.code == "schema" && d.severity == Severity::Error);
    assert!(schema_err, "closed masteryState enum applies: {diags:?}");
}

#[test]
fn the_japanese_pack_gates_katakana_on_every_hiragana_chart_unit() {
    // The mechanism is engine-side, but the reference pack's declaration is
    // the pedagogy: katakana may not be NEW material until ALL hiragana chart
    // content is introduced (owner policy, kanban K-70).
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../languages/ja-JP");
    let pack = Pack::load_dir(&root).unwrap();
    let gated = pack
        .instances()
        .iter()
        .find(|i| {
            i.schema == "unit"
                && i.value.get("id").and_then(|v| v.as_str()) == Some("ja.unit.kana-katakana")
        })
        .expect("the katakana chart unit");
    let gates = gated.value["requires_unit"].as_array().unwrap();
    let targets: Vec<&str> = gates.iter().map(|g| g["unit"].as_str().unwrap()).collect();
    for expected in [
        "ja.unit.kana-hiragana-vowels-ko",
        "ja.unit.kana-hiragana-stn",
        "ja.unit.kana-hiragana-hmyrw",
        "ja.unit.kana-hiragana-dakuten",
        "ja.unit.kana-hiragana-youon",
    ] {
        assert!(
            targets.contains(&expected),
            "katakana is gated on {expected}: {targets:?}"
        );
    }
    assert!(
        gates
            .iter()
            .all(|g| g["state"].as_str() == Some("introduced")),
        "the phase threshold is Introduced: {gates:?}"
    );
}
