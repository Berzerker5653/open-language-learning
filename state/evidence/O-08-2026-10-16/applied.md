# O-08 — D3 applied: immutable releases + a tag ruleset (2026-10-16)

Owner decision D3, chosen as "enable both" while clearing the decision queue. The commands
were proposed in `state/evidence/OWNER-QUEUE-2026-10-15.md`; execution happened here because
the owner authorized the change explicitly in this session. Everything below is read back
from the API after the mutation, not from the request that made it.

## What is now in force

| mechanism | state | read-back |
| --- | --- | --- |
| Immutable releases | **enabled** | `GET /repos/Berzerker5653/open-language-learning/immutable-releases` → `{"enabled":true,"enforced_by_owner":false}` |
| Tag ruleset `release-tags` | **active** | `id 25246378`, `target: tag`, `enforcement: active`, `conditions.ref_name.include: ["~ALL"]`, `rules: [{"type":"deletion"},{"type":"update"}]`, `bypass_actors: []`, `current_user_can_bypass: "never"` |

Before this change both reads said `{"enabled":false}` and `GET /rulesets` returned `[]`.

`immutable-releases` now locks the tag *and* the assets of every release created from now
on, which is the ordering the queue asked for: the 0.4.1 packs will be published into a
repository where a released asset cannot be deleted and re-uploaded under the same name. The
seven releases that already exist are **not** retroactively immutable — that is documented
GitHub behaviour and was measured as `immutable:false` on all seven on 2026-10-15.

## The proposed ruleset JSON does not work on this repository — correction

`state/evidence/O-08-2026-10-15/mechanisms-2026-10-15.md` proposed a pattern-scoped tag
ruleset (`org.openlanguage.**`, `open-language-learning-platform-**`). That JSON is
**rejected**. Probes against `POST /repos/…/rulesets`, all `422`, no side effect:

| `ref_name.include` | result |
| --- | --- |
| `["~org.openlanguage.**", "~open-language-learning-platform-**"]` | `Invalid target patterns` |
| `["org.openlanguage.*", "open-language-learning-platform-*"]` | `Invalid target patterns` |
| `["org.openlanguage.ja-jp.reference-0.4.0"]` (an exact existing tag) | `Invalid target patterns`, plus `Missing required parameter 'exclude'` |
| `["*"]` | `Invalid target patterns` |
| `["~ALL"]` | **201 — created** |

So on this repository a **tag** ruleset accepts only the `~ALL` token for `ref_name`; the
fnmatch wildcard patterns documented for branch rulesets are not accepted for tags. The
earlier statement that "a pattern-scoped tag ruleset covers the seven tags that already
exist" was therefore wrong about the mechanism, though the intent is met by a broader rule.

Consequence of the broader rule, stated plainly: it covers **every** tag, present and future,
with two restrictions — no deletion, no update (force-push / re-point). It deliberately does
**not** include a `creation` rule, so **creating the 0.4.1 tag is still allowed**; that is the
inference from the rule list, and it will be proven the moment the owner creates
`org.openlanguage.ja-jp.reference-0.4.1`. It was not tested here because creating a throwaway
tag to test it would then be **undeletable** under the rule it is meant to test.

## Escape hatch and its cost

No bypass actors are configured and `current_user_can_bypass` reads `never`, so even the
owner cannot delete or move a protected tag directly — the way to do it is to edit or delete
ruleset `25246378` first, which is an explicit, visible act. That is the intended friction.

Immutability is stronger: an immutable release cannot be un-published, edited or deleted even
by the owner, and disabling the setting later does not unlock releases already made immutable.
A bad upload at 0.4.1 therefore costs a 0.4.2, not a fix in place. That cost was accepted at
decision time and is the reason `immutable: true` is a fact worth recording here.

## What this closes and what it does not

- Closed: asset `DELETE` + same-name re-upload, release `PATCH tag_name` re-point, tag
  force-push, tag delete+recreate — for every release made from 2026-10-16 onward.
- Still open: the seven pre-existing releases remain mutable assets; the pre-existing tags are
  protected by the ruleset but their *assets* are not immutable.
- Unchanged: the engine's install-time digest check (`crates/langpack/src/archive.rs:287`),
  which was and remains the thing that makes a tampered byte stream fail closed on the client.
