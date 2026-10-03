//! Curriculum graph vocabulary (docs/03 §1-2, §7 Layer C).
//!
//! The hard-prerequisite subgraph must be a DAG; other relation types may
//! cycle and are traversed by relation type. Prerequisite records are
//! versioned target/modality/state/strength records, never bare IDs.

use crate::ids::ContentId;
use crate::mastery::{MasteryDimension, MasteryState};
use serde::{Deserialize, Serialize};

/// Curriculum node types (docs/03 §1).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum NodeKind {
    CommunicativeGoal,
    GrammarConstruction,
    LexicalConcept,
    ListeningContrast,
    PronunciationFeature,
    OrthographicUnit,
    ReadingSkill,
    WritingSkill,
    PragmaticRegisterSkill,
    CultureContextNote,
    Strategy,
}

/// Edge relation types (docs/03 §1). Only `Prerequisite` must be acyclic.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum EdgeKind {
    Prerequisite,
    HelpfulBefore,
    ContrastsWith,
    Reinforces,
    TransfersTo,
    AssessedBy,
}

/// How strongly a prerequisite gates advancement (docs/03 §7 Layer C).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum PrerequisiteStrength {
    /// Must be satisfied before entry/advancement.
    Hard,
    /// Recommended but not blocking.
    Helpful,
}

/// A versioned prerequisite record: a bare goal ID must not imply every
/// modality is mastered. Each record names the dimension and required state.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct PrerequisiteRecord {
    pub target: ContentId,
    pub dimension: MasteryDimension,
    pub required_state: MasteryState,
    pub strength: PrerequisiteStrength,
}

/// A directed edge in the curriculum graph.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct CurriculumEdge {
    pub from: ContentId,
    pub to: ContentId,
    pub kind: EdgeKind,
}

impl CurriculumEdge {
    pub fn is_hard_gate(&self) -> bool {
        self.kind == EdgeKind::Prerequisite
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ids::ContentId;
    use crate::mastery::{MasteryDimension, MasteryState};

    #[test]
    fn prerequisite_record_is_scoped_by_dimension_and_state() {
        let rec = PrerequisiteRecord {
            target: ContentId::parse("ja.orth.hira.a").unwrap(),
            dimension: MasteryDimension::ComprehensionReading,
            required_state: MasteryState::Independent,
            strength: PrerequisiteStrength::Hard,
        };
        // Speaking mastery of the same target does not satisfy a reading-scoped
        // prerequisite: the record itself carries the dimension.
        let speaking = PrerequisiteRecord {
            dimension: MasteryDimension::ProductionSpeaking,
            ..rec.clone()
        };
        assert_ne!(rec, speaking);
    }

    #[test]
    fn only_prerequisite_edges_are_hard_gates() {
        let id_a = ContentId::parse("ja.lex.greeting.konnichiwa").unwrap();
        let id_b = ContentId::parse("ja.goal.onramp.respond-to-greeting").unwrap();
        let prereq = CurriculumEdge {
            from: id_a.clone(),
            to: id_b.clone(),
            kind: EdgeKind::Prerequisite,
        };
        let reinforce = CurriculumEdge {
            from: id_a,
            to: id_b,
            kind: EdgeKind::Reinforces,
        };
        assert!(prereq.is_hard_gate());
        assert!(!reinforce.is_hard_gate());
    }

    #[test]
    fn serde_kebab_case() {
        assert_eq!(
            serde_json::to_string(&EdgeKind::HelpfulBefore).unwrap(),
            "\"helpful-before\""
        );
        assert_eq!(
            serde_json::to_string(&NodeKind::PragmaticRegisterSkill).unwrap(),
            "\"pragmatic-register-skill\""
        );
    }
}
