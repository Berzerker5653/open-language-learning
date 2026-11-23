# REVIEW-PATH-VIEW-001 — SPEC axis verdict

Contract under review: `state/notes/PATH-VIEW-001.md` (phase-1 scope, design authority
PROGRESS-PATH-DESIGN-001) + ROADMAP acceptance for PATH-VIEW-001.
Diff: `64489e8` (path wiring: lib.rs + home.tsx + styles.css + path-view.test.tsx + capture
harness + evidence), `a69cde0` (capture-harness seeding fix), `7c69cdf` / `7d723b8`
(ledger/gate records, hygiene only).

## Outcome: approved-with-notes

### Acceptance bullets (ROADMAP) — all verified

1. **Mobile screenshots, fresh profile** — 3 pngs + result.json under
   `state/evidence/PATH-VIEW-001/` exist; result.json: viewport 390x844, 15/15 checks,
   0 failures, fresh profile `prof-8a325ee2-…`, backdated review item
   `ru.orth.cyrillic.a#orthography-recognition`. Machine audit: locked-ahead 90 visible,
   90/90 carry unlock hints; review-due badge on the back-dated unit; done glyph present;
   pin marker present; done nodes ABOVE the pin with pin in viewport; 44px touch floor; no
   horizontal overflow. Vision QA (this review, plus lane's own): done rows with green
   checks, "You are here" pin row, tan review-due badge, locked rows dim with
   `finish "…" · +4 more` pack-worded hints, hollow markers on ready rows. The acceptance
   dir contains exactly the named artifacts.
2. **Red test attendance-but-not-done** —
   `unit_path_done_never_reads_attendance_only` (Rust, done = refs_done == refs.len() over
   evidence-backed rows at the Introduced floor) re-run green at HEAD as part of this review
   (`cargo test -p lts-desktop --lib unit_path` → 2 passed, 86.7s), plus vitest mirror in
   `path-view.test.tsx` (31/31 re-run green at HEAD).
3. **LANE-tier gates** — gates.log battery matches the lane tier (fmt, scoped clippy
   `-D warnings`, scoped cargo test, tsc, vitest 482) with exit codes; re-posture noted on
   the standards axis.

### Design phase-1 conformance

- Node states locked / ready / current / done / review-due exactly per design
  (markers • ○ ◉ ✓ ⟳); section headers friendly name + CEFR subtitle + done-count,
  collapsed except the pinned band — all present in code and captures.
- **View reads the plan, never re-plans**: `unit_path_at` is read-only over store evidence,
  SESSION-SEQUENCE-001 gating predicates, today's plan and scheduler_state; no new planning
  semantics. Done floor is evidence (`introduced`), attendance can open a unit but never
  finish one.
- Today renders `PathView` when `pathNodes` is non-empty; existing Today surfaces untouched
  (additive) — in scope for a view-only card.
- The 416-line `scripts/path-view-capture.mjs` judged as harness, not product surface (per
  card). `a69cde0` touches only harness seeding; diff-verified no assertion lines changed
  ("All 15 assertions untouched" claim holds).

### Out-of-scope additions

None. The friendly band-name map and the shared-command-table exposure (serve gets
`unit_path` too) are infrastructure the evidence gate required, no semantics added.

### Asked-but-omitted

- Design phase-1 prose line "tap any node you started = its unit detail" is not implemented
  (nodes are non-interactive `<li>`; only focusUnit/scroll-to-pin wiring exists). Not an
  acceptance bullet; flag for planner — PATH-WHATSNEXT-001 builds on these node components
  (hotspot note), so fold tap-through there rather than a standalone fix.

## Defects named (for planner FIX cards)

- **D1 (product, real): duplicate same-named band sections + toggle coupling + React key
  collision.** `pathSections` (home.tsx:1043) groups *consecutive* band runs, but the RU
  pack's numbered curriculum order revisits bands — units 810–818 (journey/capstone A2/B1/B2)
  come after the 400-unit B2 block — so Today renders two "Elementary A2", two
  "Intermediate B1", two "Upper-intermediate B2" section headers (visible in the capture
  pngs and confirmed from pack data: consecutive runs are on-ramp 20, A1 90, A2 99, B1 156,
  B2 400+, A2 3, B1 3, B2 3). Section identity is band-keyed: `isOpen = openBand === s.band`
  (home.tsx:1471) makes toggling either A2 header open BOTH, and `key={s.band}`
  (home.tsx:1480) duplicates React keys. Fix direction: group by band (first-run position)
  or key/label sections by band+run index; add a test that packs revisiting a band render
  one merged section.
- **D2 (harness hygiene; adjacent product observation):** capture ran without the
  serve-mode stable-home poll (3 consecutive healthy polls before shots + re-verify after
  each). Consequence visible in the acceptance pngs: a "No language is set for this profile
  yet — Choose a language" empty-state card sits on the same fully-loaded screen that shows
  the plan and the path (confirmed top-of-page in path-locked-ahead.png). No false-green
  risk (all DOM assertions are path-container-scoped and pack-derived), and the lane itself
  logged this as the "stale empty-language banner" home-region observation in the ledger —
  but the acceptance shots carry a contradictory home state, and the underlying banner bug
  deserves its own home-region card (already implicitly parked for PATH-WHATSNEXT-001).
