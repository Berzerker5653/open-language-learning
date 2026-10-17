//! Forward-only schema migrations (docs/08), applied in version order.
//! Each migration's DDL, `schema_migrations` ledger row, and
//! `PRAGMA user_version` bump land in one `BEGIN IMMEDIATE` transaction:
//! a crash can never leave applied DDL sitting behind an old version
//! (fp 54335bfb12: the next open re-ran the DDL and bricked the store),
//! and concurrent migrators — shell, CLI tools, and warm-up threads on
//! one profile file — skip versions a winning migrator already landed
//! (fp eacae82ace).
//!
//! Version history:
//! 1. Core profile storage: profiles, settings, pack installations and
//!    selections, content versions, learner goals.
//! 2. Learner-model tables: evidence events/corrections, mastery
//!    snapshots, scheduler state, sessions, retained recordings
//!    (metadata only), content reports.

//! 3. `evidence_events.failure_reason` (LEARN-001 technical-failure
//!    representation).
use crate::error::Error;
use rusqlite::{Connection, Transaction, TransactionBehavior};

pub const SCHEMA_VERSION: i64 = 5;

struct Migration {
    version: i64,
    sql: &'static str,
}

const MIGRATIONS: &[Migration] = &[
    Migration {
        version: 1,
        sql: "
CREATE TABLE schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);
CREATE TABLE profiles (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE settings (
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value_json TEXT NOT NULL,
  PRIMARY KEY (profile_id, key)
);
CREATE TABLE pack_installations (
  pack_id TEXT NOT NULL,
  version TEXT NOT NULL,
  installed_at TEXT NOT NULL,
  trust_state TEXT NOT NULL,
  PRIMARY KEY (pack_id, version)
);
CREATE TABLE profile_pack_selections (
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pack_id TEXT NOT NULL,
  version TEXT NOT NULL,
  PRIMARY KEY (profile_id, pack_id)
);
CREATE TABLE content_versions (
  pack_id TEXT NOT NULL,
  content_id TEXT NOT NULL,
  content_version TEXT NOT NULL,
  PRIMARY KEY (pack_id, content_id)
);
CREATE TABLE learner_goals (
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  goal_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  target_date TEXT,
  PRIMARY KEY (profile_id, goal_id)
);
",
    },
    Migration {
        version: 2,
        sql: "
CREATE TABLE evidence_events (
  event_id TEXT PRIMARY KEY,
  occurred_at TEXT NOT NULL,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  targets_json TEXT NOT NULL,
  modality TEXT NOT NULL,
  activity_id TEXT NOT NULL,
  prompt_family_id TEXT,
  attempt_group_id TEXT,
  support_level INTEGER NOT NULL,
  support_actions_json TEXT NOT NULL,
  outcome TEXT NOT NULL,
  score_json TEXT,
  assessment_kind TEXT,
  held_out INTEGER NOT NULL,
  provider_confidence REAL,
  pack_id TEXT NOT NULL,
  pack_version TEXT NOT NULL,
  rubric_version TEXT,
  policy_version TEXT,
  provider_id TEXT
);
CREATE TABLE evidence_corrections (
  event_id TEXT PRIMARY KEY,
  occurred_at TEXT NOT NULL,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  references_json TEXT NOT NULL,
  reason TEXT NOT NULL
);
CREATE TABLE mastery_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content_id TEXT NOT NULL,
  dimension TEXT NOT NULL,
  state TEXT NOT NULL,
  confidence REAL,
  algorithm_version TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  computed_at TEXT NOT NULL
);
CREATE TABLE scheduler_state (
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  scheduler TEXT NOT NULL,
  params_json TEXT NOT NULL,
  due_at TEXT,
  PRIMARY KEY (profile_id, item_id, scheduler)
);
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  plan_json TEXT
);
CREATE TABLE retained_recordings (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  relative_path TEXT NOT NULL,
  recorded_at TEXT NOT NULL,
  duration_ms INTEGER,
  purpose TEXT,
  consent_granted_at TEXT NOT NULL
);
CREATE TABLE reports (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_evidence_profile_time ON evidence_events(profile_id, occurred_at);
CREATE INDEX idx_evidence_activity ON evidence_events(activity_id);
",
    },
    Migration {
        version: 3,
        sql: "
ALTER TABLE evidence_events ADD COLUMN failure_reason TEXT;
",
    },
    Migration {
        version: 4,
        sql: "
CREATE TABLE mined_items (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  surface TEXT NOT NULL,
  reading TEXT,
  gloss TEXT,
  source_citation TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (profile_id, surface)
);
",
    },
    Migration {
        version: 5,
        sql: "
-- Learner-owned (sentence-mined) rows get their own scheduler tag. The
-- algorithm is identical; the tag is the partition, so a plan built for a
-- language pack can never pick up a mined row and a mined review can never
-- be mistaken for pack content (review finding R02).
UPDATE scheduler_state
   SET scheduler = 'fsrs-spike-0.1.0+mined'
 WHERE item_id LIKE 'mine-%' AND scheduler = 'fsrs-spike-0.1.0';
",
    },
];

