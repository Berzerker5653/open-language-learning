//! Pack-data → typed runtime → render specs (ACT-001 acceptance 1).

use crate::support::SupportAction;
use lts_domain::MasteryDimension;
use lts_langpack::Pack;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ActivityError {
    #[error(
        "unsupported activity type '{0}'; pack types must map to \
         encounter/comprehension/retrieval/explanation"
    )]
    UnsupportedType(String),
    #[error("unknown activity '{0}' in this pack")]
    UnknownActivity(String),
    #[error("activity '{activity}' references unknown scenario '{scenario}'")]
    UnknownScenario { activity: String, scenario: String },
    #[error("invalid pack data in {file}: {source}")]
    Invalid {
        file: String,
        #[source]
        source: serde_json::Error,
    },
}

/// The four renderable activity families.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ActivityKind {
    Encounter,
    Comprehension,
    Retrieval,
    Explanation,
}

/// Pack modality as declared in unit activity data (schemas/v0.2).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum PackModality {
    Listening,
    Speaking,
    Reading,
    Writing,
    Interaction,
}

/// Documented mapping from free-form pack activity `type` strings to
/// the four runtime families. Unknown types are rejected at load time
/// so a pack can never silently render an unhandled activity.
pub fn classify_type(pack_type: &str) -> Result<ActivityKind, ActivityError> {
    const ENCOUNTER: &[&str] = &[
        "encounter",
        "encounter-media",
        "encounter-listen",
        "encounter-read",
        "introduction",
    ];
    const COMPREHENSION: &[&str] = &[
        "comprehension",
        "comprehension-check",
        "read-and-match",
        "listen-and-choose",
        "match",
    ];
    const RETRIEVAL: &[&str] = &[
        "retrieval",
        "recall",
        "recall-choice",
        "fill-blank",
        "produce",
        "scenario",
    ];
    const EXPLANATION: &[&str] = &["explanation", "explain-why", "grammar-explain"];
    for (kind, names) in [
        (ActivityKind::Encounter, ENCOUNTER),
        (ActivityKind::Comprehension, COMPREHENSION),
        (ActivityKind::Retrieval, RETRIEVAL),
        (ActivityKind::Explanation, EXPLANATION),
    ] {
        if names.contains(&pack_type) {
            return Ok(kind);
        }
    }
    Err(ActivityError::UnsupportedType(pack_type.to_string()))
}

