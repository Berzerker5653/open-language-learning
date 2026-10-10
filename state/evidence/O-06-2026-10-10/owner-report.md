# O-06 — owner hands-on runtime report (2026-10-10, in progress)

Build run: debug preview on the Gaming PC (X11), binary `target/debug/lts-desktop`
at commit `ef58f03` (frontend dist rebuilt at the same revision). Owner data:
real `~/.local/share/openlang` (packs `eo-demo`, `ja-demo`,
`org.openlanguage.ja-jp.reference` 0.2.0 installed; whisper ggml
tiny/base/small + sherpa tiny downloaded and verified during this pass;
`speech.json` selects `whisper-ggml-small`).

This pass continues from the 2026-10-08 report; the sweep tranche
(PS-01..PS-09, commit `e2e9727`) was what the owner started clicking through.

## What the owner observed (condensed, as reported live)

1. Single-instance relaunch works: second launch focuses the open window
   (gate item PASS: exit 0, `_NET_ACTIVE_WINDOW` = app window, one process).
2. "Tabs are opening much quicker" — positive confirmation of K-63b priming.
3. Speech setup: **"Start with speech" could not be pressed** — the button
   stayed disabled no matter what was installed, so the step could only be
   left via "Skip for now".
4. Model downloads (four whisper-family entries) completed with visible
   progress and verification; all four now show installed in the panel.
5. **No sound** in Listening practice ("hear the reference") and Pronunciation
   reference clips.
6. Reading tap-lookup on 「私の名前はタナカです」 offered the word **mae
   ("front")** — 前 found inside 名前 (namae, "name").
7. Scenario "first meeting": the three **Support-box buttons** and the
   **Transfer-variants buttons** appeared to do nothing when clicked.
8. Shadowing: **play-model-audio / record / stop controls all
   non-clickable** for this profile.
9. "We don't have the option to leave the selected profile we pick at the
   beginning."
10. Setup shows no way to choose which speaker/headphones the app uses;
    owner's Focusrite Scarlett (mic-only in their wiring) was the system
    default output, so every app utterance went to a silent Line output.
11. After the sink fix: audio audible but "echoey and very metallic and
    tinny".

## Triage

| # | Finding | Status | Evidence / disposition |
| --- | --- | --- | --- |
| 3 | "Start with speech" permanently disabled | **Reproduced, fixed** | The gate required every speech component installed; the synthesis payloads are `installable: false` in this build (ADR-0009/D5-rest), so no install set could satisfy it. Fix `ef58f03`: catalog `role` field (recognition/synthesis), gate requires an installed *recognition* component, card states the app will not talk back without a synthesis engine. vitest 168, cargo test 125, fmt/clippy/eslint/prettier green. Owner re-test pending. |
| 5 | no sound anywhere | **Root cause measured — environment, not app** | App audio reaches PipeWire faithfully (`New clock: GstPulseSinkClock` under `GST_DEBUG=2` for a pack wav). The **system default sink** was `alsa_output.usb-Focusrite_Scarlett_Solo_USB…HiFi__Line__sink`, an interface output with nothing connected (owner: "the scarlett is my mic only"). Default switched to `alsa_output.pci-0000_0d_00.4.analog-stereo` (`pactl get-default-sink` confirms). Owner re-test pending. Device-choice gap itself is finding 10. |
| 10 | no output-device selection in setup | **Confirmed missing** | No output/speaker selection exists anywhere (grep: no `setSinkId`/output picker in `apps/desktop/src`). Settings has the *input* picker (K-64); setup's mic step is consent only. WebKitGTK ships a `setSinkId` binding (string present in `libwebkit2gtk-4.1.so.0`); per-element routing unverified in-app. Card proposed: per-profile audio output device (setup + Settings), pending owner scope confirmation. |
| 6 | lookup finds 前/mae inside 名前 | **Verified against the tree: content gap + documented engine design** | `sentence_word_spans` (`lib.rs:5297-5321`, K-80) is greedy longest-first but restarts at every uncovered char — no language analysis, by design (`story_lookup_returns_spans_not_substrings` pins the intent). The pack's lexicon contains まえ twice (`play2.jsonl:47`, `transport.jsonl:28`) and **zero** entries for なまえ/名前 (`grep` 0), so the sentence `ja.sent.my-name-wa` (whose own `cloze_targets` is なまえ) exposed the interior span. Fix = content: added `ja.lex.greetings.namae` (なまえ/名前, jmdict-simplified 3.6.2, draft, human review owed); regression test pins the real bundled pack. Engine "uncovered-run skip" heuristic rejected — that IS language analysis docs/00 forbids. Ships with the pack version bump already owed (K-78-follow/O-05). |
| 7 | scenario support/transfer buttons "do nothing" | Under investigation (read-only agent) | K-60 fixed the id-boundary; remaining possibilities are locked/feedback visibility or content gaps in the 0.2.0 installed archive. Mechanism report pending. |
| 8 | shadowing controls unclickable | Under investigation (same agent) | Render conditions for disabled controls vs the installed 0.2.0 archive's 694 media files pending. |
| 9 | no way to leave/switch profile | **Verified: absent affordance; already carded** | Native has no `switch_profile`/logout (`grep` 0); every command takes `profile_id` explicitly — single-profile-ness is purely frontend state (`App.tsx` `profileId` lifecycle; launch-time resume picker only). Settings has export + one-shot delete. The P1 card ("Profile switching after launch… the owner's O-06 pass should say whether it is actually annoying") is now answered by this pass — decision queued for the owner. |
| 1 | single-instance | **PASS** | Gate item 1 of the pass recorded. |
| 2 | tab latency | **PASS** | Owner-perceived fix of K-63b; `route-ms` markers remain the machine check. |
| 4 | downloads with progress | **PASS** | K-62 stage events observed; verification completed for all four entries (`~/.local/share/openlang/models/verified.json`). |
| 11 | reference audio sounds "echoey, metallic, tinny" | **Content/model limitation, not a defect** | Measured on the shipped clips: 24 kHz mono, zero clipped runs, no post-speech tail (residual rms 70 ≈ silence), zero-cross centroid ~500–700 Hz — the files carry no echo or digital damage; the character is the pinned Kokoro ja voice (same model K-56 recorded as fragile on ja). Level is low (RMS ≈ −24 dBFS), which reads as "thin"; loudness normalization at generation would help slightly but not the metallic quality. A genuinely better ja voice is a model-selection decision (owner), not an app fix. |

## Known content factor (affects 7/8 until republish)

The installed `org.openlanguage.ja-jp.reference` 0.2.0 archive carries only
the 694-file contrast-era media set, not the repo manifest's full audio
(K-78-follow republish gap, owner-authorized O-05 required). Surfaces gated
on missing media must show honest reasons; investigation will separate
"content gap" from "dead control" per finding.
