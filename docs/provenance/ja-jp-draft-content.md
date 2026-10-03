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
