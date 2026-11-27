//! WRITE-PRACTICE-001: private writing journal (v1, no AI feedback).
//!
//! A free-writing attempt is a completion record, not a scored observation:
//! the journal holds the learner's own text plus honest counts, per profile,
//! deleted with the profile (ON DELETE CASCADE). Nothing here touches
//! evidence_events, mastery, scheduler, mined, or the error ledger — the
//! command that writes these rows is pinned by
//! `writing_check_performs_zero_mastery_or_scheduler_writes` (apps/desktop).
//!
//! `writing_journal_words` is the accumulation substrate for the
//! unique-dictionary-words meter: one row per (profile, token) with
//! INSERT OR IGNORE, so `COUNT(*)` is the meter — accumulation, never reset.

use crate::{Error, Store};

/// One attempt as submitted by the free-writing check. `dictionary_tokens`
/// are the attempt's dictionary-known tokens, already normalized
/// (case-folded, stress-stripped) and deduplicated by the caller.
#[derive(Debug, Clone)]
pub struct NewWritingAttempt<'a> {
    pub id: &'a str,
    pub pack_id: &'a str,
    pub text: &'a str,
    pub word_count: i64,
    pub targets_used: i64,
    pub dictionary_tokens: &'a [String],
    pub occurred_at: &'a str,
}

/// One journal row for replay. Newest-first ordering is the reader's
/// contract; the index backs it.
#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize)]
pub struct WritingJournalEntry {
    pub id: String,
    pub pack_id: String,
    pub text: String,
    pub word_count: i64,
    pub targets_used: i64,
    pub occurred_at: String,
}

/// Accumulation meters shown on the Progress surface. Both counts only
/// ever grow (within a rolling week for attempts): the meters are
/// accumulation, not debt.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct WritingMeters {
    pub attempts_this_week: i64,
    pub unique_dictionary_words: i64,
}

impl Store {
    /// Append one attempt + its known tokens. The caller has already
    /// refused the attempt (no write) if it was blank or oversized.
    pub fn record_writing_attempt(
        &self,
        profile_id: &str,
        new: &NewWritingAttempt<'_>,
    ) -> Result<(), Error> {
        self.conn.execute(
            "INSERT INTO writing_journal(id, profile_id, pack_id, text, word_count, targets_used, occurred_at)
             VALUES (?1,?2,?3,?4,?5,?6,?7)",
            rusqlite::params![
                new.id,
                profile_id,
                new.pack_id,
                new.text,
                new.word_count,
                new.targets_used,
                new.occurred_at
            ],
        )?;
        for token in new.dictionary_tokens {
            self.conn.execute(
                "INSERT INTO writing_journal_words(profile_id, token) VALUES (?1,?2)
                 ON CONFLICT(profile_id, token) DO NOTHING",
                rusqlite::params![profile_id, token],
            )?;
        }
        Ok(())
    }

    /// Replay the journal newest-first, capped at `limit` (a sane screen
    /// window, not a privacy boundary — the whole table is the learner's).
    pub fn writing_journal(
        &self,
        profile_id: &str,
        limit: i64,
    ) -> Result<Vec<WritingJournalEntry>, Error> {
        let mut stmt = self.conn.prepare(
            "SELECT id, pack_id, text, word_count, targets_used, occurred_at
             FROM writing_journal WHERE profile_id = ?1
             ORDER BY occurred_at DESC, id DESC LIMIT ?2",
        )?;
        let rows = stmt.query_map(rusqlite::params![profile_id, limit], |r| {
            Ok(WritingJournalEntry {
                id: r.get(0)?,
                pack_id: r.get(1)?,
                text: r.get(2)?,
                word_count: r.get(3)?,
                targets_used: r.get(4)?,
                occurred_at: r.get(5)?,
            })
        })?;
        rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
    }

    /// The two accumulation meters. The week window is calendar-comparable
    /// RFC 3339 UTC strings; `now` is passed by the caller so tests are
    /// deterministic.
    pub fn writing_meters(&self, profile_id: &str, now: &str) -> Result<WritingMeters, Error> {
        let week_start = shift_days_back_7(now);
        let attempts_this_week: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM writing_journal
             WHERE profile_id = ?1 AND occurred_at >= ?2",
            rusqlite::params![profile_id, week_start],
            |r| r.get(0),
        )?;
        let unique_dictionary_words: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM writing_journal_words WHERE profile_id = ?1",
            rusqlite::params![profile_id],
            |r| r.get(0),
        )?;
        Ok(WritingMeters {
            attempts_this_week,
            unique_dictionary_words,
        })
    }
}

