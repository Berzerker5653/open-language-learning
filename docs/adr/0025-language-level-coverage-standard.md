# ADR 0025: CEFR-band coverage is the pack level model; tier-scoped packs are first-class

Status: Proposed — owner approval required (an agent cannot accept an ADR, per
`AGENTS.md` / `docs/15`). Recorded 2026-10-12.

Date: 2026-10-12

## Context

Both reference packs band their curriculum goals with a CEFR-style token
(`on-ramp`, `A1`, `A2`, `B1`, `B2`, `C1`, `C2` — `schemas/v0.2/goal.schema.json`).
The engine is data-driven (ADR-0002): `apps/desktop/src-tauri/src/lib.rs` orders
goals by `band_sort_key`, and `apps/desktop/src/home.tsx` (`BAND_HEADERS`) glosses
every band with paraphrased CEFR Companion Volume wording and renders any
**unknown** token verbatim "so a pack cannot hide a goal behind a band we have not
met". Nothing in the app is hardcoded to a particular language's levels.

What is *not* standardized is the quality bar around those bands. Each reference
pack keeps a finite **coverage denominator** — the set of required can-do
objectives per band that a "band X" claim is measured against — in a hand-authored
doc: `docs/assessment/RELEASE_COVERAGE.yaml` (ja, `coverage_version 1.0.0`,
owner-agreed 2026-10-04) and `docs/assessment/RELEASE_COVERAGE_RU.yaml` (ru,
`0.1.0-draft`, `proposed-pending-owner-approval`). Confirmed by search: no crate,
script, or CI job parses these files — they are a review artifact whose gates
(`coverage_linkage`, `review_core`, `sampling_disclosed`, `speech_features`,
`sources_licenses`) are checked by hand with `langpack audit-curriculum` /
`audit-licenses`. That is deliberate: `docs/18_PUBLIC_CLAIMS_AND_SCOPE.md` forbids
labeling a band complete until mapped coverage, assessments, curriculum audit and
the review gate are satisfied, and forbids inferring completeness from unit or
activity counts. ADR-0014/0017 make all content AI-generated at an honest
`draft`/`review-needed` posture with no certification or framework-equivalence
claim.

Because the artifact is optional and unenforced, the two packs have drifted. The
ru map grounded itself on "CEFR + ТРКИ reference only", attached per-objective
**unit counts** as if they supported completeness (contrary to `docs/18`), and —
the substantive gap — every ru goal and assessment is `reading`/`writing` only
(60 goals, 53+53 assessments), while the ru pack ships `listening`/`speaking`
capability, 4,846 baked audio clips, activity scenarios, and 40 sentences. ja's
map and assessments span the productive/receptive dimensions (its assessments are
largely `kind: interaction`). Russian has a *published* framework for exactly
this: the state **ТРКИ / ТБУ** certification (Institute of Russian Language
named after A.S. Pushkin) maps Elementary→A1, Basic→A2, ТРКИ‑I→B1, ТРКИ‑II→B2,
ТРКИ‑III→C1 and is itself divided into components Чтение (reading),
Аудирование (listening), Лексика, Грамматика, Письмо (writing), Говорение
(speaking) — the modality model, and the Russian analogue of the JF Standard
that grounds the ja map.

The owner asked to (1) hold ru-RU to the same level-model quality as ja-JP, and
(2) decide whether band-tiering is the right model for **all** packs, including
whether an author can ship a smaller pack covering a single tier.

## Decision

### 1. Band coverage is the standard for every pack

A pack that presents levels bands every goal with a schema `band:` token. A
band-scoped pack MUST also ship a finite coverage denominator at
`docs/assessment/RELEASE_COVERAGE_<lang>.yaml` that:

- grounds the band set in a **named, real framework** (ja → Japan Foundation
  Standard "Can-do"; ru → ТРКИ/ТБУ), never invents levels, and states the
  alignment as "informed by / aligned with" — never equivalence or
  certification, and never reproducing framework test text;
- lists, per required objective, the **modalities** it spans, its
  **prerequisites**, an **assessment_plan** (checkpoint / transfer / retention)
  and an honest **content_status** (`implemented-draft` / `not-implemented` /
  `not-assessed`);
- carries the machine-verifiable gates and labels a band at most
  **"partial (review pending)"** until every gate passes.

