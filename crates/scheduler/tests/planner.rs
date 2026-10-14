//! LEARN-004 acceptance tests: session planner budgets, balance,
//! modality repetition limits, determinism, and the absence of any
//! streak/attendance objective.
use lts_domain::ActivityModality;
use lts_domain::ActivityModality::*;
use lts_scheduler::planner::*;

fn reviews(n: usize, ret: f64, m: ActivityModality) -> Vec<DueReviewItem> {
    (0..n)
        .map(|i| DueReviewItem {
            item_id: format!("rev-{i:02}"),
            content_id: format!("c-{}", i % 7),
            modality: m,
            retrievability: ret,
            saved: false,
        })
        .collect()
}

fn cfg(budget: u32) -> PlannerConfig {
    PlannerConfig {
        budget_minutes: budget,
        ..PlannerConfig::default()
    }
}

#[test]
fn budget_presets_5_10_20_30_plus_all_fit_and_grow() {
    let inputs = PlannerInputs {
        due_reviews: reviews(60, 0.5, ComprehensionReading),
        weak_skills: (0..20)
            .map(|i| WeakSkillItem {
                content_id: format!("w-{i:02}"),
                dimension: ProductionSpeaking,
                confidence: 0.2,
            })
            .collect(),
        progression: (0..20)
            .map(|i| ProgressionItem {
                content_id: format!("p-{i:02}"),
                modality: ComprehensionListening,
            })
            .collect(),
    };
    // 30+ means any budget >= 30 is accepted, e.g. 45.
    let mut totals = Vec::new();
    for b in [5u32, 10, 20, 30, 45] {
        let p = plan_session(&cfg(b), &inputs).unwrap();
        assert!(p.total_seconds <= b * 60, "budget {b} exceeded");
        assert!(!p.items.is_empty(), "budget {b} produced empty plan");
        totals.push(p.total_seconds);
    }
    for w in totals.windows(2) {
        assert!(
            w[1] >= w[0],
            "larger budget must not shrink plan: {totals:?}"
        );
    }
    assert_eq!(BUDGET_PRESETS, [5, 10, 20, 30]);
}

#[test]
fn balances_due_review_weak_skills_and_progression() {
    let inputs = PlannerInputs {
        due_reviews: reviews(10, 0.5, ComprehensionReading),
        weak_skills: vec![
            WeakSkillItem {
                content_id: "w-grammar".into(),
                dimension: GrammarControlled,
                confidence: 0.1,
            },
            WeakSkillItem {
                content_id: "w-speak".into(),
                dimension: ProductionSpeaking,
                confidence: 0.2,
            },
        ],
        progression: vec![
            ProgressionItem {
                content_id: "lesson-1".into(),
                modality: ComprehensionListening,
            },
            ProgressionItem {
                content_id: "lesson-2".into(),
                modality: ProductionWriting,
            },
        ],
    };
    let p = plan_session(&cfg(10), &inputs).unwrap();
    let reasons: Vec<_> = p.items.iter().map(|i| i.reason).collect();
    assert!(reasons.contains(&PlanReason::DueReview));
    assert!(reasons.contains(&PlanReason::WeakSkill));
    assert!(reasons.contains(&PlanReason::Progression));
    // Urgency ordering within reviews: weakest confidence first.
    let weak_ids: Vec<_> = p
        .items
        .iter()
        .filter(|i| i.reason == PlanReason::WeakSkill)
        .map(|i| i.content_id.clone())
        .collect();
    assert_eq!(weak_ids.first().map(String::as_str), Some("w-grammar"));
}

#[test]
fn modality_repetition_limit_is_enforced() {
    let inputs = PlannerInputs {
        due_reviews: reviews(50, 0.5, ComprehensionListening),
        weak_skills: (0..10)
            .map(|i| WeakSkillItem {
                content_id: format!("w-{i}"),
                dimension: ComprehensionListening,
                confidence: 0.1,
            })
            .collect(),
        progression: vec![],
    };
    let config = PlannerConfig {
        budget_minutes: 30,
        max_per_modality: 3,
        ..PlannerConfig::default()
    };
    let p = plan_session(&config, &inputs).unwrap();
    let listening = p
        .items
        .iter()
        .filter(|i| i.modality == ComprehensionListening)
        .count();
    assert_eq!(listening, 3, "modality cap violated");
}

