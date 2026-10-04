//! SPEECH-007 feature-eligibility registry (docs/17 §Pronunciation feature
//! calibration, §Evidence artifact contract).
//!
//! A `CalibrationRecord` binds one automatic-feedback feature to the exact
//! provider/model/interpreter/pack versions, protocol/dataset/result artifacts,
//! frozen thresholds, and measured results it was validated on. Automatic
//! feedback is permitted ONLY when the installed combination matches a
//! Qualified record and the request sits inside its declared coverage
//! envelope; everything else stays guided or abstains. Unfilled thresholds can
//! never qualify (docs/17: unfilled limits keep automatic scoring disabled).
//!
//! Records live in the installed pack at `speech/calibration/<feature>-<revision>.yaml`.

use serde::Deserialize;
use std::path::Path;

#[derive(Debug, Clone, Deserialize, PartialEq)]
pub struct ComponentRef {
    pub id: String,
    pub version: String,
    /// Content hash of the model payload when applicable (docs/17 §97).
    #[serde(default)]
    pub sha256: Option<String>,
}

#[derive(Debug, Clone, Deserialize, PartialEq)]
pub struct ArtifactRef {
    /// Repository-relative path (protocol/dataset manifest/results summary).
    pub path: String,
    pub sha256: String,
}

/// Frozen release limits, declared in the protocol BEFORE held-out results
/// are looked at. `None` = unfilled => the feature can never qualify.
#[derive(Debug, Clone, Deserialize, Default, PartialEq)]
pub struct FeatureThresholds {
    /// Corrections issued against human-acceptable attempts.
    pub max_false_correction_rate: Option<f64>,
    /// Share of eligible attempts the feature may score (abstention abuse).
    pub min_scoring_coverage: Option<f64>,
    /// Inter-labeler agreement on the critical subset.
    pub min_label_agreement: Option<f64>,
}

/// Measured held-out results bound to the result artifact hash.
#[derive(Debug, Clone, Deserialize, PartialEq)]
pub struct FeatureMetrics {
    pub false_correction_rate: f64,
    pub scoring_coverage: f64,
    pub label_agreement: f64,
    pub n_speakers: u32,
    pub n_attempts: u32,
}

