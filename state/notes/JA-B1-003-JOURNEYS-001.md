# state/notes/JA-B1-003-JOURNEYS-001.md — resume recipe

Card: JA-B1-003-JOURNEYS-001. Legacy B1 band de-scaffold + re-journey.
Run 1 (2026-11-20): goal `ja.goal.b1.work-professional` shipped (units 220-234 re-shaped,
new gated revision unit 235). 12 legacy goals remain.

## The recipe (proven green end-to-end on goal 1 — reuse verbatim)

For each remaining legacy B1 goal G (traffic order: media-news, storytelling,
education-academic, technology, culture-tradition, society-rules, environment,
travel-extended, emotions-personality, advice-opinion, comparison-debate,
health-wellness — 15 legacy units each):

1. Verify the goal's units share at least one sentence across consecutive units
   (the transfer/reuse ref-sharing proof). work-professional shared
   `ja.sent.meeting-starts`/`ja.sent.reply-email` in every unit. If a goal's units
   do NOT share refs, the transfer/reuse roles must instead be provided by a new
   per-goal revision unit whose activity refs intersect each unit's refs — the new
   activity naming shared refs is still needed; simplest is to have the revision unit
   reference each unit's own primary sentence.
2. For each legacy unit of the goal:
   - insert `task_sequence` after `estimated_minutes` (roles: input=own `-enc`
     encounter-read; scaffolded=own first `-cloze*`; independent=NEW own
     `ja.activity.<slug>-write` recall/writing support_level 0; transfer=next unit's
     `-listen` (listen-and-choose/listening); reuse=`ja.activity.<goal>-rev-write` in
     the new revision unit). All five roles MUST use running type/modality pairs:
     encounter-read/*, cloze/writing, recall/writing, recall/reading,
     listen-and-choose/listening. NEVER put match/*, recall-choice/*, retrieval/reading,
     scenario/interaction in a role (no engine runner -> task-sequence-unrunnable).
   - units 2+ of the goal: add `requires_unit: [{unit: <predecessor unit id>,
     state: supported}]` (linear ADR-0022 chain; the revision unit requires ALL goal units).
   - `support_level: 5` -> `2` on the encounter activity (one per unit; assert count==1).
   - `generation_contract.allowed_grammar`: set to the concepts the unit's sentences
     actually use (read the unit's `ja.sent.*` allowed_vocab rows in `sentences/*.jsonl`
     and map particles/verb forms to concept ids from `grammar/concepts.jsonl`).
     If activities content_ref a grammar concept NOT in the new list, langpack `test`
     fails `content_outside_generation_contract` — either drop/replace that false
     activity ref (goal 1 did this for ukemi-passive/keigo-soncho/susume-continuity)
     or keep the concept if any sentence genuinely uses it.
   - new final activity appended (activities list is the last block in these files).
   - last unit's transfer = revision unit's `-rev-listen` activity.
3. Create `units/<N>-<goal>-revision.yaml` mirroring `235-work-professional-revision.yaml`
   (id `ja.unit.<goal>-revision`, requires_unit on every goal unit, activities
   rev-listen (2) / rev-cloze (1) / rev-write (0), generation_contract covering its refs).
4. Gates (LANE): the MAIN TREE has a live media writer (FIX-001 bake unit
   lts-b1fix-bake + wake cron e3d99afcc614, until ~2026-11-21 04:00Z) — main-tree
   `test` shows media_asset_missing/media_missing that is NOT this lane. Gate in the
   scratch worktree instead (pattern used run 1):
   `git worktree add ~/.hermes/cache/scratch/lts-j001-wt <main sha>` (run 1's worktree
   still exists with restored media — `git checkout --detach <new main sha>` in it),
   copy this lane's changed unit files in, run the four langpack gates there; then
   also `python3 tools/audit_content_templates.py languages/ja-JP | grep <unit ids>`
   expecting zero task-sequence findings.
5. Evidence: append per-goal rows to
   `state/evidence/JA-B1-003-JOURNEYS-001/after-metrics-2026-11-20.md`; battery output
   to `gates.log` (append, do not overwrite the goal-1 record).
6. Ledger: task-state `JA-B1-003-JOURNEYS-001` stays open until all 13 goals done;
   flip to `done` with evidence paths (before/after/gates.log) +
   `validate_handoff.py --require-explicit-ledger-records` PASS, then
   `ledger(JA-B1-003-JOURNEYS-001): close ...` commit. Pack lane commits per goal:
   `pack(ja): JA-B1-003-JOURNEYS-001 goal <slug> ...`.

## Pitfalls hit run 1

- Sibling WIP rule holds: lexicon/grammar/media/manifest are FIX-001's (dirty tree /
  live bake unit) — never stage them; unit files only.
- The scratch worktree lacks gitignored .wav bytes -> `media_unbuilt`; restore with
  `./scripts/fetch-pack-audio.sh --pack-dir <worktree>/languages/ja-JP --work-dir ~/.hermes/cache/scratch/pack-audio`
  (media dir hardlinked via cp -al is fine too but the fetch script verifies against
  the catalog pins).
- A dead worktree glob trap: copy lane files with absolute source paths and skip
  same-name non-lane units (235-university-system.yaml etc. belong to education-academic —
  number collision! goal-1's new file is 235-work-professional-revision.yaml).
- New activity ids: `ja.activity.<enc-slug>-write` where enc-slug keeps the `-enc`
  suffix (e.g. `ja.activity.interview-prep-enc-write`); grep pack unit files for
  collisions first.
- `hermes kanban` note: this card parked while remaining goals are picked up by
  planner/reconciliation per board protocol.

## Progress ledger

- [x] work-professional (220-234 + 235 revision) — lane commit: see git log pack(ja) JA-B1-003-JOURNEYS-001
- [x] media-news (250-264 + 831 revision)
- [x] storytelling (385-399 + 832 revision)
- [x] education-academic (235-249 + 833 revision) — run 2
- [x] technology (265-279 + 834 revision) — run 2
- [x] culture-tradition (280-294 + 835 revision) — run 2
- [x] society-rules (295-309 + 836 revision) — run 2
- [x] environment (310-324 + 837) — run 2, band COMPLETE
- [x] travel-extended (325-339 + 838) — run 2, band COMPLETE
- [x] emotions-personality (340-354 + 839) — run 2, band COMPLETE
- [x] advice-opinion (355-369 + 840) — run 2, band COMPLETE
- [x] comparison-debate (370-384 + 841) — run 2, band COMPLETE
- [x] health-wellness (400-414 + 842) — run 2, band COMPLETE

## Run 2 addendum (2026-11-20): the transform is scripted

Run 2 replaced the manual per-unit recipe with a script:
`state/evidence/JA-B1-003-JOURNEYS-001/j001_transform.py` (committed copy;
the diff-shape it emits is byte-consistent with run 1's commits). Per goal it
asserts the shared-pair transfer proof, picks a collision-free revision number
(833+) and rev prefix, detects allowed_grammar from sentence romaji, replaces
bogus activity grammar refs with subject-ga, and writes the revision unit.
Run `python3 j001_transform.py <goal-short>` (dry run) then `--apply`.
One battery run covers the whole goal-set (64-file copy into the lts-j001-wt
worktree detached at current main — `git checkout -f --detach` first, the
worktree stays dirty from the previous set; media survives, it is gitignored).
Grammar-detector honesty: conservative romaji-token patterns, ai-assisted
grading; bogus b1.* concepts were never in the units' sentences (all 12 run-2
replacements verified sentence-by-sentence by the script's assertion).


## Band closed (2026-11-20 run 2)
All 13 legacy goals journeyed; card done. Residual known gaps deliberately
out of scope: 821/822 work-notice units keep their legacy support_level-5
activity (scenario-band shape, reviewed clean in JA-B1-003); grammar lists are
ai-assisted romaji-detected (native-speaker pass still open per standing item).
