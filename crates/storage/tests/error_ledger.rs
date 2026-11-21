//! ERR-SRS-LOOP-001 acceptance: the per-profile error ledger and the
//! accepted per-form review cards — append-only observation, repeat
//! accepts anchored to the original card, cascade with the person, and
//! export-bundle coverage (v4) with old-bundle compatibility.

use lts_storage::{ImportMode, NewErrorLedger, NewErrorReviewCard, Store};

fn profile(store: &Store) -> String {
    store
        .create_profile("Ana", "2026-11-01T00:00:00Z")
        .unwrap()
        .id
}

fn record(store: &Store, p: &str, id: &str, context: &str) {
    store
        .record_error(
            p,
            NewErrorLedger {
                id,
                pack_id: "ru.demo",
                surface: "книги",
                produced: "книгу",
                lemma: "книга",
                error_class: "case",
                context_sentence_id: context,
                created_at: "2026-11-20T10:00:00Z",
            },
        )
        .unwrap();
}

#[test]
fn ledger_appends_repeats_and_counts_recurrence_by_context() {
    let store = Store::in_memory().unwrap();
    let p = profile(&store);
    record(&store, &p, "err-1", "ru.sentence.p1");
    record(&store, &p, "err-2", "ru.sentence.p1");
    record(&store, &p, "err-3", "ru.lex.book");
    let rows = store.error_ledger(&p).unwrap();
    assert_eq!(rows.len(), 3, "every observed error keeps its own row");
    let mut rec = store.error_recurrence_by_context(&p).unwrap();
    rec.sort();
    assert_eq!(
        rec,
        vec![
            ("ru.lex.book".to_string(), 1),
            ("ru.sentence.p1".to_string(), 2),
        ]
    );
}

#[test]
fn accept_is_idempotent_and_the_card_anchors_to_the_original() {
    let store = Store::in_memory().unwrap();
    let p = profile(&store);
    record(&store, &p, "err-1", "ru.sentence.p1");
    let first = store
        .add_error_review_card(
            &p,
            NewErrorReviewCard {
                id: "errcard-1",
                ledger_id: "err-1",
                pack_id: "ru.demo",
                surface: "книги",
                lemma: "книга",
                error_class: "case",
                context_sentence_id: "ru.sentence.p1",
                created_at: "2026-11-20T10:05:00Z",
            },
        )
        .unwrap();
    assert!(first.was_new);
    let again = store
        .add_error_review_card(
            &p,
            NewErrorReviewCard {
                id: "errcard-2",
                ledger_id: "err-1",
                pack_id: "ru.demo",
                surface: "книги",
                lemma: "книга",
                error_class: "case",
                context_sentence_id: "ru.sentence.p1",
                created_at: "2026-11-20T10:06:00Z",
            },
        )
        .unwrap();
    assert!(
        !again.was_new,
        "a repeat accept never fabricates a second card"
    );
    assert_eq!(
        again.id, first.id,
        "the original card (and its SRS row) survive"
    );
    assert_eq!(store.error_review_cards(&p).unwrap().len(), 1);
}

#[test]
fn ledger_and_cards_delete_with_the_person() {
    let store = Store::in_memory().unwrap();
    let p = profile(&store);
    record(&store, &p, "err-1", "ru.sentence.p1");
    store
        .add_error_review_card(
            &p,
            NewErrorReviewCard {
                id: "errcard-1",
                ledger_id: "err-1",
                pack_id: "ru.demo",
                surface: "книги",
                lemma: "книга",
                error_class: "case",
                context_sentence_id: "ru.sentence.p1",
                created_at: "2026-11-20T10:05:00Z",
            },
        )
        .unwrap();
    store.delete_profile(&p).unwrap();
    assert!(store.error_ledger(&p).unwrap().is_empty());
    assert!(store.error_review_cards(&p).unwrap().is_empty());
}

