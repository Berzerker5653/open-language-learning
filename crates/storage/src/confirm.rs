//! Content confirmations (CONTENT-CONFIRM-001, ADR-0040): the only
//! "checked by" mark that will ever exist on this project's content. A
//! fluent user confirms a pack content item inside the app; the mark is
//! attributed to the profile that gave it and lives only on this device.
//!
//! Hard boundaries pinned by this module's tests:
//! - a confirmation is created ONLY by an explicit call from the UI
//!   toggle; no engine path ever writes one automatically;
//! - confirmations never touch a pack file, an installation's
//!   `trust_state`, or any review record: packs keep their declared
//!   review posture regardless (ADR-0040 acceptance 2);
//! - attribution comes from the `profiles` table join, never from a
//!   free-text name supplied at confirmation time.

use crate::Store;
use crate::error::Error;
use rusqlite::{OptionalExtension, params};
use serde::{Deserialize, Serialize};

/// One learner's confirmation mark on one content item in one pack.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ContentConfirmation {
    pub id: String,
    pub profile_id: String,
    pub pack_id: String,
    pub content_id: String,
    /// RFC 3339 UTC (caller-supplied clock, same convention as every
    /// other timestamp in this store).
    pub created_at: String,
}

/// A confirmation as rendered: who confirmed, and when. `display_name`
/// is joined from `profiles` at read time, so it always names the real
/// profile record.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ConfirmedBy {
    pub profile_id: String,
    pub display_name: String,
    pub created_at: String,
}

impl Store {
    /// Record a confirmation. Idempotent on (profile, pack, content): a
    /// repeat call returns the ORIGINAL row — its id and `created_at`
    /// survive, mirroring the `add_mined` discipline (K-61): no raw
    /// UNIQUE error can reach the caller and a double click cannot
    /// fabricate a second mark.
    pub fn confirm_content(
        &self,
        profile_id: &str,
        pack_id: &str,
        content_id: &str,
        id: &str,
        created_at: &str,
    ) -> Result<ContentConfirmation, Error> {
        let inserted = self.conn.execute(
            "INSERT INTO content_confirmations(id, profile_id, pack_id, content_id, created_at)
             VALUES (?1,?2,?3,?4,?5)
             ON CONFLICT(profile_id, pack_id, content_id) DO NOTHING",
            params![id, profile_id, pack_id, content_id, created_at],
        )?;
        if inserted > 0 {
            return Ok(ContentConfirmation {
                id: id.to_string(),
                profile_id: profile_id.to_string(),
                pack_id: pack_id.to_string(),
                content_id: content_id.to_string(),
                created_at: created_at.to_string(),
            });
        }
        self.confirmation_row(profile_id, pack_id, content_id)?
            .ok_or_else(|| {
                Error::NotFound(format!(
                    "confirmation for {pack_id}/{content_id} vanished mid-read"
                ))
            })
    }

    /// Retract the learner's OWN mark. Returns whether a row was
    /// removed; a confirmation belonging to another profile is never
    /// touched (attribution is per-profile by construction).
    pub fn remove_content_confirmation(
        &self,
        profile_id: &str,
        pack_id: &str,
        content_id: &str,
    ) -> Result<bool, Error> {
        let removed = self.conn.execute(
            "DELETE FROM content_confirmations
             WHERE profile_id = ?1 AND pack_id = ?2 AND content_id = ?3",
            params![profile_id, pack_id, content_id],
        )?;
        Ok(removed > 0)
    }

    /// Every confirmation on one content item, attributed by profile
    /// display name, oldest mark first.
    pub fn content_confirmations(
        &self,
        pack_id: &str,
        content_id: &str,
    ) -> Result<Vec<ConfirmedBy>, Error> {
        let mut stmt = self.conn.prepare(
            "SELECT c.profile_id, p.display_name, c.created_at
             FROM content_confirmations c
             JOIN profiles p ON p.id = c.profile_id
             WHERE c.pack_id = ?1 AND c.content_id = ?2
             ORDER BY c.created_at ASC, c.id ASC",
        )?;
        let rows = stmt.query_map(params![pack_id, content_id], |r| {
            Ok(ConfirmedBy {
                profile_id: r.get(0)?,
                display_name: r.get(1)?,
                created_at: r.get(2)?,
            })
        })?;
        rows.collect::<Result<Vec<_>, _>>().map_err(Error::from)
    }

    /// All marks given by one profile (export path, and any future
    /// "what have I confirmed" surface).
    pub fn profile_content_confirmations(
        &self,
        profile_id: &str,
    ) -> Result<Vec<ContentConfirmation>, Error> {
        let mut stmt = self.conn.prepare(
            "SELECT id, profile_id, pack_id, content_id, created_at
             FROM content_confirmations
             WHERE profile_id = ?1
             ORDER BY created_at ASC, id ASC",
        )?;
        let rows = stmt.query_map(params![profile_id], |r| {
            Ok(ContentConfirmation {
                id: r.get(0)?,
                profile_id: r.get(1)?,
                pack_id: r.get(2)?,
                content_id: r.get(3)?,
                created_at: r.get(4)?,
            })
        })?;
        rows.collect::<Result<Vec<_>, _>>().map_err(Error::from)
    }

    fn confirmation_row(
        &self,
        profile_id: &str,
        pack_id: &str,
        content_id: &str,
    ) -> Result<Option<ContentConfirmation>, Error> {
        self.conn
            .query_row(
                "SELECT id, profile_id, pack_id, content_id, created_at
                 FROM content_confirmations
                 WHERE profile_id = ?1 AND pack_id = ?2 AND content_id = ?3",
                params![profile_id, pack_id, content_id],
                |r| {
                    Ok(ContentConfirmation {
                        id: r.get(0)?,
                        profile_id: r.get(1)?,
                        pack_id: r.get(2)?,
                        content_id: r.get(3)?,
                        created_at: r.get(4)?,
                    })
                },
            )
            .optional()
            .map_err(Error::from)
    }
}
