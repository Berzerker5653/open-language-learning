# 0.4.1 publication — executed 2026-10-16

**Who acted and under what authority.** The owner authorized publication in this session
(queue item **D2**, "publish both packs at 0.4.1, drop `(Draft)`"), and when the remaining
step was still the tag plus upload the owner explicitly directed an agent to perform it
("Yes — you publish both now"). `AGENTS.md` keeps publishing an owner act, so this file
records that the act itself was delegated, not assumed. Everything below is the measured
result of that run.

## 1. What was published

| tag | target | asset | bytes | sha256 (GitHub asset digest) | immutable |
| --- | --- | --- | --- | --- | --- |
| `org.openlanguage.ja-jp.reference-0.4.1` | `20f994df05478f92b9d2399bbf655066e21ffda6` | `ja-jp-reference-0.4.1.lpk` | 318,722,747 | `e697ee92f6602c3373ebe5910f0dfbee8e50edcb3e9a25b2890efba5a5964690` | `true` |
| `org.openlanguage.ru-ru.reference-0.4.1` | `20f994df05478f92b9d2399bbf655066e21ffda6` | `ru-ru-reference-0.4.1.lpk` | 318,489,935 | `9eb074fa8d59f508108bc0fa8c698e1ddbd7458648ee2d829edeb36fbcfc1d7a` | `true` |

Release pages: <https://github.com/Berzerker5653/open-language-learning/releases/tag/org.openlanguage.ja-jp.reference-0.4.1>
and <https://github.com/Berzerker5653/open-language-learning/releases/tag/org.openlanguage.ru-ru.reference-0.4.1>.
Upload wall time 78.3 s and 86.5 s. Both tags resolve to the same commit
(`git ls-remote --tags origin | grep reference-0.4.1` → `20f994df05478f92b9d2399bbf655066e21ffda6`
for each); the older `0.4.0` pair still resolves to `70ec6830611ef67a2e54b0305c09f38b58798de6`,
so an installed 0.4.0 store keeps its rollback target.

Commands used (from `state/evidence/RC-0.4.1-2026-10-15/publish-runbook.md` §1):

```bash
gh release create org.openlanguage.ja-jp.reference-0.4.1 \
  --target 20f994df05478f92b9d2399bbf655066e21ffda6 \
  --title "Japanese Reference Pack 0.4.1" \
  --notes-file state/evidence/RC-0.4.1-2026-10-15/notes-ja.md \
  dist/rc-0.4.1/ja-jp-reference-0.4.1.lpk          # exit 0
gh release create org.openlanguage.ru-ru.reference-0.4.1 \
  --target 20f994df05478f92b9d2399bbf655066e21ffda6 \
  --title "Russian Reference Pack 0.4.1" \
  --notes-file state/evidence/RC-0.4.1-2026-10-15/notes-ru.md \
  dist/rc-0.4.1/ru-ru-reference-0.4.1.lpk          # exit 0
```

**The 422 that came before these.** `--target 20f994d` (seven characters) was rejected twice
with `HTTP 422 … Release.target_commitish is invalid`: the releases API takes a branch name, a
tag name, or a **full 40-character** SHA, which is what `gh release create --help` documents
("Target branch or full commit SHA"). Nothing was half-created — the tag query answered 404 and
`gh release list` showed no 0.4.1 row before the corrected run.

## 2. Immutability took effect (D3)

`gh api …/immutable-releases` → `{"enabled":true,"enforced_by_owner":false}`, and both new
releases read back `isImmutable: true` — the first two releases in this repository that cannot
be edited or have their assets replaced. Tag protection is the `release-tags` ruleset (id
25246378, `target: tag`, `enforcement: active`, rules `update` + `deletion`), read back after
the tags existed. Consequence recorded in ADR-0030: a bad asset is now deleted for good and
re-uploaded under a new version, never patched.

## 3. The download round trip (this is the pin a learner depends on)

`tmp/verify-published-041.sh` re-downloaded both archives from their public URLs:

- `DOWNLOAD_EXIT=0` for both; `GET` on the download URL returns `302` to
  `release-assets.githubusercontent.com` (`state/evidence/RC-0.4.1-2026-10-15/published-041-<pack>.txt`).
- downloaded bytes == `catalog/packs.json` `size_bytes`, downloaded sha256 == the catalogue pin
  == the GitHub-computed asset digest, for both packs.
- member-level accounting (`diff-041-final-<pack>.txt`): ja-JP **5,864 of 5,864 members
  identical** (size + content hash) and ru-RU **5,788 of 5,788 identical**; the archive
  sha256 is equal on both sides, so the bytes GitHub serves are exactly the candidate that was
  built from the tracked tree at `20f994d`.
