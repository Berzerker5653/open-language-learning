# JA-REPUBLISH-044-001 — publish Japanese pack 0.4.4 from reviewed content

## Why

The catalog-pinned ja-JP archive is 0.4.3 (published 2026-11-09). Since that tag,
`git diff org.openlanguage.ja-jp.reference-0.4.3..HEAD -- languages/ja-JP` touches
269 files, and the measured content delta is:

- `reviews.jsonl`: 0 -> 3,019 review records (2,555 approved, 80 approved-with-notes,
  **384 changes-requested** = the "370+ defect fixes" — JA-A1-003, JA-A2-002 + FIX-001,
  JA-B1-002/003 + FIX-001/FIX-002, JA-B2-001/002).
- `media/manifest.jsonl`: 4,911 -> 4,935 rows (+24 new, **280 rows changed = re-baked
  audio**, 0 removed).
- `sentences/`: 831 -> 855 rows (+24 new journey sentences, 68 texts rewritten by the
  B1 defect-fix lane).

Real installs therefore still serve pre-review ja content and pre-repair audio.
Same shape as RU-REPUBLISH-046-001 (same-day ru 0.4.6 precedent).

## Procedure (pack-release-publication playbook, ru 0.4.6 adaptation)

1. Bump `languages/ja-JP/manifest.yaml` 0.4.3 -> 0.4.4 and commit BEFORE the RC build
   (RC records a clean HEAD). — this commit.
2. RC build in an **isolated worktree at HEAD** (not the main tree: sibling lanes hold
   WIP in `crates/langpack/src/pack.rs` that adds a validate-time rule; the release
   gates must measure HEAD code, and pack bytes must be frozen). Media `.wav` bytes are
   gitignored, so the worktree gets them via `cp -al` hardlinks from the main tree
   (read-only for the build).
   Script: `state/evidence/RC-0.4.4-2026-11-21/build-rc-0.4.4.sh`
   (copy of `RC-0.4.6-2026-11-21/build-rc-0.4.6.sh` with `for pair in "ja-JP:ja-jp-reference"`,
   `V=0.4.4`, `RC_PREV=state/evidence/RC-0.4.3-2026-11-09` = published 0.4.3 member lists,
   diff label 043-to-044; run as systemd-run unit `lts-rc044` with the cargo PATH export).
3. Publish (standing owner pack-publish authorization per O-05 precedent):
   `gh release create org.openlanguage.ja-jp.reference-0.4.4 <archive> --title "Japanese Reference Pack 0.4.4" --notes ...`
   with a generous timeout; read back `gh release view --json isDraft,isPrerelease,isImmutable,assets`
   and match GitHub `digest: sha256:...` to the local sha256 BEFORE touching the catalog.
4. Re-pin `catalog/packs.json` ja entry only: version/sha256/size_bytes from the real
   archive; url = previous live url with the version bump
   (`.../download/org.openlanguage.ja-jp.reference-0.4.4/ja-jp-reference-0.4.4.lpk`) —
   never the draft `{pack_id ...}` template url. ru entry untouched.
5. `gh release download org.openlanguage.ja-jp.reference-0.4.4` IN the repo dir into
   `tmp/dl-044.lpk`, sha256 + size verify against the catalog pin, then
   `langpack install` the downloaded archive into a throwaway store and assert installed
   counts (rows == wavs, `words.jsonl` sidecar present).
6. Evidence `state/evidence/RC-0.4.4-2026-11-21/publish-0.4.4.txt` + docs/13 provenance
   addendum + commit `release(ja): publish 0.4.4 ...` + push.

## Resume recipe (if this run dies)

1. `git log --oneline -3` — if the manifest-bump commit is on main, skip step 1 above;
   if the release tag exists (`gh release list | grep ja-jp.reference-0.4.4`), skip to
   step 4 (never re-upload; releases are immutable).
2. Check for a finished RC: `tail state/evidence/RC-0.4.4-2026-11-21/SUMMARY.txt`
   (expect `RC_044_DONE`; grep the SUMMARY for `exit=127` before trusting any gate line).
3. Archive path: `dist/rc-0.4.4/ja-jp-reference-0.4.4.lpk` (worktree copy under
   `.worktrees/`; if the worktree was removed, rebuild or copy the archive out of it
   before pruning).
4. Board card: `t_fba518ac`.
