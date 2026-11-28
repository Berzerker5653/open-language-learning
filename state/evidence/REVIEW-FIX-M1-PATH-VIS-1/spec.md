# REVIEW-FIX-M1-PATH-VIS-1 — SPEC axis verdict (board t_edc58d06, 2026-11-28)

REVIEW PAIRING: b106252b "fix(ux): closed bands count every unit and counted
rows open their band (FIX-M1-PATH-VIS-1, FIX-M1-PATH-VIS-2)" — cards
t_3d0d42ca + t_7a6fb02e. Reviewer ran on HEAD b3c3e272;
`git log b106252b..HEAD -- <the 4 touched files>` is EMPTY (no drift since the fix),
so HEAD readings below are the shipped tree.

## VERDICT: SPEC PASS — the diff does exactly what both cards asked, nothing more, nothing less.

- PASS — S-D1 core: a non-rendered band counts its WHOLE band.
  home.tsx:1686 `const bandRendered = isOpen || closingBand === s.band;` and
  :1691-1693 `const laterUnits = bandRendered ? s.nodes.length - visibleNodes.length : s.nodes.length;`
  The mount-mirror is EXACT: the section's <ol> renders under the identical
  condition at home.tsx:1724 `{isOpen || closingBand === s.band ? (` — count and
  render cannot diverge. (The closing-animation band still renders rows, so it
  correctly keeps the partial count; the learner arithmetic closes in every case.)
- PASS — open-band contract unchanged: the ternary only diverges from the old
  `len - visible` expression when the list NEVER mounts; inside the open band the
  history + frontier + 2-neighbours path is byte-identical, and the pre-existing
  FIX-M1-PATH-VIS-001 pins in path-view.test.tsx still assert it (green in the
  reviewer's scoped re-run: `npx vitest run src/path-view.test.tsx src/path-view-tap.test.tsx`
  at HEAD = 48/48, 2 files).
- PASS — strict equality `collapsedTotal === hiddenTailTitles` survived and the
  floor is GONE: scripts/path-far-future-capture.mjs:356
  `audit.groups.length >= 1 && collapsedTotal === result.payload.hiddenTailTitles,`.
  The only remaining `>= 400` in the file (:177) is the non-vacuous PAYLOAD
  precondition ("the day-1 payload really carries the far-future wall"), a
  different check that guards scenario meaningfulness — not the S-M1 floor.
  Measured outcome in the green capture: counted groups on-ramp:9 + A1:91 +
  A2:103 + B1:204 + B2:404, collapsedTotal 811 === hiddenTailTitles 811
  (state/evidence/FIX-M1-PATH-VIS-001/result-vis1-green.json, tag vis1-green,
  11 checks, 0 failed — reviewer parsed the JSON directly).
- PASS — the counted row is a working control on CLOSED bands and opens the
  EXACT counted tail: onClick (home.tsx:1964-1976) does setClosingBand(null) +
  setBandOverride(s.band) when !isOpen — byte-identical to the header toggle's
  open branch (home.tsx:1712-1715), so the "same accordion move" claim in the
  commit message is true. Because the tap also adds the band to expandedTails,
  tailExpanded=true makes visibleNodes = the whole band, so rendered rows grow
  by exactly `laterUnits`. Proven at three levels: DOM pin (path-view-tap
  .test.tsx: closed band 0 rows, data-hidden=5, tap -> 5 rows, control unmounts,
  header aria-expanded=true), capture CLOSED-band tap (A1 section rows 0->91 ==
  counted 91 strict), and capture accordion-moved case (on-ramp 0->21).
- PASS — required pins all present: path-view.test.tsx SSR arithmetic pin
  ("+ 91 later units in Beginner", "+ 403 later units in Upper-intermediate",
  never "+ 401"; per-band header total == rendered + counted); path-view-tap
  .test.tsx interactive pin (real React root, act + click); capture tap cases
  on a CLOSED band AND the moved-away band (VIS-2 acceptance 2: on-ramp-only tap
  was insufficient — it is now the reopened case of the SAME stronger invariant).
- PASS — no out-of-scope addition: the diff touches exactly the 4 files the two
  cards name (home.tsx, path-view.test.tsx, path-view-tap.test.tsx,
  scripts/path-far-future-capture.mjs); no drive-by refactors, no CSS churn.
- PASS — entanglement is card-sanctioned and complete: FIX-M1-PATH-VIS-1's body
  explicitly pre-authorized one commit for BOTH defects ("commit once labeled
  with BOTH card ids"); the commit title names both ids; neither card's
  acceptance gained or lost a bullet in the shipping.
- PASS — VIS-2 acceptance 1's chosen shape (`setBandOverride`, opening the
  accordion) is the first option the card itself names; no focus-pipeline
  conflict observed (the fold-0/frontier-pinned audits run BEFORE any tap and
  pass in result-vis1-green.json).

No spec defects. No FIX-CANDIDATE raised on this axis.