pub(crate) fn migrate(conn: &Connection) -> Result<(), Error> {
    match migrate_pass(conn) {
        // A concurrent migrator that held the write lock past our busy
        // timeout has landed by the time the second pass runs; the
        // in-transaction version re-read in `apply_migration` then skips
        // whatever it already applied (fp eacae82ace).
        Err(err) if is_busy(&err) => migrate_pass(conn),
        result => result,
    }
}

fn migrate_pass(conn: &Connection) -> Result<(), Error> {
    let current: i64 = conn.query_row("PRAGMA user_version", [], |r| r.get(0))?;
    if current > SCHEMA_VERSION {
        return Err(Error::TooNew {
            found: current,
            max: SCHEMA_VERSION,
        });
    }
    for m in MIGRATIONS {
        if m.version <= current {
            continue;
        }
        apply_migration(conn, m)?;
    }
    Ok(())
}

/// Apply one migration — its SQL, the ledger row, and the
/// `user_version` bump — in a single `BEGIN IMMEDIATE` transaction.
///
/// Two invariants this buys (see also `tests` below):
/// - The version bump commits *with* the DDL. Writing the pragma after
///   `commit` left a crash window in which the next open re-ran already
///   applied DDL — v3's bare `ALTER TABLE ... ADD COLUMN` answers
///   `duplicate column`, turning `Error::Migration` into a permanently
///   unopenable profile store (fp 54335bfb12). SQLite keeps
///   `user_version` in the database header, so one transaction covers
///   both.
/// - `BEGIN IMMEDIATE` takes the write lock before any DDL, and the
///   version is re-read under that lock. With a deferred transaction
///   two fresh opens can both read `user_version = 0`, both start
///   migrating, and the loser's lock upgrade fails with `SQLITE_BUSY`
///   without waiting out the busy timeout (fp eacae82ace).
fn apply_migration(conn: &Connection, m: &Migration) -> Result<(), Error> {
    let tx = Transaction::new_unchecked(conn, TransactionBehavior::Immediate)
        .map_err(|e| migration_error(m.version, e))?;
    let version: i64 = tx.query_row("PRAGMA user_version", [], |r| r.get(0))?;
    if version >= m.version {
        // A concurrent migrator advanced past this version while we
        // waited for the write lock; dropping the transaction releases
        // it without writing anything.
        return Ok(());
    }
    tx.execute_batch(m.sql)
        .map_err(|e| migration_error(m.version, e))?;
    tx.execute(
        "INSERT INTO schema_migrations(version, applied_at) VALUES (?1, strftime('%Y-%m-%dT%H:%M:%SZ','now'))",
        rusqlite::params![m.version],
    )
    .map_err(|e| migration_error(m.version, e))?;
    tx.pragma_update(None, "user_version", m.version)
        .map_err(|e| migration_error(m.version, e))?;
    tx.commit().map_err(|e| migration_error(m.version, e))?;
    Ok(())
}

/// Busy failures keep their SQLite identity instead of being wrapped in
/// [`Error::Migration`], so `migrate` can recognize them and retry.
fn migration_error(version: i64, error: rusqlite::Error) -> Error {
    if is_busy_sqlite(&error) {
        return Error::Sqlite(error);
    }
    Error::Migration {
        version,
        message: error.to_string(),
    }
}

