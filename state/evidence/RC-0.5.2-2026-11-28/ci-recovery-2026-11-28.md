# CI recovery 2026-11-28 — root causes and state

Two independent main-branch CI failure classes (email to owner 2026-11-28):

1. **web job** — failing since ~2026-11-26/27 (predates the RU 0.5.2 publish).
   prettier drift (home.tsx re-dirtied by b106252b; path-far-future-capture.mjs)
   then eslint dead wrapper `refreshErrorReviews` (left by APP-SPLIT-003G).
   Fixed: b8a37cd0 + a918c192. **web GREEN** at run 46167834294.

2. **rust-test/conformance/desktop-smoke** — introduced TODAY by `8a8b34c6`
   (FIX-M2-SUPPLY-RU-001 lane): the commit bumped the ja manifest 0.4.4 -> 0.4.5
   (ladder data fixes) without a published 0.4.5 archive. CI's audio-restore
   correctly refuses an unpublished pin ("no single entry in catalog/packs.json").
   NOT caused by the RU 0.5.2 publish (RU resolves fine — CI gets past ru, fails on ja).

**Owner question recorded (asked 2026-11-28, no answer yet — non-blocking):**
publish Japanese pack 0.4.5 (same owner gate as RU 0.5.2; would also ship the
JA ladder fixes to learners and turn CI fully green)?
Reversible default while unanswered: leave CI red on the 6 ja-blocked jobs;
no catalog/pin changes made.

Pre-existing carve-out this matches: board fix-pack-k65 ("published ja archive
predates the manifest until owner-gated republish").
