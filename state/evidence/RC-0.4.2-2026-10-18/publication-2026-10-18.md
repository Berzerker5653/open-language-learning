# 0.4.2 reference-pack publication — 2026-10-18

Owner authorization for this release: the owner's instruction of 2026-10-18
("last we can push the updates to 0.4.2"), following the consolidated owner-residue
report `state/evidence/OWNER-RESIDUE-2026-10-18.md`. As with 0.4.1 under D2, the
tag-and-upload act itself was delegated to the agent; the decision to publish was the
owner's.

## 1. What is live

| release tag | asset | bytes | sha256 | draft | prerelease | immutable |
| --- | --- | --- | --- | --- | --- | --- |
| `org.openlanguage.ja-jp.reference-0.4.2` | `ja-jp-reference-0.4.2.lpk` | 318,724,406 | `b03cf88671d86de2c4ef481c07b16fcb2725f0dcd61a71df0e2182a63d764a81` | no | no | yes |
| `org.openlanguage.ru-ru.reference-0.4.2` | `ru-ru-reference-0.4.2.lpk` | 318,491,600 | `3b3dc25694b60f899f675982721df23b7c5bb7a3471f0457298ae0e1e38386d4` | no | no | yes |

Both tags resolve to `fb6858d3e42f9325682c080186ad71177028f205`, the single commit
whose tree pins them (`catalog/packs.json` + both `manifest.yaml`). Transcript of the
create/read-back, including `GET /repos/…/immutable-releases` →
`{"enabled":true,"enforced_by_owner":false}`: `upload-transcript.txt`. Release notes
as uploaded: `release-notes-ja.md`, `release-notes-ru.md`.

The ru catalogue entry also stopped saying `(Draft)`: the browse UI renders the
**catalogue** `display_name` (`apps/desktop/src-tauri/src/packs.rs:231`), so the pack
rename that landed in the manifest at `f6f3ce0` only reaches learners in this commit.
`catalog/packs.json` was hand-edited, not regenerated — `langpack catalog` proposes
`catalog_version: "1"` and drops the maintained `note`, and the tracked file is the
hand-maintained one (same posture as the 0.4.1 publish, `20f994d`).

## 2. Candidate build, twice

`build-rc-0.4.2.sh` ran the seven pack gates, built, inspected, accounted and
installed each pack. Run output: `SUMMARY.txt`, `rc-*.txt`, `archive-*.txt`,
`install-*.txt`, `members-*.txt`. Two independent runs against the same tracked tree
(HEAD `5a0d1f0`) produced byte-identical archives — `REPRODUCIBILITY.txt`, which also
explains the one SUMMARY line that changed between the runs (the media-member count
now excludes `media/manifest.jsonl`, so it equals the manifest rows exactly: 4,902 ja
/ 4,856 ru, delta 0).

## 3. Member accounting against the published 0.4.1 pair

`diff-041-to-042-ja-JP.txt`, `diff-041-to-042-ru-RU.txt`:

- ja: 5,865 members, 5,857 identical to 0.4.1 by size+hash. Added: `curriculum/units/826-admin-bill-payment-revision.yaml`.
  Changed: `manifest.yaml` (version), `review/WORKLIST-2026-10-14.md`, and units 812, 820, 821, 823, 824. No media byte changed.
- ru: 5,789 members, 5,779 identical. Changed: `manifest.yaml` (version), `media/manifest.jsonl`,
  `lexicon/narration.jsonl`, `sources.jsonl` (the ADR-0035 provenance row), `README.md`,
  `review/WORKLIST-2026-10-14.md`, units 810, 813, 816 — and exactly one clip:
  `media/ru.lex.narration.totchas.wav` 80,684 B `abefb6819fea…` → 76,844 B `b4b4e4902b35…`,
  the re-bake of the corrected `то́тчас` reading.

## 4. Public round trip (the gate CI runs)

`restore-from-public-urls.txt` — `scripts/fetch-pack-audio.sh` against the live
catalogue pins, fresh 636 MB download:

```
summary languages/ru-RU: rows checked=4856 files valid=4856 files restored=0 files already valid=4856 rows failing=0   EXIT=0
summary languages/ja-JP: rows checked=4902 files valid=4902 files restored=0 files already valid=4902 rows failing=0   EXIT=0
b03cf88671d86de2c4ef481c07b16fcb2725f0dcd61a71df0e2182a63d764a81  tmp/pack-audio/ja-jp-reference-0.4.2.lpk
3b3dc25694b60f899f675982721df23b7c5bb7a3471f0457298ae0e1e38386d4  tmp/pack-audio/ru-ru-reference-0.4.2.lpk
```

`installed org.openlanguage.ru-ru.reference v0.4.2` and
`installed org.openlanguage.ja-jp.reference v0.4.2` — the install gate accepted both
archives through the same validation path a learner uses, and the downloaded bytes
hash to exactly the catalogue pins.

