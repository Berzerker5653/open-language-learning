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
| 10 | no output-device selection in setup | **Confirmed missing — built (K-88, `ff4efc2`)** | Owner scope answer 2026-10-10: "build it now". Settings ▸ Speech gained "Playback output": picker rendered only when a live probe finds `setSinkId` on the webview's media elements (WebKitGTK carries the symbol; whether it honours per-element routing is decided by the probe at runtime, never assumed) — otherwise the card states in words that the system sound settings decide. Stored per profile (`playback-device`) with the microphone's exact discipline: explicit-null clearing, unknown-profile refusal, round-trip test. `playBlobUrl` routes each clip, falling back to the system default when the device vanished. In-app routing on the real binary: pending the smoke/owner run. |
| 6 | lookup finds 前/mae inside 名前 | **Verified against the tree: content gap + documented engine design** | `sentence_word_spans` (`lib.rs:5297-5321`, K-80) is greedy longest-first but restarts at every uncovered char — no language analysis, by design (`story_lookup_returns_spans_not_substrings` pins the intent). The pack's lexicon contains まえ twice (`play2.jsonl:47`, `transport.jsonl:28`) and **zero** entries for なまえ/名前 (`grep` 0), so the sentence `ja.sent.my-name-wa` (whose own `cloze_targets` is なまえ) exposed the interior span. Fix = content: added `ja.lex.greetings.namae` (なまえ/名前, jmdict-simplified 3.6.2, draft, human review owed); regression test pins the real bundled pack. Engine "uncovered-run skip" heuristic rejected — that IS language analysis docs/00 forbids. Ships with the pack version bump already owed (K-78-follow/O-05). |
| 7 | scenario support/transfer buttons "do nothing" | **Live-binary markers: both work; not reproduced** | `SMOKE OK (13 routes)` on the rebuilt binary: the walker pressed the ladder's first support choice — `scenario-support:ja.scenario.first-meeting.greeting:consumed` — and the first transfer card — `scenario-transfer:…:done`. Both controls have real effect in the current build. Owner's observation predates every rebuild today; pending owner re-test in the rebuilt app before closing. |
| 8 | shadowing controls unclickable | **Live-binary probe: Play/Record enabled; not reproduced** | `shadow-buttons:4:1` — the Shadowing card renders 4 buttons with exactly one disabled: `Previous` at position 1 of the list, which is the by-design boundary rule. Play model audio and Record are enabled on the live binary. Owner clarification said Play/Record were the grey ones — that state has never existed in any build (verified at `ef58f03` and K-11 `bcab616`) and does not exist now. Pending: owner re-check in the rebuilt app; if it still greys, capture `window.getComputedStyle` evidence next time. |
| 9 | no way to leave/switch profile | **Verified absent — built by owner ask (`68a69f8`)** | Native has no `switch_profile`/logout; single-profile-ness is purely frontend state. Owner answered the P1 card with "just so we have it": Settings ▸ Profile data gained a two-step Switch profile — clears every per-profile surface like delete does, writes nothing destructive ("Switching deletes nothing"), lands on the resume picker. Owner re-verification in the rebuilt app pending. |
| 1 | single-instance | **PASS** | Gate item 1 of the pass recorded. |
| 2 | tab latency | **PASS** | Owner-perceived fix of K-63b; `route-ms` markers remain the machine check. |
| 4 | downloads with progress | **PASS** | K-62 stage events observed; verification completed for all four entries (`~/.local/share/openlang/models/verified.json`). |
| 11 | reference audio sounds "echoey, metallic, tinny" | **Content/model limitation, not a defect — level now fixed, character accepted** | Measured on the shipped clips: 24 kHz mono, zero clipped runs, no post-speech tail (residual rms 70 ≈ silence), zero-cross centroid ~500–700 Hz — the files carry no echo or digital damage; the character is the pinned Kokoro ja voice (same model K-56 recorded as fragile on ja). Level was low (RMS ≈ −24 dBFS, reads as "thin") — fixed at generation by the normalization pass (`128f77e`); the metallic character stays until a voice-model decision "down the road" (owner, uncarded). |

