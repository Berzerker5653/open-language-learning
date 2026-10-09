# Preview readiness (separate from stable-release readiness)

Authorized by owner direction 2026-10-03. This gate governs a **locally
runnable, honestly labeled preview** only. It does NOT relax any
stable-release requirement; `--release-readiness` remains the stricter
gate and still fails (correctly) until review and calibration gates pass.

## Preview gate — status

| Requirement | Status |
| --- | --- |
| Clearly labeled draft/unreviewed content | OK — every pack labeled "unreviewed"; content items `status: draft`; UI shows community/unreviewed labeling |
| Original or properly licensed content only in preview packs | OK — `eo-demo` fully original (CC-BY-4.0, ai-assisted, unreviewed); `ja-demo` EDRDG-derived (CC-BY-SA-4.0, attribution in pack) + Apache-2.0 model-output audio; `languages/ja-JP` prose replaced with ai-assisted draft wording 2026-10-03 (`docs/provenance/ja-jp-draft-content.md`) and bundled as the default pack (K-32) |
| App code Apache-2.0 (ADR-0010), third-party licenses preserved | OK — `LICENSE`, `NOTICE`, `THIRD-PARTY-NOTICES.md` |
| Language selector usable | OK — first-run pack choice; Languages page: installed list, switch, empty-catalog "coming soon" + local import; interface language separate from learning language |
| Offline after install | OK — journey test runs with no network; packs + models local |
| Speech: guided/reference only, automatic scoring disabled | OK — speech profiles `calibration: null`, assessment capability flags false; interpreters abstain rather than grade |
| No Kokoro/espeak-ng in preview distribution | OK — TTS runtime resolved from dev vendor cache only; missing audio explained in UI ("this build does not include speech synthesis") |
| Calibration deferred | OK — recordings deferred until after preview by owner decision; requirements preserved for future assessed features |
| Community pack path safe | OK — catalog host allowlist, pinned checksums/sizes, same install validation, community trust never self-upgraded |
| Release files prepared without publishing | OK — `dist/preview/*.lpk` built (gitignored), metadata in `catalog/preview-entries.json` with `PENDING-RELEASE-URL`; live catalog empty |

## Gates that remain OPEN (visible, not weakened)

- **REVIEW-001** — qualified human review capacity. Nothing in the
  preview claims reviewed status; `review_status: reviewed` in any
  future catalog entry is an author claim shown as such.
- **SPEECH-007** — preregistered calibration recordings (deferred by owner until
  after preview). Automatic pronunciation scoring stays off. 2026-10-07: the
  "just synthesize the recordings" shortcut was tested and rejected with numbers
  in `benchmarks/speech/results/20261008T030000Z/`; the gate needs the specified
  learner panel or an explicit owner scope decision (kanban O-04).
- **LIC-001 — CLOSED 2026-10-04** (kanban O-01): code Apache-2.0 per ADR-0010,
  ja-JP pack content CC BY 4.0 recorded in `languages/ja-JP/licenses.jsonl` and
  `manifest.yaml:32-33` (`redistribution_allowed: true`), ru-RU CC0-1.0. The
  ai-assisted draft prose replacement (2026-10-03,
  `docs/provenance/ja-jp-draft-content.md`) stays recorded. TTS licensing is no
  longer "provider stays out of builds": per ADR-0009/TTS-002 the optional TTS
  variant ships the sherpa-onnx + Kokoro payload with payload-scoped GPL-3.0
  obligations (source offer, component texts, attribution UI), and the bare
  variant ships none of it.
- **Qualified review** remains open and is not a licensing item: nothing in the
  preview claims reviewed status, and content now carries the derived pack-level
  AI-generated posture statement (ADR-0014) instead of per-item draft badges.
- **Stable release (`REL-001`)** — unchanged requirements;
  `--release-readiness` must keep failing until the above close.

Journey test `preview_journey_select_activity_restart_switch_retain`
(select eo-demo → activities → restart retains Independent mastery →
switch to ja-demo → switch back → both listed offline), plus CI,
desktop smoke, and validator runs recorded in
`state/evidence/PREVIEW-2026-10-03/`.

