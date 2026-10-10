//! Media manifest integrity (ADR-0016): `media/manifest.jsonl` must describe
//! the bytes that actually ship, in both directions. A manifest that drifts
//! from the audio is worse than no manifest, because the app reads provenance
//! from it instead of guessing from file presence. The manifest is also tied
//! to the pack's content items: `model-output` audio must record the exact
//! string fed to the engine, and that string must be the reading the item
//! declares — audio is synthesized FROM the declared reading when one exists
//! (K-65: the learner heard "konichi ha" because the tie was absent).

use lts_langpack::{Mode, Pack, Severity, archive::hex_sha256};
use std::fs;
use std::path::{Path, PathBuf};

fn wav_bytes(payload: &[u8]) -> Vec<u8> {
    // RIFF/WAVE-shaped bytes: the audit hashes what is on disk, it does not
    // decode audio.
    let mut v = b"RIFF0000WAVEfmt ".to_vec();
    v.extend_from_slice(payload);
    v
}

fn row(id: &str, file: &str, sha: &str, len: u64) -> String {
    row_text(id, file, sha, len, "きて")
}

fn row_text(id: &str, file: &str, sha: &str, len: u64, text: &str) -> String {
    serde_json::json!({
        "id": id,
        "file": file,
        "sha256": sha,
        "bytes": len,
        "sample_rate": 24000,
        "channels": 1,
        "seconds": 0.5,
        "provenance": "model-output",
        "synthesizer": {
            "runtime": "sherpa-onnx-v1.13.8-linux-x64-shared",
            "model": "kokoro-multi-lang-v1_1",
            "model_sha256": "0".repeat(64),
            "voice": "37",
            "speed": 1.0
        },
        "text": text,
        "generated": "2026-10-07",
        "notes": "test fixture"
    })
    .to_string()
}

/// Fixture pack that validates clean, plus a media directory shaped as asked.
/// The seed must be clean: `archive::build` fails on any scaffold error, which
/// would mask the media gate the last test is about.
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

