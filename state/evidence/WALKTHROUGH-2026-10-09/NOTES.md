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

## Ops notes

- ~08:55 the supervised preview wrapper was SIGTERMed (exit 143) right
  after the W-02 screenshot; a stray app + a stale yesterday-22:43
  vite kept serving fine. Owner chose a clean supervised restart
 (kill strays, relaunch `launch-preview.sh` with the SAME
  `/tmp/lts-walkthrough-data` — profile + installed pack preserved).
  No findings lost; no code changed.
