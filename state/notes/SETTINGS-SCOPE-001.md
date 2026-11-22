# SETTINGS-SCOPE-001 — contract, decisions, status

## Rule implemented (owner design call, general)
A Settings section renders iff an INSTALLED pack declares the capability in
its manifest: top-level `settings_capabilities:` list of ids
(pattern `^[a-z0-9][a-z0-9._-]*$`, optional; absent = no grant, so packs
published before 2026-11-21 stay installable and show no gated section).
The settings UI derives visibility from the UNION across installed packs —
never a per-language constant, never `locale`, never active-pack-only.

## Decisions (frozen)
- Capability id for the romaji card: `romanization-display`
  (renderer constant `ROMANIZATION_DISPLAY_SETTING` in language.tsx).
- ja manifests (languages/ja-JP, tests/fixtures/packs/ja-demo) declare it;
  ru-RU declares none (the card's ru-side case). EO examples declare none.
- Host path: `InstalledPack.settings_capabilities` read verbatim in
  packs.rs `display_for()` (same shape as `scripts:`/`input_methods:`);
  serve mode inherits it via the shared wire_commands wiring.
- Kana keyboard card keeps its existing SETTINGS-PACK-CAPABILITY-001 gate
  (already declaration-derived; untouched, no double-gating).
- Mic audit item: `/api/capabilities` now reports
  `microphone_names_available` (bool|null from the request Origin:
  https or localhost/127.0.0.1/[::1] = true, other http = false, absent
  Origin = null "cannot say") + `microphone_names_note`. App.tsx grays
  #mic-detect with that reason only when the report says false; desktop
  never consults it.

## Ledger/publication caveat (honest, flagged)
Published archives are immutable: ru 0.4.6 and ja 0.4.3 predate the field,
so a store-installed ja-JP pack shows NO romaji card until its next
republish carries `settings_capabilities` (same pattern as scenario_help).
ja-demo fixture (0.1.0) DOES declare it — used by the acceptance.

## Evidence design (harness lesson applied)
- scripts/settings-scope-capture.mjs <before|after>: phone 390x844, three
  seeded Settings scenarios (#settings-ru RU-only, #settings-ja ja-demo
  installed, #settings-both both w/ RU active). Counts INTERACTIVE
  input[name=romaji-mode] (never body text — WEB-HISTORY-001 lesson);
  nav errors ride into result.json; exits non-zero on any failed check.
  before-expect: romaji present in all three (the bug); after-expect:
  absent only for RU-only.
- BEFORE shots must measure bytes at pure HEAD (bug), AFTER the lane tree:
  both built in isolated worktrees under the controller chain
  (systemd-run unit `lts-settings-scope-ev`, script
  ~/.hermes/cache/scratch/settings-scope-evidence.sh): stage A HEAD build +
  before-capture; stage B HEAD+lane-diff worktree runs tsc + vitest
  (isolates sibling ORTHO WIP); stage C lane build + after-capture.
  DONE markers: STAGE-A-DONE / STAGE-B-DONE / CHAIN-ALL-DONE in the logs.

## Gates (lane tier)
- fmt-check, rust tests (settings_capabilities, capabilities), clippy -p
  lts-desktop: unit lts-settings-scope-rust2 -> logs in this evidence dir.
- tsc + vitest in the isolated lane worktree: stage B logs above.

## Status / resume recipe (RUN 125, 2026-11-21 ~21:5x)
DONE: schema (v0.2), docs/04 line, three manifests, packs.rs field + 2
tests, serve.rs capabilities + origin test, ipc.ts type, language.tsx
type+helper+const, settings.tsx (romaji card gated, mic-detect disabled +
notice), App.tsx (props, serveMicNamesAvailable, union gate), harness
fixtures, settings.test.tsx (2 new tests + fixture base), new journey
settings-scope-gating.journey.tsx, mobile-screens settings-* scenarios,
capture script.
REMAINING (numbered):
1. When unit lts-settings-scope-rust2 is inactive, read
   state/evidence/SETTINGS-SCOPE-001/{fmt-check,rust-packs,rust-serve-caps,rust-clippy}.log;
   fix any lane failure (sibling lib.rs WIP compiles in main tree; if its
   rot turns clippy red, isolate per skill rule 3 — worktree@HEAD baseline).
2. When capture-after.log has CHAIN-ALL-DONE: read
   before/result.json + after/result.json + screenshots; confirm the
   before-run FAILED (bug proven, capture-before.log CAPTURE-BEFORE-EXIT=1
   is the expected red) and after passed all checks.
3. Read stage-B tsc.log/vitest.log EXIT lines; any failure -> fix in main
   tree, re-run just stage B (rerun script from its stage B or a retryN
   unit with a fresh name).
4. Commit lane in main tree, staging ONLY these paths:
   schemas/v0.2/language-pack-manifest.schema.json, docs/04_LANGUAGE_PACK_SPEC.md,
   languages/ja-JP/manifest.yaml, languages/ru-RU/manifest.yaml,
   tests/fixtures/packs/ja-demo/manifest.yaml,
   apps/desktop/src-tauri/src/packs.rs, apps/desktop/src-tauri/src/serve.rs,
   apps/desktop/src/{App.tsx,ipc.ts,language.tsx,language.test.tsx,onboarding.test.tsx,settings.tsx,settings.test.tsx,mobile-screens.tsx},
   apps/desktop/src/journeys/{harness.tsx,settings-scope-gating.journey.tsx},
   scripts/settings-scope-capture.mjs, state/evidence/SETTINGS-SCOPE-001/**.
   NEVER `git add -A` — sibling ORTHO-LETTER-UNITS lane + SESSION-SEQUENCE
   own lib.rs, lesson.*, curriculum/*, harness one-liner (RU placement
   string), and state/task-state.json (they added SESSION-SEQUENCE-001
   record + active_task flip — my ledger edit must be built by json
   round-trip onto THEIR dirty file, keeping their edits).
5. Ledger: ROADMAP.yaml card SETTINGS-SCOPE-001 (surgical patch; acceptance
   bullets plain scalars), task-state record (evidence = existing file
   paths incl. gates.log written by controller), commit
   `ledger(SETTINGS-SCOPE-001): ...`. active_task stays SESSION-SEQUENCE-001
   (that lane owns the in_progress slot in the dirty file).
6. `hermes kanban complete t_2d76f3bf` with shas + evidence paths.
7. Dispose: `git worktree remove --force` the two scratch worktrees
   (stage C leaves them for re-shoots).

## Controller status block — CLEARED (RUN 126, 2026-11-21 ~22:0x)
All units finished; evidence chain v2 (settings-scope-evidence2.sh) rebuilt
the captures after three tooling fixes (vite cwd, worktree re-registration,
hash-only navigation staleness, full-page shots). Code commit 94aeffea;
isolated clippy over the exact commit tree: state/evidence/SETTINGS-SCOPE-001/clippy-commit-isolated.log EXIT=0.

## RUN 126 — SHIPPED (ledger commit follows; card closed)
- Gates + captures: see state/evidence/SETTINGS-SCOPE-001/gates.log.
- before/: bug proven at HEAD (romaji card visible RU-only, 6/6 as
  expected); after/: RU-only clean, ja-demo + union show the card (6/6).
- RED-EXIT=1: lane settings tests fail at HEAD (2 failed | 20 passed).
- Graft blobs (harness.tsx, docs/04) kept the sibling ORTHO one-liner and
  orthography paragraph unstaged for their lane.
