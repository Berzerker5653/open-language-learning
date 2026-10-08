//! ADR-0018: environments are pack data. `world/environments.jsonl` is an
//! optional collection, and when a pack opts into it the rules it declares
//! must actually be satisfiable — an unlock rule pointing at content the pack
//! does not declare is a pack bug, not a draft state, because the environment
//! could never open.

use lts_domain::{ActivityModality, MasteryState};
use lts_langpack::{Mode, Pack, Severity};
use std::fs;
use std::path::{Path, PathBuf};

fn copy_dir(from: &Path, to: &Path) {
    fs::create_dir_all(to).expect("create dir");
    for entry in fs::read_dir(from).expect("read dir").flatten() {
        let dest = to.join(entry.file_name());
        if entry.file_type().map(|t| t.is_dir()).unwrap_or(false) {
            copy_dir(&entry.path(), &dest);
        } else {
            fs::copy(entry.path(), &dest).expect("copy file");
        }
    }
}

/// `valid-minimal` plus a `world/environments.jsonl` written verbatim, and an
/// optional manifest line (e.g. `world: environments.jsonl`).
fn pack_with(dir: &Path, rows: Option<&str>, manifest_line: Option<&str>) -> Pack {
    let seed =
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../tests/fixtures/packs/valid-minimal");
    copy_dir(&seed, dir);
    if let Some(line) = manifest_line {
        let manifest = dir.join("manifest.yaml");
        let mut text = fs::read_to_string(&manifest).expect("read manifest");
        text.push_str(&format!("{line}\n"));
        fs::write(&manifest, text).expect("write manifest");
    }
    if let Some(rows) = rows {
        let world = dir.join("world");
        fs::create_dir_all(&world).expect("create world dir");
        fs::write(world.join("environments.jsonl"), rows).expect("write environments");
    }
    Pack::load_dir(dir).expect("load pack")
}

fn codes(diags: &[lts_langpack::Diagnostic], severity: Severity) -> Vec<String> {
    diags
        .iter()
        .filter(|d| d.severity == severity)
        .map(|d| d.code.clone())
        .collect()
}

fn row(id: &str, content_id: &str, modality: &str, min_state: &str) -> String {
    serde_json::json!({
        "schema_version": 1,
        "id": id,
        "display_name": "Greet someone",
        "requires": [{
            "content_id": content_id,
            "modality": modality,
            "min_state": min_state
        }]
    })
    .to_string()
}

#[test]
fn a_pack_without_the_collection_stays_clean_and_yields_nothing() {
    let tmp = tempfile::tempdir().unwrap();
    let pack = pack_with(tmp.path(), None, None);
    let diags = pack.validate(Mode::Scaffold, None);
    assert_eq!(
        codes(&diags, Severity::Error),
        Vec::<String>::new(),
        "an absent world collection is legal: {diags:?}"
    );
    assert!(pack.environments().is_empty());
}

#[test]
fn declared_environments_validate_and_are_returned_typed() {
    let tmp = tempfile::tempdir().unwrap();
    let rows = format!(
        "{}\n",
        row("greet-desk", "es.lex.greet.hola", "recall-meaning", "introduced")
    );
    let pack = pack_with(
        tmp.path(),
        Some(&rows),
        Some("world: environments.jsonl"),
    );
    let diags = pack.validate(Mode::Scaffold, None);
    assert_eq!(
        codes(&diags, Severity::Error),
        Vec::<String>::new(),
        "a well-formed environment must validate: {diags:?}"
    );
    let envs = pack.environments();
    assert_eq!(envs.len(), 1);
    assert_eq!(envs[0].id, "greet-desk");
    assert_eq!(envs[0].display_name, "Greet someone");
    assert_eq!(envs[0].requires.len(), 1);
    assert_eq!(envs[0].requires[0].content_id, "es.lex.greet.hola");
    assert_eq!(envs[0].requires[0].modality, ActivityModality::RecallMeaning);
    assert_eq!(envs[0].requires[0].min_state, MasteryState::Introduced);
}

#[test]
fn an_unlock_rule_must_point_at_content_the_pack_declares() {
    let tmp = tempfile::tempdir().unwrap();
    let rows = format!(
        "{}\n",
        row("greet-desk", "es.lex.greet.adios", "recall-meaning", "introduced")
    );
    let pack = pack_with(
        tmp.path(),
        Some(&rows),
        Some("world: environments.jsonl"),
    );
    let diags = pack.validate(Mode::Scaffold, None);
    assert!(
        codes(&diags, Severity::Error).contains(&"environment_unknown_content".to_string()),
        "a dangling requirement can never be met and must fail the pack: {diags:?}"
    );
}

#[test]
fn environment_ids_are_pack_unique() {
    let tmp = tempfile::tempdir().unwrap();
    let rows = format!(
        "{}\n{}\n",
        row("greet-desk", "es.lex.greet.hola", "recall-meaning", "introduced"),
        row("greet-desk", "es.grammar.gender.noun", "recall-meaning", "supported")
    );
    let pack = pack_with(
        tmp.path(),
        Some(&rows),
        Some("world: environments.jsonl"),
    );
    let diags = pack.validate(Mode::Scaffold, None);
    assert!(
        codes(&diags, Severity::Error).contains(&"duplicate_environment_id".to_string()),
        "two rows with one id cannot both be unlocked-from: {diags:?}"
    );
}

#[test]
fn declaring_a_collection_without_rows_is_a_pack_bug() {
    let tmp = tempfile::tempdir().unwrap();
    let pack = pack_with(tmp.path(), None, Some("world: environments.jsonl"));
    let diags = pack.validate(Mode::Scaffold, None);
    assert!(
        codes(&diags, Severity::Error).contains(&"world_collection_missing".to_string()),
        "a manifest that names the collection must ship it: {diags:?}"
    );
}

#[test]
fn a_row_is_rejected_when_it_names_a_state_the_engine_does_not_have() {
    let tmp = tempfile::tempdir().unwrap();
    let rows = format!(
        "{}\n",
        row("greet-desk", "es.lex.greet.hola", "recall-meaning", "mastered")
    );
    let pack = pack_with(
        tmp.path(),
        Some(&rows),
        Some("world: environments.jsonl"),
    );
    let diags = pack.validate(Mode::Scaffold, None);
    assert!(
        codes(&diags, Severity::Error).contains(&"schema".to_string()),
        "the state vocabulary is schema-owned, not app-owned: {diags:?}"
    );
    assert!(
        pack.environments().is_empty(),
        "a row the schema rejects must not reach the world layer"
    );
}
