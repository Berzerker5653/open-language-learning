//! DATA-001 acceptance: offline profile creation, forward migrations from
//! the initial schema, and privacy invariants (no raw audio by default).

use lts_domain::{
    ContentId, EventId, EvidenceCorrection, EvidenceEvent, Outcome, ProfileId, Score, SupportLevel,
};
use lts_storage::{NewRecording, PackInstallation, SCHEMA_VERSION};
use rusqlite::Connection;

fn sample_event(profile: &ProfileId, id: &str) -> EvidenceEvent {
    EvidenceEvent {
        event_id: EventId::new(id),
        occurred_at: "2026-10-02T12:00:00Z".into(),
        profile_id: profile.clone(),
        targets: vec![ContentId::parse("es.lex.greet.hola").unwrap()],
        modality: lts_domain::ActivityModality::RecallMeaning,
        activity_id: ContentId::parse("es.activity.drills.match").unwrap(),
        prompt_family_id: Some(ContentId::parse("es.expr.greet.hola").unwrap()),
        attempt_group_id: Some("group-1".into()),
        support_level: SupportLevel::new(1).unwrap(),
        support_actions: vec!["first-letter-hint".into()],
        outcome: Outcome::Scored,
        score: Some(Score::Correct),
        assessment_kind: None,
        held_out: true,
        provider_confidence: None,
        pack_id: "org.openlanguage.test".into(),
        pack_version: "0.1.0".into(),
        rubric_version: Some("r1".into()),
        policy_version: Some("p1".into()),
        provider_id: None,
    }
}

#[test]
fn profile_created_without_account_or_network() {
    let dir = tempfile::tempdir().unwrap();
    let db = dir.path().join("learner.db");
    {
        let store = lts_storage::Store::open(&db).unwrap();
        let p = store.create_profile("Ana", "2026-10-02T09:00:00Z").unwrap();
        assert!(p.id.starts_with("prof-"));
        assert_eq!(store.list_profiles().unwrap().len(), 1);
        assert_eq!(
            store.get_profile(&p.id).unwrap().unwrap().display_name,
            "Ana"
        );
    }
    // Durable file exists on disk.
    assert!(db.exists());
}

