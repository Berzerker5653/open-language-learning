# HOME-FLASH-001 — learner visual inspection (green capture)

Captured with `scripts/home-flash-capture.mjs` against the live lts-serve on the
current dist (390x844, mobile:true, fresh profile "Home Flash", installed+pinned pack).
Machine results: `result-green.json` — 0 occurrences of the pack-absent label in the
first 5s (the red-at-HEAD baseline recorded 5 occurrences, t=201/403/605/807/1009ms),
healthyStreak 3/3, exactly one path-pin. `home-green.png` and `home-red-at-HEAD.png`
are the committed captures.

## Note on vision-based inspection
The vision backend for this session (`vision_analyze`) is not available (server booted
without `--vision`; 400 invalid_request_error). The green capture was verified
mechanically instead: the live poll log in `result-green.json` shows the rendered home
text at every 200ms tick (greeting "Hi Home Flash", time-budget row, plan copy,
provenance badge, first-run rows) with 0 pack-absent/pack-unread occurrences throughout,
the red poll log recorded exactly the same window with 5 occurrences of the label, and the
home vitest contract pins the neutral-while-pending rendering byte-for-byte. The PNG is
committed as visual evidence for the owner to read alongside the poll log.

## What the learner sees after entering a profile (green)
Top to bottom: nav (Today active / Practice / My Words / Progress / Settings), greeting
card ("Hi Home Flash"), the "What to practice now" prompt once the plan settles, the
time-budget segments (5/10/20/30 min), then the plan ("Where to begin — from the pack you
are learning, in its order") and its first-run rows. No "No language is set" notice and no
"could not read which language pack" notice appear at any poll tick (red baseline had 5).
Once the pack read settles the provenance badge ("Russian Reference Pack · AI-GENERATED
CONTENT · NOT HUMAN-REVIEWED") and the path pin render as before — no layout jump.
