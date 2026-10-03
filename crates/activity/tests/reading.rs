//! READ-001 acceptance:
//! 1. furigana and romaji visibility respond to mastery/settings;
//! 2. canonical text remains Japanese script;
//! 3. reading evidence is independent from listening/speaking.

use lts_activity::{
    HIDE_AT_STATE, ReaderSettings, ReadingItem, RomajiUserMode, is_kana_only,
    render_reading_display,
};
use lts_domain::{ContentId, EventId, MasteryState, ProfileId, Score};
use lts_langpack::Pack;
use std::path::PathBuf;

fn kanji_item() -> ReadingItem {
    ReadingItem {
        item_id: "ja.lex.person.watashi".into(),
        text: "私".into(),
        reading: Some("わたし".into()),
        romaji: Some("watashi".into()),
    }
}

fn kana_item() -> ReadingItem {
    ReadingItem {
        item_id: "ja.lex.greeting.konnichiwa".into(),
        text: "こんにちは".into(),
        reading: Some("こんにちは".into()),
        romaji: Some("konnichiwa".into()),
    }
}

#[test]
fn visibility_responds_to_mastery() {
    let auto = ReaderSettings::default();
    let item = kanji_item();

    // New item: scaffolds visible (on-ramp support).
    let d = render_reading_display(&item, None, &auto);
    assert_eq!(d.furigana.as_deref(), Some("わたし"));
    assert_eq!(d.romaji.as_deref(), Some("watashi"));
    assert!(!d.faded_by_mastery);
    assert!(d.support_reveals.is_empty());

    // Below hide_at_state: still visible.
    let d = render_reading_display(&item, Some(MasteryState::Introduced), &auto);
    assert!(d.furigana.is_some() && d.romaji.is_some());

    // At/above hide_at_state: faded automatically, no support recorded.
    for state in [
        HIDE_AT_STATE,
        MasteryState::Independent,
        MasteryState::Flexible,
        MasteryState::Retained,
    ] {
        let d = render_reading_display(&item, Some(state), &auto);
        assert_eq!(d.furigana, None, "furigana at {state:?}");
        assert_eq!(d.romaji, None, "romaji at {state:?}");
        assert!(d.support_reveals.is_empty());
        assert!(d.faded_by_mastery);
    }
}

#[test]
fn visibility_responds_to_settings_and_kana_literacy() {
    let item = kanji_item();
    let kana = kana_item();

    // User keeps romaji everywhere: visible even at mastery.
    let always = ReaderSettings {
        romaji_mode: RomajiUserMode::Always,
        ..Default::default()
    };
    let d = render_reading_display(&item, Some(MasteryState::Independent), &always);
    assert_eq!(d.romaji.as_deref(), Some("watashi"));
    assert!(
        d.support_reveals.is_empty(),
        "standing user mode is not a reveal"
    );

    // User opted out: hidden even for a new item.
    let off = ReaderSettings {
        romaji_mode: RomajiUserMode::Off,
        ..Default::default()
    };
    let d = render_reading_display(&item, None, &off);
    assert_eq!(d.romaji, None);

    // Kana items: romaji fades with kana literacy; furigana never on.
    let literate = ReaderSettings {
        kana_literacy_established: true,
        ..Default::default()
    };
    let d = render_reading_display(&kana, None, &literate);
    assert_eq!(d.romaji, None);
    assert_eq!(d.furigana, None, "furigana never on kana-only items");
    assert!(is_kana_only("こんにちは"));
    assert!(!is_kana_only("私"));

    // Before literacy: kana romaji stays as on-ramp support.
    let d = render_reading_display(&kana, None, &ReaderSettings::default());
    assert_eq!(d.romaji.as_deref(), Some("konnichiwa"));
}

