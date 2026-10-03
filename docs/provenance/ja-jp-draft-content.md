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
3. **Content items are short functional seed examples** (e.g.
   こんにちは / "hello / good day (context-dependent greeting)"). Words and
   short functional glosses have thin copyrightability; even under the
   most conservative reading (glosses informed by dictionary phrasing),
   the only dictionary project referenced — JMdict/EDRDG — is
   CC-BY-SA-4.0 with redistribution *allowed* under attribution +
   share-alike (`SOURCES.yaml`), so no referenced source forbids the
   distribution of these items as they stand.
4. **No third-party data is bundled.** Common Voice: not bundled
   (reference-only record). pyopenjtalk: candidate tooling only. No audio
   files exist in this pack.

## Conclusion

The draft pack content is **project-original material informed by
framework references**; nothing in the audit indicates copied third-party
text. It is therefore licensable by the owner and does not need to be
replaced on rights grounds.

## What remains genuinely open (not a rights problem)

- **Content license selection.** `LICENSES.yaml` still records
  `pending-owner-license-selection`. The owner's MIT decision covers
  application code; for text/media content we recommend **CC-BY-4.0**
  (the conventional license for prose/media; MIT works too but is
  code-shaped). This is a one-line owner decision.
- **Quality/review status, unchanged.** The pack stays `experimental` /
  `review-needed`; seed examples are not a curriculum, and qualified
  human review (REVIEW-001) is still required before any promotion. This
  document is a rights analysis, not a review.
- **Release gate unchanged.** `--release-readiness` still fails for this
  pack until license selection + review gates pass; that failure is
  correct behavior, not a regression.
