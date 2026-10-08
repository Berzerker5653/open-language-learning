# Feature-gap audit for the owner hands-on pass — 2026-10-08

Read-only audit per ADR-0017 §6 (feature completeness judged by the owner's hands-on pass).
Scope: `apps/desktop` (Tauri shell + React UI), `languages/ja-JP` + `languages/ru-RU` pack data,
`catalog/packs.json`, `apps/desktop/src-tauri/models/catalog.json`, scripts/CI.
Nothing was changed. Every claim carries a `file:line`. Executed checks are marked **[ran]**;
claims derived from code paths not executed here are marked **[inference]**.

Known context applied, not re-reported as news: repo private (O-05) ⇒ in-app catalog asset
downloads 404 (`state/STATUS.md:607-609`); this section determines the user-visible consequence instead.

---

## Inventory

61 commands in `generate_handler` (`apps/desktop/src-tauri/src/lib.rs:4913-4976`).
Nav = the 12 route buttons in `apps/desktop/src/App.tsx:1501-1603` (one nav bar; no other nav surface).

| Capability | UI entry point (file:line) | engine command | pack data present? | degradation when data/model/media missing | verdict |
|---|---|---|---|---|---|
| Local profile create | `onboarding.tsx:88-115` | `create_profile` (lib.rs:261) | n/a | error alert, retry (App.tsx:484-489) | works (offline SQLite) |
| Resume-at-launch picker | `onboarding.tsx:64-86` | `list_profiles`, `resume_profile` (lib.rs:296,301) | n/a | alert; only escape is new profile | works |
| Privacy notice | onboarding welcome (`onboarding.tsx:88-96`) | `privacy_notice` (lib.rs:73-89) | n/a | static fallback text (App.tsx:114-120) | works, but over-promises (see Honesty) |
| Bundled pack list | onboarding packs step (`onboarding.tsx:117-159`) | `available_packs` (lib.rs:148) | ja-JP + eo-demo only (lib.rs:120-133); **ru-RU never offered** | empty list would pin Continue disabled | partial (ru-RU unreachable from UI) |
| Install bundled ja-JP | onboarding Install button (`onboarding.tsx:133-140`) | `install_pack` → `install_bundled_pack` (lib.rs:171-194) | ja-JP sources yes; 693 declared `.wav` absent in any git checkout (`.gitignore:18`) | alert "Could not install that pack: media manifest does not match the pack (media_unbuilt)…" | **dead end on fresh checkout [ran]** |
| Install eo-demo | same | same | fixture `tests/fixtures/packs/eo-demo` (6 lexicon rows) | none | works |
| Community catalog browse | Languages → "Community catalog" (`language.tsx:301-338`) | `catalog_packs` (lib.rs:208; packs.rs:152-209) | live catalog file exists (`catalog/packs.json`) but URL comes only from `LTS_PACK_CATALOG_URL` env (packs.rs:153), unset everywhere in repo **[ran: no export in scripts/tauri-env.sh, launch-preview.sh, ci.yml]** | default copy: "Community packs are coming soon — this build has no catalog configured yet." (`language.tsx:106-107`) | dead end by default |
| Catalog pack install | Languages Install/Update (`language.tsx:327-333`) | `install_catalog_pack` (packs.rs:331-350) | — | with env set: fetch 404 → alert (App.tsx:390-393); verified 404 via `curl -I` on the published asset URL **[ran]** | dead end (O-05 consequence) |
| Local `.lpk` import | Languages file input (`language.tsx:347-355`) | `import_pack` (lib.rs:221-224; packs.rs:354-362) | ru-RU/eo-demo buildable offline; ja-JP blocked by same media gate **[ran for ja-JP]** | checksum/identity/schema rejections surfaced | works (the only real offline pack-install path) |
| Installed list + switch | Languages (`language.tsx:197-225`) | `installed_packs`, `active_pack`, `switch_pack` (packs.rs:393-427) | — | "pack not installed" (packs.rs:421-422) | works |
| Pack content claims | Languages claims block (`language.tsx:227-276`) | `pack_claims` (lib.rs:1945) | full (counts + postures + provenance) | claims null until loaded | works |
| Home plan | Home (`App.tsx:2162-2171`, `home.tsx:55-119`) | `home_state`, `practice_plan` (lib.rs:1433,1448) | ja-JP rich (lexicon 111 shards, orthography, kanji 84, sentences, contrasts) | "Nothing is due right now…" (`home.tsx:81-84`) — but no "explore" affordance exists | partial: only `recall-meaning` items are buttons (`home.tsx:89`) |
| Recall-meaning runner | Home plan item Start (`home.tsx:89-97`) | `practice_task`/`practice_submit` (lib.rs:4059,4077) | yes | task-build errors → alert | works |
| Comprehension-listening runner | **none** — planned items of this modality render as inert text (`home.tsx:98-115`) | `practice_task` supports it (lib.rs:3067-3072 via `practice_build`), `listening_audio` (lib.rs:4674) | media exists only after `generate-pack-audio.py`; else TTS fallback | audio error copy (`App.tsx:686-690`) | **dead end: no click path** |
| Phonological-discrimination runner (K-10) | **none** (same plan-list inert row) | `contrast_audio` (lib.rs:3379; media named `{id}-{index}.wav`, lib.rs:3399) | contrasts.jsonl present; generated media `-0/-1` present after build | same audio-error copy | **dead end: no click path** |
| Kana script recognition runner (K-04) | **none** (orthography-recognition plan rows inert; Kanji route covers kanji only) | `practice_task` modality `orthography-recognition` (lib.rs:3069) | orthography/ 2 files (hiragana+katakana) | — | **dead end: no click path** |
| Cloze / plan dictation (K-12 production-writing & orthographic-encoding) | Writing route covers production-writing via lexicon (`App.tsx:1538`); plan cloze/dictation rows inert | `practice_task` typed runner (`practice.tsx:129-149`), `dictation_audio` (lib.rs:3587) | sentences/ 2 files | — | partial (typed runner reachable only for Writing-route targets) |
| Production-writing route | Writing nav (`App.tsx:1538-1541`) | `writing_task`/`writing_submit` (lib.rs:2844,2861) | lexicon | "No new writing targets in this pack right now…" (`App.tsx:2060-2066`) | works |
| Graded reading | Reading nav (`App.tsx:1575`), stories (`App.tsx:1738-1754`) | `story_list`/`story_view`/`story_audio` (lib.rs:3696,3743,3806) | 3 stories (`languages/ja-JP/stories/`) — ungated (lib.rs:3701-3716) | "No stories…", per-sentence audio error copy | works; audio needs built media or TTS |
| My Words / sentence mining | My Words nav (`App.tsx:1583`), story "Mine" (`App.tsx:1798-1804`) | `mine_add/list/remove/grade` (lib.rs:3830-3950) | n/a | due-review start finds nothing → silent no-op (`App.tsx:1101-1105`) | works; **`mine_due` has zero callers** (lib.rs:3935,4974; grep over `src/*.tsx` [ran]) |
| Placement | Placement nav (`App.tsx:1591`) | `placement_plan/submit` (lib.rs:4340,4345) | assessments/definitions.jsonl present | finished-immediately when empty (`App.tsx:779-782`) | works |
| Kanji drill | Kanji nav (`App.tsx:1599`) | `kanji_list` (lib.rs:3329) + `practice_task/submit` | kanji/ 84 rows across both shards (all read via `jsonl_dir_texts`, lib.rs:467) | alert on error | works |
| Scenarios | Scenarios nav (`App.tsx:1559`) | `scenario_*` (lib.rs:4957-4965; scenarios.rs) | 4 ja-JP scenarios (`activities/scenarios/`) | locked list with reason (`scenario.tsx:203-214`); hard-prereq gate (scenarios.rs:120-138) | works (locked at day 1 — honest) |
| Pronunciation (guided) | Pronunciation nav (`App.tsx:1522`) | `pronunciation_demo/check`, `reference_audio` (lib.rs:2265,2350,2729) | phonology/contrasts.jsonl present | demo missing → "declares no pronunciation contrasts" (`App.tsx:1629-1635`); check abstains with copy (`pronunciation.tsx:65-80`) | partial: **reference playback never works** (see Dead ends D3); scoring needs vendored `whisper-cli` (D4) |
| Speaking / free-ASR dictation | Speaking nav (`App.tsx:1530`) | `dictation_target/check` (lib.rs:4839,4845) | sentences present | abstain copy (`dictation.tsx:39-43`) | **dead end without `~/.cache/lts-bench/whisper.cpp/build/bin/whisper-cli`** (lib.rs:2315-2348) — no in-app path provides that binary |
| Shadowing | Shadowing nav (`App.tsx:1567`) | `shadowing_items` (lib.rs:3433), `speech_audio` (lib.rs:4457) | lexicon | "No shadowing targets…"; TTS error notice (`App.tsx:972`) | partial: pack id hardcoded fallback `org.openlanguage.ja-jp.reference` (`App.tsx:964`); audio only from built media or a resolved TTS |
| TTS status + attribution | Languages → Speech (`language.tsx:357-403`) | `tts_status` (lib.rs:4651) | — | "No speech synthesis is installed. Audio activities are disabled; everything else works offline." (`language.tsx:116`) — accurate | works |
| In-app TTS payload download | Languages Download buttons (`language.tsx:389-395`) | `install_model` (lib.rs:4708-4721) | model catalog pins `https://PENDING-RELEASE-URL/tts/…` (`models/catalog.json:93,111`) | ureq DNS failure → raw error alert | **dead end: placeholder URL** |
| Whisper ASR model download | Languages radio list (`language.tsx:431-463`) | `install_model` with HuggingFace URLs (`models/catalog.json:13`) | HF URLs reachable **[ran: `curl -I` → 302 to CDN]** | size/checksum verified, staging cleaned on failure (models.rs:127-197) | downloads work, but **useless alone**: aligner binary resolves only from bench vendor dir (lib.rs:2320-2330) |
| Speech model select / tier detect | Languages fieldset (`language.tsx:419-466`) | `get/set_speech_model`, `recommended_speech_model` (lib.rs:4822,4827,4815) | n/a | "tier could not be detected" copy (`language.tsx:416`) | works |
| Stress-mark display setting | Languages Display settings (`language.tsx:278-299`) | `display_settings`/`set_display_settings` (lib.rs:865,892) | per-pack (ru has U+0301, ja none) | honest "nothing changes" copy (`language.tsx:283-285`) | works |
| Goal map + progress | Progress nav (`App.tsx:1514`; `home.tsx:275-342`) | `goal_map`, `progress_summary` (lib.rs:2064,1476) | 75 goals (`languages/ja-JP/curriculum/goals.yaml`) | "No goals are available yet…" | works |
| World "Places you can go" | Home section (`home.tsx:120-142`) | `world_state` (lib.rs:2111) | **hardcoded app-side demo config with a hardcoded ja content id** (lib.rs:2076-2101) | locked badges forever | stub / partial (see D6) |
| Smoke walkthrough | none (dev; `LTS_SMOKE_FILE`) | `app_mode`, `smoke_ack` (lib.rs:28,40) | — | — | dev tool; would report `walkthrough-error` on a fresh checkout because it installs ja-JP (`App.tsx:307-309`) **[inference from the ran build gate]** |

Commands with **no frontend caller**: `mine_due` only (App-wide grep over `inv("` [ran]).
UI affordance with no working target: catalog "Install" (404), TTS "Download" (PENDING URL),
pronunciation "Hear reference" (naming mismatch), "Review due words" when `startMineReview` finds
nothing (silent no-op), Home plan rows of 5 modalities (inert text).

---

## Dead ends and broken paths

**D1. Blocker — ja-JP pack cannot be installed from a fresh checkout.**
`install_pack` → `install_bundled_pack` → `lts_langpack::archive::build` (lib.rs:171-189) calls
`audit_media(true)` (crates/langpack/src/archive.rs:78-81), which errors `media_unbuilt` when all
693 manifest-declared `.wav` are absent — true in any git checkout because `languages/*/media/*.wav`
is gitignored (`.gitignore:18`; `languages/ja-JP/media/manifest.jsonl` = 693 rows, all `model-output`
**[ran: provenance tally]**). Proof run: `cargo run -p lts-langpack-cli -- build languages/ja-JP`
exit 2: "media manifest does not match the pack (media_unbuilt) … run scripts/generate-pack-audio.py
first" **[ran]**. UI effect: onboarding shows that error in the alert (`App.tsx:497-507`), Continue
stays disabled (`onboarding.tsx:154`) — the owner cannot reach Home with the Japanese pack.
(The owner's main-PC tree probably still has generated audio from 2026-10-07 — `state/STATUS.md:664-666`
— which is why this stayed invisible; the snapshot here has none.)
Also, `cargo test --workspace` and `scripts/smoke-desktop.sh` on a fresh checkout hit the same gate:
16 test sites install the **real** ja-JP bundle through the same `install_bundled_pack(...).unwrap()`
path (lib.rs:5033, 5061, 5131, 5153, 5237, 5338, 5363, 5410, 5861, 6069, 6177, 6227, 6284, 6347,
6382, 6484; the test-only wrapper at lib.rs:4988-4990 routes unallowlisted ids like `ja-demo` to
ungated fixture dirs, so most tests survive) and smoke calls `install_pack` (App.tsx:309)
**[inference from the identical code path that was run]**.
Minimal fix: reorder `scripts/build-catalog.sh` (it currently **builds the packs at lines 29-32 before
regenerating audio at lines 38-42**, so even `WITH_PACK_AUDIO=1` fails on a clean tree — contradicting
ADR-0016:96 "regenerates the audio first"), and either vendor a prebuilt ja-JP `.lpk` as a Tauri
resource for `install_bundled_pack` or let the bundled installer fall back to `Mode::Scaffold`
validation with an honest "audio not generated" install record.

**D2. Major — five practiced modalities have no click path.** Home makes only
`recall-meaning` plan items runnable (`home.tsx:89`); comprehension-listening,
phonological-discrimination, orthography-recognition (kana), production-writing and
orthographic-encoding rows render as inert text (`home.tsx:98-115`), yet their runners and native
grading exist (`practice_build` modalities lib.rs:3067-3072; audio wiring `App.tsx:668-691`).
A brand-new profile's plan mixes all of these (lexicon/orth/contrast/sentence/kanji candidates,
lib.rs:1079-1203), so the day-1 screen is a list where only some rows are buttons. Listening (the
modality ADR-0016 just funded with 693 assets) is unreachable as scored practice.
Minimal fix: render every plan item whose modality `practice_build` supports as a Start button
(`openPractice` already handles all six).

