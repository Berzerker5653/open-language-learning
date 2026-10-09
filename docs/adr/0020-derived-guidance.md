# ADR-0020: Derived guidance instead of an authored "start here"

## Status

**Accepted 2026-10-08 by the owner** (recorded on the owner's word during the
K-66 start; the owner is the human gate here, never self-certified by an agent —
`AGENTS.md`). It changes learner-visible scheduling semantics (docs/03) and adds
an optional pack-schema declaration (docs/04); the owner's acceptance replaces
the qualified-human feature-eligibility blocker per ADR-0017 §2. Implementation
cards: `K-66` (guided first run, daily surface), `K-67` (script instruction as
teachable pack data — its schema half is ADR-0021, accepted the same day).

## Context

The owner's O-06 pass (`state/evidence/O-06-2026-10-08/owner-report.md` #11) hit
the wall a first-time learner hits: after onboarding, the only visible door was
"Strengthen a weak spot", with no answer to "where do I begin?" or "what am I
doing today?". Hiragana is *displayed* throughout the readers, but the pack's own
orthography unit `ja.orth.hiragana` (`languages/ja-JP/manifest.yaml:13`) is never
reachable as something to be taught.

What exists today is not nothing: `build_plan_view` (`apps/desktop/src-tauri/src/lib.rs:1504`)
derives a minutes-budgeted plan from scheduler state and decorates it with the
pack's own display strings, and `home_state` renders it. The defect is shape, not
absence — the plan is **due-driven**. A profile that has never met anything has
nothing due, so the derived plan is empty and the UI falls back to a remediation
affordance. A brand-new learner is therefore shown a maintenance tool.

Hard constraints:

- The engine stays content-agnostic (`docs/00_MASTER_SPEC.md` non-negotiable). No
  engine rule may know that Japanese has a kana chart, that scripts are learned
  first, or in what order.
- The app may not invent content (kanban `K-57`/gap-audit D6 already made that a
  rule for Home's "Places you can go").
- No engagement metric that can be maximized without learning (`AGENTS.md` product
  quality bar). Streaks, stamps and daily quotas are out.
- Low-confidence derivation must be allowed to abstain.

## Decision

1. **The plan becomes "introduce, then maintain".** `build_plan` keeps its
   due-driven half exactly as is and gains a deterministic second half: when a
   profile has little or nothing due, the plan is topped up with *new* content
   walked along the goal map — units whose prerequisites are already met, ordered
   by band sort key (`band_sort_key`, K-47), then unit order, then content order.
   Every `PlanItemView` carries its kind (`review` | `introduction`) so the UI can
   say which is which. Deterministic and testable: same pack, same profile state,
   same plan; no randomness, no app-authored ids — every id must exist in the
   active pack, enforced by a test that reuses the K-57 unknown-id guard.
2. **Script instruction is pack data.** A pack may declare an *instruction*
   capability on a unit (`capabilities: ["script-introduction"]`, additive optional
   field in the 0.2 unit schema) whose ordered items are what a learner is taught
   first; the orthography runner gains an instruction stage that presents the
   declared item (symbol, its reading, its example) before asking for evidence.
   The engine's only rule is the neutral one: a unit may declare capabilities, and
   a declared capability must resolve to real items in that pack
   (`unit_capability_items_missing` validator error). The ja-JP pack then ships the
   hiragana unit as the reference shape, and `ru-RU` could ship its Cyrillic
   introduction with no engine change.
3. **A "Today" surface, not a streak.** Home shows the plan from (1) plus the next
   goal the goal map says is reachable, and nothing else. No consecutive-day
   counter, no "don't lose your streak" framing, no XP. Progress is only what
   `lts-learner-model` already records as evidence (ADR-0002); the surface may
   display derived state but may not create any.
4. **First-run guidance is derived, never scripted.** After onboarding the app
   offers the first three steps of the same derivation, each linking to a real
   route. If the active pack declares no goal map, the app says so plainly
   ("this pack declares no learning path yet") and points at Languages — the
   honest-abstain pattern used everywhere else.
5. **Packs that declare nothing still work.** Absence is a supported state: the
   introduction half falls back to the pack's own unit order, and if there is no
   unit structure at all, the plan stays due-driven and Home says there is nothing
   scheduled yet rather than inventing filler.

## Consequences

- docs/03 gains the introduce-then-maintain rule and states explicitly that
  introduction items are **not** evidence and never advance mastery until a runner
  records one.
- docs/04 + `schemas/v0.2/` gain the optional unit `capabilities` field, and the
  validator gains one error code; packs are re-validated (all seven pack gates must
  stay at 0 errors / 0 warnings).
- `PlanView`/`PlanItemView` gain a `kind` discriminator: frontend types, the
  walkthrough, and the tests that pin the old shape are rewritten to pin the
  invariant (introduction items come only from the pack, never from the app).
- Smoke grows an assertion that a **fresh** profile gets a non-empty plan — the
  regression the owner actually hit.
- Adds real content work: the ja-JP hiragana unit needs ordered items, an
  instruction copy line per item, and provenance, which means human review is in
  the path (ADR-0014 posture statement applies; nothing may be labeled reviewed).
- No new persisted learner state, so no migration for learner data.

## Alternatives considered

- **Hand-authored checklist in the frontend** ("Step 1: learn hiragana"). Rejected:
  it is Japanese hardcoded in the engine, it would lie to every other pack, and it
  re-opens D6 (app-invented content).
- **Daily streak / goal-quota framing** to make "coming back" the answer. Rejected:
  it is maximizable without learning, which `AGENTS.md` says means redesign.
- **Making the due-driven plan smarter** (e.g. lower thresholds so a fresh profile
  has something "due"). Rejected: it fakes a maintenance signal the learner has
  not earned and muddies the review/introduction distinction the UI must show.
- **Teaching kana as a hardcoded module.** Rejected for the same reason as the
  checklist; also loses the pack's own reading/gloss/provenance chain.
