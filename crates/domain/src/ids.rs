//! Stable identifier primitives (docs/03 §2, docs/04).
//!
//! Content IDs never depend on display text or filesystem order. The grammar
//! matches the published schema pattern `^[a-z0-9]+(?:[._-][a-z0-9]+)*$`:
//! lowercase alphanumeric segments joined by `.`, `_`, or `-`. The first
//! segment is the language subtag of the owning pack locale; the second
//! segment is the content kind namespace.

use serde::{Deserialize, Serialize};
use std::fmt;
use std::str::FromStr;
use thiserror::Error;

#[derive(Debug, Error, PartialEq, Eq)]
pub enum IdError {
    #[error("empty identifier")]
    Empty,
    #[error("identifier {0:?} contains a character outside [a-z0-9._-]")]
    IllegalChar(String),
    #[error("identifier {0:?} has an empty or non-alphanumeric segment")]
    BadSegment(String),
    #[error("identifier {0:?} needs at least a locale and kind segment")]
    TooShort(String),
    #[error("unknown content kind {0:?} in identifier {1:?}")]
    UnknownKind(String, String),
    #[error("pack id {0:?} must match ^[a-z][a-z0-9.-]+$")]
    BadPackId(String),
    #[error("locale {0:?} must match basic BCP-47 tag syntax")]
    BadLocale(String),
}

fn is_segment_char(c: char) -> bool {
    c.is_ascii_lowercase() || c.is_ascii_digit()
}
/// Validate the shared content-ID grammar. Returns the segments.
fn split_segments(raw: &str) -> Result<Vec<&str>, IdError> {
    if raw.is_empty() {
        return Err(IdError::Empty);
    }
    if raw
        .chars()
        .any(|c| !(is_segment_char(c) || c == '.' || c == '_' || c == '-'))
    {
        return Err(IdError::IllegalChar(raw.to_owned()));
    }
    if raw.starts_with(['.', '_', '-']) || raw.ends_with(['.', '_', '-']) {
        return Err(IdError::BadSegment(raw.to_owned()));
    }
    let parts: Vec<&str> = raw.split(['.', '_', '-']).collect();
    if parts.iter().any(|s| s.is_empty()) {
        return Err(IdError::BadSegment(raw.to_owned()));
    }
    Ok(parts)
}

/// Namespaced content kinds used by curriculum and content files.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ContentKind {
    /// Communicative goal (Can-do capability).
    Goal,
    /// Grammar concept/construction.
    Grammar,
    /// Lexical entry.
    Lex,
    /// Fixed expression/phrase.
    Expr,
    /// Orthographic unit (script symbol, kanji, ...).
    Orth,
    /// Phonological/prosodic feature.
    Phon,
    /// Assessment definition.
    Assess,
    /// Delivery unit (grouping only; not the ordering truth).
    Unit,
    /// Scenario definition.
    Scenario,
    /// Activity template.
    Activity,
    /// Situation/context record.
    Situation,
    /// Register/pragmatic record.
    Register,
    /// Source/provenance record.
    Source,
    /// Asset reference.
    Asset,
    /// Strategy node (repair, clarification, turn-taking).
    Strategy,
    /// Reading skill node.
    Reading,
    /// Writing skill node.
    Writing,
    /// Listening contrast node.
    Contrast,
    /// Culture/context note.
    Culture,
}

impl ContentKind {
    fn from_segment(seg: &str) -> Option<Self> {
        Some(match seg {
            "goal" => Self::Goal,
            "grammar" => Self::Grammar,
            "lex" => Self::Lex,
            "expr" => Self::Expr,
            "orth" => Self::Orth,
            "phon" => Self::Phon,
            "assess" => Self::Assess,
            "unit" => Self::Unit,
            "scenario" => Self::Scenario,
            "activity" => Self::Activity,
            "situation" => Self::Situation,
            "register" => Self::Register,
            "source" => Self::Source,
            "asset" => Self::Asset,
            "strategy" => Self::Strategy,
            "reading" => Self::Reading,
            "writing" => Self::Writing,
            "contrast" => Self::Contrast,
            "culture" => Self::Culture,
            _ => return None,
        })
    }

    pub fn segment(self) -> &'static str {
        match self {
            Self::Goal => "goal",
            Self::Grammar => "grammar",
            Self::Lex => "lex",
            Self::Expr => "expr",
            Self::Orth => "orth",
            Self::Phon => "phon",
            Self::Assess => "assess",
            Self::Unit => "unit",
            Self::Scenario => "scenario",
            Self::Activity => "activity",
            Self::Situation => "situation",
            Self::Register => "register",
            Self::Source => "source",
            Self::Asset => "asset",
            Self::Strategy => "strategy",
            Self::Reading => "reading",
            Self::Writing => "writing",
            Self::Contrast => "contrast",
            Self::Culture => "culture",
        }
    }
}

