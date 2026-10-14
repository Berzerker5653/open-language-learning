//! DATA-002 acceptance: export/import round-trip, no silent overwrite,
//! recordings opt-in.

use lts_domain::{
    ActivityModality, ContentId, EventId, EvidenceCorrection, EvidenceEvent, ProfileId, Score,
    SupportLevel,
};
use lts_storage::{
    ContentVersion, ExportOptions, ImportError, ImportMode, LearnerGoal, MasterySnapshot,
    NewMinedItem, NewRecording, PackInstallation, SchedulerRecord, Store,
};
use serde_json::json;

fn sample_event(profile: &ProfileId, id: &str) -> EvidenceEvent {
    EvidenceEvent {
        event_id: EventId::new(id),
        occurred_at: "2026-10-02T12:00:00Z".into(),
        profile_id: profile.clone(),
        targets: vec![ContentId::parse("es.lex.greet.hola").unwrap()],
        modality: ActivityModality::RecallMeaning,
        activity_id: ContentId::parse("es.activity.drills.match").unwrap(),
        prompt_family_id: Some(ContentId::parse("es.expr.greet.hola").unwrap()),
        attempt_group_id: Some("group-1".into()),
        support_level: SupportLevel::new(1).unwrap(),
        support_actions: vec!["first-letter-hint".into()],
        outcome: lts_domain::Outcome::Scored,
        score: Some(Score::Correct),
        assessment_kind: None,
        held_out: true,
        provider_confidence: None,
        pack_id: "org.openlanguage.test".into(),
        pack_version: "0.1.0".into(),
        rubric_version: Some("r1".into()),
        policy_version: Some("p1".into()),
        provider_id: None,
        failure_reason: None,
    }
}

/// Populate a store with one profile's worth of every learner data kind.
fn seed(store: &Store) -> String {
    let p = store
        .create_profile("Test Learner", "2026-01-01T00:00:00Z")
        .unwrap();
    let pid = &p.id;
    let profile_id = ProfileId::new(pid.clone());

    store.set_setting(pid, "ui.theme", &json!("dark")).unwrap();
    store.set_setting(pid, "daily.minutes", &json!(10)).unwrap();
    store
        .set_goal(
            pid,
            &LearnerGoal {
                goal_id: "goal-a2".into(),
                status: lts_storage::GoalStatus::Active,
                target_date: Some("2026-12-01".into()),
            },
        )
        .unwrap();
    store
        .record_installation(&PackInstallation {
            pack_id: "org.openlanguage.test".into(),
            version: "0.1.0".into(),
            installed_at: "2026-01-02T00:00:00Z".into(),
            trust_state: "local".into(),
        })
        .unwrap();
    store
        .select_pack(pid, "org.openlanguage.test", "0.1.0")
        .unwrap();
    store
        .record_content_version(&ContentVersion {
            pack_id: "org.openlanguage.test".into(),
            content_id: "es.lex.greet.hola".into(),
            content_version: "3".into(),
        })
        .unwrap();
    store
        .append_evidence(&sample_event(&profile_id, "ev-1"))
        .unwrap();
    store
        .append_evidence(&sample_event(&profile_id, "ev-2"))
        .unwrap();
    store
        .append_correction(&EvidenceCorrection {
            event_id: EventId::new("corr-1"),
            occurred_at: "2026-10-03T00:00:00Z".into(),
            profile_id: profile_id.clone(),
            references: vec![EventId::new("ev-2")],
            reason: "content-error".into(),
        })
        .unwrap();
    store
        .record_mastery_snapshot(
            pid,
            &MasterySnapshot {
                content_id: "es.lex.greet.hola".into(),
                dimension: "recall-meaning".into(),
                state: "supported".into(),
                confidence: Some(0.65),
                algorithm_version: "mastery-derive-0.1.0".into(),
                policy_version: "0.1.0".into(),
                computed_at: "2026-10-03T00:00:00Z".into(),
            },
        )
        .unwrap();
    store
        .save_scheduler_state(
            pid,
            &SchedulerRecord {
                item_id: "es.lex.greet.hola:recall-meaning".into(),
                scheduler: "fsrs-spike-0.1.0".into(),
                params_json: "{\"stability_days\":3.0}".into(),
                due_at: "2026-10-05T00:00:00Z".into(),
            },
        )
        .unwrap();
    // Saved words (word mining) are learner-owned content, with the
    // schedule row anchored to one of them (review finding R05).
    store
        .add_mined(
            pid,
            NewMinedItem {
                id: "mine-cat",
                surface: "猫",
                reading: Some("ねこ"),
                gloss: Some("cat"),
                source_citation: "es.story.demo.cat",
                created_at: "2026-10-02T00:00:00Z",
            },
        )
        .unwrap();
    store
        .add_mined(
            pid,
            NewMinedItem {
                id: "mine-dog",
                surface: "犬",
                reading: None,
                gloss: Some("dog"),
                source_citation: "",
                created_at: "2026-10-02T00:00:00Z",
            },
        )
        .unwrap();
    store
        .save_scheduler_state(
            pid,
            &SchedulerRecord {
                item_id: "mine-cat".into(),
                scheduler: "fsrs-spike-0.1.0+mined".into(),
                params_json: "{\"stability_days\":2.0}".into(),
                due_at: "2026-10-06T00:00:00Z".into(),
            },
        )
        .unwrap();
    store
        .retain_recording(
            pid,
            &NewRecording {
                relative_path: "recordings/ev-2.m4a".into(),
                recorded_at: "2026-10-02T12:00:00Z".into(),
                duration_ms: Some(1500),
                purpose: Some("speaking-attempt".into()),
                consent_granted_at: "2026-01-01T00:00:00Z".into(),
            },
        )
        .unwrap();
    pid.clone()
}

