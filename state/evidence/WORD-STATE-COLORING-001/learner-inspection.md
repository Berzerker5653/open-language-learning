# WORD-STATE-COLORING-001 — learner inspection note (390px)

Evidence: `phone-0-unseen.png` / `phone-1-learning.png` / `phone-1-paragraph.png` / `phone-2-confirmed.png` + `audit.json`. Capture harness walked the real App over the fake engine at 390px viewport: onboard (Japanese) → reader → measure unseen → tap first word → mine → close card → measure learning → re-open card → confirm → close card → measure confirmed. Re-captured 2026-11-26 after the SPEC review's D1 defect (the previous `phone-2-confirmed.png` was byte-identical to `phone-1-paragraph.png` and showed a selected word, not the muted confirmed state).

Measurement note (honesty): the learning and confirmed measurements are taken AFTER the open-card marker is cleared. A word whose card is open also carries `word--active`, whose color (`--accent-ink`, teal) wins over the state class; measuring with the card open reports teal for a confirmed word and would mask the muted state. Blurring the returned focus before each measurement shows the resting state the learner sees with the card closed — no focus ring, no selection marker.

## Learned as a learner (per-shot)
- phone-0-unseen: every word plain (class `word`, computed `rgb(36, 31, 24)`); 8 words, 0 learning, 0 confirmed. Document scroll width == client width (390px) — no horizontal overflow.
- phone-1-learning: after mining the first word `きょうしつ` and closing the card, its button is `word word--learning` (computed `rgb(20, 97, 94)` — teal, via `--accent`); the other 7 words stay plain. No confirmation painted — the learning state is the honest kept-words-list signal.
- phone-1-paragraph: the open-card paragraph shot — `きょうしつ` highlighted with `word--active` (teal accent, rounded background), the closed-card word state removed; the word-card bottom sheet shows the gloss, `Mine`, `This looks right`, and `Close`. Inline tap target intact, no layout shift from the coloring.
- phone-2-confirmed: after pressing the card's confirm button (`This looks right`) and closing the card, `きょうしつ` is `word word--confirmed` (computed `rgb(117, 108, 93)` — muted, via `--ink-faint`); 7 other words stay plain; 0 learning. Confirmation beat the learning class (confirmation wins).

## Honest-state spot check
- Learning state renders only from the learner's kept-words list (My Words mint) — the same list the My Words surface renders; no parallel store.
- Confirmed state renders only from the learner's OWN confirmation mark on the word's content id — a mark by someone else stays unpainted (vitest pin: "Ana's mark never paints confirmed").
- Unseen words carry no state class at all (plain text, honest default).

## Gates
- `npx tsc --noEmit` — clean
- `npx vitest run src/reading.test.tsx` — 26/26 (5 new in-text state pins: unseen plain / learning teal / confirmed muted / other-mark-not-confirmed / confirmation-wins-over-learning)
- `npx vitest run` (full desktop) — 77 files, 694/694
