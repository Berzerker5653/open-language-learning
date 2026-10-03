# GAME-001 — World/environment unlock model (capability-gated)

## What was built

- New crate `crates/world` (`lts-world`), dependencies: `lts-domain` only.
  - `WorldConfig { environments, version }`: declarative environments, each
    with `requires: Vec<CapabilityRequirement { content_id, modality, min_state }>`.
  - `CapabilitySnapshot`: map of `(content_id, modality) -> MasteryState`.
  - `evaluate(&config, &snapshot) -> Vec<EnvironmentStatus { id, display_name,
    unlocked, missing }>`. Pure function; no I/O, no graphics, no UI.
  - `state_rank`: Unseen < Introduced < Supported < Independent < Flexible < Retained.
- Desktop (`apps/desktop/src-tauri/src/lib.rs`):
  - `world_state` command / `world_state_at(data, profile_id)`: derives the
    capability snapshot from persisted evidence via the existing
    `derive_pairs` pipeline, evaluates the demo world config, returns
    serialized `WorldEnvironment` rows.
  - Demo config: `greeting-desk` requires `ja.lex.demo.konnichiwa`
    recall-meaning >= independent; `cafe` requires the same content at
    comprehension-reading >= independent.
- UI (`home.tsx` + `App.tsx`): "Places you can go" section with
  `data-unlocked` attributes and an explicit disclaimer that places open from
  capabilities, not activity counts.

## Acceptance evidence

1. **Unlocks follow capabilities, not activity volume.**
   `tests::world_unlocks_follow_capabilities_not_activity_volume`
   (apps/desktop/src-tauri/src/lib.rs): two Independent recalls (distinct
   prompt families) open `greeting-desk` while `cafe` stays locked; then 50
   additional practice events on other content leave the unlock set
   byte-identical (`assert_eq!` on the full environment list). The
   `world_state` API takes only `profile_id`; `evaluate` takes only a
   capability snapshot — no counts, dates, or streak parameters exist in the
   interface at all, so streak-shaped engagement cannot unlock content by
   construction (ADR-0002 / master-spec no-streaks non-negotiable).
2. **Engine independent of presentation.** `lts-world` Cargo.toml depends
   only on `lts-domain`; engine tests (`crates/world/tests/world.rs`, 3
   tests) run headless with hand-built snapshots, no graphics/UI crates in
   the dependency graph.
3. UI test `home.test.tsx` asserts unlock-state rendering and the
   "not from activity counts" disclaimer; the existing no-streaks home test
   still passes.

## Files

- crates/world/{Cargo.toml,src/lib.rs,tests/world.rs}
- Cargo.toml (workspace member + `lts-world` dep)
- apps/desktop/src-tauri/src/lib.rs (command + test)
- apps/desktop/src/{home.tsx,home.test.tsx,App.tsx}

## Boundaries / follow-ups

- Demo world config is hardcoded in the desktop app; a pack-declared world
  schema (world files inside language packs) is a later task — the engine
  already takes declarative `WorldConfig`, so the schema work is additive.
- `missing` lists requirement descriptions (modality + content id), not
  pedagogical advice; advice generation is out of scope.