**D3. Major — pronunciation "Hear reference" can never play, even fully built.**
Demo unit ids are `{contrast-id}.short` / `{contrast-id}.long` (lib.rs:2294-2298); generated media
rows are `{contrast-id}-0` / `-1` (scripts/generate-pack-audio.py:69-77; manifest rows
`ja.contrast.vowel-length.obasan-0/-1` **[ran: grep; zero `.short`/`.long` ids]**).
`reference_audio_at` reads `media/{unit}.wav` only, no TTS fallback (lib.rs:2741-2747) → always
"reference not found"; UI then says "No licensed audio is available for this item yet, and this
build does not include speech synthesis" (`App.tsx:1281-1285`) — wrong in both clauses when the build
does include synthesis. The same mismatch makes the pitch-contour panel permanently
"no-reference-recording" (lib.rs:2423-2424, 2463-2499). Contrast *discrimination* uses the correct
`{id}-{index}` naming (lib.rs:3399), so only the pronunciation surface is broken.
Minimal fix: map demo short/long to items 0/1 (`{id}-0`, `{id}-1`) in `pronunciation_demo_at`.

**D4. Major — speaking features are vendored-binary dependent; the in-app model download is a
cargo cult.** `aligner_paths` resolves `whisper-cli` only from
`$LTS_BENCH_VENDOR` / `~/.cache/lts-bench/whisper.cpp/build/bin/whisper-cli` (lib.rs:2315-2330);
nothing in the app ships or downloads that binary, yet Languages copy says "Choose a local speech
model for pronunciation feedback" (`language.tsx:405-417`) and the abstain copy says "Install a
speech model in Settings to get feedback" (`pronunciation.tsx:66-67`; `dictation.tsx:40-43`).
Owner machine: works only because the bench cache exists from benchmarking **[inference]**; any
other machine: permanent `aligner-unavailable`/`speech-model-off` abstain even after a 74-466 MB
download. Minimal fix: ship the sidecar per ADR-0008 (the comment at lib.rs:2313 already promises
it) or correct the copy to name the vendored runtime.

