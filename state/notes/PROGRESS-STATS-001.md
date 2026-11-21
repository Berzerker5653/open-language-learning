# PROGRESS-STATS-001 — progress instruments (U7/U14)

## What shipped (2026-11-21)

### Acceptance 1 — per-modality progress bars
- Rust: `GoalDimensionView.progress_pct` (apps/desktop/src-tauri/src/lib.rs) —
  `state_progress_weight` + `concepts_progress_pct`: the mean ladder weight of
  every concept the goal declares (unseen=0 ... retained=100). One untouched
  concept always holds the bar down (R09 honesty in visual form).
- Frontend: `GoalMap` in apps/desktop/src/home.tsx renders a dependency-free
  SVG bar per dimension with `role="progressbar"`, `aria-valuenow/min/max`,
  and a human `aria-label` ("{modality} toward {goal}: N% of the gate") —
  same semantics SessionChrome is tested for.

### Acceptance 2 — readable grows-with references
- Rust: `world_state` `missing` changed from raw `"{content_id} ({modality:?})"`
  strings to `WorldMissing { target, modality, label }`; `label` resolves the
  driving item through the active pack's own lexicon (`pack_label_index`).
- Frontend: the locked-place note renders `modalityLabel + "in “label”"`,
  falling back to `humanizeToken(target)` only when the engine abstains; the
  raw id never renders inline (stays on the wire as the word/goal-card lookup
  target). Test asserts both raw ids are absent from the rendered page.

### Acceptance 3 — stats strip above the capability tree
- Rust: new `memory_stats` command (`memory_stats_at`): due-today count over
  both schedulers up to end of today UTC, engine-priced minutes
  (PlannerConfig::review_seconds), per-band retention (mean FSRS
  retrievability of the band's scheduled concepts; abstention `None` when a
  band has nothing scheduled), and 12-week per-day evidence counts
  (new `Store::evidence_event_days` in crates/storage/src/evidence.rs).
- Frontend: apps/desktop/src/memory-stats.tsx — `MemoryStatsStrip` +
  `ActivityCalendar`, rendered in App.tsx between CanDoSummary and GoalMap
  on the progress route; a failed stats read stays silent, never breaks the
  page. n=1 instrument framing is in the component's own label and copy
  ("instruments ... not a grade or a certificate").

### Acceptance 4 — SVG + a11y contract
- Zero new runtime dependencies (memory-stats imports only ./home;
  asserted by test). Bars/calendar are inline SVG; calendar contrast comes
  from strokes + lightness steps, not hue (packages/ui/src/styles.css).
- Tests: home.test.tsx (progressbar semantics + raw-id-absent grows-with +
  R09 agrees with the bar), memory-stats.test.tsx (6 tests incl. "no 0%
  invented" and instrument framing), Rust `gate_progress_averages_concept_ladder_weights`,
  `memory_stats_reports_only_this_profiles_local_data`, extended
  `world_unlocks_follow_pack_declared_capabilities` (label + target).

## Gates (LANE tier)
- npx tsc --noEmit: clean.
- npx vitest run: 53 files / 426 tests passed (includes new memory-stats suite
  and updated home/harness fixtures).
- cargo: see state/evidence/PROGRESS-STATS-001/gates.log.

## Takeover note (run 101, 2026-11-21)
Run 100 hit the 80/80 iteration budget with this lane complete but
uncommitted (its only evidence file was a clippy.log from a malformed
`-D warnings` invocation — never actually ran). Run 101 re-ran the whole
battery personally (all green; unit tally in gates-run.txt) and fixed two
clippy nits in memory_stats_at on top: useless_conversion at the
est_minutes multiply, and sort_by -> sort_by_key for the band ordering.
No further implementation steps are pending; the card shipped in commits
code + ledger on 2026-11-21.
