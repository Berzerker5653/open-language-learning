# Preview readiness (separate from stable-release readiness)

Authorized by owner direction 2026-10-03. This gate governs a **locally
runnable, honestly labeled preview** only. It does NOT relax any
stable-release requirement; `--release-readiness` remains the stricter
gate and still fails (correctly) until review and calibration gates pass.

## Preview gate — status

| Requirement | Status |
| --- | --- |
| Clearly labeled draft/unreviewed content | OK — every pack labeled "unreviewed"; content items `status: draft`; UI shows community/unreviewed labeling |
| Original or properly licensed content only in preview packs | OK — `eo-demo` fully original (CC-BY-4.0, ai-assisted, unreviewed); `ja-demo` EDRDG-derived (CC-BY-SA-4.0, attribution in pack) + Apache-2.0 model-output audio; `languages/ja-JP` prose replaced with ai-assisted draft wording 2026-10-03 (`docs/provenance/ja-jp-draft-content.md`) and bundled as the default pack (K-32) |
| App code Apache-2.0 (ADR-0010), third-party licenses preserved | OK — `LICENSE`, `NOTICE`, `THIRD-PARTY-NOTICES.md` |
| Language selector usable | OK — first-run pack choice; Languages page: installed list, switch, empty-catalog "coming soon" + local import; interface language separate from learning language |
| Offline after install | OK — journey test runs with no network; packs + models local |
| Speech: guided/reference only, automatic scoring disabled | OK — speech profiles `calibration: null`, assessment capability flags false; interpreters abstain rather than grade |
| No Kokoro/espeak-ng in preview distribution | OK — TTS runtime resolved from dev vendor cache only; missing audio explained in UI ("this build does not include speech synthesis") |
| Calibration deferred | OK — recordings deferred until after preview by owner decision; requirements preserved for future assessed features |
| Community pack path safe | OK — catalog host allowlist, pinned checksums/sizes, same install validation, community trust never self-upgraded |
| Release files prepared without publishing | OK — `dist/preview/*.lpk` built (gitignored), metadata in `catalog/preview-entries.json` with `PENDING-RELEASE-URL`; live catalog empty |

## Gates that remain OPEN (visible, not weakened)

- **REVIEW-001** — qualified human review capacity. Nothing in the
  preview claims reviewed status; `review_status: reviewed` in any
  future catalog entry is an author claim shown as such.
- **SPEECH-007** — preregistered calibration recordings (deferred by
  owner until after preview). Automatic pronunciation scoring stays off.
- **LIC-001 remainder** — ja-JP draft prose with unproven authorship
  was REPLACED with ai-assisted draft wording on 2026-10-03 (record:
  `docs/provenance/ja-jp-draft-content.md`); the pack still needs a
  content-license entry in `LICENSES.yaml` and qualified review. TTS
  distribution licensing (GPLv3 espeak-ng) deferred; provider stays out
  of distributable builds.
- **Stable release (`REL-001`)** — unchanged requirements;
  `--release-readiness` must keep failing until the above close.

Journey test `preview_journey_select_activity_restart_switch_retain`
(select eo-demo → activities → restart retains Independent mastery →
switch to ja-demo → switch back → both listed offline), plus CI,
desktop smoke, and validator runs recorded in
`state/evidence/PREVIEW-2026-10-03/`.