**D5. Major — in-app TTS payload download is a placeholder URL.**
`models/catalog.json:93,111` pin `https://PENDING-RELEASE-URL/…` for
`org.openlanguage.speech.sherpa-onnx-runtime` and `kokoro-multi-lang`; the Languages Download
buttons (`language.tsx:389-395,459-461`) call `install_model` → `models::download` (lib.rs:4719) →
DNS failure surfaced raw. Until ADR-0009 staging publishes those assets, audio inside the app
depends entirely on `~/.cache/lts-bench` (source: `resolve_tts_with` bench root, lib.rs:4588-4593)
or `LTS_TTS_DIR`/bundled variant — and `generate-pack-audio.py` also exits 2 with
"missing synthesis asset" if the cache is absent (scripts/generate-pack-audio.py:123-129). No script
in the repo provisions that cache. Minimal fix: gate the two payload buttons on a real URL, and
document/vendor the bench-cache fetch.

**D6. Major (usability) — Home "Places you can go" is an app-side demo stub, and one entry is
permanently unopenable.** `demo_world_config` hardcodes two environments and the content id
`ja.lex.greeting.konnichiwa` with `ComprehensionReading ≥ independent` (lib.rs:2076-2101) — app-side
language data, against docs/00 neutrality; no environment has any entry affordance (rendered as
badge text only, `home.tsx:126-140`); and **no runner anywhere records comprehension-reading**
(practice modality set lib.rs:3067-3072; writing/scenario/placement/mine record other dimensions),
so the café row can never unlock. Minimal fix: hide the section for 1.0 or drive it from pack data.

