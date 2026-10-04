# Provenance: `languages/ja-JP` draft reference pack

Date: 2026-10-03. Purpose: determine whether the draft pack's content is
original, copied/adapted third-party material, or merely informed by
referenced frameworks — per owner direction 2026-10-03.

## What the pack is

A small schema/conformance seed (greetings lexicon, one grammar item, one
scenario, goal graph scaffold) shipped in the specification handoff package
and committed at baseline `d0a4e76` ("Baseline: specification handoff
package"). It has never been extended with imported dictionary dumps: the
lexical import pipeline (JA-RES-006) exists but was never run against this
pack, and no bulk data files exist in the tree.

## Findings

1. **Authorship.** The content entered the repository through the owner's
   own handoff bundle (single baseline commit; no upstream repo history).
   There is no evidence of third-party text being copied in.
2. **Framework references are alignment, not copying.** `sources:
   [jf-standard]` marks goal alignment to the JF Standard *can-do
   framework*. The source record (`SOURCES.yaml`) explicitly marks it
   `redistribution: reference-only` with the note "do not assume
   permission to copy site/course content", and every content item's
   `notes` field states the source is framework-level and that proper
   lexical sourcing/review is still required. The goal description text is
   project phrasing (`framework_refs: []`), not JF Standard text.
   A reference to a framework is not evidence of copied content.

## Classification by material class (honest version)

Owner correction 2026-10-03: presence in the baseline commit is NOT
proof of authorship. Re-examined per material class:

1. **Headwords/forms** (こんにちは, はじめまして, 私, ...): individual
   words are facts, not copyrightable expression. No rights question.
2. **English glosses** ("hello / good day (context-dependent
   greeting)", ...): short functional phrases. Authorship is unknown —
   they arrived inside the owner's handoff bundle, which shows custody,
   not creation. They do not match JMdict gloss phrasing, but "unknown
   author" is not the same as "proven original". Treated as
   **unresolved** (thin copyrightability makes them low-risk, but the
   record cannot claim more than the evidence supports).
3. **Framework alignment** (goal descriptions, `sources:
   jf-standard`): project phrasing aligned to a can-do framework.
   Frameworks are ideas, not protected expression; no JF Standard text
   was found copied. Low risk, but the descriptions' authorship is
   likewise unproven.
4. **Grammar/pragmatics notes**: same situation as glosses — original
   *appearance*, unproven authorship.

## Conclusion (revised)

Nothing in the audit shows copied third-party text, and every
referenced source either permits redistribution (JMdict/EDRDG,
CC-BY-SA-4.0) or is explicitly reference-only with copying forbidden —
and no copying was detected. However, **originality of the draft's
prose cannot be proven from repository evidence alone**, so the
rights question is **not closed**. Per owner direction: the affected
material is **excluded from the preview** (it already is: the pack is
not bundled, and the install gate blocks it), preserved privately for
reference, and does not block unrelated work. Closing it fully needs a
statement from whoever authored the draft (likely the owner or a
predecessor tool) or replacement of the prose.

## Preview posture

- Preview packs are the EDRDG-derived `ja-demo` (CC-BY-SA-4.0 with
  attribution) and the fully original `eo-demo` (CC-BY-4.0); neither
  depends on the unresolved ja-JP prose.
- Stable-release gates for `languages/ja-JP` are unchanged:
  `--release-readiness` still fails on it, correctly.

## Replacement record (2026-10-03, owner-authorized)

The owner could not certify authorship of the draft prose, so per owner
direction the unresolved-provenance prose was REPLACED with newly
authored ai-assisted text, still labeled draft/unreviewed (no qualified
human review is claimed):

- `lexicon/vocabulary.jsonl`, `lexicon/expressions.jsonl`: glosses and
  notes rewritten (headwords/readings unchanged — facts, not prose).
- `grammar/concepts.yaml`: title + description rewritten.
- `pragmatics/registers.yaml`, `pragmatics/situations.yaml`: register
  descriptions and situation title rewritten.
- `curriculum/goals.yaml`: goal description rewritten.
- `curriculum/units/000-onramp-greeting.yaml`: unit title rewritten.
- `activities/scenarios/first-meeting.yaml`: objective rewritten.
- `phonology/inventory.yaml`, `phonology/prosody.yaml`: notes rewritten.

Not touched: ids, structure, declarative policy flags, feature lists,
`manifest.yaml`, `SOURCES.yaml`, `LICENSES.yaml`, and all properly
attributed third-party records. The baseline `SHA256SUMS.txt` is left
intact as the historical manifest; the files above intentionally diverge
from it under this owner-authorized replacement (verified again by
`validate_handoff.py`, which passes).

Rights status after replacement: content prose is now authored within
this project by ai-assisted generation, labeled draft/unreviewed; the
remaining gate for this pack is qualified human review (REVIEW-001) and
the content license record in `LICENSES.yaml`, not unknown authorship.

## Migration record (2026-10-03, K-06)

The pack was migrated in place from schema 0.1 to 0.2 (version 0.1.0):
0.1 packs cannot author assessments, and the scenario runtime (SCENARIO-001)
now exists, so the deferred dialogue graph and the previously declared
unresolved assessment `ja.assess.onramp.greeting-transfer` were authored.

- Rewritten to 0.2 layout: `manifest.yaml`, `language/{identity,normalization}.yaml`,
  new `language/{orthography,phonology,pragmatics}.yaml`,
  `lexicon/entries.jsonl`, `grammar/concepts.jsonl`, `curriculum/goals.yaml`,
  `curriculum/units/000-onramp-greeting.yaml`,
  `activities/scenarios/first-meeting.yaml` (graph populated),
  new `assessments/definitions.jsonl`, `sources.jsonl`, `licenses.jsonl`.
- Deleted 0.1-only files with no 0.2 home: `SOURCES.yaml`, `LICENSES.yaml`,
  `orthography/`, `phonology/`, `pragmatics/`, `speech/`. Their policy
  narratives live in `docs/assessment/`; phonology/speech profiles stay
  intentionally empty (research-required stance preserved).
- All new prose (scenario prompts, ladder descriptions, transfer variants,
  assessment rubric criteria, register/situation descriptions) is
  ai-assisted, labeled `draft`/`review-needed`, with `generation`
  provenance where the schema carries it and YAML comments otherwise.
  Qualified human review (REVIEW-001) remains outstanding; the rights
  status from the replacement record above is unchanged.
- Install remains blocked solely by LIC-001 (`licenses.jsonl` pending
  entries + manifest `redistribution_allowed: false`); scaffold validation
  is 0 errors / 0 warnings.

## Licensing resolution and default-pack promotion (2026-10-04, K-32)

- Owner decision 2026-10-04 (LIC-001, pack content): all pack content is
  licensed **CC BY 4.0** (`lic-original-draft` and `lic-model-output`
  resolved; `ai-drafted-kana` source record updated; manifest
  `redistribution_allowed: true`). Install-mode validation and the full
  `langpack test` gate now pass (0 errors).
- The pack became the bundled default in the desktop app, replacing the
  `ja-demo` fixture pack (which stays as an engine test fixture).
- Qualified human review (REVIEW-001 / O-02) remains outstanding; the CC
  BY 4.0 license does not upgrade any `draft`/`review-needed` content
  status, and the espeak-ng GPL question stays open under LIC-001.
