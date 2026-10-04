//! End-to-end author workflow (PACK-005): init -> validate -> lint ->
//! build -> inspect from a clean temporary directory.

use std::path::Path;
use std::process::Command;

fn cli() -> Command {
    Command::new(env!("CARGO_BIN_EXE_langpack"))
}

fn run(args: &[&str]) -> (String, String, bool) {
    let out = cli().args(args).output().expect("run langpack");
    (
        String::from_utf8_lossy(&out.stdout).into_owned(),
        String::from_utf8_lossy(&out.stderr).into_owned(),
        out.status.success(),
    )
}

fn fixture(name: &str) -> String {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../../tests/fixtures/packs")
        .join(name)
        .to_str()
        .unwrap()
        .to_string()
}

#[test]
fn init_validate_build_inspect_round_trip() {
    let dir = tempfile::tempdir().unwrap();
    let pack = dir.path().join("my-pack");
    let pack_s = pack.to_str().unwrap();

    let (out, err, ok) = run(&["init", pack_s, "--pack-id", "dev.example.roundtrip"]);
    assert!(ok, "init: {out}{err}");
    assert!(Path::new(pack_s).join("manifest.yaml").exists());

    let (out, err, ok) = run(&["validate", pack_s]);
    assert!(ok, "validate: {out}{err}");
    assert!(out.contains("0 error(s), 0 warning(s)"), "{out}");

    let (out, _err, ok) = run(&["lint", pack_s]);
    assert!(ok, "lint: {out}");

    let archive = dir.path().join("roundtrip.lpk");
    let archive_s = archive.to_str().unwrap();
    let (out, err, ok) = run(&["build", pack_s, "-o", archive_s]);
    assert!(ok, "build: {out}{err}");
    assert!(out.contains("sha256"), "{out}");

    let (out, err, ok) = run(&["inspect", archive_s]);
    assert!(ok, "inspect: {out}{err}");
    assert!(out.contains("dev.example.roundtrip"), "{out}");
    assert!(out.contains("v0.0.1"), "{out}");

    // init refuses a non-empty directory.
    let (_out, err, ok) = run(&["init", pack_s]);
    assert!(!ok && err.contains("not empty"), "{err}");
}

#[test]
fn test_gate_blocks_uninstallable_pack() {
    // valid-minimal is install-eligible; the seed draft is not.
    let (out, _err, ok) = run(&["test", &fixture("valid-minimal")]);
    assert!(ok, "valid-minimal must pass the full gate: {out}");

    let seed = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../../languages/ja-JP")
        .to_str()
        .unwrap()
        .to_string();
    let (out, _err, ok) = run(&["test", &seed]);
    assert!(!ok, "seed draft must fail install gates: {out}");
}

#[test]
fn lint_fails_on_warnings() {
    // undeclared reference draft: scaffold-valid but warning-laden.
    let (out, _err, ok) = run(&["lint", &fixture("valid-scaffold-draft")]);
    assert!(!ok, "lint must fail on warnings: {out}");
    let (_out, _err, ok) = run(&["validate", &fixture("valid-scaffold-draft")]);
    assert!(ok, "same pack must pass scaffold validation");
}

#[test]
fn audit_curriculum_and_sources_commands() {
    let (out, _err, ok) = run(&["audit-curriculum", &fixture("invalid-prereq-cycle")]);
    assert!(!ok, "cycle must fail: {out}");
    assert!(out.contains("prerequisite_cycle"), "{out}");

    let (out, _err, ok) = run(&["audit-sources", &fixture("invalid-source-terms")]);
    assert!(ok, "provenance gaps are warnings: {out}");
    assert!(out.contains("source_terms_inconsistent"), "{out}");
    assert!(out.contains("unused_source"), "{out}");
}

#[test]
fn worked_example_template_pack_stays_clean() {
    // The contract's worked example (docs/PACK_AUTHORING_CONTRACT.md)
    // must stay lint-clean so agents can copy it with confidence.
    let pack = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../../tools/pack-templates/example-pack")
        .to_str()
        .unwrap()
        .to_string();
    let (out, err, ok) = run(&["validate", &pack]);
    assert!(ok, "example pack must validate: {out}{err}");
    let (out, _err, ok) = run(&["lint", &pack]);
    assert!(ok, "example pack must be lint-clean: {out}");
    let (out, _err, ok) = run(&["audit-curriculum", &pack]);
    assert!(ok, "example pack curriculum must audit clean: {out}");
}

#[test]
fn goals_shards_dedupe_ids_across_files() {
    let dir = tempfile::tempdir().unwrap();
    let pack = dir.path().join("dup-goals");
    let pack_s = pack.to_str().unwrap();
    let (out, err, ok) = run(&["init", pack_s, "--pack-id", "dev.example.dupgoals"]);
    assert!(ok, "init: {out}{err}");
    std::fs::remove_file(pack.join("curriculum/goals.yaml")).unwrap();
    let shard = |name: &str| {
        std::fs::write(
            pack.join("curriculum/goals").join(name),
            "goals:\n  - id: \"xx.goal.demo.same\"\n    description: \"dup\"\n    band: \"A1\"\n    modalities: [\"reading\"]\n    prerequisites: []\n    required_concepts: []\n    assessment_ids: [\"xx.assess.demo.x\"]\n    transfer_required: false\n    sources: [\"s\"]\n    review_status: \"draft\"\n",
        )
        .unwrap()
    };
    std::fs::create_dir_all(pack.join("curriculum/goals")).unwrap();
    shard("a.yaml");
    shard("b.yaml");
    let (out, _err, ok) = run(&["validate", pack_s]);
    assert!(!ok, "same id in two shards must fail: {out}");
    assert!(out.contains("duplicate_id"), "{out}");
}

