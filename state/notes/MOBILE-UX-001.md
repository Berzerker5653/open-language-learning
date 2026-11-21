# MOBILE-UX-001 — phone look-and-feel (owner standard 2026-11-21)

## As shipped (board run 108, 2026-11-21)

Layout tier only: no app behavior changed, so desktop and phone both
benefit. Files: `packages/ui/src/styles.css` (one new `max-width: 44rem`
tier + a 24rem tail), the dev-only evidence harness
(`apps/desktop/mobile-harness.html`, `src/mobile-screens.tsx`,
`vite.mobile-harness.config.ts`, `scripts/mobile-capture.mjs`), the
vitest gate `src/mobile-audit.test.ts`, and a Node-globals block in the
root `eslint.config.js` for `scripts/**/*.mjs`.

Key CSS decisions (all measured, see state/evidence/MOBILE-UX-001/):
- reuses LETTER-DRILL-TEXT-001's `--content-max` measure token — shared
  fix, no duplication;
- nav row: tabs wrap (five tabs' intrinsic text overflows 390px;
  nowrap clipped "Settings" into an internally scrolling strip);
- 44px floor for tabs, seg-btns, notes summaries, IME bubble, selects,
  and the delete-confirm checkbox (HEAD rendered it 13x13);
- selects width:100% — HEAD's speech-model select was 479px intrinsic
  and pushed the DOCUMENT to 512px h-scroll on settings;
- reader paragraphs 1.1875rem / 2.1 leading at phone distance.

Harness truth rules (run 107 died with fake-pass captures):
- today/drill/settings run on the seeded RU profile
  (`profiles:[Katya], installed:[RU]`) — the onboarding pack picker does
  not finish an RU install through the fake engine, so navigating there
  stalls at the mic step;
- button matching counts aria-label (the chooser's Continue carries the
  profile name only there);
- navigation errors ride the audit JSON (`error`) and the banner —
  never let a stalled capture read as a pass.

Regenerate evidence after any styles.css change:
1. `cd apps/desktop && npx vite build --config vite.mobile-harness.config.ts`
2. `rm -rf state/evidence/MOBILE-UX-001/after && node scripts/mobile-capture.mjs after`
3. `npx vitest run src/mobile-audit.test.ts` (fails loudly on regressions).

## Deferred / follow-up candidates (visible in evidence, out of scope)
- plan rows render label+id with no space ("Meet something newru.sent.b2.j2");
- onboarding mic-step heading styled like a text input (cosmetic);
- owner phone dogfooding over `lts-serve` belongs to WEB-SERVE-001's
  follow-up (that lane is complete but still uncommitted as of this card).