#[test]
fn export_v4_round_trips_the_ledger_and_cards() {
    let store = Store::in_memory().unwrap();
    let p = profile(&store);
    record(&store, &p, "err-1", "ru.sentence.p1");
    record(&store, &p, "err-2", "ru.sentence.p1");
    store
        .add_error_review_card(
            &p,
            NewErrorReviewCard {
                id: "errcard-1",
                ledger_id: "err-1",
                pack_id: "ru.demo",
                surface: "книги",
                lemma: "книга",
                error_class: "case",
                context_sentence_id: "ru.sentence.p1",
                created_at: "2026-11-20T10:05:00Z",
            },
        )
        .unwrap();
    let bundle = store
        .export_profile(
            &p,
            "2026-11-20T12:00:00Z",
            &lts_storage::ExportOptions::default(),
        )
        .unwrap();
    assert_eq!(bundle.error_ledger.len(), 2);
    assert_eq!(bundle.error_review_cards.len(), 1);

    // Text round trip, then restore into a fresh store (portability path).
    let text = serde_json::to_string(&bundle).unwrap();
    let reparsed: lts_storage::ExportBundle = serde_json::from_str(&text).unwrap();
    let target = Store::in_memory().unwrap();
    let imported = target
        .import_profile(&reparsed, &ImportMode::NewProfile)
        .unwrap();
    assert_eq!(target.error_ledger(&imported).unwrap().len(), 2);
    let cards = target.error_review_cards(&imported).unwrap();
    assert_eq!(cards.len(), 1);
    let ledger = target.error_ledger(&imported).unwrap();
    assert!(
        cards[0].ledger_id == ledger[0].id || cards[0].ledger_id == ledger[1].id,
        "the card points at a ledger row that actually exists in this store"
    );
}

#[test]
fn a_pre_v4_bundle_still_imports_and_carries_no_error_rows() {
    let store = Store::in_memory().unwrap();
    let p = profile(&store);
    let bundle = store
        .export_profile(
            &p,
            "2026-11-20T12:00:00Z",
            &lts_storage::ExportOptions::default(),
        )
        .unwrap();
    let mut doc: serde_json::Value = serde_json::to_value(&bundle).unwrap();
    doc["format_version"] = serde_json::json!(3);
    doc.as_object_mut().unwrap().remove("error_ledger");
    doc.as_object_mut().unwrap().remove("error_review_cards");
    let old: lts_storage::ExportBundle = serde_json::from_value(doc).unwrap();
    let target = Store::in_memory().unwrap();
    let imported = target
        .import_profile(&old, &ImportMode::NewProfile)
        .unwrap();
    assert!(target.error_ledger(&imported).unwrap().is_empty());
}

#[test]
fn same_store_restore_reissues_ids_and_keeps_card_linkage() {
    // The Overwrite path: ids collide with the still-present rows, so
    // the import must re-issue them and the card must follow the ledger
    // row it actually got (fresh-id discipline from R05).
    let store = Store::in_memory().unwrap();
    let p = profile(&store);
    record(&store, &p, "err-1", "ru.sentence.p1");
    store
        .add_error_review_card(
            &p,
            NewErrorReviewCard {
                id: "errcard-1",
                ledger_id: "err-1",
                pack_id: "ru.demo",
                surface: "книги",
                lemma: "книга",
                error_class: "case",
                context_sentence_id: "ru.sentence.p1",
                created_at: "2026-11-20T10:05:00Z",
            },
        )
        .unwrap();
    let bundle = store
        .export_profile(
            &p,
            "2026-11-20T12:00:00Z",
            &lts_storage::ExportOptions::default(),
        )
        .unwrap();
    store
        .import_profile(&bundle, &ImportMode::Overwrite)
        .unwrap();
    let rows = store.error_ledger(&p).unwrap();
    assert_eq!(
        rows.len(),
        1,
        "Overwrite replaces the profile, it does not double it"
    );
    let cards = store.error_review_cards(&p).unwrap();
    assert_eq!(cards.len(), 1);
    assert_eq!(
        cards[0].ledger_id, rows[0].id,
        "the card follows the re-issued ledger id"
    );
}
