# FIX-ERR-SRS-LOOP-001-2 — closed 2026-11-21

Attempt 1 (board iteration budget) left the lane implemented but uncommitted with
tests in progress; the takeover run finished the tests, found two real defects
through them, fixed them, ran the LANE battery, and closed the card.

Shipped:
1. D3 frontend: `apps/desktop/src/error-review.tsx` (wire mirrors +
   `ErrorOfferList` + `ErrorReviewPanel`); `dictation.tsx` gains optional
   `error_offers` on DictationResult + accept props; `writing.tsx` gains
   `offer`/`offerAccepted`/`onAcceptOffer`; App.tsx wires accept
   (`error_review_accept`), queue refresh in `openWords` (`error_review_queue`),
   drill + grade (`error_review_grade`), panel mounted under My Words.
2. Never-silent invariant pinned twice: static component tests (rendering an
   offer never calls accept) and the mounted journey (zero `error_review_accept`
   calls until the button click; exactly one after).
3. D4: `pack_sentence_text` resolves lexicon ids to the row's primary form
   (lib.rs), doc comment corrected, Rust test
   `pack_sentence_text_resolves_lexicon_context_ids`.

Takeover fixes the in-progress tests caught:
- The drill panel showed the context sentence VERBATIM before reveal — a
  spoiler whenever the sentence contains the drilled form. `blankedContext()`
  now blanks the form out pre-reveal; when the context IS the form (lexicon
  origin, D4) or blanking is impossible, the prompt honestly names just the
  lemma. Journey harness fake updated to carry the form in the context
  (mirrors lib.rs resolving to the sentence the form appeared in).
- `button-affordance.test.ts`: error-review.tsx added to the pinned bare-btn
  inventory (buttons use the reviewed idiom verbatim; this card IS the review
  of that call site — gates were not otherwise touched).

Wire shapes stayed additive: TS interfaces gained optional fields only; Rust
`DictationResult`/`WritingGrade` structs untouched (fields already existed);
lib.rs changes are the D4 resolution + comment honesty.
