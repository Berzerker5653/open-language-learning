# Owner walkthrough — 2026-10-09 (in progress)

Ground rules agreed: the owner drives the app and calls out issues and
suggestions as they go; the agent **only takes notes** here and turns
them into KANBAN cards. **No code changes until the owner says the test
run is finished.**

Run channel: `scripts/launch-preview.sh` (debug build `target/debug/lts-desktop`,
vite dev server serving the current UI). Fresh data dir
`/tmp/lts-walkthrough-data` so onboarding, first-run steps, and a
never-used profile are all seen from zero; the owner's real profile
data in `~/.local/share/openlang` is untouched.

Template per item:

```
### W-NN — <short title>  [issue | suggestion]
- Screen/step: where in the walkthrough
- Did: what the owner did
- Expected: ...
- Saw: ...
- Owner suggestion: ...
- Candidate severity: blocker / annoying / polish
- KANBAN card: <id or pending>
```

## Log

(none yet)
### W-01 — Pack install gives zero feedback  [issue]
- Screen/step: onboarding → pack selection → Install button
- Did: clicked Install on the ja-JP pack
- Expected: some indication work is happening (progress/download/percent)
- Saw: button sits, nothing moves; the 350 MB build+install runs for
  roughly a minute-plus with no signal — looks hung
- Owner suggestion: loading bar / download bar / percentage — some
  notification that it's working in the background
- Candidate severity: blocker-class first-run UX (a new learner would
  conclude the app froze at the very first step)
- Engine state found while logging: the backend ALREADY emits
  `engine-progress` events (prepare → install → record, percent only
  when a real fraction is known — progress.rs contract), and
  `progress::reporter(&app)` is wired into all three install commands;
  the onboarding UI simply never subscribes or renders them. The long
  stages (`archive::build` zips the 350 MB tree, `archive::install`
  installs it) are currently indeterminate.
- KANBAN card: K-69

### W-02 — Day-1 plan interleaves alphabets and uses unlearned kana  [issue]
- Screen/step: Where to begin → Home Today, 5-minute budget, fresh profile
- Did: started the suggested activities
- Expected: only the letters introduced so far, one alphabet at a time;
  words should only use letters already taught
- Saw: `a`, `i`, `u` (hiragana) — note it stopped at three, not even
  e/o yet — then `a` AGAIN but in katakana: the same sound in the
  second alphabet on the same day — then `パン` ("pan / bread"), a
  word whose every kana is unlearned (`パ` = ha+handakuten, never
  taught; `ン` never taught)
- Owner suggestion: teach all of hiragana first and confirm the person
  can use/know it, then all of katakana the same way, and sprinkle in
  words that use only the letters learned so far, along the way
- Evidence: owner screenshot archived here as `W-02-home-today.png`
- Candidate severity: pedagogy correctness — the first five minutes
  mix alphabets and show a word the learner cannot read. Mechanism
  found while logging: the first-look word set seeds `パン` from the
  lexicon immediately (`languages/ja-JP/lexicon/food-drink.jsonl`,
  also in `global.jsonl`); katakana units are present in the day's
  selection alongside hiragana; ADR-0018 unit order is
  hiragana-then-katakana but no learned-set gate exists in selection
- KANBAN card: K-70

### W-03 — Research how other language programs do "today's work" and onboarding  [suggestion]
- Screen/step: whole walkthrough so far
- Owner suggestion: research how other language programs present the
  current day's work, and best practices for onboarding and teaching
  languages, then compare against our model (Home Today, guided first
  run, alphabet+words spine)
- Candidate severity: process — feeds the K-70 pedagogy decision and
  future plan-shaping cards
- KANBAN card: K-71

### W-04 — Mic consent in setup doesn't lead into speech setup  [issue]
- Screen/step: onboarding → microphone question; later: Languages tab →
  bottom → speech recognition/pronunciation model downloads
- Did: went through setup; answered the microphone question; later
  clicked through the app and discovered some activities need the
  speech models, which live at the very bottom of the Languages tab
- Expected: the question is fine, but answering "yes, use the
  microphone" should flow straight into the speech-related setup —
  recognition/pronunciation model downloads — as part of onboarding
- Saw: the mic step records the decision and that's it; the downloads
  are a separate, buried surface the learner finds only after clicking
  through the app (possibly after already hitting activities that need
  them)
- Owner suggestion: if the learner opts into the microphone during
  setup, go straight into speech recognition + pronunciation downloads
  from there; don't strand setup before a dependency the app later
  demands
- Candidate severity: annoying → churn risk (setup feels complete, then
  mid-activity the learner is sent scavenging for a download)
- Facts found while logging: onboarding's mic step only logs the
  `microphone-enabled` decision (lib.rs ~467/484); speech models are a
  separate catalog subsystem (`src-tauri/src/models/`, catalog +
  `model_dir` + speech pref) whose download UI sits at the bottom of
  the Languages tab — the two paths never meet during setup