## For the owner's hands-on pass (O-06, 2026-10-08)

Build and run: `scripts/build-catalog.sh` (regenerates pack audio, then the pack
archives) followed by `npx tauri dev` from `apps/desktop` (or
`./scripts/launch-preview.sh`, which also starts the vite dev server it needs).
A quick automated sanity walk first: `./scripts/smoke-desktop.sh` →
`SMOKE OK (25 routes walked)` across 13 routes.
Shell note: the helper scripts are bash, and `source scripts/tauri-env.sh` fails
outright in fish — `scripts/tauri-env.fish` is the equivalent (running a script
as a program is fine from any shell; only `source` is the problem).

CLI note: `cargo tauri …` does not work on the reference machine — no
`tauri-cli` is installed into `~/.cargo/bin`, and `pnpm` (12.8.1) lives in
`~/.npm-global/bin`, which the interactive fish PATH does not carry. Use the
workspace CLI (`npx tauri`, 2.12.1) and `set -gx PATH $HOME/.npm-global/bin
$PATH` in fish when a command shells out to `pnpm`.

Rendering note: `tauri dev` and the bare binary now render on X11 +
NVIDIA, because the desktop shell sets WebKitGTK's fallback renderer itself —
the blank-window GBM failure is fixed (2026-10-08). `WEBKIT_DISABLE_DMABUF_RENDERER=0`
puts the accelerated path back if someone wants to try it.

One measured note on that fallback: it does paint in software, and the obvious
suspicion — that this is why the biggest panel felt slow — was tested and
refuted. Running the automated walkthrough with `WEBKIT_DISABLE_DMABUF_RENDERER=0`
exported measured that tab at 484 ms instead of 465 ms. The lag was a cold
process parsing the installed pack once; that parse is now memoized per pack
version and primed at install and at startup, and the same tab first visit
measured 63 ms, then 46 ms in the newest run. The last full walkthrough has no tab
above 93 ms and no warm command above 60 ms, against a leave-and-return (no engine
call) of ~80 ms, which is the harness's own floor. The fallback stays
unconditional.

For pronunciation feedback and dictation you need a build that **carries** the
aligner, not `tauri dev`: `scripts/stage-aligner-sidecar.sh stage` (cmake +
network), then `… overlay`, then `pnpm --filter @openlang/desktop exec tauri
build --config dist/variants/tauri.aligner.json` from the repo root. That build
has already been made here on
2026-10-08: `target/release/bundle/deb/open-language-learning-platform_0.1.0_amd64.deb`
(78.80 MiB) and `…_0.1.0_amd64.AppImage` (180.56 MiB), both carrying the payload,
and the packaged binary reported `aligner:yes:bundled`. Installing one of those is
faster than building; a machine without pnpm needs the `beforeBuildCommand`
override noted in docs/13. Install it **on this machine**: pack lookup still
resolves through the build tree, so an installed bundle has no content anywhere
else until a pack overlay or the published catalog exists (kanban `K-59`).

Surfaces that changed since the 2026-10-03 preview note, and what to check:

- **Home** — a Start button for each of the six runnable modalities. "Places you
  can go" is pack data now: `cafe-price-check`, `cafe-order-drink`,
  `station-navigation`, `buy-a-ticket`, `self-introduction`, all locked on a fresh
  profile. Fastest proof that unlocking works: do recall practice on コーヒー and
  お茶 (goal *Order a drink and ask for the price*) plus one listening item, then
  reload Home — *Checking the price at the café* opens and the others stay shut.
  Unlocking follows derived mastery, never activity counts, and a place gated on a
  dimension no runner records is now rejected by the pack validator instead of
  shipping permanently locked.
- **Settings** (new tab) — microphone permission (turn it off and try a speaking
  activity: capture must refuse and say why), romaji display, speech model, and
  under "Your data" the **export** file it writes to `<data>/exports/` (recordings
  are deliberately excluded) and the two-step **delete profile**.