/// A stable, locale-namespaced content identifier such as
/// `ja.goal.a1.introduce-self`. The model is identical for every language;
/// nothing in this crate treats any particular locale specially.
#[derive(Debug, Clone, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct ContentId {
    raw: String,
    kind: ContentKind,
}

impl ContentId {
    pub fn parse(raw: &str) -> Result<Self, IdError> {
        let segments = split_segments(raw)?;
        if segments.len() < 2 {
            return Err(IdError::TooShort(raw.to_owned()));
        }
        let kind = ContentKind::from_segment(segments[1])
            .ok_or_else(|| IdError::UnknownKind(segments[1].to_owned(), raw.to_owned()))?;
        Ok(Self {
            raw: raw.to_owned(),
            kind,
        })
    }

    /// Full identifier string.
    pub fn as_str(&self) -> &str {
        &self.raw
    }

    /// First segment: the language subtag of the owning pack.
    pub fn language_subtag(&self) -> &str {
        self.raw
            .split(['.', '_', '-'])
            .next()
            .expect("ContentId always has >= 1 segment")
    }

    pub fn kind(&self) -> ContentKind {
        self.kind
    }
}

impl FromStr for ContentId {
    type Err = IdError;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Self::parse(s)
    }
}

impl fmt::Display for ContentId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.raw)
    }
}

impl<'de> Deserialize<'de> for ContentId {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let s = String::deserialize(deserializer)?;
        Self::parse(&s).map_err(serde::de::Error::custom)
    }
}

impl Serialize for ContentId {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.raw)
    }
}

/// Reverse-domain pack identifier such as `org.openlanguage.ja-jp.reference`
/// (schema pattern `^[a-z][a-z0-9.-]+$`).
#[derive(Debug, Clone, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct PackId(String);

impl PackId {
    pub fn parse(raw: &str) -> Result<Self, IdError> {
        let ok = !raw.is_empty()
            && raw.starts_with(is_segment_char)
            && raw
                .chars()
                .all(|c| is_segment_char(c) || c == '.' || c == '-')
            && !raw.ends_with('.')
            && !raw.ends_with('-')
            && !raw.contains("..");
        if !ok {
            return Err(IdError::BadPackId(raw.to_owned()));
        }
        Ok(Self(raw.to_owned()))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl FromStr for PackId {
    type Err = IdError;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Self::parse(s)
    }
}

impl fmt::Display for PackId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.0)
    }
}

impl<'de> Deserialize<'de> for PackId {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let s = String::deserialize(deserializer)?;
        Self::parse(&s).map_err(serde::de::Error::custom)
    }
}

impl Serialize for PackId {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.0)
    }
}

/// Basic BCP-47 language tag (schema-level syntax check only; full registry
/// validation is a PACK-001 SDK responsibility per schemas/README).
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct LocaleTag(String);

impl<'de> Deserialize<'de> for LocaleTag {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let s = String::deserialize(deserializer)?;
        Self::parse(&s).map_err(serde::de::Error::custom)
    }
}

impl Serialize for LocaleTag {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.0)
    }
}