**D7. Minor — hardcoded ja-JP fallback pack id in four flows.**
`pronunciation_demo` (App.tsx:1254), `reference_audio` (:1275), `pronunciation_check` (:1306),
`dictation_check` (:1338), `dictation_target` (:1360), `speech_audio` for shadowing (:964) all use
`selectedPack ?? "org.openlanguage.ja-jp.reference"`; after a resume, `selectedPack` is null
(`App.tsx:122` is set only in the wizard), so a ru-RU/eo-demo profile drives the Japanese pack id
(works only if ja-JP happens to be installed; else "pack not installed"). TTS voice is hardcoded
`ja` (lib.rs:4602) as well. Minimal fix: use `active_pack(profileId)` like the other audio commands.

**D8. Minor — `mine_due` is registered but never called** (lib.rs:3935,4974; no `inv("mine_due")`
anywhere; due detection duplicated client-side at `App.tsx:1101-1105`). Also `catalog_packs`
requires `LTS_PACK_CATALOG_URL` (packs.rs:153) which no shipped launcher sets, so the section is
permanently the "coming soon" notice (`language.tsx:106-107`) — the honest-but-dead O-05 surface.

**D9. Minor — profile data promises without the feature** (see Honesty H3/H4): no export, no delete,
no post-onboarding mic toggle; no profile switch after launch (resume picker is the only entry).

