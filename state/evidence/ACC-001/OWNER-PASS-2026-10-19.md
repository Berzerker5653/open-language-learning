# ACC-001 / O-03 — owner hands-on Linux/Orca pass (run L1), 2026-10-19

Worksheet: `docs/assessment/ACCESSIBILITY_AUDIT.md` (sections 1–5). The
owner performs; the agent records and never self-certifies (§5 sign-off
stays blank until the owner signs it).

## 1. Environment (pre-filled from probes; confirm the AT versions after install)

| run | date | OS build | app version + commit | webview | AT + version | Japanese voice | IME | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| L1 | 2026-10-19 | CachyOS, Linux 7.2.11-1-cachyos x86_64, KDE Plasma on Wayland (IBus Wayland wired via System Settings ▸ Virtual Keyboard) | open-language-learning 0.4.0-alpha.1 @ `1844b80` | WebKitGTK 2.54.1 | Orca 51.1 (rev 244bdadd9), AT-SPI2 2.62.1, speech: espeak-ng via speech-dispatcher 0.12.1 | espeak-ng 1.52.0 (ja audio from app played correctly) | IBus 1.5.34-rc2 + Anthy 1.5.18-1.1 | ☑ partial: signed ☑ 4,5,9,11,12,13, 7 partial; ☐ 1,2 (defects F-01/F-05); not exercised 3,6,8,10,14 |
App log for the session: `state/evidence/ACC-001/run-L1.log` (capture
command in §Setup below).

## Setup (owner terminal)

```sh
# 1. AT stack (already run by owner):
pacman -S --noconfirm --needed orca speech-dispatcher espeak-ng ibus ibus-anthy

# 2. pins (paste output into the row above):
orca --version
ibus version 2>/dev/null || busctl --user get-property org.freedesktop.IBus /org/freedesktop/IBus org.freedesktop.IBus.Version
ibus engine   # after switching with Super+Space -> IbusAnthy

# 3. Japanese input:
ibus-daemon -drx
# System Settings -> Keyboard Input Method: add Anthy; Super+Space toggles.

# 4. Orca:
orca &            # or Super+Alt+S; first-run setup dialog: keep default speech (speech-dispatcher/espeak-ng)
# espeak-ng ships a `ja` voice; confirm it is selected for ja strings.

# 5. the app (second terminal), logged:
cd ~/game-dev/LTS && source scripts/tauri-env.sh
export PATH="$HOME/.local/opt/pnpm-12.8.1:$PATH"
cd apps/desktop && RUST_LOG=info pnpm tauri dev 2> ~/game-dev/LTS/state/evidence/ACC-001/run-L1.log
```

