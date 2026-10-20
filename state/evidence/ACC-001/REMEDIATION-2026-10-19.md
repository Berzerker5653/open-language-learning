# ACC-001 owner-pass remediation — A11Y-RUN-L1-REMEDIATION-001

Date: 2026-10-19
Baseline: `1844b80` (the build the owner walked as run L1 — see `OWNER-PASS-2026-10-19.md`).
All six defects from the L1 pass are closed in code with automated proof. Per the
audit rule a fix requires a NEW live run (L2) before any announcement-level
conformance claim; the owner declined to sit for another Orca pass
("I do not want to do this again… fix what you need to and sign it all as
done") and had Orca removed mid-session, so **the L2 announcement re-verification
is deferred by explicit owner decision**. Nothing in `docs/assessment/ACCESSIBILITY_AUDIT.md`
was upgraded past the signed-route statement; L1 rows are untouched.

Orca removal state on the Gaming PC: processes killed (`pkill -f orca`); owner
was given `sudo pacman -Rns orca speech-dispatcher` to run in their own TTY
(sudo only works there; execution NOT confirmed by this agent). espeak-ng, ibus,
and ibus-anthy were deliberately kept — the app uses espeak-ng for TTS and
Anthy is the Japanese IME that run L1 signed as working (rows 4–5).

## Defect → fix map

| Defect | Fix | Files | Proof |
| --- | --- | --- | --- |
| F-01 (high) — Orca silent arriving at lesson pages, activity cards, wizard steps (only nav routes moved focus) | One focus-announcement effect in `App.tsx` now covers route, wizard-step, lesson-page and card transitions: a new `#main h1` node gets `tabIndex=-1` + focus; a newly shown practice card focuses its question `h2` instead (the card header h1 only says "Practice"). The preload race (task fetched while the lesson page is still up) is gated by `cardShown`. | `apps/desktop/src/App.tsx` | `apps/desktop/src/journeys/a11y-focus.journey.tsx` — mounted interaction journey: profile enter → `h1 "Hi Katya"` focused; plan row → lesson `h1` focused; *Start practising* → `h2 "Fill in the blank"` focused; Check (grading) does **not** steal focus; *Back to plan* → `h1 "Hi Katya"` focused again. This is the "proven by a mounted interaction test rather than a static render" acceptance demanded. |
| F-02 (low) — unlabeled `[filler]` node seen as a focus stop in `focus-events-run1.txt` | **No app-code change.** The app authors no tabbable content: the only `tabIndex` writes in the whole source set are the F-01 effect setting `-1` on headings. The `[filler]` accessibles are WebKitGTK containers around plain `<div>`s; the recorded filler focus events coincide with click/route transitions (webview-side re-parenting), not app-authored focusables. Nothing to remove or label in app markup. | — | `grep -rn tabIndex apps/desktop/src` (source: only `App.tsx` focus effect); tree dumps show filler wrappers throughout. If a future L2 rerun still shows a dead Tab stop, it is a WebKitGTK a11y bug to file upstream, not app code. |
| F-03 (medium) — three "Installed" buttons indistinguishable by ear | Install/Installed/Installing buttons now carry the pack display name and locale in the accessible name: `Install Japanese demo (ja-JP)` / `Installed: …` / `Installing …`. | `apps/desktop/src/onboarding.tsx` | `a11y.test.tsx` "names pack actions with their pack and speaks the tag line (F-04)" asserts `aria-label="Install Japanese demo (ja-JP)"` on the packs-step markup. |
| F-04 (low) — `(ja-JP, community)` double-read risk and missing space | The tag is now inside the radio's label text once, consistently spaced, with the sibling `<span>` marked `aria-hidden="true"` so browse mode reads it exactly once (the radio's own name already contains it). Settings speech-model Remove/Download buttons likewise gained names carrying WHICH model they act on. | `apps/desktop/src/onboarding.tsx`, `apps/desktop/src/settings.tsx` | same `a11y.test.tsx` test (`aria-hidden="true">(ja-JP, community)`); `settings.test.tsx` asserts `aria-label="Remove Whisper Small — largest download and memory"` and `aria-label="Download Whisper Base — larger download and memory, about 141.1 megabytes"`. |
| F-05 (high) — "Correct"/"Not quite" rendered but spoken by nothing: `aria-live` alone gave no live state over ATK | The verdict `<p>` now carries `role="status"` alongside `aria-live="polite"` — the ATK role is what the AT-SPI bridge surfaces (the old aria-live-only markup was the exact element the tree dump showed with no live state). Kept aria-live for standards; kept the pre-mounted live region (PS-03). | `apps/desktop/src/practice.tsx`, `apps/desktop/src/writing.tsx` | `practice.test.tsx` "carries the role the AT-SPI bridge announces (F-05)" — graded and ungraded markup both match `<p … role="status" … aria-live="polite"`. |
| F-07 (low) — no perceivable play/stop state on listening cards | `PracticeRunner` gained a `playing` prop: the Play button carries `aria-pressed` and a `role="status"` region announces "playing" while a clip runs. `App.tsx` tracks it from the `Audio` element's `ended`/`error` events. | `apps/desktop/src/practice.tsx`, `apps/desktop/src/App.tsx` | `practice.test.tsx` "exposes listening playback state to assistive tech (F-07)": idle → `aria-pressed="false"`; playing → `aria-pressed="true"` + status text `playing`. |

## Automated verification (2026-10-19)

- `pnpm vitest run` in `apps/desktop`: **38 files, 287 tests, all pass** — includes
  the new `a11y-focus.journey.tsx` and all existing journeys (keyboard route walk
  unaffected: focused headings carry `tabIndex -1` and never join the Tab order).
- `pnpm typecheck`, `pnpm lint`, `pnpm fmt:check` at the workspace root: all clean.
- No Rust changed — cargo gates unchanged.
- Live AT-SPI structure spot-check (no Orca needed — registryd answers alone):
  `atspi-dumps/remediation-mount-focus.txt` shows the running dev app with
  `[heading] 'Welcome back' states=focused` — the extended focus effect is live
  in the shipped webview, and heading focus states are exactly what Orca keys
  its arrival announcement off. Announcement-level audio re-verification (run L2)
  is deferred by owner decision; no conformance claim is made beyond the routes
  signed in run L1.
