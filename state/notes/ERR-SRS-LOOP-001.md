# ERR-SRS-LOOP-001 — error memory loop (implementation contract + state)

## Design (as shipped)
- **Classifier (engine lane):** `crates/activity/src/form_errors.rs` — pure, offline.
  Takes the pack's `media/lemmas.jsonl` sidecar rows (surface key normalized the same
  way as `norm_token`: drop U+0301, lowercase), the expected form, and the produced
  form. Classes: stress (identical modulo stress marks) → wrong-word (different or
  unknown lemma) → case → aspect → agreement, honest `other` fallback; `None` when the
  expected form has no sidecar row (no pymorphy data, no claim).
- **Storage lane:** migration v7 adds `error_ledger` (append-only observation log:
  surface, produced, lemma, error_class, context_sentence_id, created_at, per profile)
  and `error_review_cards` (exists ONLY after the learner accepted an offer; UNIQUE
  (profile, surface, context) so repeat accepts don't fabricate parallel drills).
  Schedules ride the existing `scheduler_state` table under scheduler tag
  `fsrs-spike-0.1.0+error` (own partition, same R02 discipline as `+mined`).
  Export bundle bumped to format v4 carrying both tables; v1–3 stay importable.
- **Offer surfaces (desktop):** dictation/speaking check (`dictation_check_at` →
  `dictation_form_offers` token-pairs target vs heard transcript, only real pairs are
  named) and composition (`grade_writing` → `WritingGrade.offer`). Every offer is an
  explicit `FormErrorOffer` in the result — the card is created ONLY by the
  `error_review_accept` command (never silent). `error_review_queue` replays the exact
  form with its context sentence text; `error_review_grade` rates through the ordinary
  FSRS path.
- **Progression:** `personalize_progression` takes
  `error_recurrence_by_context` as an INPUT ONLY map; counts are capped at
  `RECURRENCE_CAP = 3` and only break ties inside an equal-confidence dimension group.
  Caps and the no-calibration-claims rule (docs/18) unchanged.
- Local-only; no new network calls (sidecar read + local SQLite only).

## DictationAttempt wire change
`content_id` / `profile_id` are `#[serde(default)] Option` fields — old clients/
fixtures keep working; a learner-typed target (no content id) records no ledger row.

## Gate notes for this card
- The legacy-import test `version_1_bundles_remain_importable_without_saved_words`
  hard-coded `format_version == 3`; the export bump to 4 is card-mandated, so the
  assertion was updated to 4 (and the simulated v1 doc now also strips the two new
  fields). This is the card-named contract change, not a weakened gate — the test's
  purpose (v1 stays importable) is untouched.
- Gates: lane-tier only (fmt, per-crate clippy `-D warnings`, per-crate tests); no UI
  TS surface touched, so no tsc/vitest.