## Known content factor (affects 7/8 until republish) — RESOLVED locally 2026-10-10

The installed `org.openlanguage.ja-jp.reference` 0.2.0 archive carried only the 694-file
contrast-era media set, not the repo manifest's full audio (K-78-follow republish gap).
Resolved at owner request: the pack was regenerated (all 4,614 assets, loudness-normalized,
manifest `128f77e`), bumped to **0.2.1** with the H1 display-name cleanup (`4d2e458`), built
deterministically (`dist/ja-jp-reference-0.2.1.lpk`, 282,806,245 B,
sha256 `464f51520d8c78899ce8c7531ae1589b5697dfcdbda7b119f68af19595c8e644`) and installed into
the owner's store — `…/openlang/packs/org.openlanguage.ja-jp.reference/0.2.1`, previous 0.2.0
kept (rollback available). Publishing the archive + catalog remains the O-05 gate. The profile's
*active* pack still points at 0.2.0 until switched in Settings ▸ Language packs.

## Machine leg, 2026-10-10 afternoon (after the findings were triaged)

- Regeneration: `bg_23` (serial) died at its 50-min job deadline ~870/4,613 assets; `generate-pack-audio.py --jobs 12` added (`e2b3524`, unittests green + live probe), full regeneration completed (`128f77e`), scaffold validation 0/0, conformance `test` 0/0.
- Cargo suite: **126 passed** (incl. the なまえ span regression and media pairing against the new bytes).
- Smoke on the rebuilt binary: **`SMOKE OK (13 routes walked)`** — five tabs + eight hub modes, all ≤ 96 ms; scenario leg acked `scenario-support:…:consumed` and `scenario-transfer:…:done` (finding 7 works live); Shadowing leg acked `shadow-buttons:4:1` (finding 8: Play/Record enabled live).
- K-88 playback picker built (`ff4efc2`); routing on the real webview decided by its capability probe at first Settings-open (owner run will show picker vs. honest system copy).

## Owner re-verification checklist (the human half of the pass, pending)

Relaunch `scripts/launch-preview.sh`, then: (1) five-tab nav + hub drill; (2) Settings ▸ Profile data → Switch profile; (3) Speech cards split + Playback output section (picker or honest fallback sentence — either is the correct outcome, tell us which you see); (4) Settings ▸ Language packs → switch active pack to v0.2.1, listen: louder audio, lookup in "私の名まえは何ですか" names なまえ; (5) re-test Shadowing controls and the scenario ladder/transfer in the rebuilt app (findings 7/8 close on this); (6) K-81 nav sign-off.

## Finding 12 — Kokoro-ja mispronounces taught kana (machine-confirmed), engine replaced

Owner reported all five Japanese Kokoro voices render `私の名まえは何ですか`
as "nomae", not "namae" — on content where the kana reading is DECLARED and
fed verbatim to the engine. Machine-confirmed by whisper-small round-trip:
the shipping voice (sid 37) transcribes 「ノマエアですか?」. This is a
correctness failure on taught audio, not tone, and it disqualifies Kokoro-ja
(author-graded C-range) for baked learning content.

Resolution: owner ran a four-engine bake-off (19 sentences × ja/es/ko, all
loudness-normalized, review tree `/tmp/tts-bakeoff/review/`) and chose
Qwen3-TTS (Apache-2.0). All four bake-off engines transcribe the same probe
as 「私の名前は何ですか」. Decision recorded ADR-0023 +
`docs/provenance/qwen3-tts-adoption.md`; board card K-89 / roadmap TTS-003;
full 4,614-asset re-bake underway (`/tmp/rebake-qwen-2026-10-10.log`).
Runtime in-app Kokoro fallback is unchanged (K-90 tracks its removal
separately); users never hear baked-Qwen vs runtime-Kokoro on the SAME item,
so the mismatch is bounded to items lacking baked media — which the re-bake
closes for the ja pack.
