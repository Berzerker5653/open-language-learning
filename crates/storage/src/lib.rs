//! Durable local storage (docs/08): SQLite profile store with
//! forward-only migrations and append-oriented evidence.
//!
//! Privacy invariants enforced by this crate:
//! - no BLOB columns anywhere; raw audio lives in files, never the DB;
//! - `retained_recordings` rows exist only when explicitly inserted
//!   (opt-in retention), storing metadata + relative path only;
//! - evidence is append-only: corrections reference prior events and
//!   duplicate event ids are rejected, so retries cannot double-count.

mod error;
mod evidence;
mod export;
mod mastery;
mod migrations;
mod mined;
mod packs;
mod profile;
mod scheduler;

pub use error::Error;
pub use evidence::{NewRecording, Recording};
pub use export::{EXPORT_FORMAT_VERSION, ExportBundle, ExportOptions, ImportError, ImportMode};
pub use mastery::MasterySnapshot;
pub use migrations::SCHEMA_VERSION;
pub use mined::MinedItem;
pub use packs::{ContentVersion, PackInstallation};
pub use profile::{GoalStatus, LearnerGoal, Profile, Setting};
pub use scheduler::SchedulerRecord;

use rusqlite::Connection;
use std::path::Path;

/// An open profile store. One connection per store; the desktop app holds
/// exactly one.
pub struct Store {
    conn: Connection,
}

impl Store {
    /// Open (creating if needed) a store at `path`, applying migrations.
    pub fn open(path: impl AsRef<Path>) -> Result<Self, Error> {
        let conn = Connection::open(path)?;
        Self::from_conn(conn)
    }

    /// In-memory store for tests and previews.
    pub fn in_memory() -> Result<Self, Error> {
        let conn = Connection::open_in_memory()?;
        Self::from_conn(conn)
    }

    fn from_conn(conn: Connection) -> Result<Self, Error> {
        conn.pragma_update(None, "journal_mode", "WAL")?;
        conn.pragma_update(None, "foreign_keys", "ON")?;
        migrations::migrate(&conn)?;
        Ok(Self { conn })
    }

    /// Direct read access for advanced queries (e.g. privacy audits).
    pub fn conn(&self) -> &Connection {
        &self.conn
    }

    /// Current applied schema version.
    pub fn schema_version(&self) -> Result<i64, Error> {
        let v: i64 = self
            .conn
            .query_row("PRAGMA user_version", [], |r| r.get(0))
            .map_err(Error::from)?;
        Ok(v)
    }

    /// Delete a profile and all app-owned learner data (docs/08 deletion
    /// contract). Recording *files* are the caller's responsibility; the
    /// metadata rows cascade.
    pub fn delete_profile(&self, profile_id: &str) -> Result<(), Error> {
        self.conn.execute(
            "DELETE FROM profiles WHERE id = ?1",
            rusqlite::params![profile_id],
        )?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    #[test]
    fn in_memory_store_migrates_to_head() {
        let store = super::Store::in_memory().unwrap();
        assert_eq!(store.schema_version().unwrap(), super::SCHEMA_VERSION);
    }
}
