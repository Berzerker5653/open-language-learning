# PATH-LOCK-ORDER-001 — locked nodes render BELOW the frontier only

Live violation (owner phone, `state/evidence/DOGFOOD-2026-11-23/live-phone-fold0.png`,
attached to board card t_2a800b60): two LOCKED nodes ("Number words zero through
four", "Number words five through nine") rendered ABOVE the "You are here" pin,
each repeating the identical unlock sentence
`finish "Recognize and copy every printed Cyrillic letter, one sound per letter,
and interpret the teaching stress mark."`.
Market rule (docs/design/PROGRESSION-UX-AUDIT-2026-11-22.md § MARKET NAVIGATION
RULES): completed above, locked strictly below; nothing locked sits above the
learner.

## Root cause (measured, not guessed)

1. **Gate edges are honest — they are NOT the bug.** The number-words units
   (`ru.unit.on-ramp.numbers-01/02`, pack files 008/009) carry no `requires_unit`
   edge; their lock is goal-level: `ru.goal.on-ramp.numbers` has a hard
   prerequisite on `ru.goal.on-ramp.cyrillic`
   (`orthography-recognition: independent`). So does EVERY other on-ramp word
   goal (greetings, self-introduction, classroom, everyday). Reading Cyrillic
   letters before reading Russian words is correct pedagogy — the gate stays.
2. **The dishonest part is the placement.** `pathUnits` emits nodes in the pack's
   numbered FILE order (000 greetings … 008/009 numbers … 010+ cyrillic) and
   `pathSections` keeps curriculum order inside each band section. File order
   says "numbers before letters"; the goal gate says the opposite. On a FRESH
   profile every word unit (files 000–009, TEN nodes) is locked and renders
   above the unlocked cyrillic frontier — the owner's phone showed two of them
   because more of his goals were satisfied.
3. **The duplicated sentence** is simply every word goal's identical hard
   prerequisite rendered per-node: `lib.rs` builds one `unlock_hint` per locked
   node and the renderer prints each; ten siblings, ten copies.

## The fix (display layer only; no gate/pack changes, no Rust changes)

- `pathSections` sorts each section's nodes into the market order
  **proven-done → open (frontier side) → locked**, stable within each group so
  curriculum order survives inside it. Locks then sit exactly where their real
  gate edges put them, independent of file numbering.
- The unlock reason renders **once per distinct hint string** across the
  rendered path: sibling locked nodes sharing a gate do not repeat the sentence.
- Frontier pin logic (PATH-PIN-CONSISTENCY-001) is untouched: pin = first
  in-progress else first not-done unlocked, now lands inside the contiguous
  unlocked run with locked strictly after it.

## Evidence gates

- Vitest contract (red at base): section ordering + "no locked node before the
  pin in rendered markup" + hint dedup.
- `scripts/path-lock-order-capture.mjs` — real engine (lts-serve) at 390x844,
  fresh profile: **locked-above-frontier == 0** (red-at-base measures 10),
  no locked node above any open node, zero duplicated unlock sentences,
  fold-0 + full-path screenshots.
- firstscreen capture, session/whatsnext/capstone journeys stay green unedited.
- TODAY-FIRSTSCREEN-001 scroll/pill work and SERVE-BANNER-001 untouched.
