//! ERR-SRS-LOOP-001: classification of a produced form against the
//! pymorphy-expected form.
//!
//! Pure and offline: the caller supplies the pack's lemmatizer sidecar
//! rows (`media/lemmas.jsonl`: norm-token surface key, pymorphy3 normal
//! form, grammeme string). The classifier never parses the language and
//! never claims mastery — it names the SHAPE of a production mistake
//! (case / aspect / stress / agreement / wrong-word) so the learner can
//! be offered a per-form review card. If the expected form is absent
//! from the sidecar the mismatch is honestly unclassified (`None`),
//! never guessed.

use serde::{Deserialize, Serialize};

/// The named mistake classes (card contract). `other` is the honest
/// fallback for a same-lemma form difference the grammeme diff cannot
/// name — it is recorded, never mapped onto a named class.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum FormErrorClass {
    Case,
    Aspect,
    Stress,
    Agreement,
    WrongWord,
    Other,
}

impl FormErrorClass {
    pub fn kebab(self) -> &'static str {
        match self {
            Self::Case => "case",
            Self::Aspect => "aspect",
            Self::Stress => "stress",
            Self::Agreement => "agreement",
            Self::WrongWord => "wrong-word",
            Self::Other => "other",
        }
    }
}

/// One `media/lemmas.jsonl` row as the classifier needs it.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LemmaForm<'a> {
    pub surface: &'a str,
    pub lemma: &'a str,
    pub tag: &'a str,
}

/// What the learner is explicitly OFFERED after a detected error: the
/// ledger row id this offer points at, the exact form to drill, and
/// the mistake shape. Acceptance is a separate, explicit act — nothing
/// here schedules anything by itself (never silent).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct FormErrorOffer {
    pub ledger_id: String,
    /// The correct form the pack expected — the form the drill replays.
    pub expected: String,
    /// What the learner produced.
    pub produced: String,
    pub lemma: String,
    pub error_class: FormErrorClass,
    pub context_sentence_id: String,
}

/// Same normalization rule as the pack build side and the desktop
/// `norm_token` (drop combining acute U+0301, lowercase): the lemmas
/// sidecar is keyed by this exact form.
pub fn norm_form(raw: &str) -> String {
    raw.chars()
        .filter(|c| *c != '\u{301}')
        .flat_map(|c| c.to_lowercase())
        .collect()
}

/// Grammemes of a sidecar tag string: ``,` and whitespace separate
/// grammemes ("NOUN,inan,masc sing,accs" -> 5 grammemes).
fn grammemes(tag: &str) -> Vec<&str> {
    tag.split([',', ' ']).filter(|g| !g.is_empty()).collect()
}

/// pymorphy3 case grammemes we treat as the case slot (incl. the
/// second-place variants packs emit).
const CASE_GRAMMEMES: &[&str] = &[
    "nomn", "gent", "datv", "accs", "ablt", "loct", "voct", "insr", "eprt", "loc2", "gen2", "dat2",
    "acc2", "adv1", "adv2", "grad",
];

