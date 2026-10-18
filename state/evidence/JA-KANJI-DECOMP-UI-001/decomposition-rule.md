# JA-KANJI-DECOMP-UI-001 — the drill states the decomposition rule

Run on GamingPC, 2026-10-17 and 2026-10-18. Every number below was measured in
this working tree, over the pack as it stands after the O-07 re-sourcing
(`state/evidence/O-07/decision-2026-10-15.md`).

## What changed

- `apps/desktop/src/kanji-decomposition.ts` (new) — the rule as one exported
  function, `describeKanjiDecomposition(card)`, plus `STROKE_STAND_INS` and the
  five learner-facing strings it returns. It takes the structural
  `{ character, radicals }` the engine sends, not a UI type, so the drill and the
  tests read the same shape.
- `apps/desktop/src/App.tsx` — `describeKanjiDecomposition` imported (`:49`);
  `kanjiDecomposition` derived next to the other derived blocks (`:2868-2871`);
  the kanji drill renders `label`, then the parts join inside `<PackText>` only
  when `showParts` is set (`:3188-3209`). The mnemonic clause is untouched.
- `apps/desktop/src/kanji-decomposition.test.ts` (new) — six named cases plus
  two invariants run over both shipped pack files.
- `apps/desktop/src/journeys/harness.tsx` — the journey engine learned kanji
  ids: the JA fixture carries three drill cards, `kanji_list` returns exactly the
  engine's `KanjiCard` fields, and `practice_task`/`practice_submit` resolve a
  kanji content id by mirroring `kanji_task_build` (`apps/desktop/src-tauri/src/lib.rs`),
  drawing distractors from the other fixture characters' meanings or readings.
- `apps/desktop/src/journeys/kanji-decomp.journey.tsx` (new) — three mounts that
  click through Routes ▸ Practice ▸ Kanji into the drill and assert the rendered
  sentences.
- `docs/03_CURRICULUM_AND_MASTERY.md` — the rule, in the K-16 section, with the
  measured counts.

## The measured ground

Both pack files, all 84 cards, every one `status: draft`:

```
$ python3 - <<'PY'   # over languages/ja-JP/kanji/entries.jsonl + a2-topics.jsonl
STANDINS = {"ノ","ハ","ヨ","｜"}
...
84 {'whole': 22, 'strokes': 1, 'parts': 61} | single-part: 8 | multi-part: 53 | multi+stroke-note: 22
```

- 84 cards: 56 in `languages/ja-JP/kanji/entries.jsonl`, 28 in
  `languages/ja-JP/kanji/a2-topics.jsonl`.
- **22** cards present the character as its own sole element (`radicals ==
  [character]`): `一 九 二 五 人 入 十 大 女 小 山 川 心 手 日 月 木 田 目 耳 雨 食`.
- **23** cards contain a non-CJK stroke stand-in. The four stand-ins KRADFILE
  uses are `ノ`, `ハ`, `ヨ` and `｜`; the last is FULLWIDTH VERTICAL LINE U+FF5C,
  not the ASCII pipe, and an ASCII search finds none of them. Marks counted:
  `ノ` 12, `｜` 6, `ハ` 4, `ヨ` 2 (24 marks over 23 cards).
- Of those 23, **22** also list real elements (they get the parts join plus a
  note), and **1** — `八 → ["ハ"]` — lists strokes only, so its list is
  suppressed with a reason.
- **62** of 84 list elements other than the character; **86** distinct elements;
  **45** cards list an element that is another card's character. No card has an
  empty or duplicated `radicals` list.
- **5** cards list the character itself among other elements: `風 → ["風","几",
  "虫","ノ"]`, plus `口`, `足`, `見`, `行`.
- `丶` (×2, e.g. `気 → ["气","丶","ノ","乞"]`) and `亅` (×2) are Kangxi radicals
  in the source, not stand-ins, and stay elements.

The rule the card asked for, as implemented:

| card shape | what the drill says | parts shown |
| --- | --- | --- |
| elements that are neither the character nor a stroke (61) | "Made of these elements, which can overlap or sit inside one another." / "Made of this element." when one survives | yes |
| character listed as its own only element (22) | "Learned as a whole character — this pack lists no smaller parts for it." | no |
| list of writing strokes only (1) | "Written with strokes — this character is not built from separate parts." | no |
| elements plus strokes (22 of the 61) | parts sentence + "The strokes it is written with are not parts." | yes, strokes dropped |

