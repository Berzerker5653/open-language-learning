# APP-SPLIT-001 — split the 5305-line App.tsx (code quality)

Source: 2026-11-25 repo hygiene audit: apps/desktop/src/App.tsx is ~5305 lines (orchestrator + JSX hotspot), the largest file in the web app. Its responsibilities mix: serve-mode probe wiring, onboarding/AppShell wiring, pack state, Today header, navigate/history, settings integration, journey harness wiring, and inline surface-wire decisions.

Scope (code quality, zero behavior change):
- Extract cohesive per-surface helpers/components into focused modules under apps/desktop/src/ (e.g. app/home-wiring, app/serve-probe, app/navigation-wiring, ...), keeping tsc + vitest green and behavioral output identical.
- No feature change, no re-pin of behavior, no gate edits; do not touch a file owned by an in-flight lane (git status before staging).

Acceptance:
- App.tsx is materially smaller (target ≤ ~1500 lines; goal stated against measured line counts before commit).
- tsc clean; full desktop suite green; validate_handoff green.
- Evidence: state/evidence/APP-SPLIT-001/gates.log with before/after LOC + lane gates.

Not in scope: settings.tsx / home.tsx (adjacent, separate candidates if the owner wants another split), any pack changes.
