//! Profile export/import (DATA-002, docs/08 §portability).
//!
//! The export bundle is a versioned, human-readable JSON document —
//! no proprietary binary format, no cloud dependency. Privacy rules:
//! - recording *metadata* is included only when the caller opts in
//!   (`include_recordings`); recording files are never part of the
//!   bundle (no binary payloads anywhere);
//! - import never silently overwrites an existing profile: preserving
//!   the exported id fails if the id exists, and replacement requires
//!   the explicit `ImportMode::Overwrite`.

use crate::error::Error;
use crate::{
    ContentVersion, LearnerGoal, MasterySnapshot, MinedItem, PackInstallation, Profile, Recording,
    SchedulerRecord, Setting, Store,
};
use lts_domain::{EvidenceCorrection, EvidenceEvent};
use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Bump when the bundle shape changes; import rejects unknown versions.
/// Version 2 added the learner's saved words (`mined_items`, review
/// finding R05). Version 1 bundles stay importable under the explicit
/// compatibility rule in `import_profile`: they simply carry no saved words.
pub const EXPORT_FORMAT_VERSION: u32 = 2;

/// Oldest bundle version this build understands.
pub const MIN_SUPPORTED_FORMAT_VERSION: u32 = 1;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ExportBundle {
    pub format_version: u32,
    /// RFC 3339 UTC export time (caller-supplied clock).
    pub exported_at: String,
    pub profile: Profile,
    pub settings: Vec<Setting>,
    pub goals: Vec<LearnerGoal>,
    pub pack_installations: Vec<PackInstallation>,
    /// (pack_id, version) studied by this profile.
    pub selected_packs: Vec<(String, String)>,
    pub content_versions: Vec<ContentVersion>,
    pub evidence: Vec<EvidenceEvent>,
    pub corrections: Vec<EvidenceCorrection>,
    pub mastery_snapshots: Vec<MasterySnapshot>,
    pub scheduler_state: Vec<SchedulerRecord>,
    /// The learner's own saved words. Version 1 bundles have no such field;
    /// they import as an empty list rather than failing.
    #[serde(default)]
    pub mined_items: Vec<MinedItem>,
    /// Opt-in: `None` unless explicitly requested at export time.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub recordings: Option<Vec<Recording>>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub struct ExportOptions {
    pub include_recordings: bool,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ImportMode {
    /// Import under a freshly generated profile id. Never touches an
    /// existing profile.
    NewProfile,
    /// Keep the exported profile id; fail if it already exists.
    PreserveId,
    /// Explicitly delete the existing profile (cascading its learner
    /// data) and import under the exported id. Never implicit.
    Overwrite,
}

#[derive(Debug, thiserror::Error)]
pub enum ImportError {
    #[error(
        "profile {0} already exists; import will not silently overwrite it \
         (choose NewProfile or explicit Overwrite)"
    )]
    ProfileExists(String),
    #[error("profile not found for overwrite: {0}")]
    ProfileNotFound(String),
    #[error("export format version {0} unsupported (expected {EXPORT_FORMAT_VERSION})")]
    UnsupportedFormatVersion(u32),
    #[error("storage: {0}")]
    Storage(#[from] Error),
}

impl Store {
    /// Serialize the full app-owned learner state for one profile.
    pub fn export_profile(
        &self,
        profile_id: &str,
        exported_at: &str,
        opts: &ExportOptions,
    ) -> Result<ExportBundle, Error> {
        let profile = self
            .get_profile(profile_id)?
            .ok_or_else(|| Error::NotFound(profile_id.to_string()))?;
        let recordings = if opts.include_recordings {
            Some(self.recordings(profile_id)?)
        } else {
            None
        };
        Ok(ExportBundle {
            format_version: EXPORT_FORMAT_VERSION,
            exported_at: exported_at.to_string(),
            profile,
            settings: self.settings(profile_id)?,
            goals: self.goals(profile_id)?,
            pack_installations: self.installations()?,
            selected_packs: self.selected_packs(profile_id)?,
            content_versions: self.all_content_versions()?,
            evidence: self.evidence_for_profile(profile_id)?,
            corrections: self.corrections_for_profile(profile_id)?,
            mastery_snapshots: self.latest_mastery(profile_id)?,
            scheduler_state: self.scheduler_state(profile_id)?,
            mined_items: self.mined_items(profile_id)?,
            recordings,
        })
    }