#[test]
fn migrations_apply_forward_from_initial_schema() {
    let dir = tempfile::tempdir().unwrap();
    let db = dir.path().join("learner.db");

    // Simulate an app that only ever saw schema v1: create it by hand and
    // stamp user_version = 1.
    {
        let conn = Connection::open(&db).unwrap();
        conn.execute_batch(
            "CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
             CREATE TABLE profiles (id TEXT PRIMARY KEY, display_name TEXT NOT NULL, created_at TEXT NOT NULL);
             CREATE TABLE settings (profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, key TEXT NOT NULL, value_json TEXT NOT NULL, PRIMARY KEY (profile_id, key));
             CREATE TABLE pack_installations (pack_id TEXT NOT NULL, version TEXT NOT NULL, installed_at TEXT NOT NULL, trust_state TEXT NOT NULL, PRIMARY KEY (pack_id, version));
             CREATE TABLE profile_pack_selections (profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, pack_id TEXT NOT NULL, version TEXT NOT NULL, PRIMARY KEY (profile_id, pack_id));
             CREATE TABLE content_versions (pack_id TEXT NOT NULL, content_id TEXT NOT NULL, content_version TEXT NOT NULL, PRIMARY KEY (pack_id, content_id));
             CREATE TABLE learner_goals (profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, goal_id TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active', target_date TEXT, PRIMARY KEY (profile_id, goal_id));
             INSERT INTO schema_migrations(version, applied_at) VALUES (1, '2026-09-01T00:00:00Z');
             INSERT INTO profiles(id, display_name, created_at) VALUES ('prof-old', 'Legacy', '2026-09-01T00:00:00Z');
             PRAGMA user_version = 1;",
        )
        .unwrap();
    }

    let store = lts_storage::Store::open(&db).unwrap();
    assert_eq!(store.schema_version().unwrap(), SCHEMA_VERSION);
    // Existing profile survived the migration.
    assert_eq!(
        store.get_profile("prof-old").unwrap().unwrap().display_name,
        "Legacy"
    );
    // v2 tables are usable.
    let p = ProfileId::new("prof-old");
    assert!(store.append_evidence(&sample_event(&p, "e1")).unwrap());
    assert_eq!(store.evidence_count("prof-old").unwrap(), 1);
    // Migration history recorded.
    let conn = Connection::open(&db).unwrap();
    let versions: Vec<i64> = conn
        .prepare("SELECT version FROM schema_migrations ORDER BY version")
        .unwrap()
        .query_map([], |r| r.get(0))
        .unwrap()
        .collect::<Result<_, _>>()
        .unwrap();
    assert_eq!(versions, vec![1, 2]);
}

#[test]
fn evidence_survives_restart_and_rejects_duplicate_ids() {
    let dir = tempfile::tempdir().unwrap();
    let db = dir.path().join("learner.db");
    let profile = {
        let store = lts_storage::Store::open(&db).unwrap();
        let p = store.create_profile("Ana", "2026-10-02T09:00:00Z").unwrap();
        let pid = ProfileId::new(p.id.clone());
        assert!(store.append_evidence(&sample_event(&pid, "e1")).unwrap());
        // Retry with the same event id must not double-count.
        assert!(!store.append_evidence(&sample_event(&pid, "e1")).unwrap());
        assert_eq!(store.evidence_count(&p.id).unwrap(), 1);
        pid
    };
    // "Restart": a second Store over the same file.
    let store = lts_storage::Store::open(&db).unwrap();
    let events = store.evidence_for_profile(profile.as_str()).unwrap();
    assert_eq!(events.len(), 1);
    assert_eq!(events[0], sample_event(&profile, "e1"));

    // Corrections reference prior events without deleting them.
    let c = EvidenceCorrection {
        event_id: EventId::new("c1"),
        occurred_at: "2026-10-02T13:00:00Z".into(),
        profile_id: profile.clone(),
        references: vec![EventId::new("e1")],
        reason: "content retracted".into(),
    };
    assert!(store.append_correction(&c).unwrap());
    assert_eq!(
        store.corrected_event_ids(profile.as_str()).unwrap(),
        vec!["e1"]
    );
    assert_eq!(store.evidence_count(profile.as_str()).unwrap(), 1);
}

#[test]
fn no_audio_blobs_and_no_recordings_by_default() {
    let store = lts_storage::Store::in_memory().unwrap();
    // Privacy invariant: the schema has no BLOB columns anywhere.
    let mut stmt = store
        .conn()
        .prepare("SELECT m.name, p.type FROM sqlite_master m JOIN pragma_table_info(m.name) p WHERE m.type='table' AND m.name NOT LIKE 'sqlite_%'")
        .unwrap();
    let blob_cols: Vec<(String, String)> = stmt
        .query_map([], |r| Ok((r.get(0)?, r.get(1)?)))
        .unwrap()
        .filter_map(|row| {
            let (table, coltype): (String, String) = row.unwrap();
            if coltype.eq_ignore_ascii_case("blob") {
                Some((table, coltype))
            } else {
                None
            }
        })
        .collect();
    assert!(blob_cols.is_empty(), "BLOB columns found: {blob_cols:?}");

    // A normal profile with evidence has zero retained recordings.
    let p = store.create_profile("Ana", "2026-10-02T09:00:00Z").unwrap();
    let pid = ProfileId::new(p.id.clone());
    store.append_evidence(&sample_event(&pid, "e1")).unwrap();
    assert!(store.recordings(&p.id).unwrap().is_empty());

    // Retention is explicit opt-in and stores metadata + path only.
    let rec = store
        .retain_recording(
            &p.id,
            &NewRecording {
                relative_path: "recordings/2026-10-02-attempt-1.ogg".into(),
                recorded_at: "2026-10-02T12:00:00Z".into(),
                duration_ms: Some(1200),
                purpose: Some("keep-my-attempts".into()),
                consent_granted_at: "2026-10-01T08:00:00Z".into(),
            },
        )
        .unwrap();
    assert_eq!(store.recordings(&p.id).unwrap().len(), 1);
    assert!(store.forget_recording(&rec.id).unwrap());
    assert!(store.recordings(&p.id).unwrap().is_empty());
}

#[test]
fn delete_profile_removes_app_owned_learner_data() {
    let store = lts_storage::Store::in_memory().unwrap();
    let p = store.create_profile("Ana", "2026-10-02T09:00:00Z").unwrap();
    store
        .set_goal(
            &p.id,
            &lts_storage::LearnerGoal {
                goal_id: "es.goal.intro.greet".into(),
                status: lts_storage::GoalStatus::Active,
                target_date: None,
            },
        )
        .unwrap();
    let pid = ProfileId::new(p.id.clone());
    store
        .set_setting(&p.id, "ui.theme", &serde_json::json!("dark"))
        .unwrap();
    store.append_evidence(&sample_event(&pid, "e1")).unwrap();
    store
        .retain_recording(
            &p.id,
            &NewRecording {
                relative_path: "recordings/a.ogg".into(),
                recorded_at: "2026-10-02T12:00:00Z".into(),
                duration_ms: None,
                purpose: None,
                consent_granted_at: "2026-10-01T08:00:00Z".into(),
            },
        )
        .unwrap();

    store.delete_profile(&p.id).unwrap();
    assert!(store.get_profile(&p.id).unwrap().is_none());
    assert_eq!(store.evidence_count(&p.id).unwrap(), 0);
    assert!(store.recordings(&p.id).unwrap().is_empty());
    assert!(store.settings(&p.id).unwrap().is_empty());
    assert!(store.goals(&p.id).unwrap().is_empty());
}

#[test]
fn settings_goals_and_pack_records_round_trip() {
    let store = lts_storage::Store::in_memory().unwrap();
    let p = store.create_profile("Bo", "2026-10-02T09:00:00Z").unwrap();

    store
        .set_setting(&p.id, "speech.provider", &serde_json::json!("local-test"))
        .unwrap();
    store
        .set_setting(&p.id, "speech.provider", &serde_json::json!("local-v2"))
        .unwrap();
    assert_eq!(
        store
            .get_setting(&p.id, "speech.provider")
            .unwrap()
            .unwrap(),
        serde_json::json!("local-v2")
    );
    assert_eq!(store.settings(&p.id).unwrap().len(), 1);

    store
        .set_goal(
            &p.id,
            &lts_storage::LearnerGoal {
                goal_id: "es.goal.intro.greet".into(),
                status: lts_storage::GoalStatus::Active,
                target_date: Some("2026-12-01".into()),
            },
        )
        .unwrap();
    let goals = store.goals(&p.id).unwrap();
    assert_eq!(goals.len(), 1);
    assert_eq!(goals[0].status, lts_storage::GoalStatus::Active);

    store
        .record_installation(&PackInstallation {
            pack_id: "org.openlanguage.test".into(),
            version: "0.1.0".into(),
            installed_at: "2026-10-02T08:00:00Z".into(),
            trust_state: "community".into(),
        })
        .unwrap();
    store
        .select_pack(&p.id, "org.openlanguage.test", "0.1.0")
        .unwrap();
    store
        .record_content_version(&lts_storage::ContentVersion {
            pack_id: "org.openlanguage.test".into(),
            content_id: "es.lex.greet.hola".into(),
            content_version: "3".into(),
        })
        .unwrap();
    assert_eq!(store.installations().unwrap().len(), 1);
    assert_eq!(
        store.selected_packs(&p.id).unwrap(),
        vec![("org.openlanguage.test".to_string(), "0.1.0".to_string())]
    );
    assert_eq!(
        store
            .content_version("org.openlanguage.test", "es.lex.greet.hola")
            .unwrap(),
        Some("3".into())
    );
}
