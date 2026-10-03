# Scheduling research note: FSRS implementation options (LEARN-003)

Date: 2026-10-02. Scope: memory scheduling (Layer A, docs/03 §7) for
discrete retrievable items. This note compares *maintained* FSRS
implementations and their licenses; it does not adopt one. The spike in
`crates/scheduler` is a dependency-free FSRS-style model behind our own
interface so the production choice stays swappable.

## Candidates (accessed 2026-10-02)

| Option | License | Status | Notes |
| --- | --- | --- | --- |
| `fsrs-rs` (open-spaced-repetition/fsrs-rs; crate `fsrs`, v6.x) | BSD-3-Clause | actively maintained (437★, optimizer + scheduler) | Reference Rust implementation; optimizer pulls the `burn` ML stack — heavy for a desktop binary; scheduler core is usable without optimization. |
| `rs-fsrs` (open-spaced-repetition/rs-fsrs) | MIT | maintained but smaller (50★), scheduler-only | Lighter dependency tree; fewer features (no optimizer); same OSR community. |
| `ts-fsrs` (open-spaced-repetition/ts-fsrs) | MIT | actively maintained | TypeScript; relevant only if scheduling moved into the UI layer — it must not (engine owns scheduling). |
| `fsrs` (Py) / `fsrs4anki` | MIT / BSD | active | Python; benchmark/validation reference only, not a runtime option. |

FSRS itself is described in the OSR community docs as descending from
MaiMemo's DHP model (a DSR variant); parameters are learnable from
review history. Sources:
- https://github.com/open-spaced-repetition/fsrs-rs (README/LICENSE, accessed 2026-10-02)
- https://github.com/open-spaced-repetition/rs-fsrs (accessed 2026-10-02)
- https://docs.rs/fsrs/latest/fsrs/ (accessed 2026-10-02)
- https://github.com/open-spaced-repetition (accessed 2026-10-02)

## Decision for the spike

- Own trait `Scheduler` in `crates/scheduler`; the spike implements an
  FSRS-shaped model (stability, difficulty, retrievability with power-law
  forgetting curve, DSR-style rating mapping) with **fixed default
  parameters**, deterministic under a test clock. No RNG in the core
  path, so "seed" determinism is trivially satisfied.
- Ratings come only from valid scored retrieval outcomes; an unscored
  attempt is never a failed review (docs/03 §7).
- Scheduling is per-item due-time based. There is no daily attendance,
  streak, or "review all cards today" objective (ADR-0002).
- Production adoption of `fsrs-rs` (BSD-3-Clause) is the leading
  candidate once per-user parameter optimization is worth the `burn`
  dependency; until then fixed parameters + our interface keep the
  option open. License review before vendoring is required (LIC-001
  adjacency: third-party code license inventory).

## Explicit limits

- FSRS retrievability/stability must never grant communicative mastery
  or determine a Can-do band (docs/03 §7); mastery comes only from the
  versioned mastery policy (LEARN-002/005).
- Fixed default parameters are engineering placeholders, not calibrated
  per-learner values; calibration requires per-user review history and
  is a post-1.0 concern.
