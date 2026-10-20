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
| L1 | 2026-10-19 | CachyOS, Linux 7.2.11-1-cachyos x86_64, KDE Plasma **Wayland** | `open-language-learning` 0.4.0-alpha.1 @ `1844b80` | WebKitGTK 2.54.1 | Orca 51.1 (rev 244bdadd9), AT-SPI2 2.62.1, speech-dispatcher 0.12.1 | espeak-ng 1.52.0 (app ja playback correct) | IBus 1.5.34-rc2 + Anthy 1.5.18-1.1 (session wired via System Settings ▸ Virtual Keyboard ▸ IBus Wayland) | ☑ partial — evidence `state/evidence/ACC-001/OWNER-PASS-2026-10-19.md`, `state/evidence/ACC-001/run-L1.log`, `state/evidence/ACC-001/atspi-dumps/` |
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
| 1 | first run → onboarding | profile-name field label, single-choice pack list with radio state, privacy notice for microphone/speech before first enable | name field | ☐ F-01 (step-change arrival silent; labels/radios/privacy text all exposed — see run sheet) |
| 2 | Practice | card prompt in ja + its gloss, answer field label, correctness feedback without colour-only wording, keyboard shortcuts | if typed | ☐ F-01/F-05 (feedback text present but silent; arrival silent) |
| 3 | Reading | passage in ja, sentence-level focus order, any gloss/reveal control announced | — | — not exercised (no runnable reading card in installed pack) |
| 4 | Dictation | playback control state (playing/stopped), typed-answer composition while converting kana→kanji, submit result | **yes** | ☑ IME: preedit+Anthy candidates inside WebKit entry, Enter commits into field only, submit via button; F-07 minor (no playing/stopped state) |
| 5 | Writing | prompt, input composition (candidate window, `Enter`/`Space` commit does not submit the form prematurely), correction feedback | **yes** | ☑ IME: kanji candidate (有難う) committed into field; no premature submit; feedback silent → F-05 |
| 6 | Pronunciation | contrast description, band wording read as text, the "not a diagnosis" framing, recorded-vs-model-output provenance label | — | — not exercised this run |
| 7 | Shadowing / Listening | audio start/stop, transcript toggle, the audio-provenance statement | — | ☑ partial: provenance + named playback button arrive announced; F-07 playing state; no Shadowing card in pack |
| 8 | Scenarios | turn order, each line's speaker, available replies as a list | if typed | — not exercised this run |
| 9 | Words / Kanji | entry headword (ja), reading, meaning; reading must not be the only distinguishing info | — | ☑ saved entry reads headword→reading→meaning→source in order; form fully labeled |
| 10 | Placement | question, band, and that the result is provisional | — | — not exercised (profile skipped placement) |
| 11 | Progress (goal map) | band section headings and glosses (`Getting started`, `A1`…), per-modality state per goal, `locked` vs `open` announced, prerequisite text | — | ☑ band landmarks+glosses, `open` in item name, per-modality sublists, prerequisite wording present (no locked band reached) |
| 12 | Languages | pack name as the manifest spells it, pack posture statement, version, install-from-path flow incl. error messages | install path | ☑ name+posture+version+claims+sources read; error path not fed |
| 13 | Settings | every field label, catalog URL field, speech device tier note, storage/export controls | — | ☑ all groups labeled; F-03-family bare "Remove" buttons noted |
| 14 | failure paths | offline pack install failure, missing TTS asset, missing microphone permission — each announced with the reason, not just a red border; and an install cancelled mid-download or mid-unpack announcing that nothing was installed and that a retry continues the download | — | — not exercised this run |

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
| auditor name / role | Berzerker5653, product owner |
| AT expertise (professional / regular user / assessor) | product owner; first supervised Orca session (run L1) |
| routes covered | 4, 5, 9, 11, 12, 13 pass; 7 partial; 1–2 fail by F-01/F-05; 3, 6, 8, 10, 14 not exercised |
| unresolved defects + severity | F-01 high (lesson/wizard arrival silence), F-05 high (silent correctness feedback), F-03 medium (ambiguous Installed/Remove names), F-02/F-04/F-07 low — fix scheduled as `A11Y-RUN-L1-REMEDIATION-001`; rerun rows after fix with new L2 row |
| date | 2026-10-19 |

An incomplete matrix does not block development, but no release may claim
accessibility conformance beyond the routes signed here (`docs/18`).
