# RU-REPUBLISH-046-001 — republish RU pack 0.4.6 with the letter-unit fixes

Owner dogfood 2026-11-21 (web session): installed packs still serve pre-fix
orthography — the catalog-pinned 0.4.5 archive (HEAD 369aaba) predates
LETTER-UNIT-MODEL-001 / LETTER-DRILL-TEXT-001 (294d649), so real installs
still run case drills ("Letter name: а (a); uppercase." property-vocabulary
items the owner rejected). This card publishes the fixed content as 0.4.6.

## Step 1 — case/uppercase/lowercase audit (classify legitimate vs drill-junk)

Scanned all of `languages/ru-RU/` (excluding gitignored media wavs) for
`uppercase|lowercase|case|Letter name|h: `:

**Drill-junk (already scrubbed in the tree by 294d649; no new edits needed):**
- `orthography/cyrillic.jsonl` at the 0.4.5-pinned HEAD 369aaba carried 66
  letter entities whose `reading` was drill-junk ("Letter name: X (x);
  uppercase." / "; lowercase."). 294d649 rewrote all readings to the
  letter=sound contract ("sound a — name а"), added `confusable_with` false
  friends, and removed the case-vocabulary mnemonics. Verified at HEAD:
  0 entities carry uppercase/lowercase/'Letter name' strings (scripted check
  over all 67 rows). The upper/lower *entities* stay (33 letters x 2 forms +
  1 extras row = 67 rows) — they are legitimate symbol entities; only their
  drill copy was junk, and the engine (294d649) now refuses case/property
  drill dimensions outright, so the 63 runtime case-drill rows the owner saw
  cannot be generated from 0.4.6 content.
- `tools/audit_learner_copy.py` v1.3 run at HEAD over apps/tools/scripts:
  36 source files scanned, 0 findings (ratchet red on the exact
  DOGFOOD-2026-11-21 strings, green tree-wide).

**Legitimate usage (KEEP — not scrubbed):**
- `assessments/definitions.jsonl` row `ru.assess.on-ramp.cyrillic-recognition`:
  rubric criterion "Recognize all 33 printed uppercase/lowercase pairs..." —
  recognizing printed case pairs is a real on-ramp letter-recognition skill,
  not a case-property drill. Kept.
- `curriculum/units/090-time-plans-01.yaml` `prohibited_ambiguity`:
  "Do not capitalize weekday names; Russian weekdays are written in
  lowercase." — an orthographic rule note in a unit contract (taught
  capitalization rule), never a drill item. Kept.
  (Card's path `curriculum/units/090-time-plans-01.yaml` = pack-relative;
  resolves to `languages/ru-RU/curriculum/units/...`.)

No further scrubbing required: repo source content is clean at HEAD.

## Steps 2-5 — publish cycle

- manifest.yaml bumped 0.4.5 -> 0.4.6 (committed BEFORE the RC build).
- RC playbook: `state/evidence/RC-0.4.6-2026-11-21/build-rc-0.4.6.sh`
  (copy of the 0.4.5 playbook; seven gates -> build -> inspect -> member
  accounting vs published 0.4.5 -> install round-trip -> catalog draft).
- Publish tag `org.openlanguage.ru-ru.reference-0.4.6` (standing pack-publish
  authorization per O-05 precedent, same as 0.4.4/0.4.5).
- Re-pin `catalog/packs.json` ru entry (url = live 0.4.5 url version-bumped),
  docs/13 provenance addendum, evidence `publish-0.4.6.txt` incl. proof the
  published archive carries ZERO drill-junk case entities (extracted
  `orthography/cyrillic.jsonl` from the installed round-trip of the actual
  .lpk bytes).
- 0.4.5/0.4.4/0.4.3 stay published and immutable as rollback targets.
