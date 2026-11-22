# FIX-1 — the orthography id rename has no migration path for persisted learner evidence

Severity: HIGH for any existing learner (the owner's phone profile is the
live case). Found while reviewing 867654e for REVIEW-PRACTICE-GATE-001; the
lane met its card contract, but CODING_STANDARDS.md section B requires
"persisted learner data or pack-schema changes ship versioning and a
migration path" and this tree renames content ids without one.

## Facts (all re-verified at HEAD)

- 867654e retired 66 evidence-addressable content ids
  (`ru.orth.cyrillic.*-upper/-lower`) and replaced them with 33 merged ids
  (`ru.orth.cyrillic.a` etc.). languages/ru-RU/curriculum/goals.yaml:
  `required_concepts` swept from per-case ids to merged ids (diff
  c431333..867654e, goals.yaml hunk @@ -9,72 +9,39 @@).
- Mastery is re-derived from the append-only evidence log keyed strictly by
  content id: crates/learner-model/src/derive.rs:75
  (`.filter(|e| e.targets.iter().any(|t| t.as_str() == content_id))`).
- There is no old→new alias/remap anywhere (reviewer grep for migration/
  remap of orthography ids over HEAD apps+crates → zero hits).
- The rename rides a published pack: RU-REPUBLISH-048-001 shipped 0.4.8
  (built post-rename) and bumped the manifest, so in-app update delivers
  the merged ids to installs whose evidence was written under per-case ids.

## Consequence

An existing learner mid-Cyrillic updates the pack and their letter mastery
derives to ZERO under the merged ids: the on-ramp goal's
required_concepts are now the merged ids, the old attempts no longer
address them, so Independent status regresses, the greetings band-lock can
reopen, and units they already met can re-surface as new. Old scheduler
rows keyed to dead ids are orphaned. This is exactly the "loss" failure the
product quality bar forbids.

## Suggested fix shape (planner to spec)

A one-time, idempotent alias at derivation or install-update time mapping
`ru.orth.cyrillic.X-upper` and `...-lower` → `ru.orth.cyrillic.X` (max of
the pair's mastery, or merged evidence sets) — or a compatibility read in
`derive_pairs` that folds legacy per-case ids into the merged entity. Ship
with a red-first test: seed evidence under the old ids, assert the on-ramp
concepts still read Independent after the pack update. Also audit the
ja/demo packs for any future renames (same trap).