impl LocaleTag {
    /// Matches the published schema pattern
    /// `^(?:[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*|[xX](?:-[A-Za-z0-9]{1,8})+)$`.
    /// Full BCP-47 registry validation is a PACK-001 SDK concern.
    pub fn parse(raw: &str) -> Result<Self, IdError> {
        let segments: Vec<&str> = raw.split('-').collect();
        let valid = match segments.as_slice() {
            [] => false,
            [primary] => is_alpha_subtag(primary, 2, 8),
            [primary, rest @ ..]
                if primary.len() == 1 && primary.chars().all(|c| c.is_ascii_alphabetic()) =>
            {
                !rest.is_empty() && rest.iter().all(|s| is_alnum_subtag(s, 1, 8))
            }
            [primary, rest @ ..] => {
                is_alpha_subtag(primary, 2, 8) && rest.iter().all(|s| is_alnum_subtag(s, 1, 8))
            }
        };
        if !valid {
            return Err(IdError::BadLocale(raw.to_owned()));
        }
        Ok(Self(raw.to_owned()))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

fn is_alpha_subtag(s: &str, min: usize, max: usize) -> bool {
    (min..=max).contains(&s.len()) && s.chars().all(|c| c.is_ascii_alphabetic())
}

fn is_alnum_subtag(s: &str, min: usize, max: usize) -> bool {
    (min..=max).contains(&s.len()) && s.chars().all(|c| c.is_ascii_alphanumeric())
}

/// Opaque identifier for a local learner profile.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct ProfileId(String);

impl ProfileId {
    pub fn new(opaque: impl Into<String>) -> Self {
        Self(opaque.into())
    }
    pub fn as_str(&self) -> &str {
        &self.0
    }
}

/// Identifier for an appended evidence event.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct EventId(String);

impl EventId {
    pub fn new(opaque: impl Into<String>) -> Self {
        Self(opaque.into())
    }
    pub fn as_str(&self) -> &str {
        &self.0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_documented_examples() {
        for id in [
            "ja.goal.a1.introduce-self",
            "ja.grammar.copula.polite-desu",
            "ja.lex.person.watashi",
            "ja.orth.hira.a",
            "ja.phon.long-vowel",
        ] {
            let parsed = ContentId::parse(id).unwrap_or_else(|e| panic!("{id}: {e}"));
            assert_eq!(parsed.as_str(), id);
        }
        assert_eq!(
            ContentId::parse("ja.goal.a1.introduce-self")
                .unwrap()
                .kind(),
            ContentKind::Goal
        );
        assert_eq!(
            ContentId::parse("ja.grammar.copula.polite-desu")
                .unwrap()
                .kind(),
            ContentKind::Grammar
        );
    }

    #[test]
    fn model_is_locale_independent() {
        // Identical grammar and behavior for any language subtag.
        let a = ContentId::parse("ja.goal.a1.introduce-self").unwrap();
        let b = ContentId::parse("sw.goal.a1.introduce-self").unwrap();
        let c = ContentId::parse("ar.goal.a1.introduce-self").unwrap();
        assert_eq!(a.kind(), b.kind());
        assert_eq!(a.language_subtag(), "ja");
        assert_eq!(b.language_subtag(), "sw");
        assert_eq!(c.language_subtag(), "ar");
    }

    #[test]
    fn rejects_malformed_ids() {
        assert_eq!(ContentId::parse(""), Err(IdError::Empty));
        assert!(matches!(
            ContentId::parse("Ja.goal.x"),
            Err(IdError::IllegalChar(_))
        ));
        assert!(matches!(
            ContentId::parse("ja..goal"),
            Err(IdError::BadSegment(_))
        ));
        assert!(matches!(ContentId::parse("ja"), Err(IdError::TooShort(_))));
        assert!(matches!(
            ContentId::parse("ja.bogus.thing"),
            Err(IdError::UnknownKind(_, _))
        ));
        assert!(matches!(
            ContentId::parse("ja.goal..x"),
            Err(IdError::BadSegment(_))
        ));
    }

    #[test]
    fn pack_ids() {
        let id = PackId::parse("org.openlanguage.ja-jp.reference").unwrap();
        assert_eq!(id.as_str(), "org.openlanguage.ja-jp.reference");
        assert!(matches!(
            PackId::parse("Org.example"),
            Err(IdError::BadPackId(_))
        ));
        assert!(matches!(
            PackId::parse("org.example..pack"),
            Err(IdError::BadPackId(_))
        ));
    }

    #[test]
    fn locale_tags() {
        assert!(LocaleTag::parse("ja").is_ok());
        assert!(LocaleTag::parse("ja-JP").is_ok());
        assert!(LocaleTag::parse("pt-BR").is_ok());
        assert!(LocaleTag::parse("de-DE-1901").is_ok());
        assert!(LocaleTag::parse("x-priv").is_ok());
        assert!(matches!(LocaleTag::parse(""), Err(IdError::BadLocale(_))));
        assert!(matches!(LocaleTag::parse("33"), Err(IdError::BadLocale(_))));
    }

    #[test]
    fn serde_roundtrip_kebab_string() {
        let id = ContentId::parse("ja.goal.a1.introduce-self").unwrap();
        let json = serde_json::to_string(&id).unwrap();
        assert_eq!(json, "\"ja.goal.a1.introduce-self\"");
        let back: ContentId = serde_json::from_str(&json).unwrap();
        assert_eq!(back, id);
        // Deserialization rejects invalid ids.
        assert!(serde_json::from_str::<ContentId>("\"Ja.Goal\"").is_err());
    }
}