## Resolution status (same day, verified by the gates below)

| finding | status | what changed |
| --- | --- | --- |
| D1 | **closed** | `archive::build` audits media and refuses only a *partially* built pack; an unbuilt pack ships an honest audio-less archive (manifest dropped + warning). `build-catalog.sh` ordering fixed. `crates/langpack/tests/media.rs` (8). `3296cf3`, docs in `6a4a534` |
| D2 | **closed** | `home.tsx::RUNNABLE_MODALITIES` gives a Start button for all six runner-backed modalities and names the one with no runner; contract test in `home.test.tsx`. `99093f7` |
| D3 | **closed** | Listening practice is sentence-scoped against audio the pack declares (`listening_sentence_task_build`), ids resolve through the manifest `file` field, and a sentence with no audio is refused rather than offered. Same commit; three Rust tests |
| D4 | **open (owner decision)** | Copy is now honest (the panel says the whisper.cpp runtime is absent in this build). Shipping the aligner as a sidecar per ADR-0008 is a packaging decision — kanban `D4` |
| D5 | **closed engine-side (payload staging is owner work)** | Catalog marks both TTS payloads `availability: unpublished`; `installable()` + `install_model_files` refuse before any fetch; the UI says "not published in this build". `f8d7969`. Staging the real assets stays kanban `D5-rest` |
| D6 | **closed** | The app-side stub is gone: environments are pack data (`world/environments.jsonl`, ADR-0018 **Proposed**), `demo_world_config()` deleted, unknown unlock targets fail the pack. Earnability is now enforced, not just reviewed: the row schema's `modality` enum holds only the six dimensions a shipped runner credits, and `environment_listening_without_audio` rejects a listening unlock on content the pack declares no audio for. Worth recording: my first cut of the pack file gated the café on `comprehension-reading` — the same defect D6 describes — and passed every gate at the time; `cafe-ask-price` replaced it (recall + listening on audio the manifest declares). `fb124d1` + the earnability follow-on, kanban `K-57` |
| D7 | **closed** | Pack comes from `active_pack`; the seven hardcoded fallback ids are gone and no pack means a refusal naming Languages. `0c79e96` + `App.test.tsx` |
| D8 | **closed for `mine_due`** | My Words asks `mine_due`; due semantics live in one place (`mine_due_at`) and are tested (unscheduled ≠ due, freshly graded ≠ due, back-dated = due). `bc9c76a`. The `LTS_PACK_CATALOG_URL` half stays as the honest-but-inert O-05 surface — it is a published-catalog dependency, not a defect to fix in code |
| D9 | **closed except profile switching** | Export, one-shot delete, and the microphone toggle now exist and are enforced (Settings route; `2ffc1ca`). A profile switch after launch is still the launch-time resume picker only — recorded as remaining minor, not built speculatively |

