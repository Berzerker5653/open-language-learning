# ADR 0026: a profile may exist without an active language pack; the wizard offers every pack the device already has

Status: Accepted (2026-10-17) — the owner directed the behavior in-chat
2026-10-12 ("we can also just add in a skip button for choosing a language
pack", "fix now + re-test") and signed the ADR on 2026-10-17. Shipped:
`available_packs_at` (`apps/desktop/src-tauri/src/lib.rs:287`, consumed by the
wizard at `:318`) offers every pack the device has, pinned by
`an_installed_pack_that_is_not_bundled_appears_in_the_wizard_list` and
`an_installed_pack_that_is_also_bundled_is_listed_exactly_once` in the same file.

Date: 2026-10-12

## Context

The desktop wizard treated "installed active pack" as a precondition for
creating a profile:

- `available_packs()` returned **only** the compiled-in reference packs
  (`bundled_packs()`), so a pack imported through Settings → Language packs
  (`import_pack`) or installed from the catalog was **invisible** on the wizard's
  "Choose a language pack" step.
- The wizard's bootstrap fetched `available_packs` but never
  `installed_packs`, so `installedPacks` was empty and `canContinue`
  (`onboarding.tsx`) could not be satisfied without an Install click **in that
  session**, even for a pack already on disk.
- `complete_onboarding(profile_id, pack_id: String, …)` required a named,
  installed pack.

The owner's hands-on pass hit this directly: a device that had already
downloaded a pack was still forced to install one to make a profile. The same
pass then exposed a worse consequence of allowing the state half-way: the resume
path (`resumeProfile`) calls `first_run_steps`, which returned
`Err("no active language pack")`, so a profile with no active pack could not get
past the welcome-back screen at all.

`docs/01_PRODUCT_AND_UX.md` §"Failure-safe onboarding" already requires that
deferrals never gate progress, and `packs::active_pack` already models "none"
as `Ok(vec![])` — a stored state existing tests assert resolves to nothing. The
wizard, not the data model, was the blocker.

## Decision

1. **The wizard's candidate list is the union of compiled-in packs and packs
   already on the device** — `available_packs_at(repo_root, data)` in
   `apps/desktop/src-tauri/src/lib.rs`: bundled candidates first, then any
   `packs::installed_packs(data)` record whose `pack_id` is not already listed,
   with `maturity` = the installation's `trust_state`. The bundled entry wins on
   a duplicate id because it carries the version the release was built against.
   A store record whose archive is no longer readable
   (`lts_langpack::archive::current_version` → `None`) is **not** offered, so no
   row can advertise "Installed" and then fail at profile creation.
2. **A profile may complete onboarding with no active pack.**
   `complete_onboarding(profile_id, pack_id: Option<String>, mic_enabled)`;
   `None` writes only the microphone decision. A pack that *is* named must still
   be installed — an active pack the engine cannot read would promise content
   that is not on the device.
3. **"No active pack" is a first-class read state on the entry path.** Every
   command the app runs to open a profile resolves to an empty view rather than
   an error: `home_state` (plan/goal), `goal_map`, `world_state`,
   `first_run_steps`, `practice_plan`. Content-requiring commands
   (`dictation_target`, `shadowing_items`, `writing_task`, `practice_build`,
   `kanji_list`, …) keep refusing with the engine's fixed token
   `no active language pack`, because an empty list there would imply the pack
   has nothing rather than that no pack is chosen.
4. **Opening a profile never depends on a content read.** `resumeProfile`
   (`apps/desktop/src/App.tsx`) switches to the app state as soon as
   `resume_profile` succeeds; the fill-in reads after it are independent and a
   failure leaves the learner inside the app. `finishOnboarding` splits the same
   way — only a failed `complete_onboarding` (nothing recorded, so the same
   button is the retry) keeps the learner in the wizard.
5. **The pack-absence token is translated once at the IPC boundary.**
   `detectInvoke()` rejects with `explainPackAbsence(e)`, mapping the token to
   `NO_ACTIVE_PACK` ("No pack is active for this profile. Choose one under
   Settings → Language packs."). Panels that already build payloads through the
   D7 guards (`packRequest` / `packAttemptRequest`, 8 call sites) never send the
   request at all; the remaining routes now render the actionable sentence
   instead of the bare token.
6. **Surfaces name the gap and its fix.** Home renders a status notice plus a
   "Choose a language" control routed to Settings → Language packs, and withholds
   the "what to practice now" heading, when the profile has no pack
   (`HomeProps.noPack`). The wizard's speech step says plainly that speaking
   stays unavailable until a language is set, and its "Ready" step no longer
   claims a pack was installed when none was.
7. **The step that asks for a language can locate a pack file.**
   "Locate a language pack file" (`.lpk`) runs the same `import_pack` validation
   as Settings and selects the returned pack, so a pack downloaded outside the
   app is usable without leaving the step.

## Consequences

- A profile with no learning language is a supported, reachable state, so every
  new pack-scoped surface must decide explicitly between *empty is honest* and
  *refusal is honest*. The rule this ADR sets: entry and browsing reads are
  empty; reads that would fabricate an activity refuse.
- The IPC contract for `complete_onboarding` changed: `pack_id` is optional. Any
  future client (CLI, tests, automation) must send `null` rather than omitting a
  required string.
- `installed_packs()` becomes a user-visible trust signal in the wizard
  (`maturity` = `community` for imports), which is deliberate: an import is not
  a release-grade pack and must not look like one.
- Deferring the language costs the learner an empty Home, so the notice and the
  route to Settings are load-bearing, not decoration; a test pins that Home
  withholds the plan promise in this state (`home.test.tsx`).
- Large local imports still cross IPC as one base64 string (`import_pack`),
  bounded by `packs.rs` at `MAX_TOTAL_BYTES` (1 GiB) with a 32 MiB per-member cap
  inside the archive. This ADR does not change that transport.

## Alternatives

- **Keep requiring a pack at onboarding** (status quo ante): rejected by the
  owner — a device that already has the pack was made to install it again, and
  the imported pack was not even offered.
- **Auto-select an installed pack instead of asking**: fewer clicks, but it
  silently picks the learning language, which is the one decision the step
  exists to make.
- **Let the wizard only show bundled packs and re-run the import inside the
  wizard**: the current fix keeps one import path (`import_pack`) with one set of
  validation rules; a second path would fork that contract.
- **Fix the resume lockout by making every pack-scoped command return empty**:
  rejected — it would let a panel claim a language has no dictation targets when
  the real cause is that no language is chosen, which is the kind of false
  negative `AGENTS.md` ("separate confidence from correctness") forbids.

## Implementation notes

Owner defects found during the pass are pinned by tests:
`an_installed_pack_that_is_not_bundled_appears_in_the_wizard_list`,
`an_installed_pack_that_is_also_bundled_is_listed_exactly_once`,
`onboarding_can_finish_with_no_pack_and_still_saves_the_mic_choice`,
`finishing_onboarding_rejects_a_pack_that_is_not_installed` (Rust,
`apps/desktop/src-tauri/src/lib.rs`); `a_profile_with_no_language_can_still_be_entered`
(the resume lockout); plus `onboarding.test.tsx` (already-installed pack reaches
Continue with no install, the locate control, Skip always available) and
`home.test.tsx` (the no-pack Home state).
