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
archives) followed by `cargo tauri dev`. A quick automated sanity walk first:
`./scripts/smoke-desktop.sh` → `SMOKE OK (26 routes walked)` across 13 routes.

For pronunciation feedback and dictation you need a build that **carries** the
aligner, not `tauri dev`: `scripts/stage-aligner-sidecar.sh stage` (cmake +
network), then `… overlay`, then `cargo tauri build --config
dist/variants/tauri.aligner.json`. That build has already been made here on
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

Things a human still has to decide or perform, and that no AI run can sign:
the AT/screen-reader audit (O-03), the security/privacy review, qualified content
review (REVIEW-001), the pack version bump/republish and public flip (O-05), and
this pass itself (O-06).
