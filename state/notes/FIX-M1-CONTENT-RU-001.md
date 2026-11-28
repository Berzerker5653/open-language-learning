# FIX-M1-CONTENT-RU-001 — RUN 2 HANDOFF (2026-11-27, partial at wall-clock budget)

## SHIPPED (commit 04bdd7c8 = full run-1 WIP, re-verified hunk-by-hunk in run 2):
1. D-008 stress fixes across shards (json round-trip, 22 semantic rows):
   ru.sent.cp.p26 лесу́ (cloze re-aligned), p34 бато́н хлеба́, p35 плачу́,
   lexicon baton reading бато́н, story titles лесу́/саду́,
   media manifest text стои́т + words tokens + labels (плачу dat.sg->impf.pres).
   Sweep additions: ru.sent.a1.shapka-v-parke.u004 саду́, ru.sent.a2.j2 году́.
2. D-012 gloss rewrites: ru.sent.cp.p36 + ru.sent.a2.avtobus-ne-prishol.u003.
3. D-013 CONFIRMED intentional (forms=unmarked orthography, readings=marked
   canonical; pack-wide convention; marked form wins — it IS the reading).
4. Audio re-bake 6 ids (5 qwen3-tts ono_anna omarchy + baton Silero v5_6_ru);
   ASR 6/6 (asr-rebake.jsonl). Manifest rows hash-verified.
5. D-004 densify pass 1: 23 a1 units + 128 band-matched cross-claims,
   allowed_vocab mirrored (asserted). On-ramp units untouched.

## GATES VERIFIED (run 2, log = state/evidence/FIX-M1-CONTENT-RU-001/gates.log):
- tools/qa_stories.py: 20 stories, 0 FAIL.
- DESKTOP INSTALL TEST GREEN: `cargo test -p lts-desktop --lib -- reference
  bundled installs_and_records placement_question` -> 14 passed / 0 failed.
  (The `install_bundled_pack_report` name in run-1 recipe is the lib FUNCTION,
  not a test; the tests that exercise the install validator are the
  reference/bundled ones above.) Revert trigger did NOT fire — densify stays.
- Fresh 30-day sim RU: 123 unique content_ids (baseline 123; target >=150).
  Raw logs in sim-ru-30d-raw.tar.gz. PITFALL: lts-serve bin needs
  `--features serve`; sim call shape is {cmd,args,resp} (day-1 onboarding
  uses {cmd,value}) — parser must walk 'resp' with .get fallback.

## REMAINING RECIPE (run 3) — only the >=150 bullet:
1. PASS 2 RE-SCOPE (the whole delta): pass-1 claimed into 23 a1 units but the
   30-day learner unlocks only 20 units on the chain
   cyrillic goals -> on-ramp greetings/self-intro/everyday -> a1
   personal-details-01..05 (see gates.log MEASURED block; day-30 in_progress =
   greetings-01, self-intro-01/02, everyday-01). Home/routines/shopping/city/
   time-plans claims are dead weight inside month 1.
   - Move/add band-matched claims onto the ACTUAL chain: the ~60-entry
     lexicon/personal.jsonl is the biggest unclaimed pool feeding the units
     that ARE current on d30; check which personal.* ids are already
     content_refs in 020/021/022 + on-ramp units, claim the rest via new
     enrich activities (copy the run-1 enrich-activity shape + allowed_vocab
     mirror). Lexicon rows carry NO band field — band is inherited from the
     claiming unit's goal band; keep a1 claims in a1 units (band rule).
   - Story/scenario pools: story_view contributed 21 uniques — cheap.
   - Days 4-15 dead zone (zero new material, cyrillic refs stop being
     served) is ENGINE scheduling, NOT content — do not try to fix it in a
     content lane; if it caps the reach, report the measurement and reference
     state/evidence/LEARNER-REVIEW-M1-001/rca-progression-starvation.md.
2. Re-run gates: qa_stories + desktop install filter above + fresh sim
   (rm .sim-data/ru, build serve --features serve, sim_month1.py --pack ru
   --days 30 --out .../sim, then tar.gz raw + rm sim/).
3. Ledger: task-state FIX-M1-CONTENT-RU-001 -> done with gates.log evidence,
   KANBAN.md row, board complete. If still <150 after honest pass 2: honest
   partial per lane-skill (status blocked, blocker with numbers, board block
   needs_input — the >=150 figure may belong behind the dead-zone fix).

## Board: card t_24484021 (attempt 2 of board card; attempt 1 = iteration-cap
death whose entire WIP is the 04bdd7c8 commit above — NEVER re-apply run-1).