fn is_busy(error: &Error) -> bool {
    matches!(error, Error::Sqlite(inner) if is_busy_sqlite(inner))
}

fn is_busy_sqlite(error: &rusqlite::Error) -> bool {
    matches!(
        error,
        rusqlite::Error::SqliteFailure(detail, _)
            if detail.code == rusqlite::ffi::ErrorCode::DatabaseBusy
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn migrations_are_sequential_and_complete_history() {
        for (i, m) in MIGRATIONS.iter().enumerate() {
            assert_eq!(m.version, (i + 1) as i64);
        }
        assert_eq!(MIGRATIONS.last().unwrap().version, SCHEMA_VERSION);
    }

    /// Migration 5 is an upgrade-path test on a pre-5 database: mined
    /// (learner-owned) scheduler rows move to their own tag, pack rows do
    /// not move. The tag string here is the same literal the migration
    /// writes; `crates/scheduler::MINED_SCHEDULER` and this SQL are kept
    /// in agreement by a desktop-side test (storage may not depend on the
    /// scheduler crate — docs/07).
    #[test]
    fn mined_scheduler_rows_are_partitioned_on_upgrade() {
        let conn = Connection::open_in_memory().unwrap();
        migrate(&conn).unwrap();
        // Rewind to exactly what a v4 database on disk looks like: the
        // marker, the ledger row, and the rows the migration must rewrite.
        conn.execute_batch(
            "PRAGMA user_version = 4;
             DELETE FROM schema_migrations WHERE version = 5;",
        )
        .unwrap();
        conn.execute(
            "INSERT INTO profiles(id, display_name, created_at)
             VALUES ('p1', 'P', '2026-10-01T00:00:00Z')",
            [],
        )
        .unwrap();
        for item in ["mine-1760000000-1", "ja.lex.demo.konnichiwa#recall-meaning"] {
            conn.execute(
                "INSERT INTO scheduler_state(profile_id, item_id, scheduler, params_json, due_at)
                 VALUES ('p1', ?1, 'fsrs-spike-0.1.0', '{}', '2026-10-14T00:00:00Z')",
                [item],
            )
            .unwrap();
        }
        migrate(&conn).unwrap();
        let tag = |item: &str| -> String {
            conn.query_row(
                "SELECT scheduler FROM scheduler_state WHERE item_id = ?1",
                [item],
                |r| r.get(0),
            )
            .unwrap()
        };
        assert_eq!(tag("mine-1760000000-1"), "fsrs-spike-0.1.0+mined");
        assert_eq!(
            tag("ja.lex.demo.konnichiwa#recall-meaning"),
            "fsrs-spike-0.1.0",
            "pack rows keep their tag"
        );
        // Idempotent: re-running the whole history changes nothing.
        migrate(&conn).unwrap();
        assert_eq!(tag("mine-1760000000-1"), "fsrs-spike-0.1.0+mined");
    }

    fn user_version(conn: &Connection) -> i64 {
        conn.query_row("PRAGMA user_version", [], |r| r.get(0))
            .unwrap()
    }

    /// The schema artifact each migration leaves behind; v5 is a data
    /// migration and has none (its ledger row and tag rewrite are checked
    /// separately).
    fn schema_landed(conn: &Connection, version: i64) -> bool {
        match version {
            1 | 2 | 4 => {
                let name = match version {
                    1 => "profiles",
                    2 => "evidence_events",
                    _ => "mined_items",
                };
                conn.query_row(
                    "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = ?1",
                    [name],
                    |r| r.get::<_, i64>(0),
                )
                .unwrap()
                    == 1
            }
            3 => conn
                .query_row(
                    "SELECT COUNT(*) FROM pragma_table_info('evidence_events') WHERE name = 'failure_reason'",
                    [],
                    |r| r.get::<_, i64>(0),
                )
                .unwrap()
                    == 1,
            _ => panic!("v{version} has no schema artifact"),
        }
    }

    /// Make each migration fail *after* its SQL has already run inside
    /// the transaction: v1/v2 collide with a hand-created object from
    /// their own batch (so the earlier statements must roll back with
    /// it); v3-v5 collide with their ledger INSERT.
    fn poison_migration(conn: &Connection, version: i64) {
        match version {
            1 => {
                conn.execute("CREATE TABLE learner_goals (id TEXT)", [])
                    .unwrap();
            }
            2 => {
                conn.execute("CREATE TABLE reports (id TEXT)", []).unwrap();
            }
            _ => {
                conn.execute(
                    "INSERT INTO schema_migrations(version, applied_at) VALUES (?1, 'poison')",
                    [version],
                )
                .unwrap();
            }
        }
    }

    fn unpoison_migration(conn: &Connection, version: i64) {
        match version {
            1 => {
                conn.execute("DROP TABLE learner_goals", []).unwrap();
            }
            2 => {
                conn.execute("DROP TABLE reports", []).unwrap();
            }
            _ => {
                conn.execute(
                    "DELETE FROM schema_migrations WHERE version = ?1",
                    [version],
                )
                .unwrap();
            }
        }
    }

    /// fp 54335bfb12: DDL and its `user_version` bump must commit or
    /// roll back as one unit. The old code wrote the pragma after the
    /// commit; a crash in that window left applied DDL behind an old
    /// version, and the next open re-ran the DDL (v3's ALTER →
    /// duplicate column) and bricked the store. This forces every
    /// migration's transaction to fail after real work has landed in
    /// it, and asserts the rollback leaves neither — the brick state is
    /// not producible by `apply_migration`.
    #[test]
    fn failed_migration_rolls_back_both_ddl_and_version() {
        let conn = Connection::open_in_memory().unwrap();
        for m in MIGRATIONS {
            let before = user_version(&conn);
            assert_eq!(
                before,
                m.version - 1,
                "store lands on each version in order"
            );
            let probe = m.version == 5;
            if probe {
                // v5 rewrites rows, so give it one row to rewrite and
                // watch its tag as the "DDL" marker.
                conn.execute(
                    "INSERT INTO profiles(id, display_name, created_at)
                     VALUES ('p1', 'P', '2026-10-01T00:00:00Z')",
                    [],
                )
                .unwrap();
                conn.execute(
                    "INSERT INTO scheduler_state(profile_id, item_id, scheduler, params_json, due_at)
                     VALUES ('p1', 'mine-probe', 'fsrs-spike-0.1.0', '{}', NULL)",
                    [],
                )
                .unwrap();
            }
            let landed = |conn: &Connection| -> bool {
                if probe {
                    conn.query_row(
                        "SELECT scheduler FROM scheduler_state WHERE item_id = 'mine-probe'",
                        [],
                        |r| r.get::<_, String>(0),
                    )
                    .unwrap()
                        == "fsrs-spike-0.1.0+mined"
                } else {
                    schema_landed(conn, m.version)
                }
            };
            assert!(
                !landed(&conn),
                "v{} artifact absent before applying",
                m.version
            );
            poison_migration(&conn, m.version);
            let err = apply_migration(&conn, m).unwrap_err();
            assert!(
                matches!(&err, Error::Migration { version, .. } if *version == m.version),
                "poisoned v{} must fail as Error::Migration: {err}",
                m.version
            );
            assert!(
                conn.is_autocommit(),
                "failed v{} must not leave the write lock held",
                m.version
            );
            assert_eq!(
                user_version(&conn),
                before,
                "v{} version bump must roll back with its DDL",
                m.version
            );
            assert!(
                !landed(&conn),
                "v{} DDL must roll back with its version bump",
                m.version
            );
            unpoison_migration(&conn, m.version);
            apply_migration(&conn, m).unwrap();
            assert_eq!(user_version(&conn), m.version);
            assert!(landed(&conn));
        }
        // Reopening a completed store runs the whole pass again and is a
        // clean no-op: the version guard, not a crash window, decides
        // whether DDL runs. (Re-running v3 here would be the brick.)
        migrate(&conn).unwrap();
        assert_eq!(user_version(&conn), SCHEMA_VERSION);
        let ledger: i64 = conn
            .query_row("SELECT COUNT(*) FROM schema_migrations", [], |r| r.get(0))
            .unwrap();
        assert_eq!(
            ledger, SCHEMA_VERSION,
            "exactly one ledger row per migration"
        );
    }

    /// fp eacae82ace: the shell, the CLI tools, and warm-up threads all
    /// open the same profile file. Two migrators that both find a fresh
    /// database must not brick each other: with a deferred transaction
    /// and no in-transaction version re-read, both saw
    /// `user_version = 0`, both ran the DDL, and the loser died on
    /// already-present objects or a busy failure from an unwinnable
    /// lock upgrade.
    #[test]
    fn concurrent_migrators_agree_on_one_file() {
        // Several rounds: hitting the fresh-open interleaving needs bad
        // luck, so repeat rather than trust a single coin flip.
        for _ in 0..6 {
            let dir = tempfile::tempdir().unwrap();
            let db = dir.path().join("learner.db");
            // Pre-set WAL: a journal-mode *switch* (not migration) can
            // return SQLITE_BUSY without the busy handler retrying it,
            // and WAL persists in the file header — the first open wins
            // once and production racing opens then see it already set.
            // The schema itself stays untouched (user_version = 0).
            {
                let setup = Connection::open(&db).unwrap();
                setup
                    .pragma_update(None, "journal_mode", "WAL")
                    .unwrap_or_else(|e| panic!("pre-set WAL: {e}"));
            }
            let started = std::sync::Arc::new(std::sync::atomic::AtomicUsize::new(0));
            std::thread::scope(|scope| {
                for _ in 0..2 {
                    let db = db.clone();
                    let started = std::sync::Arc::clone(&started);
                    scope.spawn(move || {
                        let conn = Connection::open(&db)
                            .unwrap_or_else(|e| panic!("open racing store: {e}"));
                        // Mirror `from_conn`: WAL plus an explicit busy
                        // timeout is what production connections open with.
                        conn.busy_timeout(std::time::Duration::from_secs(5))
                            .unwrap();
                        conn.pragma_update(None, "journal_mode", "WAL")
                            .unwrap_or_else(|e| panic!("ensure WAL: {e}"));
                        // Deadline-bounded start gate instead of a
                        // Barrier: if the peer thread dies first, this
                        // one still must not deadlock the suite.
                        started.fetch_add(1, std::sync::atomic::Ordering::SeqCst);
                        let deadline =
                            std::time::Instant::now() + std::time::Duration::from_secs(2);
                        while started.load(std::sync::atomic::Ordering::SeqCst) < 2
                            && std::time::Instant::now() < deadline
                        {
                            std::thread::yield_now();
                        }
                        migrate(&conn).unwrap_or_else(|e| panic!("concurrent migrate: {e}"));
                        assert_eq!(user_version(&conn), SCHEMA_VERSION);
                    });
                }
            });
            let conn = Connection::open(&db).unwrap();
            assert_eq!(user_version(&conn), SCHEMA_VERSION, "final user_version");
            let ledger: i64 = conn
                .query_row("SELECT COUNT(*) FROM schema_migrations", [], |r| r.get(0))
                .unwrap();
            assert_eq!(
                ledger, SCHEMA_VERSION,
                "no migration landed twice or not at all"
            );
            for m in MIGRATIONS {
                if m.version == 5 {
                    continue; // data migration; ledger above covers it
                }
                assert!(
                    schema_landed(&conn, m.version),
                    "v{} schema landed",
                    m.version
                );
            }
        }
    }

    /// fp eacae82ace: a writer holding the lock longer than one busy
    /// timeout must cost a retried pass, not a hard failure. The lock
    /// clears after 500 ms: past the 400 ms timeout of the first pass,
    /// comfortably inside the second pass's window — only the retry can
    /// land.
    #[test]
    fn migrate_retries_once_when_the_write_lock_is_held() {
        let dir = tempfile::tempdir().unwrap();
        let db = dir.path().join("learner.db");
        let lock = Connection::open(&db).unwrap();
        lock.execute("BEGIN IMMEDIATE", []).unwrap();
        std::thread::spawn(move || {
            std::thread::sleep(std::time::Duration::from_millis(500));
            lock.execute("COMMIT", [])
                .unwrap_or_else(|e| panic!("release held lock: {e}"));
        });
        let conn = Connection::open(&db).unwrap();
        conn.busy_timeout(std::time::Duration::from_millis(400))
            .unwrap();
        migrate(&conn).unwrap_or_else(|e| panic!("migrate through a held lock: {e}"));
        assert_eq!(user_version(&conn), SCHEMA_VERSION);
    }
}
