# ARCH-HOTSPOT-2026-11-27 — home.tsx path-feature entanglement (option b: analysis filed)

## Scan method + measured findings

`git log --name-only --since='14 days'` over 512 commits, file frequency with
docs/state/tasks/manifest rows excluded:

```
52  apps/desktop/src/App.tsx
42  packages/ui/src/styles.css
42  apps/desktop/src-tauri/src/lib.rs
30  apps/desktop/src/home.tsx          <- hottest NOT-yet-addressed file
20  apps/desktop/src/journeys/harness.tsx
16  apps/desktop/src/path-view.test.tsx
15  apps/desktop/src/home.test.tsx
10  apps/desktop/src/settings.tsx
```

Prior ARCH picks (already addressed, excluded per card rule):
lib.rs command-table (11-22), styles.css rule duplication (11-23), App.tsx
settings-save wrappers (001 + fixed 11-25), settings/onboarding serve POST-JSON
(11-26). App.tsx/lib.rs/styles.css therefore skip; **home.tsx (30) is the pick**.

Duplicate-block scan (normalized-whitespace, drop-blank line-run intersection)
over ALL non-test `apps/desktop/src/**/*.ts{x}`:

- **Intra home.tsx: zero 6+ line duplicate blocks.** The 5-line hits are JSX
  closing-tag sequences (`</small></p></section>);}`), i.e. structure noise,
  matching the 11-26 finding for the extracted view modules.
- Cross-file K=7 clusters found but NOT the pick (lower churn files / different
  semantics): pronunciation/dictation record-controls, a 4-file alert/notice JSX
  idiom (scenario/settings/error-review/words), history-screens/mobile-screens
  fake-bridge shim, free-speaking/free-writing prompt-error block. Recorded here
  for the next scan; one hotspot per card.

## Hotspot: the unit-path feature lives inside home.tsx

The whole "Today path" product surface — 16 symbols, ~832 lines = **41% of
home.tsx** (2,025 lines) — is defined inside the file that names the Home
screen: `home.tsx` lines 1074–1905 (plus shared `bandHeader` 1055–1073):

| symbol | line | kind |
|---|---|---|
| UnitPathNode | 1074 | interface (wire type of `unit_path`) |
| NextOffer | 1109 | interface (wire type of `current_offer`) |
| offerLabel | 1119 | helper |
| pathSections | 1145 | helper |
| pathOrderRank | 1181 | helper (module-private) |
| pathNodeState | 1193 | helper |
| PATH_KIND_NAMES | 1206 | const |
| PathGlyph | 1219 | component |
| PATH_SWAY_AMP_PX / PATH_ROW_PITCH_PX / pathSway / pathTypedLetterGlyph | 1294–1317 | geometry consts/helper |
| PathLockGlyph | 1319 | component |
| CapstoneResult | 1333 | interface |
| PathView | 1356–1905 | component (~550 lines) |

Churn attribution (the cost of the entanglement, measured): **13 of the 30
home.tsx touches in 14 days are path cards** — PATH-VIEW-001, PATH-WHATSNEXT-001,
PATH-VISUAL-001, PATH-SECTIONS-DEDUP-001, FIX-PATH-VISUAL-001-1, PATH-PIN-CONSISTENCY-001,
PATH-FEEL-MOTION-001, PATH-FEEL-SCROLL-001, PATH-NODE-TYPES-001, TODAY-FIRSTSCREEN-001
(x2), PATH-LOCK-ORDER-001, PATH-CONNECT-PILL-001. `path-view.test.tsx` (16
touches, 6th-hottest code file) is a dedicated test suite for code that has no
module. Every path card must open a 2k-line file named after a different screen;
HOME/PROGRESS diffs interleave with PATH diffs in the same hot file (git bisect
noise; merge-conflict surface for concurrent lanes).

Drift already visible: `journeys/harness.tsx:1692` mirrors `UnitPathNode` with a
local type because importing a *path type from home.tsx* reads wrong — a live
second source of truth for the wire shape.

## Coupling matrix (measured)

Symbols the path block consumes from home.tsx: `bandHeader` (used by PathView
sections), plus its own imports already shared: `@openlang/ui` PackText/LatinText,
`./dim-progress` DimProgress, `./empty-state` EmptyState, react.
`bandHeader` is 3-way shared: Home (348), GoalMap (1928), PathView — it is a
GOALS helper (band header text/rank) that the path section reuses; it should NOT
ride into path.tsx.

Symbols of the path block consumed elsewhere:

| symbol | external consumers |
|---|---|
| UnitPathNode | App.tsx:27, app/walkthrough.tsx:18, app/home-wiring.ts:24, home.test.tsx, path-view.test.tsx; mirrored (drift) in journeys/harness.tsx:1692 |
| NextOffer | App.tsx:28, app/walkthrough.tsx:19 |
| CapstoneResult | App.tsx:35, app/home-wiring.ts:18 |
| PathView | only home.tsx Home (renders `<PathView>` at 665) |
| offerLabel | only home.tsx Home (503, 656) |
| pathSections/pathNodeState/pathTypedLetterGlyph | only path-view.test.tsx (in addition to PathView) |
| PATH_SWAY_AMP_PX/PATH_ROW_PITCH_PX/pathSway/PATH_KIND_NAMES/PathGlyph/PathLockGlyph | only PathView itself (no external importers; path-view.test.tsx asserts the pitch as a CSS literal `height: 4.75rem`, not via the const) |

