# FIX-2 — the honest refusal exists engine-side but the learner sees a silently-empty input

Severity: MEDIUM. The PRACTICE-GATE acceptance clause says the gated
streams "refuse honestly"; the engine does, but the frontend discards the
refusal, so day-one learners get an empty box with no explanation — the
same silent-failure feel the owner's complaint 07 was about. gates.log
(lines 78-82) already names this as a follow-up surfaced by the after
shot; no card was created, so it is numbered here for the planner.

## Facts (re-verified at HEAD)

- Engine refusal: `dictation_target_at` returns Err("no sentence practice
  is unlocked yet — finish more lessons to unlock it") on an empty pool
  (apps/desktop/src-tauri/src/lib.rs ~6160).
- Frontend: apps/desktop/src/App.tsx:3783 `fetchDictation` —
  `packRequest` only produces a surfaced `req.error` for the missing-pack
  case (App.tsx:206-214); an engine Err travels as a THROWN invoke
  rejection, and the `catch { setDictSentence(null); setDictTarget(""); }`
  (App.tsx:3808-3810) swallows it — `setAudioMsg` is never called.
- The render hook already exists: the dictation route prints
  `{audioMsg && <p role="status" className="notice">{audioMsg}</p>}`
  (App.tsx:4321-4324) — the message would display if the catch set it.
- Same shape for shadowing (empty pool renders an empty list, no
  empty-state copy) and the deferred practice_queue rendering belongs to
  this UX family too.

## Suggested fix shape

In `fetchDictation`'s catch, set the audio notice to the engine message
(or a fixed learner-facing sentence when the engine pool is empty), keep
the target clearing, and add a journey/vitest assertion that a refused
dictation request renders the refusal copy (element-based assertion per
the WEB-HISTORY-001 lesson — query the `[role=status]` element, never
body text). Red-first: the current build renders NO status element for a
refusal — assert one appears with unlock language.
