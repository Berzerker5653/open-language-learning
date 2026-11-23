# Progression UX audit — us vs the market (2026-11-22)

Research inputs: market teardowns (Duolingo official blog, Babbel/Busuu/Rosetta/Khan
help docs, GoodXU drops teardown, Memrise release notes, HelloChinese review) + a
read-only code inventory of our Today path (file:line evidence in
`/home/hunter/.hermes/cache/delegation/live/deleg_1f9f9773/task-1.log`).

## What we already match
- Winding single-path track (Duolingo-style sway + dashed connectors) — home.tsx:1021+, styles.css:1416+
- Node states locked / current / in-progress (partial ring) / done ✓ / review-due ⟳ — ahead of most apps' state honesty
- Section headers with friendly name + CEFR subtitle + "x/n units done"
- Collapse to the current section, others fold away
- Review-due re-lighting of done units (SRS on the path — matches Duolingo trophy/review nodes at a basic level)
- Honest completion semantics: done = evidence, not attendance
- "One pin only" policy (broken in practice — PATH-PIN-CONSISTENCY-001)

## Everything the market does that we DON'T

### A. Feel & motion (pure craft, no policy conflict)
1. **No animation at all** — zero @keyframes/transitions on path nodes; rings fill
   instantly, taps have no feedback. Every market app animates ring closes, node
   taps, and scroll settles (Duolingo, Drops, Khan).
2. **No current-node pulse** — Duolingo's active node visibly pulses; ours is static.
3. **Auto-open on the current position** — Duolingo opens the view centered on the
   current node; we open at the page top (auto-scroll exists only after a session).
4. **Floating "jump to my spot" arrow** when the learner scrolls away — Duolingo has it, we don't.
5. **Typed node icons** — Duolingo uses star/dumbbell/trophy/book/headphones per
   lesson kind; HelloChinese alternates content/Pit-Stop units. All our nodes are
   identical circles with text.
6. **Unit guidebook / tap-to-open section jump list** — Duolingo's pinned unit header
   opens a jump list; our headers are inert text.
7. **Characters/illustration along the path** — Duolingo's cast walks the trail;
   Babbel's "growing plant" unit metaphor. We are text-only.

### B. Structure & flow
8. **End-of-unit capstone** — every market app closes a unit with a test/ritual:
   Duolingo trophy node + Legendary challenge, Busuu Checkpoint, Rosetta Milestone
   (spoken conversation!), Khan unit test. We just... run out of nodes.
9. **Skip-ahead proficiency test** — Duolingo/Busuu/Babbel let proven learners jump
   sections; our K-15 placement test exists but never feeds the path position.
10. **Path tailoring** — our order is pack file order verbatim; Duolingo regenerates
    a Daily Refresh tail, Memrise builds paths around goal wordlists, Khan reorders
    recommendations by mastery state.
11. **Pinned floating unit header** while scrolling a long unit.

### C. Motivation layer (⚠ policy territory — ADR-0002 bans these today)
12. **Streaks** (every app except Rosetta) + streak-freeze/repair (Duolingo, Busuu).
13. **XP / points / levels** (Duolingo, Khan mastery points, old Memrise).
14. **Leagues/leaderboards + weekly quests** (Duolingo, Brilliant).
15. **Celebration screens** on lesson/unit finish — we have negative tests banning
    "congratulations" text and XP screens.
16. **Gating currency** — hearts/gems (Duolingo), time-gate (Drops 5-min free tier).
17. **Badges/trophies/certificates** — Busuu's McGraw-Hill certificate is a whole
    retention feature; Khan has 5-tier badges + challenge patches.
18. **Sound cues** — completion chimes everywhere; we have zero audio feedback on the path.
19. **Habit reminders** (Babbel illustrated nudges) — no scheduler-driven nudges today.

## Owner decision (2026-11-22, via dogfood session): **Calm but warm** = option 2.
Celebrate unit completions, show gentle facts (days active, units done), NO streak
punishment/freezes, NO XP, NO leagues, NO hearts. ADR-0002 gets amended to carve out
warm-but-non-manipulative moments; banned-token tests are re-scoped, not deleted.

## Reference material convention for the FEEL work (added 2026-11-22, owner idea)
Every FEEL card carries TWO oracles:
1. TARGET mockups — ours, committed: state/evidence/FEEL-TARGETS-2026-11-22/
2. MARKET contact sheets — real app screenshots from image-search grids, kept LOCAL
   ONLY at ~/design-refs/lts-market/ (third-party images must never enter the public
   repo); attached to the cards via kanban attachments.
Workers match the market's feel using our own tokens + calm-but-warm posture.

## Recommendation split
- **Ship now (A1–A6, B8-lite):** motion pass, pulse, open-at-current + jump-back
  arrow, typed node glyphs, unit-capstone review node (it's pedagogy, not gamification —
  matches Busuu/Rosetta/HelloChinese Pit-Stop, all evidence-based).
- **Owner decision (C):** ADR-0002 was our anti-dark-pattern stance. "Looks and feels
  like the modern apps" is hard to reach at 100% without at least a calm streak +
  unit-completion celebration. Options: (1) keep calm, borrow A+B only [current stance];
  (2) calm-but-warm: non-guilty progress facts (units done, days active with NO
  break-punishment, gentle "come back" nudge) + unit-finish celebration, still no
  XP/leagues/hearts; (3) full market gamification — needs an ADR-0002 amendment.
