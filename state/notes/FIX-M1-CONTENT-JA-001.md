# FIX-M1-CONTENT-JA-001 — fix Month-1 JA kana verb cards + loanword orthography

Source: LEARNER-REVIEW-M1-001 defect ledger (D-009, D-010). Evidence:
state/evidence/LEARNER-REVIEW-M1-001/defects.md + review/verdicts/ja-050.md,
ja-053.md, ja-049.md, ja-lexwarn.md.

## Scope

1. **Wrong verb cards** (raw-lesson_plan provenance, ids pinned in D-009):
   - `ja.lex.verbs.kaerimasu` display かえりざк → かえります
   - `ja.lex.verbs.arukimasu` display あるきだす → あるきます
   - `ja.lex.verbs.nemasu` display ねかす → ねます
   Locate rows in languages/ja-JP lexicon shards; sweep the verb table for
   any other display≠reading-vs-gloss mismatches (extend
   month1_mech_pass-style check or one-off script; findings beyond these
   three go in this card's ledger update).
2. **Loanword orthography**: ja.sent.concert-fun こんさーと → コンサート
   (+ media re-bake + ASR re-verify). Pin the pack's loanword convention
   (katakana) in the pack README/authoring note so it is enforceable.
3. **D-010 split-item artifact**: reproduce ja-049 items 1162-1165
   (おやすみ/なさい split, gloss "the rest wish") from raw day logs; fix if
   confirmed.

## Acceptance

- Rows fixed across all shards (json round-trip sweep), manifest/audio
  re-baked + ASR green for touched ids.
- A regression check (test or gate script) rejects lexicon rows where the
  kana display is not a word matching the gloss class for verbs (cheapest
  honest version: display must equal reading AND appear in the pack's own
  verb table).
- gates.log under state/evidence/FIX-M1-CONTENT-JA-001/.