Per-objective **unit counts are not a completeness basis** and MUST NOT be used
as one (they may appear only as clearly-labeled descriptive context). The
denominator stays a review artifact, not a CI gate — making it machine-enforced
would tempt "completeness by count," which `docs/18` prohibits. Narrowing a
frozen required set remains an owner scope decision with recorded rationale
(`docs/assessment/COVERAGE_RECONCILIATION_PROPOSAL.md`).

### 2. Tier-scoped (single-band) packs are first-class — no new field

A pack declares the bands it covers simply by **which bands its goals use** and
**which bands its coverage map lists**. Bands it does not cover are **absent**,
not marked incomplete. A one-tier pack (an A1-only starter, or a B2-only
conversation pack) is fully supported with **no new manifest or schema field**:
the goal `band` enum and the coverage map already express the scope, and
`home.tsx` renders any band subset generically. Adding a `covered_bands` field
was rejected as a second source of truth that can drift from the goals.

### 3. ru-RU parity this change

`docs/assessment/RELEASE_COVERAGE_RU.yaml` is rebuilt to ja-grade rigor: ТРКИ/ТБУ
as the primary framework (+ CEFR Companion Volume 2020 reference), the official
CEFR mapping, per-objective modalities / prerequisites / assessment_plan, gates
parity, and the unit-count-as-completeness basis removed. It stays
`proposed-pending-owner-approval`.

The modality gap is **documented, not silently fixed**: ТРКИ's Аудирование/
Говорение components and the pack's own audio + scenarios call for listening and
speaking coverage, but ru has no listening/speaking **assessments**. Fabricating
them inside a docs change would neither be certifiable (ADR-0017) nor pass
review, and risks the audit-green state. The map therefore marks receptive
(listening) content as audio-backed-but-`not-assessed` and speaking as
`not-assessed`, and the additions are a next **gated content batch** — the same
honest posture `docs/18` and the ja reconciliation apply to ja's own
not-yet-authored A2/B1/B2 objectives. ТРКИ/CEFR grounding is recorded inline in
the coverage map's `frameworks.trki_cefr_reference` block (publisher, URL,
accessed date, limits) — pack-level alignment metadata. It is deliberately NOT
added to `languages/ru-RU/sources.jsonl`: that is the content-source registry and
every entry there must be referenced by a content record (`audit-sources` flags
`unused_source`), and no pack item is derived from ТРКИ/CEFR text.

## Consequences

- Level handling is one mechanism (`band`) plus one required artifact per
  band-scoped pack. The ja/ru divergence becomes a reviewable difference, not an
  accident.
- Community pack authors can scope to a tier; the AI authoring prompt and
  authoring contract now say so and require the coverage denominator when goals
  are banded.
- ru's `"(Draft)"` display name and band-completeness claims stay gated: the
  ru coverage denominator needs owner approval, productive-skill assessments are
  a gated batch, and 0.3.0 republish stays owner gate O-05.
- No engine/schema change: nothing here touches `home.tsx`, `band_sort_key`, or
  the goal/assessment schemas, so the pack validator and UI behaviour are
  unaffected; ru audits remain 0/0.

## Alternatives

- **Add a `covered_bands`/`scope` field to the manifest.** Rejected: duplicates
  what goal bands + the coverage map already state; drifts; and the UI already
  renders any subset.
- **Machine-enforce the coverage denominator in CI.** Rejected: it pushes toward
  completeness-by-count that `docs/18` forbids, and the gates that matter
  (qualified human review, speech qualification) cannot be checked from a pack.
- **Close the ru modality gap now by authoring listening/speaking assessments.**
  Rejected for this change: ~100 review-pending assessments bundled into a
  docs/decision change is a different, larger content batch; recording the gap
  honestly and gating it matches how ja handles its own unauthored objectives.
- **Leave ru's coverage map as a CEFR-only draft.** Rejected: it is the specific
  quality divergence the owner asked to remove; ТРКИ gives Russian a defensible
  named framework parallel to ja's JF grounding.

## Status note

Proposed. Owner acceptance retires the "reference-only CEFR" framing and makes
ТРКИ/ТБУ the ru band denominator; owner *approval of the ru coverage map itself*
is a separate, still-open decision. The modality content batch and the 0.3.0
republish (O-05) remain open regardless.
