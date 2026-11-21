//! IN-APP-IME-001 phase 2: `capabilities.input_methods` is a declarative
//! pack-declared input-method map. Absent means the pack declares nothing
//! and current behavior stands; a present map is exposed id → bool via the
//! bool-safe `declared_input_methods` reader, and the 0.2 manifest schema
//! rejects malformed maps (bad ids, non-bool values) as `schema` errors —
//! a pack can declare availability but can never smuggle code or junk.

use lts_langpack::{Mode, Pack};
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

fn seed(dir: &Path) {
    let fixture =
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../tests/fixtures/packs/valid-minimal");
    copy_dir(&fixture, dir);
}

/// Replace the capabilities block of the fixture manifest. Only the
/// capabilities lines are rewritten — everything from `license:` on keeps
/// its original indentation (the schema validates the whole manifest, so
/// a mangled tail would be a fixture bug, not a signal).
fn set_capabilities(dir: &Path, caps: &str) {
    let path = dir.join("manifest.yaml");
    let text = fs::read_to_string(&path).unwrap();
    let (head, rest) = text.split_once("capabilities:").unwrap();
    let tail = rest.split_once("license:").unwrap().1;
    fs::write(&path, format!("{head}capabilities:\n{caps}license:{tail}")).unwrap();
}

#[test]
fn absent_input_methods_reads_none_and_changes_nothing() {
    let tmp = tempfile::tempdir().unwrap();
    seed(tmp.path());
    let pack = Pack::load_dir(tmp.path()).expect("load pack");
    assert_eq!(pack.declared_input_methods(), None);
    let diags = pack.validate(Mode::Scaffold, None);
    assert!(
        !diags.iter().any(|d| d.code == "schema"),
        "unchanged fixture must stay schema-clean: {diags:?}"
    );
}

#[test]
fn declared_map_is_exposed_id_to_bool_and_validates() {
    let tmp = tempfile::tempdir().unwrap();
    seed(tmp.path());
    set_capabilities(
        tmp.path(),
        "  listening: false\n  speaking: false\n  reading: true\n  writing: true\n  input_methods:\n    romaji-kana: true\n    lexicon-candidates: false\n    future-method-xyz: true\n",
    );
    let pack = Pack::load_dir(tmp.path()).expect("load pack");
    let declared = pack.declared_input_methods().expect("map present");
    assert_eq!(declared.get("romaji-kana"), Some(&true));
    // An explicit false travels: present-map means explicit allowlist.
    assert_eq!(declared.get("lexicon-candidates"), Some(&false));
    // Unknown ids are schema-legal — declarative, future engines interpret.
    assert_eq!(declared.get("future-method-xyz"), Some(&true));
    let diags = pack.validate(Mode::Scaffold, None);
    assert!(
        !diags.iter().any(|d| d.code == "schema"),
        "well-formed input_methods must validate: {diags:?}"
    );
}

#[test]
fn malformed_map_is_a_schema_error_and_the_reader_stays_bool_safe() {
    let tmp = tempfile::tempdir().unwrap();
    seed(tmp.path());
    set_capabilities(
        tmp.path(),
        "  listening: false\n  speaking: false\n  reading: true\n  writing: true\n  input_methods:\n    romaji-kana: \"yes\"\n    Bad_Key: true\n",
    );
    let pack = Pack::load_dir(tmp.path()).expect("load pack");
    let diags = pack.validate(Mode::Scaffold, None);
    assert!(
        diags.iter().any(|d| d.code == "schema"),
        "non-bool values and bad id keys must fail the manifest schema: {diags:?}"
    );
    // The bool-safe read never panics on the malformed map: the non-bool
    // entry is skipped, and the bad key is not a bool either.
    let declared = pack.declared_input_methods().expect("map present");
    assert!(declared.is_empty() || declared.values().all(|v| *v));
    assert_eq!(declared.get("romaji-kana"), None);
}
