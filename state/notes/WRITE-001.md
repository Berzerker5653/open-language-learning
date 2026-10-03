# WRITE-001 — Japanese typing/composition activities

Date: 2026-10-03

## Acceptance mapping

1. **IME input works without requiring handwriting.**
   - Engine (`crates/activity/src/writing.rs`): `InputSurface` has exactly
     one variant, `Keyboard` — free text entered through the platform IME.
     No handwriting/stroke/canvas concept exists anywhere in the runtime,
     so no pack or activity can require handwriting.
   - Pack routing already supports it: `type: produce`, `modality: writing`
     → Retrieval family, `ProductionWriting` dimension (fixture
     `es.activity.intro.type-script` renders through the same runtime).
   - UI (`apps/desktop/src/writing.tsx`): plain `<input type="text"
     lang="ja">` (IME composition works natively), hint buttons, Check.
     Vitest asserts no canvas/stroke/handwriting/trace surface.
   - Grading compares typed text to the canonical answer plus declared
     accepted variants (okurigana/kana variants), whitespace-tolerant,
     no lossy normalization (small kana and okurigana stay meaning-bearing).

2. **Writing production evidence is distinct from recognition.**
   - Rust test `writing_evidence_is_distinct_from_recognition`: a correct
     typed answer produces `modality = production-writing` evidence;
     derivation moves `ProductionWriting` only — `ComprehensionReading`,
     `RecallMeaning`, `ComprehensionListening` all stay `Unseen`.
   - Hints (`Show reading` / `Show romaji`) attach `SuppliedReading` /
     `RomajiReveal` support actions, so hinted successes are recorded with
     support and never counted as independent (docs/03 §5).

## Verification

- `cargo test --workspace`: 150 passed (lts-activity now 17: +4 writing)
  — `cargo-test-2026-10-03.txt`.
- `pnpm --filter @openlang/desktop typecheck` + `test`: 10 vitest cases
  (+2 writing surface).
- `./scripts/ci.sh` exit 0 — `ci-2026-10-03.txt`.

## Notes

- Handwriting input is deliberately unmodeled (docs/06 typing-first
  input policy); if it is ever added it must be an explicit new
  `InputSurface` variant with its own ADR.
- No new pack schema fields were needed; `produce`/writing activities
  already validate under the existing activity schema.

## Live native verification (2026-10-03, desktop release candidate)

End-to-end on the built debug binary (`tauri build --debug --no-bundle`)
driven through the real GUI (XTEST clicks + OCR-guided):

- New Tauri commands `writing_task` / `writing_submit` (lib.rs): task
  comes from the active pack lexicon, rotates past items already having
  `production-writing` evidence, grading + evidence append happen in
  Rust so the mastery pipeline stays honest.
- Writer9 profile: prompt "hello" → typed こんにちは → Check →
  verdict "Correct"; DB row `production-writing | scored | support 0 |
  ["ja.lex.demo.konnichiwa"]`.
- Re-entering the Writing tab rotated to the next item (prompt "I
  (neutral polite first person)"); used `Show romaji` then typed
  `watashi` → DB row `production-writing | scored | support 1 |
  ["writing-hint"] | ["ja.lex.demo.watashi"]`.
- Two onboarding visibility bugs found and fixed while reaching the
  route: (1) scroll position persisted across onboarding steps, hiding
  the pack list under the sticky header (now `window.scrollTo(0, 0)`
  on step/route change); (2) `text-wrap: balance` on headings made
  WebKitGTK skip painting the step `<h1>` (removed).
