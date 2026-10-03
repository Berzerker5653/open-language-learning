//! Forward-only schema migrations (docs/08). Each migration is a single
//! transaction applied in version order; `PRAGMA user_version` tracks the
//! applied head and `schema_migrations` records when each landed.
//!
//! Version history:
//! 1. Core profile storage: profiles, settings, pack installations and
//!    selections, content versions, learner goals.
//! 2. Learner-model tables: evidence events/corrections, mastery
//!    snapshots, scheduler state, sessions, retained recordings
//!    (metadata only), content reports.

use crate::error::Error;
use rusqlite::Connection;

pub const SCHEMA_VERSION: i64 = 2;

struct Migration {
    version: i64,
    sql: &'static str,
}

const MIGRATIONS: &[Migration] = &[
    Migration {
        version: 1,
        sql: "
CREATE TABLE schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);
CREATE TABLE profiles (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE settings (
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value_json TEXT NOT NULL,
  PRIMARY KEY (profile_id, key)
);
CREATE TABLE pack_installations (
  pack_id TEXT NOT NULL,
  version TEXT NOT NULL,
  installed_at TEXT NOT NULL,
  trust_state TEXT NOT NULL,
  PRIMARY KEY (pack_id, version)
);
CREATE TABLE profile_pack_selections (
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pack_id TEXT NOT NULL,
  version TEXT NOT NULL,
  PRIMARY KEY (profile_id, pack_id)
);
CREATE TABLE content_versions (
  pack_id TEXT NOT NULL,
  content_id TEXT NOT NULL,
  content_version TEXT NOT NULL,
  PRIMARY KEY (pack_id, content_id)
);
CREATE TABLE learner_goals (
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  goal_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  target_date TEXT,
  PRIMARY KEY (profile_id, goal_id)
);
",
    },
    Migration {
        version: 2,
        sql: "
CREATE TABLE evidence_events (
  event_id TEXT PRIMARY KEY,
  occurred_at TEXT NOT NULL,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  targets_json TEXT NOT NULL,
  modality TEXT NOT NULL,
  activity_id TEXT NOT NULL,
  prompt_family_id TEXT,
  attempt_group_id TEXT,
  support_level INTEGER NOT NULL,
  support_actions_json TEXT NOT NULL,
  outcome TEXT NOT NULL,
  score_json TEXT,
  assessment_kind TEXT,
  held_out INTEGER NOT NULL,
  provider_confidence REAL,
  pack_id TEXT NOT NULL,
  pack_version TEXT NOT NULL,
  rubric_version TEXT,
  policy_version TEXT,
  provider_id TEXT
);
CREATE TABLE evidence_corrections (
  event_id TEXT PRIMARY KEY,
  occurred_at TEXT NOT NULL,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  references_json TEXT NOT NULL,
  reason TEXT NOT NULL
);
CREATE TABLE mastery_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content_id TEXT NOT NULL,
  dimension TEXT NOT NULL,
  state TEXT NOT NULL,
  confidence REAL,
  algorithm_version TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  computed_at TEXT NOT NULL
);
CREATE TABLE scheduler_state (
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  scheduler TEXT NOT NULL,
  params_json TEXT NOT NULL,
  due_at TEXT,
  PRIMARY KEY (profile_id, item_id, scheduler)
);
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  plan_json TEXT
);
CREATE TABLE retained_recordings (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  relative_path TEXT NOT NULL,
  recorded_at TEXT NOT NULL,
  duration_ms INTEGER,
  purpose TEXT,
  consent_granted_at TEXT NOT NULL
);
CREATE TABLE reports (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_evidence_profile_time ON evidence_events(profile_id, occurred_at);
CREATE INDEX idx_evidence_activity ON evidence_events(activity_id);
",
    },
];

pub(crate) fn migrate(conn: &Connection) -> Result<(), Error> {
    let current: i64 = conn.query_row("PRAGMA user_version", [], |r| r.get(0))?;
    if current > SCHEMA_VERSION {
        return Err(Error::TooNew {
            found: current,
            max: SCHEMA_VERSION,
        });
    }
    for m in MIGRATIONS {
        if m.version <= current {
            continue;
        }
        let tx = conn.unchecked_transaction().map_err(|e| Error::Migration {
            version: m.version,
            message: e.to_string(),
        })?;
        tx.execute_batch(m.sql).map_err(|e| Error::Migration {
            version: m.version,
            message: e.to_string(),
        })?;
        tx.execute(
            "INSERT INTO schema_migrations(version, applied_at) VALUES (?1, strftime('%Y-%m-%dT%H:%M:%SZ','now'))",
            rusqlite::params![m.version],
        )?;
        tx.commit()?;
        conn.pragma_update(None, "user_version", m.version)?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn migrations_are_sequential_and_complete_history() {
        for (i, m) in MIGRATIONS.iter().enumerate() {
            assert_eq!(m.version, (i + 1) as i64);
        }
        assert_eq!(MIGRATIONS.last().unwrap().version, SCHEMA_VERSION);
    }
}
