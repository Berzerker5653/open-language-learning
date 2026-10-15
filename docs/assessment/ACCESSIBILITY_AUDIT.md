# Screen-reader and IME audit worksheet (O-03 → ACC-001)

This is an **owner gate**. `docs/11_ACCESSIBILITY_AND_LOCALIZATION.md` requires a
representative screen reader per supported OS plus keyboard-only, zoom and
reduced-motion paths, with the tested OS, app/webview, screen reader and voice
versions **pinned**. A qualified human AT user must perform and sign the audit;
it cannot be self-certified by an AI (AGENTS quality bar, `docs/09`, `docs/16`).
The automated semantics checks in `apps/desktop/src/a11y.test.tsx` (K-33:
landmarks, headings, labels, focus-visible, skip link, reduced-motion and
contrast math) **supplement** this audit and prove nothing about announcements.

Fill one row per run. Never edit or delete an earlier row; reruns after a fix
get a new row.

## 1. Pin the environment (one row per run)

| run | date | OS build | app version + commit | webview | AT + version | Japanese voice | IME | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| L1 | | Linux: | `open-language-learning` @ `git rev-parse --short HEAD` | WebKitGTK: | Orca: | espeak-ng / other: | ibus + Mozc / Anthy: | ☐ pass ☐ fail |
| W1 | | Windows: | | WebView2: | NVDA: | | MS IME Japanese: | ☐ pass ☐ fail |
| M1 | | macOS: | | WKWebView: | VoiceOver: | | Japanese input: | ☐ pass ☐ fail |

Only the Linux/Orca row is blocking for the desktop release candidate
(`docs/13`): Windows and macOS bundles are produced but untested
(ADR-0015), so their rows stay empty until someone runs them.

Capture the exact values, do not write "latest":

```sh
git rev-parse HEAD
pkg-config --modversion webkit2gtk-4.1     # or the sysroot version in scripts/tauri-env.sh
orca --version
espeak-ng --voices=ja | head -3
ibus version 2>/dev/null || busctl --user get-property org.freedesktop.IBus /org/freedesktop/IBus org.freedesktop.IBus.Version
ls /usr/share/ibus/component/ | grep -i "mozc\|anthy"
```

Capture the app log for the session, e.g.
`RUST_LOG=info pnpm tauri dev 2> state/evidence/ACC-001/run-L1.log`
(recorded evidence path goes in the verdict column).

## 2. Setup for the Linux/Orca run

1. Orca running with a Japanese-capable voice for ja text (the `espeak-ng`
   `ja` voice is enough to check that ja strings are read as Japanese instead
   of being skipped; note the voice name in section 1).
2. Japanese input: `ibus-daemon -drx`, add Mozc (or Anthy), switch with
   `Super+Space`. Record which engine you used — composition behaviour differs.
3. Start the app: `pnpm tauri dev` from `apps/desktop` after
   `source scripts/tauri-env.sh` (the webkit sysroot is user-local;
   `CONTRIBUTING.md` has the setup). Built bundles land in
   `apps/desktop/src-tauri/target/release/bundles/`.
4. Turn on each condition separately and note failures per condition:
   screen reader only · keyboard-only (no pointer) · 200% zoom ·
   `prefers-reduced-motion: reduce` (GNOME Accessibility).

## 3. Journeys to audit

Every route is reachable with `Tab` from the skip link; each row records: focus
lands somewhere sensible, state is announced (not colour-only), and Japanese
text is announced as Japanese. Column **IME** only applies where listed.

