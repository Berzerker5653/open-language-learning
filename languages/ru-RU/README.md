# Russian Reference Pack — Draft

This pack is **draft, AI-generated, unreviewed content**. Its manifest
`maturity` is `experimental`, every content item carries `status: "draft"`
with `generation` provenance naming the AI drafting, and no qualified human
review has occurred (see `review/REVIEW_POLICY.yaml`, blocker
BLK-REVIEW-CAPACITY). Nothing in this pack may be read as a human-verified or
band-complete claim (`docs/18`); learner-facing surfaces state the posture
once at pack level (ADR-0014) rather than badging each card.

As of 0.4.2 (2026-10-17) the pack ships 818 curriculum units (on-ramp 20,
A1 90, A2 102, B1 203, B2 403), 60 goals, 4,015 lexicon entries, 825
sentences, 169 grammar concepts, 3 stories, 3 scenario graphs, 7
environments and 4,856 baked listening clips indexed in
`media/manifest.jsonl` (model output, review-pending, never a licensed
human recording — ADR-0016/0023). The manifest `display_name` dropped the
`(Draft)` marker at 0.4.2; the draft posture moved into this description
because the 0.2 manifest schema (`additionalProperties: false`) has no
description/summary field to carry it.

Content is `CC0-1.0` (`licenses.jsonl` `lic-ru-original`,
`manifest.yaml` `content_license`). `sources.jsonl` records provenance
honestly: original AI-drafted content authored in this repository
(`ru-original`, and the reconstructed batch record
`ru-batch-70ec683-20f994d` for the 847 lines that landed between the 0.4.0
and 0.4.1 commits, per ADR-0035), plus one `reference-only` verification
pointer to the Zaliznyak morphological dictionary checkout used for stress
spot-checks — the dictionary dataset is not bundled or mirrored, and no
dictionary text is reproduced in pack content.

Word stress is marked with the combining acute (U+0301) and `ё` is always
written dotted; both are mandatory in learner-facing readings
(`language/identity.yaml`). Stress corrections are content changes: they
require a version bump and a regenerated media asset (see
`state/evidence/RU-042/` for the `то́тчас` correction).

Promotion out of draft runs through `docs/16_CONTENT_AUTHORING_AND_REVIEW.md`
and GitHub review PRs (`review/REVIEWER_KIT.md`): a status flip without a
qualifying `reviews.jsonl` record fails the validator. Qualified human
review cannot be self-certified by AI. Do not promote this pack beyond
`experimental` until review requirements are met.
