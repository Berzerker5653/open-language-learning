//! WORD-TIMING-001: `media/words.jsonl` is an optional word-timing overlay.
//! A pack without the sidecar must load and validate exactly as it did
//! before; a pack with it exposes word spans keyed by clip id; a malformed
//! row surfaces as a `parse_error` naming its line and the overlay is simply
//! absent (the app then behaves as if the sidecar never existed).

use lts_langpack::{Mode, Pack, Severity, WordSpan};
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
    assert!(pack.word_timings().is_empty());
    assert!(pack.word_timings_for("ja.lex.demo.konnichiwa").is_none());
    // No media/word-timing diagnostic of any kind was introduced.
    let diags = pack.validate(Mode::Scaffold, None);
    assert!(
        !diags
            .iter()
            .any(|d| d.code == "parse_error" || d.file == "media/words.jsonl"),
        "no-sidecar pack must stay clean: {diags:?}"
    );
}

#[test]
fn sidecar_timings_are_exposed_keyed_by_clip_id() {
    let tmp = tempfile::tempdir().unwrap();
    seed(tmp.path());
    fs::write(
        tmp.path().join("media/words.jsonl"),
        concat!(
            "{\"id\":\"ja.lex.demo.konnichiwa\",\"words\":[{\"w\":\"こんにちは\",\"s\":0.0,\"e\":0.4}]}\n",
            "{\"id\":\"ru.sent.demo.hello\",\"words\":[{\"w\":\"Привет\",\"s\":0.1,\"e\":0.5},{\"w\":\"миру\",\"s\":0.6,\"e\":1.0}]}\n",
        ),
    )
    .expect("write sidecar");
    let pack = Pack::load_dir(tmp.path()).expect("load pack");
    assert_eq!(pack.word_timings().len(), 2);
    assert_eq!(
        pack.word_timings_for("ru.sent.demo.hello").unwrap(),
        [
            WordSpan {
                w: "Привет".into(),
                s: 0.1,
                e: 0.5
            },
            WordSpan {
                w: "миру".into(),
                s: 0.6,
                e: 1.0
            },
        ]
    );
    // The sidecar is declared data under media/, not an unlisted asset.
    let diags = pack.validate(Mode::Scaffold, None);
    assert!(
        !diags
            .iter()
            .any(|d| d.code == "media_unlisted" && d.file.contains("words")),
        "words.jsonl needs no manifest row: {diags:?}"
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
        tmp.path().join("media/words.jsonl"),
        concat!(
            "{\"id\":\"ja.lex.demo.konnichiwa\",\"words\":[]}\n",
            "this is not a json row\n",
        ),
    )
    .expect("write sidecar");
    let pack = Pack::load_dir(tmp.path()).expect("load pack");
    // A corrupt overlay is never half-trusted: no spans, and the failure is
    // a locateable parse_error.
    assert!(pack.word_timings_for("ja.lex.demo.konnichiwa").is_none());
    let parse = pack
        .validate(Mode::Scaffold, None)
        .into_iter()
        .find(|d| d.code == "parse_error" && d.file == "media/words.jsonl")
        .expect("malformed sidecar must report a parse_error");
    assert!(
        parse.message.contains("line 2"),
        "error must name the line: {parse:?}"
    );
}

fn codes(diags: &[lts_langpack::Diagnostic], severity: Severity) -> Vec<String> {
    diags
        .iter()
        .filter(|d| d.severity == severity)
        .map(|d| d.code.clone())
        .collect()
}
