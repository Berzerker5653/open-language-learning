# WORD-STATE-COLORING-001 — learner inspection note (390px)

Evidence: `phone-0-unseen.png` / `phone-1-learning.png` / `phone-1-paragraph.png` / `phone-2-confirmed.png` + `audit.json`. Capture harness walked the real App over the fake engine at 390px viewport: onboard (Japanese) → reader → measure unseen → tap first word → mine → measure learning → confirm → measure confirmed.

## Learned as a learner (per-shot)
- phone-0-unseen: every word plain (class `word`, computed `rgb(36, 31, 24)`); 8 words, 0 learning, 0 confirmed. Document scroll width == client width (390px) — no horizontal overflow.
- phone-1-learning: after mining the first word `きょうしつ`, its button is `word word--learning` (computed `rgb(20, 97, 94)` — teal, via `--accent`); the other 7 words stay plain. The unconfirmed word shape is untouched — no confirmation painted that the learner did not earn.
- phone-1-paragraph: zoomed paragraph shot — per-word buttons are inline and selectable (tap target), no layout shift from the coloring.
- phone-2-confirmed: after pressing the confirm button, `きょうしつ` is `word word--confirmed` (computed `rgb(117, 108, 93)` — muted, via `--ink-faint`); 7 other words stay plain; 0 learning. Confirmation beat the learning class (confirmation wins).

## Honest-state spot check
- Learning state renders only from the learner's kept-words list (My Words mint) — the same list the My Words surface renders; no parallel store.
- Confirmed state renders only from the learner's OWN confirmation mark on the word's content id — a mark by someone else stays unpainted (vitest pin: "Ana's mark never paints confirmed").
- Unseen words carry no state class at all (plain text, honest default).

## Gates
- `npx tsc --noEmit` — clean
- `npx vitest run src/reading.test.tsx` — 26/26 (5 new in-text state pins: unseen plain / learning teal / confirmed muted / other-mark-not-confirmed / confirmation-wins-over-learning)
- `npx vitest run` (full desktop) — 76 files, 680/680
