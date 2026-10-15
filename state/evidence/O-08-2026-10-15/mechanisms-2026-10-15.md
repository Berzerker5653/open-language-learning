# Repository protection analysis — `Berzerker5653/open-language-learning` (2026-10-15)

Scope: read-only determination (docs + `gh api` GETs; `gh` authenticated as the repo owner). **No remote setting was created, edited, or deleted.** This builds on `state/evidence/O-08-2026-10-15/rulesets-probe.md` and corrects two of its conclusions (see §6).

## 1. Repo / plan context

`GET /repos/Berzerker5653/open-language-learning` → 200:

- `"private": false`, `"visibility": "public"`, owner `{"login":"Berzerker5653","type":"User"}` (personal account), `"id": 1404661243`, `"default_branch": "main"`, `"delete_branch_on_merge": false`.
- The repo JSON contains **no `plan` key**, and GraphQL `{viewer{plan{name}}}` / `User.plan` do not exist (`"Field 'plan' doesn't exist on type 'User'"`). Plan is therefore *inferred* — everything below is grounded in what the endpoints actually accept plus docs plan-gating text, not a plan string.

Why it matters: the catalog pins the 0.4.0 release archives by sha256 and the engine verifies the digest before install. Correct code citation (prior note said `archive.rs:302` — that line is the `pack.validate(Mode::Install, None)` gate):

- `crates/langpack/src/archive.rs:287` — `if hex_sha256(&data) != f.sha256 { return Err(ArchiveError::Invalid(format!("hash mismatch for {:?}", f.path)))` (per-file check on the install path; `FileManifest { path, sha256, size }` at :32–35, `hex_sha256` at :58).
- Catalog audit: `crates/langpack/src/audit.rs:1047–1055` — declared `sha256` vs `crate::archive::hex_sha256`, diagnostic code `media_hash_mismatch`.

These are consumer-side integrity checks; they detect a swapped artifact but do nothing to stop GitHub-side mutation of the tag or asset.

## 2. Measured current protection state (all read-only)

