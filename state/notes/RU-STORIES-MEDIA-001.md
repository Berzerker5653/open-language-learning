# RU-STORIES-MEDIA-001 — media rows for the 14 new stories202611 lexicon entries

Status: shipped run 1 (code = manifest + wavs lane commit; see state/evidence/RU-STORIES-MEDIA-001/gates.log).

## What happened
c347aa2 (CONTENT-QA-STORIES-001) added 14 retro-gloss lexicon entries
(ru.lex.stories202611.{baton,goryachiy,nachinatsya,nakupit,odevatsya,pahnut,
pet,ptichka,svetit,varit,vetka,vyhodit,yarko,zarya}) with no audio rows; the
ADR-0024 coverage gate (script-tagged lexicon entries are audio-addressable)
turned rust-conformance red with media_asset_missing.

Resolution chosen by the engine contract, not by weakening the engine: bake
drill audio. 14 Piper multi-voice ladder takes (marked readings; baton fed
unmarked — espeak G2P broke on U+0301, single attested stress), all 14
gate-verified from the recorded rows (qa-asr verdict + duration cap), rows
recorded with synthesizer {runtime,model,voice} law. validate/lint/test
languages/ru-RU all 0 errors in a HEAD worktree with the fully built media
tree (CI-equivalent); the identical run with the HEAD manifest reproduces the
exact CI red (media_asset_missing x14) — red->green proven on the same bytes.

## Open threads (live on the follow-up card)
1. CI rust-conformance ru leg stays red until an ru 0.4.7 publish: the CI
   restore fetches wavs from the pinned 0.4.6 archive which predates these
   rows; fetch-pack-audio.sh will name them unrestorable. Do NOT publish
   before content freeze (docs/13 lesson).
2. 8 sentence ids with changed text/stress must be re-baked first
   (list in state/notes/CONTENT-QA-STORIES-001.md).
3. 20 pre-existing ru.lex.stories202611 clips from the 2026-11-18 batch fail
   the current gate v5 (8 duration-suspect + 12 ratio-mismatch; rows in
   state/evidence/RU-STORIES-MEDIA-001/asr-verify.jsonl) — repair candidates
   for the same 0.4.7 cycle, not introduced by this lane.
4. Native spot-audition flags (gate passed, soft-sign homophone class):
   ru.lex.stories202611.pet ("Пять"), .vyhodit ("Высадить"), .goryachiy
   ("горячие").

## Repro recipe
bake: scratch runner mirroring scripts/piper-bestof.py (report committed);
apply: append rows (synthesizer law); verify:
`cargo run -p lts-langpack-cli -- validate|lint|test languages/ru-RU` in a
HEAD worktree with languages/ru-RU/media symlinked to the built tree.
