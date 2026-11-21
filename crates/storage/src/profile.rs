//! Profiles, settings, and learner goals. Profiles need no account or
//! network (docs/08): ids are generated locally.

use crate::Store;
use crate::error::Error;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Profile {
    pub id: String,
    pub display_name: String,
    pub created_at: String,
    /// UI-HYGIENE-001: an archived profile stays on disk with all its
    /// evidence but is not offered in the chooser.
    #[serde(default)]
    pub hidden: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Setting {
    pub key: String,
    pub value: serde_json::Value,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum GoalStatus {
    Active,
    Paused,
    Achieved,
    Abandoned,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct LearnerGoal {
    pub goal_id: String,
    pub status: GoalStatus,
    pub target_date: Option<String>,
}

impl Store {
    /// Create a local profile. `created_at` is RFC 3339 UTC supplied by the
    /// caller (storage owns the clock at the app layer, not here).
    pub fn create_profile(&self, display_name: &str, created_at: &str) -> Result<Profile, Error> {
        let id = format!("prof-{}", Uuid::new_v4());
        self.conn.execute(
            "INSERT INTO profiles(id, display_name, created_at) VALUES (?1, ?2, ?3)",
            params![id, display_name, created_at],
        )?;
        Ok(Profile {
            id,
            display_name: display_name.to_string(),
            created_at: created_at.to_string(),
            hidden: false,
        })
    }

    pub fn get_profile(&self, id: &str) -> Result<Option<Profile>, Error> {
        self.conn
            .query_row(
                "SELECT id, display_name, created_at, hidden FROM profiles WHERE id = ?1",
                params![id],
                |r| {
                    Ok(Profile {
                        id: r.get(0)?,
                        display_name: r.get(1)?,
                        created_at: r.get(2)?,
                        hidden: r.get::<_, i64>(3)? != 0,
                    })
                },
            )
            .optional()
            .map_err(Error::from)
    }

    pub fn list_profiles(&self) -> Result<Vec<Profile>, Error> {
        let mut stmt = self.conn.prepare(
            "SELECT id, display_name, created_at, hidden FROM profiles
                 ORDER BY created_at, id",
        )?;
        let rows = stmt.query_map([], |r| {
            Ok(Profile {
                id: r.get(0)?,
                display_name: r.get(1)?,
                created_at: r.get(2)?,
                hidden: r.get::<_, i64>(3)? != 0,
            })
        })?;
        rows.collect::<Result<_, _>>().map_err(Error::from)
    }

    /// UI-HYGIENE-001: when this profile last practised — the newest
    /// evidence event's timestamp, RFC 3339 UTC, or None when it has
    /// never produced evidence.
    pub fn last_evidence_at(&self, profile_id: &str) -> Result<Option<String>, Error> {
        let row: Option<Option<String>> = self
            .conn
            .query_row(
                "SELECT MAX(occurred_at) FROM evidence_events WHERE profile_id = ?1",
                params![profile_id],
                |r| r.get(0),
            )
            .optional()?;
        Ok(row.flatten())
    }

    /// UI-HYGIENE-001: archive a profile out of the chooser (or bring it
    /// back). Data is never deleted by this flag.
    pub fn set_profile_hidden(&self, id: &str, hidden: bool) -> Result<(), Error> {
        let n = self.conn.execute(
            "UPDATE profiles SET hidden = ?2 WHERE id = ?1",
            params![id, i64::from(hidden)],
        )?;
        if n == 0 {
            return Err(Error::NotFound(id.to_string()));
        }
        Ok(())
    }

    /// Insert or replace a settings key. Values are JSON; the app layer
    /// keeps them privacy-minimal.
    pub fn set_setting(
        &self,
        profile_id: &str,
        key: &str,
        value: &serde_json::Value,
    ) -> Result<(), Error> {
        self.conn.execute(
            "INSERT INTO settings(profile_id, key, value_json) VALUES (?1, ?2, ?3)
             ON CONFLICT(profile_id, key) DO UPDATE SET value_json = excluded.value_json",
            params![profile_id, key, value.to_string()],
        )?;
        Ok(())
    }

    pub fn get_setting(
        &self,
        profile_id: &str,
        key: &str,
    ) -> Result<Option<serde_json::Value>, Error> {
        let row: Option<String> = self
            .conn
            .query_row(
                "SELECT value_json FROM settings WHERE profile_id = ?1 AND key = ?2",
                params![profile_id, key],
                |r| r.get(0),
            )
            .optional()?;
        row.map(|v| serde_json::from_str(&v).map_err(Error::from))
            .transpose()
    }

    pub fn settings(&self, profile_id: &str) -> Result<Vec<Setting>, Error> {
        let mut stmt = self
            .conn
            .prepare("SELECT key, value_json FROM settings WHERE profile_id = ?1 ORDER BY key")?;
        let rows = stmt.query_map(params![profile_id], |r| {
            let key: String = r.get(0)?;
            let raw: String = r.get(1)?;
            Ok((key, raw))
        })?;
        let mut out = Vec::new();
        for row in rows {
            let (key, raw) = row?;
            out.push(Setting {
                key,
                value: serde_json::from_str(&raw)?,
            });
        }
        Ok(out)
    }

    pub fn set_goal(&self, profile_id: &str, goal: &LearnerGoal) -> Result<(), Error> {
        self.conn.execute(
            "INSERT INTO learner_goals(profile_id, goal_id, status, target_date)
             VALUES (?1, ?2, ?3, ?4)
             ON CONFLICT(profile_id, goal_id)
             DO UPDATE SET status = excluded.status, target_date = excluded.target_date",
            params![
                profile_id,
                goal.goal_id,
                serde_json::to_string(&goal.status)?,
                goal.target_date
            ],
        )?;
        Ok(())
    }

    pub fn goals(&self, profile_id: &str) -> Result<Vec<LearnerGoal>, Error> {
        let mut stmt = self.conn.prepare(
            "SELECT goal_id, status, target_date FROM learner_goals WHERE profile_id = ?1 ORDER BY goal_id",
        )?;
        let rows = stmt.query_map(params![profile_id], |r| {
            let goal_id: String = r.get(0)?;
            let status_raw: String = r.get(1)?;
            Ok((goal_id, status_raw, r.get::<_, Option<String>>(2)?))
        })?;
        let mut out = Vec::new();
        for row in rows {
            let (goal_id, status_raw, target_date) = row?;
            out.push(LearnerGoal {
                goal_id,
                status: serde_json::from_str(&status_raw)?,
                target_date,
            });
        }
        Ok(out)
    }
}

/// rusqlite's OptionalExtension without importing the trait everywhere.
use rusqlite::OptionalExtension;
