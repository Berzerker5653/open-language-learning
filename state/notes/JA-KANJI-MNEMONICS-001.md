# JA-KANJI-MNEMONICS-001 — mnemonics must name only sourced decomposition elements

## What was measured (not asserted)

Automated check: `apps/desktop/src/kanji-mnemonic-elements.test.ts` (vitest, node
project; runs in the repo's normal test path — `pnpm -r test` / `scripts/ci.sh`
web `test` stage — same precedent as `kanji-decomposition.test.ts`, which reads
the same two pack jsonl files).

Rule the check encodes (repo convention inspected in the data first): a mnemonic
names a decomposition element in a parenthesized span — `Sun (日) ...` — and an
element-position phrase inside parentheses is written `刀 over 田`. Every CJK
character inside any parenthesized span must appear in that entry's `radicals`
list (the KRADFILE-sourced decomposition written by
`scripts/derive-kanji-radicals.py`). A mnemonic with no parentheses names no
element and cannot mismatch. The check reports the mismatching card ids, the
named-but-unsourced elements, the card's sourced list, and the offending text,
so the count cannot silently grow. The check authors no replacement text.

- **BEFORE (measured 2026-11-06, unfixed data):** 18 of 84 mnemonic-bearing
  cards mismatched (23 named-element mentions). Verbatim vitest failure listed:
  `ja.kanji.ji` 寺 · `ja.kanji.kuni` 玉 · `ja.kanji.nani` 亻 ·
  `ja.kanji.yomu` 売 · `ja.kanji.taberu` 人,良 · `ja.kanji.kaeru` 中,止 ·
  `ja.kanji.hairu` 人 · `ja.kanji.place.ka` 艹 · `ja.kanji.place.chou` 丁 ·
  `ja.kanji.place.sha` 土 · `ja.kanji.body.tai` 亻,本 ·
  `ja.kanji.admin.ki` 其 · `ja.kanji.admin.kai` 人,日 ·
  `ja.kanji.admin.hen` 亦,頁 · `ja.kanji.film.ei` 央 · `ja.kanji.film.e` 会 ·
  `ja.kanji.city.kai` 刀 · `ja.kanji.city.shi` 亻,吏.
  The task text said 17; the measured number under this checker is 18 — e.g.
  `届` names `刀` (of the old-form 屆 glyph) inside the `刀 over 田` span, which
  the 2026-10-03 KRADFILE refresh dropped from the 届 element list
  (`｜ 日 尸 田`). Discrepancy recorded rather than reconciled by loosening the
  checker.
- **AFTER (measured, same checker):** 0 mismatching cards.

## Re-authoring (the 18 mismatches)

Each offending mnemonic was re-authored in place to name only elements present
in the card's sourced `radicals` list; nothing else in either jsonl was touched
(`git diff` shows exactly 18 changed lines, all mnemonic spans; all lines remain
valid JSON). Two cards whose sourced list is the character alone (食, 入) were
re-authored as whole-character images that name no sub-element — the same
posture as the app-side "whole character" framing
(`apps/desktop/src/kanji-decomposition.ts`). No decomposition element was
invented. Draft posture unchanged: `status: draft`, the `notes`/`generation`
fields still record the mnemonics as ai-drafted pending qualified human review;
`jmdict-simplified`/`kradfile` sourcing spans untouched.

New texts (id: mnemonic):

- ji 時: Sun (日) over earth (土), measured out in units (寸) — time.
- kuni 国: King (王) marked with a dot (丶), guarded within walls (囗) — country.
- nani 何: An open mouth (口) asking — what?
- yomu 読: Words (言) gathered under a cover (冖) — to read.
- taberu 食: A covered bowl set before you — food; to eat.
- kaeru 帰: A cloth (巾) tucked under a cover (冖) at the door — returning home.
- hairu 入: A step angled through a doorway — to enter.
- ka 花: Mugwort (艾) transformed (化) — a flower.
- chou 町: A field (田) staked off by a stroke and hook — the town.
- sha 者: An elder (老) standing in the sun (日) — the person, one who.
- tai 体: Standing as one (一) beside a tree (木) — the body.
- ki 期: A sweet (甘) month (月) — the appointed period.
- kai 会: Two (二) under one roof (个), private business (厶) shared — a meeting.
- hen 変: Dot and line (亠) over crossing legs (夂) — to change.
- ei 映: Sun (日) beneath a cover (冖) over the great (大) — projection.
- e 絵: Threads (糸) arranged into a scene — a picture.
- kai 届: A hand (尸) pushing the day (日) along — delivery.
- shi 使: One (一) open mouth (口) sends a command — to use, to send.

The re-authored texts are ai-drafted and share the review debt of the existing
mnemonics: qualified human review is still required before any promotion out of
`draft`.

## Gate runs (2026-11-06)

- `npx vitest run src/kanji-mnemonic-elements.test.ts` BEFORE fix: 1 failed
  (mismatch report above) | 2 passed. AFTER fix: 3 passed.
- Full desktop suite (`apps/desktop` vitest, normal test path): 44 files,
  317/317 tests passed (was 314 before this task's +3 tests).
- `prettier --check .` (repo root): clean.
- `eslint apps/desktop/src/kanji-mnemonic-elements.test.ts`: clean.
- `apps/desktop` `tsc --noEmit`: clean.
- `python3 tools/audit_learner_copy.py`: 0 findings.

## Limits

- The check verifies only elements explicitly named in parentheses, matching the
  data's convention; an unnamed prose claim inside a mnemonic (no parentheses)
  is out of the checker's reach — recorded honestly, not a silent pass of the
  stated acceptance rule, which is exactly the parenthetical-naming mismatch.
- The check does not validate that the sourced list itself is right; provenance
  of `radicals` is governed by `scripts/derive-kanji-radicals.py` pins.
