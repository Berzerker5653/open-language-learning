# Japanese Reference Pack 0.4.1

Built from the tracked tree at the commit tagged by this release. Archive:
`ja-jp-reference-0.4.1.lpk`, 318,722,747 bytes, sha256
`e697ee92f6602c3373ebe5910f0dfbee8e50edcb3e9a25b2890efba5a5964690`, 5,864 members of which
4,903 are under `media/`.

## What is in it relative to 0.4.0

- **Sentence/phrase audio that was authored but never shipped.** The 8 git-tracked journey
  audio rows added since 0.4.0 are inside this archive (`git ls-files
  languages/ja-JP/media | grep -c '\.wav$'` = 8, and the archive listing contains all 8 —
  checked by the build log, `state/evidence/RC-0.4.1-2026-10-15/post-d1/`).
- **Corrected licence string.** The catalogue entry said `CC-BY-4.0`; the pack itself has
  declared `CC-BY-SA-4.0` since the 2026-10-13 decision. `langpack catalog` copies the
  licence from the pack, so the published metadata now agrees with the pack.
- **Corrected kanji decomposition data.** The 84 kanji records' `radicals` lists are
  re-sourced from EDRDG **KRADFILE** (via the jmdict-simplified 3.6.2 conversion), declared
  as a pack source at CC BY-SA 4.0 with pinned release `3.6.2+20260928191014` and a
  `lic-kanji-radicals` record. 57 of 84 lists changed content, 20 were already identical, 7
  changed order only. The previous records credited `jf-standard`, a dataset this repository
  records as reference-only and not redistributable. Decision record:
  `state/evidence/O-07/decision-2026-10-16.md`.
- **Grammar, goal and environment content** recorded since 0.4.0.

## What did not change

No pre-existing media file changes bytes, so an installed 0.4.0 keeps valid media. The only
client-side action is the store upgrade, which retains the previous version for rollback.

## Honest posture

Content is AI-authored and unreviewed: `review_status` stays `community`, and the pack ships
at its declared draft/experimental status. Qualified band review (A2/B1/B2) has not happened
and cannot be claimed by this release. The kanji decomposition layer is CC BY-SA 4.0 EDRDG
data; attribution is in `third-party/notices/NOTICE.md` inside the archive, and an
in-app acknowledgement is still open work (`JA-KANJI-ATTRIBUTION-001`).
