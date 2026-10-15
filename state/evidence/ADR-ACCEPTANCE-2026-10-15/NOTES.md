# ADR acceptance brief — 0026, 0028, 0029, 0030, 0031, 0032

Prepared 2026-10-15 for the owner. **No Status line was changed by an agent**: acceptance
is a human act (AGENTS.md, `docs/adr/README.md`). Everything below separates three things
the last list blurred — *accepting the decision*, *the implementation being complete*, and
*a publication or human condition the decision itself waits on*.

Each ADR's own text says acceptance is an owner decision; the quoted Status lines are at
`docs/adr/00NN-*.md:3`. `ADR 0027` is already `Accepted` and is not reopened here.

## 0026 — a profile may exist without an active language pack

- **Plain decision:** a learner profile is valid before any pack is installed; the wizard
  offers the compiled-in packs plus anything already on the device, and onboarding may
  finish with no language chosen.
- **Recommended option and tradeoff:** accept. The cost is permanent disabled-state
  complexity — every language-dependent route must stay unavailable until a language
  exists — and a device-derived list can show packs whose trust is weaker than the
  bundled ones, which is why the list carries the installation's `trust_state`.
- **Proposed status:** `Accepted`. **Prerequisite:** none; the behavior is directed
  (ADR-0026:3 records owner direction in chat on 2026-10-12) and is already in `main`.
- **Diff/evidence:** commit `4ac4814`; `available_packs_at`, `installed_packs` in
  `apps/desktop/src-tauri/src/lib.rs`; tests `a_profile_with_no_language_can_still_be_entered`,
  `an_installed_pack_that_is_not_bundled_appears_in_the_wizard_list`,
  `finishing_onboarding_rejects_a_pack_that_is_not_installed`,
  `onboarding_can_finish_with_no_pack_and_still_saves_the_mic_choice`.

## 0028 — licence-permissiveness detection in the pack audit

- **Plain decision:** the audit compares the licence a pack declares with the licences of
  its declared sources and reports when the declared one drops an obligation
  (`ShareAlike`, `NonCommercial`, `NoDerivatives`), at `Info` severity; licences outside
  the CC table are left unjudged rather than guessed.
- **Recommended option and tradeoff:** accept the mechanism **at `Info`** and keep the
  promotion to a blocking severity as the separate owner decision it already is
  (`O-01(a)`). At `Info` it cannot stop a bad pack shipping; promoting it is what would
  have blocked the Japanese 0.4.0 pack, and that promotion has consequences for every
  future pack whose sources are only partly known.
- **Proposed status:** `Accepted` for the mechanism at `Info`. **Prerequisite:** none for
  acceptance; the severity promotion and the O-01a licensing posture stay owner-owned —
  O-01a itself was decided on 2026-10-13 (`state/evidence/LIC-002/owner-decision-O-01a-2026-10-13.md`).
- **Diff/evidence:** commits `dec30ad` (audit) and `ec47a0a` (the manifest correction it
  exposed); `crates/langpack/src/audit.rs` (`license_less_permissive_than_source`,
  `unknown_license`), tests `by_over_a_by_sa_source_names_the_dropped_obligation` and
  `matching_and_unjudgeable_licences_produce_no_finding` in `crates/langpack/tests/audit.rs`.