Verification for the tranche: `cargo test --workspace` green (lts-desktop 70,
langpack incl. 6 new `tests/world.rs`, media 8, validate 32, CLI 9); pack
validate/lint/audit-* all 0 errors 0 warnings; `npx tsc --noEmit` clean, 133
vitest tests, `npx eslint .` clean; `./scripts/smoke-desktop.sh` → `SMOKE OK
(26 routes walked)` across 13 routes with `goal-map-assert 75`. Audio-bearing
archive rebuilt at 76,867,333 B, sha256
`d25315aa0b32b750e1d97b5dae974bf9e478f4dc10573ddce63ee14589595d84` — the pack
bytes changed, which re-opens the O-05 version bump.

---

## First-run walkthrough the owner can actually follow

Goal: a usable app on a clean Linux machine from this checkout. Marked **[verified-from-code]** or
**[ran]** vs **[not verified here]**.

1. Build + launch: `./scripts/launch-preview.sh` (builds `target/debug/lts-desktop` via
   `pnpm … tauri build --debug --no-bundle`, sets `WEBKIT_DISABLE_DMABUF_RENDERER=1`)
   — `scripts/launch-preview.sh:4-17`. **[not verified here: no node_modules/toolchain in this
   snapshot]**. Data dir defaults to `~/.local/share/openlang` (lib.rs:153-166).
2. Onboarding step 1: enter any name → "Create local profile" — **[verified-from-code]**
   (offline SQLite, lib.rs:249-264).
3. Onboarding step 2 (the wall): "Install" on *Japanese Reference Pack (Draft)* →
   **fails on a clean tree** with the `media_unbuilt` alert **[ran via the same `archive::build`
   call]**. Choose one workaround **before** launching:
   - A (recommended, restores the real pack): provision the TTS chain once —
     `~/.cache/lts-bench/sherpa-onnx-v1.13.8-linux-x64-shared/bin/sherpa-onnx-offline-tts` and
     `~/.cache/lts-bench/kokoro-multi-lang-v1_1/{model.onnx,voices.bin,…}`
     (generate-pack-audio.py:37-38,116,123-129; **no fetch script exists in the repo** — on the lab
     fleet these came from benchmarks **[inference]**); then
     `python3 scripts/generate-pack-audio.py --pack languages/ja-JP`
     (~96 MB audio, non-reproducible bytes — ADR-0016:45-50), then Install works **[verified-from-code
     for the gate: the only blocker was `media_unbuilt`]**.
   - B (offline `.lpk` route, no audio): `cargo run -p lts-langpack-cli -- build languages/ru-RU
     -o dist/preview/ru-ru-reference-0.2.0.lpk` (ru-RU has no media manifest, passes install-mode
     `test` in CI — `.github/workflows/ci.yml:41`) → Languages → Import a pack file
     (`language.tsx:347-355`, packs.rs:354-362). **[verified-from-code]**
     But: ru-RU is not an onboarding candidate (lib.rs:120-133) — import it first, then
     Languages → "Learn this" (packs.rs:417-427) after creating the profile.
   - C (fastest smoke): pick *Esperanto — original demo (unreviewed)* — installs (fixture passes
     the gate; built in `scripts/build-catalog.sh:32`) but has 6 lexicon rows and no scenarios,
     stories, kanji, or contrasts **[ran: file counts]** — the rest of the pass will mostly show
     honest empties.
4. Microphone step: skip or enable — both skippable, never gating (onboarding.tsx:161-177;
   lib.rs:305-335). **[verified-from-code]** Note the recorded choice changes nothing later (no
   consumer of `microphone-enabled`; see H4).
