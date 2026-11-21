# ARCH-HOTSPOT-2026-11-20 — hot-file duplication/entanglement scan

Board card `t_91c496c1`. Read-only scan; outcome is
**filed findings (option b)** — both candidate fixes sit in files that are dirty
with VOCAB-BUILDER-001's uncommitted WIP at scan time, and the card protocol
forbids touching another lane's dirty files. No code was changed by this scan.

## Step 1 — 14-day churn (source files, ledgers/pack data excluded)

```
15  apps/desktop/src-tauri/src/lib.rs
 9  apps/desktop/src/App.tsx
 6  apps/desktop/src/rtl-direction.test.tsx
 5  apps/desktop/src/reading.tsx
 5  apps/desktop/src/reading.test.tsx
 4  scripts/word_timing_lib.py
 4  packages/ui/src/styles.css
 4  crates/langpack/src/layout.rs
 4  crates/langpack/src/audit.rs
 4  apps/desktop/src/journeys/harness.tsx
```

(`git log --name-only --since='14 days'` over code paths; `state/`,
`tasks/`, `languages/`, `catalog/` rows dropped per card scope.)

## Hotspot 1 (chosen) — App.tsx: six copies of the base64-wav → object-URL idiom

The "decode an engine audio response and make it playable" rule is
copy-pasted six times in `apps/desktop/src/App.tsx`:

- `Uint8Array.from(atob(<b64>), (c) => c.charCodeAt(0))` at lines 2677,
  2750, 2820, 2864, 2976, 3336, each immediately followed by
  `URL.createObjectURL(new Blob([bytes], { type: "audio/wav" }))`
  (lines 2678, 2752, 2821, 2865, 2977, 3338).

The repo already has the right home for this rule: `apps/desktop/src/playback.ts`
owns clip-URL *lifetime* (R14 `playClip`), and every call site funnels through
the single `playBlobUrl` pipeline (App.tsx:3273) — only the decode-and-wrap step
is duplicated. The duplication is why the same latent pitfalls get re-fixed per
lane (retained-vs-one-shot revocation, error surfacing): each copy re-decides
them at the call site.

**Proposed decomposition (~small diff, fits an ARCH-HOTSPOT lane once App.tsx
is clean):** add two helpers to `playback.ts`:

```ts
export function decodeWavBase64(b64: string): Uint8Array;   // atob decode
export function wavObjectUrl(b64: string): string;          // decode + Blob + createObjectURL
```

then replace the six two-line idioms with one call each (`playBlobUrl(wavObjectUrl(a.wav_b64))`
etc.). Behavior unchanged; lane gates = `npx tsc --noEmit` + `npx vitest run`
in `apps/desktop` only. A retained-clip site (line 3624 `setAttemptUrl`) is a
recording, not a wav response — leave it alone; line 2750/2864 build a local
`url` var for karaoke opts and become `const url = wavObjectUrl(...)`.

**Blocker at scan time:** App.tsx is dirty with VOCAB-BUILDER-001 WIP
(3 hunks at lines ~327/1675/3705 — none overlap the audio zone, but the card
protocol bars touching a file that holds another lane's unstaged work). Re-run
this extraction when VOCAB-BUILDER-001 lands.

## Hotspot 2 (entangled, too big for this lane — dedicated card recommended)

`apps/desktop/src-tauri/src/lib.rs` is a monolith that grew across unrelated
lanes: **18,510 lines, 451 `fn`s, touched by all 15 of its 14-day commits**
(READER-FLOW-001 word_card/story_word_audio, GRAMMAR-LABELS-001, ERR-SRS-LOOP-001,
SESSION-CHROME-001, WORD-TIMING-001, KARAOKE-CLOCK-001, SCENARIO-{INTERACTION,TRANSFER}-001,
CONTENT-CONFIRM-001, PACK-BUNDLE-RU-001, PACK-VERSION-BUMP-001, UX-PERSONA-001).
Every lane edits the same file → it is the repo's top merge-collision and
review-load generator (each VOCAB-BUILDER-001-style card adds ~200 lines there).

**Proposed decomposition (multi-card, ~hours — needs an owner/planner decision,
not an ARCH-HOTSPOT drive-by):** split by domain into submodules under
`apps/desktop/src-tauri/src/` (existing siblings `packs.rs`, `scenarios.rs`,
`progress.rs`, `models.rs` show the pattern): first cut the reader/word-card
surface (`word_card`, `story_word_audio`, aux-lexicon lookup — ~7200–7500
region) into `reader.rs`, then audio/clip commands, then error-ledger. Each
cut is a pure `mod` move + `#[tauri::command]` re-export; one domain per card,
lane gates `cargo test -p` desktop + clippy. Do NOT attempt opportunistically
while the file is dirty.

## Secondary observation (out of hot-file scope, no action)

The "humanize an FSRS interval prediction" rule exists twice:
`apps/desktop/src/words.tsx:21 previewIntervalLabel` and
`apps/desktop/src/session-chrome.tsx:36` (`~N min left`). Both born in
SESSION-CHROME-001; neither file is in the 14-day hot list and the copies
differ deliberately (grade-button sentence vs countdown). Worth folding into
whichever card next touches either file; not worth a standalone change.

## Non-findings (checked, already clean)

- RTL direction handling: single source `packages/ui/src/pack-direction.tsx`
  (ADR-0029); all components consume `PackText`/`usePackTextAttrs` — no
  duplication despite rtl-direction.test.tsx churn.
- `scripts/word_timing_lib.py` is itself the dedup artifact (shared by
  generate/align scripts); its ru/ja contracts are parameterized, not copied.
- `crates/langpack` layout.rs vs audit.rs vs pack.rs: layout table, auditor,
  and loader are distinct concerns; no shared rule duplicated.
