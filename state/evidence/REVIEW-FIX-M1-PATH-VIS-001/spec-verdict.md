# SPEC verdict — REVIEW-FIX-M1-PATH-VIS-001

Target: code d9a9ff48 (feat(ux) day-1 path frontier fix), ledger 40a5016d, evidence cbbd8141.
Contract: board t_23e61c6f body (Scope 1 path-view collapse, Scope 2 D-006 wire-slug audit rule) +
tasks/KANBAN.md row fix-m1-path-vis.
Reviewer: default, 2026-11-28 (board t_34c98345).

## Verdict: PASS WITH DEFECTS — 2 MAJOR, 2 MINOR. No blocker; the core D-003 fix is real and holds.

## What was verified as done (SPEC axis)

1. **Path opens AT the frontier; far-future titles never render.** Verified against the lane's
   own serve+CDP 390x844 DOM captures (result-green.json / result-red-at-head.json, committed):
   at the lane, 12 path rows render, locked rows = 2 (greetings-01/02, inside PATH_FUTURE_WINDOW),
   zero hidden-tail units render (structural data-unit audit vs a server-side computed hidden
   set), pinned frontier node (cyrillic-a-o-m-t) inside the fold, 0 locked titles above the fold.
   At HEAD the same harness renders 21 rows / 11 locked nodes / zero counted groups — the wall.
   IA rules 1–2 of docs/design/PROGRESSION-UX-AUDIT-2026-11-22.md (open AT frontier, locked
   strictly below) are satisfied for the rendered surface.
2. **Counted band groups, count + band only.** Measured texts: "+ 9 later units in Getting
   started" … "+ 402 later units in Upper-intermediate" — no future unit title reaches the DOM.
   The card's example shape ("+ 741 later units") is honored (and pinned in
   path-view.test.tsx "+ 739 later units in Beginner").
3. **Tap-current = start** (IA rule 3) — untouched by the lane; visibleNodes keeps the existing
   node click wiring. Not regressed.
4. **D-006 wire-slug rule** shipped in tools/audit_learner_copy.py v1.7.0 exactly as scoped
   (String(x.reason), bare {x.reason}/{x.slug}/{x.tag} JSX interpolation, engine enum slugs
   rendered as JSX text; *_LABELS lookup allowed). Reviewer re-ran the tests at current HEAD:
   `python3 tools/test_audit_learner_copy.py` -> 25/25 OK. The explain panel reason->notice
   rename is a minimal, on-scope consequence.
5. **Journey/unit tests re-pinned, not weakened.** The PATH-LOCK-ORDER-001 pin change is a
   STRENGTHEN: numbers-02 moved from "renders below the pin" to "must not render at all" plus a
   positive "+ 1 later unit" pin. explain test re-pins track the rename only.
6. **Out-of-scope additions:** none material. The home.tsx diff carries ~4 lines of
   prettier-format-only hunks (metersVisible / accumulation-strip JSX) — content-neutral, noted,
   not worth a card.

## The "capture 10/10 green-at-lane, 5 FAIL red-at-HEAD" ledger claim — VERIFIED

result-green.json: failures=0, 10/10 checks pass, matches gates.log line-for-line.
result-red-at-head.json: failures=5. The 5 FAILs are:
(1) hidden rows rendered (8+), (2) 11 locked rows > window, (3) no counted groups,
(4) no 44px group (none exists), (5) no tap-to-expand control.
Every one of them measures pre-fix HEAD behavior — i.e. defect D-003 itself (HEAD's
`s.nodes.map` rendered the whole catalog; git show d9a9ff48^ confirms). None can be attributed
to the lane: they are the harness asserting the NEW invariants against the OLD tree, and they
reproduce exactly what LEARNER-REVIEW-M1-001 D-003 measured. Attribution claim holds.

## LEARNER-REVIEW-M2-001 "wall UNCHANGED 823/803 at a4b5f41d" — RESOLVED, no contradiction

M2's gates.log §Environment: the walk ran binaries built in a detached worktree **frozen at
clean HEAD a4b5f41d** (walk 17:55–19:30 MST; close-out commit 14dfc775 at 20:30:56). The fix
landed at 20:57:53 — 27 minutes AFTER M2's ledger commit and ~1.5h after the walk finished.
At walk time task-state said FIX-M1-PATH-VIS-001=`ready` ("never shipped") — true. M2's number
is a payload-level count on days 31-60 (803 locked after 20 days of progression), not a
rendered-view measurement. So M2's measurement PREDATES the fix; it is not evidence that the
fix fails in a served walk. The fix's served-walk evidence is the lane's serve+CDP DOM capture
(green at the lane tree). Caveat for completeness: the capture ran at the lane tree, not at
current HEAD, but every path invariant it pins is still green at current HEAD c97ba7c6
(reviewer re-ran the full apps/desktop suite: 733/0, 2026-11-28).