5. Home, first items: plan of ~budget items is guaranteed non-empty for a new profile
   (unseen-candidate stream, lib.rs:1050-1207). Click only the rows that are buttons —
   recall-meaning with a surface (`home.tsx:89`). Kana/listening/cloze rows are inert (D2).
   Answer → grade → Back-to-plan is fully native and offline **[verified-from-code]**.
6. Listening audio: after step 3A the installed pack contains all 693 `.wav` (archive build bundles
   them — archive.rs; ADR-0016:105-108), provenance surfaces as "synthesized voice (model output)"
   (`practice.tsx:122-124`; lib.rs:4506-4513) — but see D2: this runner has no entry button.
   Reading/Shadowing audio works via built media first, TTS fallback needs a resolved runtime
   (lib.rs:4515,4550-4609: bundled dir → model-manager installs → `LTS_TTS_DIR` → bench cache).
   In-app TTS download is broken (D5) **[verified-from-code]**.
7. Pronunciation: works end-to-end **only on a machine whose bench cache also carries
   `whisper.cpp/build/bin/whisper-cli`** (lib.rs:2320-2330) — the lab fleet does; verify with
   `ls ~/.cache/lts-bench/whisper.cpp/build/bin/whisper-cli` **[not verified here]**. "Hear
   reference" never plays even then (D3). Guidance stays guided-only: mode copy
   `pronunciation.tsx:162-168`, calibration never matches by construction (lib.rs:2526-2563) —
   consistent with ADR-0017 §1 **[verified-from-code]**.
8. Languages panel: TTS status line honest; "Community packs are coming soon…" is expected (D8);
   Whisper model Download works (HF reachable **[ran]**), but changes nothing for speaking (D4).
9. Restart: resume picker, no re-onboarding (App.tsx:342-350; K-05). **[verified-from-code]**

---

## Honesty/claims check (ADR-0014 / ADR-0017 / docs/18)

- **H1 (mismatch, minor)** — pack display names still say "(Draft)":
  `languages/ja-JP/manifest.yaml:3` "Japanese Reference Pack (Draft)",
  `languages/ru-RU/manifest.yaml:3`, and the live catalog entries `catalog/packs.json:7,23`.
  The name travels through onboarding (`onboarding.tsx:131`), Home header (`home.tsx:60-64`) and
  Languages (`language.tsx:206`) — K-47 makes it pack-supplied (lib.rs:99-113). ADR-0017 §2 says
  AI-created is permanent and the pack-level statement ("AI-generated content · not human-reviewed",
  `language.tsx:143`) is the accurate one; "Draft" implies a transitional review path that ADR-0017
  closed. Fix: change `display_name` in the manifests + republish (O-05 version bump already owed,
  ADR-0016:115-119).
- **H2 (mismatch, minor)** — `language.tsx:410`: "Pronunciation feedback is *guided only* …
  **until it has been calibrated**." ADR-0017 §1/Consequences: guided-only is the 1.0 ceiling; the
  calibration panel is explicitly unfunded and unschedulable. Suggested wording: "guided only;
  automatic scoring would require a calibration panel this project does not fund."
- **H3 (mismatch, major)** — privacy notice promises "You can export or delete your local profile
  data at any time" (lib.rs:85). No command, no UI: `generate_handler` has no profile delete/export
  (lib.rs:4913-4976), grep finds none **[ran]**. Either implement (`profiles.db` row + data dir
  removal) or drop the sentence before the public flip.
- **H4 (mismatch, minor)** — onboarding: mic "can be enabled anytime" / "enable it later in
  Settings" (`onboarding.tsx:165-166`, lib.rs:81-83). There is no Settings route; `microphone-enabled`
  is written (lib.rs:305-326) and never read outside tests; the webview permission handler always
  allows the mic (lib.rs:4899-4901). The stored decision gates nothing.
- **H5 (stale doc, minor)** — `README.md:90`: REL-001 "including qualified review and all required
  gates" predates ADR-0017 §2 (no release gate depends on human review for 1.0).
- **H6 (labeling gap, minor; latent until D3 is fixed)** — pronunciation reference buttons are
  unattributed (`pronunciation.tsx:111-125`); every ja-JP asset a fixed lookup would play is
  `model-output` (manifest tally **[ran]**), and ADR-0016 §5 requires provenance to surface. The
  listening runner does label it (`practice.tsx:122-124`).
- **H7 (copy vs implementation)** — `pronunciation.tsx:66-67` / `dictation.tsx:40-43` tell users
  installing a model in "Settings" yields feedback (D4/D5 nav name is "Languages").
