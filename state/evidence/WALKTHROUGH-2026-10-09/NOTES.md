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
- Saw: `a`, `e`, `o`… then `a` AGAIN but in katakana (same sound, second
  alphabet, same day), then a word containing kana the learner has never
  been shown
- Owner suggestion: teach all of hiragana first and confirm the person
  can use/know it, then all of katakana the same way, and sprinkle in
  words that use only the letters learned so far, along the way
- Candidate severity: pedagogy correctness — the first five minutes of
  the product teach in an order that confuses alphabets; the pack's
  unit order is hiragana-then-katakana (ADR-0018) and the vocabulary
  selection does not filter by learned kana, so this is a selection/
  gating bug, not a content-ordering bug
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
