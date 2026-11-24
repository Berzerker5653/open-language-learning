# COPY-POLISH-001 — copy-changes table (old → new)

Evidence dir holds red (pre-fix HEAD) and green (final bytes) captures at
390x844 mobile:true, real engine + fresh profile (scripts/copy-polish-capture.mjs).

| # | Surface | Old (red) | New (green) | Proof |
|---|---------|-----------|-------------|-------|
| C1 | Home first-run rows | "Meet something new" + pack word glued ("Meet something newа") | "Meet something new · <pack word>" — a visible join dot keeps the two words separate at every width | capture C1 PASS; home-green.png |
| C2 | Home plan prompt | "what to practice now" | "What to practice now" | capture C2 PASS; vitest pin |
| C3 | Settings active-pack badge | "learning this language" | "Learning this language" | capture C3 PASS; vitest pin |
| C4 | Settings review posture | run-on `"kind: count label"` prose ("lexicon: 4071 AI-generated, unreviewed") | label + value pair (`.posture-label` / `.posture-value`) | capture C4 PASS (all rows label+value, no run-on) |
| C5 | Settings pack claims (RU) | "0 kanji entries" noise on a pack with no kanji data | kanji row hidden when count is a known 0; unknown counts stay visible (`kanji !== 0`) | capture C5 PASS; vitest pin (zero hides, unknown renders) |
| C6 | Gentle facts line | raw prose "0 days with learning so far · 0 units completed" that can wrap mid-phrase | each fact its own `.gentle-fact` span, one line at 390px; line breaks only between clauses | capture C6 PASS; vitest pin (2 span clauses) |

PCA (narrower) notes:
- (a) — the join is a dot separator, never a fixed-width space; `aria-hidden` so screen readers see two words, not a dot.
- (d) — "0 units completed" now never wraps mid-phrase; the facts line MAY break only at the separator.
- (e) — capability-style: a known zero hides the row; an unknown count (null/undefined) still renders, so a failed probe can never silently delete a stat.
