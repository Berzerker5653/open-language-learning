# O-06 — owner hands-on runtime report (2026-10-08)

This is the human runtime report O-06 owed (kanban `O-06`, `docs/13` ADR-0015:
an agent run is not a runtime report — this one is the owner driving the app).

Build run: debug preview on the Gaming PC (X11, NVIDIA RTX 5090, driver
615.71.09, WebKitGTK 2.52.6 in the user-local sysroot), `tauri dev` /
`target/debug/lts-desktop` at the working tree after the renderer fix
(`state/STATUS.md`, "the blank desktop window is fixed inside the binary").
Pack: `org.openlanguage.ja-demo` installed in-app after creating a local
profile. Speech: the aligner-bundled payload path (whisper.cpp sidecar) and
pack-shipped Kokoro media (ADR-0016).

## What the owner observed (verbatim report, condensed)

1. Profile created, Japanese selected, **Install** clicked: "it looked like it
   just froze for a minute".
2. Same stall when downloading the speech-recognition feature.
3. "We seem to be missing the options or settings to select which microphone
   the user wants to use."
4. "The very first word for practice from the synthesized voice model says
   *konichi ha* and not *wa*. The synthesized voice sounded fine… but we need
   to make sure that it is saying the right words every step of the way."
5. Speaking tab works: wrong words rejected, the correct word accepted.
6. Lag switching pages (Writing → Languages).
7. Scenarios page: cards looked locked but **First meeting** had a Start
   button; clicking it produced
   `invalid args 'scenarioId' for command 'scenario_start': command scenario_start missing required key scenarioId`.
8. Delay after pressing Stop on a recording before the audio appears.
9. Reading page, 知 (glossed "Intelligence / Wisdom") → **Mine** →
   `sqlite: UNIQUE constraint failed: mined_items.profile_id, mined_items.surface`.
10. Settings page: scroll/interaction lag.
11. Practice page: "Strengthen a weak spot" is not a way to start. Wants a
    guided first run, a dedicated place for today's topics, and kana
    instruction — hiragana is *displayed* but never *taught*. Everything must
    stay language-neutral so it applies to any pack.

## Triage

| # | Finding | Status after reading the code | Card |
| --- | --- | --- | --- |
| 7 | `scenario_start` invalid args | **Reproduced by reading.** `apps/desktop/src-tauri/src/scenarios.rs:24-25` puts `#[serde(rename_all = "kebab-case")]` on every scenario view, so the JSON keys are `scenario-id`/`goal-id`/`locked-reason`; `apps/desktop/src/scenario.tsx:8-15,23-33` reads `scenario_id`. `s.scenario_id` is therefore `undefined`, and `invoke("scenario_start", { profileId, scenarioId: undefined })` (`apps/desktop/src/App.tsx:1375`) serialises without the key — exactly the reported message. Same defect hits `scenario_attempt`/support/transfer, which read `scenarioActive.scenario_id` (`App.tsx:1387,1404,1421,1437,1453`). No other consumer uses the kebab keys, and `lib.rs` serialises every other view snake_case — the kebab attribute is the outlier. The route walk never clicked Start, so smoke could not see it. | K-60 |
| 9 | mining UNIQUE failure | **Confirmed.** `crates/storage/src/mined.rs:33-40` runs a bare `INSERT`; `crates/storage/src/migrations.rs:159-168` declares `UNIQUE (profile_id, surface)` (migration 4), so a second mine of the same surface throws a raw rusqlite error straight into the UI (`apps/desktop/src-tauri/src/lib.rs:4364-4386`). The first mine of 知 succeeded, so this is a re-mine/duplicate-surface path, not a broken feature. | K-61 |
| 1, 2 | no progress signal during pack install / speech payload download | **Confirmed as a defect by code reading:** `install_pack`/`install_catalog_pack`/`install_model` do fetch + sha256 + schema validation + staging in one blocking command and emit nothing to the UI, so a real minute of work renders as a dead button. No timing measurement taken yet. | K-62 |
| 6, 10 | route-switch and Settings scroll lag | **Not measured.** The read-only scout investigating it hit its 30-minute runtime limit and produced no report, so the cause is still a hypothesis (per-route `invoke` fan-out + re-render scope) and must be instrumented before anything is "fixed". | K-63 |
| 8 | recording stop delay | **Not measured**, same reason. The stop handler converts the recorded blob and hands it to `pronunciation_check`/`dictation_check` before painting anything, which is the obvious suspect. | K-63 |
| 3 | microphone selection | Confirmed missing: `App.tsx:1653` calls `getUserMedia({ audio: true })` with no device constraint and nothing calls `enumerateDevices`; the native permission handler already allows the mic, so the gap is UI + constraint plumbing. | K-64 |
| 4 | TTS says *konichi ha* | **Origin pinned (see "Where the wrong audio came from").** Sentence audio was fine: `languages/ja-JP/sentences/entries.jsonl` declares a kana `reading` (`こんにちは`) plus a separate `romaji` field, and `scripts/generate-pack-audio.py` fed the kana reading — `whisper.cpp ggml-small -l ja` round-trips `media/ja.sent.greet-day.wav` to `こんにちは`. The broken path is **words**: `listening_audio_at` (`apps/desktop/src-tauri/src/lib.rs:5199-5205`) falls back to live synthesis from the lexicon entry's **primary written form** (`lexicon_entries:509-521`), and thousands of entries are kanji-primary — the pinned Kokoro is OOV on bare kanji (K-56 recorded `Ignore OOV '金'` → exit 2) and produced a 0.44 s garble for `今日は` when measured on 2026-10-08. No word had pack media at all, so nothing was ever media-first for a word. Guard `media_text_not_declared_reading` now ships (landed from the Omarchy job, `crates/langpack/src/audit.rs`), and the greeting now has a regenerated word asset fed from its `readings(script)` value. | K-65, K-65b |
| 5 | Speaking tab correct verdicts | Working as designed; no card. Recorded because it is the first independent confirmation that the aligner verdicts (accept/reject) behave on human speech. | — |
| 11 | no guided start, no "today", kana displayed but not taught | Product gap, not a defect. Design decision recorded as `docs/adr/0020-derived-guidance.md` (**Proposed**): the engine must stay content-agnostic (`docs/00` non-negotiable), so guidance is derived from pack declarations and existing scheduler/goal-map state. Note the kana content itself already exists and is ordered (`languages/ja-JP/orthography/hiragana.jsonl` carries `teaching_order` + mnemonics) — what is missing is a route and an instruction stage, not data. | K-66, K-67 |

