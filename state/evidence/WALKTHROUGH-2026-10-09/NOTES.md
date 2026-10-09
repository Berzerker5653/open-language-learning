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

### W-10 — Pronunciation "reference" plays nothing; no clue what to repeat  [issue]
- Screen/step: Pronunciation tab → clicked reference audio
- Expected: hear the model so you know what to repeat — or be told
  audio is unavailable and how to enable it
- Saw: silent; no audio, no explanation (screenshot at 09:09)
- Candidate severity: blocker (the activity's whole premise fails
  silently — same missing voice chain as W-08, different surface)
- Facts found while logging: identical root as W-08(a): reference audio
  = `speech_audio` TTS chain (sherpa-onnx runtime + Kokoro voice),
  neither installed; the click just fails quietly. The app never says
  "reference audio needs the speech setup — install it" anywhere on
  this surface
- KANBAN card: K-78

### W-11 — Progress goal map reads as a broken hierarchy  [issue]
- Screen/step: Progress window (screenshot archived as
  `W-11-progress.png`)
- Did: looked at the goal map
- Expected: a structure that explains itself — if four items sit under
  a locked one, do they belong to it? Must they be done to unlock it?
- Saw: a LOCKED top item with four OPEN items below it — the four
  "shouldn't be open" if they are children of a locked parent; nothing
  says which reading is true
- Candidate severity: confusing — undermines the whole motivation model
- Facts found while logging: it is NOT a hierarchy. `GoalMap`
  (home.tsx:412) groups goals into FLAT bands (onramp, A1, …); within
  a band it's one undifferentiated list, each goal independently
  open/locked by its prerequisites ("Goals open as their prerequisites
  are met" is only in the small-print intro). So a locked goal sitting
  above open ones is just list order — but every reader will parse it
  as parent/child. Nothing per-goal shows WHY it is locked or WHAT
  unlocks it
- KANBAN card: K-79

### W-12 — Reading lookup shows bogus letter breakdowns and wrong words  [issue]
- Screen/step: Reading (graded reader) → tap sentence → word lookup
- Did: clicked "Konnichiwa"; then clicked the second word/sentence
  "kore wa nan desuka"
- Expected: definitions of the actual words in what was clicked;
  breakdown only makes sense for a full sentence, and then into real
  parts — "100% locked in" correctness
- Saw: for Konnichiwa: three entries — definitions for `chi` (ち), the
  word konnichiwa, AND `ni` (に) — letter-level entries broken out of
  a single word, in nonsense order (file order). For "kore wa nan
  desuka": entries about things that are not visibly in the sentence
- Candidate severity: blocker-class content correctness (trust in the
   dictionary collapses; a learner cannot tell right answers from
   junk)
- Facts found while logging (ROOT CAUSE, code-level): `story_view_at`
  (lib.rs:4948–4951) selects "known words" with raw substring
  containment — `entry.text.contains(&e.surface)` over every lexicon
  entry. Single-kana/short entries therefore match INSIDE longer words
  (こんにちは ⊃ ち, に), cross-morpheme substrings produce phantom
  matches in sentences, and the list keeps lexicon-file order. Fix
  direction: token-level matching — longest-match segmentation over
  lexicon surfaces (a covered span yields ONE entry; the word
  こんにちは yields こんにちは only), or use the pack's DECLARED
  sentence slots (`LexEntry.slots`, the cloze mechanism) for parts of
  sentences; sort results by position in sentence; expected-token sets
  for the two observed cases need linguist review per repo research
  discipline before being pinned as fixtures
- KANBAN card: K-80

### W-13 — Third apparent crash; process verified ALIVE = freeze again  [issue]
- Screen/step: Reading tab use, ~09:2x
- Did: clicked around reading; window went dead-looking ("app crashed
  again")
- Saw (from this side at the time of report): supervised service
  `lts-walkthrough2` READY, `lts-desktop` pid alive with low CPU — the
  app did NOT die; another main-thread freeze episode
- Candidate severity: blocker — third occurrence; owner now believes
  the app is unstable
- KANBAN card: appended to K-73 (audit list now includes `story_view`
  — first call parses the full lexicon + per-sentence reader work on
  the main thread — plus `shadowing_items`, `goal_map`)

## Ops notes

- ~08:55 the supervised preview wrapper was SIGTERMed (exit 143) right
  after the W-02 screenshot; a stray app + a stale yesterday-22:43
  vite kept serving fine. Owner chose a clean supervised restart
 (kill strays, relaunch `launch-preview.sh` with the SAME
  `/tmp/lts-walkthrough-data` — profile + installed pack preserved).
  No findings lost; no code changed.
- ~09:13 SECOND wrapper death (exit 143 — app binary got SIGTERM after
  15m15s), same pattern: a fresh unsupervised app+vite pair had been
  started at 09:13 (desktop entry / manual relaunch). Killed strays,
  relaunched supervised as `lts-walkthrough2`, same data dir. If the
  09:13 pair came from the owner force-killing a frozen window, both
  deaths are field evidence for K-73 (main-thread blocking reads as a
  crash); awaiting owner's account.

