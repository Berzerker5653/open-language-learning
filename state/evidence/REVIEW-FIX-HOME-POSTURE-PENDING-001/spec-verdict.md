# REVIEW-FIX-HOME-POSTURE-PENDING-001 — SPEC verdict

**Verdict: PASS**

- Badge gate: `home.tsx:344` — `{p.activePack && !p.packsPending ? (…)}`. Stale activePack + packsPending renders no badge, no name, no posture; settled no-pack warning path unchanged (`packsPending ? null : p.noPack ? …`). No layout jump: scaffold still renders ("What to practice now") while pending.
- Pin extension (`home.test.tsx`, new case "does not claim a pack while the read is in flight"): passes a stale activePack + packsPending, asserts badge/name/posture absent and scaffold present. Verified: 37/37 home.test.tsx pass.
- FIX-BUTTON-AFFORDANCE-PINS-001 pin re-pin (`button-affordance.test.ts`): three disabled-state assertions re-pinned to the shipped 07600536 contract (opacity 1, ink-faint, line-strong); inventory/hover/background pins unchanged. Not weakened beyond the exact contract the superseding commit changed. Verified: 5/5 button-affordance.test.ts pass.
- Out of scope: no other files touched in the two fix commits (76b59d8c touches home.tsx/home.test.tsx/gates.log only; 432a70db touches button-affordance.test.ts/gates.log only). No omissions vs FIX-HOME-POSTURE-PENDING-001: the settle gate covers every stale-activePack case, not just the profile-open resume.
- Red-at-HEAD contract: 665/665 claimed; my spot-check of the two pinned files green (not a full-suite re-run; gates.log evidence accepted).
