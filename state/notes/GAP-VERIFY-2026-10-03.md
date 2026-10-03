# GAP-VERIFY-2026-10-03 — untested-area sweep results

Scope: every previously untested surface in the desktop preview, tested
one at a time on the built debug binary (native GUI, XTEST + OCR-driven)
or the Chromium mock harness.

## Verified live

- Writing route (see WRITE-001 "Live native verification"): task
  rotation, hint support levels, verdict, evidence rows.
- Microphone path (see SPEECH-005-live): permission handler, WebAudio
  capture, native `pronunciation_check`, honest abstain.
- Pack import via the native file chooser: valid `.lpk` installs
  (`pack_installations.installed_at` refreshed); a corrupt `.lpk` is
  rejected with the archive-inspect error surfaced in the UI.
- Catalog UI from the cached-catalog path: entries render with
  author/license/size/SDK/review-claim metadata and installed-version
  join; Install on a not-installed entry runs the real command and
  surfaces the honest `download failed: ... 404` (see gap below).
- Zoom/reflow: at 800x600 with 200% root font-size (mock harness),
  every route (packs, home, progress, pronunciation, writing,
  languages) has zero horizontal overflow; radios/headings visible.
  Native 1.75x system text scale was already observed reflowing
  full-width without clipping.

## Honest gaps (owner-only, cannot be closed here)

- Catalog download happy path: entries must be https on
  github.com/objects.githubusercontent.com (allowlist). Publishing
  `dist/preview/*.lpk` as GitHub release assets requires owner
  authorization; until then only the failure path is exercisable.
- Screen-reader matrix (NVDA/VoiceOver/Orca) and IME composition
  audit: docs/11 requires human assistive-tech review.
- REL-001 release gates: human pedagogical review, ja-JP licensing,
  calibration evidence — never self-certifiable.

## Auto-update pipeline

Tested against a local bare remote: fetch + fast-forward, rebuild only
on HEAD change (stamp file), restart of the running preview, refusal to
pull over uncommitted changes, and warning (no merge) on a
non-fast-forward upstream move.
