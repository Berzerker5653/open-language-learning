//! ERR-SRS-LOOP-001: the per-profile error ledger and accepted
//! per-form review cards. Device-local like everything else (docs/08).
//!
//! The ledger is an *observation log*: one row per detected production
//! error (dictation, speaking check, or composition mismatch against the
//! pack's pymorphy-expected form). It never claims mastery and never
//! touches evidence_events — recurrence counts feed personalization as
//! an input signal only (docs/18 no-calibration-claims rule).
//!
//! A review card exists ONLY after the learner accepted an offer
//! (acceptance: never silently created). Its schedule lives in the
//! ordinary `scheduler_state` table under the `+error` tag partition,
//! exactly like the `+mined` partition (review finding R02): the
//! algorithm is the existing SRS, the tag keeps the partition honest.

use crate::Store;
use crate::error::Error;
use rusqlite::{OptionalExtension, params};
use serde::{Deserialize, Serialize};

/// One observed production error. `surface` is the correct form the
/// pack expected (the form the future drill will teach); `produced` is
/// what the learner actually said or typed; `error_class` is the
/// classifier's kebab-case verdict (case / aspect / stress / agreement
/// / wrong-word / other).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ErrorLedgerEntry {
    pub id: String,
    pub pack_id: String,
    pub surface: String,
    pub produced: String,
    pub lemma: String,
    pub error_class: String,
    pub context_sentence_id: String,
    pub created_at: String,
}

/// Input for `record_error`; keeps the API under the argument-count lint.
#[derive(Debug, Clone)]
pub struct NewErrorLedger<'a> {
    pub id: &'a str,
    pub pack_id: &'a str,
    pub surface: &'a str,
    pub produced: &'a str,
    pub lemma: &'a str,
    pub error_class: &'a str,
    pub context_sentence_id: &'a str,
    pub created_at: &'a str,
}

/// An accepted per-form review card. The card carries everything the
/// drill needs to replay the exact form in its context sentence without
/// re-reading the classifier: surface, lemma, class, and context id.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ErrorReviewCard {
    pub id: String,
    pub ledger_id: String,
    pub pack_id: String,
    pub surface: String,
    pub lemma: String,
    pub error_class: String,
    pub context_sentence_id: String,
    pub created_at: String,
}

/// Input for `add_error_review_card`.
#[derive(Debug, Clone)]
pub struct NewErrorReviewCard<'a> {
    pub id: &'a str,
    pub ledger_id: &'a str,
    pub pack_id: &'a str,
    pub surface: &'a str,
    pub lemma: &'a str,
    pub error_class: &'a str,
    pub context_sentence_id: &'a str,
    pub created_at: &'a str,
}

/// Result of `add_error_review_card`: the id of the card that survives
/// and whether this call created it. A repeat accept keeps the ORIGINAL
/// card (its scheduler_state row anchors to that id), so accepting an
/// old offer twice can never reset the learner's SRS history — the
/// repeat-mine rule from `mined.rs`.
#[derive(Debug, Clone, PartialEq)]
pub struct AddErrorCardOutcome {
    pub id: String,
    pub was_new: bool,
}

impl Store {
    /// Append one observed error. The log never dedupes: recurrence is
    /// the point, so the same form failing twice is two observations.
    pub fn record_error(&self, profile_id: &str, e: NewErrorLedger<'_>) -> Result<(), Error> {
        self.conn.execute(
            "INSERT INTO error_ledger(id, profile_id, pack_id, surface, produced, lemma, error_class, context_sentence_id, created_at)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)",
            params![
                e.id,
                profile_id,
                e.pack_id,
                e.surface,
                e.produced,
                e.lemma,
                e.error_class,
                e.context_sentence_id,
                e.created_at
            ],
        )?;
        Ok(())
    }

    /// The whole ledger for a profile, oldest first (export/view).
    pub fn error_ledger(&self, profile_id: &str) -> Result<Vec<ErrorLedgerEntry>, Error> {
        let mut stmt = self.conn.prepare(
            "SELECT id, pack_id, surface, produced, lemma, error_class, context_sentence_id, created_at
             FROM error_ledger WHERE profile_id = ?1 ORDER BY created_at, id",
        )?;
        let rows = stmt.query_map(params![profile_id], |r| {
            Ok(ErrorLedgerEntry {
                id: r.get(0)?,
                pack_id: r.get(1)?,
                surface: r.get(2)?,
                produced: r.get(3)?,
                lemma: r.get(4)?,
                error_class: r.get(5)?,
                context_sentence_id: r.get(6)?,
                created_at: r.get(7)?,
            })
        })?;
        rows.collect::<Result<_, _>>().map_err(Error::from)
    }