/// RFC 3339 UTC date string 7 days before `now` (same format the rows
/// carry, so the comparison above is a plain string compare). `now` is a
/// `YYYY-MM-DDTHH:MM:SSZ` stamp produced by `rfc3339_utc`; only the date
/// part is needed here, and a civil-days shift via days-since-epoch keeps
/// this dependency-free like `rfc3339_utc` itself.
fn shift_days_back_7(now: &str) -> String {
    let date = now.get(..10).unwrap_or("1970-01-01");
    let y: i64 = date.get(..4).and_then(|s| s.parse().ok()).unwrap_or(1970);
    let m: i64 = date.get(5..7).and_then(|s| s.parse().ok()).unwrap_or(1);
    let d: i64 = date.get(8..10).and_then(|s| s.parse().ok()).unwrap_or(1);
    // Days-since-epoch (Howard Hinnant's algorithm), then back 7 days.
    let y0 = if m <= 2 { y - 1 } else { y };
    let era = if y0 >= 0 { y0 } else { y0 - 399 } / 400;
    let yoe = y0 - era * 400;
    let mp = if m > 2 { m - 3 } else { m + 9 };
    let doy = (153 * mp + 2) / 5 + d - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    let days = era * 146097 + doe - 719468 - 7;
    // Back to a civil date.
    let z = days + 719468;
    let era = if z >= 0 { z } else { z - 146096 } / 146097;
    let doe = (z - era * 146097) as u64;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = yoe as i64 + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = if m <= 2 { y + 1 } else { y };
    format!("{y:04}-{m:02}-{d:02}T00:00:00Z")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn journal_orders_newest_first_and_meters_accumulate() {
        let store = Store::in_memory().unwrap();
        let p = store
            .create_profile("Writer", "2026-11-01T00:00:00Z")
            .unwrap();
        let tokens_a: Vec<String> = ["кофе", "утро"].iter().map(|s| s.to_string()).collect();
        let tokens_b: Vec<String> = ["кофе"].iter().map(|s| s.to_string()).collect();
        store
            .record_writing_attempt(
                &p.id,
                &NewWritingAttempt {
                    id: "a1",
                    pack_id: "org.openlanguage.test",
                    text: "я пью кофе утром",
                    word_count: 4,
                    targets_used: 1,
                    dictionary_tokens: &tokens_a,
                    occurred_at: "2026-11-26T09:00:00Z",
                },
            )
            .unwrap();
        store
            .record_writing_attempt(
                &p.id,
                &NewWritingAttempt {
                    id: "a2",
                    pack_id: "org.openlanguage.test",
                    text: "кофе",
                    word_count: 1,
                    targets_used: 0,
                    dictionary_tokens: &tokens_b,
                    occurred_at: "2026-11-27T09:00:00Z",
                },
            )
            .unwrap();
        let journal = store.writing_journal(&p.id, 50).unwrap();
        assert_eq!(journal.len(), 2);
        assert_eq!(journal[0].id, "a2", "newest first");
        assert_eq!(journal[1].id, "a1");

        let meters = store.writing_meters(&p.id, "2026-11-27T12:00:00Z").unwrap();
        assert_eq!(meters.attempts_this_week, 2);
        // "кофе" lands in both attempts but counts once — accumulation.
        assert_eq!(meters.unique_dictionary_words, 2);

        // An attempt from last week is outside the rolling window, but its
        // unique words are permanent.
        store
            .record_writing_attempt(
                &p.id,
                &NewWritingAttempt {
                    id: "a0",
                    pack_id: "org.openlanguage.test",
                    text: "молоко",
                    word_count: 1,
                    targets_used: 0,
                    dictionary_tokens: &["молоко".to_string()],
                    occurred_at: "2026-11-15T09:00:00Z",
                },
            )
            .unwrap();
        let meters = store.writing_meters(&p.id, "2026-11-27T12:00:00Z").unwrap();
        assert_eq!(meters.attempts_this_week, 2);
        assert_eq!(meters.unique_dictionary_words, 3);
    }

    #[test]
    fn journal_is_per_profile_and_deleted_with_the_profile() {
        let store = Store::in_memory().unwrap();
        let a = store.create_profile("A", "2026-11-01T00:00:00Z").unwrap();
        let b = store.create_profile("B", "2026-11-01T00:00:00Z").unwrap();
        let tokens: Vec<String> = ["кофе".to_string()].into_iter().collect();
        for p in [&a, &b] {
            store
                .record_writing_attempt(
                    &p.id,
                    &NewWritingAttempt {
                        id: &format!("row-{}", p.id),
                        pack_id: "org.openlanguage.test",
                        text: "кофе",
                        word_count: 1,
                        targets_used: 0,
                        dictionary_tokens: &tokens,
                        occurred_at: "2026-11-27T09:00:00Z",
                    },
                )
                .unwrap();
        }
        assert_eq!(store.writing_journal(&a.id, 50).unwrap().len(), 1);
        assert_eq!(store.writing_journal(&b.id, 50).unwrap().len(), 1);
        store.delete_profile(&a.id).unwrap();
        assert!(store.writing_journal(&a.id, 50).unwrap().is_empty());
        assert_eq!(
            store
                .writing_meters(&a.id, "2026-11-27T12:00:00Z")
                .unwrap()
                .unique_dictionary_words,
            0
        );
        assert_eq!(store.writing_journal(&b.id, 50).unwrap().len(), 1);
    }

    #[test]
    fn week_window_is_7_days_back() {
        assert_eq!(
            shift_days_back_7("2026-11-27T12:00:00Z"),
            "2026-11-20T00:00:00Z"
        );
        assert_eq!(
            shift_days_back_7("2026-01-03T00:00:00Z"),
            "2025-12-27T00:00:00Z"
        );
    }
}
