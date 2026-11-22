# SESSION-FLOW-COPY-001 — one-click session flow + en-US copy standard

Owner phone dogfood 2026-11-21: (a) every activity inside one session
demanded a fresh "Start practising" click; (b) copy mixed British spellings
with a North American audience; no locale standard existed.

## Contract (shipped)

- FLOW: one start per session. `startSession` opens the first activity; its
  lesson encounter card + Start control is the session's single start.
  Inter-activity transitions now run through a bridge in
  `advanceSession` (App.tsx): `showSessionBridge(next)` renders
  `[data-testid="session-bridge"]` — an announced (role=status),
  centered "Next: <verb>" line using the SAME hub verb table
  (`RUNNABLE_MODALITIES`) that names the plan rows, plus its own
  Pause control (pause rides the bridge, so the auto-advance never
  outruns a learner). After `SESSION_BRIDGE_MS` (1200 ms) the runner
  opens via `openPractice(next, { showLessonCard: false })` — the lesson
  card is NEVER re-rendered mid-session; the "Show the lesson again"
  control keeps it one tap away. `openPractice`'s `showLessonCard: false`
  is only passed by session advance; solo activities keep the card.
- CANCELLATION: the bridge promise resolves false from `cancelSessionBridge()`
  (pauseSession/closeSession, and the history-shim navigation which calls
  pauseSession). advanceSession then returns without opening anything.
  prefers-reduced-motion skips the bridge entirely.
- BANNER FIX (third dogfood repro on this card): the browser-mode serve
  notice JOINED server capability lines into word-salad
  ("...labeled unavailable unchanged — serve mode never rewrites...").
  `serveNotice` is now a string[] rendered line-per-capability
  (`.notice-line`), and the one line that floated without context gets
  the plain lead-in "Privacy settings: ...". serve.rs strings untouched.
- LOCALE STANDARD: en-US, documented as one line each in GLOSSARY.md
  (**copy** term) and CODING_STANDARDS.md §A (machine-gate list).
- SWEEP (learner-visible copy only; comments, docs prose, and quoted
  third-party/attribution text untouched): apps UI strings
  (practising->practicing, practise->practice, practised->practiced,
  Recognise->Recognize, Unlabelled->Unlabeled), en-US lexicon glosses
  (ru.lex.stories202611.tsvet "color; flower", ru.lex.synthesis.volnost
  "license, freedom"), RU curriculum: units 010-018 summaries
  "recognize it and write it", 496-synthesis-07 title/note
  "License". Test fixtures updated to assert the NEW strings (home,
  lesson, ru-placement).
- RATCHET (audit_learner_copy.py v1.4.0->1.5.0): LOCALE_UK_RE (the
  irregular British set: practis*, recognis*, organis*, labelled/labelling,
  colour*, licence, behaviour, centre, programme, whilst, learnt,
  travelled/travelling, apologise*) fires as kind "locale-uk" on source
  strings, jsx text, pack unit summaries AND titles, and every en-US
  lexicon/sentence gloss. UNIT_ID_LEAK_RE (`\bunit\s+\d{3}(?:-slug)?\b`,
  per the RU-REPUBLISH-046-001 comment) fires as "unit-id-leak" on the
  same surfaces. 4 new unit tests pin both rules + a US-clean fixture.
- HARNESS: scripts/session-flow-capture.mjs (mobile-harness `#session`
  screen seeded with the session journey's exact scenario per the
  seed-not-navigate lesson) — machine gate + after-screenshots; every
  measured value rides into result.json; navigation errors fail loudly.

## Sibling coordination (shared dirty tree)

- Lane committed via index graft (HEAD+lane-hunks) for: App.tsx,
  lesson.tsx, lesson.test.tsx, tools/audit_learner_copy.py,
  tools/test_audit_learner_copy.py, curriculum units 010-018. The lane's
  hunks were applied ON TOP of the sibling working copies (word sed +
  patch); PRACTICE-GATE-001's fetchDictation/lesson hunks and ORTHO's
  audit rule stay uncommitted in THEIR hands. See gates.log for the
  takeover notes (audit VERSION now 1.5.0 on main).
