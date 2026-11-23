# ADR 0002 — No Streak-Based Engagement

Status: Accepted (amended 2026-11-23 — calm-but-warm carve-out below)

## Context

Streak mechanics can incentivize the learner to perform the easiest possible activity to preserve a number, decoupling product success from learning.

## Decision

Do not implement streak counters, freezes, daily-loss penalties, or equivalent loss-aversion mechanics. Support short meaningful sessions selected by learning value.

## Amendment (2026-11-23): the calm-but-warm carve-out

Owner decision 2026-11-22 (PROGRESSION-UX-AUDIT-2026-11-22.md, option 2), after a dogfood session against market apps. The anti-manipulation core stands unchanged; the amendment carves out warmth that cannot be turned into a lever.

**Allowed:**

- A unit-completion celebration moment: when a section's capstone review passes, one quiet card names what was completed, the honest evidence behind it, and what comes next. Honest warmth only — no confetti-theater language.
- Gentle facts: days active with learning, units completed, time learned — presented as memory, never as debt. Explicitly with NO break-punishment: no consecutive-day run, no freeze or repair, no "don't lose it" framing, no daily quota.
- An optional soft sound cue on completion (permitted by this amendment; not shipped as of writing — see state/notes/WARM-MOMENTS-001.md).

**Still banned:** XP/points, hearts/lives, leagues/leaderboards, streak counters and streak-freeze/repair, urgency or scarcity copy, and any mechanic whose value can be lost by absence. A "days with learning so far" count is durable arithmetic over recorded history — it can never reset, so it is not a streak wearing a softer name.

## Consequences

Engagement design must rely on capability, world/scenario progression, goals, and useful feedback rather than daily-presence pressure. Warmth is allowed exactly where absence costs the learner nothing.

## Alternatives

Retrospective rationale added during handoff review; the accepted decision is unchanged. Daily streaks and trivial attendance rewards were rejected because they can be preserved without meaningful learning. An undifferentiated XP ladder would also obscure modality and capability evidence. Capability/scenario progression preserves the existing decision. Full market gamification (audit option 3) was rejected outright; the calm stance (option 1) was superseded by the owner's chosen middle (option 2), which this amendment records.
