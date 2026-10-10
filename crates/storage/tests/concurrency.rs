//! PS-05a acceptance: concurrent writers against one profile file.
//!
//! The desktop shell, the CLI tools, and a background warm-up thread can each
//! hold a `Store` open on the same profile path. WAL lets readers run beside a
//! writer, but two writers collide; the storage contract (the `busy_timeout`
//! in `from_conn`) says a colliding write waits and lands rather than
//! surfacing as a failed save of data that was never actually rejected. These
//! tests pin that contract: a blocked write waits, every row lands, and all
//! of it is readable from a connection that opened afterwards.

use lts_domain::{
    ActivityModality, ContentId, EventId, EvidenceEvent, Outcome, ProfileId, Score, SupportLevel,
};
use lts_storage::{Error, Store};

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
        failure_reason: None,
    }
}

/// Names the storage error on failure, so a `SQLITE_BUSY` regression reports
/// the lock error instead of a bare panic.
fn unwrapped<T>(context: &str, result: Result<T, Error>) -> T {
    result.unwrap_or_else(|e| panic!("{context}: {e}"))
}

#[test]
fn two_stores_on_one_file_never_lose_a_write() {
    let dir = tempfile::tempdir().unwrap();
    let db = dir.path().join("learner.db");

    let a = Store::open(&db).unwrap();
    let profile = a.create_profile("Ana", "2026-10-02T09:00:00Z").unwrap();
    let pid = ProfileId::new(profile.id.clone());
    let b = Store::open(&db).unwrap();

    // Interleaved autocommit writes from both stores: settings and evidence.
    for i in 0..5 {
        unwrapped(
            "store A setting write",
            a.set_setting(&profile.id, &format!("a.key-{i}"), &serde_json::json!(i)),
        );
        unwrapped(
            "store B setting write",
            b.set_setting(
                &profile.id,
                &format!("b.key-{i}"),
                &serde_json::json!(i * 10),
            ),
        );
    }
    unwrapped(
        "store A evidence append",
        a.append_evidence(&sample_event(&pid, "evt-a-1")),
    );
    unwrapped(
        "store B evidence append",
        b.append_evidence(&sample_event(&pid, "evt-b-1")),
    );

    // The hard case: store A holds the write lock in an open transaction while
    // store B writes from another thread. `BEGIN IMMEDIATE` takes the write
    // lock up front, so B's write starts while the lock is definitely held; a
    // connection that lost its busy handler would get `SQLITE_BUSY` on that
    // first step and this unwrap fails.
    a.conn()
        .execute("BEGIN IMMEDIATE", [])
        .unwrap_or_else(|e| panic!("begin held transaction: {e}"));
    unwrapped(
        "write inside held transaction",
        a.set_setting(
            &profile.id,
            "a.held",
            &serde_json::json!("written inside the open transaction"),
        ),
    );
    let waiting = {
        let profile_id = profile.id.clone();
        std::thread::spawn(move || {
            let result = b.set_setting(
                &profile_id,
                "b.waited",
                &serde_json::json!("landed once the lock cleared"),
            );
            (b, result)
        })
    };
    // Give the other thread time to reach the lock before releasing it.
    std::thread::sleep(std::time::Duration::from_millis(250));
    a.conn()
        .execute("COMMIT", [])
        .unwrap_or_else(|e| panic!("commit held transaction: {e}"));
    let (b, result) = waiting.join().expect("waiting writer thread panicked");
    unwrapped("write that had to wait for the write lock", result);

    // Four more stores opening the same file and writing side by side.
    let writers: Vec<_> = (0..4)
        .map(|w| {
            let db = db.clone();
            let profile_id = profile.id.clone();
            std::thread::spawn(move || {
                let store = Store::open(&db)?;
                let pid = ProfileId::new(profile_id.clone());
                for i in 0..2 {
                    store.set_setting(
                        &profile_id,
                        &format!("w{w}.key-{i}"),
                        &serde_json::json!(i),
                    )?;
                    store.append_evidence(&sample_event(&pid, &format!("evt-w{w}-{i}")))?;
                }
                Ok::<(), Error>(())
            })
        })
        .collect();
    for handle in writers {
        unwrapped(
            "concurrent writer",
            handle.join().expect("concurrent writer thread panicked"),
        );
    }

    // Everything both stores and the concurrent writers landed is readable
    // from a fresh, third connection.
    let third = Store::open(&db).unwrap();
    let evidence = unwrapped("evidence count", third.evidence_count(&profile.id));
    assert_eq!(evidence, 10, "every append from every store must land");
    assert_eq!(
        unwrapped(
            "settings list",
            third.settings(&profile.id).map(|rows| rows.len())
        ),
        20,
        "5 interleaved keys per store + 1 held + 1 waiting + 2 per writer"
    );
    assert_eq!(
        unwrapped(
            "waiting write readable",
            third.get_setting(&profile.id, "b.waited")
        ),
        Some(serde_json::json!("landed once the lock cleared"))
    );
    assert_eq!(
        unwrapped(
            "held-transaction write readable",
            third.get_setting(&profile.id, "a.held")
        ),
        Some(serde_json::json!("written inside the open transaction"))
    );
    assert_eq!(
        unwrapped(
            "writer 3 setting readable",
            third.get_setting(&profile.id, "w3.key-1")
        ),
        Some(serde_json::json!(1))
    );

    // The store that had to wait is still usable afterwards.
    unwrapped(
        "waiting store keeps working",
        b.set_setting(&profile.id, "b.after", &serde_json::json!("still open")),
    );
    assert_eq!(
        unwrapped(
            "post-wait write readable",
            third.get_setting(&profile.id, "b.after")
        ),
        Some(serde_json::json!("still open"))
    );
}
