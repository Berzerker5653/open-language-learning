//! Transliteration-content lint (measured 2026-10 ja-JP defect classes,
//! repaired under the 2026-10 pack repair tasks): a `transliteration_system`
//! reading whose text is not romaji at all (`reading_transliteration_not_latin`,
//! e.g. "kentoう", "ronso2", "jiゅnり"), a sentence `romaji` field carrying
//! kana (`romaji_contains_kana`, while digits stay legal — "3-nen shokumu
//! keiken ga arimasu." is correct), and a hiragana/katakana `script` label
//! that disagrees with its own text (`form_script_mismatch`, e.g. ランキング
//! labelled hiragana, while まーけっと must stay clean under a hiragana
//! label because ー is script-neutral). All three land in `audit_lexicon`.
//! Content is authored inline over a copied seed, like tests/media.rs.

use lts_langpack::{Pack, Severity};
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

/// Seed pack with its content shards replaced by the given lines, so only
/// the audited content decides the verdict (audit_lexicon ignores media).
fn pack_with_shards(dir: &Path, shards: &[(&str, &str)]) -> Pack {
    let seed =
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../tests/fixtures/packs/valid-minimal");
    copy_dir(&seed, dir);
    for d in ["lexicon", "sentences", "phonology", "media"] {
        let p = dir.join(d);
        if p.exists() {
            fs::remove_dir_all(&p).expect("clear seed dir");
        }
    }
    for (rel, line) in shards {
        let path = dir.join(rel);
        fs::create_dir_all(path.parent().unwrap()).expect("create content dir");
        fs::write(&path, format!("{line}\n")).expect("write content shard");
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

/// Lexicon entry with one script-tagged kana form/reading plus a
/// `transliteration_system` reading.
fn entry(id: &str, kana: &str, kana_script: &str, romaji: &str) -> String {
    format!(
        r#"{{"id":"{id}","status":"draft","forms":[{{"text":"{kana}","script":"{kana_script}","is_primary":true}}],"readings":[{{"text":"{kana}","script":"{kana_script}"}},{{"text":"{romaji}","transliteration_system":"modified-hepburn"}}],"glosses":{{"en-US":["scaffold fixture"]}},"sources":["original-authoring"]}}"#
    )
}

/// Sentence record with a `romaji` field.
fn sentence(id: &str, text: &str, romaji: &str) -> String {
    format!(
        r#"{{"id":"{id}","status":"draft","text":"{text}","reading":"{text}","romaji":"{romaji}","gloss":"fixture sentence","sources":["original-authoring"]}}"#
    )
}

#[test]
fn transliteration_reading_with_kana_or_digit_is_flagged_and_names_the_kana() {
    let tmp = tempfile::tempdir().unwrap();
    let pack = pack_with_shards(
        tmp.path(),
        &[
            (
                "lexicon/a.jsonl",
                &entry("eo.lex.bad.kento", "けんとう", "hiragana", "kentoう"),
            ),
            (
                "lexicon/b.jsonl",
                &entry("eo.lex.bad.ronso", "ろんそう", "hiragana", "ronso2"),
            ),
            (
                "lexicon/c.jsonl",
                &entry("eo.lex.bad.juri", "じゅんり", "hiragana", "jiゅnり"),
            ),
        ],
    );
    let diags = pack.audit_lexicon();
    for expected in ["eo.lex.bad.kento", "eo.lex.bad.ronso", "eo.lex.bad.juri"] {
        let hits: Vec<&lts_langpack::Diagnostic> = diags
            .iter()
            .filter(|d| {
                d.code == "reading_transliteration_not_latin" && d.message.contains(expected)
            })
            .collect();
        // One diagnostic per offending entry (jiゅnり has two kana but is
        // one defect), so the gate's output maps 1:1 to repairable rows.
        assert_eq!(
            hits.len(),
            1,
            "{expected} must be flagged exactly once: {diags:?}"
        );
        assert_eq!(hits[0].severity, Severity::Error);
    }
    // The message must also show what the romaji was supposed to spell.
    let kento = diags
        .iter()
        .find(|d| d.code == "reading_transliteration_not_latin")
        .unwrap();
    assert!(
        kento.message.contains("けんとう"),
        "message must quote the declared kana reading: {kento:?}"
    );
}

#[test]
fn well_formed_transliteration_is_left_alone() {
    let tmp = tempfile::tempdir().unwrap();
    let pack = pack_with_shards(
        tmp.path(),
        &[
            (
                "lexicon/a.jsonl",
                &entry("eo.lex.ok.kentou", "けんとう", "hiragana", "kentou"),
            ),
            (
                "lexicon/b.jsonl",
                &entry("eo.lex.ok.ronsou", "ろんそう", "hiragana", "ronsou"),
            ),
            (
                "lexicon/c.jsonl",
                &entry("eo.lex.ok.punct", "じゅんり", "hiragana", "junri 'a-b. c"),
            ),
        ],
    );
    assert!(
        pack.audit_lexicon().is_empty(),
        "well-formed romaji must be clean: {:?}",
        pack.audit_lexicon()
    );
}

#[test]
fn sentence_romaji_with_kana_is_flagged() {
    let tmp = tempfile::tempdir().unwrap();
    let pack = pack_with_shards(
        tmp.path(),
        &[(
            "sentences/a.jsonl",
            &sentence("eo.sent.bad.juri", "じゅんりします。", "jiゅnり shimasu."),
        )],
    );
    let diags = pack.audit_lexicon();
    assert!(
        codes(&diags, Severity::Error).contains(&"romaji_contains_kana".to_string()),
        "kana inside sentence romaji must be an error: {diags:?}"
    );
    let hit = diags
        .iter()
        .find(|d| d.code == "romaji_contains_kana")
        .unwrap();
    assert!(
        hit.message.contains("eo.sent.bad.juri") && hit.message.contains("jiゅnり"),
        "message must name the sentence and quote the romaji: {hit:?}"
    );
}

#[test]
fn sentence_romaji_may_contain_digits() {
    // Measured correct pack content: sentence texts legitimately carry
    // Arabic numerals, so digits must NOT trip romaji_contains_kana.
    let tmp = tempfile::tempdir().unwrap();
    let pack = pack_with_shards(
        tmp.path(),
        &[(
            "sentences/a.jsonl",
            &sentence(
                "eo.sent.ok.resume",
                "3年の職務経験があります。",
                "3-nen shokumu keiken ga arimasu.",
            ),
        )],
    );
    assert!(
        pack.audit_lexicon().is_empty(),
        "digits in sentence romaji are legitimate: {:?}",
        pack.audit_lexicon()
    );
}

#[test]
fn script_label_disagreeing_with_its_own_text_is_flagged() {
    let tmp = tempfile::tempdir().unwrap();
    let kata_as_hira = r#"{"id":"eo.lex.bad.rankingu","status":"draft","forms":[{"text":"ランキング","script":"hiragana","is_primary":true}],"readings":[{"text":"ランキング","script":"hiragana"}],"glosses":{"en-US":["ranking (regression: katakana word labelled hiragana)"]},"sources":["original-authoring"]}"#;
    let hira_as_kata = r#"{"id":"eo.lex.bad.kana-label","status":"draft","forms":[{"text":"ひらがな","script":"katakana","is_primary":true}],"readings":[{"text":"ひらがな","script":"katakana"}],"glosses":{"en-US":["hiragana (regression: hiragana word labelled katakana)"]},"sources":["original-authoring"]}"#;
    let pack = pack_with_shards(
        tmp.path(),
        &[
            ("lexicon/a.jsonl", kata_as_hira),
            ("lexicon/b.jsonl", hira_as_kata),
        ],
    );
    let diags = pack.audit_lexicon();
    let hits: Vec<&lts_langpack::Diagnostic> = diags
        .iter()
        .filter(|d| d.code == "form_script_mismatch")
        .collect();
    // One diagnostic per offending field (form and reading each once).
    assert_eq!(hits.len(), 4, "expected two items x two fields: {diags:?}");
    assert!(
        hits.iter().any(|d| d.severity == Severity::Error
            && d.message.contains("eo.lex.bad.rankingu")
            && d.message.contains("label it katakana")),
        "katakana word labelled hiragana must be an error naming the item: {diags:?}"
    );
    assert!(
        hits.iter().any(|d| d.severity == Severity::Error
            && d.message.contains("eo.lex.bad.kana-label")
            && d.message.contains("label it hiragana")),
        "hiragana word labelled katakana must be an error naming the item: {diags:?}"
    );
}

#[test]
fn script_neutral_marks_keep_kana_labels_clean() {
    // ー (U+30FC) and ・ (U+30FB) are script-neutral: many hiragana words
    // legitimately contain ー (まーけっと) and katakana words carry ー
    // (コーヒー); neither may trip form_script_mismatch.
    let tmp = tempfile::tempdir().unwrap();
    let hira_mark = r#"{"id":"eo.lex.ok.market","status":"draft","forms":[{"text":"まーけっと","script":"hiragana","is_primary":true}],"readings":[{"text":"まーけっと","script":"hiragana"}],"glosses":{"en-US":["market (hiragana with prolonged sound mark)"]},"sources":["original-authoring"]}"#;
    let kata_long = r#"{"id":"eo.lex.ok.coffee","status":"draft","forms":[{"text":"コーヒー","script":"katakana","is_primary":true}],"readings":[{"text":"コーヒー","script":"katakana"}],"glosses":{"en-US":["coffee (katakana with prolonged sound mark)"]},"sources":["original-authoring"]}"#;
    let kata_middle = r#"{"id":"eo.lex.ok.news","status":"draft","forms":[{"text":"ニュース","script":"katakana","is_primary":true}],"readings":[{"text":"ニュース・ガイド","script":"katakana"}],"glosses":{"en-US":["news guide (katakana with middot)"]},"sources":["original-authoring"]}"#;
    let pack = pack_with_shards(
        tmp.path(),
        &[
            ("lexicon/a.jsonl", hira_mark),
            ("lexicon/b.jsonl", kata_long),
            ("lexicon/c.jsonl", kata_middle),
        ],
    );
    assert!(
        pack.audit_lexicon().is_empty(),
        "script-neutral ー/・ must not split kana labels: {:?}",
        pack.audit_lexicon()
    );
}

#[test]
fn mixed_script_text_keeps_whichever_kana_label_it_carries() {
    // Real ja-JP content: エコくるま (katakana エコ + hiragana くるま) and
    // はんばーガー. Both blocks are present, so neither label is outright
    // wrong and relabelling could not make the entry consistent — flagging
    // them would be an error no author can clear.
    let tmp = tempfile::tempdir().unwrap();
    let mixed_hira = r#"{"id":"eo.lex.mix.eco-kuruma","status":"draft","forms":[{"text":"エコくるま","script":"hiragana","is_primary":true}],"readings":[{"text":"エコくるま","script":"hiragana"}],"glosses":{"en-US":["eco car (mixed script)"]},"sources":["original-authoring"]}"#;
    let mixed_kata = r#"{"id":"eo.lex.mix.hamburger","status":"draft","forms":[{"text":"はんばーガー","script":"katakana","is_primary":true}],"readings":[{"text":"はんばーガー","script":"katakana"}],"glosses":{"en-US":["hamburger (mixed script)"]},"sources":["original-authoring"]}"#;
    let pure_kata = r#"{"id":"eo.lex.bad.rankingu","status":"draft","forms":[{"text":"ランキング","script":"hiragana","is_primary":true}],"readings":[{"text":"ランキング","script":"hiragana"}],"glosses":{"en-US":["ranking (katakana labelled hiragana)"]},"sources":["original-authoring"]}"#;
    let pack = pack_with_shards(
        tmp.path(),
        &[
            ("lexicon/mixed.jsonl", mixed_hira),
            ("lexicon/mixed2.jsonl", mixed_kata),
            ("lexicon/pure.jsonl", pure_kata),
        ],
    );
    let audit = pack.audit_lexicon();
    let hits: Vec<&lts_langpack::Diagnostic> = audit
        .iter()
        .filter(|d| d.code == "form_script_mismatch")
        .collect();
    assert_eq!(
        2,
        hits.len(),
        "only the pure katakana entry may be flagged: {hits:?}"
    );
    assert!(
        hits.iter().all(|d| d.file.contains("pure.jsonl")),
        "mixed-script entries must stay silent: {hits:?}"
    );
}

#[test]
fn the_validator_adopts_the_romaji_rules_and_nothing_else_from_the_audit() {
    // validate() is the install gate. A romaji field that is not romaji makes
    // the entry misleading on screen, so it must stop installation; the rest
    // of audit_lexicon (script contamination, Cyrillic stress) stays
    // audit-only rather than widening the gate by accident.
    let tmp = tempfile::tempdir().unwrap();
    let broken = entry("eo.lex.bad.kenso", "けんとう", "hiragana", "kentoう");
    let clean = entry("eo.lex.ok.kenso", "けんとう", "hiragana", "kentou");
    let contaminated = entry("eo.lex.auditonly.contam", "けんaとう", "hiragana", "kentou");
    let kana_romaji = sentence("eo.sent.bad", "ねむい", "neむい");
    let pack = pack_with_shards(
        tmp.path(),
        &[
            ("lexicon/a.jsonl", &broken),
            ("lexicon/b.jsonl", &clean),
            ("lexicon/c.jsonl", &contaminated),
            ("sentences/s.jsonl", &kana_romaji),
        ],
    );
    let diags = pack.validate(lts_langpack::Mode::Scaffold, None);
    let adopted: Vec<&lts_langpack::Diagnostic> = diags
        .iter()
        .filter(|d| {
            matches!(
                d.code.as_str(),
                "reading_transliteration_not_latin" | "romaji_contains_kana"
            )
        })
        .collect();
    assert_eq!(
        2,
        adopted.len(),
        "one broken transliteration plus one kana romaji field must fail validation: {diags:?}"
    );
    assert!(
        adopted.iter().all(|d| d.severity == Severity::Error),
        "the gate may not downgrade these: {adopted:?}"
    );
    assert!(
        !adopted.iter().any(|d| d.file.contains("b.jsonl")),
        "the well-formed twin must stay clean: {adopted:?}"
    );
    assert!(
        !codes(&diags, Severity::Error).contains(&"lexicon_script_contamination".to_string()),
        "audit-only rules must not leak into the install gate: {diags:?}"
    );
    assert!(
        codes(&pack.audit_lexicon(), Severity::Error)
            .contains(&"lexicon_script_contamination".to_string()),
        "…but the audit still has to report them"
    );
}
