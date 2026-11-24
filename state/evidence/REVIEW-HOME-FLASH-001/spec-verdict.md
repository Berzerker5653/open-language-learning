# HOME-FLASH-001 — SPEC verdict

Verdict: FAIL (one named defect; everything else PASS)

Contract asked: home must not render the pack-absent warning while the pack read is
in flight — unknown renders neutral, settled no-pack renders the warning as before,
no layout jump, SERVE-BANNER-001/TODAY-FIRSTSCREEN-001 untouched, red-at-HEAD vs
green evidence, ROADMAP card + task-state record committed.

## Named defect
- home.tsx:348 (and the App.tsx call site, 5204): the pack-posture claim
  (`<p className="meta pack-posture">` / `activePack`) is NOT gated on `packsPending`.
  `activePack` derives from the memoized `activeIds[0] && activeClaims` (App.tsx:4438-4446),
  which carries the PREVIOUS profile's state across the profile-open flow — the resume
  flow (App.tsx:2002-2012) sets `setPacksPending(true)` without clearing `installed` /
  `activeClaims` / `activeIds`. During the pending window Home renders the stale pack
  posture badge ("Russian Reference Pack · AI-GENERATED CONTENT …") while the new read
  is in flight, which is precisely the class of flicker HOME-FLASH-001 exists to kill.
  The acceptance contract names "no posture claim" as part of the ask. The new pin
  (home.test.tsx:189-208) passes no `activePack` at all, so it does not exercise the
  stale-activePack case — the gap is invisible to the suite.
  Severity: low-medium. No warning flashes and the in-flight plan/scaffold intentionally
  stay (that is the scaffold-preserved intent); but the posture badge is a pack-state
  claim that violates the spec while pending.

## PASS items
- pack-absent warning gated on settle: App.tsx:5204 gates `noPack` with
  `!packsPending`; home.tsx:367 renders the warning only on a settled no-pack state;
  the packsUnknown branch (home.tsx:357-366) is untouched.
- Neutral while pending: home.tsx:367 `p.packsPending ? null` for the notice; the
  prompt/scaffold/budget/plan still render (test pins "What to practice now" and
  aria-label="Time budget") — no layout jump.
- Settled no-pack still renders the warning as before (existing pin unchanged).
- SERVE-BANNER-001 / TODAY-FIRSTSCREEN-001 untouched: diff touches only App.tsx,
  home.tsx, home.test.tsx, plus new capture script + evidence/notes; no serve-banner
  or firstscreen files in either commit.
- Red-at-HEAD vs green evidence: result-red-at-HEAD.json 5 occurrences
  (t=201/403/605/807/1009ms, same label) vs result-green.json 0 occurrences,
  healthyStreak 3/3, one path-pin; PNGs committed; gates.log matches.
- ROADMAP card + task-state record committed in ledger b2c29d78 (card + optional_tasks
  entry + done record with evidence paths).
- No out-of-scope additions. Evidence files match task-state record (7 paths, all present).

## Note
The gates.log says red ran against the HEAD dist and the green run against the fix
tree — consistent with HOME-FLASH-001's red-at-HEAD requirement. vision backend was
unavailable at capture time; verification was mechanical (poll logs) + the vitest pin,
which is honestly recorded in learner-inspection.md.
