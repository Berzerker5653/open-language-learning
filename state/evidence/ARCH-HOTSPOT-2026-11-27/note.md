# ARCH-HOTSPOT-2026-11-27 — story_audio playback duplication fix (option a)

## Scan method + measured findings

`git log --name-only --since='14 days'` hot files (ledger/docs/pack-content churn
excluded): App.tsx (52 touches), packages/ui/src/styles.css (42),
src-tauri/src/lib.rs (42 — DIRTY with sibling lane WIP at card start,
declared off-limits by the worker protocol), home.tsx (30),
journeys/harness.tsx (20).

Normalized line-run scan (>=8 identical normalized lines) over
apps/desktop/src + packages/ui/src product code (test/journey files excluded
from the pick, but their dupes noted):

- journey-vs-journey speaking-stage assertion blocks (ru-modality vs
  upperband-sequence) — test-tree duplication, not product code; left alone
  (gate-integrity rule).
- Tauri browser-shim block duplicated in history-screens.tsx / mobile-screens.tsx
  (~10 lines) — dev/test bootstrap, not learner-facing logic.
- **Picked hotspot (hottest file, verbatim product duplication):** App.tsx
  `playStoryAudio()` (~2289) vs `playMineContext()` (~2493): byte-identical
  13-line block — `detectInvoke()` guard, `story_audio` invoke,
  `atob`/`Uint8Array` decode, `playBlobUrl(createObjectURL(Blob audio/wav))`,
  catch → `audioFailureMessage(String(e))` into an error setter. Only the
  setter differed (setStoryError vs setMineError). The My-words copy even
  carried a comment claiming "one audio truth, no second clip mechanism"
  while being a literal second copy of the mechanism.

## Fix (no behavior change)

Extracted `playSentenceClip(sentenceId, onError)` inside App() — the exact
block above, with the error setter injected. Both callers are now one-line
delegations (`await playSentenceClip(id, setStoryError / setMineError)`).
Early-return-on-no-inv, request shape, decode, play, and error strings are
identical; only where the failure message lands remained per-caller, so that
is the only injected parameter.

Test-tree sweep: only 2 `story_audio` call sites exist in the product tree
(grep). Journey coverage exercises the reader path (ru-modality,
upperband-sequence play sentences; content-confirm asserts zero story_audio
calls). No test pins the function bodies; harness `story_audio` responder
untouched.