fn pack_with(dir: &Path, rows: &[String], files: &[(&str, Vec<u8>)]) -> Pack {
    let seed =
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../tests/fixtures/packs/valid-minimal");
    copy_dir(&seed, dir);
    // Tests here author their own rows over files that deliberately resolve to
    // nothing, so drop the fixture's own content and media: its covered `hola`
    // entry would otherwise show up as uncovered-addressable noise (K-90).
    for d in ["lexicon", "sentences", "phonology", "media"] {
        let p = dir.join(d);
        if p.exists() {
            fs::remove_dir_all(&p).expect("clear seed dir");
        }
    }
    let media = dir.join("media");
    fs::create_dir_all(&media).expect("create media dir");
    let joined: String = rows.iter().map(|r| format!("{r}\n")).collect();
    fs::write(media.join("manifest.jsonl"), joined).expect("write media manifest");
    for (name, bytes) in files {
        fs::write(media.join(name), bytes).expect("write media file");
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

#[test]
fn declared_asset_matching_its_bytes_is_clean() {
    let tmp = tempfile::tempdir().unwrap();
    let body = wav_bytes(b"hello");
    let sha = hex_sha256(&body);
    let len = body.len() as u64;
    let pack = pack_with(
        tmp.path(),
        &[row("ja.demo.kite-0", "media/ja.demo.kite-0.wav", &sha, len)],
        &[("ja.demo.kite-0.wav", body)],
    );
    let diags = pack.audit_media(true);
    assert!(diags.is_empty(), "clean pair: {diags:?}");
    assert!(
        !codes(&pack.validate(Mode::Install, None), Severity::Error)
            .iter()
            .any(|c| c.starts_with("media_")),
        "install validation must stay clean: {:?}",
        pack.validate(Mode::Install, None)
    );
}

#[test]
fn tampered_audio_fails_whatever_the_mode() {
    let tmp = tempfile::tempdir().unwrap();
    let declared = hex_sha256(&wav_bytes(b"hello"));
    let tampered = wav_bytes(b"hellp");
    let len = tampered.len() as u64;
    let pack = pack_with(
        tmp.path(),
        &[row(
            "ja.demo.kite-0",
            "media/ja.demo.kite-0.wav",
            &declared,
            len,
        )],
        &[("ja.demo.kite-0.wav", tampered)],
    );
    for require_present in [true, false] {
        let diags = pack.audit_media(require_present);
        assert!(
            codes(&diags, Severity::Error).contains(&"media_hash_mismatch".to_string()),
            "require_present={require_present}: {diags:?}"
        );
    }
    // Even a source checkout (scaffold) fails: the manifest would be lying.
    assert!(
        codes(&pack.validate(Mode::Scaffold, None), Severity::Error)
            .contains(&"media_hash_mismatch".to_string()),
        "validate(scaffold): {:?}",
        pack.validate(Mode::Scaffold, None)
    );
}

#[test]
fn unbuilt_media_blocks_install_and_speaks_once_in_a_checkout() {
    let tmp = tempfile::tempdir().unwrap();
    let declared = hex_sha256(&wav_bytes(b"hello"));
    let pack = pack_with(
        tmp.path(),
        &[
            row("ja.demo.kite-0", "media/ja.demo.kite-0.wav", &declared, 17),
            row("ja.demo.kite-1", "media/ja.demo.kite-1.wav", &declared, 17),
        ],
        &[],
    );
    let install = pack.audit_media(true);
    assert!(
        codes(&install, Severity::Error).contains(&"media_unbuilt".to_string()),
        "install must refuse audio the pack never built: {install:?}"
    );
    let scaffold = pack.audit_media(false);
    let infos: Vec<_> = scaffold
        .iter()
        .filter(|d| d.code == "media_unbuilt")
        .collect();
    assert_eq!(
        infos.len(),
        1,
        "an unbuilt checkout is one fact, not one diagnostic per asset: {scaffold:?}"
    );
    assert_eq!(infos[0].severity, Severity::Info);
    assert_eq!(codes(&scaffold, Severity::Error).len(), 0, "{scaffold:?}");
    assert!(infos[0].message.contains("2 asset"), "{}", infos[0].message);
}

#[test]
fn partially_built_media_is_refused_in_every_mode() {
    let tmp = tempfile::tempdir().unwrap();
    let body = wav_bytes(b"hello");
    let sha = hex_sha256(&body);
    let len = body.len() as u64;
    let missing = hex_sha256(&wav_bytes(b"other"));
    let pack = pack_with(
        tmp.path(),
        &[
            row("ja.demo.kite-0", "media/ja.demo.kite-0.wav", &sha, len),
            row("ja.demo.kite-1", "media/ja.demo.kite-1.wav", &missing, 17),
        ],
        &[("ja.demo.kite-0.wav", body)],
    );
    for require_present in [true, false] {
        let diags = pack.audit_media(require_present);
        assert!(
            codes(&diags, Severity::Error).contains(&"media_missing".to_string()),
            "require_present={require_present}: a half-built media directory cannot be \
             trusted as provenance: {diags:?}"
        );
        assert!(
            !codes(&diags, Severity::Error).contains(&"media_unbuilt".to_string()),
            "some audio is present, so this is not an unbuilt checkout: {diags:?}"
        );
    }
}

#[test]
fn undeclared_media_file_is_caught() {
    let tmp = tempfile::tempdir().unwrap();
    let body = wav_bytes(b"hello");
    let sha = hex_sha256(&body);
    let len = body.len() as u64;
    let pack = pack_with(
        tmp.path(),
        &[row("ja.demo.kite-0", "media/ja.demo.kite-0.wav", &sha, len)],
        &[
            ("ja.demo.kite-0.wav", body),
            ("ja.demo.stray.wav", wav_bytes(b"undeclared")),
        ],
    );
    let diags = pack.audit_media(true);
    assert!(
        codes(&diags, Severity::Warning).contains(&"media_unlisted".to_string()),
        "an asset with no manifest row has no declared provenance: {diags:?}"
    );
    // And it is never reported for the declared pair.
    assert_eq!(
        diags
            .iter()
            .filter(|d| d.code == "media_unlisted" && d.message.contains("ja.demo.kite-0"))
            .count(),
        0
    );
}

#[test]
fn drifting_media_is_refused_by_build() {
    // Build is where generated bytes and the committed manifest meet: hash drift
    // must stop the archive rather than ship a manifest that lies.
    let tmp = tempfile::tempdir().unwrap();
    let declared = hex_sha256(&wav_bytes(b"hello"));
    let pack_dir = tmp.path().to_path_buf();
    let pack = pack_with(
        &pack_dir,
        &[row(
            "ja.demo.kite-0",
            "media/ja.demo.kite-0.wav",
            &declared,
            5,
        )],
        &[("ja.demo.kite-0.wav", wav_bytes(b"worse"))],
    );
    assert!(
        pack.audit_media(true)
            .iter()
            .any(|d| d.severity == Severity::Error)
    );
    let err = lts_langpack::archive::build(&pack_dir)
        .expect_err("build must refuse a drifting media manifest");
    assert!(err.contains("media"), "{err}");
}

#[test]
fn an_unbuilt_pack_never_builds_since_nothing_falls_back_anymore() {
    // The old policy shipped an audio-less archive because the app could
    // synthesize on demand. ADR-0024 removed runtime synthesis: such an
    // archive is a silent pack, so build refuses it outright (K-90).
    let tmp = tempfile::tempdir().unwrap();
    let declared = hex_sha256(&wav_bytes(b"hello"));
    let pack_dir = tmp.path().to_path_buf();
    pack_with(
        &pack_dir,
        &[row(
            "ja.demo.kite-0",
            "media/ja.demo.kite-0.wav",
            &declared,
            17,
        )],
        &[],
    );
    let err = lts_langpack::archive::build(&pack_dir)
        .expect_err("build must refuse an archive that could only ship silence");
    assert!(
        err.contains("generate-pack-audio") && err.contains("ADR-0024"),
        "the refusal must point at the bake step: {err}"
    );
}

#[test]
fn a_built_manifest_that_misses_an_addressable_item_fails_the_install_gate() {
    // K-90: with runtime synthesis gone, one uncovered sentence is permanent
    // silence — the install gate must refuse the pack, naming the item.
    let tmp = tempfile::tempdir().unwrap();
    let covered = r#"{"id":"es.demo.one","status":"draft","text":"uno","reading":"uno","sources":["test-source"]}"#;
    let uncovered = r#"{"id":"es.demo.two","status":"draft","text":"dos","reading":"dos","sources":["test-source"]}"#;
    let body = wav_bytes(b"uno");
    let sha = hex_sha256(&body);
    let len = body.len() as u64;
    let pack = pack_with_content(
        tmp.path(),
        &[
            ("sentences/a.jsonl", covered),
            ("sentences/b.jsonl", uncovered),
        ],
        &[row_text(
            "es.demo.one",
            "media/es.demo.one.wav",
            &sha,
            len,
            "uno",
        )],
        &[("es.demo.one.wav", body)],
    );
    let diags = pack.audit_media(true);
    let miss: Vec<_> = diags
        .iter()
        .filter(|d| d.code == "media_asset_missing")
        .collect();
    assert_eq!(miss.len(), 1, "one aggregated coverage error: {diags:?}");
    assert_eq!(miss[0].severity, Severity::Error);
    assert!(miss[0].message.contains("es.demo.two"), "{miss:?}");
    assert!(
        !miss[0].message.contains("es.demo.one"),
        "covered item must not be named: {miss:?}"
    );
    // The refusal is not install-mode-only: a built manifest that describes
    // only part of the pack's audio describes it falsely in every posture.
    assert!(
        pack.audit_media(false)
            .iter()
            .any(|d| d.code == "media_asset_missing" && d.severity == Severity::Error),
        "coverage also fails non-install audits"
    );
    // An unbuilt checkout stays a single aggregated posture statement, not a
    // per-item storm (media_unbuilt already speaks for it).
    let unbuilt = pack_with_content(
        tmp.path().join("unbuilt").as_path(),
        &[
            ("sentences/a.jsonl", covered),
            ("sentences/b.jsonl", uncovered),
        ],
        &[row_text(
            "es.demo.one",
            "media/es.demo.one.wav",
            &sha,
            len,
            "uno",
        )],
        &[],
    );
    assert!(
        unbuilt
            .audit_media(true)
            .iter()
            .filter(|d| d.severity == Severity::Error)
            .all(|d| d.code == "media_unbuilt"),
        "unbuilt posture, no coverage storm: {:?}",
        unbuilt.audit_media(true)
    );
}

#[test]
fn a_pack_with_audio_addressable_items_and_no_media_manifest_fails_install() {
    // K-90: before ADR-0024 such a pack "worked" via runtime synthesis; now it
    // would silently ship nothing playable.
    let tmp = tempfile::tempdir().unwrap();
    let sentence = r#"{"id":"es.demo.greet","status":"draft","text":"hola","reading":"hola","sources":["test-source"]}"#;
    let pack = pack_with_content(tmp.path(), &[("sentences/a.jsonl", sentence)], &[], &[]);
    let install = pack.audit_media(true);
    assert!(
        install
            .iter()
            .any(|d| d.code == "media_manifest_absent" && d.severity == Severity::Error),
        "install must refuse: {install:?}"
    );
    let scaffold = pack.audit_media(false);
    assert!(
        scaffold
            .iter()
            .any(|d| d.code == "media_manifest_absent" && d.severity == Severity::Info),
        "a checkout may state it as info: {scaffold:?}"
    );
}

#[test]
fn a_partially_built_pack_never_builds() {
    let tmp = tempfile::tempdir().unwrap();
    let body = wav_bytes(b"hello");
    let sha = hex_sha256(&body);
    let len = body.len() as u64;
    let missing = hex_sha256(&wav_bytes(b"other"));
    let pack_dir = tmp.path().to_path_buf();
    pack_with(
        &pack_dir,
        &[
            row("ja.demo.kite-0", "media/ja.demo.kite-0.wav", &sha, len),
            row("ja.demo.kite-1", "media/ja.demo.kite-1.wav", &missing, 17),
        ],
        &[("ja.demo.kite-0.wav", body)],
    );
    let err = lts_langpack::archive::build(&pack_dir)
        .expect_err("a half-built media directory cannot be shipped");
    assert!(
        err.contains("media") && err.contains("partial"),
        "the refusal must name the partial media build: {err}"
    );
}

/// Same seed, but with content instances added first so media rows resolve
/// to declared readings. The other tests' `ja.demo.*` row ids deliberately
/// resolve to nothing; the reading-tie rule must not invent a verdict there.
fn pack_with_content(
    dir: &Path,
    content: &[(&str, &str)],
    rows: &[String],
    files: &[(&str, Vec<u8>)],
) -> Pack {
    let seed =
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../tests/fixtures/packs/valid-minimal");
    copy_dir(&seed, dir);
    // The seed fixture is fully covered for media (K-90 install gate); these
    // tests author their OWN content and rows, so drop the fixture's content
    // shards and media directory — otherwise the fixture's items appear as
    // uncovered addressable noise in every assertion here.
    for d in ["lexicon", "sentences", "phonology", "media"] {
        let p = dir.join(d);
        if p.exists() {
            fs::remove_dir_all(&p).expect("clear seed dir");
        }
    }
    for (rel, line) in content {
        let path = dir.join(rel);
        fs::create_dir_all(path.parent().unwrap()).expect("create content dir");
        fs::write(&path, format!("{line}\n")).expect("write content shard");
    }
    let media = dir.join("media");
    fs::create_dir_all(&media).expect("create media dir");
    let joined: String = rows.iter().map(|r| format!("{r}\n")).collect();
    fs::write(media.join("manifest.jsonl"), joined).expect("write media manifest");
    for (name, bytes) in files {
        fs::write(media.join(name), bytes).expect("write media file");
    }
    Pack::load_dir(dir).expect("load pack")
}

#[test]
fn synthesized_audio_must_record_the_declared_reading_not_the_surface_or_romaji() {
    let tmp = tempfile::tempdir().unwrap();
    let sentence = r#"{"id":"es.demo.greet","status":"draft","text":"今日は","reading":"こんにちは","sources":["test-source"]}"#;
    let body = wav_bytes(b"konichiha");
    let sha = hex_sha256(&body);
    let len = body.len() as u64;
    // The shipped failure mode verbatim: the item declares the kana reading
    // while the audio row records something else (a transliteration, or the
    // kanji surface). That audio cannot be trusted to speak the word.
    let pack = pack_with_content(
        tmp.path(),
        &[("sentences/greetings.jsonl", sentence)],
        &[row_text(
            "es.demo.greet",
            "media/es.demo.greet.wav",
            &sha,
            len,
            "konnichiwa",
        )],
        &[("es.demo.greet.wav", body.clone())],
    );
    for mode in [Mode::Scaffold, Mode::Install] {
        let diags = pack.validate(mode, None);
        assert!(
            codes(&diags, Severity::Error).contains(&"media_text_not_declared_reading".to_string()),
            "validate({mode:?}): {diags:?}"
        );
    }
    // The identical asset whose row records the declared reading passes the
    // tie: audio is allowed exactly when it is synthesized from the reading.
    let clean = pack_with_content(
        tmp.path(),
        &[("sentences/greetings.jsonl", sentence)],
        &[row_text(
            "es.demo.greet",
            "media/es.demo.greet.wav",
            &sha,
            len,
            "こんにちは",
        )],
        &[("es.demo.greet.wav", body)],
    );
    let diags = clean.validate(Mode::Scaffold, None);
    assert!(
        !codes(&diags, Severity::Error)
            .iter()
            .any(|c| c.starts_with("media_")),
        "reading-fed audio must stay clean: {diags:?}"
    );
}

#[test]
fn lexicon_audio_must_speak_a_scripted_reading_never_a_transliteration() {
    let tmp = tempfile::tempdir().unwrap();
    let entry = r#"{"id":"es.lex.demo.greet","status":"draft","forms":[{"text":"今日は","script":"kanji","is_primary":true}],"readings":[{"text":"こんにちは","script":"hiragana"},{"text":"konnichiwa","transliteration_system":"modified-hepburn"}],"glosses":{"en-US":["hello (scaffold)"]},"sources":["test-source"]}"#;
    let body = wav_bytes(b"spell-letters");
    let sha = hex_sha256(&body);
    let len = body.len() as u64;
    let romaji = pack_with_content(
        tmp.path(),
        &[("lexicon/demo.jsonl", entry)],
        &[row_text(
            "es.lex.demo.greet",
            "media/es.lex.demo.greet.wav",
            &sha,
            len,
            "konnichiwa",
        )],
        &[("es.lex.demo.greet.wav", body.clone())],
    );
    let diags = romaji.audit_media(false);
    assert!(
        codes(&diags, Severity::Error).contains(&"media_text_not_declared_reading".to_string()),
        "a transliteration is a scaffold, not speakable audio input: {diags:?}"
    );
    let kana = pack_with_content(
        tmp.path(),
        &[("lexicon/demo.jsonl", entry)],
        &[row_text(
            "es.lex.demo.greet",
            "media/es.lex.demo.greet.wav",
            &sha,
            len,
            "こんにちは",
        )],
        &[("es.lex.demo.greet.wav", body)],
    );
    assert!(
        kana.audit_media(false).is_empty(),
        "{:?}",
        kana.audit_media(false)
    );
}

#[test]
fn contrast_item_audio_ties_to_the_item_reading_and_counts_reading_gaps() {
    let tmp = tempfile::tempdir().unwrap();
    let contrast = r#"{"id":"es.demo.kin","status":"draft","feature_id":"es.phon.demo.nasal","items":[{"text":"金","reading":"きん"},{"text":"ぎん"}],"sources":["test-source"]}"#;
    let body0 = wav_bytes(b"kin");
    let body1 = wav_bytes(b"gin");
    let (sha0, sha1) = (hex_sha256(&body0), hex_sha256(&body1));
    let (len0, len1) = (body0.len() as u64, body1.len() as u64);
    let pack = pack_with_content(
        tmp.path(),
        &[("phonology/contrasts.jsonl", contrast)],
        &[
            row_text(
                "es.demo.kin-0",
                "media/es.demo.kin-0.wav",
                &sha0,
                len0,
                "きん",
            ),
            row_text(
                "es.demo.kin-1",
                "media/es.demo.kin-1.wav",
                &sha1,
                len1,
                "ぎん",
            ),
        ],
        &[("es.demo.kin-0.wav", body0), ("es.demo.kin-1.wav", body1)],
    );
    let diags = pack.audit_media(true);
    assert!(
        !codes(&diags, Severity::Error)
            .iter()
            .any(|c| c.starts_with("media_")),
        "reading-fed item 0 must pass: {diags:?}"
    );
    let infos = codes(&diags, Severity::Info);
    assert!(
        infos.contains(&"media_item_without_reading".to_string()),
        "item 1 carries audio with no declared reading anywhere: {diags:?}"
    );
    let gap = diags
        .iter()
        .find(|d| d.code == "media_item_without_reading")
        .unwrap();
    assert!(gap.message.contains("1 model-output asset"), "{gap:?}");
    assert!(gap.message.contains("es.demo.kin-1"), "{gap:?}");
    // Now break item 0's tie and confirm only the tie fails.
    let broken = pack_with_content(
        tmp.path(),
        &[("phonology/contrasts.jsonl", contrast)],
        &[
            row_text(
                "es.demo.kin-0",
                "media/es.demo.kin-0.wav",
                &sha0,
                len0,
                "金",
            ),
            row_text(
                "es.demo.kin-1",
                "media/es.demo.kin-1.wav",
                &sha1,
                len1,
                "ぎん",
            ),
        ],
        &[
            ("es.demo.kin-0.wav", wav_bytes(b"kin")),
            ("es.demo.kin-1.wav", wav_bytes(b"gin")),
        ],
    );
    let diags = broken.audit_media(true);
    let errs = codes(&diags, Severity::Error);
    assert_eq!(
        errs.iter()
            .filter(|c| *c == "media_text_not_declared_reading")
            .count(),
        1,
        "exactly the item-0 row lies about its input: {diags:?}"
    );
}

#[test]
fn lexicon_row_fed_the_kanji_surface_fails_tie_and_names_the_reading() {
    let tmp = tempfile::tempdir().unwrap();
    // The shipped failure verbatim: the entry is kanji-primary and declares
    // a kana reading; the manifest row recorded the kanji surface.
    let entry = r#"{"id":"es.lex.demo.konnichiwa","status":"draft","forms":[{"text":"今日は","script":"kanji","is_primary":true}],"readings":[{"text":"こんにちは","script":"hiragana"}],"glosses":{"en-US":["hello (scaffold)"]},"sources":["test-source"]}"#;
    let body = wav_bytes(b"garble");
    let sha = hex_sha256(&body);
    let len = body.len() as u64;
    let pack = pack_with_content(
        tmp.path(),
        &[("lexicon/demo.jsonl", entry)],
        &[row_text(
            "es.lex.demo.konnichiwa",
            "media/es.lex.demo.konnichiwa.wav",
            &sha,
            len,
            "今日は",
        )],
        &[("es.lex.demo.konnichiwa.wav", body.clone())],
    );
    let diags = pack.audit_media(false);
    let errs: Vec<_> = diags
        .iter()
        .filter(|d| d.code == "media_text_not_declared_reading")
        .collect();
    assert_eq!(errs.len(), 1, "exactly the surface-fed row lies: {diags:?}");
    // The finding must name the item and the declared reading(s) so the
    // pack worklist knows exactly which string to feed the engine.
    assert!(
        errs[0].message.contains("es.lex.demo.konnichiwa"),
        "{errs:?}"
    );
    assert!(errs[0].message.contains("こんにちは"), "{errs:?}");
    // The same row fed the declared kana reading is clean (the fix).
    let clean = pack_with_content(
        tmp.path(),
        &[("lexicon/demo.jsonl", entry)],
        &[row_text(
            "es.lex.demo.konnichiwa",
            "media/es.lex.demo.konnichiwa.wav",
            &sha,
            len,
            "こんにちは",
        )],
        &[("es.lex.demo.konnichiwa.wav", body)],
    );
    assert!(
        clean.audit_media(false).is_empty(),
        "reading-fed lexicon audio must stay clean: {:?}",
        clean.audit_media(false)
    );
}

#[test]
fn non_synthesized_audio_is_never_judged_against_declared_readings() {
    let tmp = tempfile::tempdir().unwrap();
    let entry = r#"{"id":"es.lex.demo.konnichiwa","status":"draft","forms":[{"text":"今日は","script":"kanji","is_primary":true}],"readings":[{"text":"こんにちは","script":"hiragana"}],"glosses":{"en-US":["hello (scaffold)"]},"sources":["test-source"]}"#;
    let body = wav_bytes(b"a-human-recording");
    let sha = hex_sha256(&body);
    let len = body.len() as u64;
    // The only non-model-output provenance the 0.2 schema allows
    // (`licensed-recording`): a recording is judged by its license, not by
    // a reading tie — its audio may legitimately say something the written
    // form does not.
    let row = serde_json::json!({
        "id": "es.lex.demo.konnichiwa",
        "file": "media/es.lex.demo.konnichiwa.wav",
        "sha256": sha,
        "bytes": len,
        "sample_rate": 24000,
        "channels": 1,
        "provenance": "licensed-recording",
        "notes": "licensed human recording"
    })
    .to_string();
    let pack = pack_with_content(
        tmp.path(),
        &[("lexicon/demo.jsonl", entry)],
        &[row],
        &[("es.lex.demo.konnichiwa.wav", body)],
    );
    let diags = pack.audit_media(false);
    assert!(
        diags.is_empty(),
        "licensed audio is not subject to the reading tie: {diags:?}"
    );
    // And validate() must not turn it into an error either.
    assert!(
        !codes(&pack.validate(Mode::Install, None), Severity::Error)
            .contains(&"media_text_not_declared_reading".to_string())
    );
}