- **Consistent with docs/18**: no per-item "draft" badges anywhere (`practice.tsx` never renders
  `task.status`; posture relabel `language.tsx:148-153`); pack-level posture statement present on
  Home and Languages; goal-map band copy explicitly disclaims certificates/exams and no JLPT
  equivalence (`home.tsx:248-251,287-289`); "guided only, never a grade" wording on shadowing/reading
  (`App.tsx:1657-1660,1729-1732`); community-catalog review status labeled as the author's claim
  (`language.tsx:319-322`); abstentions carry no linguistic penalty wording
  (`pronunciation.tsx:72-81`, `practice` audio notice `App.tsx:686-690`).

Failure-state summary (from code, **[verified-from-code]** unless marked):
network off → catalog "Offline, and no catalog has been fetched…" (`language.tsx:108`), all else
offline-first; model missing → honest abstain strings; media missing → TTS fallback then
`tts-runtime-unavailable` (lib.rs:4515) surfaced as "No audio is available for this item yet…"
(App.tsx:686-690); corrupted download → sha256/size/identity rejection, staging removed
(models.rs:144-158,193-195; packs.rs:294-306); disk full → fs errors propagate as command errors,
catalog-cache write errors are swallowed silently (`write_cache`, packs.rs:122-130 — acceptable);
empty profile without installed pack → commands return "no active language pack"/"pack not installed"
(e.g. lib.rs:3389-3392) and resume surfaces it (App.tsx:553-555), but the only escape is creating a
new profile; keyboard/DOM for K-54: skip-link + landmarks (`AppShell.tsx:22-41`), route tabs as
native buttons with `aria-current` (App.tsx:1502-1602), `role=status/alert` + `aria-live` for
verdicts/pronunciation/scenario (e.g. `practice.tsx:166-172`, `pronunciation.tsx:147`,
a11y.test.tsx:259-262); furigana is a sibling `<small>` line, not ruby (practice.tsx:67-71,
App.tsx:1772-1777 — K-54 as recorded, `state/STATUS.md:660-661`); no screen-reader run performed
(O-03 stays owner-gated). CSP `default-src 'self'` with no `media-src`/`blob:` entry
(`tauri.conf.json`) may block the blob:-URL audio playback used at `App.tsx:930-934,969-970`
— **[inference; must be checked in the owner pass: click ▶ Play once]**.

---

## Top 10 fixes ranked by what the owner's test pass would hit

1. **Unblock fresh-checkout ja-JP install** — fix `build-catalog.sh` audio-before-build ordering and
   give the bundled installer a scaffold-mode or prebuilt-`.lpk` path (D1; without it onboarding ends
   at an alert).
2. **Make every supported modality startable from the plan list** — one conditional in
   `home.tsx:89` plus per-modality Start copy (D2; unlocks listening/discrimination/kana/cloze/dictation).
3. **Fix pronunciation reference ids** (`.short/.long` → `-0/-1`) and label the played asset's
   provenance (D3, H6).
4. **Ship or honestly label the whisper sidecar** — bundle `whisper-cli` per ADR-0008 or restate
   model-selection copy; until then hide "Download" for whisper as well (D4, H7).
5. **Fix or hide the TTS payload download buttons** (PENDING URLs), and document the
   `~/.cache/lts-bench` provisioning that `generate-pack-audio.py` needs (D5).
6. **Remove the export/delete privacy promise or implement profile delete/export** (H3).
7. **Replace hardcoded `org.openlanguage.ja-jp.reference` fallbacks with the profile's active pack**
   in the six pronunciation/dictation/shadowing call sites (D7).
8. **Cut or data-drive the Home world stub** whose café entry is unlockable by no runner (D6).
9. **Make the mic setting real** (enforce or delete `microphone-enabled`; add or rename the
   "Settings" affordance the wizard promises) (H4).
10. **Republish posture wording**: pack `display_name` "(Draft)" → posture-stated name, README gate
    sentence, and "until calibrated" copy (H1, H2, H5) — rides the version bump ADR-0016 already owes.

Unresolved issues for the parent review: whether CI `cargo test --workspace` / `desktop-smoke` are
currently red on fresh checkouts (D1 mechanism **[ran]** at the CLI; CI status not observable from
this workspace **[inference]**); CSP/blob audio playback (untestable here without webkit); whether
the owner's main-PC tree still carries generated `media/*.wav` (decides whether D1 bites their very
first click).
