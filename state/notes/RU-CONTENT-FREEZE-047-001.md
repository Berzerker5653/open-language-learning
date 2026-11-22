# RU-CONTENT-FREEZE-047-001 — ru content freeze for the 0.4.7 publish

## Freeze declaration

Effective 2026-11-21 (this card): **no further ru-RU content edits** (sentences,
lexicon, stories, drill text) in the window between this card's audio repairs
landing and the ru 0.4.7 archive being published + re-pinned in
`catalog/packs.json`. Rationale: the manifest row hashes and the published
archive bytes must agree at the moment the RC is built; a content edit inside
the window re-opens the restore-red this card exists to close.

The freeze lifts when the 0.4.7 entry in `catalog/packs.json` is pinned and the
CI 'Restore reference-pack audio (published archives)' legs go green. Any
content work desired inside the window goes to a follow-up card targeting 0.4.8.

## Scope executed under this card

1. Re-bake of the 8 sentence ids whose text/stress changed in c347aa2
   (list frozen in state/notes/CONTENT-QA-STORIES-001.md):
   ru.sent.a2.avtobus-ne-prishol.u005, ru.sent.a2.telefon-v-taksi.u005,
   ru.sent.b1.pismo-ne-temu.u001, ru.sent.b2.dva-bileta-v-odin-teatr.u002,
   ru.sent.b2.spor-o-budushchem.u001, ru.sent.cp.p34, ru.sent.cp.p37,
   ru.sent.cp.p11.
   All re-baked on the pack narrator (qwen3-tts / ono_anna, per
   media/narrator.json); ru.sent.cp.p37 was additionally an off-voice piper row
   and is now back on the pack narrator. Gate: qa-asr.py production audit,
   8/8 ok (state/evidence/RU-CONTENT-FREEZE-047-001/asr-rebake2.jsonl);
   p37 passed via bake-bestof K=8 ladder (bestof-p37.jsonl).
2. Repair of the 20 pre-existing ru.lex.stories202611 drill clips failing gate
   v5 (8 duration-suspect + 12 ratio-mismatch; full rows in
   state/evidence/RU-STORIES-MEDIA-001/asr-verify.jsonl). Method per owner
   policy: Piper multi-voice ladder first (18/20 took a first-pass piper
   winner), bake-bestof K=8 fallback for the 2 residuals (fonar final-ь class,
   foye) — both solved within K. All 20 re-audited green by the production
   gate (asr-drift2.jsonl 20/20 ok); 18 repaired clips now speak on piper
   voices (owner-approved drill mixing), fonar+foye on the pack narrator.
3. Freeze recorded here; publish = ru 0.4.7 per
   lts-pack-audio-qa references/pack-release-publication.md (RC built in an
   isolated detached worktree — sibling lanes hold WIP).

## Publish status

2026-11-22: ru 0.4.7 published (immutable release
`org.openlanguage.ru-ru.reference-0.4.7`, asset sha256
`b2f564a8eb3b88f0632c4a3909468e12a8a539b31ddd9afe47bf1a883f6050f2` equals the
catalog pin; RC evidence in `state/evidence/RC-0.4.7-2026-11-21/`). The freeze
lifts when the CI 'Restore reference-pack audio' legs go green on the run after
the catalog re-pin commit lands.

2026-11-22 FREEZE LIFTED: CI run 44999277611 (head 61c3ee1) shows every
'Restore reference-pack audio' leg green (ru 0.4.7: rows checked=5032, valid
5032, failing 0) and rust-conformance fully green; the only run-red is the
pre-existing web `pnpm fmt:check` drift owned by the desktop/web lanes
(`state/evidence/RU-CONTENT-FREEZE-047-001/ci-watch.txt`). ru content edits
are allowed again.

## Native spot-audition flags queued for the reviewer (do NOT block publish)

From RU-STORIES-MEDIA-001 (gate passed, soft-sign homophone risk):
ru.lex.stories202611.pet (Пять), .vyhodit (Высадить), .goryachiy (горячие).
Also newly re-baked by this card: any ladder-repaired drill clip uses a Piper
voice (owner-approved mixing for isolated drill snippets only).
