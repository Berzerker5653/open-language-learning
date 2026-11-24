# SECONDARY-SURFACES-001 — learner inspection (2026-11-23)

Scope: Practice (home/path surface), Progress, My Words at 390x844 mobile:true on the
live lts-serve of the rebuilt dist. Contract: red-at-HEAD (committed as 9841db99),
then fix, then green captures.

## Inspection method
- Live 7-check DOM/geometry capture (`scripts/secondary-surfaces-capture.mjs`), green
  run 2026-11-23: **7/7 green** (state/evidence/SECONDARY-SURFACES-001/audit-green.json).
- Screenshots committed under state/evidence/SECONDARY-SURFACES-001/
  (practice-home-red/green.png, progress-red/green.png, my-words-red/green.png).
- Gates: `npx tsc --noEmit` clean; `npx vitest run` on the five touched contracts
  (progress-feel, mywords-feel, settings-feel, mobile-audit, rtl-direction) = 60/60.

## Caveat — no vision pass in this environment
This session's vision-analysis path is unavailable (the model server reports it was
started without image input). The "view the finished whole" step therefore could NOT
be performed as a vision pass. It is replaced with objective DOM/geometry measurements:

- S1 probe `.empty` on the home surface: solid 1px border, radius 8px, surface fill
  (rgb(255,253,249)), zero dashed pixels — was dashed/1px/8px at HEAD.
- S2 `.progress-zero`: solid 1px border, radius 8px, surface fill + shadow — was
  2px dashed, transparent fill.
- S3 live `.empty` on the Progress screen: solid 1px, radius 8px — was dashed.
- S4 all four My Words inputs: full-width of `.field` (358/358), 44px tall, solid
  1px line-strong border, radius 6px — was UA-default narrow (185/358) at 21px.
- S5 focused input: accent border rgb(20,97,94) + ring halo (3px accent-soft) — was
  UA rest hairline.
- S6 disabled Add button: opacity 1 (was 0.45), distinct sunk fill + faint text,
  clearly not the enabled solid accent.
- S7 no sub-44px button on any of the three surfaces.

This is a **discipline caveat, not a claim of vision**: the committed PNGs exist and
were inspected for capture/decode success, but no vision-capable pass was performed.
If the owner wants a true vision re-read, that is a separate cheap step against the
green PNGs.

## What a learner sees after the fix (from the green capture + DOM)
- Home/Practice and Progress: no more dashed placeholder boxes; the empty boxes and
  the zero-state read as designed solid cards.
- My Words: four full-width tall inputs with labels, an accent-bordered focus state,
  and an Add button that reads as disabled-but-legible instead of near-invisible.

## Honest residual
The vision-capable re-read of the whole surface is outstanding in this environment
(see caveat above). Nothing else is outstanding; the code, gates and evidence are.
