//! FIX-M2-SUPPLY-RU-001 recurrence guard: a hard goal prerequisite edge
//! must be satisfiable by real practice evidence. Two structurally-dead
//! shapes are errors:
//!   1. edge dimension with no practice runner (e.g. comprehension-reading),
//!   2. a goal hard-gated by ANOTHER GOAL whose required_concepts are all
//!      ungradeable (grammar-only) — the ADR-0031 ladder minimum stays
//!      Unseen forever.
//!
//! This is the exact shape that starved RU learners of new content for 28
//! consecutive days in month 2.

use lts_langpack::{Mode, Pack, Severity};
use std::path::PathBuf;

fn fixture(name: &str) -> Pack {
    let path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join(format!("../../tests/fixtures/packs/{name}"));
    Pack::load_dir(&path).unwrap()
}

#[test]
fn ungradeable_ladder_edges_are_errors() {
    let diags = fixture("invalid-ungradeable-ladder").validate(Mode::Scaffold, None);
    let dim = diags
        .iter()
        .find(|d| d.code == "goal_ladder_unrunnable_dimension")
        .expect("unrunnable-dimension error expected");
    assert_eq!(dim.severity, Severity::Error);
    assert!(dim.message.contains("es.goal.a1.eat"), "{}", dim.message);
    assert!(
        dim.message.contains("comprehension-reading"),
        "{}",
        dim.message
    );
    let unsat = diags
        .iter()
        .find(|d| d.code == "goal_ladder_unsatisfiable")
        .expect("unsatisfiable-goal error expected");
    assert_eq!(unsat.severity, Severity::Error);
    assert!(
        unsat.message.contains("es.goal.a1.eat"),
        "{}",
        unsat.message
    );
}

#[test]
fn reference_packs_have_no_dead_ladder_edges() {
    // The shipped packs are the regression baseline: ru-RU and ja-JP must
    // carry no unrunnable hard edges and no unsatisfiable hard-gated goals.
    let repo = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../..");
    for pack in ["languages/ru-RU", "languages/ja-JP"] {
        let p = Pack::load_dir(&repo.join(pack)).unwrap();
        let offenders: Vec<String> = p
            .validate(Mode::Scaffold, None)
            .into_iter()
            .filter(|d| {
                d.code == "goal_ladder_unrunnable_dimension"
                    || d.code == "goal_ladder_unsatisfiable"
            })
            .map(|d| d.message)
            .collect();
        assert!(offenders.is_empty(), "{pack}: {offenders:?}");
    }
}