/// Declared useful coverage envelope; claims outside it are unsupported.
#[derive(Debug, Clone, Deserialize, PartialEq, Default)]
pub struct CoverageEnvelope {
    pub varieties: Vec<String>,
    pub contexts: Vec<String>,
    #[serde(default)]
    pub hardware_tiers: Vec<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CalibrationRecord {
    pub feature_id: String,
    pub revision: String,
    pub provider: ComponentRef,
    pub model: ComponentRef,
    pub interpreter: ComponentRef,
    pub pack: ComponentRef,
    /// Content ids the validation covers; a phrase-specific feature must
    /// declare its limited scope (docs/17 §23).
    pub target_ids: Vec<String>,
    pub reference_variety: String,
    pub protocol: ArtifactRef,
    pub dataset: ArtifactRef,
    pub results: ArtifactRef,
    pub thresholds: FeatureThresholds,
    pub measured: Option<FeatureMetrics>,
    pub envelope: CoverageEnvelope,
}

#[derive(Debug, Clone, PartialEq)]
pub enum CalibrationStatus {
    /// Thresholds frozen, metrics present, every metric inside its limit.
    Qualified,
    /// Missing thresholds/metrics or a measured limit breach.
    NotQualified(String),
}

impl CalibrationRecord {
    pub fn status(&self) -> CalibrationStatus {
        let t = &self.thresholds;
        let unfilled = [
            t.max_false_correction_rate.is_none(),
            t.min_scoring_coverage.is_none(),
            t.min_label_agreement.is_none(),
        ]
        .iter()
        .any(|x| *x);
        if unfilled {
            return CalibrationStatus::NotQualified("thresholds-unfilled".into());
        }
        let Some(m) = &self.measured else {
            return CalibrationStatus::NotQualified("no-held-out-metrics".into());
        };
        // Artifact hashes must be real to bind evidence.
        if self.protocol.sha256.is_empty()
            || self.dataset.sha256.is_empty()
            || self.results.sha256.is_empty()
        {
            return CalibrationStatus::NotQualified("unbound-artifact-hash".into());
        }
        if m.false_correction_rate > t.max_false_correction_rate.unwrap() {
            return CalibrationStatus::NotQualified("false-correction-limit".into());
        }
        if m.scoring_coverage < t.min_scoring_coverage.unwrap() {
            return CalibrationStatus::NotQualified("coverage-limit".into());
        }
        if m.label_agreement < t.min_label_agreement.unwrap() {
            return CalibrationStatus::NotQualified("label-agreement-limit".into());
        }
        CalibrationStatus::Qualified
    }
}

/// The combination actually installed at inference time.
#[derive(Debug, Clone)]
pub struct InstalledCombination {
    pub provider: ComponentRef,
    pub model: ComponentRef,
    pub interpreter: ComponentRef,
    pub pack: ComponentRef,
    pub variety: String,
    pub context: String,
}

#[derive(Debug, Clone, PartialEq)]
pub enum Eligibility {
    Automatic,
    Guided { reason: String },
}

/// Never carry trust forward on a name match alone: every version and model
/// hash must match the record, and the request must sit inside the envelope
/// (docs/17 §97).
pub fn eligibility_for(
    record: &CalibrationRecord,
    installed: &InstalledCombination,
) -> Eligibility {
    if record.status() != CalibrationStatus::Qualified {
        let CalibrationStatus::NotQualified(r) = record.status() else {
            unreachable!()
        };
        return Eligibility::Guided { reason: r };
    }
    for (want, have, what) in [
        (&record.provider, &installed.provider, "provider"),
        (&record.model, &installed.model, "model"),
        (&record.interpreter, &installed.interpreter, "interpreter"),
        (&record.pack, &installed.pack, "pack"),
    ] {
        if want.id != have.id || want.version != have.version {
            return Eligibility::Guided {
                reason: format!("{what}-version-drift"),
            };
        }
        if let Some(hash) = &want.sha256
            && have.sha256.as_deref() != Some(hash.as_str())
        {
            return Eligibility::Guided {
                reason: format!("{what}-hash-mismatch"),
            };
        }
    }
    if !record.envelope.varieties.contains(&installed.variety) {
        return Eligibility::Guided {
            reason: "variety-outside-envelope".into(),
        };
    }
    if !record.envelope.contexts.contains(&installed.context) {
        return Eligibility::Guided {
            reason: "context-outside-envelope".into(),
        };
    }
    Eligibility::Automatic
}

/// Load the pack's calibration records; unreadable/invalid files are skipped
/// (absence of evidence keeps features guided, never crashes the lesson).
pub fn load_records(pack_dir: &Path) -> Vec<CalibrationRecord> {
    let dir = pack_dir.join("speech").join("calibration");
    let Ok(entries) = std::fs::read_dir(&dir) else {
        return Vec::new();
    };
    let mut out = Vec::new();
    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) != Some("yaml") {
            continue;
        }
        if let Ok(text) = std::fs::read_to_string(&path)
            && let Ok(rec) = serde_yaml::from_str::<CalibrationRecord>(&text)
        {
            out.push(rec);
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    fn comp(id: &str, version: &str, sha: Option<&str>) -> ComponentRef {
        ComponentRef {
            id: id.into(),
            version: version.into(),
            sha256: sha.map(Into::into),
        }
    }

    fn record() -> CalibrationRecord {
        CalibrationRecord {
            feature_id: "ja.phon.long-vowel".into(),
            revision: "1".into(),
            provider: comp("sherpa-asr", "1.0", None),
            model: comp("kokoro-ja", "2.0", Some("abc")),
            interpreter: comp("vowel-length-interpreter", "0.1.0", None),
            pack: comp("org.openlanguage.ja-jp.reference", "0.1.0", None),
            target_ids: vec!["ja.word.oomusume".into()],
            reference_variety: "standard-japanese".into(),
            protocol: ArtifactRef {
                path: "benchmarks/speech/protocols/ja-JP/vowel-length-0.1.0.yaml".into(),
                sha256: "p".into(),
            },
            dataset: ArtifactRef {
                path: "benchmarks/speech/datasets/perm-001/manifest.yaml".into(),
                sha256: "d".into(),
            },
            results: ArtifactRef {
                path: "benchmarks/speech/results/run-1/summary.json".into(),
                sha256: "r".into(),
            },
            thresholds: FeatureThresholds {
                max_false_correction_rate: Some(0.05),
                min_scoring_coverage: Some(0.8),
                min_label_agreement: Some(0.85),
            },
            measured: Some(FeatureMetrics {
                false_correction_rate: 0.03,
                scoring_coverage: 0.85,
                label_agreement: 0.9,
                n_speakers: 30,
                n_attempts: 300,
            }),
            envelope: CoverageEnvelope {
                varieties: vec!["standard-japanese".into()],
                contexts: vec!["ordering".into()],
                hardware_tiers: vec![],
            },
        }
    }

    fn installed() -> InstalledCombination {
        let r = record();
        InstalledCombination {
            provider: r.provider.clone(),
            model: r.model.clone(),
            interpreter: r.interpreter.clone(),
            pack: r.pack.clone(),
            variety: "standard-japanese".into(),
            context: "ordering".into(),
        }
    }

    #[test]
    fn unfilled_thresholds_never_qualify() {
        let mut r = record();
        r.thresholds.max_false_correction_rate = None;
        assert_eq!(
            r.status(),
            CalibrationStatus::NotQualified("thresholds-unfilled".into())
        );
        assert_eq!(
            eligibility_for(&r, &installed()),
            Eligibility::Guided {
                reason: "thresholds-unfilled".into()
            }
        );
    }

    #[test]
    fn missing_metrics_never_qualify() {
        let mut r = record();
        r.measured = None;
        assert_eq!(
            r.status(),
            CalibrationStatus::NotQualified("no-held-out-metrics".into())
        );
    }

    #[test]
    fn measured_limit_breaches_block() {
        let mut r = record();
        r.measured.as_mut().unwrap().false_correction_rate = 0.2;
        assert_eq!(
            r.status(),
            CalibrationStatus::NotQualified("false-correction-limit".into())
        );
        let mut r = record();
        r.measured.as_mut().unwrap().scoring_coverage = 0.1;
        assert_eq!(
            r.status(),
            CalibrationStatus::NotQualified("coverage-limit".into())
        );
    }

    #[test]
    fn version_or_hash_drift_invalidates() {
        let mut i = installed();
        i.model.version = "2.1".into();
        assert_eq!(
            eligibility_for(&record(), &i),
            Eligibility::Guided {
                reason: "model-version-drift".into()
            }
        );
        let mut i = installed();
        i.model.sha256 = Some("different".into());
        assert_eq!(
            eligibility_for(&record(), &i),
            Eligibility::Guided {
                reason: "model-hash-mismatch".into()
            }
        );
    }

    #[test]
    fn outside_envelope_stays_guided() {
        let mut i = installed();
        i.variety = "kansai-japanese".into();
        assert_eq!(
            eligibility_for(&record(), &i),
            Eligibility::Guided {
                reason: "variety-outside-envelope".into()
            }
        );
        let mut i = installed();
        i.context = "news-debate".into();
        assert_eq!(
            eligibility_for(&record(), &i),
            Eligibility::Guided {
                reason: "context-outside-envelope".into()
            }
        );
    }

    #[test]
    fn exact_match_inside_envelope_qualifies_automatic() {
        assert_eq!(
            eligibility_for(&record(), &installed()),
            Eligibility::Automatic
        );
    }
}