| # | route (nav label) | what must be announced | IME | pass |
| --- | --- | --- | --- | --- |
| 1 | first run → onboarding | profile-name field label, single-choice pack list with radio state, privacy notice for microphone/speech before first enable | name field | ☐ |
| 2 | Practice | card prompt in ja + its gloss, answer field label, correctness feedback without colour-only wording, keyboard shortcuts | if typed answer | ☐ |
| 3 | Reading | passage in ja, sentence-level focus order, any gloss/reveal control announced | — | ☐ |
| 4 | Dictation | playback control state (playing/stopped), typed-answer composition while converting kana→kanji, submit result | **yes** | ☐ |
| 5 | Writing | prompt, input composition (candidate window, `Enter`/`Space` commit does not submit the form prematurely), correction feedback | **yes** | ☐ |
| 6 | Pronunciation | contrast description, band wording read as text, the "not a diagnosis" framing, recorded-vs-model-output provenance label | — | ☐ |
| 7 | Shadowing / Listening | audio start/stop, transcript toggle, the audio-provenance statement | — | ☐ |
| 8 | Scenarios | turn order, each line's speaker, available replies as a list | if typed reply | ☐ |
| 9 | Words / Kanji | entry headword (ja), reading, meaning; reading must not be the only distinguishing info | — | ☐ |
| 10 | Placement | question, band, and that the result is provisional | — | ☐ |
| 11 | Progress (goal map) | band section headings and glosses (`Getting started`, `A1`…), per-modality state per goal, `locked` vs `open` announced, prerequisite text | — | ☐ |
| 12 | Languages | pack name as the manifest spells it, pack posture statement, version, install-from-path flow incl. error messages | install path | ☐ |
| 13 | Settings | every field label, catalog URL field, speech device tier note, storage/export controls | — | ☐ |
| 14 | failure paths | offline pack install failure, missing TTS asset, missing microphone permission — each announced with the reason, not just a red border; and an install cancelled mid-download or mid-unpack announcing that nothing was installed and that a retry continues the download | — | ☐ |

For each failure record: route, component/file, what Orca actually said, what it
should have said, and the condition (zoom/motion/keyboard). Fix semantics in the
component as it is built (`docs/11`); do not add audit-only workarounds, and do
not mark anything "as designed" that a screen-reader user cannot perceive.

Focus handling changed on 2026-10-15 (`A11Y-FLOW-001`): a route change now moves
focus to the destination route's own heading, so the first thing each row above
should record is whether Orca announces the new heading (and does not leave the
announcement on content that already left). The automated keyboard journey
`apps/desktop/src/journeys/keyboard.journey.tsx` proves focus *lands* there; it
proves nothing about what is announced, which is exactly this worksheet's job.

## 4. Known risk to test first

GTK/WebKitGTK + IBus composition is the historically fragile path: candidate
windows, `Escape` cancelling composition versus clearing the field, and
`Enter` committing a conversion instead of submitting. Rows 4 and 5 are the
release-relevant ones for a Japanese pack; if they fail, file the defect with
the exact engine version — the app cannot fix webview composition bugs itself
and the fallback (kana-only input with a romaji helper) is a product decision,
not an implementation detail.

Measured on 2026-10-15, so the run is not wasted on a phantom: nothing in
`apps/desktop/src` handles `Enter`, `isComposing` or `compositionstart` — every
submit is a button click (`writing.tsx:27,74`) — so an app-side "Enter submits
the form" defect is not reachable in this build. If IBus/WebKitGTK still commits
a conversion into a submit, that is the webview's behavior: record it with the
exact engine version rather than looking for a handler to remove.

Furigana is currently a sibling `<small>` line, not ruby markup:
`apps/desktop/src/practice.tsx:67-69` and `App.tsx:1772-1774` render the reading
after the headword. `docs/11` asks for ruby/furigana *semantics* and for the
reading order to be checked against the screen-reader matrix "avoiding duplicate
or nonsensical announcements". Test what Orca actually says for a kanji word
with a reading shown — headword then reading (acceptable), reading twice
(defect), or nothing for the reading (defect) — and record which. If the markup
needs to change, that is a component fix with its own audit row, not something
this worksheet can settle.

## 5. Sign-off (human only)

| field | value |
| --- | --- |
| auditor name / role | |
| AT expertise (professional / regular user / assessor) | |
| routes covered | |
| unresolved defects + severity | |
| date | |

An incomplete matrix does not block development, but no release may claim
accessibility conformance beyond the routes signed here (`docs/18`).
