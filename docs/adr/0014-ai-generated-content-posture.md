# ADR 0014: AI-generated content posture (one pack-level disclosure, not per-item draft badges)

Status: Accepted (owner decision; labeling posture only — trust states unchanged)
Date: 2026-10-07

## Context

Every item in both reference packs is AI-authored and carries
`status: draft` / `review_status: draft`. `REVIEW-001` established the honest
review ladder (`languages/ja-JP/review/REVIEW_POLICY.yaml`) with a declared
blocker, `BLK-REVIEW-CAPACITY`: no qualified human reviewer is engaged, and the
owner is a learner and cannot perform the gate (`REVIEW_POLICY.yaml:149-157`).
The community-review path that decision depends on delegates promotion to GitHub
contributor PRs, and on 2026-10-07 the owner chose to keep the repository
private, so that path has no contributors in practice.

K-42 answered that posture by stamping a `draft content` badge on every
practice, reading, kanji, story and goal-map surface. After ~40 cards of
practice the badge is noise: it says the same thing about every item, never
changes, and teaches the learner to ignore it.

Owner decision 2026-10-07: *"We just state everything is AI generated; we don't
have to label it draft."*

The guardrail that this ADR adds: the owner's decision retires **badge noise**,
not the **disclosure**. Removing all posture signalling would make unreviewed
content read as ordinary verified content, which `docs/09 §Content-review-gates`
and `docs/18 §Course-completeness` forbid.

## Decision

1. **One pack-level posture statement**, rendered wherever a pack is named (the
   Home active-pack header and the Languages pack list/detail):
   `AI-generated content · not human-reviewed`.
2. The statement is **derived from the pack's own review-posture tallies**, never
   a constant: if any item later reaches `validated`/`verified` through a merged
   review record, the wording changes to reflect the actual mix. It cannot go
   stale into a lie.
3. **Per-item `draft` / `draft content` badges are removed** from learner-facing
   surfaces. The `status` / `review_status` fields keep flowing through the
   engine and the props; this is a display change only — grading, evidence and
   scheduling never consulted them and still do not.
4. The Languages-page **"What this pack claims"** panel keeps its numbers
   unchanged, with posture words relabeled for the owner's framing:
   `draft` → `AI-generated, unreviewed`, `review-needed` → `awaiting review`.
5. The pack **display name** is derived from the installed pack manifest instead
   of the hardcoded `"Japanese — A1 on-ramp (draft, unreviewed)"` that was
   understating the pack (`apps/desktop/src-tauri/src/lib.rs:107`, also the first
   item of K-47). The manifest's own `display_name` string stays the pack owner's
   wording: editing it is a pack content change, which changes the archive hash
   and therefore needs a version bump and fresh distribution bindings. This ADR
   does not silently rewrite pack names.
6. **Unchanged, and not within this decision's reach:** validator rules, the
   `reviews.jsonl` record requirement, the trust ladder
   `draft → screened → reviewed → verified → reference`, and the promotion
   authority table (AI promotes only to `screened`). Content never renders as
   `reviewed`/`verified`/`reference` without a qualifying human record, and band
   completeness claims remain forbidden (`docs/18`).

Recorded in `languages/{ja-JP,ru-RU}/review/REVIEW_POLICY.yaml` under
`owner_scope_decisions` (`accept_draft_labeling_at_release`) as exercised 2026-10-07.

## Consequences

- Practice surfaces get quiet; the honest signal is stated once, where the learner
  chooses or inspects a pack.
- Promotion stays possible: when a human review record ever lands, the pack-level
  statement updates itself because it is derived, not hardcoded.
- Residual risk: a learner may read "no badge on this card" as "this card is
  verified". Mitigated by the statement appearing at every pack-naming surface
  and by the claims panel still publishing the posture distribution.
- The product goal the owner restated — a free tool where people build language
  packs with AI to teach themselves and others — is what the private-repo choice
  now contradicts: with no public repository there is no contributor traffic, so
  `BLK-REVIEW-CAPACITY` stays open indefinitely and no content can ever leave
  `screened`. That tension is recorded here rather than papered over.

## Alternatives considered

- **Keep the per-item badges (K-42 status quo).** Most defensible, and rejected
  by the owner as noise; the same information survives at pack granularity.
- **Drop posture signalling entirely.** Cheapest UI, and disallowed: it would
  assert verification the project cannot evidence (docs/09, docs/16).
- **Label content "AI-reviewed" and treat multi-model screening as review.**
  Rejected by the standing honesty rule (`REVIEW_POLICY.yaml` header): AI
  screening never counts toward a human gate, and no trusted record may be
  fabricated.
