//! Learner-owned lexicon (K-14 sentence mining): words the learner
//! chose to keep, with the citation of where they were encountered.
//! Device-local like everything else (docs/08). Mined items are NOT
//! pack content: they never appear in evidence events and never touch
//! pack-content scheduler rows.

use crate::Store;
use crate::error::Error;
use rusqlite::params;

#[derive(Debug, Clone, PartialEq)]
pub struct MinedItem {
    pub id: String,
    pub surface: String,
    pub reading: Option<String>,
    pub gloss: Option<String>,
    pub source_citation: String,
    pub created_at: String,
}

/// Input for `add_mined`; keeps the API under the argument-count lint.
#[derive(Debug, Clone)]
pub struct NewMinedItem<'a> {
    pub id: &'a str,
    pub surface: &'a str,
    pub reading: Option<&'a str>,
    pub gloss: Option<&'a str>,
    pub source_citation: &'a str,
    pub created_at: &'a str,
}

impl Store {
    pub fn add_mined(&self, profile_id: &str, item: NewMinedItem<'_>) -> Result<(), Error> {
        self.conn.execute(
            "INSERT INTO mined_items(id, profile_id, surface, reading, gloss, source_citation, created_at)
             VALUES (?1,?2,?3,?4,?5,?6,?7)",
            params![item.id, profile_id, item.surface, item.reading, item.gloss, item.source_citation, item.created_at],
        )?;
        Ok(())
    }

    pub fn mined_items(&self, profile_id: &str) -> Result<Vec<MinedItem>, Error> {
        let mut stmt = self.conn.prepare(
            "SELECT id, surface, reading, gloss, source_citation, created_at
             FROM mined_items WHERE profile_id = ?1 ORDER BY created_at, id",
        )?;
        let rows = stmt.query_map(params![profile_id], |r| {
            Ok(MinedItem {
                id: r.get(0)?,
                surface: r.get(1)?,
                reading: r.get(2)?,
                gloss: r.get(3)?,
                source_citation: r.get(4)?,
                created_at: r.get(5)?,
            })
        })?;
        rows.collect::<Result<_, _>>().map_err(Error::from)
    }

    pub fn remove_mined(&self, profile_id: &str, id: &str) -> Result<bool, Error> {
        let removed = self.conn.execute(
            "DELETE FROM mined_items WHERE profile_id = ?1 AND id = ?2",
            params![profile_id, id],
        )?;
        // Drop the item's SRS row too: a deleted word must not keep
        // resurfacing in reviews.
        self.conn.execute(
            "DELETE FROM scheduler_state WHERE profile_id = ?1 AND item_id = ?2",
            params![profile_id, id],
        )?;
        Ok(removed > 0)
    }
}
