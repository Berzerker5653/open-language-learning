# BAKEOFF-LIVECAPTURE-001 — learner visual inspection (the point of this card)

Captured with scripts/bakeoff-today-livecapture.mjs against the live lts-serve on
127.0.0.1:17631 (fresh HEAD binary + fresh HEAD dist), 390x844 mobile:true,
FRESH profile ("Bakeoff Fresh", no seeded traffic). Machine results: audit-live.json,
7/7 checks PASS. The PNGs were then READ as a learner (vision), and this note records
that reading — green harness + inspected pixels, per the owner's 2026-11-23 gate rule.

## fold-0 (bakeoff-fold0-live.png) — what the learner actually sees on open
Top to bottom: app title, nav (Today active / Practice / My Words / Progress / Settings),
then the "Your path" heading with its one-line sub, the "Getting started · Pre-A1 · 0/21 done"
summary card, and the PATH OPEN AT THE FRONTIER: first node (Printed Cyrillic: А а, О о, М м,
Т т) carrying the teal "You are here" pin, with ONE big teal pill "Start today's plan —
5 activities, about 5 minutes" riding that same row (measured 101px tall, accent-filled).
VERDICT: the first fully-visible learner content IS the frontier node + its Start pill.
Zero browser-mode/mic/privacy text on the fold (also at scrollY 0). Zero lock icons anywhere
in the first fold. No greeting or time-budget block visible at open.

MINOR FINDING (not a gate violation): at the very top edge of fold-0 a CLIPPED half-line
peeks through ("…material · about 3 minutes") — the tail of the "Next: …" line of the
New-material card above the path, cut by the auto-scroll to the pin. It is learner content,
not infra, and not fully visible, but a real learner sees a truncated fragment. Possible
small polish follow-up: auto-scroll offset or margin so no half-line rides the top edge.

## document-top (bakeoff-document-top-live.png) — DOM order before any scroll
At scrollY 0 the fold carries the greeting card ("Hi Bakeoff Fresh"), the
AI-GENERATED CONTENT · NOT HUMAN-REVIEWED provenance badge, the "Where to begin" plan list,
and the time-budget segments — the pin sits at pageTop ~1577, below the fold. This is the
intended design: the plan block still EXISTS above the path in DOM order (it is what the
auto-scroll jumps past); SERVE-BANNER-001's rule (zero serve-mode infra strings) holds here.

## fullpath (bakeoff-fullpath-live.png) — locked-below proof
Measured on document coordinates: pin is path row 0 of 21; 11 locked rows, ALL below
(lockedAboveCount = 0); the "Places you can go" capability cards with their "Grows with:"
prerequisite hints also render below. Vision read agrees structurally: every padlock on the
timeline sits below the pinned node, unlocked/open nodes between pin and locks.
(Vision text on the tall full-page shot is partly garbled — tiny glyphs; the geometry audit
in audit-live.json is authoritative for counts.)

## after-pill-tap (bakeoff-after-pill-tap-live.png) — one interaction, then what
ONE tap on the pill lands INSIDE the day's first activity: the lesson "Printed Cyrillic:
А а, О о, М м, Т т" with the step counter "1 of 4 · ~4 min left", the letters callout, the
"see its printed forms, learn its name and sound, then recognize it and write it" instruction,
and the Meet-something-new list. No menu or interstitial in between. NUANCE, recorded honestly:
the day's first activity for a fresh learner is a LESSON that opens on its "meet the letters"
presentation step; the first answer-required question (recognize/write) comes on a later step
of that same lesson. This matches the frozen TODAY-FIRSTSCREEN-001 one-tap contract
("lesson card or drill choices" = the practice surface); it is one tap from app-open to
being inside the exercise, not one tap to a multiple-choice question.

## Overall learner verdict
Open → see the path AT the pin with a big Start pill → one tap → inside today's first
activity. Locked content strictly below. Meta/infra off the first screen. PASS as the
visual-inspection gate evidence for the fixed Today first screen.
