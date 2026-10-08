# ADR 0017: Unfunded posture — exclusively AI-created content, guided-only pronunciation feedback for 1.0

## Status

Accepted (owner decision 2026-10-08).

## Context

The owner stated the constraint plainly: no money goes into this project, so every
role that could be bought must be done by AI or not done; all first-party content is
to be marked as exclusively AI-created; and the project stays non-public until the
owner has run a hands-on test pass and considers it feature-complete and usable.

That closes data and review paths the existing gates assume:

- `SPEECH-007` (calibrate automated speech feedback) needs consented learner
  recordings, qualified labelers and an adjudicator — `benchmarks/speech/datasets/SOURCING.md`.
  Unfunded, those people do not exist. The synthetic learner-proxy study
  (`benchmarks/speech/results/20261008T030000Z/`, see ADR-0016 context) showed why
  synthesized clips cannot substitute: scoring coverage tracked the ASR model rather
  than the planted error (0.00–0.53 against the frozen 0.60 floor, zero planted errors
  caught), and the verdict on eight identical clips inverted 8/8 `close` → 8/8
  `shorter` when only the reference-ratio source changed.
- Qualified human content review (`JA-A1-003`, `REVIEW-001`) cannot be performed by
  the owner (self-declared learner, O-02) and cannot be self-certified by AI
  (`AGENTS.md`, `docs/15`). Delegated community review (O-02) only produces records
  when contributors show up, which cannot be scheduled on a fixed date.
- Paid signing, notarization, store accounts and device labs are out; ADR-0015
  already commits the project to honest "untested" labels instead.

`docs/15` task rules and `SPEECH-007`'s own acceptance text anticipate this fork:
"changing this target requires an explicit owner scope decision". This ADR is that
decision.

## Decision

1. **Speech feedback in desktop 1.0 is guided-only.** No automated pronunciation
   score, no automatic pronunciation mastery, no accuracy claim about the learner —
   in the UI, in pack data, or in public text (`docs/18`). The app already behaves
   this way: the pack's speech profile declares `assess-guided` with calibration
   null, and ADR-0013's reference-contrast abstention and pack-declared numeric
   production targets stay in force. `SPEECH-007` is removed from the
   `required_for_desktop_1_0` chain; its protocol, consent instrument, labeler rubric
   and runbook stay in the repo so the work can be resumed if the panel is ever
   funded. Nothing about generated audio (ADR-0016) makes a learner-facing accuracy
   claim legal.
2. **AI-created is the permanent posture, not a transitional one.** Every
   first-party pack content record keeps its honest generation note and
   `status: review-needed` unless a human review record exists. `verified`/
   `validated` promotions remain reachable through O-02 community review pull
   requests, but no release gate depends on them for 1.0, and no surface may imply
   human review that did not happen. Per-item draft badges stay retired under
   ADR-0014; the pack-level statement ("AI-generated content · not human-reviewed")
   is the accurate one.
3. **The human gates that remain are the owner's, with AI-prepared artifacts.**
   Accessibility assistive-technology pass (`docs/assessment/ACCESSIBILITY_AUDIT.md`,
   O-03), security/privacy review, and release sign-off (`REL-001`) stay open and are
   performed by the owner personally. AI prepares worksheets, evidence bundles,
   checklists and fixes; it never marks those gates passed.
4. **Licensing stays as granted, with an authorship caveat.** Pack content is offered
   under CC BY 4.0 and code under Apache-2.0 (ADR-0010). Because AI-generated output
   may not be copyrightable in some jurisdictions, the project makes no exclusivity
   or enforcement claim over AI-only material: the licenses are permission grants,
   not ownership assertions. Third-party obligations are unaffected and still bind —
   dictionary data (JMdict/EDRDG CC BY-SA 4.0), fonts, whisper model terms, and the
   GPL-3.0 `espeak-ng-data` payload scoped per ADR-0009.
5. **Hardware/platform claims stay measured-only.** Benchmarks run on machines the
   project already owns (the lab fleet). Tiers that are not measured stay recorded as
   unmeasured; `docs/performance/BUDGETS.yaml` may only be frozen by an ADR backed by
   measurements, and never by a target restated as a result.
6. **Feature completeness is judged by the owner's hands-on pass.** Before the public
   flip (O-05), the owner runs the app end to end. The engineering obligation is that
   every shipped capability is reachable, honest about its limits, and has no dead
   end; the KANBAN `next` column is prioritized by what that pass would hit.

## Consequences

- Unblocked on the task graph: `SPEECH-007` leaves the required chain, so
  `JA-A1-003`'s dependency on it is dropped and the `ACC-001 → PERF-002 → PLAT-001 →
  SEC-001 → REL-001` path is no longer gated on calibration data. Those tasks become
  real engineering work plus the owner's own passes rather than an unobtainable
  dataset.
- Honest ceiling for 1.0: Japanese pronunciation help is coaching and reference, not
  measurement. Any future numeric feedback needs the panel; the protocol is already
  frozen, so the blocker is purely people.
- Content trust for 1.0: AI-generated, unlabeled-by-humans, validator-clean, and
  labeled as such. The band-completeness and provenance rules still hold; only the
  human-review requirement is removed as a release blocker.
- Release-blocking risk shifts to the owner's time: the AT pass, the security review
  and the hands-on pass are now the critical path.
- Removing "qualified review required" as a gate must not be read as permission to
  drop review *quality* work: schema validation, linting, provenance records,
  adversarial content checks and the honest posture labels are what keep
  AI-only content trustworthy, so they get stricter, not weaker.

## Alternatives considered

- **Fund a small panel and pay reviewers.** Rejected by the owner: no budget.
- **Ship automatic pronunciation feedback using synthesized references.** Rejected:
  measured to be unstable and self-referential (ADR-0016 context, study above);
  it would produce confident wrong corrections and violate `docs/18`.
- **Remove the speech modality entirely.** Rejected: comprehension audio,
  dictation, and guided coaching already work offline and are useful; only the
  accuracy claim is unfundable.
- **Keep `SPEECH-007` required and leave 1.0 blocked forever.** Rejected: that makes
  the release depend on money the project will not receive, and it hides the honest
  scope instead of stating it.
