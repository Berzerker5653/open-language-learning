//! Append-oriented evidence (docs/08 evidence immutability) and
//! opt-in recording metadata. Raw audio bytes are never stored here:
//! `retained_recordings` holds a relative path plus metadata, and rows
//! exist only when the learner opted in.

use crate::Store;
use crate::error::Error;
use lts_domain::{
    AssessmentKind, ContentId, EventId, EvidenceCorrection, EvidenceEvent, ProfileId, Score,
    SupportLevel,
};
use rusqlite::params;
use serde::{Deserialize, Serialize};

impl Store {
    /// Append an evidence event. Returns false (without writing) when the
    /// event id already exists, so retries and idempotent replays cannot
    /// double-count learner evidence (docs/08).
    pub fn append_evidence(&self, event: &EvidenceEvent) -> Result<bool, Error> {
        let changed = self.conn.execute(
            "INSERT INTO evidence_events(
               event_id, occurred_at, profile_id, targets_json, modality, activity_id,
               prompt_family_id, attempt_group_id, support_level, support_actions_json,
               outcome, score_json, assessment_kind, held_out, provider_confidence,
               pack_id, pack_version, rubric_version, policy_version, provider_id)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20)
             ON CONFLICT(event_id) DO NOTHING",
            params![
                event.event_id.as_str(),
                event.occurred_at,
                event.profile_id.as_str(),
                serde_json::to_string(&ids(&event.targets))?,
                serde_json::to_string(&event.modality)?,
                event.activity_id.as_str(),
                event.prompt_family_id.as_ref().map(|i| i.as_str()),
                event.attempt_group_id,
                event.support_level.value() as i64,
                serde_json::to_string(&event.support_actions)?,
                serde_json::to_string(&event.outcome)?,
                event.score.map(|s| serde_json::to_string(&s)).transpose()?,
                event
                    .assessment_kind
                    .map(|k| serde_json::to_string(&k))
                    .transpose()?,
                event.held_out as i64,
                event.provider_confidence,
                event.pack_id,
                event.pack_version,
                event.rubric_version,
                event.policy_version,
                event.provider_id,
            ],
        )?;
        Ok(changed == 1)
    }

    /// All evidence for a profile, oldest first. Events remain queryable
    /// after restart by construction (durable table).
    pub fn evidence_for_profile(&self, profile_id: &str) -> Result<Vec<EvidenceEvent>, Error> {
        let mut stmt = self.conn.prepare(
            "SELECT event_id, occurred_at, profile_id, targets_json, modality, activity_id,
                    prompt_family_id, attempt_group_id, support_level, support_actions_json,
                    outcome, score_json, assessment_kind, held_out, provider_confidence,
                    pack_id, pack_version, rubric_version, policy_version, provider_id
             FROM evidence_events WHERE profile_id = ?1
             ORDER BY occurred_at, event_id",
        )?;
        let rows = stmt.query_map(params![profile_id], row_to_event)?;
        rows.collect::<Result<_, _>>().map_err(Error::from)
    }

    pub fn evidence_count(&self, profile_id: &str) -> Result<u64, Error> {
        self.conn
            .query_row(
                "SELECT COUNT(*) FROM evidence_events WHERE profile_id = ?1",
                params![profile_id],
                |r| r.get(0),
            )
            .map_err(Error::from)
    }

    /// Append a correction referencing prior events; originals are never
    /// deleted (tombstone semantics, docs/08).
    pub fn append_correction(&self, c: &EvidenceCorrection) -> Result<bool, Error> {
        let changed = self.conn.execute(
            "INSERT INTO evidence_corrections(event_id, occurred_at, profile_id, references_json, reason)
             VALUES (?1, ?2, ?3, ?4, ?5)
             ON CONFLICT(event_id) DO NOTHING",
            params![
                c.event_id.as_str(),
                c.occurred_at,
                c.profile_id.as_str(),
                serde_json::to_string(
                    &c.references.iter().map(|r| r.as_str()).collect::<Vec<_>>()
                )?,
                c.reason,
            ],
        )?;
        Ok(changed == 1)
    }

    /// Event ids currently excluded by corrections (for derivation layers).
    pub fn corrected_event_ids(&self, profile_id: &str) -> Result<Vec<String>, Error> {
        let mut stmt = self
            .conn
            .prepare("SELECT references_json FROM evidence_corrections WHERE profile_id = ?1")?;
        let rows = stmt.query_map(params![profile_id], |r| r.get::<_, String>(0))?;
        let mut out = Vec::new();
        for row in rows {
            let refs: Vec<String> = serde_json::from_str(&row?)?;
            out.extend(refs);
        }
        Ok(out)
    }
}

fn ids(ids: &[ContentId]) -> Vec<String> {
    ids.iter().map(|i| i.as_str().to_string()).collect()
}

fn parse_ids(raw: &str) -> rusqlite::Result<Vec<ContentId>> {
    let strs: Vec<String> = serde_json::from_str(raw).map_err(|e| {
        rusqlite::Error::FromSqlConversionFailure(0, rusqlite::types::Type::Text, Box::new(e))
    })?;
    strs.iter()
        .map(|s| {
            ContentId::parse(s).map_err(|e| {
                rusqlite::Error::FromSqlConversionFailure(
                    0,
                    rusqlite::types::Type::Text,
                    Box::new(e),
                )
            })
        })
        .collect()
}

