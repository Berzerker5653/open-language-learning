//! Scheduler state persistence: one row per (profile, item, scheduler)
//! with the serialized item state and the next due time (docs/08).

use crate::Store;
use crate::error::Error;
use rusqlite::params;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SchedulerRecord {
    pub item_id: String,
    pub scheduler: String,
    /// Serialized scheduler-specific state (JSON).
    pub params_json: String,
    /// RFC 3339 UTC due time.
    pub due_at: String,
}

/// The exact canonical shape `due_items`' text ordering relies on:
/// `YYYY-MM-DDTHH:MM:SSZ`, whole seconds, zero-padded, ASCII digits.
fn is_canonical_rfc3339(value: &str) -> bool {
    let b = value.as_bytes();
    b.len() == 20
        && b[4] == b'-'
        && b[7] == b'-'
        && b[10] == b'T'
        && b[13] == b':'
        && b[16] == b':'
        && b[19] == b'Z'
        && [0, 1, 2, 3, 5, 6, 8, 9, 11, 12, 14, 15, 17, 18]
            .iter()
            .all(|i| b[*i].is_ascii_digit())
}

impl Store {
    pub fn save_scheduler_state(
        &self,
        profile_id: &str,
        rec: &SchedulerRecord,
    ) -> Result<(), Error> {
        // Sweep finding 9 (2026-10-26): `due_items` filters and orders
        // `due_at` as TEXT, which matches true time only under this
        // canonical whole-second UTC shape. The invariant used to be
        // unwritten; the write boundary now refuses anything else, so a
        // mixed-format row can never enter and shuffle the review queue.
        if !is_canonical_rfc3339(&rec.due_at) {
            return Err(Error::Invalid(format!(
                "due_at {:?} is not canonical RFC 3339 UTC (YYYY-MM-DDTHH:MM:SSZ)",
                rec.due_at
            )));
        }
        self.conn.execute(
            "INSERT INTO scheduler_state(profile_id, item_id, scheduler, params_json, due_at)
             VALUES (?1,?2,?3,?4,?5)
             ON CONFLICT(profile_id, item_id, scheduler)
             DO UPDATE SET params_json = excluded.params_json, due_at = excluded.due_at",
            params![
                profile_id,
                rec.item_id,
                rec.scheduler,
                rec.params_json,
                rec.due_at
            ],
        )?;
        Ok(())
    }

    /// Items due at or before `due_cutoff` (canonical RFC 3339 UTC —
    /// `save_scheduler_state` enforces the shape text comparison needs),
    /// soonest first.
    pub fn due_items(
        &self,
        profile_id: &str,
        scheduler: &str,
        due_cutoff: &str,
    ) -> Result<Vec<SchedulerRecord>, Error> {
        let mut stmt = self.conn.prepare(
            "SELECT item_id, scheduler, params_json, due_at
             FROM scheduler_state
             WHERE profile_id = ?1 AND scheduler = ?2 AND due_at <= ?3
             ORDER BY due_at, item_id",
        )?;
        let rows = stmt.query_map(params![profile_id, scheduler, due_cutoff], |r| {
            Ok(SchedulerRecord {
                item_id: r.get(0)?,
                scheduler: r.get(1)?,
                params_json: r.get(2)?,
                due_at: r.get(3)?,
            })
        })?;
        rows.collect::<Result<_, _>>().map_err(Error::from)
    }

    /// All scheduler rows for a profile (export/portability).
    pub fn scheduler_state(&self, profile_id: &str) -> Result<Vec<SchedulerRecord>, Error> {
        let mut stmt = self.conn.prepare(
            "SELECT item_id, scheduler, params_json, due_at
             FROM scheduler_state WHERE profile_id = ?1 ORDER BY due_at, item_id",
        )?;
        let rows = stmt.query_map(params![profile_id], |r| {
            Ok(SchedulerRecord {
                item_id: r.get(0)?,
                scheduler: r.get(1)?,
                params_json: r.get(2)?,
                due_at: r.get(3)?,
            })
        })?;
        rows.collect::<Result<_, _>>().map_err(Error::from)
    }
}