    /// Import a bundle; returns the id of the created profile.
    ///
    /// Review finding R06: an import is all-or-nothing. Every write — the
    /// `Overwrite` delete included — runs inside one transaction, so a
    /// rejected row unwinds the attempt instead of leaving half a profile
    /// behind or a learner whose previous data was already deleted. Global
    /// ids (events, corrections, recordings, saved words) are unique across
    /// profiles, so restoring into a store that already holds them re-issues
    /// fresh ids and rewrites what points at them, rather than silently
    /// dropping the rows.
    pub fn import_profile(
        &self,
        bundle: &ExportBundle,
        mode: &ImportMode,
    ) -> Result<String, ImportError> {
        if bundle.format_version < MIN_SUPPORTED_FORMAT_VERSION
            || bundle.format_version > EXPORT_FORMAT_VERSION
        {
            return Err(ImportError::UnsupportedFormatVersion(bundle.format_version));
        }
        let exists = self.get_profile(&bundle.profile.id)?.is_some();
        let target_id = match mode {
            ImportMode::NewProfile => format!("prof-{}", uuid::Uuid::new_v4()),
            ImportMode::PreserveId => {
                if exists {
                    return Err(ImportError::ProfileExists(bundle.profile.id.clone()));
                }
                bundle.profile.id.clone()
            }
            ImportMode::Overwrite => {
                if !exists {
                    return Err(ImportError::ProfileNotFound(bundle.profile.id.clone()));
                }
                bundle.profile.id.clone()
            }
        };
        self.conn
            .execute("BEGIN IMMEDIATE", [])
            .map_err(Error::from)?;
        match self.write_bundle(&target_id, bundle, mode) {
            Ok(()) => {
                self.conn.execute("COMMIT", []).map_err(Error::from)?;
                Ok(target_id)
            }
            Err(e) => {
                self.conn.execute("ROLLBACK", []).map_err(Error::from)?;
                Err(e.into())
            }
        }
    }

    /// One import's writes, always called inside `import_profile`'s
    /// transaction so any error unwinds the whole attempt.
    fn write_bundle(
        &self,
        target_id: &str,
        bundle: &ExportBundle,
        mode: &ImportMode,
    ) -> Result<(), Error> {
        if matches!(mode, ImportMode::Overwrite) {
            self.delete_profile(&bundle.profile.id)?;
        }
        self.insert_profile_with_id(
            target_id,
            &bundle.profile.display_name,
            &bundle.profile.created_at,
        )?;
        for s in &bundle.settings {
            self.set_setting(target_id, &s.key, &s.value)?;
        }
        for g in &bundle.goals {
            self.set_goal(target_id, g)?;
        }
        for inst in &bundle.pack_installations {
            self.record_installation(inst)?;
        }
        for (pack_id, version) in &bundle.selected_packs {
            self.select_pack(target_id, pack_id, version)?;
        }
        for cv in &bundle.content_versions {
            self.record_content_version(cv)?;
        }
        // Evidence keeps its exported id whenever this store has not used
        // it; when it has (a same-store restore), a suffixed id is issued so
        // the attempt survives as its own observation instead of being
        // swallowed by the dedupe path. The event's profile id is remapped
        // to the target: the bundle records provenance with the source id,
        // but the row must belong to the importing profile (FK contract).
        let mut event_ids: HashMap<String, String> = HashMap::new();
        for e in &bundle.evidence {
            let mut e = e.clone();
            e.profile_id = lts_domain::ProfileId::new(target_id);
            let fresh = self.fresh_id(
                e.event_id.as_str(),
                target_id,
                "evidence_events",
                "event_id",
            )?;
            event_ids.insert(e.event_id.as_str().to_string(), fresh.clone());
            e.event_id = lts_domain::EventId::new(fresh);
            if !self.append_evidence(&e)? {
                return Err(Error::AlreadyExists(format!(
                    "evidence {}",
                    e.event_id.as_str()
                )));
            }
        }
        for c in &bundle.corrections {
            let mut c = c.clone();
            c.profile_id = lts_domain::ProfileId::new(target_id);
            let fresh = self.fresh_id(
                c.event_id.as_str(),
                target_id,
                "evidence_corrections",
                "event_id",
            )?;
            c.event_id = lts_domain::EventId::new(fresh);
            // A correction only means anything for the events it names, so
            // its references follow the ids those events actually got.
            c.references = c
                .references
                .iter()
                .map(|r| {
                    lts_domain::EventId::new(
                        event_ids
                            .get(r.as_str())
                            .cloned()
                            .unwrap_or_else(|| r.as_str().to_string()),
                    )
                })
                .collect();
            if !self.append_correction(&c)? {
                return Err(Error::AlreadyExists(format!(
                    "correction {}",
                    c.event_id.as_str()
                )));
            }
        }
        for m in &bundle.mastery_snapshots {
            self.record_mastery_snapshot(target_id, m)?;
        }
        // Saved words and the schedule rows anchored to them move together:
        // a re-issued word id is rewritten in the scheduler row too, so a
        // restored word keeps its own due state (R05).
        let mut mined_ids: HashMap<String, String> = HashMap::new();
        for m in &bundle.mined_items {
            let fresh = self.fresh_id(&m.id, target_id, "mined_items", "id")?;
            mined_ids.insert(m.id.clone(), fresh.clone());
            self.conn.execute(
                "INSERT INTO mined_items(id, profile_id, surface, reading, gloss, source_citation, created_at)
                 VALUES (?1,?2,?3,?4,?5,?6,?7)",
                params![
                    fresh,
                    target_id,
                    m.surface,
                    m.reading,
                    m.gloss,
                    m.source_citation,
                    m.created_at
                ],
            )?;
        }
        for sc in &bundle.scheduler_state {
            let mut sc = sc.clone();
            if let Some(fresh) = mined_ids.get(&sc.item_id) {
                sc.item_id = fresh.clone();
            }
            self.save_scheduler_state(target_id, &sc)?;
        }
        // Recordings are opt-in on both sides: only present in the
        // bundle if the exporter asked, only written if present.
        if let Some(recs) = &bundle.recordings {
            for r in recs {
                let mut r = r.clone();
                r.id = self.fresh_id(&r.id, target_id, "retained_recordings", "id")?;
                self.insert_recording_with_id(target_id, &r)?;
            }
        }
        Ok(())
    }

