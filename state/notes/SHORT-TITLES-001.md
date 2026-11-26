# SHORT-TITLES-001 — short task-card phrasing for goal/unit descriptions (U2 take-two)

Source: docs/ui-review-2026-11-23.md — recommendation #1 (ranked first, small effort, high visible impact): "Goal titles are full requirement sentences … Duolingo/Babbel/Quizlet use short task-card phrasing. This is the largest remaining copy-hygiene gap." Follow-on to UI-HYGIENE-001 (done).

Scope (pack content, ride next publish):
- Shorten the `description` of every goal + unit in languages/ja-JP/curriculum/goals.yaml + units/*.yaml to short task-card phrasing (what the learner will do, not the full requirement). Keep meaning honest — do not invent requirements that don't exist; do not drop required-concept claims.
- The rendered title surface (wherever goals/units surface as titles — check progress/path/Today) stays unchanged except for the shortened text.
- Parity: ru-RU gets the same treatment (ru.goal.* descriptions are equally long, e.g. "Recognize and copy every printed Cyrillic letter, one sound per letter, and interpret the teaching stress mark.").

Not in scope: layout redesign, pack re-publish (bytes change ride the next scheduled republish — same pattern as RU-GOALS-SCRUB-001), README/release claims, gate loosening.

Acceptance:
- No goal/unit description is longer than one sentence (target ~12 words); meaning preserved (spot-check parity both languages).
- Pack gates pass (cargo run -q -p lts-langpack-cli -- validate languages/<pack> --mode install: 0 errors; info warnings unchanged).
- Evidence: state/evidence/SHORT-TITLES-001/gates.log with the before/after description counts per language.
