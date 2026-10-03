//! JA-RES-006: reviewed lexical import pipeline.
//! Reproducibility, separation from curriculum data, generated
//! attribution, and no automatic teaching order.

use lts_langpack::Severity;
use lts_langpack::leximport::{ImportError, ImportOutcome, import_lexicon};
use lts_langpack::{Mode, Pack};
use serde_json::Value;
use std::fs;
use std::path::{Path, PathBuf};

fn fixture_pack() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../tests/fixtures/packs/ja-curriculum-draft")
}

fn fixture_input() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../tests/fixtures/leximport/jmdict-sample.jsonl")
}

fn copy_dir(src: &Path, dst: &Path) {
    fs::create_dir_all(dst).unwrap();
    for entry in fs::read_dir(src).unwrap() {
        let entry = entry.unwrap();
        let to = dst.join(entry.file_name());
        if entry.file_type().unwrap().is_dir() {
            copy_dir(&entry.path(), &to);
        } else {
            fs::copy(entry.path(), to).unwrap();
        }
    }
}

fn read_lines(path: &Path) -> Vec<Value> {
    fs::read_to_string(path)
        .unwrap()
        .lines()
        .filter(|l| !l.trim().is_empty())
        .map(|l| serde_json::from_str(l).unwrap())
        .collect()
}

fn import_into(dir: &Path) -> ImportOutcome {
    import_lexicon(dir, "edrdg-jmdict", &fixture_input(), "en-US").unwrap()
}

#[test]
fn import_is_reproducible_and_separated_from_curriculum() {
    let a = tempfile::tempdir().unwrap();
    let b = tempfile::tempdir().unwrap();
    copy_dir(&fixture_pack(), a.path());
    copy_dir(&fixture_pack(), b.path());

    // Curriculum + authored lexicon bytes before import.
    let untouched = [
        "curriculum/goals.yaml",
        "lexicon/entries.jsonl",
        "grammar/concepts.jsonl",
        "grammar/dependencies.yaml",
    ];
    let before: Vec<Vec<u8>> = untouched
        .iter()
        .map(|f| fs::read(a.path().join(f)).unwrap())
        .collect();

    let out_a = import_into(a.path());
    assert_eq!(out_a.output_file, "lexicon/imported-edrdg-jmdict.jsonl");
    assert_eq!(out_a.entries, 4);

    // Separation: curriculum and authored lexicon unchanged.
    for (f, bytes) in untouched.iter().zip(&before) {
        assert_eq!(fs::read(a.path().join(f)).unwrap(), *bytes, "{f} mutated");
    }

    // Reproducibility: independent run on identical input is byte-identical.
    import_into(b.path());
    assert_eq!(
        fs::read(a.path().join(&out_a.output_file)).unwrap(),
        fs::read(b.path().join(&out_a.output_file)).unwrap()
    );
    assert_eq!(
        fs::read(a.path().join("licenses.jsonl")).unwrap(),
        fs::read(b.path().join("licenses.jsonl")).unwrap()
    );
}

#[test]
fn attribution_and_license_requirements_are_generated() {
    let d = tempfile::tempdir().unwrap();
    copy_dir(&fixture_pack(), d.path());
    // Remove the pre-existing derived entry so generation is exercised.
    let lic = d.path().join("licenses.jsonl");
    let kept: Vec<String> = read_lines(&lic)
        .iter()
        .filter(|l| {
            !(l["scope"]["kind"].as_str() == Some("derived-from-source")
                && l["scope"]["source_id"].as_str() == Some("edrdg-jmdict"))
        })
        .map(|l| serde_json::to_string(l).unwrap())
        .collect();
    fs::write(
        &lic,
        kept.iter()
            .map(|l| format!("{l}\n"))
            .collect::<String>()
            .as_bytes(),
    )
    .unwrap();
    let out = import_into(d.path());

    assert_eq!(out.licenses_added, 1);
    let licenses = read_lines(&d.path().join("licenses.jsonl"));
    let derived = licenses
        .iter()
        .find(|l| {
            l["scope"]["kind"].as_str() == Some("derived-from-source")
                && l["scope"]["source_id"].as_str() == Some("edrdg-jmdict")
        })
        .expect("generated derived-from-source license entry");
    assert_eq!(derived["license"]["spdx"].as_str().unwrap(), "CC-BY-SA-4.0");
    assert!(derived["redistribution_allowed"].as_bool().unwrap());
    assert!(
        derived["attribution"]
            .as_str()
            .unwrap()
            .contains("Electronic Dictionary Research and Development Group")
    );

    assert_eq!(out.attribution.len(), 1);
    assert_eq!(out.attribution[0].license, "CC-BY-SA-4.0");
    assert!(!out.attribution[0].attribution.is_empty());

    // Re-import is idempotent: no duplicate license entry.
    let out2 = import_into(d.path());
    assert_eq!(out2.licenses_added, 0);
    let licenses = read_lines(&d.path().join("licenses.jsonl"));
    assert_eq!(
        licenses
            .iter()
            .filter(|l| {
                l["scope"]["kind"].as_str() == Some("derived-from-source")
                    && l["scope"]["source_id"].as_str() == Some("edrdg-jmdict")
            })
            .count(),
        1
    );
}