    /// One ledger row by id (the accept path resolves its offer here).
    pub fn error_ledger_entry(
        &self,
        profile_id: &str,
        id: &str,
    ) -> Result<Option<ErrorLedgerEntry>, Error> {
        Ok(self
            .conn
            .query_row(
                "SELECT id, pack_id, surface, produced, lemma, error_class, context_sentence_id, created_at
                 FROM error_ledger WHERE profile_id = ?1 AND id = ?2",
                params![profile_id, id],
                |r| {
                    Ok(ErrorLedgerEntry {
                        id: r.get(0)?,
                        pack_id: r.get(1)?,
                        surface: r.get(2)?,
                        produced: r.get(3)?,
                        lemma: r.get(4)?,
                        error_class: r.get(5)?,
                        context_sentence_id: r.get(6)?,
                        created_at: r.get(7)?,
                    })
                },
            )
            .optional()?)
    }

    /// Recurrence counts per context content id, across every session
    /// the ledger covers. This is the ONLY form progression may read;
    /// callers must cap its influence and may not present it as a
    /// calibrated mastery claim (docs/18).
    pub fn error_recurrence_by_context(
        &self,
        profile_id: &str,
    ) -> Result<Vec<(String, u32)>, Error> {
        let mut stmt = self.conn.prepare(
            "SELECT context_sentence_id, COUNT(*) FROM error_ledger
             WHERE profile_id = ?1 GROUP BY context_sentence_id",
        )?;
        let rows = stmt.query_map(params![profile_id], |r| {
            let n: i64 = r.get(1)?;
            Ok((r.get::<_, String>(0)?, n.max(0) as u32))
        })?;
        rows.collect::<Result<_, _>>().map_err(Error::from)
    }

    /// Accept an offer: create the review card. UNIQUE on
    /// (profile, surface, context) keeps one live drill card per form per
    /// context — accepting the same offer twice returns the original id
    /// (and its original SRS history) instead of fabricating a second
    /// card, exactly like the repeat-mine rule in `mined.rs`.
    pub fn add_error_review_card(
        &self,
        profile_id: &str,
        c: NewErrorReviewCard<'_>,
    ) -> Result<AddErrorCardOutcome, Error> {
        let inserted = self.conn.execute(
            "INSERT INTO error_review_cards(id, profile_id, ledger_id, pack_id, surface, lemma, error_class, context_sentence_id, created_at)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)
             ON CONFLICT(profile_id, surface, context_sentence_id) DO NOTHING",
            params![
                c.id,
                profile_id,
                c.ledger_id,
                c.pack_id,
                c.surface,
                c.lemma,
                c.error_class,
                c.context_sentence_id,
                c.created_at
            ],
        )?;
        if inserted > 0 {
            return Ok(AddErrorCardOutcome {
                id: c.id.to_string(),
                was_new: true,
            });
        }
        let id = self
            .conn
            .query_row(
                "SELECT id FROM error_review_cards
                 WHERE profile_id = ?1 AND surface = ?2 AND context_sentence_id = ?3",
                params![profile_id, c.surface, c.context_sentence_id],
                |r| r.get(0),
            )
            .optional()?
            .ok_or_else(|| Error::NotFound(format!("review card for {:?}", c.surface)))?;
        Ok(AddErrorCardOutcome { id, was_new: false })
    }

    /// One review card by id.
    pub fn error_review_card(
        &self,
        profile_id: &str,
        id: &str,
    ) -> Result<Option<ErrorReviewCard>, Error> {
        Ok(self
            .conn
            .query_row(
                "SELECT id, ledger_id, pack_id, surface, lemma, error_class, context_sentence_id, created_at
                 FROM error_review_cards WHERE profile_id = ?1 AND id = ?2",
                params![profile_id, id],
                |r| {
                    Ok(ErrorReviewCard {
                        id: r.get(0)?,
                        ledger_id: r.get(1)?,
                        pack_id: r.get(2)?,
                        surface: r.get(3)?,
                        lemma: r.get(4)?,
                        error_class: r.get(5)?,
                        context_sentence_id: r.get(6)?,
                        created_at: r.get(7)?,
                    })
                },
            )
            .optional()?)
    }

    /// All review cards for a profile (queue join / export).
    pub fn error_review_cards(&self, profile_id: &str) -> Result<Vec<ErrorReviewCard>, Error> {
        let mut stmt = self.conn.prepare(
            "SELECT id, ledger_id, pack_id, surface, lemma, error_class, context_sentence_id, created_at
             FROM error_review_cards WHERE profile_id = ?1 ORDER BY created_at, id",
        )?;
        let rows = stmt.query_map(params![profile_id], |r| {
            Ok(ErrorReviewCard {
                id: r.get(0)?,
                ledger_id: r.get(1)?,
                pack_id: r.get(2)?,
                surface: r.get(3)?,
                lemma: r.get(4)?,
                error_class: r.get(5)?,
                context_sentence_id: r.get(6)?,
                created_at: r.get(7)?,
            })
        })?;
        rows.collect::<Result<_, _>>().map_err(Error::from)
    }
}
