# Language Pack Authoring Quickstart

Audience: authors of language packs (human or AI-assisted). The layout
contract and per-type schemas live in `schemas/v0.2/` (see its README);
this document is the workflow around it. All commands are the
`langpack` CLI (`cargo run -p lts-langpack-cli --` or a built binary).

## 1. Start a pack

```sh
langpack init my-pack --pack-id dev.example.my-lang --locale xx-XX --name "My Language"
```

Creates a minimal 0.2 pack that validates clean immediately:
`manifest.yaml`, `curriculum/goals.yaml`, empty `sources.jsonl`,
`licenses.jsonl`, `grammar/concepts.jsonl`. Set the real
`target_locale` and `pack_id` before going further.

## 2. Author content

- Goals: `curriculum/goals.yaml` (`goals:` array, one schema per entry).
- Lexicon: `lexicon/*.jsonl` (one JSON object per line).
- Grammar concepts: `grammar/concepts.jsonl`; optional
  `grammar/dependencies.yaml` mirrors goal prerequisites and must agree.
- Units/scenarios: `curriculum/units/*.yaml`, `curriculum/scenarios/*.yaml`.
- Assessments: `assessments/definitions.jsonl`.
- Every content record cites `sources:` ids that exist in `sources.jsonl`.
- Every third-party or derived asset needs an entry in `licenses.jsonl`.

IDs follow the content-ID grammar (`domain.kind.topic...`, ≥2 segments;
see `schemas/v0.2/README.md`). File-local record ids (source/license
names) are separate and pack-scoped.

## 3. Check as you go

```sh
langpack validate my-pack          # schema + layout + semantics (draft posture)
langpack lint my-pack              # fails on warnings too (quality gate)
langpack audit-curriculum my-pack  # prerequisite cycles, mirror, dead goals
langpack audit-sources my-pack     # provenance completeness
langpack audit-licenses my-pack    # redistribution gates + attribution report
```

`validate --mode install` additionally enforces promotion gates
(non-empty licenses/sources, resolved references, license clearance).

## 4. Full conformance gate

```sh
langpack test my-pack
```

Runs install-mode validation plus all three audits in one pass; exits
non-zero on any error. This is what CI should run for a pack release.

## 5. Package, ship, roll back

```sh
langpack build my-pack -o my-pack.lpk   # deterministic; requires scaffold-clean
langpack inspect my-pack.lpk            # manifest without extracting
langpack install my-pack.lpk --store ~/.lts/packs
langpack rollback dev.example.my-lang --store ~/.lts/packs [--to 0.0.1]
```

Archives are `lts-pack/1` zips with a SHA-256 manifest; install rejects
path traversal, symlinks, unlisted entries, size bombs, and hash
mismatches, and validates the extracted pack in install mode before
committing it to the store.

## Rules that never bend

- Third-party sources are reference-only unless their license allows
  redistribution; `audit-licenses` blocks the reference build otherwise.
- Pending (`TBD`) content licensing blocks install, not drafting.
- Prerequisite graphs must be acyclic and every goal must be reachable
  from a delivered unit/scenario.
- Packs are data: no executable code is ever part of a pack.