#[test]
fn round_trip_preserves_evidence_mastery_inputs_and_settings() {
    let src = Store::in_memory().unwrap();
    let pid = seed(&src);
    let bundle = src
        .export_profile(&pid, "2026-10-04T00:00:00Z", &ExportOptions::default())
        .unwrap();

    // JSON round-trip too: the bundle is a portable document.
    let text = serde_json::to_string(&bundle).unwrap();
    let bundle2: lts_storage::ExportBundle = serde_json::from_str(&text).unwrap();
    assert_eq!(bundle, bundle2);
    let dst = Store::in_memory().unwrap();
    let new_id = dst
        .import_profile(&bundle, &ImportMode::NewProfile)
        .unwrap();
    assert_ne!(new_id, pid);

    // Evidence survives; profile id is remapped to the imported profile.
    let expected: Vec<EvidenceEvent> = bundle
        .evidence
        .iter()
        .map(|e| {
            let mut e = e.clone();
            e.profile_id = ProfileId::new(new_id.clone());
            e
        })
        .collect();
    assert_eq!(dst.evidence_for_profile(&new_id).unwrap(), expected);
    assert_eq!(dst.settings(&new_id).unwrap(), bundle.settings);
    assert_eq!(dst.goals(&new_id).unwrap(), bundle.goals);
    assert_eq!(
        dst.latest_mastery(&new_id).unwrap(),
        bundle.mastery_snapshots
    );
    assert_eq!(
        dst.scheduler_state(&new_id).unwrap(),
        bundle.scheduler_state
    );
    // R05: the learner's own words come back — surface, reading, gloss and
    // citation — together with the schedule row that holds their due state.
    assert_eq!(dst.mined_items(&new_id).unwrap(), bundle.mined_items);
    assert_eq!(
        dst.mined_items(&new_id)
            .unwrap()
            .iter()
            .find(|m| m.id == "mine-cat")
            .unwrap()
            .source_citation,
        "es.story.demo.cat"
    );
    let restored_schedule = dst.scheduler_state(&new_id).unwrap();
    let mined_row = restored_schedule
        .iter()
        .find(|s| s.item_id == "mine-cat")
        .expect("the saved word's schedule survives the round trip");
    assert_eq!(mined_row.due_at, "2026-10-06T00:00:00Z");
    assert_eq!(mined_row.scheduler, "fsrs-spike-0.1.0+mined");
    assert_eq!(dst.selected_packs(&new_id).unwrap(), bundle.selected_packs);
    assert_eq!(
        dst.content_version("org.openlanguage.test", "es.lex.greet.hola")
            .unwrap()
            .as_deref(),
        Some("3")
    );
    assert_eq!(
        dst.corrected_event_ids(&new_id).unwrap(),
        vec!["ev-2".to_string()]
    );
    // Profile identity fields survive.
    let p = dst.get_profile(&new_id).unwrap().unwrap();
    assert_eq!(p.display_name, "Test Learner");
    assert_eq!(p.created_at, "2026-01-01T00:00:00Z");
}