/// Which mastery dimension an attempt actually exercises. Conservative
/// default mapping; rubrics may override per construct (docs/03 §5).
pub fn dimension_for(kind: ActivityKind, modality: PackModality) -> MasteryDimension {
    match (kind, modality) {
        (ActivityKind::Explanation, _) => MasteryDimension::GrammarControlled,
        (ActivityKind::Retrieval, PackModality::Reading) => MasteryDimension::RecallMeaning,
        (_, PackModality::Listening) => MasteryDimension::ComprehensionListening,
        (_, PackModality::Reading) => MasteryDimension::ComprehensionReading,
        (_, PackModality::Writing) => MasteryDimension::ProductionWriting,
        (_, PackModality::Speaking) => MasteryDimension::ProductionSpeaking,
        (_, PackModality::Interaction) => MasteryDimension::Interaction,
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct PackActivity {
    pub id: String,
    #[serde(rename = "type")]
    pub type_: String,
    pub modality: PackModality,
    pub support_level: u8,
    #[serde(default)]
    pub scenario_id: Option<String>,
    #[serde(default)]
    pub content_refs: Vec<String>,
    #[serde(default)]
    pub concept_refs: Vec<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct PackUnit {
    pub id: String,
    pub goal_id: String,
    pub title: String,
    #[serde(default)]
    pub summary: Option<String>,
    #[serde(default)]
    pub estimated_minutes: Option<u32>,
    pub activities: Vec<PackActivity>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScenarioNode {
    pub id: String,
    pub prompt: String,
    #[serde(default)]
    pub expected_actions: Vec<String>,
    #[serde(default)]
    pub next: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LadderStep {
    pub support_level: u8,
    pub description: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct PackScenario {
    pub id: String,
    pub goal_id: String,
    pub title: String,
    #[serde(default)]
    pub situation: Option<String>,
    #[serde(default)]
    pub register: Option<String>,
    pub nodes: Vec<ScenarioNode>,
    pub support_ladder: Vec<LadderStep>,
}

#[derive(Debug, Clone, Deserialize)]
struct RawForm {
    text: String,
    #[serde(default)]
    script: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
struct RawReading {
    text: String,
    #[serde(default)]
    script: Option<String>,
    #[serde(default)]
    transliteration_system: Option<String>,
}

/// Minimal lexicon card resolved for prompts.
#[derive(Debug, Clone, Serialize)]
pub struct ContentCard {
    pub id: String,
    pub forms: Vec<FormCard>,
    pub readings: Vec<ReadingCard>,
    pub glosses: BTreeMap<String, Vec<String>>,
}

#[derive(Debug, Clone, Serialize)]
pub struct FormCard {
    pub text: String,
    pub script: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ReadingCard {
    pub text: String,
    pub script: Option<String>,
    pub transliteration_system: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ConceptNote {
    pub id: String,
    pub name: String,
    pub definition: String,
}

/// Everything the UI needs to render one activity; fully derived from
/// pack data.
#[derive(Debug, Clone, Serialize)]
pub struct RenderedActivity {
    pub pack_id: String,
    pub pack_version: String,
    pub unit_id: String,
    pub goal_id: String,
    pub activity_id: String,
    pub pack_type: String,
    pub kind: ActivityKind,
    pub modality: PackModality,
    pub dimension: MasteryDimension,
    /// Support level declared by the pack for the task itself.
    pub declared_support_level: u8,
    pub prompt: RenderedPrompt,
    pub scenario: Option<RenderedScenario>,
    /// Default support actions the learner may take (docs/03 §5).
    pub support_options: Vec<SupportOption>,
}

#[derive(Debug, Clone, Serialize)]
pub struct RenderedPrompt {
    pub content: Vec<ContentCard>,
    pub concepts: Vec<ConceptNote>,
}

#[derive(Debug, Clone, Serialize)]
pub struct RenderedScenario {
    pub id: String,
    pub title: String,
    pub situation: Option<String>,
    pub register: Option<String>,
    pub nodes: Vec<ScenarioNode>,
    /// Pack-declared ladder; the UI shows these instead of defaults
    /// when present.
    pub support_ladder: Vec<LadderStep>,
}

#[derive(Debug, Clone, Serialize)]
pub struct SupportOption {
    pub action: &'static str,
    pub default_level: u8,
    pub description: &'static str,
}

/// Typed view over one loaded pack.
pub struct ActivityRuntime {
    pack_id: String,
    pack_version: String,
    units: BTreeMap<String, PackUnit>,
    scenarios: BTreeMap<String, PackScenario>,
    lexicon: BTreeMap<String, ContentCard>,
    concepts: BTreeMap<String, ConceptNote>,
    /// activity id -> unit id
    activity_index: BTreeMap<String, String>,
}

fn from_value<T: for<'de> Deserialize<'de>>(
    inst: &lts_langpack::Instance,
) -> Result<T, ActivityError> {
    serde_json::from_value(inst.value.clone()).map_err(|e| ActivityError::Invalid {
        file: inst.file.clone(),
        source: e,
    })
}

impl ActivityRuntime {
    /// Load units/scenarios/lexicon/concepts from a validated pack.
    /// Fails on any activity type outside the four families.
    pub fn from_pack(pack: &Pack) -> Result<Self, ActivityError> {
        let manifest = pack
            .instances()
            .iter()
            .find(|i| i.schema == "language-pack-manifest")
            .expect("validated packs always carry a manifest");
        let pack_id = manifest.value["pack_id"]
            .as_str()
            .unwrap_or("unknown")
            .to_string();
        let pack_version = manifest.value["version"]
            .as_str()
            .unwrap_or("0")
            .to_string();

        let mut units = BTreeMap::new();
        let mut scenarios = BTreeMap::new();
        let mut lexicon = BTreeMap::new();
        let mut concepts = BTreeMap::new();
        let mut activity_index = BTreeMap::new();

        for inst in pack.instances() {
            match inst.schema {
                "unit" => {
                    let unit: PackUnit = from_value(inst)?;
                    for act in &unit.activities {
                        classify_type(&act.type_)?;
                        activity_index.insert(act.id.clone(), unit.id.clone());
                    }
                    units.insert(unit.id.clone(), unit);
                }
                "scenario" => {
                    let sc: PackScenario = from_value(inst)?;
                    scenarios.insert(sc.id.clone(), sc);
                }
                "lexicon-entry" => {
                    #[derive(Deserialize)]
                    struct Raw {
                        id: String,
                        forms: Vec<RawForm>,
                        #[serde(default)]
                        readings: Vec<RawReading>,
                        glosses: BTreeMap<String, Vec<String>>,
                    }
                    let raw: Raw = from_value(inst)?;
                    lexicon.insert(
                        raw.id.clone(),
                        ContentCard {
                            id: raw.id,
                            forms: raw
                                .forms
                                .into_iter()
                                .map(|f| FormCard {
                                    text: f.text,
                                    script: f.script,
                                })
                                .collect(),
                            readings: raw
                                .readings
                                .into_iter()
                                .map(|r| ReadingCard {
                                    text: r.text,
                                    script: r.script,
                                    transliteration_system: r.transliteration_system,
                                })
                                .collect(),
                            glosses: raw.glosses,
                        },
                    );
                }
                "concept" => {
                    #[derive(Deserialize)]
                    struct Raw {
                        id: String,
                        name: String,
                        #[serde(default)]
                        definition: Option<String>,
                    }
                    let raw: Raw = from_value(inst)?;
                    concepts.insert(
                        raw.id.clone(),
                        ConceptNote {
                            id: raw.id,
                            name: raw.name,
                            definition: raw.definition.unwrap_or_default(),
                        },
                    );
                }
                _ => {}
            }
        }

        Ok(Self {
            pack_id,
            pack_version,
            units,
            scenarios,
            lexicon,
            concepts,
            activity_index,
        })
    }

    pub fn units(&self) -> impl Iterator<Item = &PackUnit> {
        self.units.values()
    }

    pub fn activities(&self) -> impl Iterator<Item = (&str, &PackActivity)> {
        self.units
            .values()
            .flat_map(|u| u.activities.iter().map(move |a| (a.id.as_str(), a)))
    }

    /// Render one activity into a UI-ready spec (acceptance: the four
    /// kinds render from pack data).
    pub fn render(&self, activity_id: &str) -> Result<RenderedActivity, ActivityError> {
        let unit_id = self
            .activity_index
            .get(activity_id)
            .ok_or_else(|| ActivityError::UnknownActivity(activity_id.to_string()))?;
        let unit = &self.units[unit_id];
        let act = unit
            .activities
            .iter()
            .find(|a| a.id == activity_id)
            .expect("indexed");
        let kind = classify_type(&act.type_)?;
        let scenario = act
            .scenario_id
            .as_ref()
            .map(|sid| {
                self.scenarios
                    .get(sid)
                    .cloned()
                    .ok_or(ActivityError::UnknownScenario {
                        activity: activity_id.to_string(),
                        scenario: sid.clone(),
                    })
            })
            .transpose()?;

        let content: Vec<ContentCard> = act
            .content_refs
            .iter()
            .filter_map(|id| self.lexicon.get(id).cloned())
            .collect();
        let concept_notes: Vec<ConceptNote> = act
            .concept_refs
            .iter()
            .filter_map(|id| self.concepts.get(id).cloned())
            .collect();

        Ok(RenderedActivity {
            pack_id: self.pack_id.clone(),
            pack_version: self.pack_version.clone(),
            unit_id: unit.id.clone(),
            goal_id: unit.goal_id.clone(),
            activity_id: activity_id.to_string(),
            pack_type: act.type_.clone(),
            kind,
            modality: act.modality,
            dimension: dimension_for(kind, act.modality),
            declared_support_level: act.support_level,
            prompt: RenderedPrompt {
                content,
                concepts: concept_notes,
            },
            scenario: scenario.map(|s| RenderedScenario {
                id: s.id,
                title: s.title,
                situation: s.situation,
                register: s.register,
                nodes: s.nodes,
                support_ladder: s.support_ladder,
            }),
            support_options: SupportAction::default_ladder()
                .into_iter()
                .map(|(a, level, description)| SupportOption {
                    action: a.label(),
                    default_level: level,
                    description,
                })
                .collect(),
        })
    }
}
