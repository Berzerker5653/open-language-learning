# REVIEW-WEB-SERVE-001 — Axis (b) STANDARDS verdict

Checked against AGENTS.md + CODING_STANDARDS.md §B judgement list, ledger rules
(validate_handoff semantics), and the docs/privacy posture the card itself demands.

VERDICT: CHANGES-REQUESTED

## Clean (verified, not assumed)

- Gate integrity: no test/gate was edited or weakened by the lane; the 38-worktree-test
  baseline-diff method is the sanctioned one (failure SET comparison, raw logs kept:
  final-test-baseline.log, final-test-serve.log, final-failed-*.txt).
- Commit hygiene: code and ledger separate (`feat` 4ba842c, `ledger` c7a1ee2); the
  commit message's claims match gates.log line-for-line (fmt 0, clippy default+serve 0,
  183 passed/0 lane failures/10 new serve tests, tsc 0, vitest 456/456); deferred
  evidence honestly labeled.
- Ledger rules all hold at HEAD: task-state `WEB-SERVE-001` status `done`, evidence
  entries are existing file paths, `updated` is a plain date, `active_task: null` with
  zero in_progress records, ROADMAP card has plain-scalar acceptance bullets, and
  `required_for_desktop_1_0: false` is paired with the `optional_tasks` row
  (ROADMAP.yaml:3097). `python3 tools/validate_handoff.py
  --require-explicit-ledger-records` → PASSED (exit 0) on the live tree.
- Tests assert behavior, not trivia: bind policy, traversal, IPC round-trip through the
  real handler, rejection mapping, unknown-command shape, name-table walk — all
  request-level, no implementation mirroring.
- Honesty/privacy posture (AGENTS.md "separate confidence from correctness",
  "privacy minimized"): capabilities reports limitations instead of silently degrading;
  mic unavailability is the browser's own secure-context rule, labeled not bypassed; no
  new collection, no upload path; the trusted-network + "SEC sign-off stays WEB-001"
  assumption is written in the notes AND the capabilities payload AND refuse messages.
- Accessibility: the serve notice ships `role="status"` with the component.
- `#[cfg_attr(not(test), allow(dead_code))]` on `SERVE_COMMAND_NAMES` carries the
  reason ("the bridge resolves names through the generated handler") — matches the
  repo's documented rot-handling pattern.

## Findings

- **S1 (defect, medium) — cross-site request forgery on the IPC bridge.** Nothing in
  serve.rs inspects `Origin` / `Sec-Fetch-Site`, and no custom header is required.
  A drive-by page open in a browser on any tailnet-joined device can POST
  JSON-shaped bodies to `http://<tailnet-ip>:17625/api/profile_delete`,
  `/api/set_microphone_enabled`, `/api/install_pack` (a no-cors `fetch` with a
  text/plain body sends raw JSON with no CORS preflight; content-type is never checked,
  and `credentials: "same-origin"` in ipc.ts guards nothing server-side). The card
  deferred *auth/SEC sign-off*, but the trusted-network bind policy defends against
  strangers, not against the trusted device's own browser — this attack class is new to
  the app and cheap to close: require an `x-lts-serve: 1` header on `/api/*` (the
  adapter already controls every call site; cross-origin senders then trigger a
  preflight the server never answers) or accept only `Sec-Fetch-Site: same-origin`.
  This should land before owner phone dogfooding, which is the card's stated sequel.
- **S2 (defect, minor) — the privacy-relevant surface has no user-facing doc.**
  docs/22_REMOTE_ACCESS.md shipped 19 minutes before the code and is the exact topical
  home, yet nothing in docs/, README, or QUICKSTART mentions lts-serve, port 17625, or
  browser mode (grep verified). The runbook lives only in state/notes (operator
  surface). AGENTS.md requires doc updates with privacy-relevant surfaces; a one-
  section add to docs/22 (how to start lts-serve, the URL shape, the trusted-network +
  no-auth warning, mic-unavailable note) closes it.
- **S3 (observation) — no ADR for a new network exposure mode.** AGENTS.md asks for an
  ADR on "significant architectural decisions". A permanent HTTP entry point driving
  the production IPC surface is arguably one; the notes file is thorough but is not a
  docs/adr entry. Judgement call — flagging, not mandating; if WEB-001 proper gets an
  ADR later, this slice can be cited into it.
- **S4 (observation) — single IPC owner thread serializes everything.** By design
  (session state lives once), but a long command (install, perf_asr) parks every other
  request including `/api/capabilities`. Fine for one learner on a phone; worth a
  sentence in the notes runbook so nobody debugs "the server is down" during an install.
- **S5 (observation) — no CI attestation yet at review time.** main is 4 commits ahead
  of origin (serve code+ledger included); the newest GitHub run (44958458520, at the
  parent tree 3444c2a) fails on JA pack audio/manifest rows — pre-existing media-lane
  drift, NOT serve-lane rot. Whoever pushes the serve lanes must batch and watch the
  fresh run per the CI rules (cancel-in-progress).

## Proposed FIX follow-ups (planner spawns cards)

1. FIX-SERVE-CSRF: origin/Sec-Fetch-Site (or custom-header preflight) gate on `/api/*`
   + adapter header + red-first test. Covers S1.
2. FIX-SERVE-WIRING-PARITY: single source of truth for the command registration lists,
   or an explicit annotated exclusion list + parity test; decide ime_candidates' browser
   fate while there. Covers D2.
3. FIX-SERVE-BLOCKING: direct AppHandle route through spawn_blocking. Covers D1.
4. DOCS-SERVE-SLICE: docs/22 serve-mode section + README pointer + the S4 one-liner in
   the notes runbook. Covers S2 (+S4 prose).
   (D3 rides any push as CI/watch attention; D4/D5 fold into 4 or any touching commit.)