    /// Keep an exported global id when this store has not used it; otherwise
    /// derive a deterministic suffixed id so the restored row still names the
    /// same learner action instead of colliding with another profile's row.
    fn fresh_id(
        &self,
        original: &str,
        target_id: &str,
        table: &str,
        column: &str,
    ) -> Result<String, Error> {
        if !self.id_taken(table, column, original)? {
            return Ok(original.to_string());
        }
        for n in 1..=999_u32 {
            let candidate = format!("{original}~{target_id}#{n}");
            if !self.id_taken(table, column, &candidate)? {
                return Ok(candidate);
            }
        }
        Err(Error::NotFound(format!(
            "{table} id space exhausted for {original}"
        )))
    }

    fn id_taken(&self, table: &str, column: &str, id: &str) -> Result<bool, Error> {
        // `table`/`column` are literals from this module, never caller data.
        let sql = format!("SELECT 1 FROM {table} WHERE {column} = ?1");
        let mut stmt = self.conn.prepare(&sql)?;
        Ok(stmt.exists(params![id])?)
    }

    fn insert_profile_with_id(
        &self,
        id: &str,
        display_name: &str,
        created_at: &str,
    ) -> Result<(), Error> {
        self.conn.execute(
            "INSERT INTO profiles(id, display_name, created_at) VALUES (?1,?2,?3)",
            params![id, display_name, created_at],
        )?;
        Ok(())
    }

    fn all_content_versions(&self) -> Result<Vec<ContentVersion>, Error> {
        let mut stmt = self.conn.prepare(
            "SELECT pack_id, content_id, content_version FROM content_versions ORDER BY pack_id, content_id",
        )?;
        let rows = stmt.query_map([], |r| {
            Ok(ContentVersion {
                pack_id: r.get(0)?,
                content_id: r.get(1)?,
                content_version: r.get(2)?,
            })
        })?;
        Ok(rows.collect::<Result<_, _>>()?)
    }

    fn corrections_for_profile(&self, profile_id: &str) -> Result<Vec<EvidenceCorrection>, Error> {
        let mut stmt = self.conn.prepare(
            "SELECT event_id, occurred_at, profile_id, references_json, reason
             FROM evidence_corrections WHERE profile_id = ?1 ORDER BY occurred_at, event_id",
        )?;
        let raw: Vec<(String, String, String, String, String)> = stmt
            .query_map(params![profile_id], |r| {
                Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?))
            })?
            .collect::<Result<_, _>>()?;
        raw.into_iter()
            .map(|(event_id, occurred_at, pid, refs_json, reason)| {
                let references: Vec<String> = serde_json::from_str(&refs_json)?;
                Ok(EvidenceCorrection {
                    event_id: lts_domain::EventId::new(event_id),
                    occurred_at,
                    profile_id: lts_domain::ProfileId::new(pid),
                    references: references
                        .into_iter()
                        .map(lts_domain::EventId::new)
                        .collect(),
                    reason,
                })
            })
            .collect()
    }

    fn insert_recording_with_id(&self, profile_id: &str, r: &Recording) -> Result<(), Error> {
        self.conn.execute(
            "INSERT INTO retained_recordings(id, profile_id, relative_path, recorded_at, duration_ms, purpose, consent_granted_at)
             VALUES (?1,?2,?3,?4,?5,?6,?7)",
            params![
                r.id,
                profile_id,
                r.relative_path,
                r.recorded_at,
                r.duration_ms,
                r.purpose,
                r.consent_granted_at
            ],
        )?;
        Ok(())
    }
}
