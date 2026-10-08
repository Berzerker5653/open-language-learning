# ADR 0015: Publishing other-OS builds with a community-confirmed platform ladder

Status: Accepted (owner decision; distribution host still open)
Date: 2026-10-07

## Context

`PLAT-001` shipped build configuration only: Tauri bundle targets for
`nsis`/`msi` and `app`/`dmg` plus CI compile-checks on `windows-latest` /
`macos-latest`, with runtime behavior explicitly untested and
`tested_platforms: ["linux"]` hardcoded into every catalog entry
(`crates/langpack-cli/src/main.rs`, `catalog/packs.json:32`). `docs/13:16-28`
states the rule: a platform becomes "tested" only through a human-run runtime
pass; compile checks never establish it.

The owner decision 2026-10-07: *"we should have the option to allow downloads to
other OS's besides only Linux. We can put the framework into allow this … we can
label this as untested, so if someone from another operating system gets it up
and running and they say it works then we can remove the untested tags."*

The problem with a single boolean: third-party "it works for me" reports are
evidence, but they are not maintainer-run evidence, and the project's rules do
not allow them to be laundered into a `tested` claim (`docs/13:27`, `docs/18`).

## Decision

Three-way platform status, emitted per catalog entry:

| field | populated by | meaning |
| --- | --- | --- |
| `tested_platforms` | maintainer/owner-run runtime pass | evidence the project itself ran |
| `community_confirmed_platforms` | merged human report records for that exact build | someone reported it working, version-bound |
| `untested_platforms` | everything else, listed explicitly | build exists, nobody has run it |

1. **Human report records** live in `docs/platform/PLATFORM_REPORTS.yaml`. A
   record binds `platform`, `os_version`, `app_version`, `app_commit`,
   `pack_id`/`pack_version`/`pack_sha256`, `date`, `reporter` (pseudonym),
   `reporter_category`, `outcome` (`works`/`works-with-issues`/`fails`) and
   `issues`. Reports are human-run and owner-merged.
2. **Derivation is machine-checked.** `langpack catalog --platform-reports`
   derives `community_confirmed_platforms` only from records whose app commit and
   pack hash match the entry being published, and fails on malformed records,
   missing hash bindings, pack-hash mismatch, or any attempt to populate
   `tested_platforms` from a community record.
3. **CI builds the other-OS bundles** (nsis/msi, dmg) as named, commit-identified
   artifacts and carries the untested-platform notice so release notes inherit it.
4. **Invalidation:** any app or pack change invalidates a platform's status; the
   record is version-bound, so a stale report cannot keep a new build labeled
   confirmed.
5. **Distribution host is still an owner gate.** The owner chose to keep
   `Berzerker5653/open-language-learning` private on 2026-10-07, and the app
   fetches catalog and assets anonymously, so release assets currently return 404
   for any user. Publishing other-OS artifacts therefore needs either the public
   flip or a separate download host. The framework above is host-independent and
   lands regardless.

## Consequences

- Other-OS users can be given builds honestly, with the untested label attached
  to the artifact and the catalog, not just prose.
- A community report becomes durable, falsifiable evidence instead of a chat
  claim: it names the exact commit and pack hash it applies to.
- `community_confirmed` is deliberately not `tested`. The UI and release notes
  must keep that distinction; collapsing it would be a claims violation.
- Until the host question is resolved, the win/mac artifacts exist but are not
  user-fetchable — the framework is ready and waiting on an owner action.

## Alternatives considered

- **Single `tested` boolean with community overrides.** Simplest, rejected: it
  erases the difference between what the project ran and what a stranger reported.
- **Auto-promote from CI compile checks.** Rejected by `docs/13:27` outright; a
  successful link step says nothing about the webview, audio or IME behavior.
- **Ship nothing for other OSes (status quo).** Avoids the honesty problem and
  leaves the sole distribution channel Linux-only, contradicting the owner's
  stated intent.
