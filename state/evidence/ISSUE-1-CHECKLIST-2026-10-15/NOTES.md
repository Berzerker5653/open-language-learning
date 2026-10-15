# Issue #1 checklist review — 2026-10-15

`https://github.com/Berzerker5653/open-language-learning/issues/1` is the owner's
prioritized review checklist (24 findings: R01–R16, I01–I08) written against
`ec47a0a`. It had never been touched since it was opened: all 24 boxes unchecked,
one owner comment (`2026-10-14T20:44:40Z`), and no commit in the day's chain
cross-referenced it. The owner authorized updating it on 2026-10-15.

## What was done

- Re-derived every checkbox from this tree at `02f7df8`, not from the board's own
  claims: read each finding's acceptance bullets in the issue body, then required a
  test, gate or measurement in the repo for each one.
- **19 checked, 5 left open**: R12, R13, I04, I05, I08.
- The issue body changed only in those 24 checkbox lines — `diff` of the fetched
  body against the edited body shows 19 replaced lines and nothing else.
- Comment `…/issues/1#issuecomment-6201241065` carries the per-finding table with
  `path:line` citations and what remains for each open item.

## Freshly measured during the review (not copied from the board)

| check | result |
| --- | --- |
| `pnpm -r test` at `02f7df8` (isolated `~/.local/opt/pnpm-12.8.1`) | `apps/desktop` 26 files / **239 tests passed**, `packages/ui` 2 files / 10 tests passed |
| `cargo test -q -p lts-desktop --lib -- packs::tests` | **17 passed / 0 failed / 1 ignored**, 127 filtered out |
| `tools/audit_learner_copy.py` | 33 source files scanned, **0 findings** |
| ru activity-type histogram (`grep -ho "type: …" languages/ru-RU/curriculum/units/*.yaml`) | 1,589 `encounter-read`, 798 `recall`, 776 `cloze`, 9 `retrieval`, **9 `listen-and-choose`, 0 speaking** across 818 units |
| Actions run `38788822884` at `02f7df8` | `rust`, `web`, `desktop-smoke`, `schemas`, `security`, both `platform-compile` jobs green |

## Why the five boxes stayed open

- **R12** — content depth is counted (`tools/audit_content_templates.py` in CI) and
  units 810–818 add the named upper-band goals, but the histogram above shows the
  upper bands still run elementary task kinds. `JA-B1-001`, `JA-B2-001` and the four
  band-review cards are `blocked` on qualified human review, which an agent cannot
  clear.
- **R13** — substitution/refusal is closed (`placement_never_substitutes_or_repeats_a_diagnostic_item`,
  `lib.rs:8023`) and coverage layers are separated, but the acceptance bullet asking
  for an offline journey per claimed modality is unmet: 9 listening and 0 speaking
  activities against 60 + 60 claimed rubric rows.
- **I04** — copy hygiene is a clean gate, but the third bullet (keyboard-only, IME,
  status messages, reduced motion against the AT audit matrix) needs a human AT user;
  `ACC-001` is `blocked` and owner queue **D7** asks which host to schedule first.
- **I05** — percent/cancel/receipt/staging landed, yet there is no byte-range resume
  and no cancel inside unpacking, and artifact-level timing plus modest-device budgets
  need the published artifact (`INSTALL-UX-001`, `PERF-002`).
- **I08** — publication (D2), immutable releases (D3), `O-06` hands-on, `SEC-001`,
  Windows/macOS user runtime and the AT matrix are human/owner acts.
  `RELEASE-EVIDENCE-001` stays `blocked`.

Nothing in this review claimed human acceptance: the comment says explicitly that a
checked box means the acceptance bullets are demonstrable in this tree, and that
`I01`/`I02` sit in the board's "in review — human acceptance open" column. No ADR
status, publication, tag, or protection setting was changed.