#[test]
fn imported_data_never_becomes_teaching_order() {
    let d = tempfile::tempdir().unwrap();
    copy_dir(&fixture_pack(), d.path());
    import_into(d.path());

    let entries = read_lines(&d.path().join("lexicon/imported-edrdg-jmdict.jsonl"));
    assert_eq!(entries.len(), 4);
    for e in &entries {
        // Unreviewed drafts only; never auto-promoted.
        assert_eq!(e["status"].as_str().unwrap(), "draft");
        // No ordering/curriculum linkage fields of any kind.
        for forbidden in ["teaching_order", "frequency_rank", "goal", "unit"] {
            assert!(e.get(forbidden).is_none(), "imported entry has {forbidden}");
        }
        assert_eq!(e["sources"].as_array().unwrap().len(), 1);
        assert_eq!(e["sources"][0].as_str().unwrap(), "edrdg-jmdict");
        assert_eq!(e["generation"]["method"].as_str().unwrap(), "imported");
    }

    // Nothing in the curriculum references imported ids.
    let goals = fs::read_to_string(d.path().join("curriculum/goals.yaml")).unwrap();
    assert!(!goals.contains("ja.lex.imported"));
    let deps = fs::read_to_string(d.path().join("grammar/dependencies.yaml")).unwrap();
    assert!(!deps.contains("ja.lex.imported"));
}

#[test]
fn deterministic_ids_and_collision_handling() {
    let d = tempfile::tempdir().unwrap();
    copy_dir(&fixture_pack(), d.path());
    import_into(d.path());
    let entries = read_lines(&d.path().join("lexicon/imported-edrdg-jmdict.jsonl"));
    let ids: Vec<&str> = entries.iter().map(|e| e["id"].as_str().unwrap()).collect();
    // Sorted by source key; duplicate reading 'neko' gets a numeric suffix.
    assert_eq!(
        ids,
        [
            "ja.lex.imported.neko",
            "ja.lex.imported.inu",
            "ja.lex.imported.nomu",
            "ja.lex.imported.neko-2",
        ]
    );
}

#[test]
fn non_redistributable_source_is_rejected() {
    let d = tempfile::tempdir().unwrap();
    copy_dir(&fixture_pack(), d.path());
    let err = import_lexicon(d.path(), "jf-standard", &fixture_input(), "en-US").unwrap_err();
    assert!(matches!(err, ImportError::SourceNotRedistributable(_)));
    // Nothing written.
    assert!(!d.path().join("lexicon/imported-jf-standard.jsonl").exists());
}

#[test]
fn pack_still_validates_after_import() {
    let d = tempfile::tempdir().unwrap();
    copy_dir(&fixture_pack(), d.path());
    import_into(d.path());
    let pack = Pack::load_dir(d.path()).unwrap();
    let diags = pack.validate(Mode::Scaffold, None);
    let errors: Vec<_> = diags
        .iter()
        .filter(|d| d.severity == Severity::Error)
        .collect();
    assert!(errors.is_empty(), "{errors:?}");
    assert!(
        !diags.iter().any(|d| d.code == "unknown_file"),
        "imported lexicon file must be a recognized layout file"
    );
}
