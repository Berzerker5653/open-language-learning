//! VOCAB-BUILDER-001 acceptance: the per-profile word-lookup log —
//! append-only observation (every tap keeps its own row), the resolved
//! lemma is optional and honest, cascade with the person, and the
//! mined-item context fold: a word first kept by manual Mine later looked
//! up in a story gains its context sentence on the ORIGINAL row (the
//! repeat-mine anchor rule from mined.rs).

use lts_storage::{NewMinedItem, NewWordLookup, Store};

fn profile(store: &Store) -> String {
    store
        .create_profile("Ana", "2026-11-01T00:00:00Z")
        .unwrap()
        .id
}

fn lookup(store: &Store, p: &str, id: &str, surface: &str, lemma: Option<&str>, at: &str) {
    store
        .record_word_lookup(
            p,
            NewWordLookup {
                id,
                surface,
                lemma,
                story_id: "ru.story.market",
                sentence_id: "ru.sentence.p1",
                created_at: at,
            },
        )
        .unwrap();
}

#[test]
fn lookup_log_appends_every_tap_oldest_first() {
    let store = Store::in_memory().unwrap();
    let p = profile(&store);
    lookup(
        &store,
        &p,
        "lk-2",
        "хлеба",
        Some("хлеб"),
        "2026-11-20T10:05:00Z",
    );
    lookup(
        &store,
        &p,
        "lk-1",
        "хлеба",
        Some("хлеб"),
        "2026-11-20T10:00:00Z",
    );
    // Same word, second tap: the log never dedupes — the sentence and the
    // time per tap are the durable artifact (Kindle LOOKUPS semantics).
    let rows = store.word_lookups(&p).unwrap();
    assert_eq!(rows.len(), 2);
    assert_eq!(rows[0].id, "lk-1", "oldest first");
    assert_eq!(rows[0].surface, "хлеба");
    assert_eq!(rows[0].lemma.as_deref(), Some("хлеб"));
    assert_eq!(rows[0].story_id, "ru.story.market");
    assert_eq!(rows[0].sentence_id, "ru.sentence.p1");
}

#[test]
fn lemma_is_optional_and_stays_honest_without_sidecar_data() {
    let store = Store::in_memory().unwrap();
    let p = profile(&store);
    lookup(
        &store,
        &p,
        "lk-1",
        "сложноСлово",
        None,
        "2026-11-20T10:00:00Z",
    );
    let rows = store.word_lookups(&p).unwrap();
    assert_eq!(rows.len(), 1);
    assert_eq!(rows[0].lemma, None, "no sidecar row, no lemma claim");
}

#[test]
fn lookups_belong_to_the_person_and_cascade_on_profile_delete() {
    let store = Store::in_memory().unwrap();
    let a = profile(&store);
    let b = profile(&store);
    lookup(
        &store,
        &a,
        "lk-1",
        "кошка",
        Some("кошка"),
        "2026-11-20T10:00:00Z",
    );
    assert!(store.word_lookups(&b).unwrap().is_empty(), "per-profile");
    store.delete_profile(&a).unwrap();
    assert!(
        store.word_lookups(&a).unwrap().is_empty(),
        "the log travels with the person and is gone when they are"
    );
}

#[test]
fn migration_v8_adds_the_lookup_table_and_mined_context_column() {
    let store = Store::in_memory().unwrap();
    assert_eq!(store.schema_version().unwrap(), 8);
    // The mined_items context column exists and defaults NULL for rows
    // written without it (manual Mine keeps working unchanged).
    let p = profile(&store);
    store
        .add_mined(
            &p,
            NewMinedItem {
                id: "mine-1",
                surface: "окно",
                reading: None,
                gloss: Some("window"),
                source_citation: "manual",
                created_at: "2026-11-20T10:00:00Z",
                context_sentence_id: None,
            },
        )
        .unwrap();
    let items = store.mined_items(&p).unwrap();
    assert_eq!(items[0].context_sentence_id, None);
}

#[test]
fn lookup_mine_after_manual_mine_folds_context_into_the_original_row() {
    let store = Store::in_memory().unwrap();
    let p = profile(&store);
    let first = store
        .add_mined(
            &p,
            NewMinedItem {
                id: "mine-1",
                surface: "хлеб",
                reading: None,
                gloss: Some("bread"),
                source_citation: "manual",
                created_at: "2026-11-20T09:00:00Z",
                context_sentence_id: None,
            },
        )
        .unwrap();
    assert!(first.was_new);
    let again = store
        .add_mined(
            &p,
            NewMinedItem {
                id: "mine-2",
                surface: "хлеб",
                reading: None,
                gloss: Some("bread"),
                source_citation: "ru.story.market",
                created_at: "2026-11-20T10:00:00Z",
                context_sentence_id: Some("ru.sentence.p1"),
            },
        )
        .unwrap();
    assert!(!again.was_new, "one live row per (profile, surface)");
    assert_eq!(again.id, "mine-1", "the original anchor survives");
    let items = store.mined_items(&p).unwrap();
    assert_eq!(items.len(), 1);
    assert_eq!(
        items[0].context_sentence_id.as_deref(),
        Some("ru.sentence.p1"),
        "the story context folds into the row that already exists"
    );
}
