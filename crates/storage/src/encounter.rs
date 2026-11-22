//! Encounter events (ENCOUNTER-BEFORE-TEST-001): the record of a learner
//! having COMPLETED an encounter — the presentation stage of a unit that
//! introduces content — as opposed to ever being tested on it.
//!
//! Why this table exists: until now the engine inferred a passed encounter
//! only indirectly (the U06 lesson cursor reads a presentation stage as met
//! once the learner acts on a later scored stage). A test route that does
//! not walk the lesson cursor (the plan's due-review and weak-skill streams)
//! could therefore surface a letter or word the learner never finished
//! meeting — the owner's phone dogfood «Т was quizzed after А/О/М» report.
//!
//! Hard boundaries pinned by this module's tests:
//! - an encounter event is EXPOSURE, never a scored observation: it never
//!   reaches `evidence_events`, mastery derivation, or scheduler ratings;
//! - recording is idempotent per (profile, content, encounter activity): a
//!   replayed encounter never fabricates a second row (same discipline as
//!   `confirm_content`);
//! - the rows are append-only from the engine side: no retract path exists
//!   until a product reason names one.

use crate::Store;
use crate::error::Error;
use rusqlite::params;

/// One completed encounter: the learner finished the encounter activity
/// `activity_id` of unit `unit_id`, which presents `content_id`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EncounterEvent {
    pub id: String,
    pub profile_id: String,
    pub pack_id: String,
    pub unit_id: String,
    pub activity_id: String,
    pub content_id: String,
    /// RFC 3339 UTC (caller-supplied clock, same convention as every other
    /// timestamp in this store).
    pub occurred_at: String,
}

/// Inputs for one completed encounter (params struct per the crate's
/// `NewMinedItem`/`NewRecording` convention — keeps the writer call inside
/// the argument-count gate).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct NewEncounter<'a> {
    pub pack_id: &'a str,
    pub unit_id: &'a str,
    pub activity_id: &'a str,
    pub content_id: &'a str,
    pub id: &'a str,
    pub occurred_at: &'a str,
}

impl Store {
    /// Record one completed encounter. Idempotent on
    /// (profile, content, activity): a repeat call returns the ORIGINAL
    /// row unchanged.
    pub fn record_encounter(
        &self,
        profile_id: &str,
        new: &NewEncounter<'_>,
    ) -> Result<EncounterEvent, Error> {
        let (pack_id, unit_id, activity_id, content_id, id, occurred_at) = (
            new.pack_id,
            new.unit_id,
            new.activity_id,
            new.content_id,
            new.id,
            new.occurred_at,
        );
        let inserted = self.conn.execute(
            "INSERT INTO encounter_events(id, profile_id, pack_id, unit_id, activity_id, content_id, occurred_at)
             VALUES (?1,?2,?3,?4,?5,?6,?7)
             ON CONFLICT(profile_id, content_id, activity_id) DO NOTHING",
            params![
                id,
                profile_id,
                pack_id,
                unit_id,
                activity_id,
                content_id,
                occurred_at
            ],
        )?;
        if inserted > 0 {
            return Ok(EncounterEvent {
                id: id.to_string(),
                profile_id: profile_id.to_string(),
                pack_id: pack_id.to_string(),
                unit_id: unit_id.to_string(),
                activity_id: activity_id.to_string(),
                content_id: content_id.to_string(),
                occurred_at: occurred_at.to_string(),
            });
        }
        // The row exists; read it back unchanged rather than claim a new one.
        self.conn
            .query_row(
                "SELECT id, profile_id, pack_id, unit_id, activity_id, content_id, occurred_at
                 FROM encounter_events
                 WHERE profile_id = ?1 AND content_id = ?2 AND activity_id = ?3",
                params![profile_id, content_id, activity_id],
                |r| {
                    Ok(EncounterEvent {
                        id: r.get(0)?,
                        profile_id: r.get(1)?,
                        pack_id: r.get(2)?,
                        unit_id: r.get(3)?,
                        activity_id: r.get(4)?,
                        content_id: r.get(5)?,
                        occurred_at: r.get(6)?,
                    })
                },
            )
            .map_err(Into::into)
    }

    /// Every content id this learner has a completed encounter with — the
    /// raw material of the `encountered` eligibility predicate
    /// (ENCOUNTER-BEFORE-TEST-001). Never includes anything inferred from
    /// tests or mastery: only recorded encounters count here.
    pub fn encountered_content_ids(&self, profile_id: &str) -> Result<Vec<String>, Error> {
        let mut stmt = self
            .conn
            .prepare("SELECT DISTINCT content_id FROM encounter_events WHERE profile_id = ?1")?;
        let rows = stmt.query_map(params![profile_id], |r| r.get::<_, String>(0))?;
        rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
    }

    /// The unit ids this learner has a recorded encounter with — the
    /// unit-level half of the `encountered` predicate: the authored
    /// encounter stage is ONE teaching unit, so a recorded encounter event
    /// for a unit allows testing that unit's content (ENCOUNTER-BEFORE-TEST-001).
    /// Same exposure-only boundary as `encountered_content_ids`.
    pub fn encountered_unit_ids(&self, profile_id: &str) -> Result<Vec<String>, Error> {
        let mut stmt = self
            .conn
            .prepare("SELECT DISTINCT unit_id FROM encounter_events WHERE profile_id = ?1")?;
        let rows = stmt.query_map(params![profile_id], |r| r.get::<_, String>(0))?;
        rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn store() -> Store {
        let tmp = tempfile::tempdir().unwrap();
        Store::open(tmp.path().join("profiles.db")).unwrap()
    }

    #[test]
    fn encounter_recording_is_idempotent_and_never_becomes_evidence() {
        let db = store();
        let profile = db.create_profile("L", "2026-11-22T00:00:00Z").unwrap();
        let first = db
            .record_encounter(
                &profile.id,
                &NewEncounter {
                    pack_id: "org.openlanguage.ru-ru.reference",
                    unit_id: "u1",
                    activity_id: "enc-1",
                    content_id: "ru.orth.cyrillic.t",
                    id: "e1",
                    occurred_at: "2026-11-22T00:00:00Z",
                },
            )
            .unwrap();
        let again = db
            .record_encounter(
                &profile.id,
                &NewEncounter {
                    pack_id: "org.openlanguage.ru-ru.reference",
                    unit_id: "u1",
                    activity_id: "enc-1",
                    content_id: "ru.orth.cyrillic.t",
                    id: "e2",
                    occurred_at: "2026-11-22T00:05:00Z",
                },
            )
            .unwrap();
        assert_eq!(first.id, again.id, "a replay keeps the ORIGINAL row");
        assert_eq!(again.occurred_at, "2026-11-22T00:00:00Z");
        assert_eq!(
            db.encountered_content_ids(&profile.id).unwrap(),
            vec!["ru.orth.cyrillic.t".to_string()]
        );
        assert_eq!(
            db.encountered_unit_ids(&profile.id).unwrap(),
            vec!["u1".to_string()]
        );
        assert_eq!(
            db.encountered_unit_ids("other").unwrap(),
            Vec::<String>::new()
        );
        assert!(db.encountered_content_ids("other").unwrap().is_empty());
        // Exposure, never observation: the evidence stream stays empty.
        assert!(db.evidence_for_profile("p1").unwrap().is_empty());
    }
}