- **Not established here:** `license_reference_only` (an idea in the ADR's alternatives) is
  not implemented — `NOT FOUND` in the tree.

## 0029 — direction model for right-to-left packs

- **Plain decision:** content containers take their direction from the pack manifest
  (`capabilities.rtl`); the app shell, navigation, settings and romanization stay LTR.
- **Recommended option and tradeoff:** accept. Mixed-script content then reads in two
  directions on one screen, which is honest; the rejected alternative (flip the whole
  document) would misrepresent the application's own chrome as translated content.
- **Proposed status:** `Accepted`. **Prerequisite:** none for the decision. The human
  check remains separate: no RTL pack is published (`examples/ar-ma` is experimental), so
  no assistive-technology pass has ever seen an RTL screen — that belongs to the ACC-001
  matrix, not to this ADR.
- **Diff/evidence:** commits `e25f986`, `2b508ce`, `ed914a4`;
  `apps/desktop/src/App.tsx:2797-2813` (`packDirection`), test
  `rtl_capability_reaches_the_renderer_through_pack_listing` in `lib.rs`; the ADR's own
  rejected reader-mode alternative is at `docs/adr/0029-rtl-direction-model.md:108`.

## 0030 — attempt identity and disqualifying support

- **Plain decision:** the engine never guesses which prompt or sitting an observation
  belongs to — identity is an input, prompt identity falls back to activity/content
  identity rather than the event id, and a policy field (`support.disqualifying_for`,
  policy 0.2.0) decides when receiving support disqualifies an attempt from mastery.
- **Recommended option and tradeoff:** accept. It deliberately throws evidence away when
  upstream omits a family id, so scoring stays conservative and a re-played scenario is a
  separate sitting instead of a stronger signal.
- **Proposed status:** `Accepted`. **Prerequisite:** none.
- **Diff/evidence:** `Policy::observations()` and `prompt_family_id` in
  `apps/desktop/src-tauri/src/lib.rs`; test `replaying_a_scenario_is_a_separate_sitting`
  in `crates/activity/tests/scenario.rs`; policy 0.2.0 fixtures in `crates/activity`.

## 0031 — goal prerequisites aggregate over declared concepts

- **Plain decision:** a goal's state in a dimension is the **minimum** over the concepts
  the pack declares for it (`required_concepts`); a missing evidence row counts as
  `unseen`, and the engine never invents goal-level evidence rows.
- **Recommended option and tradeoff:** accept. The alternative (average or majority)
  would let a goal claim capability its weakest declared part does not support; the cost
  is that one thin concept locks a goal, which can feel arbitrary to a learner — a
  product judgement to watch after release, not a reason to weaken the rule.
- **Proposed status:** `Accepted`. **Prerequisite:** none.
- **Diff/evidence:** `goal_derived_state`, `goal_rank_map`, `locked_new_content` in
  `apps/desktop/src-tauri/src/lib.rs`; the pack-data walk the ADR cites at
  `docs/adr/0031-…:77`; gates run in `scripts/ci.sh` (`audit-curriculum`).

## 0032 — track pack media that outruns the pinned published archive

- **Plain decision:** 18 journey audio assets stay in git, enumerated by asset id in
  `.gitignore`, only because the pinned 0.4.0 archive predates them; the exception ends at
  republish.
- **Recommended option and tradeoff:** **do not accept yet.** Its own decision text binds
  it to "until the packs are republished", and the republish (O-01b) has not been
  published or verified. Accepting now would ratify the exception as if it were durable.
  The alternative — accept now and close it later — is defensible but makes the index say
  `Accepted` for a mechanism whose end condition is unexecuted.
- **Proposed status:** stay `Proposed` until the 0.4.1 artifacts exist and install
  correctly; then the owner executes the end step (delete the 18 files plus the
  `.gitignore:28-50` exception) and accepts, or replaces it with a normal media-distribution
  ADR.
- **Prerequisites for `Accepted`:** ① 0.4.1 published with a tag and release assets;
  ② the hand-edited catalogue entry pointing at the verified sha256; ③ an install from the
  published archive verified on a machine with no prior cache; ④ the 18 tracked files and
  the ignore exception removed.
- **Diff/evidence:** `.gitignore:28-50`; the 18 added archive members are measured in
  `state/evidence/RC-0.4.1-2026-10-15/diff-ja-JP.txt` and `diff-ru-RU.txt` (8 ja, 10 ru,
  all present in the candidate archive and absent from the published 0.4.0 archive);
  `state/evidence/O-01B-2026-10-15/NOTES.md` §"ADR-0032's end condition is now demonstrable".
- **Separation:** publishing 0.4.1 is a *publication* condition; accepting the ADR is a
  *decision*; both are owner acts, and neither is the same as the implementation, which is
  already in the tree.

## Summary

| ADR | current Status | recommended Status | implementation state | blocking prerequisite type |
|---|---|---|---|---|
| 0026 profile without an active pack | Proposed | **Accepted** | complete, tested | none (owner acceptance only) |
| 0028 licence-permissiveness detection | Proposed | **Accepted** at `Info` | complete, tested | none for acceptance; severity promotion stays an owner decision |
| 0029 RTL direction model | Proposed | **Accepted** | complete, tested | none for acceptance; AT pass on an RTL screen is a separate human check |
| 0030 attempt identity and disqualifying support | Proposed | **Accepted** | complete, tested | none (owner acceptance only) |
| 0031 goal prerequisites aggregate over concepts | Proposed | **Accepted** | complete, tested | none (owner acceptance only) |
| 0032 tracked pack media exception | Proposed | **stay Proposed** | complete but time-boxed | publication: 0.4.1 tag + assets + verified install, then remove the exception |