#[test]
fn learner_owned_reviews_plan_as_saved_reviews_not_pack_reviews() {
    let owned = vec![DueReviewItem {
        item_id: "mine-1".into(),
        content_id: "mined-word".into(),
        modality: RecallMeaning,
        retrievability: 0.5,
        saved: true,
    }];
    let owned_plan = plan_session(
        &cfg(10),
        &PlannerInputs {
            due_reviews: owned,
            weak_skills: vec![],
            progression: vec![],
        },
    )
    .unwrap();
    assert_eq!(owned_plan.items[0].reason, PlanReason::SavedReview);
    let pack_plan = plan_session(
        &cfg(10),
        &PlannerInputs {
            due_reviews: reviews(1, 0.5, RecallMeaning),
            weak_skills: vec![],
            progression: vec![],
        },
    )
    .unwrap();
    assert_eq!(pack_plan.items[0].reason, PlanReason::DueReview);
}

#[test]
fn plans_are_reproducible_with_fixed_input_and_seed() {
    let inputs = PlannerInputs {
        due_reviews: vec![
            DueReviewItem {
                item_id: "b".into(),
                content_id: "c1".into(),
                modality: RecallMeaning,
                retrievability: 0.9,
                saved: false,
            },
            DueReviewItem {
                item_id: "a".into(),
                content_id: "c2".into(),
                modality: RecallMeaning,
                retrievability: 0.9,
                saved: false,
            },
        ],
        weak_skills: vec![WeakSkillItem {
            content_id: "w1".into(),
            dimension: ProductionSpeaking,
            confidence: 0.3,
        }],
        progression: vec![ProgressionItem {
            content_id: "l1".into(),
            modality: ComprehensionReading,
        }],
    };
    let config = PlannerConfig {
        budget_minutes: 5,
        seed: 1234,
        ..PlannerConfig::default()
    };
    let p1 = plan_session(&config, &inputs).unwrap();
    let p2 = plan_session(&config, &inputs).unwrap();
    assert_eq!(p1, p2);
    assert_eq!(p1.seed, 1234);
    assert_eq!(p1.planner_version, PLANNER_VERSION);
    // Tie on retrievability resolves by item id, not iteration luck.
    assert_eq!(p1.items[0].item_id, "a");
}

#[test]
fn every_planned_item_has_a_learning_reason_no_attendance_objective() {
    // The planner API accepts no attendance/day inputs and every item
    // carries one of exactly three learning reasons; there is no
    // streak or day-presence reason to plan for (ADR-0002).
    let inputs = PlannerInputs {
        due_reviews: reviews(5, 0.4, ComprehensionReading),
        weak_skills: vec![],
        progression: vec![],
    };
    let p = plan_session(&cfg(5), &inputs).unwrap();
    assert!(p.items.iter().all(|i| matches!(
        i.reason,
        PlanReason::DueReview | PlanReason::WeakSkill | PlanReason::Progression
    )));
    // Nothing due, nothing weak: only progression can be planned —
    // an empty schedule never forces filler "attendance" items.
    let empty = plan_session(&cfg(10), &PlannerInputs::default()).unwrap();
    assert!(empty.items.is_empty());
    assert_eq!(empty.total_seconds, 0);
}

#[test]
fn invalid_configs_are_rejected() {
    let bad = PlannerConfig {
        budget_minutes: 0,
        ..PlannerConfig::default()
    };
    assert_eq!(
        plan_session(&bad, &PlannerInputs::default()),
        Err(PlannerError::ZeroBudget)
    );
    let bad = PlannerConfig {
        review_share: 0.5,
        weak_share: 0.5,
        progression_share: 0.5,
        ..PlannerConfig::default()
    };
    assert!(matches!(
        plan_session(&bad, &PlannerInputs::default()),
        Err(PlannerError::SharesMustSumToOne(_))
    ));
    let bad = PlannerConfig {
        max_per_modality: 0,
        ..PlannerConfig::default()
    };
    assert_eq!(
        plan_session(&bad, &PlannerInputs::default()),
        Err(PlannerError::ModalityLimitMustBePositive)
    );
}

#[test]
fn fill_phase_terminates_when_nothing_fits_anymore() {
    // Regression: with leftover budget smaller than the next item's
    // estimate but candidates still un-planned, the fill loop used to
    // spin forever (candidate-position checks never became true).
    let inputs = PlannerInputs {
        weak_skills: vec![
            WeakSkillItem {
                content_id: "w-1".into(),
                dimension: ProductionWriting,
                confidence: 0.2,
            },
            WeakSkillItem {
                content_id: "w-2".into(),
                dimension: ProductionWriting,
                confidence: 0.3,
            },
        ],
        progression: (0..4)
            .map(|i| ProgressionItem {
                content_id: format!("p-{i}"),
                modality: RecallMeaning,
            })
            .collect(),
        ..PlannerInputs::default()
    };
    let plan = plan_session(&cfg(5), &inputs).unwrap();
    assert!(plan.total_seconds <= 300);
    // Genuinely packed: no remaining candidate fits the leftover budget.
    assert!(plan.total_seconds + 60 > 300);
}