- against the **pre-O-07** 0.4.1 candidate (`rc-inspect-<pack>.txt`, kept for the audit trail),
  ja differs in exactly the four files the radical re-source touched — `kanji/a2-topics.jsonl`
  17,561→18,149, `kanji/entries.jsonl` 29,858→30,768, `licenses.jsonl` 3,229→4,380,
  `sources.jsonl` 6,139→8,253 — and ru is byte-identical. That is the D1 change, visible in
  the shipped artifact rather than asserted.
- `inspect` reports `lts-pack/1 org.openlanguage.ja-jp.reference v0.4.1 (schema 0.2)` (and the
  ru equivalent), so the archive's own version matches its tag and the catalogue entry.
- all 18 ADR-0032 journey assets are inside the published archives (8 ja `ja.sent.*`, 10 ru
  `ru.sent.*`), which is the precondition for queue item D4 untracking them in git.

## 4. Client path

The native transport's live proof
(`both_pinned_catalog_entries_install_through_the_native_transport`,
`apps/desktop/src-tauri/src/packs.rs`) is the only test in the tree that fetches what the
shipped catalogue actually pins, and it asserted literal `0.4.0` versions — a stale pin that
breaks on every release. It now derives the expected `(pack_id, version)` pairs from
`catalog/packs.json`, so the assertion follows the catalogue instead of a frozen number.

Run on 2026-10-16 against the published pair:

```
$ cargo test -p lts-desktop --lib packs::tests::both_pinned_catalog_entries_install_through_the_native_transport -- --ignored --nocapture
test packs::tests::both_pinned_catalog_entries_install_through_the_native_transport ... ok
test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 150 filtered out; finished in 162.18s
```

Both archives (~634 MB) downloaded through the hardened transport into a fresh store, each
install carried a receipt whose `sha256` equals the catalogue pin with `source_host ==
"github.com"`, and `installed_packs` reported `0.4.1` for both — the version assertion passing
is itself the proof the catalogue, the tag and the archive agree. The tree at that moment
already carried the `zip 9.0.4` bump (queue item D8b), so this run also exercised the new
`zip` version on the real install path, not only on fixtures.

## 5. CI after publication

`38924884357` (`6bf9cef`) and `38927443654` (`8cee375`) both failed **before** the assets
existed, on `rust` + `desktop-smoke` at `Restore reference-pack audio` with
`curl: (22) … 404 … org.openlanguage.ja-jp.reference-0.4.1/ja-jp-reference-0.4.1.lpk`.

**First green `main`: `38935030658`, head `06effd0`, `completed / success` (2026-10-16)** —
`rust`, `web`, `schemas`, `security`, `desktop-smoke`, `platform-compile (windows-latest)` and
`platform-compile (macos-latest)` all `success`. The one non-green row, `platform-bundles`, is
`skipped` by design: `ci.yml:179` is `if: github.event_name == 'workflow_dispatch'`, and that
job was `skipped` on the two failing push runs as well. The line in this file's first draft
that called `platform-bundles` green was wrong and is corrected here rather than carried.

## 6. What changed for the project, and what did not

- The corrected ja licence metadata (`CC-BY-SA-4.0`) and the 18 journey assets now reach users:
  the O-01b publication half and the `republish-packs` board row close with this.
- ADR-0032's end condition is met, so the 18-file git exception and its `.gitignore` negations
  are retired in the same commit (queue item D4); ADR-0024's rule that pack audio arrives
  through the published archive stands alone again.
- The next pack release is different in kind: with immutable releases on and the tag ruleset
  active, a bad asset is deleted for good and republished under a new version, never patched.
  That raises the price of an unverified upload, which is why §3 exists.
- Same commit, different reason: `zip 8.6.0` → `9.0.4` (queue item D8b, deliberately after the
  uploads). The rebuild check matters here — the example pack `.lpk` is byte-identical across
  the bump (3,976 B, sha256
  `7938e5fba60e3ceffdf7e796c229b29f3ec57493a959dc35ac53a92ad9434bcc`), which is the evidence
  that a pack-toolchain bump cannot move a published digest. §4's live proof ran afterwards, so
  9.0.4 is exercised on the real install path and `cargo audit` is down to 3 allowed warnings.
- Not changed: the store still marks a pack Installed by `pack_id`, so a 0.4.0 user sees no
  upgrade affordance for 0.4.1 — measured and carded as `PACK-UPDATE-UX-001`, deliberately not
  folded into this commit. The application shell remains `0.4.0-alpha.1` (queue item D6: no app
  release now).
