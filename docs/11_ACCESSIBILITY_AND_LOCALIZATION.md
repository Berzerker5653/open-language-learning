# 11 — Accessibility and UI Localization

## Accessibility is architecture

Learning a spoken language may involve audio, but the application itself must remain navigable and understandable without relying on one sensory or motor modality.

## Requirements

Target WCAG 2.2 Level AA for the web UI, using [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/) and [WCAG2ICT](https://www.w3.org/TR/wcag2ict-22/) guidance to interpret the criteria for the native desktop application. This is a required future acceptance target, not a claim that this scaffold or a future build is already conformant. Record applicable A/AA criteria, justified non-applicability, additional product accommodations, and results in a versioned accessibility audit matrix.

- keyboard-only navigation for desktop;
- visible focus;
- screen-reader-compatible semantic structure;
- scalable text and responsive layouts;
- text contrast at least 4.5:1 (3:1 for WCAG-defined large text) and required non-text component/state contrast at least 3:1, subject to the criterion's stated exceptions;
- no correctness encoded only through red/green;
- reduced-motion setting;
- captions/transcripts for instructional audio where pedagogically appropriate;
- waveform/pitch visualizations have text explanations;
- audio controls have accessible labels;
- error messages explain recovery;
- time limits are avoidable except where timing is itself the assessed skill;
- recording tasks expose input-device selection/level test where platform permits.

Also require no keyboard traps; sensible dialog focus entry/return; focus not entirely obscured; programmatic name/role/value and non-disruptive status/error announcements; controls with names matching their visible labels; alternatives to dragging; and WCAG 2.2 target-size requirements/allowed exceptions. Validate 200% text resizing and 400% zoom/reflow for ordinary UI without loss of content or functionality. Any essential two-dimensional visualization exception needs an accessible explanation/control route.

Test actual supported desktop accessibility stacks, at least one representative mainstream screen reader per supported OS (for example NVDA on Windows, VoiceOver on macOS, and Orca on Linux), plus keyboard-only and zoom/reduced-motion paths. Pin the tested OS, app/webview, screen-reader and relevant language-voice versions in the audit matrix. Automated checks supplement manual testing; they cannot establish conformance alone. Fix semantics as components are built, with a final complete-journey audit before release.

Critical journeys include install/pack selection, onboarding, local/model permission or download flow, home/session planning, every shipped activity type and help/feedback state, later goal/scenario unlocks, interruption/recovery, settings, and export/import. Record pass/fail/not-applicable with evidence and rationale for each applicable criterion/journey; unresolved inaccessible critical paths fail the release gate.

The fillable matrix lives in `docs/assessment/ACCESSIBILITY_AUDIT.md` (kanban
O-03): a pinned-environment row per run, the journey checklist above, the
furigana/IME risks to test first, and a human-only sign-off block. Until a
signed row exists, no release may claim accessibility conformance beyond the
automated semantics checks in `apps/desktop/src/a11y.test.tsx`.

As of the 2026-10-08 settings slice the route set walked by the automated smoke test
(`scripts/smoke-desktop.sh`, 13 routes) includes the dedicated **Settings** route,
which now carries the microphone permission toggle, romaji display, speech-model
selection, profile export and profile delete. Those are critical-journey surfaces
(permission flow, settings, export, deletion), so they belong in the O-03 audit:
the automated route walk only proves they render without a panic, and the
`a11y.test.tsx` semantics checks cannot substitute for a screen-reader pass on a
destructive two-step confirm or a file-location disclosure.

## Speech accessibility

Learners unable/unwilling to use a microphone can learn other modalities. Speaking mastery remains unearned rather than faked. The UI should say "speaking not assessed" rather than penalize the entire course.

Declined permission, missing device/model, and technical/quality failures are unscored recoverable outcomes. Deferral must continue to work at later goals and scenario unlocks, not just on the first-run microphone screen. A relevant alternative route may unlock track access while the speaking prerequisite remains unassessed; do not synthesize speaking mastery from typed responses.

## Hearing accessibility

A learner can pursue reading/writing tracks. Listening/speech competencies remain distinct and can be hidden/deferred by preference without losing access to application navigation.

Provide transcript/caption controls for instructional media and text descriptions of important audio/visual states. If an assessment's construct is listening, exposing its transcript changes the evidence condition; score the appropriate text-supported/reading outcome or defer pure listening evidence. Essential audio/speech competencies cannot be made equivalent by relabeling a text activity. State those learning limitations plainly while keeping navigation and relevant other tracks usable.

Timing is adjustable or avoidable unless essential to the declared assessed construct. Response latency alone must not penalize slow input, disability, IME composition, or assistive technology. Record accommodated assessment conditions and preserve unassessed skills honestly.

## UI localization

Application chrome is separate from target-language curriculum. Support localization resource files and RTL layout. Do not assume the UI language equals the learner's native language or the target language.

Use explicit language/direction metadata for chrome and mixed-language content so assistive technology can select suitable pronunciation. Localization must cover error/recovery, privacy/permission, progress and uncertainty messages, text expansion, plural/number/date formatting, and pseudolocalized/RTL regression fixtures. Specify the interface locales actually shipped; infrastructure support does not imply all translations are available or reviewed.

RTL-001 gave the direction half of that requirement a concrete model. The only
interface locale shipped is English; no chrome translation exists yet. A pack
that declares `capabilities.rtl` flips only the containers rendering its own
text — `dir="rtl"` with the manifest locale in `lang` — while the banner, route
navigation, app-authored prompts, romanization and Latin glosses stay
left-to-right, so a mixed-script pack stays readable instead of being bidi-scrambled.
The flag is read from the pack's own manifest (`apps/desktop/src-tauri/src/packs.rs`
for installed packs, `lib.rs::manifest_rtl` for bundled/dev candidates), never
inferred from the locale. `docs/adr/0029-rtl-direction-model.md` records why the
shell is deliberately not mirrored; `apps/desktop/src/rtl-direction.test.tsx` and
`packages/ui/src/pack-direction.test.tsx` are the RTL regression fixtures. Still
open in this section: translated chrome and resource files, text expansion,
plural/number/date formatting, and a pseudolocalized pass.

## Typography

Language packs may declare font/script requirements, but do not distribute font files unless license permits. Prefer system/fallback font stacks where practical.

## Japanese rendering

Support ruby/furigana semantics, mixed Latin/kana/kanji layout, line wrapping appropriate to Japanese text, and selectable furigana visibility.

Test selectable/copyable text and ruby reading order with the supported screen-reader matrix, avoiding duplicate or nonsensical announcements. Japanese IME composition must not be submitted/scored before composition ends; controls and shortcuts must not intercept ordinary text entry. User-requested furigana remains available, with its use recorded when it changes reading-assessment validity.