A character is never listed as a part of itself, and a stroke stand-in is never
joined as a part. No string claims a stroke count: `七 → ["乙","匕","ノ"]` is
three stand-ins for a two-stroke character, so list length proves nothing.

## Acceptance criterion 1 — a stated rule, written down

Each of the four shapes above gets a sentence, and the sentences live in
`kanji-decomposition.ts` as named constants that `App.tsx` renders verbatim; the
drill cannot render an unexplained join because the label is always present and
`showParts` decides whether anything is joined. The rule is written in
`docs/03_CURRICULUM_AND_MASTERY.md` (K-16 section) with the 22 / 23 / 62-of-84 /
1-pure-strokes counts, and all five rendered strings appear there, checked
mechanically:

```
$ .venv/bin/python -   # each label constant against the doc text, whitespace-normalised
WHOLE_LABEL        doc:yes
STROKES_LABEL      doc:yes
SINGLE_PART_LABEL  doc:yes
PARTS_LABEL        doc:yes
STROKE_NOTE        doc:yes
```

## Acceptance criterion 2 — nesting framed, not asserted as independent

KRADFILE lists every visible element, so `話 → ["言","口","舌"]` lists `口` and
the `舌` that contains it. The drill frames every multi-element list as "Made of
these elements, which can overlap or sit inside one another." rather than as
independent components, and `八`'s stroke-only list is suppressed with a reason.

Honest limit, stated rather than papered over: the framing is general, not
computed per card. A cross-card lookup ("is this element another card's
character?") would *not* fire on the acceptance example — neither `言` nor `舌`
is a card in either pack file (only 45 of the 84 cards have such an element) — so
a lookup-based detector would have missed the very case the card names. The
sentence therefore describes the property of the source list, which is true for
every list in the pack, instead of a per-card claim that could silently go false
when the pack changes. `docs/03` says the same thing in prose.

## Acceptance criterion 3 — no ticket, ADR or patch in learner copy

`tools/audit_learner_copy.py` covers `App.tsx`, `kanji-decomposition.ts` and the
journey file (`*.journey.tsx` is scanned; only `*.test.*` is skipped):

```
$ .venv/bin/python tools/audit_learner_copy.py
LEARNER COPY AUDIT v1.0.0: 38 source files scanned, 23 test files skipped
findings: 0
```

Code comments name the card id; nothing rendered to the learner does.

## Verification

```
$ cd apps/desktop && npx tsc --noEmit                 # clean
$ npx vitest run                                      # Test Files 31 passed (31)
                                                      # Tests 264 passed (264)
$ npx vitest run src/journeys/kanji-decomp.journey.tsx  # 3 passed
$ .venv/bin/python tools/validate_handoff.py --require-explicit-ledger-records
```

Before this card the suite was 29 files / 253 tests; the unit file adds 8 and the
journey 3. The `pack-install` journey still asserts `祖母` in the Kanji section,
so the fixture additions did not change what that card proves.

The journey asserts the sentences as hard-coded strings, pinning the surface
copy rather than the wiring: `祖母` gets the parts sentence with `女 + 亻 + 木`,
`一` gets the whole-character sentence with no `+` anywhere in the line, `八`
gets the strokes sentence with no `+` and no `ハ` on the line.

Not run, and why: `scripts/smoke-desktop.sh` fails fast with `FAIL:
127.0.0.1:1420 is already bound` on GamingPC — the owner's running app holds the
Tauri single-instance port, so the desktop smoke is an owner-side gate
(`REL-001`), not something this card can produce locally. The proof of the
rendered surface here is the dom journey.

## Caveats

- All 84 cards are `status: draft`; the pack will change before release, so the
  tests assert per-card behaviour and the invariants (a card always
  classifies; parts never contain the character or a stand-in; whole/strokes
  cards show no join) rather than pinning 22 and 23. The counts live in this
  file and in `docs/03`, where they are dated to the O-07 re-sourcing.
- The three journey characters are fixture cards chosen to mirror the three
  measured pack shapes (`祖母` parts, `一` self-listed, `八` strokes-only); the
  journey does not load the real pack files, and the unit test is what covers the
  real data.