Conditions to repeat key rows under (report deltas, don't redo everything):
screen-reader-only · keyboard-only (never touch the mouse) · 200% scale
(System Settings ▸ Display) · reduced motion
(`echo -e '[Settings]\ngtk-enable-animations=false\n' >> ~/.config/gtk-3.0/settings.ini`, restart app).

## 3. Journeys — record what Orca ACTUALLY said

| # | route | must be announced | IME | owner report | pass |
| --- | --- | --- | --- | --- | --- |
| 1 | first run → onboarding | profile-name field label; pack list with radio state; microphone/speech privacy notice before first enable | name field | Orca at window open: "Open Language Learning Platform frame"; nothing announced after wizard step change — focus events under investigation (atspi-dumps/focus-events-run1.txt). Tree: skip link first; "Onboarding" landmark; progress list items 1–4; heading "Your data stays on this device" + 5 privacy bullets exposed; entry labeled "Your name (local only)"; button "Create local profile". Pack radios not yet reached. | ☐ |
| 2 | Practice | card prompt ja + gloss; answer field label; correctness feedback without colour-only wording | if typed | Tree: headings "Practice"/"Which one matches?", prompt 'あ' text, panel "Choices" with named buttons a/i/u/e, Pause/Stop named. Feedback text '✓ Correct' present (not colour-only) BUT no live-region state — Orca announced NOTHING on answer (owner: "didn't say anything, it just says correct on the app itself"). Single-char option names near-inaudible (note). Defects F-01, F-05. | ☐ |
| 3 | Reading | passage ja; sentence focus order; gloss/reveal control | — | | ☐ |
| 4 | Dictation | playback control state; kana→kanji composition inside the field; submit result | **yes** | IME PASS (session wired: System Settings ▸ Virtual Keyboard ▸ IBus Wayland): typing arigatou in the answer field pre-edits, Space opens Anthy candidate list (5 options), cycling Space, Enter COMMITS INTO FIELD ONLY (no form submit — form submits on Check button only); committed ありがと graded honestly by Check. Orca key-echo speaks the English letters being typed (expected echo, preedit itself not spoken) — note. Play-the-audio clip: Japanese voice sounds correct. Playback button named "Play the audio"; provenance "synthesized voice (model output)" exposed. | ☑ |
| 5 | Writing | prompt; candidate window; Enter/Space commits conversion, NOT the form; correction feedback | **yes** | IME PASS: arigatou → Anthy candidates → Space/Enter committed kanji 有難う directly into the field; form submits only via Check button. Feedback "↻ Not quite — the answer is …" is explanatory text (not colour-only) but silent (no live region, F-05). Entry labeled "Type your answer". | ☑ |
| 6 | Pronunciation | contrast description; band wording; "not a diagnosis"; provenance label | — | | ☐ |
| 7 | Shadowing/Listening | audio start/stop; transcript toggle; audio-provenance statement | — | Partial (Listen runner; no Shadowing card in this pack/profile): "Play the audio" named and arrives focused (announced); provenance "synthesized voice (model output)" exposed; choices panel named with full-sentence button names. GAP: play control shows no pressed/playing state — start/stop not perceivable by ear (F-07). Transcript toggle not present on this runner. Feedback area again live-less (F-05 family). | ☑partial |
| 8 | Scenarios | turn order; speaker per line; replies as a list (U07: undeliverable rungs now read disabled + reason) | if typed | | ☐ |
| 9 | Words/Kanji | headword, reading, meaning; reading not the only distinguisher; **furigana check**: headword-then-reading OK; reading twice / reading skipped = defect | — | PASS (tree): saved entry = one list item, name "ありがとうございます (ありがとうございます) — Thank you · manual · not scheduled yet" → headword, reading (once), meaning, source, schedule in order; "Review now"/"Remove" named; all form entries labeled. Heading 'My words' arrives `focused` (contrast lesson-route silence → F-01 route-specific). Owner ears not separately captured for the list item. | ☑ |
| 10 | Placement | question, band, and that the result is provisional | — | not exercised this run (new profile skipped placement; wizard offers it separately) | ☐ |
| 11 | Progress | band headings + glosses; per-modality state; locked vs open; prerequisite text | — | Tree PASS: landmarks "What you can do now"/"Goal map"; band landmark "Band Getting started" with heading + plain-language gloss; each goal name ends with **open** state + per-modality sublist ("reading not started", "listening/speaking/interaction not started"); prerequisite semantics stated ("Goals open as their prerequisites are met. … reading does not imply speaking"). No locked bands yet (fresh profile) — locked wording untested. | ☑ |
| 12 | Languages | pack name as manifest spells it; posture statement; version; install-from-path errors | install path | Tree: each pack reads name+code+version+posture ("Japanese Reference Pack (Draft) (ja-JP) — v0.2.0, community… AI-generated content · not human-reviewed"); "learning this language" marker; per-pack claims sections ("What this pack claims (0.2.1)", "Review posture", "Stated sources" incl. EDRDG/JMdict license provenance); "Learn this"/"Update to v0.4.2"/"Install v0.4.2" named. Install-from-path error path not exercised (import button present, no bad file fed). | ☑ |
| 13 | Settings | every field label; catalog URL; device-tier note; storage/export controls | — | Tree: labeled groups — Microphone check box checked + "Microphone to record from" combo + Detect; Romaji radios with state (Auto… checked); Profile data: Export/Restore entry/"Check a backup…"/"Switch profile…"/"Delete profile data…"; Speech model combo with version+license; Community catalog section; Import a pack file; Display settings toggle trio. F-03-family: three bare "Remove" buttons in speech-component list. Arrival announcement FIRED for this nav route (heading focus event, owner heard Orca). | ☑ |
| 14 | failure paths | offline install failure, missing TTS asset, no mic permission — reason announced; cancelled install announces nothing-installed + resumable retry | — | | ☐ |

## Defects found (run L1)

| id | severity | route | component/file | observed | expected |
| --- | --- | --- | --- | --- | --- |
| F-01 | high | lesson/activity routes + wizard step changes only | practice/lesson container + onboarding step change (App.tsx / practice.tsx / onboarding wizard) | Orca silent arriving at lesson pages, activity cards, wizard steps — those containers fire no focus event. Contrast (focus-events-routechange.txt): nav routes DO fire — `[heading] 'Language packs'` focus event seen, Orca spoke on arrival; My Words heading arrives focused | lesson routes and step changes must move focus to their heading exactly like nav routes do |
| F-03 | medium | 1 (language step) | onboarding pack list | three buttons all named "Installed" — indistinguishable by ear ("Installed, button" ×3) | names carry pack context, e.g. "Install Japanese (ja-JP, community)" |
| F-04 | low | 1 (language step) | pack radio label | "(ja-JP, experimental)" is inside the radio name AND a sibling node — double-read risk in browse mode; "(ja-JP,experimental)" missing space in name | tag once, consistently spaced |
| F-05 | high | 2 (Practice) | practice feedback area (practice.tsx) | correctness feedback ("✓ Correct") renders but no live/announce state — silent to Orca | role=status/aria-live so the moment of correctness is spoken |
| F-02 | low | onboarding + others | unlabeled [filler] wrapper receives a Tab stop (seen in focus-events-run1.txt) | dead stop announced as nothing/"section" | remove from tab order (no tabindex) or label it |
| F-07 | low | 7 (Listen), likely 4 | listen playback button ("Play the audio") | no pressed/playing state — audio start/stop not perceivable by ear | aria-pressed toggle semantics or status announcement "playing"/"stopped" |

> Resolved same day under `A11Y-RUN-L1-REMEDIATION-001`: F-01, F-03–F-05, F-07
> fixed on top of `1844b80` with automated proof — see `REMEDIATION-2026-10-19.md`.
> F-02 finding: the app authors no focusable source (the only `tabIndex` writes in
> the source are the F-01 effect setting `-1` on headings); the `[filler]` nodes are
> WebKitGTK containers and the recorded filler focus events coincide with
> click/route transitions — nothing to remove in app markup; treat as a
> webview-side observation to file upstream if an L2 rerun still shows a dead stop.
> L2 live announcement re-verification is deferred by explicit owner decision.

## Scope not exercised in run L1

- Row 3 Reading: no runnable reading card in this pack/profile ("no practice runner for this yet" — honest empty state itself was announced correctly).
- Row 6 Pronunciation, row 8 Scenarios, row 10 Placement: not present/reached this run.
- Row 14 failure paths (offline install failure, mid-cancel resume, bad import file): not exercised.
- Conditions: keyboard-only largely honored during the Tab walkthrough; 200% scale and reduced-motion deltas NOT re-run.
- Shadowing runner not present in installed packs (row 7 partial).

Route-change first check for EVERY row: does Orca announce the new route's
heading (focus moved there by A11Y-FLOW-001)?

Known-fragile first (§4): rows 4 and 5 — IBus/WebKitGTK composition.
Nothing in the app handles Enter/composition (all submits are button
clicks), so a composition-submit defect is webview behavior: record the
exact engine version, don't hunt for an app handler.

## 5. Sign-off (human only — owner fills)

| field | value |
| --- | --- |
| auditor name / role | Berzerker5653, product owner |
| AT expertise | product owner; first supervised Orca session (run L1, 2026-10-19) |
| routes covered | 4, 5, 9, 11, 12, 13 pass; 7 partial; 1–2 fail by defects F-01/F-05; 3, 6, 8, 10, 14 not exercised |
| unresolved defects + severity | F-01 high; F-05 high; F-03 medium; F-02, F-04, F-07 low — filed as cards A11Y-ROUTE-FOCUS-001, A11Y-FEEDBACK-LIVE-001, A11Y-AMBIGUOUS-BUTTONS-001, A11Y-LABEL-DUP-001, A11Y-DEAD-TABSTOP-001, A11Y-PLAYBACK-STATE-001 |
| date | 2026-10-19 |

Sign-off basis: recorded at the owner's explicit in-session direction
("Berzerker5653, product owner … fix what you need to and sign it all as
done", 2026-10-19). No release may claim accessibility conformance beyond
the routes listed above (`docs/18`) until the filed defects are fixed and
affected rows re-run.
