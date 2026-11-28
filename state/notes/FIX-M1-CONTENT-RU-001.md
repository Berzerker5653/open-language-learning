# FIX-M1-CONTENT-RU-001 — RUN 1 HANDOFF (2026-11-27, iteration-budget death)

## Shipped in commit (code lane, this card):
1. D-008 stress fixes across shards (json round-trip, minimal 22-row diff):
   ru.sent.cp.p26 лесу́, p34 бато́н хлеба́, p35 плачу́ (+cloze re-align),
   lexicon baton reading бато́н, story titles лесу́/саду́,
   media manifest text + words.jsonl tokens + labels.jsonl (incl.
   плачу dat.sg -> impf.pres, сто́ит->стои́т).
2. D-012 gloss rewrites: ru.sent.a2.avtobus-ne-prishol.u003 + ru.sent.cp.p36.
3. Locative sweep found+fixed 2 UNMARKED locatives beyond the pinned list:
   ru.sent.a1.shapka-v-parke.u004 саду́, ru.sent.a2.j2 году (manifest text too).
4. D-013 CONFIRMED intentional: forms=unmarked orthography, readings=marked
   canonical (pack-wide convention, 0 marked primary forms); "pairs" are the
   two surfaces of the same lexeme (some also cross-topic dup lex entries,
   106 groups) — no learner-facing error. Marked form wins (it's the reading).
5. Audio re-bake 6 ids (5 qwen3-tts ono_anna on omarchy + baton via Silero
   v5_6_ru baya, duration 0.650s): ASR gate checked=6 passed=0-mismatch
   (asr jsonl in this card's evidence dir). Manifest rows replaced in place
   with hash-verified copy-back. baton provenance notes corrected (old claim
   "ба́тон is the only possible stress" was WRONG; бато́н).
6. D-004 densify pass 1: 23 a1 units + 128 band-matched cross-claims
   (reuse_cap 3, JA-class target depth 40), allowed_vocab mirrored
   (asserted per unit). on-ramp units untouched (band protection).

## Gates actually run:
- tools/qa_stories.py (.venv/bin/python): 20 stories, 0 FAIL.
- scripts/qa-asr.py local gate: 6/6 passed.
- NOT run (deferred): desktop pack-install test, fresh 30-day sim.

## REMAINING RECIPE (run 2):
1. Desktop dev-pack install test FIRST (allowed_vocab/content_ref validator
   runs in install path, NOT cargo test -p lts-langpack):
   cargo test -p lts-desktop --lib install_bundled_pack_report (or the test
   names that install the dev pack). If red -> revert the enrich commit
   (single commit, data-only) and re-scope densify.
2. D-004 ROOT CAUSE found by RUN 1 measurement (not what the card assumed):
   sentence+lex orphan census = ZERO (RU-SENTENCE-CLAIM-001 claimed all).
   The thinness is UNIT UNLOCK CADENCE: in the fixed 30-day sim RU lessons
   touched only 20 units (12 cyrillic + 5 on-ramp pairs + a1 personal-details),
   new-lesson-per-day [2,4,2,0,0,1,...,3@16,...] vs content pool ~132 a1+cp
   sentences of which 126 were never delivered. Enrichment pass 1 helps only
   if practice/lesson reaches enriched units. Real lever candidates:
   (a) on-ramp band sentence pool is only ~7 sentences — author + claim
   on-ramp-band content into the 20 month-1 units (needs band on-ramp
   authoring, owner-reviewable), (b) investigate unlock cadence itself
   (progression gate), see state/evidence/LEARNER-REVIEW-M1-001/rca-
   progression-starvation.md.
3. Fresh 30-day sim: rm -rf the .sim-data + sim/raw ru logs (keep tar.gz),
   python3 scripts/sim_month1.py --pack ru --days 30; measure unique
   content_id basis (parser: per-day d['calls'], resp dicts, o['content_id']
   only). Baseline was 123; acceptance >=150. Archive logs under
   state/evidence/FIX-M1-CONTENT-RU-001/sim/.
4. gates.log append + ledger commit (task-state FIX-M1-CONTENT-RU-001 done,
   evidence -> gates.log), KANBAN.md row, board complete.

## Omarchy artifacts: ~/LTS/fixru001b*.{wav,log,jsonl}, lts-fixru001b unit
   (baton prev piper take kept as fixru001b-baton.prev-piper on omarchy only;
   wavs gitignored — recovery path = published archives).