## 5. Client transport proof

`cargo test -p lts-desktop --lib -- --ignored both_pinned` →
`1 passed; 0 failed` in **111.99 s**. That test derives the expected
`(pack_id, version)` pairs from the shipped catalogue, fetches both pinned archives
through the app's own downloader, installs them into a fresh store, and compares each
receipt's sha256 with the pin — so the 0.4.2 pins are proven end-to-end through the
client, not only the CLI.

## 6. CI sequence

- `39155073665` (head `5a0d1f0`): `rust` + `desktop-smoke` red at `Restore
  reference-pack audio (published archives)` — both manifests declared 0.4.2 while the
  catalogue pinned 0.4.1, and the restore step refuses an unpublished pin. `web` was
  red at `Run pnpm fmt:check` on six formatting-drift files that predate this work.
- `3ef1329` fixed `web` (formatting only: 12 insertions / 18 deletions); `web` is
  `success` on `39157289475`.
- `39157289475` (head `fb6858d`, started 19:07:11Z): the same two jobs red at the same
  step — the assets went live at 19:09:46Z and 19:11:04Z, after those jobs had already
  fetched. The ordering documented in ADR-0032 and `docs/13` (bake → publish →
  restore) is what this gate enforces.
- The run over the commit that follows is the one expected to be green end to end; it
  is recorded in §7.

## 7. CI green run, and what stood between the publication and it

Run **`39166395880`** — <https://github.com/Berzerker5653/open-language-learning/actions/runs/39166395880>
— over head `4e998283fd7d8aa57891bbf24df45eb8f6c39127`:

| job | conclusion |
| --- | --- |
| `rust` | success |
| `web` | success |
| `schemas` | success |
| `security` | success |
| `platform-compile (windows-latest)` | success |
| `platform-compile (macos-latest)` | success |
| `desktop-smoke` | success |
| `platform-bundles` | skipped (manual, unsigned — unchanged posture) |

`rust` and `desktop-smoke` both ran `Restore reference-pack audio (published
archives)` green against the live 0.4.2 pair, which is the gate §§4–5 proved by hand.

Two failures had to be diagnosed to get there, and neither was the pack content:

1. **`39161115585` (head `31ce5fb`), attempts 1 and 2** — `rust`, `web`, `schemas`,
   `security` and both `platform-compile` legs green; `desktop-smoke` red at
   `Run ./scripts/smoke-desktop.sh`, both times, with the step log ending
   `SMOKE OK (13 routes walked)` followed by
   `##[error]Process completed with exit code 143`. Not a flake and not the app: the
   `EXIT` trap at `scripts/smoke-desktop.sh:59` ran `kill "${VITE_PID:-0}"`, and on the
   pnpm branch — which is the branch CI takes, because the job installs pnpm —
   `VITE_PID` is unset, so it executed `kill 0` and SIGTERM'd its own process group
   while exiting. Reproduced in one line
   (`bash -c 'trap "kill \"${VITE_PID:-0}\" 2>/dev/null || true; true" EXIT; echo ok'`
   → `ok`, exit 143; the same trap guarded → exit 0), then fixed by guarding the kill.
   Verification, split honestly: the fix is proven **on the branch that broke** by
   `39166395880` above, where `desktop-smoke` is `success` on the fixed head after two
   deaths at 143. A local rerun at this tree (`SMOKE OK (13 routes walked)`,
   `SMOKE SCRIPT EXIT=0`, 154.84 s wall at `LTS_SMOKE_TIMEOUT=900`) covers the
   **fallback vite branch**, not that one — GamingPC has no pnpm (`command -v pnpm`
   returns nothing), so the run started its own vite, `VITE_PID` was set, and the trap
   was already correct there; what it establishes is that the guard did not break the
   vite path. `6cae160` (2026-10-17 15:16) introduced that trap shape; it survived a
   day because every run since then died earlier, at the restore step, so the smoke
   step never ran.

   The fix also has a proof that does not depend on CI: the exact guarded trap statement
   at `scripts/smoke-desktop.sh:62`, evaluated in a subshell with `VITE_PID` unset — the
   shape the pnpm branch produces — prints `SMOKE OK (13 routes walked)` and exits **0**,
   while the pre-fix statement in the same position exits **143**. The contrast run also
   exposes a second, quieter defect: because the self-SIGTERM aborts the trap mid-way, the
   pre-fix shape never reaches `rm -rf "$DATA"`, so every smoke run that "passed" on CI
   leaked its `mktemp -d` data directory into `/tmp` on the runner.
2. The earlier `39155073665` / `39157289475` restore failures, documented in §6: the
   first is ADR-0032's ordering working as designed, the second pure timing.

Nothing in this section changed a pack, an archive, a pin or a budget. The only code
change is the trap guard in `4e99828`.