#[test]
fn import_never_silently_overwrites_an_existing_profile() {
    let store = Store::in_memory().unwrap();
    let pid = seed(&store);
    let bundle = store
        .export_profile(&pid, "2026-10-04T00:00:00Z", &ExportOptions::default())
        .unwrap();

    // Same store, same id: PreserveId must refuse, not overwrite.
    let err = store
        .import_profile(&bundle, &ImportMode::PreserveId)
        .unwrap_err();
    assert!(
        matches!(&err, ImportError::ProfileExists(id) if id == &pid),
        "unexpected: {err}"
    );
    // Refusal left the original data untouched.
    assert_eq!(store.evidence_count(&pid).unwrap(), 2);

    // NewProfile never collides.
    let fresh = Store::in_memory().unwrap();
    let new_id = fresh
        .import_profile(&bundle, &ImportMode::NewProfile)
        .unwrap();
    assert_eq!(fresh.evidence_count(&new_id).unwrap(), 2);

    // Overwrite is explicit and replaces cleanly (no duplicate evidence).
    let again = store
        .import_profile(&bundle, &ImportMode::Overwrite)
        .unwrap();
    assert_eq!(again, pid);
    assert_eq!(store.evidence_count(&pid).unwrap(), 2);

    // Overwrite on a missing profile is an error, not a silent create.
    let empty = Store::in_memory().unwrap();
    let err = empty
        .import_profile(&bundle, &ImportMode::Overwrite)
        .unwrap_err();
    assert!(
        matches!(&err, ImportError::ProfileNotFound(id) if id == &pid),
        "unexpected: {err}"
    );
}

#[test]
fn recordings_are_opt_in_to_export() {
    let src = Store::in_memory().unwrap();
    let pid = seed(&src);

    // Default: no recording metadata leaves the device.
    let bundle = src
        .export_profile(&pid, "2026-10-04T00:00:00Z", &ExportOptions::default())
        .unwrap();
    assert_eq!(bundle.recordings, None);
    let text = serde_json::to_string(&bundle).unwrap();
    assert!(!text.contains("recordings/ev-2.m4a"));

    // Opt-in: metadata (never audio bytes) is included and re-imported.
    let opts = ExportOptions {
        include_recordings: true,
    };
    let bundle = src
        .export_profile(&pid, "2026-10-04T00:00:00Z", &opts)
        .unwrap();
    assert_eq!(bundle.recordings.as_ref().map(|v| v.len()), Some(1));

    let dst = Store::in_memory().unwrap();
    let new_id = dst
        .import_profile(&bundle, &ImportMode::NewProfile)
        .unwrap();
    let recs = dst.recordings(&new_id).unwrap();
    assert_eq!(recs.len(), 1);
    assert_eq!(recs[0].relative_path, "recordings/ev-2.m4a");
    // No BLOBs: the bundle is pure JSON text.
    assert!(
        serde_json::from_str::<serde_json::Value>(&serde_json::to_string(&bundle).unwrap()).is_ok()
    );
}

#[test]
fn unknown_bundle_versions_are_rejected() {
    let src = Store::in_memory().unwrap();
    let pid = seed(&src);
    let mut bundle = src
        .export_profile(&pid, "2026-10-04T00:00:00Z", &ExportOptions::default())
        .unwrap();
    bundle.format_version = 999;
    let dst = Store::in_memory().unwrap();
    assert!(matches!(
        dst.import_profile(&bundle, &ImportMode::NewProfile)
            .unwrap_err(),
        ImportError::UnsupportedFormatVersion(999)
    ));
}

/// R05 acceptance: an old-format bundle stays importable. Version 1 has no
/// `mined_items` field at all; it must still restore the learner's record
/// rather than being rejected, and it honestly carries no saved words.
#[test]
fn version_1_bundles_remain_importable_without_saved_words() {
    let src = Store::in_memory().unwrap();
    let pid = seed(&src);
    let bundle = src
        .export_profile(&pid, "2026-10-04T00:00:00Z", &ExportOptions::default())
        .unwrap();
    assert_eq!(bundle.format_version, 2, "exports write the current format");
    let mut doc = serde_json::to_value(&bundle).unwrap();
    doc["format_version"] = json!(1);
    doc.as_object_mut().unwrap().remove("mined_items");

    let dst = Store::in_memory().unwrap();
    let legacy: lts_storage::ExportBundle = serde_json::from_str(&doc.to_string()).unwrap();
    assert!(legacy.mined_items.is_empty());
    let new_id = dst
        .import_profile(&legacy, &ImportMode::NewProfile)
        .expect("a version 1 bundle stays importable");
    assert_eq!(dst.evidence_count(&new_id).unwrap(), 2);
    assert_eq!(
        dst.get_profile(&new_id).unwrap().unwrap().display_name,
        "Test Learner"
    );
    assert!(
        dst.mined_items(&new_id).unwrap().is_empty(),
        "a version 1 bundle carries no saved words to restore"
    );
}

