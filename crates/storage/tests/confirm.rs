//! CONTENT-CONFIRM-001 acceptance: attributed, per-profile confirmation
//! marks — idempotent confirm, joined attribution, per-profile retract,
//! cascade with the person, and nothing written to pack posture.

use lts_storage::{SCHEMA_VERSION, Store};

fn seeded_pair() -> (Store, String, String) {
    let store = Store::in_memory().unwrap();
    let a = store
        .create_profile("Ana", "2026-11-01T00:00:00Z")
        .unwrap()
        .id;
    let b = store
        .create_profile("Bruno", "2026-11-01T00:00:00Z")
        .unwrap()
        .id;
    (store, a, b)
}

#[test]
fn migration_six_lands_the_confirmations_table() {
    let store = Store::in_memory().unwrap();
    assert_eq!(store.schema_version().unwrap(), SCHEMA_VERSION);
    let count: i64 = store
        .conn()
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='content_confirmations'",
            [],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(count, 1);
}

#[test]
fn confirm_is_idempotent_and_keeps_the_original_row() {
    let (store, ana, _) = seeded_pair();
    let first = store
        .confirm_content(
            &ana,
            "org.openlanguage.ja-jp.reference",
            "ja.sent.greet",
            "cc-1",
            "2026-11-16T10:00:00Z",
        )
        .unwrap();
    let repeat = store
        .confirm_content(
            &ana,
            "org.openlanguage.ja-jp.reference",
            "ja.sent.greet",
            "cc-2",
            "2026-11-16T10:05:00Z",
        )
        .unwrap();
    assert_eq!(first, repeat, "a repeat click returns the original mark");
    assert_eq!(
        store
            .content_confirmations("org.openlanguage.ja-jp.reference", "ja.sent.greet")
            .unwrap()
            .len(),
        1,
        "a double click can never fabricate a second mark"
    );
}

#[test]
fn confirmations_are_attributed_by_profile_display_name() {
    let (store, ana, bruno) = seeded_pair();
    store
        .confirm_content(&bruno, "p", "ja.sent.greet", "cc-b", "2026-11-16T09:00:00Z")
        .unwrap();
    store
        .confirm_content(&ana, "p", "ja.sent.greet", "cc-a", "2026-11-16T10:00:00Z")
        .unwrap();
    let marks = store.content_confirmations("p", "ja.sent.greet").unwrap();
    assert_eq!(marks.len(), 2);
    // Oldest mark first, names joined from the profiles table.
    assert_eq!(marks[0].display_name, "Bruno");
    assert_eq!(marks[0].profile_id, bruno);
    assert_eq!(marks[1].display_name, "Ana");
}

#[test]
fn unconfirm_only_removes_the_callers_own_mark() {
    let (store, ana, bruno) = seeded_pair();
    store
        .confirm_content(&ana, "p", "ja.sent.greet", "cc-a", "2026-11-16T10:00:00Z")
        .unwrap();
    store
        .confirm_content(&bruno, "p", "ja.sent.greet", "cc-b", "2026-11-16T09:00:00Z")
        .unwrap();
    assert!(
        store
            .remove_content_confirmation(&ana, "p", "ja.sent.greet")
            .unwrap()
    );
    let marks = store.content_confirmations("p", "ja.sent.greet").unwrap();
    assert_eq!(marks.len(), 1);
    assert_eq!(marks[0].profile_id, bruno, "Bruno's mark survives");
    assert!(
        !store
            .remove_content_confirmation(&ana, "p", "ja.sent.greet")
            .unwrap(),
        "retracting a mark you do not hold reports false, and touches nothing"
    );
}

#[test]
fn confirmations_cascade_with_the_profile_that_gave_them() {
    let (store, ana, bruno) = seeded_pair();
    store
        .confirm_content(&ana, "p", "ja.sent.greet", "cc-a", "2026-11-16T10:00:00Z")
        .unwrap();
    store
        .confirm_content(&bruno, "p", "ja.sent.greet", "cc-b", "2026-11-16T09:00:00Z")
        .unwrap();
    store.delete_profile(&ana).unwrap();
    let marks = store.content_confirmations("p", "ja.sent.greet").unwrap();
    assert_eq!(marks.len(), 1);
    assert_eq!(marks[0].profile_id, bruno);
}

#[test]
fn a_confirmation_never_touches_pack_posture() {
    // ADR-0040 acceptance 2: the mark lives only in its own table. The
    // installed pack's trust_state is byte-identical after confirming.
    let (store, ana, _) = seeded_pair();
    store
        .record_installation(&lts_storage::PackInstallation {
            pack_id: "p".into(),
            version: "0.4.3".into(),
            installed_at: "2026-11-01T00:00:00Z".into(),
            trust_state: "experimental".into(),
        })
        .unwrap();
    store
        .confirm_content(&ana, "p", "ja.sent.greet", "cc-a", "2026-11-16T10:00:00Z")
        .unwrap();
    let state: String = store
        .conn()
        .query_row(
            "SELECT trust_state FROM pack_installations WHERE pack_id = 'p'",
            [],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(
        state, "experimental",
        "pack posture is untouched by confirmation"
    );
}
