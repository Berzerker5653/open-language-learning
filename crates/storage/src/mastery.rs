//! Mastery snapshot persistence (LEARN-002): derived states are stored
//! with the algorithm and policy versions that produced them, so any
//! snapshot can be audited or recomputed (docs/03 §3, docs/08).

use crate::Store;
use crate::error::Error;
use rusqlite::params;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct MasterySnapshot {
    pub content_id: String,
    /// Canonical dimension name (serde kebab-case).
    pub dimension: String,
    /// Canonical state name (serde kebab-case).
    pub state: String,
    pub confidence: Option<f64>,
    pub algorithm_version: String,
    pub policy_version: String,
    pub computed_at: String,
}

impl Store {
    /// Append a derived snapshot; the latest row per (content, dimension)
    /// is authoritative, history is kept for audit.
    pub fn record_mastery_snapshot(
        &self,
        profile_id: &str,
        snap: &MasterySnapshot,
    ) -> Result<(), Error> {
        self.conn.execute(
            "INSERT INTO mastery_snapshots(profile_id, content_id, dimension, state, confidence, algorithm_version, policy_version, computed_at)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8)",
            params![
                profile_id,
                snap.content_id,
                snap.dimension,
                snap.state,
                snap.confidence,
                snap.algorithm_version,
                snap.policy_version,
                snap.computed_at
            ],
        )?;
        Ok(())
    }

    /// Latest snapshot per (content, dimension) for a profile.
    pub fn latest_mastery(&self, profile_id: &str) -> Result<Vec<MasterySnapshot>, Error> {
        let mut stmt = self.conn.prepare(
            "SELECT content_id, dimension, state, confidence, algorithm_version, policy_version, computed_at
             FROM mastery_snapshots
             WHERE profile_id = ?1 AND id IN (
               SELECT MAX(id) FROM mastery_snapshots WHERE profile_id = ?1
               GROUP BY content_id, dimension)
             ORDER BY content_id, dimension",
        )?;
        let rows = stmt.query_map(params![profile_id], |r| {
            Ok(MasterySnapshot {
                content_id: r.get(0)?,
                dimension: r.get(1)?,
                state: r.get(2)?,
                confidence: r.get(3)?,
                algorithm_version: r.get(4)?,
                policy_version: r.get(5)?,
                computed_at: r.get(6)?,
            })
        })?;
        rows.collect::<Result<_, _>>().map_err(Error::from)
    }
}