#[test]
fn new_unit_and_lexicon_scaffold_validate_clean() {
    let dir = tempfile::tempdir().unwrap();
    let pack = dir.path().join("scaffold");
    let pack_s = pack.to_str().unwrap();
    let (out, err, ok) = run(&[
        "init",
        pack_s,
        "--pack-id",
        "dev.example.scaffold",
        "--locale",
        "xx-XX",
    ]);
    assert!(ok, "init: {out}{err}");
    let (out, err, ok) = run(&["new-lexicon", pack_s, "xx.lex.food.apple"]);
    assert!(ok, "new-lexicon: {out}{err}");
    let (out, err, ok) = run(&["new-unit", pack_s, "xx.unit.food.market"]);
    assert!(ok, "new-unit: {out}{err}");
    assert!(pack.join("curriculum/units/000-food-market.yaml").exists());
    // Scaffolds are schema-valid immediately; placeholders surface as
    // warnings, never errors (docs/03 §12 authoring loop).
    let (out, _err, ok) = run(&["validate", pack_s]);
    assert!(ok, "scaffolded pack must validate: {out}");
    assert!(out.contains("unresolved_reference"), "{out}");
    // Wrong kind is rejected.
    let (out, _err, ok) = run(&["new-lexicon", pack_s, "xx.unit.wrongkind"]);
    assert!(!ok, "wrong kind must fail: {out}");
}

#[test]
fn catalog_upsert_from_built_archive() {
    let dir = tempfile::tempdir().unwrap();
    let pack = dir.path().join("cat-pack");
    let pack_s = pack.to_str().unwrap();
    let (out, err, ok) = run(&[
        "init",
        pack_s,
        "--pack-id",
        "dev.example.catalog",
        "--name",
        "Catalog Demo",
    ]);
    assert!(ok, "init: {out}{err}");

    let archive = dir.path().join("catalog-demo.lpk");
    let archive_s = archive.to_str().unwrap();
    let (out, err, ok) = run(&["build", pack_s, "-o", archive_s]);
    assert!(ok, "build: {out}{err}");
    let built_sha = out
        .lines()
        .find_map(|l| l.strip_prefix("sha256 "))
        .expect("build prints sha256")
        .to_string();

    let catalog = dir.path().join("packs.json");
    let catalog_s = catalog.to_str().unwrap();
    let url = "https://github.com/example/releases/download/v{version}/{filename}";
    let (out, err, ok) = run(&[
        "catalog",
        archive_s,
        "--file",
        catalog_s,
        "--url-template",
        url,
    ]);
    assert!(ok, "catalog: {out}{err}");

    let v: serde_json::Value =
        serde_json::from_str(&std::fs::read_to_string(&catalog).unwrap()).unwrap();
    // PLAT-001 marker: only Linux runtime is tested (docs/13).
    assert_eq!(v["tested_platforms"], serde_json::json!(["linux"]));
    let packs = v["packs"].as_array().unwrap();
    assert_eq!(packs.len(), 1);
    let e = &packs[0];
    assert_eq!(e["pack_id"], "dev.example.catalog");
    assert_eq!(e["version"], "0.0.1");
    assert_eq!(e["display_name"], "Catalog Demo");
    assert_eq!(e["review_status"], "community");
    assert_eq!(e["sha256"], built_sha);
    assert!(e["size_bytes"].as_u64().unwrap() > 0);
    assert!(e["url"].as_str().unwrap().ends_with("catalog-demo.lpk"));

    // Re-running is an upsert, not a duplicate, and the deterministic
    // archive keeps the same hash.
    let (out, _err, ok) = run(&["build", pack_s, "-o", archive_s]);
    assert!(ok);
    assert!(out.contains(&built_sha), "archive must be deterministic");
    let (_out, err, ok) = run(&[
        "catalog",
        archive_s,
        "--file",
        catalog_s,
        "--url-template",
        url,
    ]);
    assert!(ok, "catalog re-run: {err}");
    let v: serde_json::Value =
        serde_json::from_str(&std::fs::read_to_string(&catalog).unwrap()).unwrap();
    assert_eq!(v["packs"].as_array().unwrap().len(), 1);

    // Non-https URLs are refused (the app enforces https at install).
    let (_out, err, ok) = run(&[
        "catalog",
        archive_s,
        "--file",
        catalog_s,
        "--url-template",
        "http://evil.example/{filename}",
    ]);
    assert!(!ok && err.contains("https"), "must reject http: {err}");
}
