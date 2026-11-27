# FIX-M1-PROGRESSION-001 — notes contract (restored)

Restored 2026-11-27 by FIX-REVIEW-PROG-LEDGER-001 (REVIEW-FIX-M1-PROGRESSION-001 finding S4: this
file was expected by the card convention but never committed). The acceptance contract below is the
frozen `== Card ==` body of board card t_ead922d2, verbatim.

Erratum 2026-11-27: the "60-day" run-length claim in the completion records is wrong — the sim ran
30 days, as contracted; acceptance stands. See
state/evidence/REVIEW-FIX-M1-PROGRESSION-001/erratum-60-day.md.

---

Card: FIX-M1-PROGRESSION-001 (P1) - Month-1 content starvation: after day 1 the engine feeds the learner NOTHING NEW.

READ FIRST (frozen RCA, do not re-derive):
- state/evidence/LEARNER-REVIEW-M1-001/rca-progression-starvation.md
- state/evidence/LEARNER-REVIEW-M1-001/defects.md (entry D-001)
- state/evidence/LEARNER-REVIEW-M1-001/sim/raw/ (day logs; also sim/raw-ru.tar.gz + raw-ja.tar.gz)

Measured: a from-zero simulated learner receives 6 unique practice items total across days 1-30 in RU (then 100 percent weak-skill reviews of those 6 forever; current_offer null every day); 15 in JA. RU unit cyrillic-a-o-m-t stuck refs_done 3/4 - the letter t-cyrillic is never served; JA kana-hiragana-vowels-ko 3/10; 10 RU / 42 JA units unlocked but starved.
Root cause (apps/desktop/src-tauri/src/lib.rs): progression_items() near line 2608 accepts only UNTOUCHED goals and emits only first required concept + first modality; add_new_item_candidates() near line 2910 lexicon pool is fully filtered by locked_new_content / goal_locked_new_content behind never-finishable gate units. Net: the NEW pool is provably empty from day 2.

Fix direction (design decision is yours; the acceptance list is the contract):
- NEW selection must be per-activity content_ref not-yet-introduced inside UNLOCKED units (including the current unit's own unscheduled refs - the missing-letter case), not per-untouched-goal.
- Keep ADR-0022 K-70 phase-gate + goal band-edge locks and the learned-kana filter intact - the bug is the untouched-goals funnel, not the gates.
- Reviews of already-introduced items stay untouched.

Acceptance:
1. Red-first unit tests pin: an item of an unlocked unit with no evidence is NEW-eligible after the goal already has other evidence (missing-letter case); gated units' items stay locked (K-70 regression pin).
2. Fresh-data sim walk: LTS_SIM_DATA=/tmp/sim-fix-m1-ru python3 scripts/sim_month1.py --pack ru --days 30 --out /tmp/sim-fix-m1-ru, then the ja variant. Day-30 yields at least 60 unique RU / 40 unique JA practice item_ids, at least 3 non-cyrillic (RU) / non-kana (JA) units with refs_done greater than 0, and current_offer non-null by day 5. Archive both day logs + the run stdout under state/evidence/FIX-M1-PROGRESSION-001/.
3. LANE gates green and logged to state/evidence/FIX-M1-PROGRESSION-001/gates.log: cargo fmt --all --check; cargo test -p lts-desktop (full lib); cargo clippy -p lts-desktop --all-targets -- -D warnings; npx tsc --noEmit + npx vitest run if any FE file touched.
4. Ledger commit per convention (code commit + ledger commit; task-state row + ROADMAP card pre-existing - see state/task-state.json entry FIX-M1-PROGRESSION-001).
When this card lands, LEARNER-REVIEW-M1-001 auto-resumes and re-runs the audit passes on the REAL month-1 inventory.

---

DISPOSITION: **DONE 2026-11-27** — code 87786961, ledger 25757ff3. Per-unit NEW-material selection + rotating letter-drill families. Acceptance met at the contracted 30-day sim (see erratum); evidence state/evidence/FIX-M1-PROGRESSION-001/.
