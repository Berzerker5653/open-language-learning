# Publishing 0.4.1 — the owner's runbook (2026-10-16)

Publication is an owner act. Everything up to the boundary is prepared: the manifests are
bumped on the tracked tree, `catalog/packs.json` is hand-edited with the new pins, the
archives are built, and immutable releases are already on (D3), so these two releases become
immutable automatically.

The commit to publish is **`20f994d`** (`feat(pack,catalog): publish 0.4.1 — bump both
manifests and pin the new archives`). Both tags must point at that one commit, and both
assets must exist before CI goes green again.

## 1. Create both releases with their assets

```bash
cd /home/hunter/game-dev/LTS

gh release create org.openlanguage.ja-jp.reference-0.4.1 \
  --target 20f994df05478f92b9d2399bbf655066e21ffda6 \
  --title "Japanese Reference Pack 0.4.1" \
  --notes-file state/evidence/RC-0.4.1-2026-10-15/notes-ja.md \
  dist/rc-0.4.1/ja-jp-reference-0.4.1.lpk

gh release create org.openlanguage.ru-ru.reference-0.4.1 \
  --target 20f994df05478f92b9d2399bbf655066e21ffda6 \
  --title "Russian Reference Pack 0.4.1" \
  --notes-file state/evidence/RC-0.4.1-2026-10-15/notes-ru.md \
  dist/rc-0.4.1/ru-ru-reference-0.4.1.lpk
```

`dist/rc-0.4.1/*.lpk` already hold the current 2026-10-16 archives (post-O-07). Do **not**
upload a copy made before today; the pre-O-07 ja digest was `7d9c7045…b460` and is wrong.

**Why an abbreviated SHA fails (measured 2026-10-16).** `--target 20f994d` is rejected twice
with `HTTP 422 … Release.target_commitish is invalid`: the releases API takes a branch/tag
name or a **full 40-character** SHA, and `gh release create --help` says the same ("Target
branch or full commit SHA"). Nothing was created by those attempts — `GET
…/releases/tags/org.openlanguage.ja-jp.reference-0.4.1` still answers 404. `--target` can
also be omitted entirely: `git diff --stat 20f994d 6bf9cef -- languages catalog
apps/desktop/src-tauri/tauri.conf.json apps/desktop/package.json` is empty, so the pack
manifests and the catalogue are byte-identical on `main`; the full SHA is kept above because
it is the tree whose digests are pinned in the evidence.

## 2. Expected: one red run on `main`

`20f994d` moves the manifests to 0.4.1 and repoints the catalogue at assets that do not exist
until step 1 finishes. CI's audio restore resolves audio by `<pack_id, version>` through that
catalogue, so `rust` and `desktop-smoke` fail with the named "no audio for 0.4.1" style error
until the uploads land (measured for the same coupling at `b5bafc8`, run `38772271396`). That
is the release gate working, not a flake — do not "fix" it by relaxing the restore step.

Once both assets exist:

```bash
gh run rerun 38924884357              # the run for 6bf9cef, red only while the assets are missing
```

## 3. Verify the published artefacts

```bash
gh release view org.openlanguage.ja-jp.reference-0.4.1 \
  --json tagName,immutable,assets -q '[.tagName,.immutable,(.assets[]|[.name,.size,.digest])]'
gh release view org.openlanguage.ru-ru.reference-0.4.1 \
  --json tagName,immutable,assets -q '[.tagName,.immutable,(.assets[]|[.name,.size,.digest])]'
```

Expected: `immutable: true`, sizes 318,722,747 / 318,489,935, and `sha256:e697ee92…4690` /
`sha256:9eb074fa…1d7a` matching `catalog/packs.json`. Then re-run the accounting:

```bash
./tmp/account-040-041.sh          # re-downloads and reconciles 0.4.0 vs 0.4.1 member lists
```

Tell me it is up and I will add the docs/13 provenance rows and the digest cross-check, then
close O-01b's publication half.

## 4. What the app does with it

Nothing to install by hand: the desktop app fetches the catalogue, checks `https` + release
host, pinned size and pinned SHA-256, and installs through the same validation gate as a
bundled pack. A 0.4.0 user sees a pack upgrade; the previous version stays in the store for
rollback (test-pinned in `crates/langpack/tests/media_upgrade.rs`).
