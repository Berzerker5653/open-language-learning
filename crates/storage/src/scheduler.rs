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

impl Store {
    pub fn save_scheduler_state(
        &self,
        profile_id: &str,
        rec: &SchedulerRecord,
    ) -> Result<(), Error> {
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

    /// Items due at or before `due_cutoff` (RFC 3339 UTC), soonest first.
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
