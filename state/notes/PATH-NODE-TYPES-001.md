# PATH-NODE-TYPES-001 — typed node glyphs by activity kind

Board card: t_c4256d29. Market oracle: attachment sheet-duolingo-path.png
(local only, never committed) + FEEL-TARGETS-2026-11-22.

## The complaint the market names

Every journey node today is the SAME circle — `•` locked, `○` ready, `◉`
current, `✓` done (`PATH_MARKERS` in home.tsx). Duolingo's grammar (see the
sheet): the circle's FILL/COLOR/DECORATION carries state, and the PICTOGRAM
inside carries WHAT the node is (star lesson, headphones listening, book
story, dumbbell practice, trophy completion). We have the state layer
(ring fill, halo, pin, lock) but no kind layer at all.

## Frozen contract

### Engine owns the kind (wire change, no UI inference)

`UnitPathNodeView` gains `kind: String` ∈ `letters | listening | speaking |
words`, derived in `unit_path_at` from pack unit activities ONLY — never
title prose, never unit-id word matching. Derivation `unit_kind(unit)`:

1. **letters** — the unit schedules at least one content ref in the
   ORTHOGRAPHY namespace: the content id's second dot segment is `orth`
   (`ru.orth.cyrillic.*`, `ja.orth.hira.*` — both packs already follow the
   convention).
2. **listening / speaking** — ORAL-DOMINANT: `listening + speaking > 0` and
   oral >= print (reading+writing+interaction counts). Oral winner is
   `listening` when listening >= speaking, else `speaking`.
3. **words** — everything else (the honest default: our 818-unit RU dev
   pack is vocabulary-work-centric; one stray listen-and-choose inside a
   reading/writing unit must NOT relabel it "listening").

`review` is NOT a wire kind — it stays the existing review-due STATE
(`done && due_count>0`), whose glyph rides the state layer with its
"Review due (N)" caption (PATH-VIEW-001 precedent).

Honest distribution on the RU dev pack: 10 letters, 808 words, 0
listening/speaking nodes (measured; the four oral-bearing journey units are
print-dominant). The grammar lights up as packs add oral-dominant units —
the ja on-ramp greeting unit (1 reading / 1 listening / 1 speaking /
1 interaction) IS listening-dominant under rule 2.

### Glyph grammar (Duolingo family, our tokens)

Center of the ring carries ONE aria-hidden SVG pictogram (drawn, never
emoji — PathLockGlyph precedent):

- ready / current / in-progress → KIND glyph: letters = printed "A" tile,
  listening = headphones, speaking = microphone, words = open book.
  The `•/○/◉` text dots are GONE.
- locked → padlock (unchanged, wins over kind).
- done → ✓ check (the market's completion mark; kind yields, exactly as
  Duolingo's star yields to the check).
- review-due → circular refresh arrow (replaces the `⟳` TEXT glyph —
  deliberate contract change; path-view.test "re-lights" updates).

State still lives in ring fill/color/halo/pin/captions — never the glyph.

### Glyph never stands alone (a11y floor)

- each node gains `data-kind` (capture/test hook);
- each node renders an sr-only kind word (`Letters`/`Listening`/`Speaking`/
  `Words`) in the body — repo adds the sr-only clip pattern;
- done nodes gain an sr-only `Completed` word (the ✓ was color/glyph-only);
- all existing captions stay: "You are here", "In progress (x/y learned)",
  "Review due (N)", unlock hints.

ADR-0002: information design, zero reward mechanics. Tokens: existing
colors only, pictograms use currentColor like PathLockGlyph.

## Acceptance oracles

1. vitest markup: per-kind data-kind + pictogram + sr word; review-due
   renders the review pictogram; NO text-dot markers anywhere in the track;
   done keeps ✓ and adds the sr word.
2. rust: `unit_kind` table test over yaml fixtures (all four kinds,
   boundary: oral == print → oral wins) + real reference pack through
   `unit_path_at`: cyrillic-a-o-m-t → letters, greetings-01 → words.
3. `scripts/path-node-types-capture.mjs` (real engine, lts-serve + CDP,
   same plumbing as path-scroll-capture): every rendered node carries a
   data-kind matching the engine; the Cyrillic letter nodes render
   letters-kind; no `•/○/◉` text in any marker; every node's body carries
   the sr kind word; a seeded review-due node shows the review pictogram
   AND its caption; region screenshots. The same script must FAIL at HEAD
   (red proof) and go green with this lane.

## Lane shape

Rust (lib.rs: kind field + unit_kind + tests) and frontend (home.tsx,
styles.css, path-view.test.tsx) are one lane, disjoint from every other
live card. No pack/data file changes.
