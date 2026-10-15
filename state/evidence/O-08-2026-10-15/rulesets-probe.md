# O-08 re-probe: tag protection *is* available on this repo (correction)

Probed read-only from GamingPC on 2026-10-15 against `Berzerker5653/open-language-learning`
(public repo, personal account, `gh` = `Berzerker5653`). **Nothing was created,
changed or deleted.**

## What the earlier note got wrong

The 2026-10-13 record concluded "**tag protection does not exist on a personal
account**", based on a 404 from `POST /repos/…/branches/protection/patterns`.
That endpoint is the **classic protection-patterns** API, which is
organization-only — its 404 says nothing about tags on a user-owned repository.
The supported mechanism, repository **rulesets**, was never probed.

## Measured now

Current protection state:

```
$ gh api repos/Berzerker5653/open-language-learning/rulesets
[]                                    # HTTP 200 — zero rulesets exist

$ gh api repos/Berzerker5653/open-language-learning/branches/main/protection
required_status_checks = null, allow_force_pushes = false,
allow_deletions = false, required_pull_request_reviews = null

$ gh api repos/Berzerker5653/open-language-learning/tags -q '.[].name'
org.openlanguage.ru-ru.reference-0.4.0  org.openlanguage.ru-ru.reference-0.3.0
org.openlanguage.ru-ru.reference-0.2.0  org.openlanguage.ja-jp.reference-0.4.0
org.openlanguage.ja-jp.reference-0.3.0  org.openlanguage.ja-jp.reference-0.2.0
open-language-learning-platform-0.4.0-alpha.1          # 7 tags total
```

A deliberately invalid create request (so it cannot possibly create anything)
shows what the API accepts for this repository:

```
$ gh api -X POST repos/Berzerker5653/open-language-learning/rulesets \
    -f name=probe-invalid -f target=tags
HTTP 422
Invalid property /target: `tags` is not a possible value.
Must be one of the following: branch, tag, push.
Invalid input: object is missing required key: enforcement.
```

The server rejected the enum value and a missing required key — it did **not**
return 403/404 for the feature, the plan, or permissions. `target: tag` is a
permitted value on this personal-account public repository.

Docs agree: *About rulesets* — "You can use rulesets to target branches or tags
in a repository… who can delete or rename a tag"; *Available rules for rulesets*
— **Restrict creations / Restrict updates / Restrict deletions** each apply to
"branches or tags whose name matches the pattern". (The legacy
"tag protection rules" feature *is* plan-restricted; GitHub's own guidance is to
import those into repository rulesets, which is what is available here.)

## What the owner can do (not done here — repo-settings write)

A tag ruleset making the 7 release tags immutable for everyone except the
owner, with the intended shape:

```json
{
  "name": "release-tags-immutable",
  "target": "tag",
  "enforcement": "active",
  "conditions": { "ref_name": { "exclude": [], "include": ["~ALL"] } },
  "rules": { "deletion": true, "update": true, "force_pushes": true, "creation": true },
  "bypass_actors": [ { "actor_type": "RepositoryRole", "actor_id": 1, "bypass_mode": "always" } ]
}
```

`creation: true` would also block *new* tags, which is a workflow cost worth
deciding on purpose (the 0.4.1 republish would need bypass or a temporarily
disabled ruleset); leaving `creation` off protects existing tags only. Exact key
names should be re-confirmed against `gh api /repos/…/rulesets/schemas` output
at apply time — this shape is what the 422 response and the docs imply, not a
request that was actually sent successfully.

## What this changes about the risk

Even before any ruleset, a **moved tag cannot install wrong bytes**: the engine
verifies the pinned `sha256` before install (`crates/langpack/src/archive.rs:302`),
so a retagged release fails closed. The ruleset adds repository-level
immutability (nobody force-pushes or deletes a pinned tag), which is what the
catalog's `sha256` pins assume socially. That is a defence-in-depth decision for
the owner, not a fix for a live defect.
