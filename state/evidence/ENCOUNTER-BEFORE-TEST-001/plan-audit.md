# ENCOUNTER-BEFORE-TEST-001 — owner-profile plan audit (API read, no UI)

Run: 2026-11-22, takeover-2 worker (board t_80bf083b) — re-run of the earlier
run-2 audit against the FINAL lane tree (identical findings). Tooling:
`scripts/owner-plan-audit.mjs` (read-only: issues only `list_profiles`,
`home_state`, `lesson_plan` — no write command).

Method note: the audit ran `lts-serve` built from the final tree (after
`cargo clean -p lts-storage`; gates-takeover2/serve-build3.log) against a
**snapshot copy** of the owner's live data dir (`~/.local/share/openlang`
copied to scratch first) — serve auto-installs its bundled dev pack into
whatever data dir it is pointed at, so the live dir was never served
directly. The snapshot preserves the live profile and its history.

## Probe output (verbatim in gates-takeover2/owner-audit5.log)

- Profiles: `Hunter` (prof-b01280fa-bbc1-4521-b4f8-e333d9c1cc90), not hidden.
- `home_state`: 6 plan items; 3 of them are letter TEST rows
  (`ru.orth.*` with reason != progression):

| content_id | reason | unit | scored stage acted (U06 grandfather) |
|---|---|---|---|
| ru.orth.cyrillic.a | weak-skill | ru.unit.on-ramp.cyrillic-a-o-m-t | yes |
| ru.orth.cyrillic.m | weak-skill | ru.unit.on-ramp.cyrillic-a-o-m-t | yes |
| ru.orth.cyrillic.o | weak-skill | ru.unit.on-ramp.cyrillic-a-o-m-t | yes |

- **Un-encountered tested letters: 0.** Every letter the owner's live plan
  tests is legitimately testable: the learner already acted on the unit's
  authored scored stage (recognition answers are in the evidence stream —
  the same U06 inference the engine's `encounter_test_allowance` reads),
  so the gate keeps every earned review.
- `AUDIT verdict: unencountered tested letters = 0` (exit 0).

This is the owner's own dogfood shape («learned а/о/м, next question was
Т»): after this card, a scheduler row for a letter whose unit has no
completed encounter cannot surface as a quiz — the capture harness proves
the zero-encounter case on-screen (`result.json`: "no due-review/
weak-skill row for any cyrillic letter pre-encounter — offenders: []").