#[test]
fn on_demand_reveal_is_always_available_and_counts_as_support() {
    // At mastery state where scaffolds auto-fade, the learner can still
    // reveal both; each reveal is recorded as support (never blocked).
    let item = kanji_item();
    let forced = ReaderSettings {
        furigana_forced: Some(true),
        romaji_forced: Some(true),
        ..Default::default()
    };
    let d = render_reading_display(&item, Some(MasteryState::Independent), &forced);
    assert_eq!(d.furigana.as_deref(), Some("わたし"));
    assert_eq!(d.romaji.as_deref(), Some("watashi"));
    assert!(
        d.support_reveals
            .contains(&lts_activity::SupportAction::SuppliedReading)
    );
    assert!(
        d.support_reveals
            .contains(&lts_activity::SupportAction::RomajiReveal)
    );
}

#[test]
fn canonical_text_remains_japanese_script() {
    let item = kanji_item();
    let forced = ReaderSettings {
        romaji_mode: RomajiUserMode::Always,
        romaji_forced: Some(true),
        ..Default::default()
    };
    let d = render_reading_display(&item, None, &forced);
    // Romaji is auxiliary; canonical is untouched Japanese script.
    assert_eq!(d.canonical, "私");
    assert!(d.romaji.is_some());
    assert!(d.canonical.chars().all(|c| !c.is_ascii_alphabetic()));
}

#[test]
fn reading_evidence_is_independent_from_listening_and_speaking() {
    // A reading attempt made WITH revealed romaji/furigana: support is
    // recorded, and the evidence can only ever affect reading/recall
    // dimensions, never listening or speaking mastery.
    let dir =
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../tests/fixtures/packs/valid-full");
    let pack = Pack::load_dir(&dir).unwrap();
    let rt = lts_activity::ActivityRuntime::from_pack(&pack).unwrap();
    let activity = rt.render("es.activity.intro.match").unwrap(); // reading modality

    let item = kanji_item();
    let forced = ReaderSettings {
        furigana_forced: Some(true),
        romaji_forced: Some(true),
        ..Default::default()
    };
    let display = render_reading_display(&item, Some(MasteryState::Independent), &forced);

    let mut attempt = lts_activity::Attempt::begin(
        &activity,
        vec![ContentId::parse("ja.lex.person.watashi").unwrap()],
        None,
        Some(ContentId::parse("ja.expr.person.watashi").unwrap()),
    );
    for action in &display.support_reveals {
        attempt.use_support(*action);
    }
    let out = attempt.submit(
        Score::Correct,
        EventId::new("e-read"),
        "2026-10-03T12:00:00Z",
        ProfileId::new("p1"),
    );
    assert!(
        out.evidence
            .support_actions
            .contains(&"supplied-reading".to_string())
    );
    assert!(
        out.evidence
            .support_actions
            .contains(&"romaji-revealed".to_string())
    );
    assert!(!out.independent_success);

    let text = std::fs::read_to_string(
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../docs/assessment/MASTERY_POLICY.yaml"),
    )
    .unwrap();
    let policy = lts_learner_model::policy::Policy::load(&text).unwrap();
    let events = [out.evidence.clone()];

    // Reading dimension sees the (supported) evidence...
    let reading = lts_learner_model::derive::derive_mastery(
        &policy,
        "ja.lex.person.watashi",
        lts_domain::MasteryDimension::ComprehensionReading,
        &events,
        &[],
        "2026-10-03T13:00:00Z",
    )
    .unwrap();
    assert_ne!(reading.state, MasteryState::Unseen);

    // ...listening and speaking are untouched by reading evidence.
    for dim in [
        lts_domain::MasteryDimension::ComprehensionListening,
        lts_domain::MasteryDimension::ProductionSpeaking,
    ] {
        let other = lts_learner_model::derive::derive_mastery(
            &policy,
            "ja.lex.person.watashi",
            dim,
            &events,
            &[],
            "2026-10-03T13:00:00Z",
        )
        .unwrap();
        assert_eq!(other.state, MasteryState::Unseen, "{dim:?} polluted");
    }
}