## Where the wrong audio came from (verified 2026-10-08)

| claim | status | evidence |
| --- | --- | --- |
| sentence/contrast audio speaks its declared kana reading | MEASURED | `whisper.cpp` (`ggml-small.bin`, `-l ja`) round-trips `media/ja.sent.greet-day.wav` → `こんにちは`; manifest rows record the fed string |
| romaji fed to the pinned Kokoro is unusable | MEASURED (Omarchy) | romaji `konnichiwa` transcribes as the letters `K-ON-N-I-C-H-I-W-A`; kana `こんにちは` transcribes as `こんにちは` with a wa-like final onset — `docs/provenance/ja-jp-greeting-audio-k65.md` |
| kanji fed to the pinned Kokoro is unreliable | MEASURED | `今日は` alone → 0.44 s, transcribes `はぁ`; K-56 already recorded hard OOV failure on bare kanji |
| words had no pack media, so every word utterance was live synthesis from the written form | CODE FACT | `listening_audio_at:5196-5205` (media lookup by content id, then lexicon **surface** fallback); manifest had 693 rows, all sentences/contrast (`wc -l languages/ja-JP/media/manifest.jsonl`) |
| 41 lexicon mismatches / 419 sentences with no reading | **WRONG** — retracted | snapshot counts: 0 lexicon manifest rows at all, 3,920 lexicon entries declare script-tagged readings, 8 contrast items declare none; the corrected counts are in `languages/ja-JP/review/WORKLIST-2026-10-08.md` |
| `media_text_not_declared_reading` fires on a real lie | MEASURED (Omarchy) | re-injecting the wrong text produced 2 errors pointing at `/287/text` and `/9/text`; `validate` on both packs is 0 errors / 0 warnings here with the guard present |

## Consequence for the release gates

Nothing here weakens a gate. Findings 1-2, 6-10 are preview-quality defects that
make the app feel stalled or throw raw database text at the learner; per
`AGENTS.md` ("if an engagement feature can be maximized without learning,
redesign it" / product quality bar) they are in scope for the preview. Finding
4 is a **content-correctness** defect: audio a learner is asked to imitate can
disagree with the item's declared reading, which is exactly the class of error
`AGENTS.md` "research discipline" and ADR-0016 provenance are meant to prevent.
Finding 11 is new scope and needs owner sign-off on the ADR before it is built.
