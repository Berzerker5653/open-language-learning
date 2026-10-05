# ja-JP coverage reconciliation proposal (COV-001)

Status: **proposed — pending owner approval** (frozen set unchanged; see
`docs/assessment/RELEASE_COVERAGE.yaml` header: narrowing or re-anchoring the
required set is an owner scope decision with recorded rationale).

Date: 2026-10-05. Prepared by: omp (ai-assisted; curriculum-review qualified
human sign-off required before adoption).

## Problem

`RELEASE_COVERAGE.yaml` (coverage_version 1.0.0, `agreed-owner-2026-10-04`)
freezes 60 required objectives. The ja-JP pack's goal graph
(`languages/ja-JP/curriculum/goals.yaml`, 75 goals) uses a **topic-based**
design (e.g. `ja.goal.a2.health-body`, `ja.goal.b2.philosophy-ethics`),
while the frozen map's A2/B1/B2 rows are **communicative can-do** objectives
(e.g. `ja.goal.a2.give-directions`, `ja.goal.b1.narrate-story`). Only the
on-ramp (5) and A1 (15) rows share ids with the pack; the 40 A2/B1/B2 rows
have no matching pack goal, so `coverage_linkage` cannot pass as written even
though substantial A2/B1/B2 content exists (808 units, 7/7→8/8 gates).

## Options

- **A. Re-anchor linkage (recommended).** Keep all 60 objective statements
  unchanged (no narrowing). Add an `implemented_by: [pack goal ids]` field to
  each A2/B1/B2 row; the coverage gate then requires every row to name ≥1
  pack goal with ≥1 linked unit. Rows with no adequate implementation stay
  `content_status: not-implemented` and the band stays partial until content
  is authored. Preserves the frozen denominator; records the topic-based
  implementation honestly. Requires owner approval (edit to frozen doc).
- **B. Author the missing communicative goals.** Add the 40 objective ids as
  pack goals with dedicated units. High duplication with existing topic
  content; larger review surface. Not recommended.
- **C. Hybrid.** Option A now; author goals/units only for rows verdicted
  `gap` below, as a follow-up content batch (each batch gated by
  structural + ai_screening per REVIEW_POLICY).

## Mapping (verdicts are ai-assisted drafts; curriculum reviewer must confirm)

FULL = a pack goal directly implements the objective; PARTIAL = the function
is taught embedded in topic units but not as a standalone objective;
GAP = no adequate implementation found.

### A2 (14)

| frozen objective | pack implementation | verdict |
| --- | --- | --- |
| a2.describe-past-event | a2.relationships (Memories, Memory prompts) | PARTIAL |
| a2.make-plans | a2.daily-admin (Appointments, Confirming), a2.city-services (time expressions) | PARTIAL |
| a2.give-directions | a2.city-services (Getting around town) | PARTIAL |
| a2.compare-things | (only at B1: b1.comparison-debate) | GAP |
| a2.healthy-life | a2.health-body (Prevention, Healthy habits, Check-ups) | FULL |
| a2.past-experiences | a2.relationships (Memories) | PARTIAL |
| a2.reasons-opinions-simple | a2.weather-seasons (ので/のに), a2.food-cooking (opinions) | FULL |
| a2.requests-favors | a2.communication (Questions, Explaining) | PARTIAL |
| a2.rules-obligation | (only at B1: b1.society-rules) | GAP |
| a2.describe-people-places | a2.relationships (Family), a2.city-services | PARTIAL |
| a2.short-messages | a2.communication (Online communication) | FULL |
| a2.daily-needs-shop2 | a2.shopping-services, a2.city-services | FULL |
| a2.conditional-hypothetical | (たら/ば not taught as an A2 objective) | GAP |
| a2.listen-announcements | a2.city-services (signs) | PARTIAL |

### B1 (14)

| frozen objective | pack implementation | verdict |
| --- | --- | --- |
| b1.travel-situations | b1.travel-extended (itinerary, booking, hosting) | FULL |
| b1.narrate-story | b1.storytelling (structure, sequencing, suspense) | FULL |
| b1.explain-opinion | b1.advice-opinion (opinion structure) | FULL |
| b1.work-school-tasks | b1.work-professional, b1.education-academic | FULL |
| b1.dreams-goals | (no dedicated goal) | GAP |
| b1.agree-disagree | b1.advice-opinion (partial agreement, polite disagreement) | FULL |
| b1.passive-impersonal | (passive not taught as an objective) | GAP |
| b1.giving-receiving-network | (授受 expressions not a standalone goal) | GAP |
| b1.transact-services2 | b1.technology (online services), b1.travel-extended (booking) | PARTIAL |
| b1.read-articles-simple | b1.media-news (reading news, article summary) | FULL |
| b1.write-correspondence | b1.work-professional (reports); full correspondence only at B2 | PARTIAL |
| b1.handle-breakdown | b1.technology (tech problems), b1.travel-extended (booking problems) | PARTIAL |
| b1.emotions-reactions | b1.emotions-personality | FULL |
| b1.compare-perspectives | b1.comparison-debate, b1.culture-tradition (culture comparison) | FULL |

### B2 (12)

| frozen objective | pack implementation | verdict |
| --- | --- | --- |
| b2.argue-position | b2.abstract-debate, b2.politics-governance (public debate) | FULL |
| b2.discuss-abstract | b2.philosophy-ethics, b2.abstract-debate | FULL |
| b2.connected-texts | b2.academic-skills (paragraph structure, formal style) | PARTIAL |
| b2.fluency-interaction | distributed across all B2 discussion goals | PARTIAL |
| b2.register-shifting | b2.nuance-register (politeness scales, indirectness) | FULL |
| b2.summarize-paraphrase | b2.academic-skills (literature review); b1.media-news (summary) | PARTIAL |
| b2.conditionals-advanced | (advanced conditionals not taught as an objective) | GAP |
| b2.passive-causative-complex | (complex passive/causative not taught as an objective) | GAP |
| b2.ambiguity-ellipsis | b2.language-linguistics (meaning context, sentence variation) | PARTIAL |
| b2.authentic-media | b2.media-critique, b2.film-analysis | FULL |
| b2.presentation | b2.academic-skills (data presentation) | FULL |
| b2.style-differences | b2.nuance-register, b2.language-linguistics | FULL |

## Summary

FULL 20, PARTIAL 12, GAP 8 (a2.compare-things, a2.rules-obligation,
a2.conditional-hypothetical, b1.dreams-goals, b1.passive-impersonal,
b1.giving-receiving-network, b2.conditionals-advanced,
b2.passive-causative-complex).

Under Option A/C the band-completeness claim stays honest: A2/B1/B2 remain
partial until the 8 GAP rows are authored and the PARTIAL rows' embedded
coverage is confirmed by a qualified curriculum reviewer.

## Decision requested from owner

1. Approve Option A (re-anchor linkage with `implemented_by`, no narrowing)
   — or C (A now + author the 8 GAP goals/units as a gated batch).
2. Confirm the 8 GAP rows are the real gap list (curriculum reviewer
   validates the FULL/PARTIAL/GAP verdicts).
