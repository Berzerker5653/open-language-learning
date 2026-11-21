//! VOCAB-BUILDER-001: the per-profile vocabulary-lookup log. Device-local
//! like everything else (docs/08).
//!
//! This is an *observation log* in the same shape as the CONTENT-CONFIRM-001
//! confirm ledger and the ERR-SRS-LOOP-001 error ledger: one row per reader
//! word-tap (surface, resolved lemma when the pack sidecar has one, the
//! story being read, the context sentence, and the time). The lookup IS the
//! learning signal (docs/READING-STORY-UX-001): the log never claims
//! mastery and never touches evidence_events. The review card behind a
//! looked-up word is an ordinary mined item (existing `+mined` partition);
//! this table is the durable context record, mirroring Kindle's vocab.db
//! LOOKUPS table — the sentence the word sat in is what stays.
//!
//! Export/import: the rows ride the profile export bundle (v5+); nothing
//! here leaves the device except through the learner's own export action.

use crate::Store;
use crate::error::Error;
use rusqlite::params;
use serde::{Deserialize, Serialize};

/// One observed reader lookup. `surface` is exactly the printed word the
/// learner tapped; `lemma` is the pack sidecar's dictionary form when it
/// resolved one (None is honest — no claim without sidecar data).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct WordLookup {
    pub id: String,
    pub surface: String,
    pub lemma: Option<String>,
    pub story_id: String,
    pub sentence_id: String,
    pub created_at: String,
}

/// Input for `record_word_lookup`; keeps the API under the argument-count lint.
#[derive(Debug, Clone)]
pub struct NewWordLookup<'a> {
    pub id: &'a str,
    pub surface: &'a str,
    pub lemma: Option<&'a str>,
    pub story_id: &'a str,
    pub sentence_id: &'a str,
    pub created_at: &'a str,
}

impl Store {
    /// Append one observed lookup. Like the error ledger, the log never
    /// dedupes: tapping the same word twice is two observations, and the
    /// per-sentence context each row carries is the point.
    pub fn record_word_lookup(&self, profile_id: &str, l: NewWordLookup<'_>) -> Result<(), Error> {
        self.conn.execute(
            "INSERT INTO word_lookups(id, profile_id, surface, lemma, story_id, sentence_id, created_at)
             VALUES (?1,?2,?3,?4,?5,?6,?7)",
            params![
                l.id,
                profile_id,
                l.surface,
                l.lemma,
                l.story_id,
                l.sentence_id,
                l.created_at
            ],
        )?;
        Ok(())
    }

    /// The whole lookup log for a profile, oldest first (export/view).
    pub fn word_lookups(&self, profile_id: &str) -> Result<Vec<WordLookup>, Error> {
        let mut stmt = self.conn.prepare(
            "SELECT id, surface, lemma, story_id, sentence_id, created_at
             FROM word_lookups WHERE profile_id = ?1 ORDER BY created_at, id",
        )?;
        let rows = stmt.query_map(params![profile_id], |r| {
            Ok(WordLookup {
                id: r.get(0)?,
                surface: r.get(1)?,
                lemma: r.get(2)?,
                story_id: r.get(3)?,
                sentence_id: r.get(4)?,
                created_at: r.get(5)?,
            })
        })?;
        rows.collect::<Result<_, _>>().map_err(Error::from)
    }
}