| Probe | Result |
|---|---|
| `GET /repos/…/rulesets` | `200 []` — **zero rulesets** of any kind |
| `GET /repos/…/branches/main` | `{"name":"main","protected":true}` |
| `GET /repos/…/branches/main/protection` | all flags `false`: `required_signatures`, `enforce_admins`, `required_linear_history`, `allow_force_pushes`, `allow_deletions`, `block_creations`, `required_conversation_resolution`, `lock_branch`, `allow_fork_syncing`; no `required_status_checks`/`required_pull_request_reviews` keys → an effectively-empty rule that only carries the *default* force-push/deletion block, and only for branches |
| `GET /repos/…/releases` + GraphQL | **7 releases, all `immutable: false`** (3× 0.4.0, 2× 0.3.0, 2× 0.2.0; GraphQL `totalCount: 7`; `isPrerelease: true` only for the platform alpha.1) |
| `GET /repos/…/immutable-releases` (with `-i`) | **HTTP 200** `{"enabled":false,"enforced_by_owner":false}` — endpoint exists and is live; feature **off** (the path `…/settings/immutable-releases` → 404 is wrong; correct path per docs anchors “Check/Enable/Disable immutable releases” at `docs.github.com/en/rest/repos/repos`, corroborated by closed go-github issue #4038) |
| Tags (`GET /repos/…/tags`) | 7 tags: the two `org.openlanguage.{ja-jp,ru-ru}.reference-0.4.0` and `open-language-learning-platform-0.4.0-alpha.1` all point at commit `70ec6830611ef67a2e54b0305c09f38b58798de6`; 0.3.0 pair → `c24f0a974405e6eaa9d9de5c61aab3cd7b7c4550`; 0.2.0 pair → `188d89c50875fe1b34b6cbdbe09761ca781dc36e`; main head `fd767860038f7a43b522ee565df1e45a20c5270c` |

Pinned assets and GitHub-computed digests (`GET /releases`, `digest` field):

| Release | Asset (id) | Size | GitHub digest |
|---|---|---|---|
| 411896508 `…ru-ru.reference-0.4.0` | `ru-ru-reference-0.4.0.lpk` (637630405) | 316,616,342 | `sha256:899e0c67a71d165a706afd216817c53b9ee9a56d34a99f1197aeec29a8ea3e14` |
| 411895460 `…ja-jp.reference-0.4.0` | `ja-jp-reference-0.4.0.lpk` (637627198) | 317,429,131 | `sha256:f0aa971f30ec88c0f09ca86085d04133616944d9fff6a75345bf31931b713a5f` |
| 411897885 platform `0.4.0-alpha.1` | `…_amd64-aligner.AppImage` (637635206) | 144,669,176 | `sha256:95581a7aa6c409cba8a9de7ec74c34658e5eaa25154afb20ce0604d56d600e56` |
| | `…_amd64-aligner.deb` (637635208) | 83,781,498 | `sha256:158c079b80546fc956805dfcba6483d5d2b963a4fd2e79efcf5a8ef7d96465af` |
| | `…_amd64.AppImage` (637635204) | 72,739,320 | `sha256:8ec280f83715b6021121bd539700536449dd02d7356242e182e22b492c466457` |
| | `…_amd64.deb` (637634765) | 12,309,544 | `sha256:f25dfd6de8cf98d220bb332004a3a40287e70890b3592097c3a6448d8dc586ec` |

Capability probes already used (earlier session; **not repeated here**, both rejected so nothing was created):

- `POST /repos/…/rulesets` with `{"name":"omp-capability-probe","target":"tag"}` (no `enforcement`) → 422 `{"message":"Invalid request.\n\nInvalid input: object is missing required key: enforcement."}` — the error is *only* about the missing key; **no complaint about `target: "tag"`, i.e. `tag` targets are schema-legal on this repo**.
- Earlier probe `target: "tags"` → 422 `"Invalid property /target: 'tags' is not a possible value. Must be one of the following: branch, tag, push."`
- Undocumented introspection endpoints 404: `GET /repos/…/rulesets/schemas`, `GET /repos/…/rulesets/requirements?target=tag`.

Caveat: a tag ruleset was **never actually created** (mutating calls forbidden); the tag-ruleset conclusion rests on the 422 type-acceptance + docs, not on a live ruleset.

## 3. Tamper vectors that remain open today

With zero rulesets and `immutable:false` everywhere, anyone with push access (owner account, any collaborator, any leaked repo-scoped token):

1. **Retarget a release tag**: `git push --force refs/tags/org.openlanguage.ja-jp.reference-0.4.0` onto a different commit. Nothing blocks it; the release then points at attacker-chosen source. (Branch protection never covers tags — see §4.)
2. **Delete + recreate a tag** at a different commit (same net effect, also unblocked).
3. **Replace a release asset**: `DELETE /repos/…/releases/assets/{id}` (204) then `POST /repos/…/releases/{id}/assets` with the *same filename* — docs: “If you upload an asset with the same filename as another uploaded asset, you'll receive an error and must delete the old file before you can re-upload the new asset.” Result: same name/download URL, **new asset id, new GitHub digest**. The engine's pin (`archive.rs:287`) would then reject the archive — until the tamperer also edits the catalog in the repo, which is unrestricted.
4. **Re-point the release object**: `PATCH /repos/…/releases/{release_id}` with a different `tag_name` (“Users with push access to the repository can edit a release”). `target_commitish` does *not* move an existing tag — “Unused if the Git tag already exists” — but `tag_name` can bind the release to a different (possibly freshly created, attacker-controlled) tag.
5. Asset **metadata** (`name`/`label`/`state`) can be edited in place via asset `PATCH` — bytes cannot, but names can be changed to mislead.

The catalog sha256 pins + the digest GitHub now exposes on assets (changelog 2025-06-03, “Releases now expose digests for release assets”; `digest: required, string or null` in the asset schema) make a swap *detectable*, and the install-time check makes a naive swap fail — but none of it makes the tag or asset **immutable** on GitHub's side.

## 4. Protection mechanisms actually available on this repo

### Tag rulesets — AVAILABLE
- Gating (`raw.githubusercontent.com/github/docs/main/data/reusables/gated-features/repo-rules.md`): “Rulesets are available in public repositories with GitHub Free and GitHub Free for organizations, and in public and private repositories with GitHub Pro, GitHub Team, and GitHub Enterprise Cloud.” This repo is public → eligible.
- `GET /rulesets` returns 200 and the 422 probe accepted `target:"tag"` (see §2).
- Relevant rules (`docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets`): *Restrict creations / Restrict updates / Restrict deletions* — “only users with bypass permissions can create / push to / delete branches or tags whose name matches the pattern”; *Block force pushes* — “prevent users from force pushing to the targeted branches or tags. This rule is enabled by default.” The required-reviewers rule is “not available on user-owned repositories” (irrelevant here).
- About-rulesets: “You can use rulesets to target branches or tags in a repository or to block pushes to a repository and the repository's entire fork network.” Up to 75 rulesets per repository. (Org-wide rulesets need Team/Enterprise: “A ruleset … applies to a repository or to multiple repositories in an organization for customers on Team and Enterprise plans” — not needed; repo-level suffices.)

### Immutable releases — AVAILABLE and verified live on this repo
- Endpoint exists for **this exact repo**: `GET /repos/Berzerker5653/open-language-learning/immutable-releases` → `200 {"enabled":false,"enforced_by_owner":false}`. Mutating paths (not run): `PUT`/`DELETE` same path; UI: repo Settings → “Releases” → “Enable release immutability. Be aware that immutability will only apply to future releases.”
- `docs.github.com/en/code-security/concepts/supply-chain-security/immutable-releases`: “Immutable releases are releases where the assets and associated Git tag cannot be changed after publication.”; “Git tags cannot be moved: Once an immutable release is published, its associated Git tag is locked to a specific commit, cannot be changed, and cannot be deleted while the release exists. If you delete the immutable release, you can delete the tag, but you cannot reuse the same tag name.”; “Release assets cannot be modified or deleted”; publishing generates a **Sigstore-style release attestation** over tag, commit SHA, and assets; plus “protection against repository resurrection attacks”.
- GA changelog (2025-10-28): “Once enabled: All new releases are immutable (i.e., assets are locked and tags are protected). **Existing releases remain mutable unless you republish them.** Disabling immutability doesn't affect releases created while it was enabled.” No plan-gating banner appears in any of the docs/changelog pages → treated as available on this account, consistent with the live 200 on the repo endpoint.
- Gap: the docs/changelog do **not** document a republish workflow for already-published releases, so the 3 pinned 0.4.0 releases (and 4 older) stay mutable after a plain enable.

### Push rulesets — NOT AVAILABLE here (corrects prior evidence file)
- Gating snippet: “Push rulesets are available for the Team plan in internal and private repositories, and forks of repositories that have push rulesets enabled.” This repo is **public** and **user-owned** → excluded on both counts.
- Scope (`data/reusables/repositories/push-rulesets-overview.md`): “you can block pushes to a private or internal repository and that repository's entire fork network based on file extensions, file path lengths, file and folder paths, and file sizes” — content checks on pushes, “Push rules do not require any branch targeting because they apply to every push to the repository.” Even where available, they are not a tag-ref protection. The prior note's “a push ruleset gives tag protection” is therefore wrong twice over (availability *and* semantics). (`target:"push"` is in the ruleset enum, but the feature is not enabled for this repo.)

### Branch protection rules — available but branches-only
- “You can protect important branches by setting branch protection rules…” and “By default, each branch protection rule disables force pushes to the matching branches and prevents the matching branches from being deleted.” (“Allow force pushes”, “Allow deletions”, “Lock branch”, etc. are all branch-scoped; tags are never targeted — rulesets are the tag-capable successor.) One rule at a time: “Only a single branch protection rule can apply at a time.”
- Measured: `main` is `protected:true` with an otherwise-empty rule, so main's force-push/deletion are blocked by the defaults; required reviews / status checks are **not** enforced. No tag relevance.

### `delete_branch_on_merge` — measured `false`; not a protection
Repo setting that *deletes* head branches after merge (branches only; no tag effect). Currently off.

### Release-asset endpoints (all currently callable by anyone with push access)
- `PATCH /repos/…/releases/assets/{id}`: “Users with push access to the repository can edit a release asset.” (name/label/state only.)
- `DELETE /repos/…/releases/assets/{id}` → 204.
- `POST /repos/…/releases/{id}/assets` upload, with the duplicate-filename quote from §3.
None is restricted by any protection that exists here today.

### `Update a release` PATCH
`PATCH /repos/…/releases/{release_id}` — “Users with push access to the repository can edit a release.” Body includes `tag_name` and `target_commitish` (“Specifies the commitish value that determines where the Git tag is created from. Can be any branch or commit SHA. Unused if the Git tag already exists.”). Not restricted today; immutable releases block the tag/asset changes it implies once enabled per-release.

### Asset digest exposure — passive, already active
GitHub “automatically computes and displays SHA256 digests for release assets” (changelog 2025-06-03). Confirmed present on every pinned asset (§2 table). Detection/verification aid, not prevention.

### Legacy tag protection rules — NOT applicable
“Tag protection rules are deprecated in GitHub Enterprise Server version 3.16 and later. Use rulesets instead.” (GHES 3.14 docs); sunset notice 2024-05-29. They were a GHAS/GHES feature — no such endpoint exists on this github.com repo.

## 5. Recommendation + explicitly UNAPPLIED list

**Recommendation (in order):**

1. **Enable repo-level immutable releases** — the native, purpose-built mechanism for exactly this threat (tag locked to commit + assets locked + attestation + resurrection protection):
   `gh api -X PUT repos/Berzerker5653/open-language-learning/immutable-releases`
   (or UI: Settings → Releases → “Enable release immutability”). Caveat: applies to **future** releases only; the 3 pinned 0.4.0 releases stay mutable.
2. **Add a tag ruleset now** to protect the **existing** 7 tags (closes the gap the enable-only path leaves; defense-in-depth even after immutable releases are on). Proposed shape (built from the creating-rulesets docs + the accepted `target:"tag"` probe — **not created, not submitted**):
   ```json
   {"name":"protect-release-tags","target":"tag","enforcement":"active",
    "conditions":{"ref_name":{"include":["org.openlanguage.**","open-language-learning-platform-**"],"exclude":[]}},
    "rules":{"creation":false,"update":false,"deletion":false,"non_fast_forward":false,"force_pushes":false},
    "bypass_actors":[{"actor_id":1,"actor_type":"RepositoryRole","bypass_mode":"always"}]}
   ```
   (`RepositoryRole` id 1 = admin bypass; `update:false`/`deletion:false` = Restrict updates/deletions per the API docs; `force_pushes:false` = Block force pushes.)
3. Keep the catalog sha256 pin + install-time check (`archive.rs:287`) as the consumer-side backstop; consider having the catalog audit also compare against GitHub's asset `digest` field so a delete-replace of an *asset* is detectable out-of-band even before repo settings change.
4. Don't bother with: branch protection (branch-only), push rulesets (unavailable here, wrong scope anyway), legacy tag protections (GHES-only, deprecated), `delete_branch_on_merge` (not a protection).

**Left unapplied — nothing in this analysis was executed:**

- `gh api -X PUT repos/Berzerker5653/open-language-learning/immutable-releases` — NOT run.
- `gh api -X POST repos/Berzerker5653/open-language-learning/rulesets --input ruleset.json` — NOT run; JSON above is a proposal only.
- No `PATCH`/`DELETE` against any branch, tag, release, or asset. The only mutating-style requests ever sent were the two invalid-body ruleset probes from the prior session, both rejected with 422, no state changed.

## 6. Corrections to prior evidence (`rulesets-probe.md`)

1. “A push ruleset gives tag protection” — **wrong**: push rulesets are Team-plan, private/internal-only, and content-scoped (file extension/path/size rules), not ref protection (§4).
2. `archive.rs:302` cited as the digest check — it is `pack.validate(Mode::Install, None)`; the digest check is `archive.rs:287` (§1).
3. Release count is **7**, not 6 (GraphQL `totalCount:7`).

## Sources

- Docs (fetched verbatim 2026-10-15): `docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets`; `…/managing-rulesets/about-rulesets`; `…/managing-protected-branches/about-protected-branches`; `docs.github.com/en/code-security/concepts/supply-chain-security/immutable-releases`; `docs.github.com/en/code-security/how-tos/secure-your-supply-chain/establish-provenance-and-integrity/prevent-release-changes`; `docs.github.com/en/rest/releases/releases` + `…/rest/releases/assets`; `docs.github.com/en/rest/repos/repos` (immutable-releases anchors); raw gating/reusable snippets from `raw.githubusercontent.com/github/docs/main/data/reusables/…` (`gated-features/repo-rules.md`, `repositories/push-rulesets-overview.md`).
- Changelogs: `github.blog/changelog/2025-10-28-immutable-releases-are-now-generally-available/`; `github.blog/changelog/2025-06-03-releases-now-expose-digests-for-release-assets`; tag-protections sunset notice 2024-05-29.
- go-github issue #4038 (closed completed 2026-02-28) — confirms `GET/PUT/DELETE /repos/{owner}/{repo}/immutable-releases`.
- API probes: all responses quoted inline (§2, §4).
