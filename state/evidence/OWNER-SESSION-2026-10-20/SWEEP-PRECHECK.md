# Sweep pre-check — machine-proof vs human-judgement (Runbook B §B.3 / packet §2)

Prepared 2026-10-20. Fresh smoke run executed once from repo root:
`LTS_SMOKE_TIMEOUT=900 scripts/smoke-desktop.sh` (no `lts-desktop` instance was
running; `pgrep -x lts-desktop` exit 1). Verdict line, quoted verbatim:

```
SMOKE OK (13 routes walked)
Wall time: 154.26 seconds
```

Markers from that same fresh run used below: `mic-picker:present`,
`shadow-buttons:4:1`, the scenario quartet
(`scenario-started/step/support/transfer:ja.scenario.first-meeting.greeting`),
`routes-complete:5`, per-route `route-ms` timings, `goal-map-assert 75`,
`aligner:no:speech-model-off`.

Note: all file/test citations below are static proof that the behaviour is
specified and unit/journey-tested — they do NOT prove the installed 0.4.3-alpha.1
app feels right in your hands. That gap is exactly what the ☐ boxes are for.

## 1. Five-tab nav + hub drill; single-instance relaunch; tab latency

Machine-proved:
- Fresh smoke walked all five top-level tabs with timings:
  `route-ms:Today:80`, `Practice:63`, `My Words:63`, `Progress:96`, `Settings:61`,
  then `routes-complete:5`; hub drill: `goal-map:75` + `goal-map-assert 75`.
- Return-visit latency measured: `route-2ms:Settings:80`.
- Single-instance is compiled in and initialised: the smoke build logs
  `Compiling tauri-plugin-single-instance v2.5.2`; `apps/desktop/src-tauri/src/lib.rs:7983`
  (`.plugin(tauri_plugin_single_instance::init(...))` — second launch unminimises/focuses the existing window).
- `apps/desktop/src/hub.test.tsx` ("PracticeHub") pins hub copy/behaviour;
  `apps/desktop/src/journeys/restart-resume.journey.tsx` covers restart-then-resume.
Human-only: whether relaunch actually lands on the one window in your session,
and whether tab latency *feels* normal (80 ms numbers ≠ feel).

## 2. Settings ▸ Profile data → Switch profile (finding 9)

Machine-proved:
- `apps/desktop/src/settings.test.tsx:139-149` — "offers leaving the profile
  without deleting anything, with a confirmation step": asserts `Switch profile…`,
  `Switching deletes nothing`, disarmed≠armed, `aria-label="Switch profile
  confirmation"`, `Yes, switch profile` (O-06 2026-10-10 P1).
- `apps/desktop/src/journeys/export-restore.journey.tsx` covers the export/restore
  companion path.
Human-only: clicking through the real dialog in the installed app and that the
switch lands where you expect.

## 3. Speech cards split + Playback output section — picker OR honest sentence (finding 10 / K-88)

Machine-proved:
- Both honest branches exist in the shipped code: `apps/desktop/src/settings.tsx:551-561`
  — picker note when outputs are known, else verbatim
  "the system sound settings decide where audio plays." (You must report *which* you see.)
- Output enumeration: `apps/desktop/src/capture.ts:76-85` `listOutputs` (K-88:
  real device names only); mic side `capture.ts:37-52` + `apps/desktop/src/capture.test.ts`
  ("microphone selection (K-64)": stored-device exact request, loud fallback report,
  only browser-named devices listed).
- Fresh smoke: `smoke-ok mic-picker:present`.
Human-only: which branch the installed desktop runtime actually shows, and the
Speech-cards split reading correctly to you.

## 4. Language-pack switch; loudness-normalised audio; tap-lookup なまえ (findings 5/6/11)

