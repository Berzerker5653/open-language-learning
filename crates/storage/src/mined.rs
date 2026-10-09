//! Learner-owned lexicon (K-14 sentence mining): words the learner
//! chose to keep, with the citation of where they were encountered.
//! Device-local like everything else (docs/08). Mined items are NOT
//! pack content: they never appear in evidence events and never touch
//! pack-content scheduler rows.

use crate::Store;
use crate::error::Error;
use rusqlite::{OptionalExtension, params};

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

/// Result of `add_mined`: the id of the row that survived, and whether
/// this call created it. Mining a surface twice keeps the ORIGINAL row
/// (id, created_at, and its `scheduler_state` row are anchored to that
/// id), so a repeat mine can never silently reset the learner's SRS
/// history for that word.
#[derive(Debug, Clone, PartialEq)]
pub struct AddMinedOutcome {
    pub id: String,
    pub was_new: bool,
}

impl Store {
    pub fn add_mined(
        &self,
        profile_id: &str,
        item: NewMinedItem<'_>,
    ) -> Result<AddMinedOutcome, Error> {
        // (profile_id, surface) is UNIQUE (migration 4). A repeat mine must
        // not fail and must not replace the learner's row: the original id
        // stays (its `scheduler_state` row is anchored to that id, so the
        // word's SRS history survives), and only the annotations the caller
        // actually supplied are folded in with COALESCE — a None never erases
        // what the learner already recorded.
        //
        // `ON CONFLICT DO NOTHING` plus the change count is the race-free
        // discriminator. A read-then-insert pre-check would let two
        // simultaneous Mine clicks both try to insert, and the loser would
        // surface exactly the raw UNIQUE error this change removes.
        let inserted = self.conn.execute(
            "INSERT INTO mined_items(id, profile_id, surface, reading, gloss, source_citation, created_at)
             VALUES (?1,?2,?3,?4,?5,?6,?7)
             ON CONFLICT(profile_id, surface) DO NOTHING",
            params![item.id, profile_id, item.surface, item.reading, item.gloss, item.source_citation, item.created_at],
        )?;
        if inserted > 0 {
            return Ok(AddMinedOutcome {
                id: item.id.to_string(),
                was_new: true,
            });
        }
        self.conn.execute(
            "UPDATE mined_items
             SET reading = COALESCE(?3, reading), gloss = COALESCE(?4, gloss)
             WHERE profile_id = ?1 AND surface = ?2",
            params![profile_id, item.surface, item.reading, item.gloss],
        )?;
        let id = self
            .conn
            .query_row(
                "SELECT id FROM mined_items WHERE profile_id = ?1 AND surface = ?2",
                params![profile_id, item.surface],
                |r| r.get(0),
            )
            .optional()?
            .ok_or_else(|| Error::NotFound(format!("mined surface {:?}", item.surface)))?;
        Ok(AddMinedOutcome { id, was_new: false })
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
