# FEEL-LOADING-001 — ledger record (2026-11-23)

Loading & pending feedback across surfaces (feel audit sections 4-6,9).

## Shipped
- Code: ab9188ed (styles.css skeleton primitives + save-tick; words.tsx loading
  state; settings.tsx loading strip, Saved tick, Installing/aria-busy model
  buttons, PairResult styled live component + single-flight Pair, lanError now
  a real .alert; App.tsx wiring: wordsLoading, settingsLoading, markSettingsSaved
  on the six setters, installingSpeechModel, placementLoading + Starting… button,
  reserved Progress shell). Red contract first: 6710a9d3
  (apps/desktop/src/loading-feel.test.tsx, 21 cases).
- Contract note: state/notes/FEEL-LOADING-001.md; ROADMAP card: 2f205857.

## Proof
- Unit contract: 21 new cases red-at-base green-after; full vitest 65 files /
  564 tests green; tsc, eslint, prettier, audit_learner_copy all exit 0
  (gates.log).
- Real-engine capture scripts/feel-loading-capture.mjs (lts-serve + headless
  Chrome 390x844, 900ms injected bridge latency): RED 7/7 at base, GREEN 7/7
  at HEAD. The red run measured the audit's claims verbatim: stale list mid-
  fetch (stale:true), Pair double-POST (posts:2), unstyled pair message
  (cls:""), install buttons live mid-transfer (liveSiblings:3), Start
  placement enabled mid-fetch.
- Shots: mid-words-skeleton.png (three decreasing-width rows),
  mid-settings-skeleton.png, mid-progress-shell.png, saved-tick.png
  (pale-green "✓ Saved" over the Microphone card), speech-installing.png,
  pair-result.png (alert-styled live message), placement-starting.png;
  base-state shots under red/.

## Notes
- Progress reflow metric: reserved shell holds one stable document height
  while all four reads are in flight; settle = 1 reflow step (base repainted
  per staggered arrival). Skeleton-pulse is *pulse*-named, so the FEEL-GLOBAL
  motion-budget pin stays green; the global prefers-reduced-motion block
  flattens the breathing automatically.
- No owner hands-on pass is required by the card (capture is the oracle);
  the owner's next dogfood rebuild will show all states live.