## Defects

### S-D1 (MAJOR) — counted rows on CLOSED fully-locked bands undercount by PATH_FUTURE_WINDOW; 8 units render nowhere and count nowhere

Measurement (reviewer probe against the shipped component, apps/desktop/src/home.tsx):
`pathTailCutoff` returns 2 for a fully-locked band (`frontier=-1 -> cut=2`), so
`laterUnits = nodes.length - 2`. But the band's `<ol>` renders only when
`isOpen || closingBand === s.band` — on day 1 only the frontier band is open, so those 2
"visible" nodes render NOWHERE. Probe output (vitest, shipped PathView SSR, 403-unit locked
band): `pathTailCutoff(b2)=2`, counted row "+ 401 later units in Upper-intermediate"
(data-hidden=401) under a header that reads "0/403 done" — 2 units vanish from the learner's
arithmetic. The lane's OWN green capture carries the same fingerprint: hiddenTailTitles=811
(harness server-side hidden set) vs collapsedTotal=803 (sum of rendered counted rows);
the per-band deltas are exactly 2 each (A1 91→89, A2 103→101, B1 204→202, B2 404→402),
8 units unaccounted on the day-1 RU screen. Card intent: "collapse EVERYTHING further behind
band-group headers (count + band name only)". Why the gates missed it: the vitest pins cover
only OPEN-band counting; the b2 pin asserts the header count but never the group label; the
harness group check is `groups.length >= 1 && collapsedTotal >= 400` — a floor, never the
strict `collapsedTotal === hiddenTailTitles` equality it could have asserted from data it
already computed.

### S-D2 (MAJOR) — the counted row is a dead control on every band except the frontier one

onClick adds the band to `expandedTails` only (home.tsx, the `path-later-units` button).
`visibleNodes` changes, but the `<ol>` still renders only if `isOpen || closingBand === s.band`
and the button's onClick never touches `setBandOverride`. Tap "+ 89 later units in Beginner"
on day 1 (a closed band): `laterUnits -> 0`, the button unmounts, ZERO rows are added, and
`expandedTails` is sticky for the visit — the learner's opt-in lookahead tap deletes its own
affordance and shows nothing. On day-1 RU, 4 of the 5 counted rows (A1/A2/B1/B2) behave this
way. The capture proved the tap only on the on-ramp group (the open band, 12->21 rows) — the
closed-band case was never exercised. This is the "counted row is a real control / learner's
own tap opens the tail" acceptance bullet failing for the majority of its instances.

### S-M1 (MINOR) — capture harness check is loose where strict equality was available

"The far tail collapses into counted band group(s) carrying the hidden count" passes on
`collapsedTotal >= 400`. It should assert `collapsedTotal === payload.hiddenTailTitles` —
the exact check that would have failed red at the lane and caught S-D1. Fold this into the
S-D1 fix's acceptance.

### S-M2 (MINOR) — ledger/KANBAN wording: "803 units collapsed / 803 hidden" vs measured hidden 811

The 8-unit gap in the lane's own result.json is the S-D1 fingerprint, not a typo — corrected
wording should ride the S-D1 fix's ledger line (no separate edit to immutable evidence).

## Observations, no card

- Vision-model pixel check ("vision-check 2 shots" acceptance bullet) was substituted with
  DOM/geometry audits + board-attached screenshots, honestly declared in gates.log/task-state.
  Under Local-Only AI mode there is no vision-capable engine in the lab, so this bullet is
  not satisfiable by any agent run in this environment — substitution is the only honest move
  and it was made. If the owner wants the pixel pass, it needs a human eye or a future vision
  engine; no FIX card can close it.
- IA rule 4 ("meta never occupies the first screen") concerns the Home composition
  (accumulation meters above the path); this card's scope was the path payload only. No M1/M2
  defect card tracks meters-on-first-screen today — flagging for the next learner review rather
  than spawning a card here, since the acceptance measurement (what counts as "meta") is a
  design call outside this diff.
