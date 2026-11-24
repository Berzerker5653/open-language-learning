# COPY-POLISH-001 — learner-copy bugs from the 2026-11-23 phone audit

Live violation (state/notes/UI-VERIFY-2026-11-23.md defect 5): phone-viewport
learner copy is broken across surfaces. Five defects, one theme — copy glued
and formatted by accident, never by design.

## Root causes (measured)

- (a) The first-run row glued the group label ("Meet something new") to the pack
  word with no separator — "Meet something newа" at 390px. The join lives in
  the `<li>` composition in home.tsx.
- (b) Home plan prompt and the active-pack badge render all-lowercase labels
  while the rest of the app is sentence-cased.
- (c) Settings "Review posture" rendered one run-on prose row per entry
  ("units: 818 unlabeled") — a label and a value written as a single sentence.
- (d) The gentle-facts line was one raw prose string ("0 days ... · 0 units
  completed") that could wrap mid-phrase at 390px ("0 units / completed").
- (e) The claims list shows "0 kanji entries" on a pack with no kanji data —
  a known-zero count is noise. An unknown count (failed probe) must never hide
  a stat.

## The fix (presentation/copy only; no engine or data-model change)

- First-run rows: an `aria-hidden` " · " join dot between the group label and
  the pack word — two readable words at every width.
- "what to practice now" → "What to practice now"; "learning this language" →
  "Learning this language".
- Review-posture rows: `.posture-label` (quiet ink) + `.posture-value` flex
  row, never run-on prose.
- Gentle facts: each fact its own `.gentle-fact` span, `white-space: nowrap`;
  the line may break only between clauses.
- Claims list: the kanji row renders only when the count is KNOWN non-zero —
  `counts.kanji !== 0`, so a failed probe (null/undefined) keeps the stat.
- A fixture-only latent defect surfaced by the join dot: the journey harness's
  `first_run_steps` label fallback rendered the raw `content_id` when the
  fixture's `word()` lookup missed (sentence ids have no lexicon entry). The
  fallback now prefers the sentence gloss — the fixture emulates the engine
  contract "labels are pack display strings only". This is test tooling, not
  app behavior.

## Evidence gates

- tsc --noEmit: exit 0.
- npx vitest run: 75 files / 663 tests passed (includes the new zero-hide /
  unknown-show kanji pin, the posture label+value pin, the first-run join dot
  pin and the gentle-facts clause pin).
- Live capture (scripts/copy-polish-capture.mjs, lts-serve + fresh profile,
  CDP 390x844 mobile:true): RED 6/6 FAIL at HEAD, GREEN 6/6 at final bytes.
- Copy-changes table (old→new): state/evidence/COPY-POLISH-001/copy-changes.md
