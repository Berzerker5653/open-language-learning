//! Adaptive kana/furigana/romaji support (READ-001,
//! docs/assessment/JA_ORTHOGRAPHY_POLICY.yaml, docs/06, docs/11).
//!
//! Invariants enforced here:
//! - Canonical text is always the Japanese-script form; romanization is
//!   an auxiliary field and never replaces it (`canonical_form_rule`,
//!   `fade_is_not_removal`).
//! - Furigana/romaji visibility adapts to the learner's per-item
//!   reading mastery state and explicit user settings (`adaptive`,
//!   `auto_rules`, `user_modes`).
//! - On-demand reveals are always available (`always_on_demand`,
//!   `reveal_always_available`) and are recorded as support actions
//!   (`reveal_counts_as: support`), so a reading attempt made with
//!   supplied readings is honest evidence, never unsupported decoding.
//! - Kana-only items never get furigana (`furigana.never_on`).

use crate::support::SupportAction;
use lts_domain::MasteryState;
use serde::{Deserialize, Serialize};

/// Script classification by Unicode block (docs/06 §Orthography).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ScriptKind {
    Hiragana,
    Katakana,
    Kanji,
    Latin,
    Other,
}

pub fn script_of(c: char) -> ScriptKind {
    let cp = c as u32;
    if (0x3041..=0x309F).contains(&cp) {
        ScriptKind::Hiragana
    } else if (0x30A0..=0x30FF).contains(&cp) {
        // Katakana + prolonged sound mark.
        ScriptKind::Katakana
    } else if (0x4E00..=0x9FFF).contains(&cp) || (0x3400..=0x4DBF).contains(&cp) {
        ScriptKind::Kanji
    } else if c.is_ascii_alphabetic() {
        ScriptKind::Latin
    } else {
        ScriptKind::Other
    }
}

/// True when every cased character is kana (hiragana/katakana-only
/// item; punctuation/spaces ignored).
pub fn is_kana_only(text: &str) -> bool {
    let letters = text
        .chars()
        .filter(|c| script_of(*c) != ScriptKind::Other)
        .collect::<Vec<_>>();
    !letters.is_empty()
        && letters
            .iter()
            .all(|c| matches!(script_of(*c), ScriptKind::Hiragana | ScriptKind::Katakana))
}

/// User-level romaji preference (JA_ORTHOGRAPHY_POLICY `user_modes`).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "kebab-case")]
pub enum RomajiUserMode {
    /// Fade per auto rules; reveal always available per item.
    #[default]
    Auto,
    /// Learner keeps romaji visible everywhere (their choice, not a
    /// failure state; `fade_is_not_removal`).
    Always,
    /// Learner opted out; per-item reveal still available.
    Off,
}

/// Reader display settings (persisted via profile settings).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
pub struct ReaderSettings {
    pub romaji_mode: RomajiUserMode,
    /// Explicit per-render furigana override (on-demand reveal).
    pub furigana_forced: Option<bool>,
    /// Explicit per-render romaji override (on-demand reveal).
    pub romaji_forced: Option<bool>,
    /// Kana literacy established (drives kana-item romaji fade).
    pub kana_literacy_established: bool,
}

/// A readable item as stored in a pack: canonical Japanese-script text
/// plus auxiliary reading/romanization. Canonical is REQUIRED; romaji
/// is never the stored linguistic form.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ReadingItem {
    pub item_id: String,
    /// Canonical form; must contain Japanese script.
    pub text: String,
    /// Kana reading (furigana source), canonical kana.
    #[serde(default)]
    pub reading: Option<String>,
    /// Auxiliary romanization only.
    #[serde(default)]
    pub romaji: Option<String>,
}

/// One rendered display decision.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ReadingDisplay {
    /// Always the canonical Japanese-script text.
    pub canonical: String,
    /// Furigana (kana reading) to render, if visible.
    pub furigana: Option<String>,
    /// Romaji to render, if visible. Auxiliary only.
    pub romaji: Option<String>,
    /// Support actions to attach to any reading attempt made with this
    /// display (empty when nothing was revealed against the auto rule).
    pub support_reveals: Vec<SupportAction>,
    /// True when the item's reading state hides scaffolds automatically.
    pub faded_by_mastery: bool,
}

/// Policy constant mirrored from JA_ORTHOGRAPHY_POLICY.yaml
/// (`hide_at_state: supported`); the policy file remains the source of
/// truth and the contract test asserts they agree.
pub const HIDE_AT_STATE: MasteryState = MasteryState::Supported;

/// Decide what a learner sees for one item given their per-item
/// reading mastery state (`None` = never observed) and settings.
pub fn render_reading_display(
    item: &ReadingItem,
    reading_state: Option<MasteryState>,
    settings: &ReaderSettings,
) -> ReadingDisplay {
    assert!(
        item.text.chars().any(|c| matches!(
            script_of(c),
            ScriptKind::Hiragana | ScriptKind::Katakana | ScriptKind::Kanji
        )),
        "canonical reading text must be Japanese script (canonical_form_rule)"
    );

    let kana_item = is_kana_only(&item.text);
    let state_at_or_above_hide = reading_state.is_some_and(|s| s >= HIDE_AT_STATE);
    let mut reveals = Vec::new();

    // Furigana: never on kana-only items; adaptive on kanji items.
    let furigana = if kana_item {
        None
    } else {
        let auto_show = !state_at_or_above_hide && item.reading.is_some();
        match settings.furigana_forced {
            Some(true) if item.reading.is_some() => {
                if !auto_show {
                    reveals.push(SupportAction::SuppliedReading);
                }
                item.reading.clone()
            }
            Some(false) => None,
            _ if auto_show => item.reading.clone(),
            _ => None,
        }
    };

    // Romaji: user mode + auto rules; reveal always available.
    let romaji_auto = match settings.romaji_mode {
        RomajiUserMode::Off => false,
        RomajiUserMode::Always => true,
        RomajiUserMode::Auto => {
            if kana_item {
                // Hide kana romaji once kana literacy is established;
                // keep it as on-ramp support before that.
                !settings.kana_literacy_established
            } else {
                // keep-romaji-when item-reading-state-below: supported
                !state_at_or_above_hide
            }
        }
    };
    let romaji = if item.romaji.is_none() {
        None
    } else {
        match settings.romaji_forced {
            Some(true) => {
                if !romaji_auto {
                    // Reveal against the auto-fade rule counts as support.
                    reveals.push(SupportAction::RomajiReveal);
                }
                item.romaji.clone()
            }
            Some(false) => None,
            _ if romaji_auto => item.romaji.clone(),
            _ => None,
        }
    };

    ReadingDisplay {
        canonical: item.text.clone(),
        furigana,
        romaji,
        support_reveals: reveals,
        faded_by_mastery: state_at_or_above_hide,
    }
}
