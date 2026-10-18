Reference pack `org.openlanguage.ru-ru.reference`, version **0.4.2**, built from the
tree whose catalogue entry pins it (`fb6858d`). The pack name drops the stale
`(Draft)` marker here as well, in the catalogue entry too — the browse UI renders
the catalogue string, not the manifest's.

**Why this release was owed.** The 0.4.1 archive ships a Russian stress error:
`тотча́с`. Zaliznyak permits only one primary mark for that word, the double-marked
form was never schema-valid, and it reached all six learner sites. The lexicon and
narration records are corrected, and the recorded clip was re-baked from the
corrected reading — the archive member for `media/ru.lex.narration.totchas.wav`
moves from 80,684 B `abefb681…` to 76,844 B `b4b4e490…`, and its manifest row
carries the new digest. It is the only clip whose bytes changed in this release; the
other 4,855 are identical by size and content hash.

What a fresh install also gets that 0.4.1 did not carry:

- the **runnable listening and guided-speaking activities** from the modality
  remediation, so the pack's declared `(type, modality)` pairs now all have a runner
  instead of sitting behind rubric records that nothing could execute;
- **three pack-declared `task_sequence` blocks** (ADR-0037) — one complete sequence
  per A2/B1/B2 goal (`ru.goal.a2.past-events`, `ru.goal.b1.practical-problems`,
  `ru.goal.b2.style-register`).
- an **ADR-0035 batch provenance row** in `sources.jsonl`, reconstructing the
  commit range the bulk rows came from.

Archive: **318,491,600 bytes**, sha256
`3b3dc25694b60f899f675982721df23b7c5bb7a3471f0457298ae0e1e38386d4`. 5,789 members,
of which 4,856 are the media clips the pack manifest declares — every manifest row
is present, and `langpack install` round-trips to `current -> 0.4.2`.

Content posture is unchanged: AI-authored, `draft`, `review_status: community`, with
the Russian review queue still open (5 items, 0 closed). Guided speaking records
nothing and scores nothing (ADR-0017).

Licence: pack content **CC0-1.0**; the cited `zalizniak-2010` record is
CC-BY-NC-4.0, declared `mode: reference-only` — its data is not bundled or
mirrored, and no dictionary text is reproduced.