- **Listening / pronunciation / dictation / shadowing / reading** — these now use
  the profile's active pack. With audio built, the six-sentence demo and the
  693 pack assets are audible; with no audio on disk the pack installs and
  listening says there is nothing to hear instead of offering a blank item.
- **Honest boundaries in this build**: the aligner runtime now ships for
  `linux-x64` (ADR-0019). Languages → Speech states which runtime this build
  carries and on what terms — bundled `whisper.cpp 1.9.4`, a development runtime
  path, the CPU floor being unmet (`aligner-cpu-unsupported`, naming
  x86-64-v3), or genuinely absent. `cargo tauri dev` stages no payload: it
  resolves the bench tree if you have one, otherwise it abstains. No TTS payload
  is shipped, so those panels say so and the two TTS payloads show "not
  published in this build" and offer no download. Pronunciation feedback stays
  guided-only — no accuracy score is produced or implied (ADR-0017, docs/18).
- **Pack bytes changed** (audio + environments), so the published `0.2.0` archives
  are stale: the audio-bearing archive builds deterministically at 76,867,477 B,
  sha256 `a3819b85c2e2cf4d4fa98d4d159e74feacb8d5b61321c1dababf2e69ca666577`. The
  version bump and republish are owner actions under O-05.

### What changed after that pass (same day)

Your report is filed at `state/evidence/O-06-2026-10-08/owner-report.md`. These
are the fixes that came out of it, each with the thing to look at.

- **Blank window** — fixed inside the app: the renderer fallback is set in code,
  so launching from any shell (fish included, without sourcing anything) shows
  the UI. The launch script no longer has to export it.
- **Languages error (`missing required key scenarioId`)** — the scenario views
  were renamed at the IPC boundary. The wire shape is pinned by a test, and the
  headless walkthrough now clicks a real scenario (station directions); the
  smoke run fails if that click does not come back.
- **Mining the same word twice** — the second Mine keeps the original entry, so
  its review history survives, and says so: "… is already in My words — kept the
  original entry."
- **Install feedback** — pack and model installs report the phase they have
  entered: "Building the language pack from its source files — this can take a
  minute", "Checking the download against what the catalog promised",
  "Unpacking and checking the content…". Model downloads show a percentage
  derived from completed bytes; pack installs show no number, because there is
  no honest one to show. The line is announced to screen readers.
- **Microphone choice** — Settings carries a microphone picker and stores the
  device. If the webview answers with an empty list you are told so and can ask
  again; if your chosen device cannot be used, recording falls back to the
  system microphone and says that it did.
- **Route switching is now measured** — every tab switch in the walkthrough is
  timed and printed (`route timings:` in the smoke output). The two slowest on
  this machine were Languages (≈480 ms) and Scenarios (≈575 ms), both from
  re-parsing the installed pack on every command; both are now cached per
  installed pack version.
- **The greeting audio** — the shipped word asset was regenerated from the kana
  the pack declares (`docs/provenance/ja-jp-greeting-audio-k65.md`), and the
  validator now rejects a synthesized audio asset whose text does not match the
  reading its row declares. Listening and shadowing speak the declared reading
  rather than the written form.

Things a human still has to decide or perform, and that no AI run can sign:
the AT/screen-reader audit (O-03), the security/privacy review, qualified content
review (REVIEW-001), the pack version bump/republish and public flip (O-05), and
this pass itself (O-06). Two more are blocking work that is otherwise ready:

- **ADR-0020 (derived guidance)** is still `Proposed`. Until it is accepted or
  rejected, the guided first run and a language-neutral Home "Today" surface
  (kanban K-66) cannot ship: the app would be choosing what a learner should do
  next from rules the project has not agreed to.
- **Whether to bake word audio into the pack.** There are ~3,920 lexicon entries
  and the build is not reproducible byte-for-byte, so shipping their audio means
  the pack grows from ~77 MB to several hundred MB and every asset needs a
  manifest row tied to the reading it speaks. Current state: 693 built assets.
  The size is the owner's call, not the build's.