fn json_to<T: serde::de::DeserializeOwned>(raw: Option<String>) -> rusqlite::Result<Option<T>> {
    raw.map(|s| {
        serde_json::from_str(&s).map_err(|e| {
            rusqlite::Error::FromSqlConversionFailure(0, rusqlite::types::Type::Text, Box::new(e))
        })
    })
    .transpose()
}

fn conv(col: usize, e: impl std::fmt::Display) -> rusqlite::Error {
    rusqlite::Error::FromSqlConversionFailure(
        col,
        rusqlite::types::Type::Text,
        Box::<dyn std::error::Error + Send + Sync>::from(e.to_string()),
    )
}

fn row_to_event(r: &rusqlite::Row<'_>) -> rusqlite::Result<EvidenceEvent> {
    let text = |col: usize| -> rusqlite::Result<String> { r.get(col) };
    let opt_text = |col: usize| -> rusqlite::Result<Option<String>> { r.get(col) };
    let parse_content = |s: String, col: usize| -> Result<ContentId, rusqlite::Error> {
        ContentId::parse(&s).map_err(|e| conv(col, e))
    };

    let targets_raw = text(3)?;
    let modality_raw = text(4)?;
    let support_actions_raw = text(9)?;
    let outcome_raw = text(10)?;
    let support_level =
        SupportLevel::new(r.get::<_, i64>(8)? as u8).ok_or(rusqlite::Error::InvalidColumnType(
            8,
            "support_level".into(),
            rusqlite::types::Type::Integer,
        ))?;
    Ok(EvidenceEvent {
        event_id: EventId::new(text(0)?),
        occurred_at: text(1)?,
        profile_id: ProfileId::new(text(2)?),
        targets: parse_ids(&targets_raw)?,
        modality: serde_json::from_str(&modality_raw).map_err(|e| conv(4, e))?,
        activity_id: parse_content(text(5)?, 5)?,
        prompt_family_id: opt_text(6)?.map(|s| parse_content(s, 6)).transpose()?,
        attempt_group_id: opt_text(7)?,
        support_level,
        support_actions: serde_json::from_str(&support_actions_raw).map_err(|e| conv(9, e))?,
        outcome: serde_json::from_str(&outcome_raw).map_err(|e| conv(10, e))?,
        score: json_to::<Score>(opt_text(11)?)?,
        assessment_kind: json_to::<AssessmentKind>(opt_text(12)?)?,
        held_out: r.get::<_, i64>(13)? != 0,
        provider_confidence: r.get(14)?,
        pack_id: text(15)?,
        pack_version: text(16)?,
        rubric_version: opt_text(17)?,
        policy_version: opt_text(18)?,
        provider_id: opt_text(19)?,
    })
}

/// Metadata for an opt-in retained recording. The audio file itself lives
/// under the app-data directory at `relative_path`; nothing binary is
/// stored in the database.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct NewRecording {
    pub relative_path: String,
    pub recorded_at: String,
    pub duration_ms: Option<i64>,
    pub purpose: Option<String>,
    pub consent_granted_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Recording {
    pub id: String,
    pub profile_id: String,
    pub relative_path: String,
    pub recorded_at: String,
    pub duration_ms: Option<i64>,
    pub purpose: Option<String>,
    pub consent_granted_at: String,
}

impl Store {
    /// Explicitly retain a recording's metadata (opt-in "keep my attempts").
    pub fn retain_recording(
        &self,
        profile_id: &str,
        rec: &NewRecording,
    ) -> Result<Recording, Error> {
        let id = format!("rec-{}", uuid::Uuid::new_v4());
        self.conn.execute(
            "INSERT INTO retained_recordings(id, profile_id, relative_path, recorded_at, duration_ms, purpose, consent_granted_at)
             VALUES (?1,?2,?3,?4,?5,?6,?7)",
            params![
                id,
                profile_id,
                rec.relative_path,
                rec.recorded_at,
                rec.duration_ms,
                rec.purpose,
                rec.consent_granted_at
            ],
        )?;
        Ok(Recording {
            id,
            profile_id: profile_id.to_string(),
            relative_path: rec.relative_path.clone(),
            recorded_at: rec.recorded_at.clone(),
            duration_ms: rec.duration_ms,
            purpose: rec.purpose.clone(),
            consent_granted_at: rec.consent_granted_at.clone(),
        })
    }

    pub fn recordings(&self, profile_id: &str) -> Result<Vec<Recording>, Error> {
        let mut stmt = self.conn.prepare(
            "SELECT id, profile_id, relative_path, recorded_at, duration_ms, purpose, consent_granted_at
             FROM retained_recordings WHERE profile_id = ?1 ORDER BY recorded_at, id",
        )?;
        let rows = stmt.query_map(params![profile_id], |r| {
            Ok(Recording {
                id: r.get(0)?,
                profile_id: r.get(1)?,
                relative_path: r.get(2)?,
                recorded_at: r.get(3)?,
                duration_ms: r.get(4)?,
                purpose: r.get(5)?,
                consent_granted_at: r.get(6)?,
            })
        })?;
        rows.collect::<Result<_, _>>().map_err(Error::from)
    }

    /// Delete a recording's metadata row. The caller must delete the file
    /// (docs/08 deletion contract); startup recovery reconciles leftovers.
    pub fn forget_recording(&self, id: &str) -> Result<bool, Error> {
        Ok(self
            .conn
            .execute("DELETE FROM retained_recordings WHERE id = ?1", params![id])?
            > 0)
    }
}
