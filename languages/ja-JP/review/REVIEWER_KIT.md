# Japanese Content Reviewer Kit

What we ask for and how to record it, per `review/REVIEW_POLICY.yaml`
(policy_version 1.0.0). Review is a gate on TRUST, not a favor: content stays
labeled draft until reviewed.

## Why a human is required

Automated checks and AI screening (including multi-model AI consensus) find
structural and many surface defects, but they cannot certify naturalness,
register, or pedagogical suitability, and the project's quality rules forbid
AI self-certification of qualified review. Your judgment is the thing we
cannot synthesize.

## What we ask (pick the smallest that fits you)

| Track | You need | Workload (typical batch) |
| --- | --- | --- |
| Linguistic | native/near-native Japanese + (linguistics/phonetics or Japanese-teaching background) | 30-60 min per batch of ~20 items |
| Pedagogical | language-teaching or curriculum/assessment experience (+ Japanese ability) | 45-90 min per batch |
| Technical | engineer + Japanese ability; listen to lesson audio in context | 30-60 min per batch |

Batches are keyed to one goal cluster (e.g. "shopping"), include schema-
validated YAML, and each item shows: Japanese form, gloss, context/register,
prerequisites, and what the learner is asked to do.

## What we do NOT ask

- No personal details publicly: you review under a pseudonym; public
  attribution only with explicit consent.
- No access to learner data. Review is of content files only.

## How to record a review (the GitHub flow)

One PR per batch. In it:

1. Add your review record(s) to `languages/ja-JP/reviews.jsonl` — one JSONL
   line per reviewed item, e.g.:

   ```json
   {"id":"rev-2026-10-05-ana-1","target_id":"ja.lex.food-drink.sushi","reviewer":"yuki-p","reviewer_category":"community-reviewer","scope":"gloss, form, register","date":"2026-10-05","outcome":"approved","notes":"natural as written"}
   ```

2. In the SAME PR, flip each approved item's `"status"` from `"draft"` to
   `"validated"` (community/qualified reviewers) or `"verified"` (qualified
   human experts only).

3. `reviewer_category` must be honest: `community-reviewer` for engaged
   volunteers, `qualified-human-expert` / `qualified-human-native-speaker`
   only if you genuinely meet the categories in `REVIEW_POLICY.yaml`.
   `ai-assisted` records document screening and never promote content.

CI runs the pack validator: a status flip without a qualifying approved
record fails (`review_promotion_unsupported`) and cannot merge. Merging
your PR is what switches the content to "reviewed by <your pseudonym>" —
the record names who did it. Severity scale: P0 materially wrong
instruction / P1 major path broken / P2 localized defect / P3 cosmetic;
use `changes-requested` or `rejected` outcomes with notes instead of
flipping status — a "no" is a valuable result.

## Free recruitment paths (owner options, none engaged yet)

- University Japanese programs: service-learning or practicum review
  assignments (instructors often welcome real-world material review).
- Community: language-learning communities (e.g. forums/subreddits) with
  explicit "volunteer qualified reviewer" calls; qualifications verified via
  the categories in REVIEW_POLICY.yaml, not self-claim alone.
- Professional: paid review via translation/education marketplaces if the
  owner budgets it (out of scope until authorized).

## Current status

BLK-REVIEW-CAPACITY (open since 2026-10-04): no qualified reviewer engaged.
AI multi-model screening runs as an acceleration layer only; it never
promotes content past `screened`.
