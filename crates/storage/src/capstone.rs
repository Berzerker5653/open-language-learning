//! Section capstone attempts (UNIT-CAPSTONE-001).
//!
//! One row per COMPLETED section review — pass or fail. The counts are
//! display facts for the path node; the item-level truth (which content
//! was recalled) stays in `evidence_events`, keyed by the attempt group
//! `<session>:<content_id>` the practice submit already writes. Stopping
//! a session mid-way records nothing here: only completing the review is
//! an attempt.

use crate::error::Error;

#[derive(Debug, Clone)]
pub struct NewCapstoneAttempt<'a> {
    pub pack_id: &'a str,
    /// The section key (the pack's own band string, trimmed and
    /// lower-cased — the same key the path sections group by).
    pub band: &'a str,
    pub session_id: &'a str,
    pub items: i64,
    pub correct: i64,
    pub passed: bool,
    /// Canonical whole-second RFC 3339 (the storage write boundary).
    pub occurred_at: &'a str,
}

impl crate::Store {
    pub fn record_capstone_attempt(
        &self,
        profile_id: &str,
        a: &NewCapstoneAttempt<'_>,
    ) -> Result<(), Error> {
        self.conn.execute(
            "INSERT INTO capstone_attempts
               (profile_id, pack_id, band, session_id, items, correct, passed, occurred_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
             ON CONFLICT(profile_id, pack_id, band, session_id) DO NOTHING",
            rusqlite::params![
                profile_id,
                a.pack_id,
                a.band,
                a.session_id,
                a.items,
                a.correct,
                a.passed as i64,
                a.occurred_at
            ],
        )?;
        Ok(())
    }

    /// Has this profile passed this section's capstone? `done` on the
    /// path reads ONLY passed rows — failed attempts never close the
    /// section (they open the honest in-progress state instead).
    pub fn capstone_passed(
        &self,
        profile_id: &str,
        pack_id: &str,
        band: &str,
    ) -> Result<bool, Error> {
        let n: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM capstone_attempts
             WHERE profile_id = ?1 AND pack_id = ?2 AND band = ?3 AND passed = 1",
            rusqlite::params![profile_id, pack_id, band],
            |r| r.get(0),
        )?;
        Ok(n > 0)
    }

    /// A failed attempt exists and no pass does — the path renders the
    /// section review as started but not yet passed.
    pub fn capstone_attempted_unpassed(
        &self,
        profile_id: &str,
        pack_id: &str,
        band: &str,
    ) -> Result<bool, Error> {
        let fails: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM capstone_attempts
             WHERE profile_id = ?1 AND pack_id = ?2 AND band = ?3 AND passed = 0",
            rusqlite::params![profile_id, pack_id, band],
            |r| r.get(0),
        )?;
        Ok(fails > 0 && !self.capstone_passed(profile_id, pack_id, band)?)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn attempts_round_trip_and_done_reads_passed_only() {
        let store = crate::Store::in_memory().unwrap();
        let p = store
            .create_profile("cap-1", "2026-11-23T00:00:00Z")
            .unwrap();
        assert!(!store.capstone_passed(&p.id, "ru", "on-ramp").unwrap());
        store
            .record_capstone_attempt(
                &p.id,
                &NewCapstoneAttempt {
                    pack_id: "ru",
                    band: "on-ramp",
                    session_id: "s1",
                    items: 16,
                    correct: 10,
                    passed: false,
                    occurred_at: "2026-11-23T00:00:00Z",
                },
            )
            .unwrap();
        assert!(!store.capstone_passed(&p.id, "ru", "on-ramp").unwrap());
        assert!(
            store
                .capstone_attempted_unpassed(&p.id, "ru", "on-ramp")
                .unwrap()
        );
        store
            .record_capstone_attempt(
                &p.id,
                &NewCapstoneAttempt {
                    pack_id: "ru",
                    band: "on-ramp",
                    session_id: "s2",
                    items: 16,
                    correct: 14,
                    passed: true,
                    occurred_at: "2026-11-23T01:00:00Z",
                },
            )
            .unwrap();
        assert!(store.capstone_passed(&p.id, "ru", "on-ramp").unwrap());
        // A passed section is never "attempted unpassed" anymore.
        assert!(
            !store
                .capstone_attempted_unpassed(&p.id, "ru", "on-ramp")
                .unwrap()
        );
        // Re-submitting the same session is a no-op (idempotent retry).
        store
            .record_capstone_attempt(
                &p.id,
                &NewCapstoneAttempt {
                    pack_id: "ru",
                    band: "on-ramp",
                    session_id: "s2",
                    items: 16,
                    correct: 0,
                    passed: false,
                    occurred_at: "2026-11-23T02:00:00Z",
                },
            )
            .unwrap();
        assert!(store.capstone_passed(&p.id, "ru", "on-ramp").unwrap());
        // A pass in one section never leaks into another band or pack.
        assert!(!store.capstone_passed(&p.id, "ru", "a1").unwrap());
        assert!(!store.capstone_passed(&p.id, "ja", "on-ramp").unwrap());
    }
}
