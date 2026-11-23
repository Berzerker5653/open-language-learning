feat(progression): every section ends with a capstone review node (UNIT-CAPSTONE-001)

Engine-synthesized checkpoint per band section (Busuu Checkpoint / Rosetta
Milestone / HelloChinese Pit Stop pattern, PROGRESSION-UX-AUDIT-2026-11-22
B8-lite): capstone.<pack>.<band-key> node rides the unit_path wire LAST in
its section, locked until every unit of the section is done, ring = honest
pool coverage. capstone_plan serves a deterministic, capped (16),
letters-first interleaved mixed recall of the section's orth+lex refs
through the existing session runner; capstone_complete recounts the recall
engine-side from attempt-grouped evidence and records the attempt pass OR
fail (honest in-progress state on failure). Storage v11: capstone_attempts;
done reads only passed rows. Pass rule: pool >= 4 needs 80% (5*correct >=
4*items), smaller pools need a clean sweep. Pedagogy, not gamification
(ADR-0002): no XP, no celebration copy — the counter flips ("N/M done",
not "units done") and plain words carry the state. Frontend: flag glyph,
44px "Start section review" control, calm result line (role=status),
re-recorded banner.

Tests: lts-storage round-trip + v11 artifact; lts-desktop full ladder on
the real RU pack (lock -> section done -> fail/in-progress -> pass/done),
plan determinism + cap + interleave, pass-rule boundaries; vitest capstone
render posture suite (505/505).