/// R06 acceptance: restoring a backup into the same store must not quietly
/// lose observations. Global ids (events, corrections, saved words,
/// recordings) collide with the rows the original profile still owns, so the
/// copy gets its own ids and keeps every row it carried.
#[test]
fn restoring_into_the_same_store_keeps_every_observation() {
    let store = Store::in_memory().unwrap();
    let pid = seed(&store);
    let bundle = store
        .export_profile(
            &pid,
            "2026-10-04T00:00:00Z",
            &ExportOptions {
                include_recordings: true,
            },
        )
        .unwrap();

    let copy = store
        .import_profile(&bundle, &ImportMode::NewProfile)
        .unwrap();
    assert_ne!(copy, pid);
    assert_eq!(
        store.evidence_count(&copy).unwrap(),
        2,
        "the copy keeps both attempts, not zero"
    );
    assert_eq!(
        store.evidence_count(&pid).unwrap(),
        2,
        "the original is untouched"
    );
    assert_eq!(store.mined_items(&copy).unwrap().len(), 2);
    assert_eq!(
        store
            .mined_items(&copy)
            .unwrap()
            .iter()
            .filter(|m| m.surface == "猫")
            .count(),
        1
    );
    // Saved words had to be re-issued (the original owns those ids), and the
    // schedule row follows the word it belongs to.
    let copy_ids: Vec<String> = store
        .mined_items(&copy)
        .unwrap()
        .iter()
        .map(|m| m.id.clone())
        .collect();
    assert!(!copy_ids.contains(&"mine-cat".to_string()));
    let schedule = store.scheduler_state(&copy).unwrap();
    assert_eq!(schedule.len(), 2, "both schedule rows moved to the copy");
    assert!(
        schedule
            .iter()
            .any(|s| copy_ids.contains(&s.item_id) && s.scheduler == "fsrs-spike-0.1.0+mined"),
        "the saved word's schedule is anchored to the restored word"
    );
    // The correction still names an event that belongs to the copy.
    let corrected = store.corrected_event_ids(&copy).unwrap();
    assert_eq!(corrected.len(), 1);
    assert!(
        store
            .evidence_for_profile(&copy)
            .unwrap()
            .iter()
            .any(|e| e.event_id.as_str() == corrected[0]),
        "a correction cannot be left pointing at another profile's event"
    );
}

/// R06 acceptance: every import failure leaves existing data unchanged. The
/// probe writes a deliberately contradictory bundle (two saved words with the
/// same surface, which the store forbids per profile). Because `Overwrite`
/// deletes the profile first, an unwound attempt would have destroyed the
/// learner's words and still reported an error.
#[test]
fn a_failed_import_leaves_existing_data_exactly_as_it_was() {
    let store = Store::in_memory().unwrap();
    let pid = seed(&store);
    let mut bundle = store
        .export_profile(&pid, "2026-10-04T00:00:00Z", &ExportOptions::default())
        .unwrap();
    let mut saved = bundle.mined_items.clone();
    let mut clone = saved[0].clone();
    clone.id = "mine-dupe".into();
    saved.push(clone);
    bundle.mined_items = saved;

    let before_words = store.mined_items(&pid).unwrap();
    let before_events = store.evidence_count(&pid).unwrap();
    let err = store
        .import_profile(&bundle, &ImportMode::Overwrite)
        .expect_err("a bundle that violates the store's own rules must fail");
    assert!(
        format!("{err}").contains("already present") || format!("{err}").contains("UNIQUE"),
        "unexpected error: {err}"
    );
    assert_eq!(
        store
            .get_profile(&pid)
            .expect("readable")
            .expect("the failed overwrite kept the profile")
            .display_name,
        "Test Learner"
    );
    assert_eq!(
        store.mined_items(&pid).unwrap(),
        before_words,
        "saved words survived the failed restore"
    );
    assert_eq!(store.evidence_count(&pid).unwrap(), before_events);
    assert_eq!(store.goals(&pid).unwrap().len(), 1);
    assert_eq!(store.scheduler_state(&pid).unwrap().len(), 2);
}
