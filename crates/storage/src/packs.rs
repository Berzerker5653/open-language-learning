//! Installed packs, per-profile pack selections, and content version
//! mappings needed for evidence reproducibility (docs/08).

use crate::Store;
use crate::error::Error;
use rusqlite::params;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PackInstallation {
    pub pack_id: String,
    pub version: String,
    pub installed_at: String,
    /// `lts-domain::TrustState` discriminant as serialized by serde.
    pub trust_state: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ContentVersion {
    pub pack_id: String,
    pub content_id: String,
    pub content_version: String,
}

impl Store {
    /// Record an installed pack version (install/upgrade from the pack
    /// store). Re-installing the same version is idempotent.
    pub fn record_installation(&self, inst: &PackInstallation) -> Result<(), Error> {
        self.conn.execute(
            "INSERT INTO pack_installations(pack_id, version, installed_at, trust_state)
             VALUES (?1, ?2, ?3, ?4)
             ON CONFLICT(pack_id, version)
             DO UPDATE SET installed_at = excluded.installed_at, trust_state = excluded.trust_state",
            params![inst.pack_id, inst.version, inst.installed_at, inst.trust_state],
        )?;
        Ok(())
    }

    pub fn installations(&self) -> Result<Vec<PackInstallation>, Error> {
        let mut stmt = self.conn.prepare(
            "SELECT pack_id, version, installed_at, trust_state
             FROM pack_installations ORDER BY pack_id, installed_at, version",
        )?;
        let rows = stmt.query_map([], |r| {
            Ok(PackInstallation {
                pack_id: r.get(0)?,
                version: r.get(1)?,
                installed_at: r.get(2)?,
                trust_state: r.get(3)?,
            })
        })?;
        rows.collect::<Result<_, _>>().map_err(Error::from)
    }

    /// Which pack version a profile studies. One selection per pack id;
    /// switching versions is an update, never a silent overwrite of
    /// evidence (old content versions stay in `content_versions`).
    pub fn select_pack(&self, profile_id: &str, pack_id: &str, version: &str) -> Result<(), Error> {
        self.conn.execute(
            "INSERT INTO profile_pack_selections(profile_id, pack_id, version)
             VALUES (?1, ?2, ?3)
             ON CONFLICT(profile_id, pack_id) DO UPDATE SET version = excluded.version",
            params![profile_id, pack_id, version],
        )?;
        Ok(())
    }

    pub fn selected_packs(&self, profile_id: &str) -> Result<Vec<(String, String)>, Error> {
        let mut stmt = self.conn.prepare(
            "SELECT pack_id, version FROM profile_pack_selections WHERE profile_id = ?1 ORDER BY pack_id",
        )?;
        let rows = stmt.query_map(params![profile_id], |r| Ok((r.get(0)?, r.get(1)?)))?;
        rows.collect::<Result<_, _>>().map_err(Error::from)
    }

    /// Record the content version in effect for a content id, so evidence
    /// stays interpretable across pack updates (docs/08 §imports).
    pub fn record_content_version(&self, cv: &ContentVersion) -> Result<(), Error> {
        self.conn.execute(
            "INSERT INTO content_versions(pack_id, content_id, content_version)
             VALUES (?1, ?2, ?3)
             ON CONFLICT(pack_id, content_id) DO UPDATE SET content_version = excluded.content_version",
            params![cv.pack_id, cv.content_id, cv.content_version],
        )?;
        Ok(())
    }

    pub fn content_version(
        &self,
        pack_id: &str,
        content_id: &str,
    ) -> Result<Option<String>, Error> {
        self.conn
            .query_row(
                "SELECT content_version FROM content_versions WHERE pack_id = ?1 AND content_id = ?2",
                params![pack_id, content_id],
                |r| r.get(0),
            )
            .optional()
            .map_err(Error::from)
    }
}

use rusqlite::OptionalExtension;