Machine-proved:
- Pack switching UI: `apps/desktop/src/language.test.tsx:153-156` ("marks the
  active learning language and offers switching"); journey coverage
  `apps/desktop/src/journeys/language-switch.journey.tsx`, install path
  `pack-install.journey.tsx`, `dup-install.journey.tsx`. Pack install itself
  passed for both 0.4.3 `.lpk`s (`langpack install --store` → 0 errors, packet §Artifacts).
- Loudness normalisation is bake-time and real:
  `scripts/generate-pack-audio.py:132` ("loudness normalized, gain … peak ceiling");
  my measured peaks for the ten §3 clips sit at the -3.1 dB ceiling
  (TTS-CLIPS.md table) — consistent with normalisation, not proof of it sounding level.
- Tap-lookup: `apps/desktop/src-tauri/src/lib.rs:6165` sentence view carries the
  "tap-to-lookup panel" lexicon entries; `lib.rs:9464` test: tapping
  わたしの なまえは タナカです。surfaced なまえ (same sentence shape as the
  packet's 私の名まえは何ですか).
Human-only: does switching packs in-app work, do clips sound loudness-matched
across the switch, and does the tap on なまえ work on the touch/desktop surface.

## 5. Shadowing controls + scenario ladder/transfer variants (findings 7/8)

Machine-proved:
- Fresh smoke: `smoke-ok shadow-buttons:4:1` (shadowing control count) and the
  full scenario leg: `scenario-started` → `scenario-step …:advanced` →
  `scenario-support …:consumed` → `scenario-transfer:ja.scenario.first-meeting.greeting:done`.
- `apps/desktop/src/scenario.test.tsx:86-89` ("lists scenarios with honest lock
  reasons"); `apps/desktop/src/journeys/session.journey.tsx`,
  `upperband-sequence.journey.tsx` walk session/ladder flows.
Human-only: whether the re-tested shadowing controls behave acceptably (findings
7/8 close only on your ☑) and the ladder/transfer *variants* you choose to try
beyond the one greeting scenario the smoke walks.

## 6. K-81 nav sign-off

Machine-proved (the automated half of the nav/a11y surface):
- `apps/desktop/src/a11y.test.tsx` — "automated accessibility audit (ACC-001 auto
  portion)": no positive tabindex, every control named/labeled, skip link +
  landmarks, one h1 per route, live regions pre-exist, contrast ≥ 4.5:1,
  reduced-motion/`:focus-visible` rules.
- `apps/desktop/src/journeys/keyboard.journey.tsx` ("keyboard-only route walk")
  and `a11y-focus.journey.tsx` ("focus lands on the heading of every new screen", F-01).
Human-only: K-81 is explicitly a sign-off (runbook line 309; STATUS.md:1171
"rides the K-81 nav decision") — keyboard-only nav comfort, focus behaviour, and
whatever AT you run are yours to judge; nothing here can ☑ it.

## 7. Kana keyboard (issue #2)

Machine-proved:
- Setting exists per-profile: `apps/desktop/src/settings.test.tsx:122-124`
  (kanaKeyboard radio `romaji-kana` / `off`; the test file is `ime.test.ts`, no `.tsx`).
- Converter: `apps/desktop/src/ime.test.ts` — progressive typing at every
  keystroke (`kanaDisplay("konnichi")` = こんにち prefix), small tsu by doubling,
  n-disambiguation, Escape-commit rules (`kanaCommit` never drops characters),
  non-romaji pass-through.
- End-to-end journeys: `apps/desktop/src/journeys/kana-kbd.journey.tsx` —
  "romaji typed on the surface field lands as kana", "Escape cancels the
  half-typed syllable; Enter completes the word, grading untouched",
  "with the setting off the app intercepts nothing".
Human-only: typing `k-o-n-n-i-c-h-i-w-a` in the installed app (live feel),
Escape/Enter with real key timing, and the IBus/Anthy non-interference claim —
the journey proves the app intercepts nothing when off, but "your IBus/Anthy
still behaves exactly as before" can only be confirmed at your keyboard.

## Also still purely human after this pre-check

- §3 listening verdicts (TTS-CLIPS.md numbers support, never decide).
- §4b Omarchy perf leg (needs owner sudo), the p50-line decision.
- Finding-11 character ("echoey, metallic, tinny") — ears only.
