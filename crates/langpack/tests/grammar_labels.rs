//! GRAMMAR-LABELS-001: `media/labels.jsonl` is an optional grammar-label
//! overlay. A pack without the sidecar must load and validate exactly as
//! before; a pack with it exposes compact labels keyed by sentence id; a
//! malformed row surfaces as a `parse_error` naming its line and the
//! overlay is simply absent (the reader then renders bare text). Mirrors
//! the WORD-TIMING-001 posture in tests/word_timings.rs.

use lts_langpack::{Diagnostic, GrammarLabel, Mode, Pack, Severity};
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

#[test]
fn pack_without_the_sidecar_loads_unchanged() {
    let tmp = tempfile::tempdir().unwrap();
    seed(tmp.path());
    let pack = Pack::load_dir(tmp.path()).expect("load pack");
    assert!(pack.grammar_labels().is_empty());
    assert!(
        pack.grammar_labels_for("ja.sent.demo.hajimemashite")
            .is_none()
    );
    let diags = pack.validate(Mode::Scaffold, None);
    assert!(
        !diags
            .iter()
            .any(|d| d.code == "parse_error" || d.file == "media/labels.jsonl"),
        "no-sidecar pack must stay clean: {diags:?}"
    );
}

#[test]
fn sidecar_labels_are_exposed_keyed_by_sentence_id() {
    let tmp = tempfile::tempdir().unwrap();
    seed(tmp.path());
    fs::write(
        tmp.path().join("media/labels.jsonl"),
        concat!(
            "{\"id\":\"ru.sent.demo.hello\",\"tokens\":[{\"t\":\"книгами\",\"l\":\"ins.pl\"}]}\n",
            "{\"id\":\"ja.sent.demo.hajimemashite\",\"tokens\":[{\"t\":\"はじめまして\",\"l\":\"greeting\"}]}\n",
        ),
    )
    .expect("write sidecar");
    let pack = Pack::load_dir(tmp.path()).expect("load pack");
    assert_eq!(pack.grammar_labels().len(), 2);
    assert_eq!(
        pack.grammar_labels_for("ru.sent.demo.hello").unwrap(),
        [GrammarLabel {
            token: "книгами".into(),
            label: "ins.pl".into()
        }]
    );
    // Declared data under media/, not an unlisted asset (same whitelist as
    // words.jsonl): no media_unlisted diagnostic names it.
    let diags = pack.validate(Mode::Scaffold, None);
    assert!(
        !diags
            .iter()
            .any(|d| d.code == "media_unlisted" && d.file.contains("labels")),
        "labels.jsonl needs no manifest row: {diags:?}"
    );
    assert!(
        !codes(&diags, Severity::Error).contains(&"parse_error".to_string()),
        "well-formed sidecar must not parse-error: {diags:?}"
    );
}

#[test]
fn malformed_sidecar_line_surfaces_a_clear_error() {
    let tmp = tempfile::tempdir().unwrap();
    seed(tmp.path());
    fs::write(
        tmp.path().join("media/labels.jsonl"),
        concat!(
            "{\"id\":\"ru.sent.demo.hello\",\"tokens\":[]}\n",
            "this is not a json row\n",
        ),
    )
    .expect("write sidecar");
    let pack = Pack::load_dir(tmp.path()).expect("load pack");
    // A corrupt overlay is never half-trusted: no labels, and the failure
    // is a locateable parse_error.
    assert!(pack.grammar_labels_for("ru.sent.demo.hello").is_none());
    let parse = pack
        .validate(Mode::Scaffold, None)
        .into_iter()
        .find(|d| d.code == "parse_error" && d.file == "media/labels.jsonl")
        .expect("malformed sidecar must report a parse_error");
    assert!(
        parse.message.contains("line 2"),
        "error must name the line: {parse:?}"
    );
}

fn codes(diags: &[Diagnostic], severity: Severity) -> Vec<String> {
    diags
        .iter()
        .filter(|d| d.severity == severity)
        .map(|d| d.code.clone())
        .collect()
}