- KANBAN card: K-72


### W-05 — Whisper-small download froze the window ("looked like a crash")  [issue]
- Screen/step: Languages tab → download whisper-small model
- Did: clicked the whisper-small model download
- Expected: download proceeds with visible progress; app responsive
- Saw: whole window went unresponsive — looked like a crash (the app
  process survived; the UI was dead weight for the duration)
- Candidate severity: blocker (first big download the learner triggers
  reads as the app dying)
- Facts found while logging: this is the SAME root cause as W-01. All
  72 `#[tauri::command]`s are plain sync `fn` (grep: zero `async`);
  Tauri 2 executes sync commands ON THE MAIN THREAD, so `install_model`
  blocks the event loop for the entire download. Worse,
  `models::download` (models.rs:371) buffers the whole ~466 MB payload
  into a `Vec<u8>` in memory, then SHA256-hashes that buffer — all
  synchronous. And because the event loop is blocked, the
  `engine-progress` stage events the install paths DO emit can never
  reach the webview mid-operation — which retroactively explains why
  W-01's pack install showed nothing even though events fire.
- KANBAN card: K-73 (and it amends K-69: progress UI is impossible
  until long commands run off the main thread)

### W-06 — Languages tab takes an exceedingly long time to load  [issue]
- Screen/step: Languages tab, every visit
- Did: opened the Languages tab (after installing models, and also
  noticing slowness before)
- Expected: fast tab load; owner believed slowness had been fixed
- Saw: long load every time
- Candidate severity: annoying→blocker for a core tab
- Facts found while logging: the earlier fix (K-63, committed — the
  25 s pack-parse path) is still in; this is a DIFFERENT slow path:
  `available_models` (sync, main thread) → `models::model_status`
  re-verifies every installed model by re-HASHING the full installed
  payload on EVERY tab open ("corruption reads as missing" design) —
  hundreds of MB of SHA256 per visit, on the main thread, growing with
  every model installed (whisper-small alone is ~466 MB)
- KANBAN card: K-74

### W-07 — Scenarios tab ordering reads wrong: unsupported first  [issue]
- Screen/step: Scenarios tab
- Did: looked at the scenario list
- Expected: the sensible first scenario first, clearly
- Saw: "Finding the station" listed FIRST but marked not-yet-supported;
  "First meeting" has a Start button but sits below — why is the
  unplayable one at the top, and which one IS the first scenario?
- Owner question: is Finding-the-station the intended first scenario,
  or First meeting?
- Answer from the data while logging: First meeting. Its goal is
  `ja.goal.onramp.respond-to-greeting` (onramp = day-one goal);
  Finding-the-station targets `ja.goal.a1.ask-location` (A1 stage,
  later). The list order looks like a filename artifact
  (directions.yaml sorts before first-meeting.yaml alphabetically) —
  no readiness or recommendation logic in the ordering.
- Candidate severity: confusing polish with real drop-off risk
- KANBAN card: K-75

### W-08 — Shadowing offers no model audio or record despite Whisper installed  [issue]
- Screen/step: Shadowing tab, after installing the whisper model
- Did: opened Shadowing expecting the speak-along loop (play model,
  record, play back)
- Expected: playable model audio + a record control, or at least a
  clear statement of what's still missing and a way to get it
- Saw: neither play nor record offered; no explanation
- Candidate severity: blocker-class (a headline activity silently
  absent after the learner did the download work)
- Facts found while logging: model audio goes through `speech_audio` →
  TTS chain — that needs the sherpa-onnx RUNTIME plus the Kokoro
  Japanese VOICE model; whisper is recognition only. In this test data
  dir (`/tmp/lts-walkthrough-data/models/`) only whisper-ggml-small is
  installed, so the play path genuinely has no voice; but the UI
  neither says so nor offers the missing pieces inline — it just
  withholds the activity. The three-piece speech stack (runtime /
  voice / recognition) being presented as separate raw model entries
  is exactly why a learner who "installed the Whisper model" reasonably
  expects speech to work.
- KANBAN card: K-76

### W-09 — Settings and Languages tabs overlap; consider merging  [suggestion]
- Screen/step: Settings tab vs Languages tab, side by side in use
- Owner suggestion: the two tabs feel near-identical; move Languages
  under Settings (or rearrange) so the app feels cleaner
- Saw: duplicated concepts — e.g. a speech-model picker exists in BOTH
  tabs (settings.tsx documents it as "Same preference as
  Languages → Speech (get/set_speech_model)")
- Candidate severity: polish / information architecture
- KANBAN card: K-77

## Ops notes

- ~08:55 the supervised preview wrapper was SIGTERMed (exit 143) right
  after the W-02 screenshot; a stray app + a stale yesterday-22:43
  vite kept serving fine. Owner chose a clean supervised restart
 (kill strays, relaunch `launch-preview.sh` with the SAME
  `/tmp/lts-walkthrough-data` — profile + installed pack preserved).
  No findings lost; no code changed.
