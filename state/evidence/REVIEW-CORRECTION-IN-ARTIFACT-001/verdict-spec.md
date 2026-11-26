# CORRECTION-IN-ARTIFACT-001 / REVIEW-CORRECTION-IN-ARTIFACT-001 — SPEC verdict

Axis: (a) SPEC — does the diff do exactly what the card (state/notes/CORRECTION-IN-ARTIFACT-001.md) asked?
Evidence reviewed: feat 03663a36 (apps/desktop/src/dictation.tsx, writing.tsx, packages/ui/src/styles.css, dictation.test.tsx, writing.test.tsx, 2x 390px captures, gates.log), ledger a8f4b688, task-state.json entry.

## Verdict: PASS-WITH-NOTES — implementation matches the card; no spec violation that blocks. Non-blocking observations below.

### In-scope (verified)
- Dictation: each mismatched form is marked inline inside the sentence blockquote (dictation.tsx:90-124, render at dictation.tsx:151) — struck-through `offer.produced` beside an accent-underlined `offer.expected`, wrapped in `.inline-correction` with `data-testid="inline-correction"`. Additive to the separate error-offer surface (untouched) and the gloss/New-sentence area.
- Writing: when `p.graded && !p.correct && p.offer`, the same wrong/correct pair renders directly under the expected line (writing.tsx:129-134), additive to the existing expected line and the separate `ErrorOfferList` surface (writing.tsx:136+ unchanged).
- Honesty: only forms the grade reported are marked (expected must literally appear in the sentence; `hit` guard, dictation.tsx:106-117; offers without `expected` are skipped). A matched result renders no inline mark. Rendering never calls the accept handler (tests pin this).
- Styles: `.inline-correction`, `__wrong` (line-through, `--err`, `--ink-faint`), `__correct` (underline, `--accent`, `--accent-ink`) added in packages/ui/src/styles.css:3198-3222 — tokens, not raw hex.
- Tests: red-first pins present (5 dictation + 3 writing), tsc clean, full desktop suite 675/675 (gates.log), 390px captures committed (both show the struck wrong form + corrected form; no overflow). Visually verified the two captures — dictation card shows "Я читаю книгу книги каждую неделю." with "книгу" struck and "книги" accent-underlined; writing card shows the pair in a dedicated line under the expected line.

### Observations (non-blocking, NOT approved-for-defect; record for the next fix pass)
- O1 — Writing is not strictly "inline inside the sentence": writing.tsx renders the pair in a separate `<p>` beside the expected line, not inside a sentence blockquote. Writing's surface has no sentence artifact (prompt is a partial sentence "Я читаю …"), so "same inline treatment" is honored as closely as the surface allows; flag for the next pass if the card means a literal inline mark inside the writing prompt.
- O2 — Dictation mark replaces the expected form's position in the sentence (the blockquote no longer contains the plain "книги"; it contains the produced/expected pair at that spot). This is the Praktika pattern, but plain-text/screen-reader extraction of the blockquote now reads the wrong form first where the expected form used to be. Acceptable; worth a note in the FIX context.
- O3 — Key collision risk: dictation.tsx `key={`${offer.ledger_id}-${idx}`}` — `idx` is the index within a string node; once an earlier offer has split the sentence into multiple nodes, the same (offer, idx) can recur across nodes → duplicate React keys (silent dev warning). Edge case with multiple offers; non-blocking.
- O4 — `inlineSentenceWithCorrections` only marks the expected form if it appears literally in `sentence.text`; offers whose expected form is absent are skipped silently and the offer still appears in the separate offer surface. Consistent with the card ("never guess"), noted.

### Out-of-scope additions / omissions
- None. No server-side changes, no new IPC, no audio re-bake, no change to existing writing `WritingGrade` fields or the separate offer surface, no layout redesign (styles.css adds only the three new rules). Gates/test discipline matches the card ("red-first vitest pins ... tsc, full desktop suite green; 390px capture").
- No omissions: dictation (U9) and writing surfaces both get the treatment, exactly as scoped.
