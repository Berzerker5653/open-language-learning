# ADR 0018: Environments are pack data, not app data

Status: Proposed (awaiting owner acceptance)
Date: 2026-10-08

## Context

GAME-001 shipped a capability-driven world layer: `crates/world` evaluates
`Environment { id, display_name, requires[] }` against derived mastery and the
Home page renders the result under "Places you can go". The evaluation logic is
language-neutral and correct, but the **configuration was hardcoded in the app**:
`apps/desktop/src-tauri/src/lib.rs::demo_world_config()` returned two invented
environments (`Café corner — read the menu`, `Greeting desk — say it yourself`)
gated on the Japanese content id `ja.lex.greeting.konnichiwa`.

That breaks two standing rules. `docs/00_MASTER_SPEC.md` keeps language-specific
presentation data out of the engine, and `AGENTS.md` treats content as code —
schema-validated, linted, audited. A hardcoded world also silently lies to a
learner who installs a different pack: the places shown are not the places that
pack can teach, and the unlock target may not exist in it at all. The
`greeting-desk` entry was additionally reachable only by a modality no runner
would credit for the `cafe` entry, so one of the two demo environments could not
be opened through any shipped activity at the time.

## Decision

Environments move into the pack as an optional collection.

- **File**: `world/environments.jsonl`, declared in `manifest.yaml` as
  `world: environments.jsonl`. The manifest key is an enum of the one supported
  file name, so a pack cannot name an arbitrary path.
- **Row schema** (`schemas/v0.2/environment.schema.json`, `additionalProperties:
  false`): `schema_version` (const 1), `id` (`^[a-z0-9][a-z0-9._-]*$`, pack-unique),
  `display_name` (non-empty; describes what the place affords and asserts no
  learning outcome or proficiency level), `requires` (1..n of
  `{content_id, modality, min_state}`). `modality` is restricted to the six
  dimensions a shipped activity can record (`recall-meaning`,
  `comprehension-listening`, `orthography-recognition`,
  `phonological-discrimination`, `production-writing`,
  `orthographic-encoding`); `min_state` is the `MasteryState` vocabulary. Neither
  list is invented here, and the modality list is narrower than
  `parse_dimension` accepts on purpose: an unlock gated on a dimension no runner
  credits (today `comprehension-reading`, `production-speaking`,
  `phonological-reproduction`) can never open. Widen the enum when a runner that
  records one ships.
- **Validation**: absent collection is legal and clean. When present, four
  semantic gates apply, all **errors**, never warnings, because none of them can
  be a legitimate draft state:
  - `duplicate_environment_id` — two rows with one id cannot both unlock;
  - `environment_unknown_content` — a requirement naming a content id the pack
    does not declare can never be satisfied, so the place would be permanently
    locked with a hint pointing at nothing;
  - `environment_listening_without_audio` — a `comprehension-listening` unlock on
    content this pack declares no audio for. Skipped while the pack declares no
    audio at all, since an unbuilt media set is a legal draft state under
    ADR-0016;
  - `world_collection_missing` — the manifest named the collection but the pack
    ships no parsable rows.
- **App**: `world_state_at` resolves the profile's active pack, loads that pack's
  rows, and evaluates them. No active pack, no collection, or an unloadable pack
  yields an **empty** list. `demo_world_config` is deleted; the engine contributes
  no environment text or content id.
- **Reference pack**: `languages/ja-JP/world/environments.jsonl` ships five
  environments (`cafe-ask-price`, `cafe-order-drink`, `station-navigation`,
  `buy-a-ticket`, `self-introduction`), each requiring three real pack content ids
  across two or three earnable modalities.

## Consequences

- A pack author can now design progression, and a pack with no world data simply
  shows no places — the Home section is already hidden for an empty list, which is
  a normal state rather than an error or a fallback.
- Unlock requirements are checkable at pack-build time, which is where a dangling
  content id belongs: the app can no longer present an unopenable place.
- Requirement thresholds became pack-visible, so they are reviewable: the
  reference pack deliberately places its reachable environments at
  `introduced`/`supported` thresholds that current runners can actually credit.
  Reachability itself is enforced mechanically — the modality enum plus
  `environment_listening_without_audio` — rather than left to review. That mattered:
  the first draft of the reference pack gated its café on `comprehension-reading`,
  a dimension the app reads formatively but never records, producing exactly the
  kind of entry no runner can unlock that the audit criticised. The validator
  accepted it; the enum now rejects it, and the place was rebuilt around listening
  and recall (`cafe-ask-price`) with audio the manifest already declares.
- The app-side surface is unchanged (`world_state` payload shape, Home rendering),
  so no frontend work was needed and the smoke route count is unaffected.
- Removing the hardcoded config deletes the last language-specific presentation
  data in `lib.rs` outside of pack-loading paths.

## Alternatives

- **Keep the demo config and label it "sample".** Rejected: it leaves
  language data in the engine, keeps a lie for non-reference packs, and gives no
  validation of unlock rules.
- **Remove the world feature from the app until real content exists.** Rejected:
  the mechanism is tested and useful, and the owner's hands-on pass benefits from
  seeing capability-driven progression actually respond to evidence; the
  alternative discards shipped behaviour rather than finishing it.
- **Author environments in app config keyed by pack id** (a table per pack inside
  the app). Rejected: it puts content in code with no schema, no audit, and a new
  app release per progression change — the exact pattern `docs/16` and ADR-0001
  exist to prevent.

## Status note

Implementation and tests landed with this ADR as **Proposed**. It needs the
owner's acceptance (AGENTS.md: significant architectural decisions carry an ADR,
and human gates are not self-certifiable). If the owner rejects pack-owned
environments, the honest fallback is removing the Home section and the
`world_state` command rather than restoring hardcoded content.
