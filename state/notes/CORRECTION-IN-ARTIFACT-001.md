# CORRECTION-IN-ARTIFACT-001 — speech/dictation feedback inside the artifact (U9)

Source: docs/ui-review-2026-11-23.md — "Where we still trail the market" #8 (U9, Praktika pattern).
ERR-SRS-LOOP-001 + FIX-ERR-SRS-LOOP-001-2 shipped the error-offer surface (a separate offer line per dictation/writing result) — the wrong form is NOT marked inside the sentence itself. The Praktika-style correction marks the mismatched form inline within the sentence (struck through / marked, corrected form beside it), which is the shape learners actually read.

Scope (desktop UI):
- dictation.tsx result view: mark each mismatched form inline inside the sentence text (CSS line-through / accent underline + the corrected form beside it), alongside the existing separate offer affordance.
- writing.tsx result view: same inline treatment where the grade carries per-form feedback (keep additive; no change to existing WritingGrade fields or the separate offer surface).
- Honest: only mark forms the grade actually reported as mismatched; never guess at a wrong form.

Tests: red-first vitest pins (wrong form inside the sentence + corrected form beside it + render-only never calls error_review_accept), tsc, full desktop suite green; 390px capture under state/evidence/CORRECTION-IN-ARTIFACT-001/.

Not in scope: the server-side error ledger/offers, re-bake of audio, any new IPC.
