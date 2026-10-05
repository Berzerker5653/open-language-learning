# Improvement backlog — learning outcomes and product experience (2026-10-05)

Grounded in the completed ja-JP (808 units) and ru-RU (810 units) draft kits, the external review (`2026-10-05-external-pack-review.md`), and the current desktop app surface (`apps/desktop/src/*.tsx`, `src-tauri/src/lib.rs`, `packs.rs`).

## Content pipeline (prevents the errors the review just found)

1. **Add an `audit-lexicon` gate to `score.sh`/CI.** Machine checks the review had to run ad hoc:
   - script purity: no Latin/Hangul/precomposed-accent characters inside Cyrillic or kana fields (the validator passed ~2,100 readings with Latin `é á ú ó` and a form containing Hangul `라우드`);
   - ru: every multi-vowel reading carries U+0301; stress position cross-checked against a bundled Zaliznyak-derived table;
   - ja: forms are kana-only (long-vowel mark allowed); readings match forms.
   This is the validator gap already ticketed; the review scripts (`tmp/review.py`, `tmp/fix-ru-stress.py`) are working prototypes.
2. **Dictionary provenance for verified status.** Every entry currently says `ru-original` / `ai-drafted-extension`, which blocks promotion past `draft`. Attach `jmdict` (ja glosses/readings) and `zaliznyak-2010` (ru stress/lemma) as provenance sources — both are redistributable for *reference* (CC BY-SA / CC BY-NC), so store source pointers + checksums, not copied text, keeping pack content CC0.
3. **Human-review queue for the ~684 ja gloss-divergence entries.** Ship the candidate list from the review as a reviewer worklist (entry id, our gloss, JMdict glosses, suggested kana). Reviewer tooling should show both, never auto-rewrite (an auto-rewrite trial corrupted valid entries like `はじめまして`).
4. **ru lexicon metadata: part of speech and noun gender.** Zero ru entries carry `part_of_speech`; gender is essential for Russian agreement practice and scheduling. ja entries already carry POS — mirror the schema.
5. **ja kanji layer is thin (one `kanji/entries.jsonl` seed).** 808 units teach hiragana-only forms; learners stall at transfer to real text. Expand kanji entries and gate kanji forms into B1+ units with furigana readings.

## Learning experience

6. **Render Russian stress visibly.** Readings now carry correct U+0301; the practice/writing UI should highlight the stressed vowel (and offer a toggle), since stress is the single hardest ru recall item.
7. **Goal-level progress, not unit counts.** Packs define 30+ goals with prerequisites and 2 assessments each (`curriculum/goals.yaml`, `assessments/definitions.jsonl`), but the UI surfaces units. Show a goal map with mastery state per dimension — this is what makes capability-unlock engagement (the AGENTS.md quality bar) visible.
8. **Draft-content honesty.** Both packs are structurally complete but 100% `draft`. The app must label draft packs clearly and avoid mastery semantics that punish learners on unreviewed content (loss-aversion redesign per AGENTS.md).
9. **Cloze/recall coverage.** ru kits are reading/writing only (`listening: false, speaking: false` in manifests). When the speech system matures, enable audio for ja/ru; until then, add text-to-speech-free alternatives like romaji/stress hints for ru recall.
10. **Phrase entries need first-class support.** ~280 ja and ~90 ru entries are multi-word phrases (`でんわを かけます`, `не понимаю`); the validator and review tooling treat them as noise. Add a `phrase` type with slot info so cloze/recall can target the right token.

## Program experience

11. **Publish both packs through the catalog path.** `packs.rs` already enforces checksum-pinned, host-allowlisted installs with `trust_state: "community"` — publishing `org.openlanguage.ja-jp.reference` and `org.openlanguage.ru-ru.reference` as versioned release assets gives users one-click install (owner authorization required for publishing).
12. **In-app "content claims" panel.** Show per-pack counts (units, goals, assessments), review posture (`draft`), and provenance sources — the data already exists in the pack; the UI just doesn't expose it.
13. **Regenerable audit artifacts.** Move the review scripts into `experiments/llm-pack-authoring/` (or `tools/`) so any future pack gets the same external-source audit; keep third-party data out of the repo, fetched by checksum-pinned scripts.

## Explicit non-goals

- No licensing change: packs stay CC0; external dictionaries stay reference-only.
- No self-certification: none of the above upgrades `review_status`; qualified human review remains the gate (AGENTS.md).
