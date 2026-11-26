# ARCH-HOTSPOT-2026-11-26 — serve-PATH POST duplication fix (option a)

## Scan method + measured findings

`git log --name-only --since='14 days'` hot files: task-state.json/ROADMAP/KANBAN
(ledger churn, not code), App.tsx (46 touches), packages/ui/src/styles.css (41),
lib.rs (37), home.tsx (30), journeys/harness.tsx (18), settings.tsx, onboarding.tsx.

Normalized line-run intersection scan (>=8 identical normalized lines) across
apps/desktop/src/app/*.ts{x} + App.tsx + the extracted view modules:
**zero 8-line duplicate blocks** — the APP-SPLIT-003A-D pure moves did not
replicate logic (confirmed; the card's props-bundle-worry did not materialize).
The 5-line hits were JSX closing-tag noise, not duplication.

One real hotspot, measured verbatim (word-for-word after whitespace):

- `settings.tsx` `LanAccessCard.postJson()` (was lines 866-882): fetch POST with
  method/content-type/JSON body/credentials:"same-origin" + `res.json().catch`
  + error-message extraction (`payload ... "error" in payload ? String(...) :
  HTTP ${res.status}`) + throw.
- `onboarding.tsx` `ServePairingCard.onSubmit()` (was lines 795-808): the same
  13 lines inlined before `window.location.reload()`.
- Third variant, deliberately NOT merged: `ipc.ts httpInvoke` reads the body as
  text (non-JSON payloads become the message) and targets `/api/<cmd>` —
  different fallback semantics, so folding it in would be a behavior change.

## Fix (small, no behavior change)

Extracted the verbatim block into `ipc.ts` `postServeJson(path, body)` (ipc.ts
already owns the serve HTTP client); LanAccessCard's local postJson deleted and
its 3 call sites now call postServeJson; ServePairingCard's inline block replaced
by one awaited call. Error strings, request init, and payload handling identical.

Test-tree sweep: `loading-feel.test.tsx` source-text pins match
`async function onPair()` (untouched shape) + the `lan-pair` button (untouched);
no test references `postJson`; serve-pairing.test.tsx pins SSR markup only.
Journey harness does not fetch /pair or /lan in tests.

Code commit: 8f8a9210.
