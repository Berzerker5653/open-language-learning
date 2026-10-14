//! Japanese typing/composition activities (WRITE-001, docs/06).
//!
//! Invariants enforced here:
//! - The production surface is keyboard text entered through the
//!   platform IME. Handwriting, stroke capture, or any other input
//!   modality is deliberately NOT modeled: `InputSurface` has exactly
//!   one variant, so no activity can require handwriting (WRITE-001
//!   acceptance 1).
//! - Production-writing evidence is dimension-distinct from
//!   recognition evidence: attempts route through
//!   `dimension_for(Retrieval, Writing) = ProductionWriting`, and this
//!   module never emits reading evidence (WRITE-001 acceptance 2,
//!   docs/03 §2).
//! - Reading/romaji hints are scaffolds: taking one records a support
//!   action, so a hinted success is never independent (docs/03 §5).

use crate::support::SupportAction;
use serde::{Deserialize, Serialize};

/// The only supported production input surface: free text via the
/// platform IME (e.g. Anthy/Skk/Kkccd on Linux, MS-IME, Kotoeri).
/// Handwriting is not required anywhere and cannot be requested by
/// any pack (docs/06 §Input: "typing first").
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum InputSurface {
    Keyboard,
}

/// A production-writing target as defined by a pack.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct WritingTask {
    pub item_id: String,
    /// Canonical expected Japanese-script answer.
    pub answer: String,
    /// Orthographically accepted alternative spellings (okurigana or
    /// kana/kanji variants). Never romanization: roman input is what
    /// the IME consumes, not an acceptable answer form.
    #[serde(default)]
    pub accepted: Vec<String>,
    /// Prompt shown to the learner (meaning gloss or situation).
    pub prompt_text: String,
    /// Kana reading of the answer, available as a scaffold.
    #[serde(default)]
    pub answer_reading: Option<String>,
    /// Auxiliary romanization, available as a scaffold (the IME
    /// typing source; showing it is support, not the answer).
    #[serde(default)]
    pub answer_romaji: Option<String>,
}

/// Which scaffold the learner requested before typing.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum WritingHint {
    #[default]
    None,
    Reading,
    Romaji,
}

/// A rendered writing prompt. `input_surface` is always Keyboard;
/// there is no stroke/handwriting field to fill (acceptance 1).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct WritingPrompt {
    pub item_id: String,
    pub prompt_text: String,
    pub input_surface: InputSurface,
    pub reading_hint: Option<String>,
    pub romaji_hint: Option<String>,
    /// Support actions to attach to the attempt when these scaffolds
    /// were shown.
    pub support_reveals: Vec<SupportAction>,
}

/// Render one writing prompt. Hints appear only on explicit request
/// (the ladder), and each reveal is recorded as support.
pub fn render_writing_prompt(task: &WritingTask, hint: WritingHint) -> WritingPrompt {
    let mut reveals = Vec::new();
    let reading_hint = match hint {
        WritingHint::Reading => {
            if task.answer_reading.is_some() {
                reveals.push(SupportAction::SuppliedReading);
            }
            task.answer_reading.clone()
        }
        _ => None,
    };
    let romaji_hint = match hint {
        WritingHint::Romaji => {
            if task.answer_romaji.is_some() {
                reveals.push(SupportAction::RomajiReveal);
            }
            task.answer_romaji.clone()
        }
        _ => None,
    };
    WritingPrompt {
        item_id: task.item_id.clone(),
        prompt_text: task.prompt_text.clone(),
        input_surface: InputSurface::Keyboard,
        reading_hint,
        romaji_hint,
        support_reveals: reveals,
    }
}

/// Compare learner-typed text against the expected answer. Whitespace
/// is ignored (IME candidates sometimes insert it); no other
/// normalization is applied — okurigana and small kana are
/// meaning-bearing and must be typed correctly.
pub fn normalize_typed(input: &str) -> String {
    input.chars().filter(|c| !c.is_whitespace()).collect()
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct WritingGrade {
    pub correct: bool,
    /// True when an accepted variant (not the canonical form) matched.
    pub matched_variant: bool,
    /// The canonical form this task asked for (review finding I03). It travels
    /// with the verdict, never with the task: `writing_task` ships no expected
    /// string (K-12), while the practice hub promises that a miss shows the
    /// form it expected.
    pub expected: String,
}

pub fn grade_writing(input: &str, task: &WritingTask) -> WritingGrade {
    let typed = normalize_typed(input);
    if typed.is_empty() {
        return WritingGrade {
            correct: false,
            matched_variant: false,
            expected: task.answer.clone(),
        };
    }
    if typed == normalize_typed(&task.answer) {
        return WritingGrade {
            correct: true,
            matched_variant: false,
            expected: task.answer.clone(),
        };
    }
    let matched = task.accepted.iter().any(|a| typed == normalize_typed(a));
    WritingGrade {
        correct: matched,
        matched_variant: matched,
        expected: task.answer.clone(),
    }
}