No other app module imports the geometry consts. `apps/desktop/src/app/`
(walkthrough, home-wiring) already separates wiring from view, so the tree's own
convention supports a path VIEW module.

## Refactor shape for a future card (pure move, no behavior change)

Scope: one new module, zero logic edits. Estimated diff: ~840 moved lines +
import-line changes in 6 files. Comparable to one APP-SPLIT-003 lane; exceeds
this hygiene card's "small fix" envelope, hence option (b).

1. `git worktree add` scratch at HEAD (lane-commits rule; App.tsx is the repo's
   hottest file and will be dirty from other lanes — work isolated, commit via
   explicit paths only).
2. New `apps/desktop/src/path.tsx`: move lines 1074–1905 verbatim
   (UnitPathNode → PathView). Header comment citing PATH-VIEW-001 lineage.
   `pathOrderRank` stays module-private; everything else exported as today.
3. New tiny shared module (or keep in home.tsx and import): move `bandHeader`
   (1055–1073) to `apps/desktop/src/band-header.ts` — 3 consumers (Home, GoalMap,
   path.tsx). Alternative accepted: export bandHeader from home.tsx and import it
   in path.tsx — WRONG direction (path depending on the Home screen module); the
   helper must move OUT.
4. home.tsx: delete the moved region; import `PathView`, `offerLabel`, and the
   three wire types from `./path`; `HomeProps` type refs re-point. Re-export
   NOTHING (single source of imports; a re-export invites the drift back).
5. Update importers to `./path`: App.tsx (27, 28, 35), app/walkthrough.tsx
   (18, 19), app/home-wiring.ts (18, 24), home.test.tsx (UnitPathNode),
   path-view.test.tsx (PathView, UnitPathNode, pathNodeState, pathSections,
   pathTypedLetterGlyph, PATH_SWAY_AMP_PX, PATH_ROW_PITCH_PX).
6. Fix harness drift: journeys/harness.tsx `import type { UnitPathNode } from
   "../path"` and delete the local mirror (its comment at 1692 documents the
   workaround; keep its `kind`-extension shape only if the mirror exists for a
   reason — read before deleting, and if it genuinely differs, leave the mirror
   and note it in the card).
7. Test-tree sweep (lane-commits rule): `grep -rn "from \"\./home\"\|from \"\.\./home\""
   apps/desktop/src` and confirm every remaining import of a moved symbol is
   re-pointed; check `.journeys/` files and SSR/serve harness pins for
   `path-`/`know-band` class selectors — none reference module paths, they
   measure the DOM, which is unchanged.
8. LANE-tier gates (apps/desktop only): `npx tsc --noEmit`; `npx vitest run`
   (expect the same 77/694-era set green; a pure move must not change any test);
   `npx prettier --check` on all touched files. No Rust, no styles touched.
9. Race note: this touches App.tsx (52 touches/14d). If it is dirty at commit
   time with a sibling's WIP, the lane MUST NOT split it — park and follow the
   worktree cacheinfo-graft recipe from the lane-commits skill.

Pitfalls for that card: the `<PathView>` JSX call site in Home (665) stays;
`pathTypedLetterGlyph` is pure regex (verified — no shared deps). Check
PathGlyph's glyph-keying against `PATH_KIND_NAMES` at move time (both are
module-internal today, they move together). `humanizeToken`/`TOKEN_NOISE_SEGMENTS`
belong to Home/Progress only (lines 618/728/936) — they do NOT move.

## Decision

Option (b): analysis filed; no product diff this card, so no gates for this
lane (review-only, per the ARCH-HOTSPOT-001 precedent). The gates.log in this
directory is run 314's fix-lane gate log (its option-(a) diff, see
reconciliation below), not this lane's. Working tree at start: only
`apps/desktop/src-tauri/src/lib.rs` dirty (REVIEW-lane WIP) — untouched.

## Parallel-worker reconciliation (written at commit time)

A second worker (dispatcher run 314, started 16:02, same card) completed the
card via **option (a)** while this scan ran: it picked a different, verbatim
duplication cluster in the hottest file (App.tsx `playStoryAudio`/`playMineContext`
13-line byte-identical audio-playback block) and shipped it in code commit
`0150f827` (LANE gates green: tsc 0, vitest 725/725, prettier, eslint).
No overlap with this pick: that cluster is intra-App.tsx verbatim duplication;
this file analyzes home.tsx entanglement (no verbatim dupes there, see scan).
The refactor shape above remains valid and unexecuted — recommended material
for a future PATH-MOVE lane card. This notes.md is a complementary analysis
artifact committed by the second (delegated) worker; card completion belongs to
run 314, which holds the live claim.

## Reconciliation (completing worker, same card)

This notes.md is the analysis of an earlier run of this card that died before
committing; preserved verbatim above. The completing worker's pick per the
one-hotspot rule was different and SHIPPED as a fix: the story_audio
playback duplication in App.tsx (52 touches — the hottest file; lib.rs was
off-limits sibling WIP), code commit 0150f827, details in note.md +
gates.log beside this file. The home.tsx path-module extraction above is
filed for a future card unchanged (option-b deliverable, not executed).
Cross-check: this run's K=8 scan independently reproduced the same
cross-file clusters recorded above (journey assertion blocks,
record-controls, screen-shim) — no new duplication found beyond the shipped
story_audio fix.