fn subset<'a>(all: &'a [&'a str], slot: &[&str]) -> Vec<&'a str> {
    let mut s: Vec<&str> = all.iter().copied().filter(|g| slot.contains(g)).collect();
    s.sort_unstable();
    s
}

/// pymorphy3 agreement slots: number, gender, person.
const AGREE_GRAMMEMES: &[&str] = &[
    "sing", "plur", "masc", "femn", "neut", "1per", "2per", "3per",
];

/// Classify one production mismatch against the expected form using the
/// pack's lemma index. Returns (lemma of the expected form, class) —
/// `None` only when the expected form itself is not in the index (no
/// pymorphy data, no claim).
///
/// Priority order is deliberate: a stress-only difference is checked
/// first (surface equal modulo stress marks), then lemma identity
/// (wrong word), then the inflection slots (case, aspect, agreement).
pub fn classify_form_mismatch<'a>(
    expected: &str,
    produced: &str,
    index: &[LemmaForm<'a>],
) -> Option<(&'a str, FormErrorClass)> {
    let en = norm_form(expected);
    let pn = norm_form(produced);
    let find = |key: &str| index.iter().find(|row| norm_form(row.surface) == key);
    let expected_row = find(&en)?;
    let lemma = expected_row.lemma;
    if en == pn && expected != produced {
        // Identical modulo stress marks: a stress (or ё) mistake.
        return Some((lemma, FormErrorClass::Stress));
    }
    let Some(produced_row) = find(&pn) else {
        // The learner produced a form pymorphy's table does not know at
        // all: the honest bucket is a wrong word, not a named inflection
        // slip.
        return Some((lemma, FormErrorClass::WrongWord));
    };
    if produced_row.lemma != lemma {
        return Some((lemma, FormErrorClass::WrongWord));
    }
    let te = grammemes(expected_row.tag);
    let tp = grammemes(produced_row.tag);
    if subset(&te, CASE_GRAMMEMES) != subset(&tp, CASE_GRAMMEMES) {
        return Some((lemma, FormErrorClass::Case));
    }
    if subset(&te, &["perf", "imperf"]) != subset(&tp, &["perf", "imperf"]) {
        return Some((lemma, FormErrorClass::Aspect));
    }
    if subset(&te, AGREE_GRAMMEMES) != subset(&tp, AGREE_GRAMMEMES) {
        return Some((lemma, FormErrorClass::Agreement));
    }
    Some((lemma, FormErrorClass::Other))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn idx<'a>(rows: &'a [(&'a str, &'a str, &'a str)]) -> Vec<LemmaForm<'a>> {
        rows.iter()
            .map(|(s, l, t)| LemmaForm {
                surface: s,
                lemma: l,
                tag: t,
            })
            .collect()
    }

    // Fixture tags follow the pymorphy3 shape the RU pack's
    // media/lemmas.jsonl actually carries (lowercase grammemes, `,` and
    // space separated).
    const TABLE: &[(&str, &str, &str)] = &[
        ("книга", "книга", "NOUN,inan,fem sing,nomn"),
        ("книги", "книга", "NOUN,inan,fem sing,gent"),
        ("книгу", "книга", "NOUN,inan,fem sing,accs"),
        ("читать", "читать", "INF,tran,imperf"),
        ("прочитал", "читать", "PRTF,tran,perf,past,indc,masc,sing"),
        ("читал", "читать", "PRTF,tran,imperf,past,indc,masc,sing"),
        ("читала", "читать", "PRTF,tran,imperf,past,indc,femn,sing"),
        ("кофе", "кофе", "NOUN,inan,masc sing,gent"),
        ("мука", "мука", "NOUN,inan,fem sing,accs"),
        ("стол", "стол", "NOUN,anim,masc sing,nomn"),
        ("столы", "стол", "NOUN,anim,masc plur,nomn"),
    ];

    #[test]
    fn a_different_case_ending_is_classified_as_case() {
        let i = idx(TABLE);
        let (lemma, class) = classify_form_mismatch("книги", "книгу", &i).unwrap();
        assert_eq!(lemma, "книга");
        assert_eq!(class, FormErrorClass::Case);
    }

    #[test]
    fn a_perfective_substitution_is_classified_as_aspect() {
        let i = idx(TABLE);
        let (lemma, class) = classify_form_mismatch("читал", "прочитал", &i).unwrap();
        assert_eq!(lemma, "читать");
        assert_eq!(class, FormErrorClass::Aspect);
    }

    #[test]
    fn a_stress_only_difference_is_classified_as_stress() {
        let i = idx(TABLE);
        // мука́ (flour) vs мука (torment): identical letters, stress is
        // the whole mistake. The table keys carry the unstressed form,
        // so a stress-marked expected matches its bare key modulo U+0301.
        let (lemma, class) = classify_form_mismatch("мука\u{301}", "мука", &i).unwrap();
        assert_eq!(lemma, "мука");
        assert_eq!(class, FormErrorClass::Stress);
    }

    #[test]
    fn a_number_or_gender_slip_is_classified_as_agreement() {
        let i = idx(TABLE);
        let (lemma, class) = classify_form_mismatch("столы", "стол", &i).unwrap();
        assert_eq!(lemma, "стол");
        assert_eq!(class, FormErrorClass::Agreement);
        let (_, class) = classify_form_mismatch("читала", "читал", &i).unwrap();
        assert_eq!(class, FormErrorClass::Agreement);
    }

    #[test]
    fn a_different_known_lemma_is_a_wrong_word() {
        let i = idx(TABLE);
        let (lemma, class) = classify_form_mismatch("книга", "кофе", &i).unwrap();
        assert_eq!(lemma, "книга");
        assert_eq!(class, FormErrorClass::WrongWord);
    }

    #[test]
    fn an_unknown_produced_form_is_a_wrong_word_not_a_guess() {
        let i = idx(TABLE);
        let (lemma, class) = classify_form_mismatch("книга", "кнфга", &i).unwrap();
        assert_eq!(lemma, "книга");
        assert_eq!(class, FormErrorClass::WrongWord);
    }

    #[test]
    fn no_sidecar_row_for_the_expected_form_means_no_claim() {
        let i = idx(TABLE);
        assert!(classify_form_mismatch("квебек", "квебек", &i).is_none());
        assert!(classify_form_mismatch("квебек", "квекбек", &i).is_none());
    }

    #[test]
    fn same_lemma_same_slots_falls_back_to_other_not_a_named_class() {
        // A table shape the slots cannot name: same tags, different
        // surface. Honest `other`, never a fabricated case claim.
        let mut rows = idx(TABLE);
        rows.push(LemmaForm {
            surface: "дом",
            lemma: "дом",
            tag: "NOUN,inan,masc sing,nomn",
        });
        rows.push(LemmaForm {
            surface: "дома",
            lemma: "дом",
            tag: "NOUN,inan,masc sing,nomn",
        });
        let (lemma, class) = classify_form_mismatch("дом", "дома", &rows).unwrap();
        assert_eq!(lemma, "дом");
        assert_eq!(class, FormErrorClass::Other);
    }
}
