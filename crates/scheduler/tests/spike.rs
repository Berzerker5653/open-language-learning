//! LEARN-003 acceptance: the scheduler sits behind an interface, is
//! deterministic under a test clock, schedules discrete items by due
//! time (no daily attendance objective), and never turns unscored
//! attempts into reviews.

use lts_domain::{ActivityModality, ContentId, EventId, ProfileId, Score};
use lts_scheduler::{FsrsSpike, ItemState, Rating, Scheduler, rating_from_evidence};
use lts_storage::{SchedulerRecord, Store};

const DAY: i64 = 86_400;

fn t0() -> i64 {
    // 2026-10-02T00:00:00Z
    1_790_966_400
}

#[test]
fn deterministic_under_test_clock() {
    let sched = FsrsSpike::default();
    let run = |clock: i64| {
        let mut state: Option<ItemState> = None;
        let ratings = [Rating::Good, Rating::Again, Rating::Hard, Rating::Good];
        let mut out = Vec::new();
        for (i, r) in ratings.iter().enumerate() {
            let d = sched.review(state.as_ref(), *r, clock + i as i64 * DAY);
            state = Some(d.state.clone());
            out.push(d);
        }
        out
    };
    let a = run(t0());
    let b = run(t0());
    assert_eq!(a.len(), b.len());
    for (x, y) in a.iter().zip(&b) {
        assert_eq!(
            x.state.stability_days.to_bits(),
            y.state.stability_days.to_bits()
        );
        assert_eq!(x.state.difficulty.to_bits(), y.state.difficulty.to_bits());
        assert_eq!(x.due_at, y.due_at);
    }
}

#[test]
fn items_schedule_by_due_time_not_attendance() {
    let sched = FsrsSpike::default();
    let d = sched.review(None, Rating::Good, t0());
    // At request_ret 0.9 the interval equals stability (days).
    assert!(d.interval_days > 1.0);
    assert_eq!(
        d.due_at,
        t0() + (d.interval_days * DAY as f64).round() as i64
    );

    // Not due the next day; due at due_at; independent per item.
    assert!(!sched.is_due(&d.state, t0() + DAY, 0.9));
    assert!(sched.is_due(&d.state, d.due_at, 0.9));

    // Retrievability decays monotonically with elapsed time.
    let r1 = sched.retrievability(&d.state, t0() + DAY);
    let r2 = sched.retrievability(&d.state, t0() + 3 * DAY);
    let r3 = sched.retrievability(&d.state, t0() + 10 * DAY);
    assert!(r1 > r2 && r2 > r3 && r3 > 0.0 && r1 < 1.0);
}

#[test]
fn stability_grows_on_success_and_falls_on_lapse() {
    let sched = FsrsSpike::default();
    let first = sched.review(None, Rating::Good, t0());
    let second = sched.review(Some(&first.state), Rating::Good, first.due_at);
    assert!(
        second.state.stability_days > first.state.stability_days,
        "success must grow stability: {} -> {}",
        first.state.stability_days,
        second.state.stability_days
    );
    let lapse = sched.review(Some(&second.state), Rating::Again, second.due_at);
    assert!(
        lapse.state.stability_days < second.state.stability_days,
        "lapse must shrink stability"
    );
    assert_eq!(lapse.state.lapses, 1);
}

#[test]
fn unscored_attempts_are_never_reviews() {
    let base = lts_learner_model::AttemptDraft::new(
        vec![ContentId::parse("es.lex.greet.hola").unwrap()],
        ActivityModality::ProductionSpeaking,
        ContentId::parse("es.activity.speak.repeat").unwrap(),
        "org.openlanguage.test",
        "0.1.0",
    );
    let profile = ProfileId::new("p1");
    let finish = |d: lts_learner_model::AttemptDraft, id: &str| {
        d.finish(EventId::new(id), "2026-10-02T12:00:00Z", profile.clone())
    };

    let ok = finish(base.clone().scored(Score::Correct), "ok");
    assert_eq!(rating_from_evidence(&ok), Some(Rating::Good));

    let tech = finish(
        base.clone().technical_failure("asr-timeout", "local-asr"),
        "tech",
    );
    assert_eq!(rating_from_evidence(&tech), None);

    let abstain = finish(
        base.clone().abstained("low-confidence", "local-asr"),
        "abst",
    );
    assert_eq!(rating_from_evidence(&abstain), None);
}

#[test]
fn scheduler_state_persists_and_queries_due_items() {
    let sched = FsrsSpike::default();
    let store = Store::in_memory().unwrap();
    let prof = store.create_profile("Ana", "2026-10-01T09:00:00Z").unwrap();

    let d = sched.review(None, Rating::Good, t0());
    let due_rfc = rfc3339(d.due_at);
    store
        .save_scheduler_state(
            &prof.id,
            &SchedulerRecord {
                item_id: "es.lex.greet.hola".into(),
                scheduler: sched.version().into(),
                params_json: serde_json::to_string(&d.state).unwrap(),
                due_at: due_rfc.clone(),
            },
        )
        .unwrap();

    // Before due: nothing. At due: the item.
    assert!(
        store
            .due_items(&prof.id, sched.version(), &rfc3339(d.due_at - DAY))
            .unwrap()
            .is_empty()
    );
    let due = store
        .due_items(&prof.id, sched.version(), &due_rfc)
        .unwrap();
    assert_eq!(due.len(), 1);
    let state: ItemState = serde_json::from_str(&due[0].params_json).unwrap();
    assert_eq!(state, d.state);
}

fn rfc3339(epoch: i64) -> String {
    // Minimal epoch->RFC3339 (UTC), inverse of the policy parser.
    let days = epoch.div_euclid(86_400);
    let secs = epoch.rem_euclid(86_400);
    let z = days + 719_468;
    let era = (if z >= 0 { z } else { z - 146_096 }) / 146_097;
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = if m <= 2 { y + 1 } else { y };
    format!(
        "{y:04}-{:02}-{:02}T{:02}:{:02}:{:02}Z",
        m,
        d,
        secs / 3600,
        (secs % 3600) / 60,
        secs % 60
    )
}
