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
    ContentVersion, LearnerGoal, MasterySnapshot, PackInstallation, Profile, Recording,
    SchedulerRecord, Setting, Store,
};
use lts_domain::{EvidenceCorrection, EvidenceEvent};
use rusqlite::params;
use serde::{Deserialize, Serialize};

/// Bump when the bundle shape changes; import rejects unknown versions.
pub const EXPORT_FORMAT_VERSION: u32 = 1;

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
            recordings,
        })
    }

    /// Import a bundle; returns the id of the created profile.
    pub fn import_profile(
        &self,
        bundle: &ExportBundle,
        mode: &ImportMode,
    ) -> Result<String, ImportError> {
        if bundle.format_version != EXPORT_FORMAT_VERSION {
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
                self.delete_profile(&bundle.profile.id)?;
                bundle.profile.id.clone()
            }
        };

        self.insert_profile_with_id(
            &target_id,
            &bundle.profile.display_name,
            &bundle.profile.created_at,
        )?;

        for s in &bundle.settings {
            self.set_setting(&target_id, &s.key, &s.value)?;
        }
        for g in &bundle.goals {
            self.set_goal(&target_id, g)?;
        }
        for inst in &bundle.pack_installations {
            self.record_installation(inst)?;
        }
        for (pack_id, version) in &bundle.selected_packs {
            self.select_pack(&target_id, pack_id, version)?;
        }
        for cv in &bundle.content_versions {
            self.record_content_version(cv)?;
        }
        for e in &bundle.evidence {
            // append_evidence dedupes by event id; an import into a
            // fresh profile writes every event. The event's profile id
            // is remapped to the target: the bundle records provenance
            // with the source id, but the row must belong to the
            // importing profile (FK contract).
            let mut e = e.clone();
            e.profile_id = lts_domain::ProfileId::new(target_id.clone());
            self.append_evidence(&e)?;
        }
        for c in &bundle.corrections {
            let mut c = c.clone();
            c.profile_id = lts_domain::ProfileId::new(target_id.clone());
            self.append_correction(&c)?;
        }
        for m in &bundle.mastery_snapshots {
            self.record_mastery_snapshot(&target_id, m)?;
        }
        for sc in &bundle.scheduler_state {
            self.save_scheduler_state(&target_id, sc)?;
        }
        // Recordings are opt-in on both sides: only present in the
        // bundle if the exporter asked, only written if present.
        if let Some(recs) = &bundle.recordings {
            for r in recs {
                self.insert_recording_with_id(&target_id, r)?;
            }
        }
        Ok(target_id)
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
