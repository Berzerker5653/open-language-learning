# PACK-VERSION-BUMP-001 (gap, not yet scheduled)

Found 2026-11-17 during CONTENT-CONFIRM-001 human acceptance.

## Gap
"Update to v0.4.3" (language.tsx) runs `install_pack`, which only records a
device-level row in `pack_installations`. The profile's row in
`profile_pack_selections` stays pinned at the version chosen when the profile
was created, and no UI control re-selects the *same* pack to bump it
(`switch_pack` exists and uses `current_version`, but the language picker only
offers other packs). Result: Settings shows "installed (v0.4.3)" while the
learner still studies 0.4.2 content — looks like the update silently failed.

## Evidence (live DB ~/.local/share/openlang/profiles.db)
- pack_installations: ru-ru.reference 0.4.2 + 0.4.3 (installed 2026-11-17T19:26Z).
- profile_pack_selections before manual fix: UX Tester 0.4.2, Testing 0.4.2,
  RushTest (new profile) 0.4.3.
- Device pointer `packs/org.openlanguage.ru-ru.reference/current` = 0.4.3.

## Interim remedy applied
`update profile_pack_selections set version='0.4.3' where pack_id=
'org.openlanguage.ru-ru.reference' and version='0.4.2'` — verified all three
profiles now at 0.4.3. Storage semantics support version switching
(`select_pack` is an upsert; evidence rows preserved by design).

## Proposed fix (not built)
In the pack-updates notice / language panel, when a pack's installed
version > profile selection version, call `switch_pack(profileId, packId)`
(reuses current_version path, tears down session state safely via
switchLearning in App.tsx). Add a desktop test: update installed 0.4.2 ->
0.4.3, existing profile selection becomes 0.4.3 after clicking update.
