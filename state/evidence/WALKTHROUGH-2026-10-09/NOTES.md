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
